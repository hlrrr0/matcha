"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import SimpleTranslate from '@/components/SimpleTranslate'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign,
  Building2,
  Store,
  Phone,
  Globe,
  Mail,
  Users,
  Camera,
  Star,
  Calendar,
  Play
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'

interface PublicJobClientProps {
  params: Promise<{
    id: string
  }>
}

export default function PublicJobClient({ params }: PublicJobClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobId, setJobId] = useState<string>('')
  const [job, setJob] = useState<Job | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [stores, setStores] = useState<StoreType[]>([])
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)

  useEffect(() => {
    const initializeComponent = async () => {
      const resolvedParams = await params
      
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        setJob(null)
        setLoading(false)
        return
      }
      
      setJobId(resolvedParams.id)
      
      const fetchJobData = async () => {
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', resolvedParams.id))
          if (jobDoc.exists()) {
            const jobData = jobDoc.data() as Job
            
            // 公開中の求人のみ表示
            if (jobData.status !== 'active') {
              setJob(null)
              setLoading(false)
              return
            }
            
            setJob({ ...jobData, id: resolvedParams.id })
            
            // 関連企業の取得
            if (jobData.companyId && jobData.companyId.trim() !== '') {
              const companyDoc = await getDoc(doc(db, 'companies', jobData.companyId))
              if (companyDoc.exists()) {
                setCompany({ ...companyDoc.data() as Company, id: jobData.companyId })
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
              setStores(storesList)
            }
          } else {
            setJob(null)
          }
        } catch (error) {
          console.error('求人データの取得に失敗しました:', error)
          setJob(null)
        } finally {
          setLoading(false)
        }
      }

      fetchJobData()
    }

    initializeComponent()
  }, [params, router])

  // 自動再生機能（最初の店舗の写真のみ）
  useEffect(() => {
    if (!isAutoPlay || stores.length === 0) return
    
    const images = getStoreImages(stores[0])
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length)
    }, 4000) // 4秒ごとに自動スライド

    return () => clearInterval(interval)
  }, [isAutoPlay, stores, currentSlide])

  // 日時をフォーマットする関数
  const formatDateTime = (dateValue: any) => {
    if (!dateValue) return '未設定'
    
    try {
      let date: Date
      
      if (dateValue && typeof dateValue.toDate === 'function') {
        // Firestore Timestamp
        date = dateValue.toDate()
      } else if (dateValue instanceof Date) {
        // Date オブジェクト
        date = dateValue
      } else if (typeof dateValue === 'string') {
        // 文字列
        date = new Date(dateValue)
      } else {
        return '不正な日時'
      }
      
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      console.error('日時のフォーマットに失敗:', error)
      return '不正な日時'
    }
  }

  const getEmploymentTypeBadge = (type: Job['employmentType']) => {
    if (!type) {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          未設定
        </Badge>
      )
    }

    const colors = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-purple-100 text-purple-800',
      'contract': 'bg-orange-100 text-orange-800',
      'temporary': 'bg-pink-100 text-pink-800',
      'intern': 'bg-green-100 text-green-800',
    }
    
    const labels = {
      'full-time': '正社員',
      'part-time': 'アルバイト・パート',
      'contract': '契約社員',
      'temporary': '派遣社員',
      'intern': 'インターン',
    }

    // 定義されていない雇用形態の場合は、文字列をそのまま表示
    const displayColor = colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    const displayLabel = labels[type as keyof typeof labels] || type
    
    return (
      <Badge className={displayColor}>
        {displayLabel}
      </Badge>
    )
  }

  const formatSalary = (job: Job) => {
    if (job.salaryExperienced) {
      return `給与（経験者）: ${job.salaryExperienced}`
    } else if (job.salaryInexperienced) {
      return `給与（未経験）: ${job.salaryInexperienced}`
    }
    return '給与: 要相談'
  }

  const handleImageClick = (imageUrl: string, alt: string) => {
    setModalImage({ src: imageUrl, alt })
  }

  // 店舗の写真を取得する関数
  const getStoreImages = (store: StoreType | null): Array<{ src: string; alt: string }> => {
    if (!store) return []
    
    const images: Array<{ src: string; alt: string }> = []
    
    // 各写真フィールドをチェックして配列に追加
    if (store.ownerPhoto) images.push({ src: store.ownerPhoto, alt: '大将の写真' })
    if (store.interiorPhoto) images.push({ src: store.interiorPhoto, alt: '店内の写真' })
    if (store.photo1) images.push({ src: store.photo1, alt: '店舗写真1' })
    if (store.photo2) images.push({ src: store.photo2, alt: '店舗写真2' })
    if (store.photo3) images.push({ src: store.photo3, alt: '店舗写真3' })
    if (store.photo4) images.push({ src: store.photo4, alt: '店舗写真4' })
    if (store.photo5) images.push({ src: store.photo5, alt: '店舗写真5' })
    if (store.photo6) images.push({ src: store.photo6, alt: '店舗写真6' })
    if (store.photo7) images.push({ src: store.photo7, alt: '店舗写真7' })
    
    return images
  }

  // スライダーナビゲーション関数
  const nextSlide = () => {
    if (stores.length === 0) return
    const images = getStoreImages(stores[0])
    setCurrentSlide((prev) => (prev + 1) % images.length)
    // 自動再生は継続（自動再生での使用のため）
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlay(false) // 手動操作時は自動再生を停止
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">求人が見つかりません</h1>
          <p className="text-gray-300">この求人は現在公開されていないか、存在しません。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 翻訳機能付きヘッダー */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white flex items-center gap-3">
                <img 
                  src="/logo_wh.png" 
                  alt="Logo" 
                  className="h-8 w-auto"
                  onError={(e) => {
                    // ロゴが見つからない場合はテキストのみ表示
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <SimpleTranslate variant="dark" />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        {/* 写真スライダー（最初の店舗の写真のみ表示） */}
        {stores.length > 0 && getStoreImages(stores[0]).length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-0">
              {(() => {
                const images = getStoreImages(stores[0])
                return (
                  <div className="relative">
                    {/* メイン画像 */}
                    <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
                      <img
                        src={images[currentSlide].src}
                        alt={images[currentSlide].alt}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => handleImageClick(images[currentSlide].src, images[currentSlide].alt)}
                      />
                      
                      {/* オーバーレイとナビゲーション
                      <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-white" />
                        </div>
                      </div> */}

                      {/* 画像情報 */}
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                        {images[currentSlide].alt}
                      </div>

                      {/* スライド番号 */}
                      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                        {currentSlide + 1} / {images.length}
                      </div>
                    </div>

                    {/* サムネイルナビゲーション */}
                    {images.length > 1 && (
                      <div className="p-2">
                        <div className="flex gap-2 overflow-x-auto">
                          {images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                index === currentSlide 
                                  ? 'border-blue-500 shadow-lg' 
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src={image.src}
                                alt={image.alt}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 求人基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Briefcase className="h-6 w-6 hidden md:block" />
                  {job.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">募集中</Badge>
                  {getEmploymentTypeBadge(job.employmentType)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.salaryInexperienced && (
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        給与：未経験者
                      </h3>
                      <p className="text-lg">{job.salaryInexperienced}</p>
                    </div>
                  )}
                  {job.salaryExperienced && (
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        給与：経験者（おおよそ3年経過時）
                      </h3>
                      <p className="text-lg">{job.salaryExperienced}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* 勤務地・最寄り駅（複数店舗対応） */}
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4" />
                    勤務地・最寄り駅
                  </h3>
                  {stores.length === 0 ? (
                    <p className="text-gray-600">{company?.name || '勤務地情報なし'}</p>
                  ) : stores.length === 1 ? (
                    // 1店舗の場合は通常表示
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">{stores[0].name}</p>
                        {stores[0].address && (
                          <p className="text-gray-600 text-sm">{stores[0].address}</p>
                        )}
                      </div>
                      {stores[0].nearestStation && (
                        <div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            <span className="font-medium">最寄り駅:</span> {stores[0].nearestStation}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 複数店舗の場合は1店舗目を表示、残りはアコーディオン
                    <div className="space-y-3">
                      {/* 参考店舗（1店舗目） */}
                      <div className="border-l-4 border-blue-500 pl-3">
                        <p className="text-xs text-gray-500 mb-1">参考店舗</p>
                        <p className="font-medium">{stores[0].name}</p>
                        {stores[0].address && (
                          <p className="text-gray-600 text-sm">{stores[0].address}</p>
                        )}
                        {stores[0].nearestStation && (
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            <span className="font-medium">最寄り駅:</span> {stores[0].nearestStation}
                          </p>
                        )}
                      </div>
                      
                      {/* その他の店舗（アコーディオン） */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="other-stores">
                          <AccordionTrigger className="text-sm">
                            その他の勤務可能店舗 ({stores.length - 1}店舗)
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {stores.slice(1).map((store, index) => (
                                <div key={store.id} className="border-l-2 border-gray-300 pl-3">
                                  <p className="font-medium">
                                    {store.name}
                                    {store.prefecture && (
                                      <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                                    )}
                                  </p>
                                  {store.address && (
                                    <p className="text-gray-600 text-sm">{store.address}</p>
                                  )}
                                  {store.nearestStation && (
                                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                      <span className="font-medium">最寄り駅:</span> {store.nearestStation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </div>

                {/* 職務内容 */}
                {job.jobDescription && (
                  <>
                    <div>
                      <h3 className="font-medium text-gray-700">職務内容</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.jobDescription}</p>
                    </div>
                  </>
                )}

                {/* 求めるスキル */}
                {job.requiredSkills && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700">求めるスキル</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.requiredSkills}</p>
                    </div>
                  </>
                )}
                
                {/* 企業特徴 */}
                {(company?.feature1 || company?.feature2 || company?.feature3) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">企業特徴</h4>
                      <div className="space-y-1">
                        {company?.feature1 && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap"> ①{company.feature1}</p>
                        )}
                        {company?.feature2 && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap"> ②{company.feature2}</p>
                        )}
                        {company?.feature3 && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap"> ③{company.feature3}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* キャリアパス */}
                {company?.careerPath && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">目指せるキャリア</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{company?.careerPath}</p>
                    </div>
                  </>
                )}

                {/* 若手入社理由 */}
                {company?.youngRecruitReason && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">若手の入社理由</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{company?.youngRecruitReason}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            {/* 勤務条件 */}
            <Card>
              <CardHeader>
                <CardTitle>勤務条件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 md:px-6">
                {/* 試用期間 */}
                {job.trialPeriod && (
                  <div>
                    <h3 className="font-medium text-gray-700">試用期間</h3>
                    <p className="mt-1">{job.trialPeriod}</p>
                  </div>
                )}

                {/* 勤務時間 */}
                {job.workingHours && (
                  <>
                    {job.trialPeriod && <Separator />}
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        勤務時間
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.workingHours}</p>
                    </div>
                  </>
                )}

                {/* 休日・休暇 */}
                {job.holidays && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        休日・休暇
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.holidays}</p>
                    </div>
                  </>
                )}

                {/* 時間外労働 */}
                {job.overtime && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700">時間外労働</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.overtime}</p>
                    </div>
                  </>
                )}

                {/* 待遇・福利厚生 */}
                {job.benefits && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700">待遇・福利厚生</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.benefits}</p>
                    </div>
                  </>
                )}

                {/* 受動喫煙防止措置 */}
                {job.smokingPolicy && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700">受動喫煙防止措置</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.smokingPolicy}</p>
                    </div>
                  </>
                )}

                {/* 加入保険 */}
                {job.insurance && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-700">加入保険</h3>
                      <p className="mt-1 whitespace-pre-wrap">{job.insurance}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 営業担当のコメント */}
            {job.consultantReview && (
              <Card>
                <CardHeader>
                  <CardTitle>営業担当からのコメント</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-blue-800">{job.consultantReview}</p>
                  </div>
                </CardContent>
              </Card>
            )}
  
            {/* 選考プロセス */}
            {job.selectionProcess && (
              <Card>
                <CardHeader>
                  <CardTitle>選考プロセス</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <p className="whitespace-pre-wrap">{job.selectionProcess}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
          {/* 店舗情報（参考店舗のみ表示） */}
            {stores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    店舗情報{stores.length > 1 && ' (参考店舗)'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 md:px-6">
               {/* 店舗情報（複数店舗対応） */}
                {stores.length > 0 && (
                  <div>
                    {/* 参考店舗（1店舗目） */}
                    <div className="border-l-4 border-blue-500 pl-3 mb-3">
                      {stores.length > 1 && (
                        <p className="text-xs text-gray-500 mb-2">参考店舗</p>
                      )}
                      <p className="font-medium text-base mb-3">{stores[0].name}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        {stores[0].trainingPeriod && (
                          <div>
                            <h4 className="font-medium text-gray-700 text-sm mb-1">握れるまでのおおよその期間</h4>
                            <p className="text-sm text-gray-600">{stores[0].trainingPeriod}</p>
                          </div>
                        )}
                        
                        {/* 店舗基本情報 */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-700 text-sm mb-1">基本情報</h4>
                          <ul className="space-y-1">
                            {stores[0].businessType && (
                              <li className="text-sm text-gray-600">
                                業態: {stores[0].businessType}
                              </li>
                            )}
                            {(stores[0].unitPriceLunch || stores[0].unitPriceDinner) && (
                              <li className="text-sm text-gray-600">
                                客単価: 
                                {stores[0].unitPriceLunch && ` 昼 ${stores[0].unitPriceLunch}円`}
                                {stores[0].unitPriceLunch && stores[0].unitPriceDinner && ' / '}
                                {stores[0].unitPriceDinner && ` 夜 ${stores[0].unitPriceDinner}円`}
                              </li>
                            )}
                            {stores[0].seatCount && (
                              <li className="text-sm text-gray-600">
                                座席数: {stores[0].seatCount}席
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* その他の店舗情報（アコーディオン） */}
                    {stores.length > 1 && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="other-stores-info">
                          <AccordionTrigger className="text-sm">
                            その他の店舗情報 ({stores.length - 1}店舗)
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {stores.slice(1).map((store, index) => (
                                <div key={store.id} className="border-l-2 border-gray-300 pl-3 pb-3">
                                  <p className="font-medium text-base mb-3">
                                    {store.name}
                                    {store.prefecture && (
                                      <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                                    )}
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {store.trainingPeriod && (
                                      <div>
                                        <h4 className="font-medium text-gray-700 text-sm mb-1">握れるまでのおおよその期間</h4>
                                        <p className="text-sm text-gray-600">{store.trainingPeriod}</p>
                                      </div>
                                    )}
                                    
                                    {/* 店舗基本情報 */}
                                    {(store.businessType || store.unitPriceLunch || store.unitPriceDinner || store.seatCount || store.isReservationRequired !== undefined) && (
                                      <div className="space-y-2">
                                        <h4 className="font-medium text-gray-700 text-sm mb-1">基本情報</h4>
                                        <ul className="space-y-1">
                                          {store.businessType && (
                                            <li className="text-sm text-gray-600">
                                              業態: {store.businessType}
                                            </li>
                                          )}
                                          {(store.unitPriceLunch || store.unitPriceDinner) && (
                                            <li className="text-sm text-gray-600">
                                              客単価: 
                                              {store.unitPriceLunch && ` 昼 ${store.unitPriceLunch}円`}
                                              {store.unitPriceLunch && store.unitPriceDinner && ' / '}
                                              {store.unitPriceDinner && ` 夜 ${store.unitPriceDinner}円`}
                                            </li>
                                          )}
                                          {store.seatCount && (
                                            <li className="text-sm text-gray-600">
                                              座席数: {store.seatCount}席
                                            </li>
                                          )}
                                          {store.isReservationRequired !== undefined && (
                                            <li className="text-sm text-gray-600">
                                              予約: {store.isReservationRequired ? '必要' : '不要'}
                                            </li>
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                )}
                  {/* SNS・口コミ情報 */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-1gap-4">
                      <div className="py-2">
                        {stores[0].website && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <a href={stores[0].website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              店舗ウェブサイト
                            </a>
                          </p>
                        )}
                        {stores[0].instagramUrl && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            📷 <a href={stores[0].instagramUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Instagram
                            </a>
                          </p>
                        )}
                        {stores[0].tabelogUrl && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            🍽️ <a href={stores[0].tabelogUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              食べログ
                            </a>
                          </p>
                        )}
                      </div>
                      <div>
                        {stores[0].tabelogScore && (
                          <div className="mb-2">
                            <h4 className="font-medium text-gray-700 text-sm mb-1 flex items-center gap-2">
                              <Star className="h-3 w-3 text-yellow-500" />
                              食べログスコア
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].tabelogScore}</p>
                          </div>
                        )}
                        {stores[0].googleReviewScore && (
                          <div className="mb-2">
                            <h4 className="font-medium text-gray-700 text-sm mb-1 flex items-center gap-2">
                              <Star className="h-3 w-3 text-yellow-500" />
                              Google口コミスコア
                            </h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].googleReviewScore}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 評判・その他情報 */}
                  {stores[0].reputation && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">その他 / ミシュランなどの獲得状況等の実績</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].reputation}</p>
                      </div>
                    </>
                  )}

                  {stores[0].staffReview && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">スタッフからの評価</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].staffReview}</p>
                      </div>
                    </>
                  )}

                  {/* 写真ギャラリー */}
                  <div className="space-y-4">
                    {/* すべての写真を収集 */}
                    {(() => {
                      const allPhotos = []
                      
                      // 企業ロゴ
                      if (company?.logo) {
                        allPhotos.push({ src: company.logo, alt: '企業ロゴ' })
                      }
                      
                      // オーナー写真
                      if (stores[0].ownerPhoto) {
                        allPhotos.push({ src: stores[0].ownerPhoto, alt: 'オーナー写真' })
                      }
                      
                      // 店内写真
                      if (stores[0].interiorPhoto) {
                        allPhotos.push({ src: stores[0].interiorPhoto, alt: '店内写真' })
                      }
                      
                      // 素材写真 1-7
                      if (stores[0].photo1) allPhotos.push({ src: stores[0].photo1, alt: '素材写真1' })
                      if (stores[0].photo2) allPhotos.push({ src: stores[0].photo2, alt: '素材写真2' })
                      if (stores[0].photo3) allPhotos.push({ src: stores[0].photo3, alt: '素材写真3' })
                      if (stores[0].photo4) allPhotos.push({ src: stores[0].photo4, alt: '素材写真4' })
                      if (stores[0].photo5) allPhotos.push({ src: stores[0].photo5, alt: '素材写真5' })
                      if (stores[0].photo6) allPhotos.push({ src: stores[0].photo6, alt: '素材写真6' })
                      if (stores[0].photo7) allPhotos.push({ src: stores[0].photo7, alt: '素材写真7' })
                      
                      // デバッグ用ログ
                      console.log('写真データ:', { allPhotos, stores, company })
                      
                      // テスト用: 写真がない場合はプレースホルダーを追加
                      if (allPhotos.length === 0) {
                        allPhotos.push({ 
                          src: 'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image', 
                          alt: 'プレースホルダー画像' 
                        })
                      }
                      
                      return allPhotos.length > 0 ? (
                        <>
                          <Separator />
                          <div className="bg-white rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-1">
                              <Camera className="h-4 w-4" />
                              写真ギャラリー ({allPhotos.length}枚)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {allPhotos.map((photo, index) => (
                                <div
                                  key={index}
                                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100 border"
                                  onClick={() => handleImageClick(photo.src, photo.alt)}
                                >
                                  <img
                                    src={photo.src}
                                    alt={photo.alt}
                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                                  <div className="absolute bottom-1 left-1 right-1">
                                    <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      {photo.alt}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null
                    })()}

                    {/* オーナー動画 */}
                    {stores[0].ownerVideo && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            オーナー紹介動画
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition-colors duration-200">
                            <a
                              href={stores[0].ownerVideo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <div className="flex items-center gap-3 text-gray-700">
                                <div className="bg-blue-100 rounded-full p-2">
                                  <Play className="h-4 w-4 text-blue-600 fill-current" />
                                </div>
                                <div>
                                  <div className="font-medium">動画を視聴する</div>
                                  <div className="text-sm text-gray-500 mt-1">店舗の雰囲気をご覧ください</div>
                                </div>
                              </div>
                            </a>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 企業情報 */}
            {company && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    企業情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 md:px-6">
                  <div>
                    <h3 className="font-medium text-lg">{company.name}</h3>
                    {company.address && (
                      <p className="text-sm text-gray-600 mt-1 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5" />
                        {company.address}
                      </p>
                    )}
                  </div>
                  
                  {/* 企業の基本情報 */}
                  <div className="space-y-2">
                    {company.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {company.phone}
                      </p>
                    )}
                    
                    {company.website && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          企業ウェブサイト
                        </a>
                      </p>
                    )}

                    {company.email && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {company.email}
                      </p>
                    )}

                    {company.establishedYear && (
                      <p className="text-sm text-gray-600">
                        設立年: {company.establishedYear}年
                      </p>
                    )}

                    {company.employeeCount && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        従業員数: {company.employeeCount}名
                      </p>
                    )}

                    {company.capital && (
                      <p className="text-sm text-gray-600">
                        資本金: {company.capital}万円
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 応募について */}
            <Card>
              <CardHeader>
                <CardTitle>応募について</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    この求人への応募については、弊社のキャリア担当へご連絡ください。
                  </p>
                  <p className="text-xs text-gray-500">
                    掲載日: {formatDateTime(job.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 画像モーダル */}
        <Dialog open={!!modalImage} onOpenChange={() => setModalImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{modalImage?.alt}</DialogTitle>
            </DialogHeader>
            {modalImage && (
              <div className="flex justify-center">
                <img
                  src={modalImage.src}
                  alt={modalImage.alt}
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