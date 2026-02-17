"use client"

import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate, sourceTypeLabels } from '@/types/candidate'
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
import CandidateHeader from '@/components/candidates/detail/CandidateHeader'
import CandidateMatchesSection from '@/components/candidates/detail/CandidateMatchesSection'
import CandidateBasicInfoSection from '@/components/candidates/detail/CandidateBasicInfoSection'
import CandidatePreferencesSection from '@/components/candidates/detail/CandidatePreferencesSection'
import CreateMatchDialog from '@/components/candidates/detail/CreateMatchDialog'
import CandidateJobSelectDialog from '@/components/candidates/detail/JobSelectDialog'
import DeleteMatchDialog from '@/components/candidates/detail/DeleteMatchDialog'
import { getStatusLabel, statusColors } from '@/components/candidates/detail/constants'
import { MatchWithDetails } from '@/components/candidates/detail/types'

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
      pending_proposal: 0,
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
        pending_proposal: 0,
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
            status: 'pending_proposal',
            matchReasons: [{
              type: 'manual',
              description: '手動でマッチングを作成',
              weight: 1.0
            }],
            timeline: [{
              id: `timeline_${Date.now()}_${jobId}`,
              status: 'pending_proposal',
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
  const calculateAge = (dateOfBirth: string | Date | undefined): number | null => {
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

  // 提案待ちの求人をまとめてコピー
  const copyPendingProposalJobs = async () => {
    try {
      // 提案待ち（pending_proposal）のマッチを取得
      const pendingMatches = matches.filter(m => m.status === 'pending_proposal')
      
      console.log('提案待ちマッチ数:', pendingMatches.length)
      console.log('提案待ちマッチのステータス:', pendingMatches.map(m => ({ id: m.id, status: m.status })))
      
      if (pendingMatches.length === 0) {
        toast.error('提案待ちの求人がありません')
        return
      }

      // 各求人の情報を収集
      const jobInfos: string[] = []
      for (const match of pendingMatches) {
        // 再度ステータスを確認（念のため）
        if (match.status !== 'pending_proposal') {
          console.warn('提案待ち以外のステータスが混入:', match.status)
          continue
        }
        
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
        const urlPath = candidateSourceType === 'inshokujin_univ' 
          ? '/public/jobs' 
          : '/public/sushicareer/jobs'
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
      toast.success(`提案待ちの求人 ${pendingMatches.length}件をコピーしました`)
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
        <CandidateHeader
          candidate={candidate}
          candidateId={candidateId}
          diagnosisHistory={diagnosisHistory}
          sendingSlack={sendingSlack}
          onRefreshMatches={loadMatches}
          onSendToSlack={handleSendToSlack}
          onOpenCreateMatch={() => setCreateMatchOpen(true)}
        />
      
      <div className="space-y-6">
        <CandidateMatchesSection
          matches={matches}
          matchesLoading={matchesLoading}
          selectedMatchIds={selectedMatchIds}
          bulkWithdrawing={bulkWithdrawing}
          sortOrder={sortOrder}
          onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          onSelectAll={handleSelectAll}
          onSelectMatch={handleSelectMatch}
          onBulkWithdraw={handleBulkWithdraw}
          onCopySuggestedJobs={copySuggestedJobs}
          onCopyPendingProposalJobs={copyPendingProposalJobs}
          onCopyJobInfo={copyJobInfo}
          onOpenCreateMatch={() => setCreateMatchOpen(true)}
          onOpenStatusUpdate={handleOpenStatusUpdate}
          onOpenDeleteDialog={handleOpenDeleteDialog}
          getStatusBadge={getStatusBadge}
          formatDate={formatDate}
        />

        <CandidateBasicInfoSection
          candidate={candidate}
          creatingFolder={creatingFolder}
          onCreateFolder={handleCreateFolder}
          calculateAge={calculateAge}
        />

        {/* 診断結果セクション */}
        {diagnosisHistory.length > 0 && (
          <DiagnosisHistoryComparison diagnosisHistory={diagnosisHistory} />
        )}

        <CandidatePreferencesSection candidate={candidate} />
      </div>
      </div>

      <CreateMatchDialog
        open={createMatchOpen}
        onOpenChange={setCreateMatchOpen}
        candidate={candidate}
        jobs={jobs}
        companies={companies}
        stores={stores}
        newMatchData={newMatchData}
        setNewMatchData={setNewMatchData}
        onOpenJobSelect={() => setJobSelectModalOpen(true)}
        onRemoveJob={handleJobSelect}
        onCreateMatch={handleCreateMatch}
        getSelectedJobDisplay={getSelectedJobDisplay}
      />

      <CandidateJobSelectDialog
        open={jobSelectModalOpen}
        onOpenChange={setJobSelectModalOpen}
        jobSearchTerm={jobSearchTerm}
        setJobSearchTerm={setJobSearchTerm}
        getFilteredJobs={getFilteredJobs}
        newMatchData={newMatchData}
        onToggleJob={handleJobSelect}
        onComplete={handleJobSelectComplete}
        companies={companies}
        stores={stores}
        matchesLength={matches.length}
      />

      <DeleteMatchDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        matchToDelete={matchToDelete}
        deleting={deleting}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setMatchToDelete(null)
        }}
        onConfirm={handleDeleteMatch}
      />

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