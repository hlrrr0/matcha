"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ProtectedRoute from '@/components/ProtectedRoute'
import DominoLinkage from '@/components/companies/DominoLinkage'
import RelatedMatches from '@/components/matches/RelatedMatches'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Globe, 
  Users,
  Calendar,
  ExternalLink,
  Store,
  Briefcase,
  TrendingUp,
  DollarSign,
  Edit,
  Copy,
  Search,
  CheckCircle,
  Mail
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateCompany } from '@/lib/firestore/companies'
import { Company } from '@/types/company'
import { User } from '@/types/user'

interface CompanyDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    tab?: string
  }>
}

export default function CompanyDetailPage({ params, searchParams }: CompanyDetailPageProps) {
  return (
    <ProtectedRoute>
      <CompanyDetailContent params={params} searchParams={searchParams} />
    </ProtectedRoute>
  )
}

// 展開可能な特徴コンポーネント
function ExpandableFeature({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // テキストが3行を超えるかチェック（おおよそ）
  const needsExpansion = text.length > 150 || text.split('\n').length > 3
  
  return (
    <div 
      onClick={() => needsExpansion && setIsExpanded(!isExpanded)}
      className={`bg-gray-50 p-3 rounded-lg ${needsExpansion ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
    >
      <p className={`text-sm text-gray-800 break-words whitespace-pre-wrap ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {needsExpansion && (
        <div className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium">
          {isExpanded ? '閉じる' : '続きを読む'}
        </div>
      )}
    </div>
  )
}

function CompanyDetailContent({ params, searchParams }: CompanyDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string>('')
  const [company, setCompany] = useState<Company | null>(null)
  const [consultant, setConsultant] = useState<User | null>(null)
  const [relatedStores, setRelatedStores] = useState<any[]>([])
  const [relatedJobs, setRelatedJobs] = useState<any[]>([])
  const [storeSearchTerm, setStoreSearchTerm] = useState('')
  const [storePrefectureFilter, setStorePrefectureFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('basic')
  const [emailHistory, setEmailHistory] = useState<any[]>([])
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null)
  const [storesCurrentPage, setStoresCurrentPage] = useState(1)
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1)
  const itemsPerPage = 20

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/companies/${companyId}?tab=${tab}`)
  }

  // メール履歴を再取得する関数
  const refreshEmailHistory = async () => {
    try {
      const emailHistoryQuery = query(
        collection(db, 'emailHistory'),
        where('companyId', '==', companyId)
      )
      const emailHistorySnapshot = await getDocs(emailHistoryQuery)
      const emailHistoryData = emailHistorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEmailHistory(emailHistoryData)
      console.log('✅ メール履歴を更新しました:', emailHistoryData.length, '件')
    } catch (error) {
      console.warn('メール履歴の更新に失敗しました:', error)
    }
  }

  useEffect(() => {
    const initializeTab = async () => {
      const resolvedSearchParams = await searchParams
      const tabParam = resolvedSearchParams?.tab || 'basic'
      setActiveTab(tabParam)
    }
    initializeTab()
  }, [searchParams])

  useEffect(() => {
    const initializeComponent = async () => {
      const resolvedParams = await params
      
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な企業IDです')
        router.push('/companies')
        return
      }
      
      setCompanyId(resolvedParams.id)
      
      const fetchCompanyData = async () => {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', resolvedParams.id))
          if (companyDoc.exists()) {
            const companyData = companyDoc.data() as Company
            setCompany({ ...companyData, id: resolvedParams.id })
            
            // 担当コンサルタントの取得
            if (companyData.consultantId && companyData.consultantId.trim() !== '') {
              const consultantDoc = await getDoc(doc(db, 'users', companyData.consultantId))
              if (consultantDoc.exists()) {
                setConsultant({ ...consultantDoc.data() as User, id: companyData.consultantId })
              }
            }
            
            // 関連店舗の取得
            const storesQuery = query(
              collection(db, 'stores'),
              where('companyId', '==', resolvedParams.id)
            )
            const storesSnapshot = await getDocs(storesQuery)
            const storesData = storesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            setRelatedStores(storesData)
            
            // 関連求人の取得
            const jobsQuery = query(
              collection(db, 'jobs'),
              where('companyId', '==', resolvedParams.id)
            )
            const jobsSnapshot = await getDocs(jobsQuery)
            const jobsData = jobsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            setRelatedJobs(jobsData)
          } else {
            alert('企業が見つかりません')
            router.push('/companies')
          }
        } catch (error) {
          console.error('企業データの取得に失敗しました:', error)
          alert('企業データの取得に失敗しました')
        } finally {
          setLoading(false)
        }
      }

      fetchCompanyData()
    }

    initializeComponent()
  }, [params, router])

  // メール履歴のリアルタイムリッスン（別のuseEffect）
  useEffect(() => {
    if (!companyId || !user) {
      console.log('⏭️  メール履歴のリッスンをスキップ（companyId:', companyId, ', user:', user?.uid, '）')
      return
    }
    
    console.log('🔍 メール履歴のリッスンを設定中:', companyId, '| ユーザーID:', user.uid)
    
    try {
      const emailHistoryQuery = query(
        collection(db, 'emailHistory'),
        where('companyId', '==', companyId)
      )
      
      // リアルタイムリッスンを設定
      const unsubscribe = onSnapshot(emailHistoryQuery, (snapshot) => {
        console.log('📨 メール履歴スナップショット受信:', snapshot.docs.length, '件')
        const emailHistoryData = snapshot.docs.map(doc => {
          const data = doc.data()
          console.log('📄 メール履歴ドキュメント:', doc.id, data)
          return {
            id: doc.id,
            ...data
          }
        })
        setEmailHistory(emailHistoryData)
        console.log('✅ メール履歴状態を更新しました:', emailHistoryData.length, '件')
      }, (error: any) => {
        console.error('❌ メール履歴のリッスンエラー:', error)
        console.error('エラーコード:', error.code)
        console.error('エラーメッセージ:', error.message)
        
        // 権限エラーの場合はログアウトの可能性があるため、空配列を設定
        if (error.code === 'permission-denied') {
          console.warn('⚠️  権限エラーです。ユーザー認証を確認してください。')
          setEmailHistory([])
        }
      })
      
      // クリーンアップ関数を返す
      return () => {
        console.log('🧹 メール履歴のリスナーをクリーンアップしています')
        unsubscribe()
      }
    } catch (error) {
      console.error('❌ メール履歴のリッスン設定エラー:', error)
      return () => {}
    }
  }, [companyId, user])

  const getStatusBadge = (status: Company['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      prospect: 'bg-blue-100 text-blue-800',
      prospect_contacted: 'bg-yellow-100 text-yellow-800',
      appointment: 'bg-purple-100 text-purple-800',
      no_approach: 'bg-red-100 text-red-800',
      suspended: 'bg-red-100 text-red-800',
      paused: 'bg-orange-100 text-orange-800',
    }
    
    const labels = {
      active: '有効',
      inactive: '非アクティブ',
      prospect: '見込み客',
      prospect_contacted: '見込み客/接触あり',
      appointment: 'アポ',
      no_approach: 'アプローチ不可',
      suspended: '停止',
      paused: '休止',
    }
    
    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    )
  }

  // 企業データの更新ハンドラー（Domino連携用）
  const handleCompanyUpdate = (updatedCompany: Company) => {
    setCompany(updatedCompany)
  }

  // 日時フォーマット関数
  const formatDateTime = (dateValue: string | Date | any | undefined) => {
    if (!dateValue) return '未設定'
    
    try {
      let date: Date;
      
      // Firestoreのタイムスタンプオブジェクトの場合
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        date = dateValue.toDate()
      }
      // Date オブジェクトの場合
      else if (dateValue instanceof Date) {
        date = dateValue
      }
      // 文字列の場合
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue)
      }
      // secondsフィールドがある場合（Firestore Timestamp）
      else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000)
      }
      else {
        return '日時形式エラー'
      }
      
      if (isNaN(date.getTime())) return '無効な日時'
      
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      console.error('日時フォーマットエラー:', error, 'dateValue:', dateValue)
      return '日時エラー'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">企業が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/companies">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              企業一覧に戻る
            </Button>
          </Link>
        </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="line-clamp-2">{company.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {getStatusBadge(company.status)}
              {company.isPublic && (
                <Badge variant="outline">公開中</Badge>
              )}
              {consultant && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs sm:text-sm">
                  担当: {consultant.displayName || consultant.email}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <DominoLinkage 
            company={company} 
            onUpdate={handleCompanyUpdate}
          />
          <Link href={`/companies/${companyId}/edit`} className="w-full sm:w-auto">
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Edit className="h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">基本情報</span>
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">関連店舗</span>
            <Badge variant="secondary" className="ml-2">{relatedStores.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">関連求人</span>
            <Badge variant="secondary" className="ml-2">{relatedJobs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">進捗</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">履歴</span>
            <Badge variant="secondary" className="ml-2">{emailHistory.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* 基本情報タブ */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      所在地
                    </h3>
                    <p className="mt-1">{company.address}</p>
                  </div>

              {company.website && (
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    ウェブサイト
                  </h3>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {company.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-700">代表者名</h3>
                    <p className="text-lg">{company.representative || '未入力'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    従業員数
                  </h3>
                  <p className="mt-1 text-lg">{company.employeeCount || '未入力'}名</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    資本金
                  </h3>
                  <p className="mt-1 text-lg">{company.capital || '未入力'}万円</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    設立年
                  </h3>
                  <p className="mt-1 text-lg">{company.establishedYear || '未設定'}年</p>
                </div>
              </div>

              {/* 会社特徴 */}
              {(company.feature1 || company.feature2 || company.feature3) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">会社特徴</h3>
                    <div className="space-y-3">
                      {/* 特徴1 */}
                      {company.feature1 && (
                        <ExpandableFeature text={company.feature1} />
                      )}
                      {/* 特徴2 */}
                      {company.feature2 && (
                        <ExpandableFeature text={company.feature2} />
                      )}
                      {/* 特徴3 */}
                      {company.feature3 && (
                        <ExpandableFeature text={company.feature3} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 契約情報 */}
              {(company.contractType || company.contractDetails) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">契約情報</h3>
                    <div className="space-y-3">
                      {company.contractType && (
                        <div>
                          <h4 className="text-sm text-gray-600 mb-1">契約状況</h4>
                          <Badge className={company.contractType === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {company.contractType === 'paid' ? '有料紹介可' : '無料のみ'}
                          </Badge>
                        </div>
                      )}
                      {company.contractDetails && (
                        <div>
                          <h4 className="text-sm text-gray-600 mb-1">契約詳細</h4>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{company.contractDetails}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 福利厚生情報 */}
          {(company.hasHousingSupport || company.hasIndependenceSupport || company.fullTimeAgeGroup || company.independenceRecord || company.careerPath || company.youngRecruitReason) && (
            <Card>
              <CardHeader>
                <CardTitle>福利厚生・キャリア情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* サポート制度 */}
                {(company.hasHousingSupport || company.hasIndependenceSupport) && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">サポート制度</h3>
                    <div className="flex flex-wrap gap-2">
                      {company.hasHousingSupport && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          寮・家賃保証あり
                        </Badge>
                      )}
                      {company.hasIndependenceSupport && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          独立支援あり
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* 年齢層 */}
                {company.fullTimeAgeGroup && (
                  <div>
                    <h3 className="font-medium text-gray-700">正社員年齢層</h3>
                    <p className="mt-1 text-sm">{company.fullTimeAgeGroup}</p>
                  </div>
                )}

                {/* 独立実績 */}
                {company.independenceRecord && (
                  <div>
                    <h3 className="font-medium text-gray-700">独立実績</h3>
                    <p className="mt-1 text-sm">{company.independenceRecord}</p>
                  </div>
                )}

                {/* キャリアパス */}
                {company.careerPath && (
                  <div>
                    <h3 className="font-medium text-gray-700">目指せるキャリア</h3>
                    <p className="mt-1 text-sm">{company.careerPath}</p>
                  </div>
                )}

                {/* 若手入社理由 */}
                {company.youngRecruitReason && (
                  <div>
                    <h3 className="font-medium text-gray-700">若手の入社理由</h3>
                    <p className="mt-1 text-sm">{company.youngRecruitReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

            </div>

            {/* サイドバー */}
            <div className="space-y-6">
              {/* クイックアクション */}
              <Card>
                <CardHeader>
                  <CardTitle>クイックアクション</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href={`/stores/new?company=${companyId}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Store className="h-4 w-4 mr-2" />
                      新しい店舗を追加
                    </Button>
                  </Link>
                  
                  <Link href={`/jobs/new?company=${companyId}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Briefcase className="h-4 w-4 mr-2" />
                      新しい求人を作成
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* 統計情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    統計情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">店舗数</span>
                      <span className="font-medium">{relatedStores.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">求人数</span>
                      <span className="font-medium">{relatedJobs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">公開求人数</span>
                      <span className="font-medium">
                        {relatedJobs.filter(job => job.status === 'active').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* メモ・特記事項 */}
              {company.memo && (
                <Card>
                  <CardHeader>
                    <CardTitle>メモ・特記事項</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{company.memo}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 管理情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    管理情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">作成日時</span>
                      <span className="font-medium text-sm">{formatDateTime(company?.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">更新日時</span>
                      <span className="font-medium text-sm">{formatDateTime(company?.updatedAt)}</span>
                    </div>
                    {company?.contractStartDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">取引開始日</span>
                        <span className="font-medium text-sm">
                          {new Date(company.contractStartDate).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    )}
                    {consultant && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">担当者</span>
                        <span className="font-medium text-sm">{consultant.displayName || consultant.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Dominoシステム連携情報 */}
              {company.dominoId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-800">Dominoシステム連携</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-700">Domino ID:</span>
                          <span className="ml-2 font-mono">{company.dominoId}</span>
                        </div>
                        {company.importedAt && (
                          <div>
                            <span className="font-medium text-blue-700">インポート日時:</span>
                            <span className="ml-2">{formatDateTime(company.importedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 関連店舗タブ */}
        <TabsContent value="stores" className="space-y-6">
          {relatedStores.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  関連店舗 ({relatedStores.length}件)
                </CardTitle>
                <Link href={`/stores/new?company=${companyId}`}>
                  <Button variant="outline" size="sm">
                    <Store className="h-4 w-4 mr-2" />
                    新しい店舗を追加
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {/* 検索入力と都道府県フィルター */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Select value={storePrefectureFilter} onValueChange={(value) => {
                    setStorePrefectureFilter(value)
                    setStoresCurrentPage(1) // フィルター変更時にページをリセット
                  }}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="都道府県で絞り込み" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべての都道府県</SelectItem>
                      {(() => {
                        // 都道府県を北から南の順に並べる
                        const prefectureOrder = [
                          '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
                          '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
                          '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
                          '岐阜県', '静岡県', '愛知県', '三重県',
                          '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
                          '鳥取県', '島根県', '岡山県', '広島県', '山口県',
                          '徳島県', '香川県', '愛媛県', '高知県',
                          '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
                        ]
                        
                        // 店舗から都道府県を抽出してユニークなリストを作成
                        const uniquePrefectures = Array.from(new Set(
                          relatedStores
                            .map(store => store.prefecture)
                            .filter(Boolean)
                        ))
                        
                        // prefectureOrderに従ってソート
                        const sortedPrefectures = uniquePrefectures.sort((a, b) => {
                          const indexA = prefectureOrder.indexOf(a)
                          const indexB = prefectureOrder.indexOf(b)
                          // リストにない場合は最後に配置
                          if (indexA === -1) return 1
                          if (indexB === -1) return -1
                          return indexA - indexB
                        })
                        
                        return sortedPrefectures.map(pref => (
                          <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="店舗名、住所で検索..."
                      value={storeSearchTerm}
                      onChange={(e) => setStoreSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {(() => {
                    // 検索フィルタリングとソート
                    let filteredStores = [...relatedStores]
                    
                    // 都道府県フィルタ
                    if (storePrefectureFilter !== 'all') {
                      filteredStores = filteredStores.filter(store =>
                        store.prefecture === storePrefectureFilter
                      )
                    }
                    
                    // 検索フィルタ
                    if (storeSearchTerm.trim() !== '') {
                      const searchLower = storeSearchTerm.toLowerCase()
                      filteredStores = filteredStores.filter(store =>
                        store.name?.toLowerCase().includes(searchLower) ||
                        store.address?.toLowerCase().includes(searchLower)
                      )
                    }
                    
                    // 住所でソート
                    filteredStores.sort((a, b) => {
                      const addressA = a.address || ''
                      const addressB = b.address || ''
                      return addressA.localeCompare(addressB, 'ja')
                    })
                    
                    // 表示
                    if (filteredStores.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          {storeSearchTerm ? '検索条件に一致する店舗がありません' : '店舗がありません'}
                        </div>
                      )
                    }
                    
                    // ページネーション計算
                    const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
                    const startIndex = (storesCurrentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const displayStores = filteredStores.slice(startIndex, endIndex)
                    
                    return (
                      <>
                        {displayStores.map((store) => (
                          <div key={store.id} className="flex items-center justify-between p-3 border rounded-lg md:flex-row">
                            <div>
                              <h4 className="font-medium">
                                {store.name}
                                {store.prefecture && (
                                  <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600">{store.address}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/stores/${store.id}`}>
                                <Button variant="outline" size="sm">
                                  詳細
                                </Button>
                              </Link>
                              <Link href={`/stores/new?duplicate=${store.id}`}>
                                <Button variant="outline" size="sm">
                                  <Copy className="h-4 w-4 mr-1" />
                                  複製
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                        {totalPages > 1 && (
                          <div className="mt-6">
                            <Pagination
                              currentPage={storesCurrentPage}
                              totalPages={totalPages}
                              onPageChange={setStoresCurrentPage}
                              itemsPerPage={itemsPerPage}
                              totalItems={filteredStores.length}
                            />
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <Store className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="mb-4">関連店舗がありません</p>
                  <Link href={`/stores/new?company=${companyId}`}>
                    <Button>
                      <Store className="h-4 w-4 mr-2" />
                      新しい店舗を追加
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 関連求人タブ */}
        <TabsContent value="jobs" className="space-y-6">
          {relatedJobs.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  関連求人 ({relatedJobs.length}件)
                </CardTitle>
                <Link href={`/jobs/new?company=${companyId}`}>
                  <Button variant="outline" size="sm">
                    <Briefcase className="h-4 w-4 mr-2" />
                    新しい求人を作成
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    // ページネーション計算
                    const totalPages = Math.ceil(relatedJobs.length / itemsPerPage)
                    const startIndex = (jobsCurrentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const displayJobs = relatedJobs.slice(startIndex, endIndex)
                    
                    return (
                      <>
                        {displayJobs.map((job) => {
                    // 求人に紐付く店舗を取得
                    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
                    const jobStores = storeIds
                      .map((storeId: string) => relatedStores.find(s => s.id === storeId))
                      .filter(Boolean)
                    
                    // 店舗の都道府県を取得
                    const prefecture = jobStores.length > 0 && jobStores[0]?.prefecture 
                      ? jobStores[0].prefecture 
                      : null
                    
                    // 求人ステータス
                    const jobStatus = job.status || 'draft'
                    const statusColors = {
                      draft: 'bg-gray-100 text-gray-800',
                      active: 'bg-green-100 text-green-800',
                      closed: 'bg-red-100 text-red-800'
                    }
                    const statusLabels = {
                      draft: '下書き',
                      active: '募集中',
                      closed: '募集終了'
                    }
                    
                    return (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg md:flex-row">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{job.title}</h4>
                            <Badge className={statusColors[jobStatus as keyof typeof statusColors]}>
                              {statusLabels[jobStatus as keyof typeof statusLabels]}
                            </Badge>
                            {prefecture && (
                              <Badge variant="outline" className="text-xs">
                                {prefecture}
                              </Badge>
                            )}
                          </div>
                          {jobStores.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Store className="h-3 w-3 text-gray-500" />
                              <p className="text-sm text-gray-600">
                                {jobStores[0].name}
                                {jobStores.length > 1 && (
                                  <span className="text-gray-500 ml-1">
                                    他{jobStores.length - 1}店舗
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {job.location && (
                            <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                          )}
                        </div>
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            詳細
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                  {totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={jobsCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setJobsCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={relatedJobs.length}
                      />
                    </div>
                  )}
                </>
              )
            })()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="mb-4">関連求人がありません</p>
                  <Link href={`/jobs/new?company=${companyId}`}>
                    <Button>
                      <Briefcase className="h-4 w-4 mr-2" />
                      新しい求人を作成
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 進捗タブ */}
        <TabsContent value="progress" className="space-y-6">
          <RelatedMatches 
            type="company" 
            entityId={companyId}
            entityName={company?.name}
            onEmailSent={refreshEmailHistory}
          />
        </TabsContent>

        {/* 履歴タブ */}
        <TabsContent value="history" className="space-y-6">
          {emailHistory.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    メール送信履歴 ({emailHistory.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">送信日時</th>
                          <th className="text-left py-3 px-4 font-medium">宛先</th>
                          <th className="text-left py-3 px-4 font-medium">件名</th>
                          <th className="text-left py-3 px-4 font-medium">ステータス</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailHistory
                          .sort((a: any, b: any) => {
                            // 送信日時降順（新しい順）
                            const timeA = a.sentAt || a.createdAt
                            const timeB = b.sentAt || b.createdAt
                            
                            let dateA = new Date(0)
                            let dateB = new Date(0)
                            
                            if (timeA && typeof timeA === 'object' && timeA.toDate) {
                              dateA = timeA.toDate()
                            } else if (timeA instanceof Date) {
                              dateA = timeA
                            } else if (typeof timeA === 'string') {
                              dateA = new Date(timeA)
                            } else if (timeA && typeof timeA === 'object' && timeA.seconds) {
                              dateA = new Date(timeA.seconds * 1000)
                            }
                            
                            if (timeB && typeof timeB === 'object' && timeB.toDate) {
                              dateB = timeB.toDate()
                            } else if (timeB instanceof Date) {
                              dateB = timeB
                            } else if (typeof timeB === 'string') {
                              dateB = new Date(timeB)
                            } else if (timeB && typeof timeB === 'object' && timeB.seconds) {
                              dateB = new Date(timeB.seconds * 1000)
                            }
                            
                            return dateB.getTime() - dateA.getTime()
                          })
                          .map((email: any) => (
                            <tr 
                              key={email.id} 
                              className="border-b hover:bg-purple-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedEmail(email)}
                            >
                              <td className="py-3 px-4">{formatDateTime(email.sentAt || email.createdAt)}</td>
                              <td className="py-3 px-4">{email.to || '未設定'}</td>
                              <td className="py-3 px-4">{email.subject || '(件名なし)'}</td>
                              <td className="py-3 px-4">
                                <Badge className={email.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {email.status === 'sent' ? '送信済み' : '保留中'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* メール本文プレビューダイアログ */}
              <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>メール詳細</DialogTitle>
                    <DialogDescription>
                      {selectedEmail && formatDateTime(selectedEmail.sentAt || selectedEmail.createdAt)}
                    </DialogDescription>
                  </DialogHeader>
                  {selectedEmail && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600 mb-1">から</h3>
                        <p className="text-sm">{selectedEmail.from || '未設定'}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600 mb-1">宛先</h3>
                        <p className="text-sm">{selectedEmail.to || '未設定'}</p>
                      </div>
                      {selectedEmail.cc && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-600 mb-1">CC</h3>
                          <p className="text-sm">{selectedEmail.cc}</p>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600 mb-1">件名</h3>
                        <p className="text-sm font-medium">{selectedEmail.subject || '(件名なし)'}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600 mb-2">本文</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm whitespace-pre-wrap break-words">
                          {selectedEmail.body || '(本文なし)'}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600 mb-1">ステータス</h3>
                        <Badge className={selectedEmail.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {selectedEmail.status === 'sent' ? '送信済み' : '保留中'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>メール送信履歴がありません</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
