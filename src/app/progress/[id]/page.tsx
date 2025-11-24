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
  User,
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
  Target
} from 'lucide-react'
import { Match, MatchTimeline } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { getMatch, updateMatchStatus } from '@/lib/firestore/matches'
import { getCandidate } from '@/lib/firestore/candidates'
import { getJob } from '@/lib/firestore/jobs'
import { getCompany } from '@/lib/firestore/companies'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const statusLabels = {
  suggested: '提案済み',
  interested: '興味あり',
  applied: '応募済み',
  interviewing: '面接中',
  offered: '内定',
  accepted: '受諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

const statusColors = {
  suggested: 'bg-blue-100 text-blue-800 border-blue-200',
  interested: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  applied: 'bg-purple-100 text-purple-800 border-purple-200',
  interviewing: 'bg-orange-100 text-orange-800 border-orange-200',
  offered: 'bg-green-100 text-green-800 border-green-200',
  accepted: 'bg-green-600 text-white border-green-600',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-800 border-gray-200'
}

const statusIcons = {
  suggested: Target,
  interested: Eye,
  applied: Briefcase,
  interviewing: MessageSquare,
  offered: Star,
  accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
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
  const [loading, setLoading] = useState(true)

  // ステータス更新モーダル
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
  const [statusDescription, setStatusDescription] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')

  useEffect(() => {
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
      const [candidateData, jobData, companyData] = await Promise.all([
        getCandidate(matchData.candidateId),
        getJob(matchData.jobId),
        getCompany(matchData.companyId)
      ])

      setCandidate(candidateData)
      setJob(jobData)
      setCompany(companyData)

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
        statusDescription,
        user.uid,
        statusNotes || undefined,
        combinedDateTime
      )
      
      toast.success('ステータスを更新しました')
      setStatusUpdateOpen(false)
      setStatusDescription('')
      setStatusNotes('')
      setEventDate('')
      setEventTime('')
      loadMatchData() // データを再読み込み
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('ステータスの更新に失敗しました')
    }
  }

  const getStatusBadge = (status: Match['status'], size: 'sm' | 'lg' = 'sm') => {
    const Icon = statusIcons[status]
    const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'
    
    return (
      <Badge className={`${statusColors[status]} border ${sizeClass} font-medium flex items-center gap-2`}>
        <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
        {statusLabels[status]}
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
                onClick={() => router.push('/progress')}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                進捗管理
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
              <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setNewStatus(match.status)
                      setStatusUpdateOpen(true)
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    ステータス更新
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ステータス更新</DialogTitle>
                  <DialogDescription>
                    マッチングのステータスを更新します
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">新しいステータス</Label>
                    <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">更新内容 *</Label>
                    <Input
                      value={statusDescription}
                      onChange={(e) => setStatusDescription(e.target.value)}
                      placeholder="例: 面接日程調整完了"
                      required
                    />
                  </div>
                  {/* イベント日時入力 */}
                  {['applied', 'interviewing', 'offered', 'accepted', 'rejected'].includes(newStatus) && (
                    <div className="space-y-2">
                      <Label>
                        {newStatus === 'applied' && '応募日'}
                        {newStatus === 'interviewing' && '面接日'}
                        {newStatus === 'offered' && 'オファー日'}
                        {newStatus === 'accepted' && '承諾日'}
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
                  <div>
                    <Label htmlFor="notes">備考</Label>
                    <Textarea
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
                    disabled={!statusDescription.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    更新
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                {/* 候補者情報 */}
                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <User className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800 mb-2">候補者</h3>
                    {candidate ? (
                      <div>
                        <div className="font-medium text-lg">
                          {candidate.lastName} {candidate.firstName}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {candidate.email}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/candidates/${candidate.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">候補者情報を読み込み中...</div>
                    )}
                  </div>
                </div>

                {/* 求人情報 */}
                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-100">
                  <Briefcase className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800 mb-2">求人</h3>
                    {job ? (
                      <div>
                        <div className="font-medium text-lg">
                          {job.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {job.employmentType}{job.salaryInexperienced ? ` • ${job.salaryInexperienced}` : ''}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/jobs/${job.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">求人情報を読み込み中...</div>
                    )}
                  </div>
                </div>

                {/* 企業情報 */}
                <div className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <Building className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-800 mb-2">企業</h3>
                    {company ? (
                      <div>
                        <div className="font-medium text-lg">
                          {company.name}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/companies/${company.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">企業情報を読み込み中...</div>
                    )}
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
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((item, index) => {
                        const Icon = statusIcons[item.status]
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
                                      ? statusColors[item.status]
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }
                                  `}>
                                    {statusLabels[item.status]}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatTimelineDate(item.timestamp)}
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
                                
                                <div className="text-xs text-gray-500 mt-1">
                                  作成者: {item.createdBy}
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
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">作成者:</span>
                  <span className="font-medium">{match.createdBy}</span>
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
      </div>
    </ProtectedRoute>
  )
}