"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProtectedRoute from '@/components/ProtectedRoute'
import DominoLinkage from '@/components/companies/DominoLinkage'
import RelatedMatches from '@/components/matches/RelatedMatches'
import CompanyBasicTab from '@/components/companies/detail/CompanyBasicTab'
import CompanyStoresTab from '@/components/companies/detail/CompanyStoresTab'
import CompanyJobsTab from '@/components/companies/detail/CompanyJobsTab'
import CompanyHistoryTab from '@/components/companies/detail/CompanyHistoryTab'
import CompanyContactTab from '@/components/companies/detail/CompanyContactTab'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Building2, 
  Store,
  Briefcase,
  Edit,
  CheckCircle,
  Mail,
  Send,
  User as UserIcon
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore'
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

function CompanyDetailContent({ params, searchParams }: CompanyDetailPageProps) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
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
  const [sendingToDomino, setSendingToDomino] = useState(false)
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
        where('companyId', '==', companyId),
        orderBy('sentAt', 'desc'),
        limit(50)
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

  // Dominoに送信
  const handleSendToDomino = async () => {
    if (!company) return

    // まずドライランで確認
    if (!confirm(`【テスト送信】\n\n「${company.name}」とその店舗データの変換プレビューを確認しますか？\n\n※実際の送信は行われません`)) {
      return
    }

    setSendingToDomino(true)

    try {
      // ドライランモード
      const dryRunResponse = await fetch(`/api/domino/export?type=all&companyId=${companyId}&dryRun=true`, {
        method: 'POST',
      })

      const dryRunResult = await dryRunResponse.json()

      if (!dryRunResponse.ok) {
        throw new Error(dryRunResult.error || 'プレビューの取得に失敗しました')
      }

      const { companies: companiesResult, stores: storesResult } = dryRunResult.results

      // データを整形して表示
      let previewMessage = `【送信データプレビュー】\n\n`
      previewMessage += `企業: ${companiesResult.total}件\n`
      previewMessage += `店舗: ${storesResult.total}件\n\n`
      
      if (companiesResult.data.length > 0) {
        previewMessage += `--- 企業データ ---\n`
        companiesResult.data.forEach((item: any) => {
          previewMessage += `• ${item.company}\n`
          previewMessage += `  ID: ${item.payload.id}\n`
          previewMessage += `  住所: ${item.payload.address || 'なし'}\n\n`
        })
      }

      if (storesResult.data.length > 0) {
        previewMessage += `--- 店舗データ ---\n`
        storesResult.data.forEach((item: any) => {
          previewMessage += `• ${item.store} (${item.company})\n`
          previewMessage += `  ID: ${item.payload.id}\n`
          previewMessage += `  住所: ${item.payload.address || 'なし'}\n\n`
        })
      }

      previewMessage += `\n\n⚠️ 注意: Domino APIエンドポイントが正しく設定されている必要があります。\n現在のエンドポイント: ${process.env.NEXT_PUBLIC_DOMINO_API_URL || 'https://sushi-domino.vercel.app/api/hr-export'}`

      console.log('=== Domino Export Preview ===')
      console.log('Companies:', companiesResult.data)
      console.log('Stores:', storesResult.data)
      
      alert(previewMessage)

      // 本番送信の確認
      if (!confirm('データを確認しました。\n\n実際にDominoに送信しますか？')) {
        setSendingToDomino(false)
        return
      }

      // 実際の送信
      const response = await fetch(`/api/domino/export?type=all&companyId=${companyId}`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'エクスポートに失敗しました')
      }

      const { companies: finalCompanies, stores: finalStores } = result.results

      if (finalCompanies.failed === 0 && finalStores.failed === 0) {
        toast.success(
          `Dominoに送信しました\n企業: ${finalCompanies.exported}件\n店舗: ${finalStores.exported}件`
        )
      } else {
        const errors = [...finalCompanies.errors, ...finalStores.errors]
        toast.error(
          `送信エラー\n企業: ${finalCompanies.exported}/${finalCompanies.total}件\n店舗: ${finalStores.exported}/${finalStores.total}件\n\nエラー: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`
        )
        console.error('Domino export errors:', errors)
      }
    } catch (error) {
      console.error('Domino export error:', error)
      toast.error(error instanceof Error ? error.message : 'Dominoへの送信に失敗しました')
    } finally {
      setSendingToDomino(false)
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
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToDomino}
              disabled={sendingToDomino}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingToDomino ? '送信中...' : 'Domino送信'}
            </Button>
          )}
          <Link href={`/companies/${companyId}/edit`} className="w-full sm:w-auto">
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Edit className="h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
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
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">担当者</span>
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
          <CompanyBasicTab
            company={company}
            consultant={consultant}
            relatedStores={relatedStores}
            relatedJobs={relatedJobs}
            companyId={companyId}
          />
        </TabsContent>

        {/* 関連店舗タブ */}
        <TabsContent value="stores" className="space-y-6">
          <CompanyStoresTab
            relatedStores={relatedStores}
            relatedJobs={relatedJobs}
            companyId={companyId}
            itemsPerPage={itemsPerPage}
            storePrefectureFilter={storePrefectureFilter}
            setStorePrefectureFilter={setStorePrefectureFilter}
            storeSearchTerm={storeSearchTerm}
            setStoreSearchTerm={setStoreSearchTerm}
            storesCurrentPage={storesCurrentPage}
            setStoresCurrentPage={setStoresCurrentPage}
          />
        </TabsContent>

        {/* 関連求人タブ */}
        <TabsContent value="jobs" className="space-y-6">
          <CompanyJobsTab
            relatedJobs={relatedJobs}
            relatedStores={relatedStores}
            companyId={companyId}
            itemsPerPage={itemsPerPage}
            jobsCurrentPage={jobsCurrentPage}
            setJobsCurrentPage={setJobsCurrentPage}
          />
        </TabsContent>

        {/* 担当者タブ */}
        <TabsContent value="contact" className="space-y-6">
          <CompanyContactTab company={company} />
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
          <CompanyHistoryTab
            emailHistory={emailHistory}
            selectedEmail={selectedEmail}
            setSelectedEmail={setSelectedEmail}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
