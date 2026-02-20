"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SimpleTranslate from '@/components/SimpleTranslate'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { PublicJobClientProps, PublicJobState } from './PublicJobTypes'
import { formatDateTime, getStoreImages } from './PublicJobUtils'
import { SLIDE_INTERVAL } from './PublicJobConstants'
import ImageSlider from './ImageSlider'
import JobBasicInfoCard from './JobBasicInfoCard'
import WorkConditionsCard from './WorkConditionsCard'
import StoreInfoCard from './StoreInfoCard'
import CompanyInfoCard from './CompanyInfoCard'

export default function PublicJobClient({ params }: PublicJobClientProps) {
  const router = useRouter()
  const [state, setState] = useState<PublicJobState>({
    loading: true,
    jobId: '',
    job: null,
    company: null,
    stores: [],
    modalImage: null,
    currentSlide: 0,
    isAutoPlay: true,
  })

  useEffect(() => {
    const initializeComponent = async () => {
      const resolvedParams = await params
      
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        setState(prev => ({ ...prev, job: null, loading: false }))
        return
      }
      
      setState(prev => ({ ...prev, jobId: resolvedParams.id }))
      
      const fetchJobData = async () => {
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', resolvedParams.id))
          if (jobDoc.exists()) {
            const jobData = jobDoc.data() as Job
            
            // 公開中の求人のみ表示
            if (jobData.status !== 'active') {
              setState(prev => ({ ...prev, job: null, loading: false }))
              return
            }
            
            setState(prev => ({ ...prev, job: { ...jobData, id: resolvedParams.id } }))
            
            // 関連企業の取得
            if (jobData.companyId && jobData.companyId.trim() !== '') {
              const companyDoc = await getDoc(doc(db, 'companies', jobData.companyId))
              if (companyDoc.exists()) {
                const companyData = companyDoc.data() as Company
                // 企業が非公開の場合は求人を表示しない
                if (!companyData.isPublic) {
                  setState(prev => ({ ...prev, job: null, loading: false }))
                  return
                }
                setState(prev => ({ 
                  ...prev, 
                  company: { ...companyData, id: jobData.companyId } 
                }))
              }
            }
            
            // 関連店舗の取得（複数対応）
            const storesList: StoreType[] = []
            const storeIds = jobData.storeIds || (jobData.storeId ? [jobData.storeId] : [])
            const validStoreIds = storeIds.filter(id => id && id.trim() !== '')
            
            if (validStoreIds.length > 0) {
              for (const storeId of validStoreIds) {
                const storeDoc = await getDoc(doc(db, 'stores', storeId))
                if (storeDoc.exists()) {
                  storesList.push({ ...storeDoc.data() as StoreType, id: storeId })
                }
              }
              setState(prev => ({ ...prev, stores: storesList }))
            }
          } else {
            setState(prev => ({ ...prev, job: null }))
          }
        } catch (error) {
          console.error('求人データの取得に失敗しました:', error)
          setState(prev => ({ ...prev, job: null }))
        } finally {
          setState(prev => ({ ...prev, loading: false }))
        }
      }

      fetchJobData()
    }

    initializeComponent()
  }, [params, router])

  // 自動再生機能（最初の店舗の写真のみ）
  useEffect(() => {
    if (!state.isAutoPlay || state.stores.length === 0) return
    
    const images = getStoreImages(state.stores[0])
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentSlide: (prev.currentSlide + 1) % images.length
      }))
    }, SLIDE_INTERVAL)

    return () => clearInterval(interval)
  }, [state.isAutoPlay, state.stores, state.currentSlide])

  const handleImageClick = (imageUrl: string, alt: string) => {
    setState(prev => ({ ...prev, modalImage: { src: imageUrl, alt } }))
  }

  const goToSlide = (index: number) => {
    setState(prev => ({ ...prev, currentSlide: index, isAutoPlay: false }))
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-700">読み込み中...</div>
      </div>
    )
  }

  if (!state.job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">求人が見つかりません</h1>
          <p className="text-gray-600">この求人は現在公開されていないか、存在しません。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 翻訳機能付きヘッダー */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="/logo_wh.png" 
                alt="飲食人大学" 
                className="h-8 w-auto"
                onError={(e) => {
                  // ロゴが見つからない場合はテキストのみ表示
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <SimpleTranslate variant="dark" />
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* 写真スライダー（最初の店舗の写真のみ表示） */}
        {state.stores.length > 0 && getStoreImages(state.stores[0]).length > 0 && (
          <Card className="mb-6 overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <ImageSlider
                images={getStoreImages(state.stores[0])}
                currentSlide={state.currentSlide}
                onImageClick={handleImageClick}
                onSlideChange={goToSlide}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 求人基本情報 */}
            <JobBasicInfoCard 
              job={state.job} 
              company={state.company} 
              stores={state.stores} 
            />

            {/* 勤務条件 */}
            <WorkConditionsCard job={state.job} />

            {/* 営業担当のコメント */}
            {state.job.consultantReview && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>営業担当からのコメント</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="whitespace-pre-wrap text-blue-800">{state.job.consultantReview}</p>
                  </div>
                </CardContent>
              </Card>
            )}
  
            {/* 選考プロセス */}
            {state.job.selectionProcess && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>選考プロセス</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <p className="whitespace-pre-wrap">{state.job.selectionProcess}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 店舗情報 */}
            <StoreInfoCard 
              stores={state.stores} 
              mainStoreIds={state.job.mainStoreIds}
              company={state.company} 
              onImageClick={handleImageClick} 
            />

            {/* 企業情報 */}
            <CompanyInfoCard company={state.company} />

            {/* 応募について */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>応募について</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    この求人への応募については、弊社のキャリア担当へご連絡ください。
                  </p>
                  <p className="text-xs text-gray-500">
                    掲載日: {formatDateTime(state.job.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 画像モーダル */}
        <Dialog open={!!state.modalImage} onOpenChange={() => setState(prev => ({ ...prev, modalImage: null }))}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{state.modalImage?.alt}</DialogTitle>
            </DialogHeader>
            {state.modalImage && (
              <div className="flex justify-center">
                <img
                  src={state.modalImage.src}
                  alt={state.modalImage.alt}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
