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
  FileText,
  Trash2,
  Search,
  Copy
} from 'lucide-react'
import { Match, MatchTimeline } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'
import { getMatch, updateMatchStatus } from '@/lib/firestore/matches'
import { getCandidate } from '@/lib/firestore/candidates'
import { getJob, getJobs } from '@/lib/firestore/jobs'
import { getCompany, getCompanies } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { StatusUpdateDialog } from '@/components/matches/StatusUpdateDialog'
import { Timestamp } from 'firebase/firestore'

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
  const [jobStores, setJobStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // 求人変更用の状態
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [allStores, setAllStores] = useState<Store[]>([])
  const [jobSelectOpen, setJobSelectOpen] = useState(false)
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')

  // ステータス更新モーダル
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)

  // マッチング編集モーダル
  const [matchEditOpen, setMatchEditOpen] = useState(false)
  const [editScore, setEditScore] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editJobId, setEditJobId] = useState('')

  // タイムライン編集モーダル
  const [timelineEditOpen, setTimelineEditOpen] = useState(false)
  const [editingTimeline, setEditingTimeline] = useState<MatchTimeline | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [startDate, setStartDate] = useState('') // 入社予定日
  const [statusNotes, setStatusNotes] = useState('')

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

      // マッチングデータを取得
      const matchData = await getMatch(matchId)
      if (!matchData) {
        toast.error('マッチングが見つかりません')
        router.push('/progress')
        return
      }

      setMatch(matchData)

      // 関連データを並行して取得
      const [candidateData, jobData, companyData, usersData, storesData, allJobsData, allCompaniesData] = await Promise.all([
        getCandidate(matchData.candidateId),
        getJob(matchData.jobId),
        getCompany(matchData.companyId),
        getUsers(),
        getStores(),
        getJobs(),
        getCompanies()
      ])

      setCandidate(candidateData)
      setJob(jobData)
      setCompany(companyData)
      setUsers(usersData)
      setAllJobs(allJobsData)
      setAllCompanies(allCompaniesData)
      setAllStores(storesData)
      
      // 求人に紐づく店舗を取得（複数店舗対応）
      if (jobData?.storeIds && jobData.storeIds.length > 0) {
        const stores = storesData.filter(s => jobData.storeIds?.includes(s.id))
        setJobStores(stores)
        // 最初の店舗をメイン店舗として設定（後方互換性のため）
        setStore(stores[0] || null)
      } else if (jobData?.storeId) {
        // 旧形式のstoreIdに対応
        const storeData = storesData.find(s => s.id === jobData.storeId)
        setStore(storeData || null)
        setJobStores(storeData ? [storeData] : [])
      } else {
        setStore(null)
        setJobStores([])
      }
    } catch (error) {
      console.error('Error loading match data:', error)
      toast.error('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status: Match['status'], notes: string, eventDateTime?: Date, startDate?: Date, endDate?: Date) => {
    if (!match || !user) return

    try {
      await updateMatchStatus(
        match.id,
        status,
        '', // 説明文は空
        user.uid,
        notes || undefined,
        eventDateTime,
        undefined, // interviewRound
        startDate,
        endDate
      )
      
      toast.success('ステータスを更新しました')
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('ステータスの更新に失敗しました')
    }
  }

  const handleOpenMatchEdit = () => {
    if (!match) return
    
    setEditScore(match.score.toString())
    setEditNotes(match.notes || '')
    setEditJobId(match.jobId)
    
    // 入社予定日の初期化
    if (match.startDate) {
      const startDateObj = new Date(match.startDate)
      if (!isNaN(startDateObj.getTime())) {
        setEditStartDate(startDateObj.toISOString().split('T')[0])
      } else {
        setEditStartDate('')
      }
    } else {
      setEditStartDate('')
    }
    
    // 退職日の初期化
    if (match.endDate) {
      const endDateObj = new Date(match.endDate)
      if (!isNaN(endDateObj.getTime())) {
        setEditEndDate(endDateObj.toISOString().split('T')[0])
      } else {
        setEditEndDate('')
      }
    } else {
      setEditEndDate('')
    }
    
    setMatchEditOpen(true)
  }

  const handleMatchUpdate = async () => {
    if (!match) return

    try {
      const { updateMatch } = await import('@/lib/firestore/matches')
      
      const updateData: any = {
        notes: editNotes || null
      }

      const scoreNum = parseInt(editScore)
      if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100) {
        updateData.score = scoreNum
      }
      
      // 求人IDの更新（変更されている場合）
      if (editJobId && editJobId !== match.jobId) {
        const selectedJob = allJobs.find(j => j.id === editJobId)
        if (selectedJob) {
          updateData.jobId = editJobId
          updateData.companyId = selectedJob.companyId
        }
      }

      // 入社予定日の更新
      if (editStartDate) {
        updateData.startDate = new Date(editStartDate)
      } else {
        updateData.startDate = null
      }

      // 退職日の更新（入社日がある場合のみ）
      if (editStartDate && editEndDate) {
        updateData.endDate = new Date(editEndDate)
      } else {
        updateData.endDate = null
      }

      await updateMatch(match.id, updateData)

      toast.success('マッチング情報を更新しました')
      setMatchEditOpen(false)
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating match:', error)
      toast.error('マッチング情報の更新に失敗しました')
    }
  }

  const handleOpenTimelineEdit = (timeline: MatchTimeline) => {
    setEditingTimeline(timeline)
    
    // タイムラインのイベント日時を取得
    let initialDate = ''
    let initialTime = ''
    
    // 日付を安全に変換するヘルパー関数
    const safeConvertDate = (dateValue: any): { date: string; time: string } => {
      try {
        const d = new Date(dateValue)
        // 無効な日付をチェック
        if (isNaN(d.getTime())) {
          return { date: '', time: '' }
        }
        return {
          date: d.toISOString().split('T')[0],
          time: d.toTimeString().slice(0, 5)
        }
      } catch (error) {
        console.error('日付変換エラー:', error, dateValue)
        return { date: '', time: '' }
      }
    }
    
    // まず timeline.eventDate をチェック（新しい実装）
    if (timeline.eventDate) {
      const converted = safeConvertDate(timeline.eventDate)
      initialDate = converted.date
      initialTime = converted.time
    }
    // timeline.eventDate がない場合、従来の match.*Date から取得（後方互換性）
    else if (timeline.status === 'applied' && match?.appliedDate) {
      const converted = safeConvertDate(match.appliedDate)
      initialDate = converted.date
      initialTime = converted.time
    } else if (timeline.status === 'offer' && match?.offerDate) {
      const converted = safeConvertDate(match.offerDate)
      initialDate = converted.date
      initialTime = converted.time
    } else if (timeline.status === 'offer_accepted' && match?.acceptedDate) {
      const converted = safeConvertDate(match.acceptedDate)
      initialDate = converted.date
      initialTime = converted.time
    } else if (timeline.status === 'rejected' && match?.rejectedDate) {
      const converted = safeConvertDate(match.rejectedDate)
      initialDate = converted.date
      initialTime = converted.time
    }
    
    setEventDate(initialDate)
    setEventTime(initialTime)
    setStatusNotes(timeline.notes || '')
    
    // 入社予定日の初期化（内定承諾の場合のみ）
    if (timeline.status === 'offer_accepted' && match?.startDate) {
      const startDateObj = new Date(match.startDate)
      // 有効な日付かチェック
      if (!isNaN(startDateObj.getTime())) {
        setStartDate(startDateObj.toISOString().split('T')[0])
      } else {
        setStartDate('')
      }
    } else {
      setStartDate('')
    }
    
    setTimelineEditOpen(true)
  }

  const handleTimelineUpdate = async () => {
    if (!editingTimeline || !match || !user) return

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

      // タイムラインアイテムを直接更新（新しいアイテムを作成せず）
      const { updateTimelineItem, updateMatch } = await import('@/lib/firestore/matches')
      
      await updateTimelineItem(
        match.id,
        editingTimeline.id,
        editingTimeline.description, // 既存の説明を維持
        statusNotes || undefined,
        combinedDateTime
      )

      // 内定承諾の場合、入社予定日も更新
      if (editingTimeline.status === 'offer_accepted') {
        const updateData: any = {}
        if (startDate) {
          updateData.startDate = new Date(startDate)
        } else {
          updateData.startDate = null // 入社日をクリア
        }
        await updateMatch(match.id, updateData)
      }

      toast.success('タイムラインを更新しました')
      setTimelineEditOpen(false)
      setEditingTimeline(null)
      setEventDate('')
      setEventTime('')
      setStartDate('')
      setStatusNotes('')
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating timeline:', error)
      toast.error('タイムラインの更新に失敗しました')
    }
  }

  const handleTimelineDelete = async () => {
    if (!editingTimeline || !match) return

    if (!confirm('この進捗を削除しますか？\nステータスが前の状態に戻ります。')) {
      return
    }

    try {
      const { deleteLatestTimelineItem } = await import('@/lib/firestore/matches')
      
      await deleteLatestTimelineItem(match.id, editingTimeline.id)

      toast.success('進捗を削除しました')
      setTimelineEditOpen(false)
      setEditingTimeline(null)
      setEventDate('')
      setEventTime('')
      setStartDate('')
      setStatusNotes('')
      loadMatchData() // データを再読み込み
    } catch (error: any) {
      console.error('Error deleting timeline:', error)
      toast.error(error.message || '進捗の削除に失敗しました')
    }
  }

  // StatusUpdateDialog用の進捗削除ハンドラー
  const handleProgressDelete = async () => {
    if (!match) return

    try {
      // 最新の進捗のみ削除可能かチェック
      if (!match.timeline || match.timeline.length === 0) {
        throw new Error('削除できる進捗がありません')
      }

      const sortedTimeline = [...match.timeline].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
        return timeA - timeB
      })

      const latestTimelineId = sortedTimeline[sortedTimeline.length - 1]?.id
      if (!latestTimelineId) {
        throw new Error('削除できる進捗がありません')
      }

      const { deleteLatestTimelineItem } = await import('@/lib/firestore/matches')
      await deleteLatestTimelineItem(match.id, latestTimelineId)

      loadMatchData() // データを再読み込み
    } catch (error: any) {
      console.error('進捗削除エラー:', error)
      throw error
    }
  }

  // 最新のタイムラインアイテムかチェック
  const isLatestTimeline = (timelineId: string): boolean => {
    if (!match?.timeline || match.timeline.length === 0) return false
    
    const sortedTimeline = [...match.timeline].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return timeA - timeB
    })
    
    return sortedTimeline[sortedTimeline.length - 1]?.id === timelineId
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-800">
                  マッチング詳細
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  ID: {match.id}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={loadMatchData}
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">更新</span>
              </Button>
              
              {/* マッチング編集ボタン */}
              <Button
                onClick={handleOpenMatchEdit}
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">編集</span>
              </Button>
              
              {/* 終了ステータスでない場合は次の進捗へボタンを表示 */}
              {!['offer_accepted', 'withdrawn', 'rejected'].includes(match.status) && statusFlow[match.status].length > 0 && (
                <>
                  <Button
                    onClick={() => setStatusUpdateOpen(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">次の進捗へ</span>
                  </Button>
                  <StatusUpdateDialog
                    open={statusUpdateOpen}
                    onOpenChange={setStatusUpdateOpen}
                    match={match}
                    candidateName={candidate ? `${candidate.lastName} ${candidate.firstName}` : ''}
                    onUpdate={handleStatusUpdate}
                    onDelete={handleProgressDelete}
                    isEditMode={false}
                    candidate={candidate ? {
                      id: candidate.id,
                      firstName: candidate.firstName,
                      lastName: candidate.lastName,
                      phone: candidate.phone,
                      email: candidate.email,
                      resume: candidate.teacherComment,
                      dateOfBirth: candidate.dateOfBirth,
                      resumeUrl: candidate.resumeUrl,
                      enrollmentDate: candidate.enrollmentDate,
                      campus: candidate.campus
                    } : undefined}
                    job={job || undefined}
                    company={company || undefined}
                    userName={user?.displayName || user?.email || ''}
                  />
                </>
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
                            {jobStores.length > 0 && (
                              <div className="text-sm text-gray-600">
                                {jobStores.map((s, idx) => (
                                  <span key={s.id}>
                                    {s.name}
                                    {s.prefecture && ` 【${s.prefecture}】`}
                                    {idx < jobStores.length - 1 && ', '}
                                  </span>
                                ))}
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

            {/* 詳細情報 */}
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
                {match.startDate && (() => {
                  const startDateObj = new Date(match.startDate)
                  return !isNaN(startDateObj.getTime()) && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-gray-600">入社予定日:</span>
                      <span className="font-medium text-green-700">
                        {startDateObj.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )
                })()}
                {match.endDate && (() => {
                  const endDateObj = new Date(match.endDate)
                  return !isNaN(endDateObj.getTime()) && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-gray-600">退職日:</span>
                      <span className="font-medium text-red-700">
                        {endDateObj.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )
                })()}
                {match.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">備考</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{match.notes}</div>
                  </div>
                )}
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
                        // 進捗登録日時: item.timestamp を使用
                        const registeredDate = (() => {
                          try {
                            const d = new Date(item.timestamp)
                            return isNaN(d.getTime()) ? new Date() : d
                          } catch {
                            return new Date()
                          }
                        })()
                        
                        // イベント日付(面接日時など)を別途取得
                        let eventDate: Date | null = null
                        
                        // 安全に日付を作成するヘルパー
                        const safeCreateDate = (dateValue: any): Date | null => {
                          try {
                            // Firestore Timestamp の場合
                            if (dateValue instanceof Timestamp) {
                              const d = dateValue.toDate()
                              return isNaN(d.getTime()) ? null : d
                            }
                            // Date オブジェクトの場合
                            if (dateValue instanceof Date) {
                              return isNaN(dateValue.getTime()) ? null : dateValue
                            }
                            // 文字列や数値の場合
                            const d = new Date(dateValue)
                            return isNaN(d.getTime()) ? null : d
                          } catch {
                            return null
                          }
                        }
                        
                        // timeline.eventDate をチェック
                        if (item.eventDate) {
                          eventDate = safeCreateDate(item.eventDate)
                        }
                        // 後方互換性: timeline.eventDate がない場合のフォールバック
                        // ただし、面接通過(interview_passed)は対象外
                        else if (item.status === 'applied' && match.appliedDate) {
                          eventDate = safeCreateDate(match.appliedDate)
                        } else if (item.status === 'offer' && match.offerDate) {
                          eventDate = safeCreateDate(match.offerDate)
                        } else if (item.status === 'offer_accepted' && match.acceptedDate) {
                          eventDate = safeCreateDate(match.acceptedDate)
                        } else if (item.status === 'rejected' && match.rejectedDate) {
                          eventDate = safeCreateDate(match.rejectedDate)
                        }
                        
                        return { ...item, registeredDate, eventDate }
                      })
                      .sort((a, b) => {
                        // 登録日時の降順でソート（新しい履歴が上、古い履歴が下）
                        return b.registeredDate.getTime() - a.registeredDate.getTime()
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
                                {/* ステータスバッジ */}
                                <div className="flex items-center justify-between mb-2">
                                  <Badge className={`
                                    text-xs border
                                    ${isLatest 
                                      ? (statusColors[item.status] || 'bg-gray-100 text-gray-600 border-gray-200')
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }
                                  `}>
                                    {statusLabels[item.status] || item.status}
                                  </Badge>
                                </div>
                                
                                {/* 進捗登録日時 */}
                                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-medium">登録日時:</span>
                                  {item.registeredDate.toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                
                                {/* 面接日時表示（面接ステータスの場合のみ、面接通過は表示しない） */}
                                {item.status === 'interview' && item.eventDate && (
                                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mb-2 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span className="font-medium">面接日時:</span>
                                    {item.eventDate.toLocaleDateString('ja-JP', { 
                                      year: 'numeric',
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                )}
                                
                                {/* 説明文 */}
                                {item.description && (
                                  <div className="text-sm font-medium text-gray-900 mb-1">
                                    {item.description}
                                  </div>
                                )}
                                
                                {item.notes && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2 whitespace-pre-wrap">
                                    <div className="font-medium text-gray-700 mb-1">備考:</div>
                                    {item.notes}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-2">
                                  <div className="text-xs text-gray-500">
                                    作成者: {getUserName(item.createdBy)}
                                  </div>
                                  <div className="flex gap-1">
                                    {/* 面接ステータスの場合は詳細ボタンを表示 */}
                                    {item.status === 'interview' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          // 面接詳細情報を生成
                                          const interviewDateTime = item.eventDate 
                                            ? item.eventDate.toLocaleDateString('ja-JP', { 
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                weekday: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })
                                            : '未設定'
                                          
                                          const storeName = store?.name || '未設定'
                                          const storeAddress = store?.address || ''
                                          const storeLocation = storeAddress ? `${storeName}\n${storeAddress}` : storeName
                                          
                                          const interviewDetails = `【面接日時】\n${interviewDateTime}\n\n【面接場所】\n${storeLocation}\n\n【面接対策用の資料】\nhttps://drive.google.com/file/d/1cbOoIKcZCxIAgYSUFqkZJsDWoTpVusuQ/view?usp=sharing`
                                          
                                          // クリップボードにコピー
                                          navigator.clipboard.writeText(interviewDetails).then(() => {
                                            toast.success('面接詳細をコピーしました')
                                          }).catch(() => {
                                            toast.error('コピーに失敗しました')
                                          })
                                        }}
                                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        詳細
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        // 元の MatchTimeline 型に戻す
                                        const originalItem: MatchTimeline = {
                                          id: item.id,
                                          status: item.status,
                                          timestamp: item.timestamp,
                                          description: item.description,
                                          createdBy: item.createdBy,
                                          notes: item.notes,
                                          eventDate: item.eventDate || undefined
                                        }
                                        handleOpenTimelineEdit(originalItem)
                                      }}
                                      className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      編集
                                    </Button>
                                  </div>
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
          </div>
        </div>
        </div>

        {/* マッチング編集モーダル */}
        <Dialog open={matchEditOpen} onOpenChange={setMatchEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-purple-800">マッチング編集</DialogTitle>
              <DialogDescription>
                マッチングスコアと備考を編集できます
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* スコア入力 */}
              <div className="space-y-2">
                <Label htmlFor="editScore">マッチングスコア</Label>
                <Input
                  id="editScore"
                  type="number"
                  min="0"
                  max="100"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  placeholder="0-100"
                />
                <p className="text-xs text-gray-500">
                  0から100の間で入力してください
                </p>
              </div>

              {/* 求人選択 */}
              <div className="space-y-2">
                <Label>求人</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    {editJobId && allJobs.length > 0 ? (
                      <div>
                        <div className="font-medium text-sm">
                          {allJobs.find(j => j.id === editJobId)?.title || '不明な求人'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {allCompanies.find(c => c.id === allJobs.find(j => j.id === editJobId)?.companyId)?.name || '企業名不明'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">求人を選択してください</div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedJobId(editJobId)
                      setJobSelectOpen(true)
                    }}
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    求人変更
                  </Button>
                </div>
                <p className="text-xs text-orange-600">
                  ⚠ 求人を変更すると企業も自動的に変更されます
                </p>
              </div>

              {/* 入社予定日入力 */}
              <div className="space-y-2">
                <Label htmlFor="editStartDate">入社予定日</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value
                    setEditStartDate(newStartDate)
                    // 入社日がクリアされた場合は退職日もクリア
                    if (!newStartDate) {
                      setEditEndDate('')
                    }
                  }}
                  placeholder="年/月/日"
                />
                <p className="text-xs text-gray-500">
                  ※入社予定日を設定する場合のみ入力してください
                </p>
              </div>

              {/* 退職日入力（入社予定日が入力されている場合のみ表示） */}
              {editStartDate && (
                <div className="space-y-2">
                  <Label htmlFor="editEndDate">退職日</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    placeholder="年/月/日"
                    min={editStartDate} // 入社日以降の日付のみ選択可能
                  />
                  <p className="text-xs text-gray-500">
                    ※退職日を設定する場合のみ入力してください（入社日以降の日付）
                  </p>
                </div>
              )}

              {/* 備考欄 */}
              <div className="space-y-2">
                <Label htmlFor="editNotes">備考</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="マッチングに関するメモを記入してください"
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setMatchEditOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleMatchUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* タイムライン編集モーダル */}
        <Dialog open={timelineEditOpen} onOpenChange={setTimelineEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-purple-800">タイムライン編集</DialogTitle>
              <DialogDescription>
                進捗の日時と備考を編集できます（ステータスは変更できません）
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 現在のステータス表示 */}
              {editingTimeline && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">ステータス</div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(editingTimeline.status, 'lg')}
                  </div>
                </div>
              )}

              {/* イベント日時入力 */}
              {editingTimeline && ['applied', 'interview', 'offer'].includes(editingTimeline.status) && (
                <div className="space-y-2">
                  <Label>
                    {editingTimeline.status === 'applied' && '応募日'}
                    {editingTimeline.status === 'interview' && '面接日'}
                    {editingTimeline.status === 'offer' && '内定日'}
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

              {/* 入社予定日入力（内定承諾のみ） */}
              {editingTimeline && editingTimeline.status === 'offer_accepted' && (
                <div className="space-y-2">
                  <Label>入社予定日</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="年/月/日"
                  />
                  <p className="text-xs text-gray-500">
                    ※入社予定日は後から変更できます
                  </p>
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

            <DialogFooter className="flex justify-between">
              <div>
                {editingTimeline && isLatestTimeline(editingTimeline.id) && (
                  <Button
                    variant="destructive"
                    onClick={handleTimelineDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    この進捗を削除
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setTimelineEditOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleTimelineUpdate}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  更新
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 求人選択モーダル */}
        <Dialog open={jobSelectOpen} onOpenChange={setJobSelectOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-orange-800">求人を選択</DialogTitle>
              <DialogDescription>
                この進捗に紐づける求人を選択してください
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 検索バー */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="求人名、企業名、店舗名で検索..."
                    value={jobSearchTerm}
                    onChange={(e) => setJobSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 求人リスト */}
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {allJobs
                  .filter(job => {
                    const company = allCompanies.find(c => c.id === job.companyId)
                    const jobStores = job.storeIds && job.storeIds.length > 0
                      ? allStores.filter(s => job.storeIds?.includes(s.id))
                      : job.storeId
                      ? [allStores.find(s => s.id === job.storeId)].filter(Boolean)
                      : []
                    const storeNames = jobStores.map(s => s?.name || '').join(' ')
                    const searchText = `${job.title} ${company?.name || ''} ${storeNames}`.toLowerCase()
                    return searchText.includes(jobSearchTerm.toLowerCase())
                  })
                  .map((job) => {
                    const company = allCompanies.find(c => c.id === job.companyId)
                    const jobStores = job.storeIds && job.storeIds.length > 0
                      ? allStores.filter(s => job.storeIds?.includes(s.id))
                      : job.storeId
                      ? [allStores.find(s => s.id === job.storeId)].filter(Boolean)
                      : []
                    const isSelected = selectedJobId === job.id

                    return (
                      <div
                        key={job.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">{job.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">
                              {company?.name || '企業名不明'}
                              {jobStores.length > 0 && (
                                <span className="ml-2">
                                  - {jobStores.map(s => s?.name).filter(Boolean).join(', ')}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={job.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {job.status === 'draft' && '下書き'}
                                {job.status === 'active' && '募集中'}
                                {job.status === 'closed' && '募集終了'}
                              </Badge>
                              {job.employmentType && (
                                <span className="text-xs text-gray-500">
                                  {job.employmentType}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                
                {allJobs.filter(job => {
                  const company = allCompanies.find(c => c.id === job.companyId)
                  const jobStores = job.storeIds && job.storeIds.length > 0
                    ? allStores.filter(s => job.storeIds?.includes(s.id))
                    : job.storeId
                    ? [allStores.find(s => s.id === job.storeId)].filter(Boolean)
                    : []
                  const storeNames = jobStores.map(s => s?.name || '').join(' ')
                  const searchText = `${job.title} ${company?.name || ''} ${storeNames}`.toLowerCase()
                  return searchText.includes(jobSearchTerm.toLowerCase())
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {jobSearchTerm ? (
                      '検索条件に一致する求人が見つかりません'
                    ) : (
                      '求人がありません'
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setJobSelectOpen(false)
                  setJobSearchTerm('')
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  setEditJobId(selectedJobId)
                  setJobSelectOpen(false)
                  setJobSearchTerm('')
                }}
                disabled={!selectedJobId}
                className="bg-orange-600 hover:bg-orange-700"
              >
                決定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}