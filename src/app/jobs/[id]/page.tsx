"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  ArrowLeft, 
  Briefcase, 
  Edit, 
  MapPin, 
  Clock, 
  DollarSign,
  Calendar,
  Building2,
  Store,
  Eye,
  EyeOff,
  TrendingUp,
  User,
  Share,
  Copy
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'
import { Company } from '@/types/company'

interface JobDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <ProtectedRoute>
      <JobDetailContent params={params} />
    </ProtectedRoute>
  )
}

function JobDetailContent({ params }: JobDetailPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobId, setJobId] = useState<string>('')
  const [job, setJob] = useState<Job | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [stores, setStores] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [showPublicUrl, setShowPublicUrl] = useState(false)

  useEffect(() => {
    const initializeComponent = async () => {
      const resolvedParams = await params
      
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な求人IDです')
        router.push('/jobs')
        return
      }
      
      setJobId(resolvedParams.id)
      
      const fetchJobData = async () => {
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', resolvedParams.id))
          if (jobDoc.exists()) {
            const jobData = jobDoc.data() as Job
            setJob({ ...jobData, id: resolvedParams.id })
            
            // 関連企業の取得
            if (jobData.companyId && jobData.companyId.trim() !== '') {
              const companyDoc = await getDoc(doc(db, 'companies', jobData.companyId))
              if (companyDoc.exists()) {
                setCompany({ ...companyDoc.data() as Company, id: jobData.companyId })
              }
            }
            
            // 関連店舗の取得（複数対応）
            const storesList: any[] = []
            const storeIds = jobData.storeIds || (jobData.storeId ? [jobData.storeId] : [])
            const validStoreIds = storeIds.filter(id => id && id.trim() !== '')
            
            if (validStoreIds.length > 0) {
              for (const storeId of validStoreIds) {
                const storeDoc = await getDoc(doc(db, 'stores', storeId))
                if (storeDoc.exists()) {
                  storesList.push({ ...storeDoc.data(), id: storeId })
                }
              }
              setStores(storesList)
            }
            
            // 応募者の取得
            const applicationsQuery = query(
              collection(db, 'applications'),
              where('jobId', '==', resolvedParams.id)
            )
            const applicationsSnapshot = await getDocs(applicationsQuery)
            const applicationsData = applicationsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            setApplications(applicationsData)
          } else {
            alert('求人が見つかりません')
            router.push('/jobs')
          }
        } catch (error) {
          console.error('求人データの取得に失敗しました:', error)
          alert('求人データの取得に失敗しました')
        } finally {
          setLoading(false)
        }
      }

      fetchJobData()
    }

    initializeComponent()
  }, [params, router])

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
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('日時のフォーマットに失敗:', error)
      return '不正な日時'
    }
  }

  const getStatusBadge = (status: Job['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      paused: 'bg-yellow-100 text-yellow-800',
    }
    
    const labels = {
      draft: '下書き',
      published: '公開中',
      active: '募集中',
      closed: '終了',
      paused: '一時停止',
    }
    
    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    )
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

  const getPublicUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/public/jobs/${jobId}`
    }
    return ''
  }

  const copyPublicUrl = async () => {
    try {
      // 店舗名を取得
      let storeNames = ''
      if (stores.length > 0) {
        storeNames = stores.map(s => s.name).join('、')
      }
      
      // おすすめポイントを取得
      const recommendedPoints = job?.recommendedPoints || ''
      
      // コピー用のテキストを作成
      const copyText = `【店舗名】${storeNames}\n【おすすめポイント】\n${recommendedPoints}\n${getPublicUrl()}`
      
      await navigator.clipboard.writeText(copyText)
      alert('店舗名、おすすめポイント、公開URLをクリップボードにコピーしました')
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  const openPublicUrl = () => {
    window.open(getPublicUrl(), '_blank')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">求人が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
      <Link href={company ? `/jobs?search=${encodeURIComponent(company.name)}` : '/jobs'}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {company ? `${company.name}の求人一覧に戻る` : '求人一覧に戻る'}
        </Button>
      </Link>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8" />
              {job.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(job.status)}
              {getEmploymentTypeBadge(job.employmentType)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPublicUrl(!showPublicUrl)}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Share className="h-4 w-4 mr-2" />
            公開URL {job.status && `(${job.status})`}
          </Button>
          {showPublicUrl && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicUrl}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                コピー
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openPublicUrl}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                プレビュー
              </Button>
            </div>
          )}
          <Link href={`/jobs/${jobId}/edit`}>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      {/* 公開URL表示 */}
      {showPublicUrl && job.status === 'active' && (
        <div className="mb-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-green-800 mb-2">公開URL</h3>
                  <p className="text-sm text-green-700 bg-white px-3 py-2 rounded border">
                    {getPublicUrl()}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    この URLを応募者に共有すると、ログインなしで求人票を閲覧できます。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>求人基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">職種</h3>
                  <p className="text-lg">{job.title}</p>
                </div>
                <div className="space-y-3">
                  {job.salaryInexperienced && (
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        給与（未経験者）
                      </h3>
                      <p className="text-lg">{job.salaryInexperienced}</p>
                    </div>
                  )}
                  {job.salaryExperienced && (
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        給与（経験者）
                      </h3>
                      <p className="text-lg">{job.salaryExperienced}</p>
                    </div>
                  )}
                  {!job.salaryInexperienced && !job.salaryExperienced && (
                    <div>
                      <h3 className="font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        給与
                      </h3>
                      <p className="text-lg">要相談</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  勤務地
                </h3>
                {stores.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {stores.map((store, index) => (
                      <div key={store.id} className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <p className="font-medium">
                            {store.name}
                            {store.prefecture && (
                              <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                            )}
                          </p>
                          {store.address && (
                            <p className="text-sm text-gray-600">{store.address}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1">本社勤務</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    勤務時間
                  </h3>
                  <p className="mt-1">{job.workingHours || '要相談'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    休日
                  </h3>
                  <p className="mt-1">{job.holidays || '要相談'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 仕事内容 */}
          {job.jobDescription && (
            <Card>
              <CardHeader>
                <CardTitle>職務内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">{job.jobDescription}</div>
              </CardContent>
            </Card>
          )}

          {/* 年齢制限（管理用情報） */}
          {(job.ageLimit || job.ageNote) && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">年齢制限（管理用情報）</CardTitle>
                <p className="text-xs text-amber-700 mt-1">⚠️ この情報は公開ページには表示されません</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.ageLimit && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">年齢上限</h3>
                    <p className="text-lg">{job.ageLimit}歳</p>
                  </div>
                )}
                {job.ageNote && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">年齢補足</h3>
                    <p className="whitespace-pre-wrap">{job.ageNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 応募要件 */}
                    {job.requiredSkills && (
            <Card>
              <CardHeader>
                <CardTitle>求めるスキル・資格</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">必要なスキル</h3>
                  <div className="whitespace-pre-wrap">{job.requiredSkills}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 福利厚生・待遇 */}
          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>福利厚生・待遇</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">
                  {typeof job.benefits === 'string' ? job.benefits : JSON.stringify(job.benefits)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 企業・店舗情報 */}
          <Card>
            <CardHeader>
              <CardTitle>勤務先情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company && (
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    企業
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span>{company.name}</span>
                    <Link href={`/companies/${company.id}`}>
                      <Button variant="outline" size="sm">詳細</Button>
                    </Link>
                  </div>
                </div>
              )}

              {stores.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    店舗 ({stores.length}件)
                  </h3>
                  <div className="mt-2 space-y-2">
                    {stores.map((store) => (
                      <div key={store.id} className="flex items-center justify-between">
                        <span className="text-sm">
                          {store.name}
                          {store.prefecture && (
                            <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                          )}
                        </span>
                        <Link href={`/stores/${store.id}`}>
                          <Button variant="outline" size="sm">詳細</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* クイックアクション */}
          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/jobs/${jobId}/edit`}>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  求人情報を編集
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  if (job.status === 'active') {
                    // 公開停止の処理
                    console.log('求人を非公開にする')
                  } else {
                    // 公開の処理
                    console.log('求人を公開する')
                  }
                }}
              >
                {job.status === 'active' ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    公開を停止
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    求人を公開
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 統計情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                応募状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">総応募数</span>
                  <span className="font-medium">{applications.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">新規応募</span>
                  <span className="font-medium">
                    {applications.filter(app => app.status === 'applied').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">書類選考中</span>
                  <span className="font-medium">
                    {applications.filter(app => app.status === 'screening').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">面接予定</span>
                  <span className="font-medium">
                    {applications.filter(app => app.status === 'interview').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">内定</span>
                  <span className="font-medium">
                    {applications.filter(app => app.status === 'offered').length}
                  </span>
                </div>
              </div>
              
              {applications.length > 0 && (
                <div className="mt-4">
                  <Link href={`/applications?job=${jobId}`}>
                    <Button variant="outline" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      応募者一覧を見る
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 求人設定 */}
          <Card>
            <CardHeader>
              <CardTitle>求人設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">公開状況</span>
                  <span>{job.status === 'active' ? '募集中' : job.status === 'draft' ? '下書き' : '募集終了'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">雇用形態</span>
                  <span>{getEmploymentTypeBadge(job.employmentType)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">作成日時</span>
                  <span>{formatDateTime(job.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新日時</span>
                  <span>{formatDateTime(job.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
