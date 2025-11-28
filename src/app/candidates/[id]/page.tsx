"use client"

import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  ArrowRight, 
  Users, 
  Edit, 
  TrendingUp, 
  Briefcase, 
  Building, 
  Eye, 
  RefreshCw, 
  Plus, 
  Search, 
  CheckCircle, 
  Trash2, 
  Clock,
  Target,
  Send,
  MessageSquare,
  Star,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate, campusLabels } from '@/types/candidate'
import { Match } from '@/types/matching'
import { getMatchesByCandidate, createMatch, updateMatchStatus } from '@/lib/firestore/matches'
import { getJob, getJobs } from '@/lib/firestore/jobs'
import { getCompany, getCompanies } from '@/lib/firestore/companies'
import { getStoreById, getStores } from '@/lib/firestore/stores'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { useAuth } from '@/contexts/AuthContext'
import { getJobTitleWithPrefecture, getStoreNameWithPrefecture } from '@/lib/utils/prefecture'
import { generateGoogleCalendarUrl } from '@/lib/google-calendar'

const statusLabels: Record<Match['status'], string> = {
  suggested: '提案済み',
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

// ステータスアイコン定義
const statusIcons: Record<Match['status'], React.ComponentType<{ className?: string }>> = {
  suggested: Target,
  applied: Send,
  document_screening: Eye,
  document_passed: CheckCircle,
  interview: MessageSquare,
  interview_passed: CheckCircle,
  offer: Star,
  offer_accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
}

// ステータスフロー定義
const statusFlow: Record<Match['status'], Match['status'][]> = {
  suggested: ['applied', 'offer', 'rejected', 'withdrawn'],
  applied: ['document_screening', 'offer', 'rejected', 'withdrawn'],
  document_screening: ['document_passed', 'offer', 'rejected', 'withdrawn'],
  document_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['interview_passed', 'offer', 'rejected', 'withdrawn'],
  interview_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  offer: ['offer_accepted', 'rejected', 'withdrawn'],
  offer_accepted: [],
  rejected: [],
  withdrawn: []
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

const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200'
}

interface MatchWithDetails extends Match {
  jobTitle?: string
  companyName?: string
  candidateName?: string
  storeNames?: string[]
}

interface CandidateDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [candidateId, setCandidateId] = useState<string>('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  
  // マッチング作成用の状態
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [createMatchOpen, setCreateMatchOpen] = useState(false)
  const [jobSelectModalOpen, setJobSelectModalOpen] = useState(false)
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [newMatchData, setNewMatchData] = useState({
    jobIds: [] as string[],
    score: 50,
    notes: ''
  })

  // ステータス更新用の状態
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
  const [statusNotes, setStatusNotes] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な求職者IDです')
        window.location.href = '/candidates'
        return
      }
      setCandidateId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!candidateId) return

    const fetchCandidate = async () => {
      try {
        const candidateDoc = await getDoc(doc(db, 'candidates', candidateId))
        if (candidateDoc.exists()) {
          const candidateData = candidateDoc.data() as Candidate
          setCandidate(candidateData)
        } else {
          alert('求職者が見つかりません')
          router.push('/candidates')
        }
      } catch (error) {
        console.error('求職者データの取得に失敗しました:', error)
        alert('求職者データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCandidate()
  }, [candidateId, router])

  useEffect(() => {
    if (!candidateId) return
    loadMatches()
    loadJobsData()
  }, [candidateId])

  const loadJobsData = async () => {
    try {
      const [jobsData, companiesData, storesData] = await Promise.all([
        getJobs(),
        getCompanies(),
        getStores()
      ])
      setJobs(jobsData)
      setCompanies(companiesData)
      setStores(storesData)
    } catch (error) {
      console.error('求人データの取得に失敗しました:', error)
    }
  }

  const loadMatches = async () => {
    try {
      setMatchesLoading(true)
      console.log('🔍 候補者のマッチング読み込み開始 ID:', candidateId)
      
      // 候補者のマッチングを取得
      const matchesData = await getMatchesByCandidate(candidateId)
      console.log('📋 取得したマッチング数:', matchesData.length)
      
      // 各マッチングに求人と企業、店舗の詳細情報を追加
      const matchesWithDetails = await Promise.all(
        matchesData.map(async (match) => {
          try {
            const [jobData, companyData] = await Promise.all([
              getJob(match.jobId),
              getCompany(match.companyId)
            ])
            
            // 店舗情報を取得（storeIdsまたはstoreIdに対応）
            let storeNames: string[] = []
            if (jobData) {
              if (jobData.storeIds && jobData.storeIds.length > 0) {
                // 有効なIDのみをフィルタリング
                const validStoreIds = jobData.storeIds.filter(id => id && id.trim() !== '')
                if (validStoreIds.length > 0) {
                  const storesData = await Promise.all(
                    validStoreIds.map(id => getStoreById(id).catch(() => null))
                  )
                  storeNames = storesData
                    .filter((s): s is Store => s !== null)
                    .map(s => s.name)
                }
              } else if (jobData.storeId && jobData.storeId.trim() !== '') {
                const storeData = await getStoreById(jobData.storeId).catch(() => null)
                if (storeData) storeNames = [storeData.name]
              }
            }
            
            return {
              ...match,
              jobTitle: jobData?.title || '求人不明',
              companyName: companyData?.name || '企業不明',
              storeNames: storeNames
            }
          } catch (error) {
            console.error('マッチング詳細取得エラー:', error)
            return {
              ...match,
              jobTitle: '取得エラー',
              companyName: '取得エラー',
              storeNames: []
            }
          }
        })
      )
      
      // ステータス降順でソート（優先度: offer_accepted > offer > interview_passed > interview > document_passed > document_screening > applied > suggested > withdrawn/rejected）
      const statusPriority: Record<Match['status'], number> = {
        offer_accepted: 9,
        offer: 8,
        interview_passed: 7,
        interview: 6,
        document_passed: 5,
        document_screening: 4,
        applied: 3,
        suggested: 2,
        withdrawn: 1,
        rejected: 1
      }
      
      matchesWithDetails.sort((a, b) => {
        return statusPriority[b.status] - statusPriority[a.status]
      })
      
      setMatches(matchesWithDetails)
      console.log('✅ マッチング詳細読み込み完了')
    } catch (error) {
      console.error('マッチング読み込みエラー:', error)
    } finally {
      setMatchesLoading(false)
    }
  }

  const getStatusBadge = (status: Match['status'], interviewRound?: number) => (
    <Badge className={`${statusColors[status]} border-0 font-medium`}>
      {getStatusLabel(status, interviewRound)}
    </Badge>
  )

  const getStatusColor = (status: Match['status']) => {
    return statusColors[status]
  }

  const getStatusIcon = (status: Match['status']) => {
    const Icon = statusIcons[status]
    return <Icon className="h-4 w-4" />
  }

  const getScoreBadge = (score: number) => {
    let colorClass = 'bg-gray-100 text-gray-800'
    if (score >= 90) colorClass = 'bg-green-100 text-green-800'
    else if (score >= 80) colorClass = 'bg-blue-100 text-blue-800'
    else if (score >= 70) colorClass = 'bg-yellow-100 text-yellow-800'
    else if (score >= 60) colorClass = 'bg-orange-100 text-orange-800'
    else colorClass = 'bg-red-100 text-red-800'

    return (
      <Badge className={`${colorClass} border-0 font-medium`}>
        {score}%
      </Badge>
    )
  }

  const handleCreateMatch = async () => {
    try {
      if (!candidateId || newMatchData.jobIds.length === 0) {
        alert('求人を選択してください')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const jobId of newMatchData.jobIds) {
        try {
          // 既にマッチングが存在するかチェック
          const existingMatch = matches.find(m => m.jobId === jobId)
          if (existingMatch) {
            console.log(`マッチングが既に存在します: Job ID ${jobId}`)
            errorCount++
            continue
          }

          const selectedJob = jobs.find(j => j.id === jobId)
          if (!selectedJob) continue

          const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
            candidateId: candidateId,
            jobId: jobId,
            companyId: selectedJob.companyId,
            status: 'suggested',
            score: newMatchData.score,
            matchReasons: [{
              type: 'manual',
              description: '手動でマッチングを作成',
              weight: 1.0
            }],
            timeline: [{
              id: `timeline_${Date.now()}_${jobId}`,
              status: 'suggested',
              timestamp: new Date(),
              description: 'マッチングが作成されました',
              createdBy: user?.uid || '',
              notes: newMatchData.notes
            }],
            createdBy: user?.uid || '',
            notes: newMatchData.notes
          }

          await createMatch(matchData)
          successCount++
        } catch (error) {
          console.error(`Failed to create match for job ${jobId}:`, error)
          errorCount++
        }
      }

      alert(`${successCount}件のマッチングを作成しました${errorCount > 0 ? `（${errorCount}件失敗）` : ''}`)
      await loadMatches() // マッチング一覧を再読み込み
      
      setCreateMatchOpen(false)
      setNewMatchData({ jobIds: [], score: 50, notes: '' })
    } catch (error) {
      console.error('マッチング作成エラー:', error)
      alert('マッチングの作成に失敗しました')
    }
  }

  const handleJobSelect = (jobId: string) => {
    setNewMatchData(prev => {
      const isSelected = prev.jobIds.includes(jobId)
      if (isSelected) {
        return { ...prev, jobIds: prev.jobIds.filter(id => id !== jobId) }
      } else {
        return { ...prev, jobIds: [...prev.jobIds, jobId] }
      }
    })
  }

  const handleJobSelectComplete = () => {
    setJobSelectModalOpen(false)
    setJobSearchTerm('')
  }

  const handleOpenStatusUpdate = (match: MatchWithDetails) => {
    setSelectedMatch(match)
    setNewStatus(match.status)
    setStatusNotes('')
    setEventDate('')
    setEventTime('')
    setStatusUpdateOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedMatch || !user?.uid) return

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
        selectedMatch.id,
        newStatus,
        '',
        user.uid,
        statusNotes || undefined,
        combinedDateTime
      )
      
      await loadMatches() // Reload data
      
      // 面接ステータスで日時が設定されている場合、自動的にGoogleカレンダーを開く
      if (newStatus === 'interview' && combinedDateTime && candidate) {
        const job = jobs.find(j => j.id === selectedMatch.jobId)
        const company = companies.find(c => c.id === job?.companyId)
        const store = stores.find(s => s.id === job?.storeId)
        
        if (company) {
          const candidateName = `${candidate.lastName} ${candidate.firstName}`
          const endTime = new Date(combinedDateTime.getTime() + 60 * 60000) // 1時間後
          
          // カレンダーIDは環境変数から取得（設定されていればそのカレンダーに追加）
          const calendarId = process.env.NEXT_PUBLIC_DEFAULT_CALENDAR_ID
          
          const calendarUrl = generateGoogleCalendarUrl(
            `面接: ${candidateName} - ${company.name}`,
            combinedDateTime,
            endTime,
            `【求職者】${candidateName}\n【企業】${company.name}\n【職種】${job?.title || ''}\n\n${statusNotes || ''}`.trim(),
            store?.address || company.address,
            calendarId
          )
          
          // 自動的にGoogleカレンダーを開く
          window.open(calendarUrl, '_blank')
          toast.success('ステータスを更新しました。Googleカレンダーが別タブで開きます。')
        }
      } else {
        toast.success('ステータスを更新しました')
      }
      
      setStatusUpdateOpen(false)
      setSelectedMatch(null)
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      toast.error('ステータスの更新に失敗しました')
    }
  }

  const getFilteredJobs = () => {
    // 既にマッチングが存在する求人IDのセット
    const existingJobIds = new Set(matches.map(m => m.jobId))
    
    return jobs.filter(job => {
      // 既にマッチングが存在する求人は除外
      if (existingJobIds.has(job.id)) {
        return false
      }
      
      const company = companies.find(c => c.id === job.companyId)
      const store = stores.find(s => s.id === job.storeId)
      const searchText = `${job.title} ${company?.name || ''} ${store?.name || ''}`.toLowerCase()
      return searchText.includes(jobSearchTerm.toLowerCase())
    })
  }

  const getSelectedJobDisplay = () => {
    if (newMatchData.jobIds.length === 0) return '求人を選択'
    if (newMatchData.jobIds.length === 1) {
      const job = jobs.find(j => j.id === newMatchData.jobIds[0])
      const company = companies.find(c => c.id === job?.companyId)
      return job ? `${job.title} - ${company?.name || '不明'}` : '求人を選択'
    }
    return `${newMatchData.jobIds.length}件の求人を選択中`
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // 年齢計算のヘルパー関数
  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null
    
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    // まだ誕生日が来ていない場合は1歳引く
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">求職者が見つかりません</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100">
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/candidates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-4 mb-8">        
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-red-800">
            <Users className="h-8 w-8" />
            求職者詳細
          </h1>
          <p className="text-gray-600 mt-2">
            {candidate.lastName} {candidate.firstName}の詳細情報
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadMatches}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button
            onClick={() => setCreateMatchOpen(true)}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            進捗を作成
          </Button>
          <Link href={`/candidates/${candidateId}/edit`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* マッチング進捗セクション */}
        <Card className="border-purple-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-purple-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  マッチング進捗
                </CardTitle>
                <CardDescription>
                  この候補者のマッチング状況と進捗
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {matches.length}件
                </Badge>
                {matchesLoading && <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />}
                <Button
                  onClick={() => setCreateMatchOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  進捗を作成
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-gray-600">マッチング情報を読み込み中...</p>
              </div>
            ) : matches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>求人</TableHead>
                    <TableHead>企業/店舗</TableHead>
                    <TableHead>スコア</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>面接日時</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match: any) => {
                    // 背景色の設定
                    let rowBgClass = "hover:bg-purple-50"
                    if (match.status === 'offer_accepted') {
                      rowBgClass = "bg-red-50 hover:bg-red-100"
                    } else if (match.status === 'rejected' || match.status === 'withdrawn') {
                      rowBgClass = "bg-gray-100 hover:bg-gray-200"
                    }
                    
                    return (
                    <TableRow key={match.id} className={rowBgClass}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4 text-purple-600" />
                          <div>
                            <Link href={`/jobs/${match.jobId}`}>
                              <div className="font-medium">{match.jobTitle}</div>
                            </Link>
                            {match.matchReasons.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {match.matchReasons.slice(0, 2).map((reason: any, index: number) => (
                                  <span key={index} className="mr-2">
                                    {reason.description}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/companies/${match.companyId}`}>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{match.companyName}</span>
                          </div>
                          {match.storeNames && match.storeNames.length > 0 ? (
                            <div className="text-xs text-gray-500 mt-1">
                              {match.storeNames.length <= 3 
                                ? match.storeNames.join(', ')
                                : `${match.storeNames.slice(0, 3).join(', ')} +${match.storeNames.length - 3}店舗`
                              }
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {getScoreBadge(match.score)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(match.status, match.currentInterviewRound)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // 面接日時を取得
                          if (!match.interviewDate) {
                            return <span className="text-gray-400">-</span>
                          }
                          
                          const interviewDate = match.interviewDate instanceof Date 
                            ? match.interviewDate 
                            : new Date(match.interviewDate)
                          
                          // 有効な日付かチェック
                          if (isNaN(interviewDate.getTime())) {
                            return <span className="text-gray-400">-</span>
                          }
                          
                          return (
                            <div className="text-sm">
                              <div>{interviewDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>
                              <div className="text-xs text-gray-500">
                                {interviewDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(match.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            <Link href={`/progress/${match.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              詳細
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStatusUpdate(match)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            次へ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  マッチングがありません
                </h3>
                <p className="text-gray-600 mb-4">
                  この候補者にはまだマッチングが作成されていません
                </p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/progress">
                    進捗管理でマッチングを作成
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* 基本情報セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-800">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">氏名</label>
                  <p className="text-lg">{candidate.lastName}　{candidate.firstName}<br></br>（{candidate.lastNameKana} {candidate.firstNameKana}）</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">生年月日</label>
                  <p>
                    {candidate.dateOfBirth ? (
                      <>
                        {candidate.dateOfBirth}
                        <span className="ml-2 text-blue-600 font-medium">
                          （{calculateAge(candidate.dateOfBirth)}歳）
                        </span>
                      </>
                    ) : (
                      '未登録'
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">メールアドレス</label>
                  <p>{candidate.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">電話番号</label>
                  <p>{candidate.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">入学校舎 / 入学年月</label>
                  <div className="mt-1 flex items-center gap-2">
                    {candidate.campus ? (
                      <Badge className={`${campusColors[candidate.campus]} border font-medium`}>
                        {campusLabels[candidate.campus]}
                      </Badge>
                    ) : (
                      <span>未登録</span>
                    )}
                    <span>/</span>
                    <span>{candidate.enrollmentDate || '未登録'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">最寄り駅</label>
                  <p className="mt-1">{candidate.nearestStation || '未登録'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">調理経験</label>
                  <p className="mt-1">{candidate.cookingExperience || '未登録'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="text-orange-800">内部管理情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">願書URL</label>
                    <p className="mt-1">
                      {candidate.applicationFormUrl ? (
                        <a href={candidate.applicationFormUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          ファイルを開く
                        </a>
                      ) : '未登録'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">履歴書URL</label>
                    <p className="mt-1">
                      {candidate.resumeUrl ? (
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          ファイルを開く
                        </a>
                      ) : '未登録'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">スコア（人物）</label>
                    <p className="mt-1">{candidate.personalityScore || '未登録'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">スコア（スキル）</label>
                    <p className="mt-1">{candidate.skillScore || '未登録'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">先生からのコメント</label>
                  <p className="mt-1 whitespace-pre-wrap">{candidate.teacherComment || '未登録'}</p>
                </div>
              </div>
            </CardContent>
          </Card>          
          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="text-orange-800">面談メモ</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-500">面談メモ</label>
                <p className="mt-1 whitespace-pre-wrap">{candidate.interviewMemo || '未登録'}</p>
              </div>
            </CardContent>
          </Card>       
        </div>

        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="text-green-800">希望条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">就職活動をスタートさせるタイミング</label>
                <p className="mt-1">{candidate.jobSearchTiming || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">卒業&quot;直後&quot;の希望進路</label>
                <p className="mt-1">{candidate.graduationCareerPlan || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">就職・開業希望エリア</label>
                <p className="mt-1">{candidate.preferredArea || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">就職・開業したいお店の雰囲気・条件</label>
                <p className="mt-1 whitespace-pre-wrap">{candidate.preferredWorkplace || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">将来のキャリア像</label>
                <p className="mt-1 whitespace-pre-wrap">{candidate.futureCareerVision || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">キャリア担当への質問・要望</label>
                <p className="mt-1 whitespace-pre-wrap">{candidate.questions || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">在校中のアルバイト希望</label>
                <p className="mt-1 whitespace-pre-wrap">{candidate.partTimeHope || '未登録'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* マッチング作成モーダル */}
      <Dialog open={createMatchOpen} onOpenChange={(open) => {
        setCreateMatchOpen(open)
        if (!open) {
          setNewMatchData({ jobIds: [], score: 50, notes: '' })
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新規マッチング作成</DialogTitle>
            <DialogDescription>
              {candidate?.lastName} {candidate?.firstName}さんと求人をマッチングします
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="job">求人（複数選択可）</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setJobSelectModalOpen(true)}
              >
                <Briefcase className="h-4 w-4 mr-2" />
                {getSelectedJobDisplay()}
              </Button>
              {/* 選択済み求人リスト */}
              {newMatchData.jobIds.length > 0 && (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-2">
                  {newMatchData.jobIds.map((jobId) => {
                    const job = jobs.find(j => j.id === jobId)
                    const company = companies.find(c => c.id === job?.companyId)
                    // storeIds（配列）またはstoreId（単一）に対応
                    const jobStores = job?.storeIds && job.storeIds.length > 0
                      ? stores.filter(s => job.storeIds?.includes(s.id))
                      : job?.storeId
                      ? [stores.find(s => s.id === job.storeId)].filter(Boolean)
                      : []
                    // 求人タイトルに都道府県を付与（店舗の都道府県を使用）
                    const prefecture = jobStores[0]?.prefecture
                    const displayTitle = getJobTitleWithPrefecture(job?.title || '', prefecture)
                    return (
                      <div key={jobId} className="flex items-start gap-2 p-3 bg-gray-50 rounded text-sm border border-gray-200">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="font-medium">{displayTitle}</div>
                          <div className="text-xs text-gray-600">
                            <div>{company?.name}</div>
                            {jobStores.length > 0 && (
                              <div className="mt-0.5">
                                {jobStores.map(s => getStoreNameWithPrefecture(s?.name || '', s?.prefecture)).filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => handleJobSelect(jobId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="score">マッチングスコア ({newMatchData.score})</Label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={newMatchData.score}
                onChange={(e) => setNewMatchData(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                value={newMatchData.notes}
                onChange={(e) => setNewMatchData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="マッチングに関する備考..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateMatchOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreateMatch}
              disabled={newMatchData.jobIds.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 求人選択モーダル */}
      <Dialog open={jobSelectModalOpen} onOpenChange={setJobSelectModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>求人を選択（複数選択可）</DialogTitle>
            <DialogDescription>
              マッチングを作成する求人を選択してください（複数選択可能）
              {newMatchData.jobIds.length > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  {newMatchData.jobIds.length}件選択中
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* 検索フィールド */}
            <div>
              <Label htmlFor="job-dialog-search">検索</Label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  id="job-dialog-search"
                  placeholder="求人名、企業名、店舗名で検索..."
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* 求人リスト */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              <div className="space-y-2 p-4">
                {getFilteredJobs().map((job) => {
                  const company = companies.find(c => c.id === job.companyId)
                  // storeIds（配列）またはstoreId（単一）に対応
                  const jobStores = job.storeIds && job.storeIds.length > 0
                    ? stores.filter(s => job.storeIds?.includes(s.id))
                    : job.storeId
                    ? [stores.find(s => s.id === job.storeId)].filter(Boolean)
                    : []
                  const isSelected = newMatchData.jobIds.includes(job.id)
                  
                  // 求人タイトルに都道府県を付与（店舗の都道府県を使用）
                  const prefecture = jobStores[0]?.prefecture
                  const displayTitle = getJobTitleWithPrefecture(job.title, prefecture)
                  
                  return (
                    <div
                      key={job.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleJobSelect(job.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">{displayTitle}</h4>
                          <p className="text-gray-600 text-sm mt-1">
                            {company?.name || '企業名不明'}
                            {jobStores.length > 0 && (
                              <span className="ml-2">
                                - {jobStores.map(s => getStoreNameWithPrefecture(s?.name || '', s?.prefecture)).filter(Boolean).join(', ')}
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
                            {(job.salaryInexperienced || job.salaryExperienced) && (
                              <span className="text-xs text-gray-500">
                                {job.salaryInexperienced || job.salaryExperienced}
                              </span>
                            )}
                          </div>
                          {job.jobDescription && (
                            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                              {job.jobDescription}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {getFilteredJobs().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {jobSearchTerm ? '検索条件に一致する求人が見つかりません' : '求人がありません'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setJobSelectModalOpen(false)
                setJobSearchTerm('')
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleJobSelectComplete}
              disabled={newMatchData.jobIds.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              決定（{newMatchData.jobIds.length}件）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ステータス更新モーダル */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>次の進捗へ</DialogTitle>
            <DialogDescription>
              {selectedMatch?.candidateName || `${candidate?.lastName} ${candidate?.firstName}`} - {selectedMatch?.jobTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 現在のステータス表示 */}
            {selectedMatch && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">現在のステータス</div>
                <Badge className={`${getStatusColor(selectedMatch.status)} border-0`}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(selectedMatch.status)}
                    {getStatusLabel(selectedMatch.status)}
                  </div>
                </Badge>
              </div>
            )}

            {/* 次のステータス選択 */}
            {selectedMatch && (
              <div>
                <Label className="text-base font-semibold mb-3 block">次のステータスを選択</Label>
                <div className="space-y-2">
                  {/* 通常のステータス（縦並び） */}
                  <div className="grid grid-cols-1 gap-2">
                    {statusFlow[selectedMatch.status]
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
                  {statusFlow[selectedMatch.status].some(s => ['offer', 'rejected', 'withdrawn'].includes(s)) && (
                    <div className="grid grid-cols-3 gap-2">
                      {statusFlow[selectedMatch.status]
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
            )}
            
            {/* イベント日時入力 */}
            {['interview', 'offer', 'offer_accepted', 'rejected'].includes(newStatus) && 
             selectedMatch && newStatus !== selectedMatch.status && (
              <div className="space-y-2">
                <Label>
                  {newStatus === 'interview' && '面接日'}
                  {newStatus === 'offer' && '内定日'}
                  {newStatus === 'offer_accepted' && '内定承諾日'}
                  {newStatus === 'rejected' && '不合格日'}
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
              className="bg-orange-600 hover:bg-orange-700"
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