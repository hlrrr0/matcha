"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Store as StoreType } from '@/types/store'
import { checkStoreByTabelogUrl } from '@/lib/firestore/stores'
import StoreForm from '@/components/stores/StoreForm'

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
        const existingStoreByTabelog = await checkStoreByTabelogUrl(data.tabelogUrl)
        if (existingStoreByTabelog && existingStoreByTabelog.id !== storeId) {
          alert(`この食べログURLは既に登録されています: ${existingStoreByTabelog.name}`)
          setSaving(false)
          return
        }
      }

      const updateData = {
        ...data,
        updatedAt: new Date()
      }
      
      await updateDoc(doc(db, 'stores', storeId), updateData)
      alert('店舗情報が正常に更新されました')
      router.push(`/stores/${storeId}`)
    } catch (error) {
      console.error('店舗の更新に失敗しました:', error)
      alert('店舗の更新に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
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
        
        <StoreForm 
          initialData={store}
          onSubmit={handleSubmit}
          isEdit={true}
          loading={saving}
        />
      </div>
    </div>
  )
}