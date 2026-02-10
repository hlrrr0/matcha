"use client"

import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
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
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  FolderPlus
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate, campusLabels, sourceTypeLabels } from '@/types/candidate'
import { Match } from '@/types/matching'
import { getMatchesByCandidate, createMatch, updateMatchStatus, deleteMatch } from '@/lib/firestore/matches'
import { getJob, getJobs } from '@/lib/firestore/jobs'
import { getCompany, getCompanies } from '@/lib/firestore/companies'
import { getStoreById, getStores } from '@/lib/firestore/stores'
import { getDiagnosisHistory } from '@/lib/firestore/diagnosis'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { Diagnosis } from '@/types/diagnosis'
import { useAuth } from '@/contexts/AuthContext'
import { getJobTitleWithPrefecture, getStoreNameWithPrefecture } from '@/lib/utils/prefecture'
import { generateGoogleCalendarUrl } from '@/lib/google-calendar'
import { StatusUpdateDialog } from '@/components/matches/StatusUpdateDialog'
import DiagnosisHistoryComparison from '@/components/diagnosis/DiagnosisHistoryComparison'
import { createGoogleDriveFolder, generateCandidateFolderName } from '@/lib/google-drive'

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
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200',
  taiwan: 'bg-red-100 text-red-800 border-red-200'
}

interface MatchWithDetails extends Match {
  jobTitle?: string
  companyName?: string
  candidateName?: string
  storeNames?: string[]
  employmentType?: string // 雇用形態を追加
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [diagnosisHistory, setDiagnosisHistory] = useState<Diagnosis[]>([])
  const [selectedDiagnosisIds, setSelectedDiagnosisIds] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  
  // 一括選択・辞退用の状態
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  const [bulkWithdrawing, setBulkWithdrawing] = useState(false)
  
  // マッチング作成用の状態
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [createMatchOpen, setCreateMatchOpen] = useState(false)
  const [jobSelectModalOpen, setJobSelectModalOpen] = useState(false)
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [newMatchData, setNewMatchData] = useState({
    jobIds: [] as string[],
    notes: ''
  })
  
  // Google Drive フォルダー作成用の状態
  const [creatingFolder, setCreatingFolder] = useState(false)
  // ステータス更新用の状態
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  // Slack送信用の状態
  const [sendingSlack, setSendingSlack] = useState(false)
  // 削除用の状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<MatchWithDetails | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    loadDiagnosis()
  }, [candidateId])

  const loadDiagnosis = async () => {
    if (!candidateId) return
    try {
      const diagnosisData = await getDiagnosisHistory(candidateId)
      setDiagnosisHistory(diagnosisData)
      // デフォルトで最新の診断を選択
      if (diagnosisData.length > 0 && diagnosisData[0].id) {
        setSelectedDiagnosisIds([diagnosisData[0].id])
      }
    } catch (error) {
      console.error('診断結果の取得に失敗しました:', error)
    }
  }

  // ソート順が変わったら再ソート
  useEffect(() => {
    if (matches.length === 0) return
    
    const statusPriority: Record<Match['status'], number> = {
      suggested: 1,
      applied: 2,
      document_screening: 3,
      document_passed: 4,
      interview: 5,
      interview_passed: 6,
      offer: 7,
      offer_accepted: 8,
      rejected: 9,
      withdrawn: 9
    }
    
    const sortedMatches = [...matches].sort((a, b) => {
      const priorityA = statusPriority[a.status]
      const priorityB = statusPriority[b.status]
      
      // ステータス優先度で比較
      const statusCompare = sortOrder === 'desc' ? priorityB - priorityA : priorityA - priorityB
      if (statusCompare !== 0) return statusCompare
      
      // ステータスが同じ場合は更新日で比較（降順）
      const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime()
      const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime()
      return dateB - dateA
    })
    
    setMatches(sortedMatches)
  }, [sortOrder])

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
            
            // 現在のステータスに対応するタイムラインから面接日時を取得
            let latestInterviewDate: Date | undefined
            if (match.timeline && match.timeline.length > 0) {
              console.log('🔍 Match ID:', match.id, 'Status:', match.status, 'Timeline:', match.timeline)
              
              // タイムラインを日付順にソート（新しい順）
              const sortedTimeline = [...match.timeline].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                return timeB - timeA
              })
              
              console.log('📋 Sorted Timeline:', sortedTimeline)
              
              // 現在のステータスに対応する最新のタイムラインを取得
              const currentStatusEvent = sortedTimeline.find(t => t.status === match.status && t.eventDate)
              console.log('🎯 Current Status Event:', currentStatusEvent)
              
              if (currentStatusEvent && currentStatusEvent.eventDate) {
                latestInterviewDate = currentStatusEvent.eventDate instanceof Date 
                  ? currentStatusEvent.eventDate 
                  : new Date(currentStatusEvent.eventDate)
                console.log('✅ Interview Date from current status:', latestInterviewDate)
              } else {
                // 現在のステータスにeventDateがない場合は、最新のeventDateを取得
                const latestEvent = sortedTimeline.find(t => t.eventDate)
                console.log('🔄 Latest Event with eventDate:', latestEvent)
                
                if (latestEvent && latestEvent.eventDate) {
                  latestInterviewDate = latestEvent.eventDate instanceof Date 
                    ? latestEvent.eventDate 
                    : new Date(latestEvent.eventDate)
                  console.log('✅ Interview Date from latest event:', latestInterviewDate)
                }
              }
            }
            
            // interviewDateフィールドがある場合はそちらも確認
            if (!latestInterviewDate && match.interviewDate) {
              latestInterviewDate = match.interviewDate instanceof Date 
                ? match.interviewDate 
                : new Date(match.interviewDate)
            }
            
            return {
              ...match,
              jobTitle: jobData?.title || '求人不明',
              companyName: companyData?.name || '企業不明',
              storeNames: storeNames,
              employmentType: jobData?.employmentType || undefined, // 雇用形態を追加
              interviewDate: latestInterviewDate // 最新の面接日時を設定
            }
          } catch (error) {
            console.error('マッチング詳細取得エラー:', error)
            return {
              ...match,
              jobTitle: '取得エラー',
              companyName: '取得エラー',
              storeNames: [],
              employmentType: undefined
            }
          }
        })
      )
      
      // 複数条件でソート（①ステータス昇順 → ②作成日昇順）
      const statusPriority: Record<Match['status'], number> = {
        suggested: 1,
        applied: 2,
        document_screening: 3,
        document_passed: 4,
        interview: 5,
        interview_passed: 6,
        offer: 7,
        offer_accepted: 8,
        rejected: 9,
        withdrawn: 9
      }
      
      matchesWithDetails.sort((a, b) => {
        const priorityA = statusPriority[a.status]
        const priorityB = statusPriority[b.status]
        
        // ステータス優先度で比較
        const statusCompare = sortOrder === 'desc' ? priorityB - priorityA : priorityA - priorityB
        if (statusCompare !== 0) return statusCompare
        
        // ステータスが同じ場合は作成日で比較（昇順）
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return dateA - dateB
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

  const handleCreateMatch = async () => {
    try {
      if (!candidateId || newMatchData.jobIds.length === 0) {
        toast.error('求人を選択してください')
        return
      }

      let successCount = 0
      let errorCount = 0
      const duplicateJobs: string[] = []

      for (const jobId of newMatchData.jobIds) {
        try {
          // 既にマッチングが存在するかチェック
          const existingMatch = matches.find(m => m.jobId === jobId)
          if (existingMatch) {
            const job = jobs.find(j => j.id === jobId)
            const jobTitle = job?.title || '不明な求人'
            duplicateJobs.push(jobTitle)
            console.log(`マッチングが既に存在します: ${jobTitle} (Job ID ${jobId})`)
            errorCount++
            continue
          }

          const selectedJob = jobs.find(j => j.id === jobId)
          if (!selectedJob) {
            errorCount++
            continue
          }

          const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
            candidateId: candidateId,
            jobId: jobId,
            companyId: selectedJob.companyId,
            score: 0,
            status: 'suggested',
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

      // 結果メッセージ
      if (successCount > 0) {
        toast.success(`${successCount}件の進捗を作成しました`)
      }
      if (duplicateJobs.length > 0) {
        toast.error(`${duplicateJobs.length}件の求人は既に進捗が存在します: ${duplicateJobs.slice(0, 2).join(', ')}${duplicateJobs.length > 2 ? ' 他' : ''}`)
      }
      if (errorCount > 0 && duplicateJobs.length === 0) {
        toast.error(`${errorCount}件の進捗作成に失敗しました`)
      }
      
      await loadMatches() // マッチング一覧を再読み込み
      
      setCreateMatchOpen(false)
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
    setStatusUpdateOpen(true)
  }

  const handleProgressDelete = async () => {
    if (!selectedMatch) return

    try {
      // 最新の進捗のみ削除可能かチェック
      if (!selectedMatch.timeline || selectedMatch.timeline.length === 0) {
        throw new Error('削除できる進捗がありません')
      }

      const sortedTimeline = [...selectedMatch.timeline].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
        return timeA - timeB
      })

      const latestTimelineId = sortedTimeline[sortedTimeline.length - 1]?.id
      if (!latestTimelineId) {
        throw new Error('削除できる進捗がありません')
      }

      const { deleteLatestTimelineItem } = await import('@/lib/firestore/matches')
      await deleteLatestTimelineItem(selectedMatch.id, latestTimelineId)

      await loadMatches() // データを再読み込み
    } catch (error: any) {
      console.error('進捗削除エラー:', error)
      throw error
    }
  }

  const handleStatusUpdate = async (status: Match['status'], notes: string, eventDateTime?: Date) => {
    if (!selectedMatch || !user?.uid) return

    try {
      await updateMatchStatus(
        selectedMatch.id,
        status,
        '',
        user.uid,
        notes || undefined,
        eventDateTime
      )
      
      await loadMatches() // Reload data
      
      // 面接ステータスで日時が設定されている場合、自動的にGoogleカレンダーを開く
      if (status === 'interview' && eventDateTime && candidate) {
        const job = jobs.find(j => j.id === selectedMatch.jobId)
        const company = companies.find(c => c.id === job?.companyId)
        const store = stores.find(s => s.id === job?.storeId)
        
        if (company) {
          const candidateName = `${candidate.lastName} ${candidate.firstName}`
          const endTime = new Date(eventDateTime.getTime() + 60 * 60000) // 1時間後
          
          // カレンダーIDは環境変数から取得（設定されていればそのカレンダーに追加）
          const calendarId = process.env.NEXT_PUBLIC_DEFAULT_CALENDAR_ID
          
          const calendarUrl = generateGoogleCalendarUrl(
            `面接: ${candidateName} - ${company.name}`,
            eventDateTime,
            endTime,
            `【求職者】${candidateName}\n【企業】${company.name}\n【職種】${job?.title || ''}\n\n${notes || ''}`.trim(),
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
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      toast.error('ステータスの更新に失敗しました')
    }
  }

  // 一括選択のハンドラー
  const handleSelectMatch = (matchId: string, checked: boolean) => {
    setSelectedMatchIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(matchId)
      } else {
        newSet.delete(matchId)
      }
      return newSet
    })
  }

  // 全選択/全解除のハンドラー
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 辞退・不合格以外のマッチングのみ選択
      const selectableIds = matches
        .filter(m => m.status !== 'withdrawn' && m.status !== 'rejected')
        .map(m => m.id)
      setSelectedMatchIds(new Set(selectableIds))
    } else {
      setSelectedMatchIds(new Set())
    }
  }

  // 一括辞退のハンドラー
  const handleBulkWithdraw = async () => {
    if (selectedMatchIds.size === 0) {
      toast.error('辞退する進捗を選択してください')
      return
    }

    if (!confirm(`選択した${selectedMatchIds.size}件の進捗を「辞退」にしますか？`)) {
      return
    }

    setBulkWithdrawing(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const matchId of selectedMatchIds) {
        try {
          await updateMatchStatus(
            matchId,
            'withdrawn',
            '',
            user?.uid || '',
            '一括辞退'
          )
          successCount++
        } catch (error) {
          console.error(`Match ${matchId} の更新に失敗:`, error)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}件の進捗を辞退にしました`)
        await loadMatches()
        setSelectedMatchIds(new Set())
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount}件の更新に失敗しました`)
      }
    } catch (error) {
      console.error('一括辞退エラー:', error)
      toast.error('一括辞退に失敗しました')
    } finally {
      setBulkWithdrawing(false)
    }
  }

  // 進捗削除のハンドラー（提案済みのみ削除可能）
  const handleDeleteMatch = async () => {
    if (!matchToDelete) return

    // 提案済みステータスのみ削除可能
    if (matchToDelete.status !== 'suggested') {
      toast.error('提案済みのステータスのみ削除できます')
      setDeleteDialogOpen(false)
      setMatchToDelete(null)
      return
    }

    setDeleting(true)
    try {
      await deleteMatch(matchToDelete.id)
      toast.success('進捗を削除しました')
      await loadMatches()
      setDeleteDialogOpen(false)
      setMatchToDelete(null)
    } catch (error) {
      console.error('進捗削除エラー:', error)
      toast.error('進捗の削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenDeleteDialog = (match: MatchWithDetails) => {
    setMatchToDelete(match)
    setDeleteDialogOpen(true)
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
      
      // 複数店舗対応: storeIds配列またはstoreId単一
      const jobStores = job.storeIds && job.storeIds.length > 0
        ? stores.filter(s => job.storeIds?.includes(s.id))
        : job.storeId
        ? [stores.find(s => s.id === job.storeId)].filter(Boolean)
        : []
      
      // 店舗名を結合（複数店舗に対応）
      const storeNames = jobStores.map(s => s?.name || '').join(' ')
      
      const searchText = `${job.title} ${company?.name || ''} ${storeNames}`.toLowerCase()
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

  // 求人情報をクリップボードにコピー
  const copyJobInfo = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId)
      if (!job) {
        toast.error('求人情報が見つかりません')
        return
      }

      // 店舗名を取得
      let storeNames = ''
      if (job.storeIds && job.storeIds.length > 0) {
        const jobStores = stores.filter(s => job.storeIds?.includes(s.id))
        storeNames = jobStores.map(s => s.name).join('、')
      } else if (job.storeId) {
        const store = stores.find(s => s.id === job.storeId)
        storeNames = store?.name || ''
      }

      // おすすめポイントを取得
      const recommendedPoints = job.recommendedPoints || ''

      // 公開URL（求職者の区分に応じて変更）
      // sourceTypeがundefinedの場合はデフォルトで飲食人大学として扱う
      const candidateSourceType = candidate?.sourceType || 'inshokujin_univ'
      console.log('候補者の区分:', candidateSourceType)
      const urlPath = candidateSourceType === 'inshokujin_univ' 
        ? '/public/jobs' 
        : '/public/sushicareer/jobs'
      console.log('選択されたURLパス:', urlPath)
      const publicUrl = `${window.location.origin}${urlPath}/${jobId}`

      // コピー用のテキストを作成（おすすめポイントがある場合のみ表示）
      let copyText = `【店舗名】${storeNames}`
      if (recommendedPoints.trim()) {
        copyText += `\n【おすすめポイント】\n${recommendedPoints}`
      }
      copyText += `\n${publicUrl}`

      await navigator.clipboard.writeText(copyText)
      toast.success('求人情報をクリップボードにコピーしました')
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error)
      toast.error('クリップボードへのコピーに失敗しました')
    }
  }

  // 提案中の求人をまとめてコピー
  const copySuggestedJobs = async () => {
    try {
      // 提案済み（suggested）のマッチを取得
      const suggestedMatches = matches.filter(m => m.status === 'suggested')
      
      if (suggestedMatches.length === 0) {
        toast.error('提案中の求人がありません')
        return
      }

      // 各求人の情報を収集
      const jobInfos: string[] = []
      for (const match of suggestedMatches) {
        const job = jobs.find(j => j.id === match.jobId)
        if (!job) continue

        // 店舗名を取得
        let storeNames = ''
        let priceInfo = ''
        if (job.storeIds && job.storeIds.length > 0) {
          const jobStores = stores.filter(s => job.storeIds?.includes(s.id))
          storeNames = jobStores.map(s => s.name).join('、')
          
          // 複数店舗の場合は、最初の店舗の客単価を表示
          if (jobStores.length > 0 && (jobStores[0].unitPriceLunch || jobStores[0].unitPriceDinner)) {
            const lunch = jobStores[0].unitPriceLunch ? `昼: ¥${jobStores[0].unitPriceLunch.toLocaleString()}` : ''
            const dinner = jobStores[0].unitPriceDinner ? `夜: ¥${jobStores[0].unitPriceDinner.toLocaleString()}` : ''
            priceInfo = [lunch, dinner].filter(p => p).join(' / ')
          }
        } else if (job.storeId) {
          const store = stores.find(s => s.id === job.storeId)
          storeNames = store?.name || ''
          
          // 客単価情報を取得
          if (store && (store.unitPriceLunch || store.unitPriceDinner)) {
            const lunch = store.unitPriceLunch ? `昼: ¥${store.unitPriceLunch.toLocaleString()}` : ''
            const dinner = store.unitPriceDinner ? `夜: ¥${store.unitPriceDinner.toLocaleString()}` : ''
            priceInfo = [lunch, dinner].filter(p => p).join(' / ')
          }
        }

        // おすすめポイントを取得
        const recommendedPoints = job.recommendedPoints || ''

        // 公開URL（求職者の区分に応じて変更）
        // sourceTypeがundefinedの場合はデフォルトで飲食人大学として扱う
        const candidateSourceType = candidate?.sourceType || 'inshokujin_univ'
        console.log('候補者の区分 (copySuggestedJobs):', candidateSourceType)
        const urlPath = candidateSourceType === 'inshokujin_univ' 
          ? '/public/jobs' 
          : '/public/sushicareer/jobs'
        console.log('選択されたURLパス (copySuggestedJobs):', urlPath)
        const publicUrl = `${window.location.origin}${urlPath}/${match.jobId}`

        // 求人情報のテキストを作成
        let jobInfo = `【店舗名】${storeNames}`
        if (priceInfo) {
          jobInfo += `\n【客単価】${priceInfo}`
        }
        if (recommendedPoints.trim()) {
          jobInfo += `\n【おすすめポイント】\n${recommendedPoints}`
        }
        jobInfo += `\n${publicUrl}`
        
        jobInfos.push(jobInfo)
      }

      // 全ての求人情報を結合
      const copyText = jobInfos.join('\n\n---\n\n')

      await navigator.clipboard.writeText(copyText)
      toast.success(`提案中の求人 ${suggestedMatches.length}件をコピーしました`)
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error)
      toast.error('クリップボードへのコピーに失敗しました')
    }
  }

  // Google Driveフォルダー作成ハンドラー
  const handleCreateFolder = async () => {
    if (!candidate) {
      toast.error('候補者情報が見つかりません')
      return
    }

    // 飲食人大学の場合は既存のロジック
    if (candidate.sourceType === 'inshokujin_univ') {
      if (!candidate.enrollmentDate || !candidate.campus || !candidate.lastName || !candidate.firstName) {
        toast.error('フォルダー作成に必要な情報が不足しています（入社年月、入学校舎、姓、名）')
        return
      }
    } else {
      // その他の区分は姓名のみ必須
      if (!candidate.lastName || !candidate.firstName) {
        toast.error('フォルダー作成に必要な情報が不足しています（姓、名）')
        return
      }
    }

    setCreatingFolder(true)
    try {
      let folderUrl: string | null = null

      if (candidate.sourceType === 'inshokujin_univ') {
        // 飲食人大学：既存のフォルダー名生成ロジックを使用
        const folderName = generateCandidateFolderName(
          candidate.enrollmentDate!,
          candidate.campus!,
          candidate.lastName,
          candidate.firstName
        )
        folderUrl = await createGoogleDriveFolder(folderName)
      } else {
        // その他の区分：区分名フォルダー内に作成
        const sourceTypeName = sourceTypeLabels[candidate.sourceType || 'mid_career']
        const candidateFolderName = `${candidate.lastName}${candidate.firstName}`
        const fullFolderPath = `${sourceTypeName}/${candidateFolderName}`
        folderUrl = await createGoogleDriveFolder(fullFolderPath)
      }
      
      if (!folderUrl) {
        throw new Error('フォルダーの作成に失敗しました')
      }

      // Firestoreの候補者データを更新
      const candidateRef = doc(db, 'candidates', candidateId)
      await updateDoc(candidateRef, {
        resumeUrl: folderUrl,
        updatedAt: new Date()
      })

      // ローカルの状態も更新
      setCandidate({
        ...candidate,
        resumeUrl: folderUrl
      })

      toast.success('フォルダーを作成しました', {
        action: {
          label: '開く',
          onClick: () => window.open(folderUrl!, '_blank')
        }
      })
    } catch (error) {
      console.error('フォルダー作成エラー:', error)
      toast.error('フォルダーの作成に失敗しました')
    } finally {
      setCreatingFolder(false)
    }
  }

  // Slack送信ハンドラー
  const handleSendToSlack = async () => {
    if (!candidate) {
      toast.error('候補者情報が見つかりません')
      return
    }

    // 既に送信済みかチェック
    if (candidate.slackThreadUrl) {
      if (!confirm('既にSlackスレッドが存在します。再送信しますか？')) {
        return
      }
    }

    setSendingSlack(true)
    try {
      const response = await fetch('/api/slack/send-candidate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: candidateId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Slack送信に失敗しました')
      }

      // ローカルの状態も更新
      setCandidate({
        ...candidate,
        slackChannelId: result.channelId,
        slackMessageTs: result.messageTs,
        slackThreadUrl: result.threadUrl
      })

      toast.success('Slackに送信しました', {
        action: {
          label: 'スレッドを開く',
          onClick: () => window.open(result.threadUrl, '_blank')
        }
      })
    } catch (error: any) {
      console.error('Slack送信エラー:', error)
      toast.error(error.message || 'Slack送信に失敗しました')
    } finally {
      setSendingSlack(false)
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">        
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-red-800">
            <Users className="h-6 h-8 sm:h-8 sm:w-8" />
            求職者詳細
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {candidate.lastName} {candidate.firstName}の詳細情報
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={loadMatches}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">更新</span>
          </Button>
          {diagnosisHistory.length > 0 && (
            <Link href={`/admin/diagnosis/${diagnosisHistory[0].id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">診断結果</span>
              </Button>
            </Link>
          )}
          {candidate.slackThreadUrl ? (
            <Button
              onClick={() => window.open(candidate.slackThreadUrl!, '_blank')}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Slackスレッド</span>
            </Button>
          ) : (
            <Button
              onClick={handleSendToSlack}
              disabled={sendingSlack}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              {sendingSlack ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">送信中...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Slackに送信</span>
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => setCreateMatchOpen(true)}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">進捗を作成</span>
          </Button>
          <Link href={`/candidates/${candidateId}/edit`}>
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">編集</span>
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
                {matches.filter(m => m.status === 'suggested').length > 0 && (
                  <Button
                    onClick={copySuggestedJobs}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    提案中をコピー ({matches.filter(m => m.status === 'suggested').length})
                  </Button>
                )}
                {selectedMatchIds.size > 0 && (
                  <Button
                    onClick={handleBulkWithdraw}
                    disabled={bulkWithdrawing}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {bulkWithdrawing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        選択を辞退 ({selectedMatchIds.size})
                      </>
                    )}
                  </Button>
                )}
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMatchIds.size > 0 && selectedMatchIds.size === matches.filter(m => m.status !== 'withdrawn' && m.status !== 'rejected').length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>求人</TableHead>
                    <TableHead>企業/店舗</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-gray-100"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        ステータス
                        {sortOrder === 'asc' ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>面接日時</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead>更新日</TableHead>
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
                        <Checkbox
                          checked={selectedMatchIds.has(match.id)}
                          onCheckedChange={(checked) => handleSelectMatch(match.id, checked as boolean)}
                          disabled={match.status === 'withdrawn' || match.status === 'rejected'}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <Briefcase className="h-4 w-4 text-purple-600" />
                            <div>
                              <Link href={`/jobs/${match.jobId}`} className="hover:underline">
                                <div className="font-medium">{match.jobTitle}</div>
                              </Link>
                              {match.employmentType && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {match.employmentType}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyJobInfo(match.jobId)
                            }}
                            className="h-8 w-8 p-0 flex-shrink-0"
                            title="求人情報をコピー"
                          >
                            <Copy className="h-4 w-4 text-gray-500" />
                          </Button>
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
                        {getStatusBadge(match.status, match.currentInterviewRound)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // timelineから面接日時を取得
                          let interviewDate: Date | null = null
                          
                          // timelineから面接ステータスのeventDateを探す
                          if (match.timeline && match.timeline.length > 0) {
                            // 面接ステータスのタイムラインを日付順にソート（新しい順）
                            const interviewTimelines = match.timeline
                              .filter((t: { status: string; eventDate?: string | Date; timestamp: string | Date }) => t.status === 'interview' && !!t.eventDate)
                              .sort((a: { timestamp: string | Date }, b: { timestamp: string | Date }) => {
                                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                                return timeB - timeA
                              })
                            
                            if (interviewTimelines.length > 0) {
                              const eventDateValue = interviewTimelines[0].eventDate
                              try {
                                // Firestore Timestampの場合
                                if (eventDateValue && typeof eventDateValue === 'object' && 'toDate' in eventDateValue) {
                                  interviewDate = (eventDateValue as any).toDate()
                                } else if (eventDateValue instanceof Date) {
                                  interviewDate = eventDateValue
                                } else if (typeof eventDateValue === 'string' || typeof eventDateValue === 'number') {
                                  interviewDate = new Date(eventDateValue)
                                }
                              } catch (e) {
                                console.error('Failed to parse eventDate:', e)
                              }
                            }
                          }
                          
                          // 有効な日付かチェック
                          if (!interviewDate || isNaN(interviewDate.getTime())) {
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
                      <TableCell>
                        {(() => {
                          // 最新のタイムラインのnotesを取得
                          if (!match.timeline || match.timeline.length === 0) {
                            return <span className="text-gray-400 text-sm">-</span>
                          }
                          
                          // タイムラインを日付順にソート（新しい順）
                          const sortedTimeline = [...match.timeline].sort((a, b) => {
                            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                            return timeB - timeA
                          })
                          
                          const latestNotes = sortedTimeline[0]?.notes
                          
                          if (!latestNotes || latestNotes.trim() === '') {
                            return <span className="text-gray-400 text-sm">-</span>
                          }
                          
                          // 長い備考は省略して表示
                          const maxLength = 50
                          const displayNotes = latestNotes.length > maxLength 
                            ? latestNotes.substring(0, maxLength) + '...' 
                            : latestNotes
                          
                          return (
                            <div className="text-sm text-gray-700 max-w-xs">
                              <div className="whitespace-pre-wrap break-words" title={latestNotes}>
                                {displayNotes}
                              </div>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(match.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {/* 終了ステータス（内定承諾、辞退、不合格）の場合は編集ボタン */}
                          {['offer_accepted', 'withdrawn', 'rejected'].includes(match.status) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusUpdate(match)}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                編集
                              </Button>
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
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusUpdate(match)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                次へ
                              </Button>
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
                              {/* 提案済みステータスの場合のみ削除ボタンを表示 */}
                              {match.status === 'suggested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDeleteDialog(match)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  削除
                                </Button>
                              )}
                            </>
                          )}
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
                  <label className="text-sm font-medium text-gray-500">求職者区分</label>
                  <div className="mt-1">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
                      {sourceTypeLabels[candidate.sourceType || 'inshokujin_univ']}
                    </Badge>
                    {candidate.sourceDetail && (
                      <span className="ml-2 text-sm text-gray-600">({candidate.sourceDetail})</span>
                    )}
                  </div>
                </div>
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
                    <div className="mt-1 flex items-center gap-2">
                      {candidate.resumeUrl ? (
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          ファイルを開く
                        </a>
                      ) : (
                        <>
                          <span className="text-gray-500">未登録</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCreateFolder}
                            disabled={creatingFolder || !candidate.lastName || !candidate.firstName || (candidate.sourceType === 'inshokujin_univ' && (!candidate.enrollmentDate || !candidate.campus))}
                            className="ml-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            <FolderPlus className="h-4 w-4 mr-1.5" />
                            {creatingFolder ? '作成中...' : 'フォルダーを作成'}
                          </Button>
                        </>
                      )}
                    </div>
                    {!candidate.resumeUrl && !candidate.lastName && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠ フォルダー作成には、姓名が必要です
                      </p>
                    )}
                    {!candidate.resumeUrl && candidate.sourceType === 'inshokujin_univ' && (!candidate.enrollmentDate || !candidate.campus) && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠ 飲食人大学のフォルダー作成には、入学年月・入学校舎が必要です
                      </p>
                    )}
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

        {/* 診断結果セクション */}
        {diagnosisHistory.length > 0 && (
          <DiagnosisHistoryComparison diagnosisHistory={diagnosisHistory} />
        )}

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
            <p className="mt-2 text-xs text-gray-500">
              ※既に進捗が存在する求人は表示されません
            </p>
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
                    {jobSearchTerm ? (
                      '検索条件に一致する求人が見つかりません'
                    ) : matches.length > 0 ? (
                      <div>
                        <p>選択可能な求人がありません</p>
                        <p className="text-xs mt-2">すべての求人に対して既に進捗が作成されています</p>
                      </div>
                    ) : (
                      '求人がありません'
                    )}
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

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              進捗を削除
            </DialogTitle>
            <DialogDescription>
              この進捗を完全に削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          
          {matchToDelete && (
            <div className="space-y-3 py-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">削除対象:</p>
                <p className="font-medium">{matchToDelete.jobTitle}</p>
                <p className="text-sm text-gray-600">{matchToDelete.companyName}</p>
                <div className="mt-2">
                  <Badge className={statusColors[matchToDelete.status]}>
                    {statusLabels[matchToDelete.status]}
                  </Badge>
                </div>
              </div>
              
              {matchToDelete.status !== 'suggested' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    「提案済み」ステータスのもののみ削除できます
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setMatchToDelete(null)
              }}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteMatch}
              disabled={deleting || (matchToDelete && matchToDelete.status !== 'suggested')}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ステータス更新モーダル */}
      <StatusUpdateDialog
        open={statusUpdateOpen}
        onOpenChange={setStatusUpdateOpen}
        match={selectedMatch}
        candidateName={selectedMatch?.candidateName || `${candidate?.lastName} ${candidate?.firstName}`}
        onUpdate={handleStatusUpdate}
        onDelete={handleProgressDelete}
        isEditMode={selectedMatch ? ['offer_accepted', 'withdrawn', 'rejected'].includes(selectedMatch.status) : false}
        candidate={candidate ? {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phone: candidate.phone,
          email: candidate.email,
          resume: candidate.teacherComment, // 先生のコメントを履歴書として使用
          dateOfBirth: candidate.dateOfBirth,
          resumeUrl: candidate.resumeUrl,
          enrollmentDate: candidate.enrollmentDate,
          campus: candidate.campus
        } : undefined}
        job={selectedMatch ? jobs.find(j => j.id === selectedMatch.jobId) : undefined}
        company={selectedMatch ? companies.find(c => c.id === jobs.find(j => j.id === selectedMatch.jobId)?.companyId) : undefined}
        userName={user?.displayName || user?.email || ''}
      />

      </div>
    </ProtectedRoute>
  )
}