"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Briefcase, 
  Building, 
  Calendar,
  Mail,
  MapPin,
  FileText,
  TrendingUp,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate } from '@/types/candidate'
import { Match } from '@/types/matching'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { toast } from 'sonner'

const statusLabels: Record<Match['status'], string> = {
  suggested: '確認中',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過',
  interview: '面接',
  interview_passed: '面接通過',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

const statusColors: Record<Match['status'], string> = {
  suggested: 'bg-blue-100 text-blue-800',
  applied: 'bg-purple-100 text-purple-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-cyan-100 text-cyan-800',
  interview: 'bg-orange-100 text-orange-800',
  interview_passed: 'bg-teal-100 text-teal-800',
  offer: 'bg-green-100 text-green-800',
  offer_accepted: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
}

interface MatchWithDetails extends Match {
  jobTitle?: string
  companyName?: string
  storeName?: string
}

interface CandidateMypageProps {
  params: Promise<{
    id: string
  }>
}

export default function CandidateMypage({ params }: CandidateMypageProps) {
  const router = useRouter()
  const [candidateId, setCandidateId] = useState<string>('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingMatchId, setApplyingMatchId] = useState<string | null>(null)
  const [hasSurvey, setHasSurvey] = useState(false)
  const [surveyData, setSurveyData] = useState<any>(null)

  // 日付を安全にフォーマットする関数
  const formatDate = (date: any): string => {
    if (!date) return '-'
    
    try {
      // Firestore Timestamp型の場合
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('ja-JP')
      }
      // Date型の場合
      if (date instanceof Date) {
        return date.toLocaleDateString('ja-JP')
      }
      // 文字列の場合
      if (typeof date === 'string') {
        const parsedDate = new Date(date)
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('ja-JP')
        }
      }
      // その他の場合、そのまま変換を試みる
      const parsedDate = new Date(date)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString('ja-JP')
      }
    } catch (error) {
      console.error('日付フォーマットエラー:', error)
    }
    
    return '-'
  }

  // 日時を安全にフォーマットする関数
  const formatDateTime = (date: any): { date: string; time: string } | null => {
    if (!date) return null
    
    try {
      let dateObj: Date | null = null
      
      // Firestore Timestamp型の場合
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate()
      }
      // Date型の場合
      else if (date instanceof Date) {
        dateObj = date
      }
      // 文字列の場合
      else if (typeof date === 'string') {
        dateObj = new Date(date)
      }
      // その他の場合
      else {
        dateObj = new Date(date)
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        return {
          date: dateObj.toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric'
          }),
          time: dateObj.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }
    } catch (error) {
      console.error('日時フォーマットエラー:', error)
    }
    
    return null
  }

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setCandidateId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!candidateId) return
    
    // セッション認証チェック
    const candidateAuth = sessionStorage.getItem('candidate_auth')
    if (!candidateAuth) {
      toast.error('ログインが必要です')
      router.push('/public/candidates/auth')
      return
    }

    try {
      const authData = JSON.parse(candidateAuth)
      
      // セッションの有効期限チェック（24時間）
      const sessionAge = Date.now() - authData.timestamp
      const maxAge = 24 * 60 * 60 * 1000 // 24時間
      
      if (sessionAge > maxAge) {
        toast.error('セッションの有効期限が切れました。再度ログインしてください')
        sessionStorage.removeItem('candidate_auth')
        router.push('/public/candidates/auth')
        return
      }

      // URLのIDとセッションのIDが一致するかチェック
      if (authData.id !== candidateId) {
        toast.error('アクセス権限がありません')
        router.push('/public/candidates/auth')
        return
      }

      loadData()
    } catch (error) {
      console.error('認証エラー:', error)
      sessionStorage.removeItem('candidate_auth')
      router.push('/public/candidates/auth')
    }
  }, [candidateId])

  const loadData = async () => {
    setLoading(true)
    try {
      // 求職者データを取得
      const candidateDoc = await getDoc(doc(db, 'candidates', candidateId))
      if (!candidateDoc.exists()) {
        toast.error('求職者が見つかりません')
        router.push('/public/candidates/auth')
        return
      }

      const candidateData = { id: candidateDoc.id, ...candidateDoc.data() } as Candidate
      setCandidate(candidateData)

      // マッチングデータを取得
      const matchesQuery = query(
        collection(db, 'matches'),
        where('candidateId', '==', candidateId)
      )
      const matchesSnapshot = await getDocs(matchesQuery)
      const matchesData = matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Match))

      // 求人・企業・店舗情報を取得
      const matchesWithDetails = await Promise.all(
        matchesData.map(async (match) => {
          try {
            const jobDoc = await getDoc(doc(db, 'jobs', match.jobId))
            const jobData = jobDoc.exists() ? { id: jobDoc.id, ...jobDoc.data() } as Job : null

            let companyData: Company | null = null
            let storeData: Store | null = null

            if (jobData) {
              const companyDoc = await getDoc(doc(db, 'companies', jobData.companyId))
              companyData = companyDoc.exists() ? { id: companyDoc.id, ...companyDoc.data() } as Company : null

              if (jobData.storeId) {
                const storeDoc = await getDoc(doc(db, 'stores', jobData.storeId))
                storeData = storeDoc.exists() ? { id: storeDoc.id, ...storeDoc.data() } as Store : null
              }
            }

            return {
              ...match,
              jobTitle: jobData?.title || '求人不明',
              companyName: companyData?.name || '企業不明',
              storeName: storeData?.name
            }
          } catch (error) {
            console.error('マッチング詳細取得エラー:', error)
            return {
              ...match,
              jobTitle: '取得エラー',
              companyName: '取得エラー'
            }
          }
        })
      )

      // 更新日でソート
      matchesWithDetails.sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime()
        const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime()
        return dateB - dateA
      })

      setMatches(matchesWithDetails)

      // アンケート回答済みかチェックとデータ取得
      const surveysQuery = query(
        collection(db, 'surveys'),
        where('candidateId', '==', candidateId)
      )
      const surveysSnapshot = await getDocs(surveysQuery)
      
      if (!surveysSnapshot.empty) {
        setHasSurvey(true)
        const surveyDoc = surveysSnapshot.docs[0]
        setSurveyData({ id: surveyDoc.id, ...surveyDoc.data() })
      } else {
        setHasSurvey(false)
        setSurveyData(null)
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    // セッションストレージをクリア（Firebase Authは使用しない）
    sessionStorage.removeItem('candidate_auth')
    toast.success('ログアウトしました')
    router.push('/public/candidates/auth')
  }

  const handleApply = async (matchId: string, e: React.MouseEvent) => {
    // 行クリックイベントの伝播を防止
    e.stopPropagation()
    
    if (!confirm('この求人に応募しますか？')) {
      return
    }

    setApplyingMatchId(matchId)
    try {
      const matchRef = doc(db, 'matches', matchId)
      await updateDoc(matchRef, {
        status: 'applied',
        updatedAt: new Date()
      })

      toast.success('応募しました')
      
      // データを再読み込み
      await loadData()
    } catch (error) {
      console.error('応募エラー:', error)
      toast.error('応募に失敗しました')
    } finally {
      setApplyingMatchId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-900">マイページ</h1>
              <p className="text-gray-600">{candidate.lastName} {candidate.firstName}さん</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="border-blue-200 text-blue-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 基本情報 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-900">基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">お名前</p>
                    <p className="font-medium">{candidate.lastName} {candidate.firstName}</p>
                    {(candidate.lastNameKana || candidate.firstNameKana) && (
                      <p className="text-sm text-gray-500">
                        {candidate.lastNameKana} {candidate.firstNameKana}
                      </p>
                    )}
                  </div>
                </div>

                {candidate.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">メールアドレス</p>
                      <p className="font-medium break-all">{candidate.email}</p>
                    </div>
                  </div>
                )}

                {candidate.campus && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">入学校舎</p>
                      <p className="font-medium">
                        {candidate.campus === 'tokyo' && '東京校'}
                        {candidate.campus === 'osaka' && '大阪校'}
                        {candidate.campus === 'awaji' && '淡路校'}
                        {candidate.campus === 'fukuoka' && '福岡校'}
                      </p>
                    </div>
                  </div>
                )}

                {candidate.enrollmentDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">入学年月</p>
                      <p className="font-medium">
                        {new Date(candidate.enrollmentDate).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 紹介中の求人 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      紹介中の求人
                    </CardTitle>
                    <CardDescription>あなたにご紹介している求人の進捗状況</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    {matches.length}件
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {matches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>求人・企業</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>面接日時</TableHead>
                          <TableHead>更新日</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches.map((match) => (
                          <TableRow 
                            key={match.id}
                            className="cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => router.push(`/public/jobs/${match.jobId}`)}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-blue-600 hover:underline">{match.jobTitle}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Building className="h-3 w-3" />
                                  <span>{match.companyName}</span>
                                  {match.storeName && (
                                    <span className="text-xs">（{match.storeName}）</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[match.status]}>
                                {statusLabels[match.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const dateTime = formatDateTime(match.interviewDate)
                                return dateTime ? (
                                  <div className="text-sm">
                                    <div>{dateTime.date}</div>
                                    <div className="text-xs text-gray-500">{dateTime.time}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(match.updatedAt)}
                            </TableCell>
                            <TableCell className="text-center">
                              {match.status === 'suggested' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => handleApply(match.id, e)}
                                  disabled={applyingMatchId === match.id}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {applyingMatchId === match.id ? '処理中...' : '応募する'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">紹介中の求人はありません</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* キャリア価値観診断 */}
            <Card className="mt-6 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  キャリア価値観診断
                </CardTitle>
                <CardDescription>
                  あなたが大切にしている価値観を診断します（約5分）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-gray-900 mb-2">診断でわかること</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">✓</span>
                        <span>給与・待遇面で重視していること</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">✓</span>
                        <span>働き方・環境面で大切にしていること</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600">✓</span>
                        <span>キャリア・成長面での優先順位</span>
                      </li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => router.push(`/public/candidates/${candidateId}/diagnosis`)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    診断を始める
                  </Button>
                  <p className="text-xs text-gray-600 text-center">
                    診断結果は担当者との面談時に共有できます
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* アンケート回答セクション */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  アンケート
                </CardTitle>
                <CardDescription>
                  {hasSurvey ? 'ご協力ありがとうございました' : '就職活動に関するアンケートにご協力ください'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasSurvey && surveyData ? (
                  <div className="space-y-6">
                    {/* アンケート結果表示 */}
                    <div className="space-y-4">
                      {surveyData.nearestStation && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">最寄駅</p>
                          <p className="text-gray-900">{surveyData.nearestStation}</p>
                        </div>
                      )}
                      
                      {surveyData.cookingExperience && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">調理経験</p>
                          <p className="text-gray-900">{surveyData.cookingExperience}</p>
                        </div>
                      )}
                      
                      {surveyData.jobSearchTiming && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">就職活動開始タイミング</p>
                          <p className="text-gray-900">{surveyData.jobSearchTiming}</p>
                        </div>
                      )}
                      
                      {surveyData.partTimeHope && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">アルバイト希望</p>
                          <p className="text-gray-900">{surveyData.partTimeHope}</p>
                        </div>
                      )}
                      
                      {surveyData.graduationCareerPlan && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">卒業直後の希望進路</p>
                          <p className="text-gray-900">{surveyData.graduationCareerPlan}</p>
                        </div>
                      )}
                      
                      {surveyData.preferredArea && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">就職・開業希望エリア</p>
                          <p className="text-gray-900 whitespace-pre-wrap">{surveyData.preferredArea}</p>
                        </div>
                      )}
                      
                      {surveyData.preferredWorkplace && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">お店の雰囲気・条件</p>
                          <p className="text-gray-900 whitespace-pre-wrap">{surveyData.preferredWorkplace}</p>
                        </div>
                      )}
                      
                      {surveyData.futureCareerVision && (
                        <div className="border-b pb-3">
                          <p className="text-sm text-gray-500 mb-1">将来のキャリア像</p>
                          <p className="text-gray-900 whitespace-pre-wrap">{surveyData.futureCareerVision}</p>
                        </div>
                      )}
                      
                      {surveyData.submittedAt && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-400">
                            回答日: {formatDate(surveyData.submittedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 編集ボタン */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => router.push(`/public/candidates/${candidateId}/survey/edit`)}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        アンケートを編集
                      </Button>
                    </div>
                  </div>
                ) : hasSurvey ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">アンケートデータを読み込んでいます...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      今後のサービス向上のため、就職活動についてのアンケートにご協力ください。
                      所要時間は約5分です。
                    </p>
                    <Button
                      onClick={() => router.push(`/public/candidates/${candidateId}/survey/new`)}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      アンケートに回答する
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
