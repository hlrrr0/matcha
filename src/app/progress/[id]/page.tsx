"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User as UserIcon,
  Briefcase,
  Building,
  Star,
  MessageSquare,
  Plus,
  Eye,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  FileText
} from 'lucide-react'
import { Match, MatchTimeline } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'
import { getMatch, updateMatchStatus } from '@/lib/firestore/matches'
import { getCandidate } from '@/lib/firestore/candidates'
import { getJob } from '@/lib/firestore/jobs'
import { getCompany } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const statusLabels: Record<Match['status'], string> = {
  suggested: '提案済み',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過（面接設定中）',
  interview: '面接',
  interview_passed: '面接合格（次回面接設定中）',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

const statusColors: Record<Match['status'], string> = {
  suggested: 'bg-blue-100 text-blue-800 border-blue-200',
  applied: 'bg-purple-100 text-purple-800 border-purple-200',
  document_screening: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  document_passed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  interview: 'bg-orange-100 text-orange-800 border-orange-200',
  interview_passed: 'bg-teal-100 text-teal-800 border-teal-200',
  offer: 'bg-green-100 text-green-800 border-green-200',
  offer_accepted: 'bg-green-600 text-white border-green-600',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-800 border-gray-200'
}

const statusIcons: Record<Match['status'], any> = {
  suggested: Target,
  applied: Briefcase,
  document_screening: Eye,
  document_passed: Calendar,
  interview: MessageSquare,
  interview_passed: CheckCircle,
  offer: Star,
  offer_accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
}

// ステータスに応じた表示ラベルを取得（面接回数を含む）
const getStatusLabel = (status: Match['status'], interviewRound?: number): string => {
  if (status === 'interview' && interviewRound) {
    return `${interviewRound}次面接`
  }
  if (status === 'interview_passed' && interviewRound) {
    return `${interviewRound}次面接合格（${interviewRound + 1}次面接設定中）`
  }
  return statusLabels[status]
}

// ステータスフロー定義（どのステータスからどのステータスへ遷移できるか）
const statusFlow: Record<Match['status'], Match['status'][]> = {
  suggested: ['applied', 'offer', 'rejected', 'withdrawn'],
  applied: ['document_screening', 'offer', 'rejected', 'withdrawn'],
  document_screening: ['document_passed', 'offer', 'rejected', 'withdrawn'],
  document_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['interview_passed', 'offer', 'rejected', 'withdrawn'],
  interview_passed: ['interview', 'offer', 'rejected', 'withdrawn'], // 次の面接へループ可能
  offer: ['offer_accepted', 'rejected', 'withdrawn'],
  offer_accepted: [],
  rejected: [],
  withdrawn: []
}

// ステータスの表示順序（タイムライン用）
const statusOrder: Record<Match['status'], number> = {
  suggested: 1,
  applied: 2,
  document_screening: 3,
  document_passed: 4,
  interview: 5,
  interview_passed: 6,
  offer: 7,
  offer_accepted: 8,
  rejected: 9,
  withdrawn: 10
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // ステータス更新モーダル
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [statusNotes, setStatusNotes] = useState('')

  // タイムライン編集モーダル
  const [timelineEditOpen, setTimelineEditOpen] = useState(false)
  const [editingTimeline, setEditingTimeline] = useState<MatchTimeline | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (!matchId || matchId.trim() === '') {
      alert('無効なマッチングIDです')
      router.push('/progress')
      return
    }
    if (matchId) {
      loadMatchData()
    }
  }, [matchId])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      console.log('🔍 マッチング詳細データ読み込み開始 ID:', matchId)

      // マッチングデータを取得
      const matchData = await getMatch(matchId)
      if (!matchData) {
        toast.error('マッチングが見つかりません')
        router.push('/progress')
        return
      }

      setMatch(matchData)

      // 関連データを並行して取得
      const [candidateData, jobData, companyData, usersData, storesData] = await Promise.all([
        getCandidate(matchData.candidateId),
        getJob(matchData.jobId),
        getCompany(matchData.companyId),
        getUsers(),
        getStores()
      ])

      setCandidate(candidateData)
      setJob(jobData)
      setCompany(companyData)
      setUsers(usersData)
      
      // 求人に紐づく店舗を取得
      if (jobData?.storeId) {
        const storeData = storesData.find(s => s.id === jobData.storeId)
        setStore(storeData || null)
      }

      console.log('✅ マッチング詳細データ読み込み完了')
    } catch (error) {
      console.error('Error loading match data:', error)
      toast.error('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!match || !user) return

    try {
      // 日時を組み合わせる
      let combinedDateTime: Date | undefined = undefined
      if (eventDate) {
        if (eventTime) {
          combinedDateTime = new Date(`${eventDate}T${eventTime}`)
        } else {
          combinedDateTime = new Date(eventDate)
        }
      }

      await updateMatchStatus(
        match.id,
        newStatus,
        '', // 説明文は空
        user.uid,
        statusNotes || undefined,
        combinedDateTime
      )
      
      toast.success('ステータスを更新しました')
      setStatusUpdateOpen(false)
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('ステータスの更新に失敗しました')
    }
  }

  const handleOpenTimelineEdit = (timeline: MatchTimeline) => {
    setEditingTimeline(timeline)
    setEditDescription(timeline.description)
    setEditNotes(timeline.notes || '')
    setTimelineEditOpen(true)
  }

  const handleTimelineUpdate = async () => {
    if (!editingTimeline || !match) return

    try {
      const { updateTimelineItem } = await import('@/lib/firestore/matches')
      
      await updateTimelineItem(
        match.id,
        editingTimeline.id,
        editDescription,
        editNotes || undefined
      )

      toast.success('タイムラインを更新しました')
      setTimelineEditOpen(false)
      setEditingTimeline(null)
      setEditDescription('')
      setEditNotes('')
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating timeline:', error)
      toast.error('タイムラインの更新に失敗しました')
    }
  }

  const getStatusBadge = (status: Match['status'], size: 'sm' | 'lg' = 'sm', interviewRound?: number) => {
    const Icon = statusIcons[status]
    const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'
    
    return (
      <Badge className={`${statusColors[status]} border ${sizeClass} font-medium flex items-center gap-2`}>
        <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
        {getStatusLabel(status, interviewRound)}
      </Badge>
    )
  }

  const getScoreBadge = (score: number) => {
    let colorClass = 'bg-gray-100 text-gray-800 border-gray-200'
    if (score >= 90) colorClass = 'bg-green-100 text-green-800 border-green-200'
    else if (score >= 80) colorClass = 'bg-blue-100 text-blue-800 border-blue-200'
    else if (score >= 70) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
    else if (score >= 60) colorClass = 'bg-orange-100 text-orange-800 border-orange-200'
    else colorClass = 'bg-red-100 text-red-800 border-red-200'

    return (
      <Badge className={`${colorClass} border text-lg px-4 py-2 font-bold`}>
        {score}%
      </Badge>
    )
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimelineDate = (date: Date | string) => {
    const now = new Date()
    const targetDate = new Date(date)
    const diffMs = now.getTime() - targetDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays === 0) {
      if (diffHours === 0) {
        return '数分前'
      }
      return `${diffHours}時間前`
    } else if (diffDays === 1) {
      return '昨日'
    } else if (diffDays <= 7) {
      return `${diffDays}日前`
    } else {
      return targetDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? user.displayName : userId
  }

  const calculateAge = (dateOfBirth: Date | string | undefined) => {
    if (!dateOfBirth) return null
    const birth = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600">マッチング詳細を読み込み中...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!match) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">マッチングが見つかりません</h1>
            <Button asChild className="bg-orange-600 hover:bg-orange-700">
              <Link href="/progress">
                <ArrowLeft className="h-4 w-4 mr-2" />
                進捗管理に戻る
              </Link>
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
        <div className="container mx-auto py-8 px-4">
          {/* ヘッダー */}
          <div className="mb-8">
            <Button
                variant="outline"
                asChild
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Link href="/progress">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  進捗管理
                </Link>
              </Button>
          </div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-orange-800">
                  マッチング詳細
                </h1>
                <p className="text-gray-600 mt-1">
                  ID: {match.id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadMatchData}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
              {statusFlow[match.status].length > 0 && (
                <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        // 次のステータスの最初の選択肢をデフォルトにする
                        const nextStatuses = statusFlow[match.status]
                        if (nextStatuses.length > 0) {
                          setNewStatus(nextStatuses[0])
                          setEventDate('')
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      次の進捗へ
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>次の進捗へ</DialogTitle>
                  <DialogDescription>
                    次のステータスに進めます
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* 現在のステータス表示 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">現在のステータス</div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(match.status, 'lg')}
                    </div>
                  </div>

                  {/* 次のステータス選択 */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">次のステータスを選択</Label>
                    <div className="space-y-2">
                      {/* 通常のステータス（縦並び） */}
                      <div className="grid grid-cols-1 gap-2">
                        {statusFlow[match.status]
                          .filter(s => !['offer', 'rejected', 'withdrawn'].includes(s))
                          .map((nextStatus) => {
                            const Icon = statusIcons[nextStatus]
                            return (
                              <Button
                                key={nextStatus}
                                type="button"
                                variant={newStatus === nextStatus ? "default" : "outline"}
                                className={`justify-start h-auto py-3 ${
                                  newStatus === nextStatus 
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => {
                                  setNewStatus(nextStatus)
                                }}
                              >
                                <Icon className="h-5 w-5 mr-2" />
                                <span className="text-base">{statusLabels[nextStatus]}</span>
                              </Button>
                            )
                          })}
                      </div>
                      
                      {/* 終了ステータス（横並び・小さめ） */}
                      {statusFlow[match.status].some(s => ['offer', 'rejected', 'withdrawn'].includes(s)) && (
                        <div className="grid grid-cols-3 gap-2">
                          {statusFlow[match.status]
                            .filter(s => ['offer', 'rejected', 'withdrawn'].includes(s))
                            .map((nextStatus) => {
                              const Icon = statusIcons[nextStatus]
                              return (
                                <Button
                                  key={nextStatus}
                                  type="button"
                                  variant={newStatus === nextStatus ? "default" : "outline"}
                                  className={`justify-center h-auto py-2 text-sm ${
                                    newStatus === nextStatus 
                                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                      : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => {
                                    setNewStatus(nextStatus)
                                  }}
                                >
                                  <Icon className="h-4 w-4 mr-1" />
                                  <span className="text-sm">{statusLabels[nextStatus]}</span>
                                </Button>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* イベント日時入力（応募は除外） */}
                  {['interview', 'interview_passed', 'offer', 'offer_accepted', 'rejected'].includes(newStatus) && (
                    <div className="space-y-2">
                      <Label>
                        {newStatus === 'interview' && '面接日'}
                        {newStatus === 'interview_passed' && '面接実施日'}
                        {newStatus === 'offer' && '内定日'}
                        {newStatus === 'offer_accepted' && '内定承諾日'}
                        {newStatus === 'rejected' && '不採用日'}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            placeholder="日付"
                          />
                        </div>
                        <div>
                          <Input
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            placeholder="時刻（任意）"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 備考欄 */}
                  <div>
                    <Label htmlFor="statusNotes">備考</Label>
                    <Textarea
                      id="statusNotes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="詳細なメモがあれば記入してください"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setStatusUpdateOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleStatusUpdate}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    更新
                  </Button>
                </DialogFooter>
              </DialogContent>
                </Dialog>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報カード */}
            <Card className="border-purple-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-purple-800">基本情報</CardTitle>
                  <div className="flex items-center gap-3">
                    {getScoreBadge(match.score)}
                    {getStatusBadge(match.status, 'lg')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 候補者情報と求人情報 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 候補者情報 */}
                  <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <UserIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-blue-800 ">候補者</h3>
                    </div>
                    <div className="flex-1">
                      {candidate ? (
                        <div className="space-y-2">
                          <div className="font-medium text-lg">
                            {candidate.lastName} {candidate.firstName}
                            <div className="text-sm text-gray-600">
                              {candidate.dateOfBirth && (
                                <>
                                  （{calculateAge(candidate.dateOfBirth)}歳）
                                </>
                              )}
                            </div>
                            {candidate.enrollmentDate && (
                              <div className="text-sm text-gray-600">
                                入学日: {new Date(candidate.enrollmentDate).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                            {candidate.campus && (
                              <div className="text-sm text-gray-600">
                                校舎: {candidate.campus === 'tokyo' && '東京'}
                                {candidate.campus === 'osaka' && '大阪'}
                                {candidate.campus === 'awaji' && '淡路'}
                                {candidate.campus === 'fukuoka' && '福岡'}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" asChild className="w-full">
                            <Link href={`/candidates/${candidate.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="text-gray-500">候補者情報を読み込み中...</div>
                      )}
                    </div>
                  </div>

                  {/* 求人情報 */}
                  <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-100">
                    <div>
                      <Briefcase className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                      <h3 className="font-semibold text-green-800 mb-2">求人</h3>
                    </div>

                    <div className="flex-1">
                      {job ? (
                        <div className="space-y-2">
                          <div>
                            <div className="font-medium text-lg">
                              {job.title}
                            </div>
                            {company && (
                              <div className="text-sm text-gray-600">
                                {company.name}
                              </div>
                            )}
                            {store && (
                              <div className="text-sm text-gray-600">
                                {store.name}
                                {store.prefecture && (
                                  <span className="ml-2">【{store.prefecture}】</span>
                                )}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 mt-1">
                              {job.employmentType}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" asChild className="w-full">
                            <Link href={`/jobs/${job.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="text-gray-500">求人情報を読み込み中...</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* マッチング理由 */}
            <Card className="border-purple-100">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">マッチング理由</CardTitle>
              </CardHeader>
              <CardContent>
                {match.matchReasons.length > 0 ? (
                  <div className="space-y-3">
                    {match.matchReasons.map((reason, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{reason.description}</div>
                          <div className="text-sm text-gray-600 capitalize">{reason.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-purple-600">
                            重要度: {Math.round(reason.weight * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    マッチング理由が設定されていません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* サイドバー - タイムライン */}
          <div className="space-y-6">
            {/* イベント日時 */}
            {(match.appliedDate || match.interviewDate || match.offerDate || match.acceptedDate || match.rejectedDate) && (
              <Card className="border-purple-100">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-800">重要日程</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {match.appliedDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-600">応募日:</span>
                      <span className="font-medium">{formatDate(match.appliedDate)}</span>
                    </div>
                  )}
                  {match.interviewDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span className="text-gray-600">面接日:</span>
                      <span className="font-medium">{formatDate(match.interviewDate)}</span>
                    </div>
                  )}
                  {match.offerDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">オファー日:</span>
                      <span className="font-medium">{formatDate(match.offerDate)}</span>
                    </div>
                  )}
                  {match.acceptedDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-gray-600">承諾日:</span>
                      <span className="font-medium">{formatDate(match.acceptedDate)}</span>
                    </div>
                  )}
                  {match.rejectedDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-red-500" />
                      <span className="text-gray-600">不採用日:</span>
                      <span className="font-medium">{formatDate(match.rejectedDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* タイムライン */}
            <Card className="border-purple-100">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  進捗タイムライン
                </CardTitle>
                <CardDescription>
                  マッチングの進捗履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                {match.timeline && match.timeline.length > 0 ? (
                  <div className="space-y-4">
                    {match.timeline
                      .map((item) => {
                        // ステータスに対応するイベント日付を取得
                        let eventDate: Date | null = null
                        if (item.status === 'applied' && match.appliedDate) {
                          eventDate = new Date(match.appliedDate)
                        } else if ((item.status === 'interview' || item.status === 'interview_passed') && match.interviewDate) {
                          eventDate = new Date(match.interviewDate)
                        } else if (item.status === 'offer' && match.offerDate) {
                          eventDate = new Date(match.offerDate)
                        } else if (item.status === 'offer_accepted' && match.acceptedDate) {
                          eventDate = new Date(match.acceptedDate)
                        } else if (item.status === 'rejected' && match.rejectedDate) {
                          eventDate = new Date(match.rejectedDate)
                        } else {
                          // イベント日付がない場合はtimestampを使用
                          eventDate = new Date(item.timestamp)
                        }
                        return { ...item, displayDate: eventDate }
                      })
                      .sort((a, b) => {
                        // ステータス順でソート（降順 = 進んだステータスが上）
                        const orderA = statusOrder[a.status] || 0
                        const orderB = statusOrder[b.status] || 0
                        if (orderA !== orderB) {
                          return orderB - orderA
                        }
                        // 同じステータスの場合は日付で降順ソート
                        return b.displayDate.getTime() - a.displayDate.getTime()
                      })
                      .map((item, index) => {
                        // アイコンを取得、存在しない場合はデフォルトアイコンを使用
                        const Icon = statusIcons[item.status] || Clock
                        const isLatest = index === 0
                        
                        return (
                          <div key={item.id} className="relative">
                            {/* タイムライン線 */}
                            {index !== match.timeline.length - 1 && (
                              <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200"></div>
                            )}
                            
                            <div className={`flex items-start space-x-3 ${isLatest ? 'pb-4 border-b border-purple-100' : ''}`}>
                              {/* アイコン */}
                              <div className={`
                                p-2 rounded-full border-2 flex-shrink-0
                                ${isLatest 
                                  ? 'bg-purple-100 border-purple-300 text-purple-600' 
                                  : 'bg-gray-100 border-gray-300 text-gray-600'
                                }
                              `}>
                                <Icon className="h-3 w-3" />
                              </div>
                              
                              {/* コンテンツ */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge className={`
                                    text-xs border
                                    ${isLatest 
                                      ? (statusColors[item.status] || 'bg-gray-100 text-gray-600 border-gray-200')
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }
                                  `}>
                                    {statusLabels[item.status] || item.status}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatTimelineDate(item.displayDate)}
                                  </span>
                                </div>
                                
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {item.description}
                                </div>
                                
                                {item.notes && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">
                                    {item.notes}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-2">
                                  <div className="text-xs text-gray-500">
                                    作成者: {getUserName(item.createdBy)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenTimelineEdit(item)}
                                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    編集
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div>タイムラインデータがありません</div>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* メタデータ */}
            <Card className="border-purple-100">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">詳細情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">作成日:</span>
                  <span className="font-medium">{formatDate(match.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">更新日:</span>
                  <span className="font-medium">{formatDate(match.updatedAt)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">作成者:</span>
                  <span className="font-medium">{getUserName(match.createdBy)}</span>
                </div>
                {match.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">備考</div>
                    <div className="text-sm text-gray-600">{match.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>

        {/* タイムライン編集モーダル */}
        <Dialog open={timelineEditOpen} onOpenChange={setTimelineEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>タイムライン編集</DialogTitle>
              <DialogDescription>
                進捗の説明と備考を編集できます
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {editingTimeline && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">ステータス</div>
                  {getStatusBadge(editingTimeline.status)}
                </div>
              )}

              <div>
                <Label htmlFor="editDescription">説明</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="進捗の説明を入力..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="editNotes">備考</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="追加のメモがあれば入力..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTimelineEditOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleTimelineUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}