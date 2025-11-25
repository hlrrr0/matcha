"use client"

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store } from 'lucide-react'
import { createStore, checkStoreByNameAndCompany, checkStoreByTabelogUrl, getStoreById } from '@/lib/firestore/stores'
import { Store as StoreType } from '@/types/store'
import StoreForm from '@/components/stores/StoreForm'

function NewStorePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<StoreType>>({})

  // URLパラメータから企業IDまたは複製元店舗IDを取得して初期データを設定
  useEffect(() => {
    const loadInitialData = async () => {
      const companyParam = searchParams.get('company')
      const duplicateParam = searchParams.get('duplicate')
      
      if (duplicateParam && duplicateParam.trim() !== '') {
        // 複製元の店舗データを読み込む
        try {
          const sourceStore = await getStoreById(duplicateParam)
          if (sourceStore) {
            // IDとタイムスタンプを除外して、他のデータをコピー
            const { id, createdAt, updatedAt, ...storeData } = sourceStore
            setInitialData({
              ...storeData,
              name: `${sourceStore.name}（コピー）` // 店舗名に「コピー」を追加
            })
          }
        } catch (error) {
          console.error('複製元店舗の取得に失敗しました:', error)
        }
      } else if (companyParam) {
        setInitialData({ companyId: companyParam })
      }
    }
    
    loadInitialData()
  }, [searchParams])

  const handleSubmit = async (data: Partial<StoreType>) => {
    if (!data.companyId || !data.name || !data.address) {
      alert('必須項目を入力してください')
      return
    }

    setLoading(true)

    try {
      // 重複チェック
      if (data.tabelogUrl) {
        const existingStoreByTabelog = await checkStoreByTabelogUrl(data.tabelogUrl)
        if (existingStoreByTabelog) {
          alert(`この食べログURLは既に登録されています: ${existingStoreByTabelog.name}`)
          return
        }
      }

      const existingStoreByName = await checkStoreByNameAndCompany(data.name, data.companyId)
      if (existingStoreByName) {
        alert(`この企業内に同じ店舗名「${data.name}」が既に登録されています`)
        return
      }

      const newStore: Omit<StoreType, 'id'> = {
        companyId: data.companyId,
        name: data.name,
        address: data.address,
        nearestStation: data.nearestStation,
        website: data.website,
        unitPriceLunch: data.unitPriceLunch,
        unitPriceDinner: data.unitPriceDinner,
        seatCount: data.seatCount,
        isReservationRequired: data.isReservationRequired || false,
        instagramUrl: data.instagramUrl,
        tabelogUrl: data.tabelogUrl || undefined,
        googleReviewScore: data.googleReviewScore,
        tabelogScore: data.tabelogScore,
        reputation: data.reputation,
        staffReview: data.staffReview || undefined,
        trainingPeriod: data.trainingPeriod,
        ownerPhoto: data.ownerPhoto || undefined,
        ownerVideo: data.ownerVideo || undefined,
        interiorPhoto: data.interiorPhoto || undefined,
        photo1: data.photo1 || undefined,
        photo2: data.photo2 || undefined,
        photo3: data.photo3 || undefined,
        photo4: data.photo4 || undefined,
        photo5: data.photo5 || undefined,
        photo6: data.photo6 || undefined,
        photo7: data.photo7 || undefined,
        status: data.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const storeId = await createStore(newStore)
      alert('店舗が正常に追加されました')
      router.push(`/stores/${storeId}`)
    } catch (error) {
      console.error('店舗の追加に失敗しました:', error)
      alert('店舗の追加に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/stores">
            <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-green-800">
              <Store className="h-8 w-8" />
              新規店舗追加
            </h1>
            <p className="text-green-600 mt-2">
              新しい店舗の情報を入力
            </p>
          </div>
        </div>
        
        <StoreForm 
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default function NewStorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-green-600">読み込み中...</div>
      </div>
    }>
      <NewStorePageContent />
    </Suspense>
  )
}