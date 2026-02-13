"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store, Flag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Store as StoreType } from '@/types/store'
import { checkStoreByTabelogUrl } from '@/lib/firestore/stores'
import { geocodeAddress } from '@/lib/google-maps'
import StoreForm from '@/components/stores/StoreForm'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface EditStorePageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditStorePage({ params }: EditStorePageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeId, setStoreId] = useState<string>('')
  const [store, setStore] = useState<StoreType | null>(null)
  const [bulkFlags, setBulkFlags] = useState({
    highDemand: false,
    provenTrack: false,
    weakRelationship: false
  })
  const [applyingFlags, setApplyingFlags] = useState(false)

  // 食べログURLからクエリパラメータを削除する関数
  const cleanTabelogUrl = (url: string): string => {
    if (!url) return url
    try {
      const urlObj = new URL(url)
      // パスのみを抽出（末尾のスラッシュも削除）
      return urlObj.origin + urlObj.pathname.replace(/\/$/, '')
    } catch {
      // URLのパース失敗時は元のURLを返す
      return url
    }
  }

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な店舗IDです')
        window.location.href = '/stores'
        return
      }
      setStoreId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!storeId) return

    const fetchStore = async () => {
      try {
        const storeDoc = await getDoc(doc(db, 'stores', storeId))
        if (storeDoc.exists()) {
          const storeData = { id: storeDoc.id, ...storeDoc.data() } as StoreType
          setStore(storeData)
        } else {
          alert('店舗が見つかりません')
          router.push('/stores')
          return
        }
      } catch (error) {
        console.error('店舗データの取得に失敗しました:', error)
        alert('店舗データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [storeId, router])

  const handleSubmit = async (data: Partial<StoreType>) => {
    if (!storeId) return

    setSaving(true)
    try {
      // tabelogURLの重複チェック（自分自身以外）
      if (data.tabelogUrl) {
        const cleanedUrl = cleanTabelogUrl(data.tabelogUrl)
        const existingStoreByTabelog = await checkStoreByTabelogUrl(cleanedUrl)
        if (existingStoreByTabelog && existingStoreByTabelog.id !== storeId) {
          alert(`この食べログURLは既に登録されています: ${existingStoreByTabelog.name}`)
          setSaving(false)
          return
        }
        // クリーンなURLをdataに設定
        data.tabelogUrl = cleanedUrl
      }

      // 位置情報が取得されていない場合、住所から自動取得を試みる
      if ((!data.latitude || !data.longitude) && data.address) {
        toast.info('位置情報を取得中...')
        try {
          const coordinates = await geocodeAddress(data.address)
          if (coordinates) {
            data.latitude = coordinates.lat
            data.longitude = coordinates.lng
            toast.success('位置情報を取得しました')
          } else {
            toast.warning('位置情報の取得に失敗しました。手動で設定してください。')
          }
        } catch (error) {
          console.error('位置情報の取得エラー:', error)
          toast.warning('位置情報の取得に失敗しました。手動で設定してください。')
        }
      }

      const updateData = {
        ...data,
        updatedAt: new Date()
      }
      
      await updateDoc(doc(db, 'stores', storeId), updateData)
      toast.success('店舗情報が正常に更新されました')
      router.push(`/stores/${storeId}`)
    } catch (error) {
      console.error('店舗の更新に失敗しました:', error)
      toast.error('店舗の更新に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyBulkFlags = async () => {
    if (!storeId) return
    
    const selectedFlags = Object.entries(bulkFlags).filter(([_, checked]) => checked)
    if (selectedFlags.length === 0) {
      toast.error('フラグを選択してください')
      return
    }

    setApplyingFlags(true)
    try {
      // この店舗に紐づく全求人を取得（storeId または storeIds に含まれる）
      const jobsQuery1 = query(
        collection(db, 'jobs'),
        where('storeId', '==', storeId)
      )
      const jobsQuery2 = query(
        collection(db, 'jobs'),
        where('storeIds', 'array-contains', storeId)
      )
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(jobsQuery1),
        getDocs(jobsQuery2)
      ])
      
      // 重複を除去してマージ
      const jobDocMap = new Map()
      snapshot1.docs.forEach(doc => jobDocMap.set(doc.id, doc))
      snapshot2.docs.forEach(doc => jobDocMap.set(doc.id, doc))
      const allJobDocs = Array.from(jobDocMap.values())
      
      if (allJobDocs.length === 0) {
        toast.warning('この店舗に紐づく求人がありません')
        setApplyingFlags(false)
        return
      }

      // バッチ更新
      const batch = writeBatch(db)
      allJobDocs.forEach((jobDoc) => {
        const currentFlags = jobDoc.data().flags || {}
        batch.update(jobDoc.ref, {
          flags: {
            ...currentFlags,
            highDemand: bulkFlags.highDemand || currentFlags.highDemand || false,
            provenTrack: bulkFlags.provenTrack || currentFlags.provenTrack || false,
            weakRelationship: bulkFlags.weakRelationship || currentFlags.weakRelationship || false
          },
          updatedAt: new Date()
        })
      })

      await batch.commit()
      toast.success(`${allJobDocs.length}件の求人にフラグを設定しました`)
      
      // フラグをリセット
      setBulkFlags({
        highDemand: false,
        provenTrack: false,
        weakRelationship: false
      })
    } catch (error) {
      console.error('Error applying bulk flags:', error)
      toast.error('フラグ設定に失敗しました')
    } finally {
      setApplyingFlags(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Store className="h-8 w-8 animate-spin mr-2 text-green-600" />
            <span>店舗データを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>店舗が見つかりません</p>
            <Link href="/stores">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                店舗一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/stores/${storeId}`}>
            <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-green-800">
              <Store className="h-8 w-8 text-green-600" />
              店舗編集: {store.name}
            </h1>
            <p className="text-green-600 mt-2">
              店舗の情報を編集
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                求人フラグ一括設定
              </CardTitle>
              <CardDescription>
                この店舗に紐づく全ての求人にフラグを一括で設定できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bulk-highDemand"
                    checked={bulkFlags.highDemand}
                    onCheckedChange={(checked) => 
                      setBulkFlags(prev => ({ ...prev, highDemand: checked as boolean }))
                    }
                  />
                  <Label htmlFor="bulk-highDemand" className="cursor-pointer">
                    🔥 ニーズ高
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bulk-provenTrack"
                    checked={bulkFlags.provenTrack}
                    onCheckedChange={(checked) => 
                      setBulkFlags(prev => ({ ...prev, provenTrack: checked as boolean }))
                    }
                  />
                  <Label htmlFor="bulk-provenTrack" className="cursor-pointer">
                    🎉 実績あり
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bulk-weakRelationship"
                    checked={bulkFlags.weakRelationship}
                    onCheckedChange={(checked) => 
                      setBulkFlags(prev => ({ ...prev, weakRelationship: checked as boolean }))
                    }
                  />
                  <Label htmlFor="bulk-weakRelationship" className="cursor-pointer">
                    💧 関係薄め
                  </Label>
                </div>
                <Button 
                  onClick={handleApplyBulkFlags}
                  disabled={applyingFlags}
                  className="w-full"
                >
                  {applyingFlags ? '設定中...' : 'フラグを一括設定'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <StoreForm 
            initialData={store}
            onSubmit={handleSubmit}
            isEdit={true}
            loading={saving}
          />
        </div>
      </div>
    </div>
  )
}