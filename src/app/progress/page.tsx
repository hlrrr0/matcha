"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { getCache, setCache } from '@/lib/utils/cache'
import {
  CheckCircle,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { Match } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'
import { getMatches, createMatch, updateMatchStatus, deleteMatch } from '@/lib/firestore/matches'
import { getCandidates } from '@/lib/firestore/candidates'
import { getJobs } from '@/lib/firestore/jobs'
import { getCompanies } from '@/lib/firestore/companies'
import { generateGoogleCalendarUrl } from '@/lib/google-calendar'
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'
import { StatusUpdateDialog } from '@/components/matches/StatusUpdateDialog'
import ProgressHeader from '@/components/progress/ProgressHeader'
import ProgressFilters from '@/components/progress/ProgressFilters'
import ProgressTable from '@/components/progress/ProgressTable'
import AcceptedMatchesTable from '@/components/progress/AcceptedMatchesTable'
import JobSelectDialog from '@/components/progress/JobSelectDialog'
import CandidateSelectDialog from '@/components/progress/CandidateSelectDialog'
import { statusColors, statusFlow, statusIcons, statusLabels } from '@/components/progress/constants'
import { MatchWithDetails } from '@/components/progress/types'
import { toast } from 'sonner'

function ProgressPageContent() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'progress' | 'accepted'>(
    tabParam === 'accepted' ? 'accepted' : 'progress'
  )
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [filteredMatches, setFilteredMatches] = useState<MatchWithDetails[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  
  // デフォルトで「進捗中」のみ表示
  const [statusFilter, setStatusFilter] = useState<Set<Match['status']>>(new Set([
    'applied', 
    'document_screening', 
    'document_passed', 
    'interview', 
    'interview_passed', 
    'offer'
  ]))
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false) // 期限切れのみ表示フラグ
  
  // Sort states
  const [sortField, setSortField] = useState<'candidate' | 'job' | 'company' | 'status' | 'interviewDate' | 'updatedAt' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Dialog states
  const [createMatchOpen, setCreateMatchOpen] = useState(false)
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [bulkStatusUpdateOpen, setBulkStatusUpdateOpen] = useState(false)
  const [jobSelectModalOpen, setJobSelectModalOpen] = useState(false)
  const [candidateSelectModalOpen, setCandidateSelectModalOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  
  // 一括更新専用の状態
  const [newStatus, setNewStatus] = useState<Match['status']>('pending_proposal')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  
  const [newMatchData, setNewMatchData] = useState({
    candidateId: '',
    jobId: '',
    jobIds: [] as string[], // 複数求人選択用
    score: 50,
    notes: ''
  })
  const [jobSearchTerm, setJobSearchTerm] = useState('')
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('')
  
  // インライン編集用の状態
  const [editingDateField, setEditingDateField] = useState<{ matchId: string, field: 'startDate' | 'endDate' } | null>(null)
  const [editingDateValue, setEditingDateValue] = useState('')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  useEffect(() => {
    filterMatches()
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1)
  }, [matches, searchTerm, statusFilter, companyFilter, sortField, sortDirection, showOverdueOnly])

  // ページ変更時のみフィルター再適用
  useEffect(() => {
    filterMatches()
  }, [currentPage, itemsPerPage])

  // URLパラメータから候補者IDを取得して、新規作成ダイアログを開く
  useEffect(() => {
    const candidateParam = searchParams.get('candidate')
    if (candidateParam && candidates.length > 0) {
      setNewMatchData(prev => ({
        ...prev,
        candidateId: candidateParam
      }))
      setCreateMatchOpen(true)
      // URLパラメータをクリア（ブラウザ履歴を汚さないように）
      window.history.replaceState({}, '', '/progress')
    }
  }, [searchParams, candidates])

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      
      // キャッシュキーを生成
      const cacheKey = 'progress_data'
      
      // キャッシュチェック（強制更新でない場合のみ）
      if (!forceRefresh) {
        const cached = getCache<{
          matches: any[]
          candidates: any[]
          jobs: any[]
          companies: any[]
          stores: any[]
          users: any[]
        }>(cacheKey)
        
        if (cached) {
          console.log('📦 キャッシュからデータ読み込み')
          // ISO文字列からDateオブジェクトに変換
          const matchesWithDates = cached.matches.map((match: any) => ({
            ...match,
            timeline: match.timeline?.map((t: any) => ({
              ...t,
              eventDate: t.eventDate && typeof t.eventDate === 'string' ? new Date(t.eventDate) : t.eventDate
            })),
            createdAt: match.createdAt && typeof match.createdAt === 'string' ? new Date(match.createdAt) : match.createdAt,
            updatedAt: match.updatedAt && typeof match.updatedAt === 'string' ? new Date(match.updatedAt) : match.updatedAt
          }))
          
          setMatches(matchesWithDates)
          setCandidates(cached.candidates)
          setJobs(cached.jobs)
          setCompanies(cached.companies)
          setStores(cached.stores)
          setUsers(cached.users)
          setLoading(false)
          console.log('✅ キャッシュデータのDate変換完了')
          return
        }
      }
      
      console.log('🔄 Firestoreからデータ読み込み')
      const [matchesData, candidatesData, jobsData, companiesData, storesData, usersData] = await Promise.all([
        getMatches(),
        getCandidates(),
        getJobs(),
        getCompanies(),
        getStores(),
        getUsers()
      ])

      console.log('📊 データ読み込み完了:')
      console.log('  企業数:', companiesData.length)
      console.log('  マッチ数:', matchesData.length)
      console.log('  ユーザー数:', usersData.length)

      setCandidates(candidatesData)
      setJobs(jobsData)
      setCompanies(companiesData)
      setStores(storesData)
      setUsers(usersData)

      // Add names to matches
      const matchesWithDetails = matchesData.map(match => {
        const candidate = candidatesData.find(c => c.id === match.candidateId)
        const job = jobsData.find(j => j.id === match.jobId)
        const company = companiesData.find(c => c.id === job?.companyId)
        
        // 複数店舗対応: storeIds優先、storeIdは後方互換性のため
        let store: Store | undefined
        if (job?.storeIds && job.storeIds.length > 0) {
          store = storesData.find(s => s.id === job.storeIds?.[0])
        } else if (job?.storeId) {
          store = storesData.find(s => s.id === job.storeId)
        }

        return {
          ...match,
          candidateName: candidate ? `${candidate.lastName} ${candidate.firstName}` : '不明',
          jobTitle: job?.title || '不明',
          jobEmploymentType: job?.employmentType || '',
          companyName: company?.name || '不明',
          storeName: store?.name && store.prefecture ? `${store.name}【${store.prefecture}】` : (store?.name || '-'),
          storeId: store?.id,
          candidateAssignedUserId: candidate?.assignedUserId,
          companyAssignedUserId: company?.consultantId
        }
      })

      // 求職者ごとの最新更新日時を計算
      const candidateLatestUpdates = new Map<string, number>()
      matchesWithDetails.forEach(match => {
        const currentLatest = candidateLatestUpdates.get(match.candidateId) || 0
        const matchTime = match.updatedAt instanceof Date ? match.updatedAt.getTime() : new Date(match.updatedAt || 0).getTime()
        if (matchTime > currentLatest) {
          candidateLatestUpdates.set(match.candidateId, matchTime)
        }
      })

      // ソート：求職者の最新更新日時の降順 + 同じ求職者内では進捗の更新日時の降順
      matchesWithDetails.sort((a, b) => {
        // まず求職者の最新更新日時で比較
        const candidateLatestA = candidateLatestUpdates.get(a.candidateId) || 0
        const candidateLatestB = candidateLatestUpdates.get(b.candidateId) || 0
        if (candidateLatestA !== candidateLatestB) {
          return candidateLatestB - candidateLatestA
        }
        
        // 同じ求職者の場合は進捗の更新日時で比較
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt || 0)
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt || 0)
        return dateB.getTime() - dateA.getTime()
      })

      setMatches(matchesWithDetails)
      
      // キャッシュに保存（5分間有効）
      // Firestore TimestampをISO文字列に変換してからキャッシュ
      const isDevelopment = process.env.NODE_ENV === 'development'
      const cacheData = {
        matches: matchesWithDetails.map((match: any) => ({
          ...match,
          timeline: match.timeline?.map((t: any) => ({
            ...t,
            eventDate: t.eventDate 
              ? (typeof t.eventDate === 'object' && 'toDate' in t.eventDate 
                  ? t.eventDate.toDate().toISOString()
                  : t.eventDate instanceof Date
                    ? t.eventDate.toISOString()
                    : t.eventDate)
              : undefined
          })),
          createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
          updatedAt: match.updatedAt instanceof Date ? match.updatedAt.toISOString() : match.updatedAt
        })),
        candidates: candidatesData,
        jobs: jobsData,
        companies: companiesData,
        stores: storesData,
        users: usersData
      }
      
      setCache(cacheKey, cacheData)
      console.log('💾 データをキャッシュに保存（Timestamp変換済み）')
    } catch (error) {
      console.error('データの読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMatches = () => {
    let filtered = matches

    if (searchTerm) {
      filtered = filtered.filter(match => 
        match.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // ステータスフィルター: 選択されたステータスのみ表示
    if (statusFilter.size > 0) {
      filtered = filtered.filter(match => statusFilter.has(match.status))
    }
    
    // 確認待ちフィルター: 日程調整中 + 面接ステータスで日程が過ぎたもの
    if (showOverdueOnly) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(match => {
        // 日程調整が必要なステータス（書類選考通過、面接通過）
        if (match.status === 'document_passed' || match.status === 'interview_passed') {
          return true
        }
        
        // 面接ステータスで日程が過ぎたもの
        if (match.status === 'interview') {
          // timelineからstatusが'interview'のイベントを探す
          const interviewEvents = match.timeline?.filter(t => t.status === 'interview') || []
          
          // 最新の面接イベントを取得
          const latestInterview = interviewEvents
            .sort((a, b) => {
              const dateA = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate || 0)
              const dateB = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate || 0)
              return dateB.getTime() - dateA.getTime()
            })[0]
          
          if (!latestInterview?.eventDate) return false
          
          // 元のDateオブジェクトをコピーして比較用の日付を作成（時刻をクリア）
          const originalDate = latestInterview.eventDate instanceof Date 
            ? latestInterview.eventDate 
            : new Date(latestInterview.eventDate)
          const dateOnlyForComparison = new Date(originalDate)
          dateOnlyForComparison.setHours(0, 0, 0, 0)
          
          return dateOnlyForComparison < now
        }
        
        return false
      })
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter(match => match.companyName === companyFilter)
    }

    // ソート処理
    if (sortField) {
      filtered.sort((a, b) => {
        let compareValue = 0
        
        switch (sortField) {
          case 'candidate':
            compareValue = (a.candidateName || '').localeCompare(b.candidateName || '', 'ja')
            break
          case 'job':
            compareValue = (a.jobTitle || '').localeCompare(b.jobTitle || '', 'ja')
            break
          case 'company':
            compareValue = (a.companyName || '').localeCompare(b.companyName || '', 'ja')
            break
          case 'status':
            const statusPriority: Record<Match['status'], number> = {
              offer_accepted: 9,
              offer: 8,
              interview_passed: 7,
              interview: 6,
              document_passed: 5,
              document_screening: 4,
              applied: 3,
              suggested: 2,
              pending_proposal: 1,
              withdrawn: 0,
              rejected: 0
            }
            compareValue = statusPriority[a.status] - statusPriority[b.status]
            break
          case 'interviewDate':
            const dateA = a.interviewDate ? (a.interviewDate instanceof Date ? a.interviewDate : new Date(a.interviewDate)).getTime() : 0
            const dateB = b.interviewDate ? (b.interviewDate instanceof Date ? b.interviewDate : new Date(b.interviewDate)).getTime() : 0
            compareValue = dateA - dateB
            break
          case 'updatedAt':
            const updatedA = a.updatedAt ? (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).getTime() : 0
            const updatedB = b.updatedAt ? (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)).getTime() : 0
            compareValue = updatedA - updatedB
            break
        }
        
        return sortDirection === 'asc' ? compareValue : -compareValue
      })
    }

    // 総件数を更新
    setTotalItems(filtered.length)
    
    // ページネーション適用
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedMatches = filtered.slice(startIndex, endIndex)

    setFilteredMatches(paginatedMatches)
  }

  const handleCreateMatch = async () => {
    try {
      if (!newMatchData.candidateId) {
        alert('求職者を選択してください')
        return
      }

      // 複数求人が選択されている場合
      if (newMatchData.jobIds.length > 0) {
        let successCount = 0
        let errorCount = 0

        for (const jobId of newMatchData.jobIds) {
          try {
            const selectedJob = jobs.find(j => j.id === jobId)
            if (!selectedJob) continue

            const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
              candidateId: newMatchData.candidateId,
              jobId: jobId,
              companyId: selectedJob.companyId,
              status: 'pending_proposal',
              score: newMatchData.score,
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

        alert(`${successCount}件のマッチングを作成しました${errorCount > 0 ? `（${errorCount}件失敗）` : ''}`)
      } 
      // 単一求人が選択されている場合（後方互換性）
      else if (newMatchData.jobId) {
        const selectedJob = jobs.find(j => j.id === newMatchData.jobId)
        if (!selectedJob) {
          alert('選択された求人が見つかりません')
          return
        }

        const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
          candidateId: newMatchData.candidateId,
          jobId: newMatchData.jobId,
          companyId: selectedJob.companyId,
          status: 'pending_proposal',
          score: newMatchData.score,
          matchReasons: [{
            type: 'manual',
            description: '手動でマッチングを作成',
            weight: 1.0
          }],
          timeline: [{
            id: `timeline_${Date.now()}`,
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
        alert('マッチングを作成しました')
      } else {
        alert('求人を選択してください')
        return
      }

      await loadData() // Reload data
      
      setCreateMatchOpen(false)
      setNewMatchData({ candidateId: '', jobId: '', jobIds: [], score: 50, notes: '' })
    } catch (error) {
      console.error('マッチング作成エラー:', error)
      alert('マッチングの作成に失敗しました')
    }
  }

  const handleStatusUpdate = async (status: Match['status'], notes: string, eventDateTime?: Date, startDate?: Date, endDate?: Date) => {
    if (!selectedMatch) return

    try {
      await updateMatchStatus(
        selectedMatch.id,
        status,
        '',
        user?.uid || '',
        notes || undefined,
        eventDateTime,
        undefined,
        startDate,
        endDate
      )
      
      await loadData() // Reload data
      
      // 面接ステータスで日時が設定されている場合、自動的にGoogleカレンダーを開く
      if (status === 'interview' && eventDateTime) {
        const candidate = candidates.find(c => c.id === selectedMatch.candidateId)
        const job = jobs.find(j => j.id === selectedMatch.jobId)
        const company = companies.find(c => c.id === job?.companyId)
        
        // 複数店舗対応: storeIds優先、storeIdは後方互換性のため
        let store: Store | undefined
        if (job?.storeIds && job.storeIds.length > 0) {
          store = stores.find(s => s.id === job.storeIds?.[0])
        } else if (job?.storeId) {
          store = stores.find(s => s.id === job.storeId)
        }
        
        if (candidate && company) {
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
          alert('ステータスを更新しました。\n\nGoogleカレンダーが別タブで開きます。')
        }
      } else {
        alert('ステータスを更新しました')
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (selectedMatchIds.size === 0) return

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

      // 全ての選択された進捗を更新
      await Promise.all(
        Array.from(selectedMatchIds).map(matchId =>
          updateMatchStatus(
            matchId,
            newStatus,
            '',
            user?.uid || '',
            statusNotes || undefined,
            combinedDateTime
          )
        )
      )
      
      await loadData() // Reload data
      
      const updateCount = selectedMatchIds.size
      
      // 面接ステータスで日時が設定されている場合、自動的にGoogleカレンダーを開く
      if (newStatus === 'interview' && combinedDateTime) {
        const selectedMatches = matches.filter(m => selectedMatchIds.has(m.id))
        
        if (selectedMatches.length === 1) {
          // 1件の場合は自動的にカレンダーを開く
          const match = selectedMatches[0]
          const candidate = candidates.find(c => c.id === match.candidateId)
          const job = jobs.find(j => j.id === match.jobId)
          const company = companies.find(c => c.id === job?.companyId)
          
          // 複数店舗対応: storeIds優先、storeIdは後方互換性のため
          let store: Store | undefined
          if (job?.storeIds && job.storeIds.length > 0) {
            store = stores.find(s => s.id === job.storeIds?.[0])
          } else if (job?.storeId) {
            store = stores.find(s => s.id === job.storeId)
          }
          
          if (candidate && company) {
            const candidateName = `${candidate.lastName} ${candidate.firstName}`
            const endTime = new Date(combinedDateTime.getTime() + 60 * 60000)
            
            // カレンダーIDは環境変数から取得
            const calendarId = process.env.NEXT_PUBLIC_DEFAULT_CALENDAR_ID
            
            const calendarUrl = generateGoogleCalendarUrl(
              `面接: ${candidateName} - ${company.name}`,
              combinedDateTime,
              endTime,
              `【求職者】${candidateName}\n【企業】${company.name}\n【職種】${job?.title || ''}\n\n${statusNotes || ''}`.trim(),
              store?.address || company.address,
              calendarId
            )
            
            window.open(calendarUrl, '_blank')
            alert(`${updateCount}件の進捗を更新しました。\n\nGoogleカレンダーが別タブで開きます。`)
          }
        } else {
          // 複数件の場合は通知のみ
          alert(`${updateCount}件の進捗を更新しました。\n\n複数の面接予定は個別に登録してください。`)
        }
      } else {
        alert(`${updateCount}件の進捗を更新しました`)
      }
      
      setBulkStatusUpdateOpen(false)
      setSelectedMatchIds(new Set())
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
    } catch (error) {
      console.error('一括ステータス更新エラー:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMatchIds.size === 0) return

    try {
      const deletePromises = Array.from(selectedMatchIds).map(id => deleteMatch(id))
      await Promise.all(deletePromises)
      
      await loadData() // Reload data
      
      setBulkDeleteDialogOpen(false)
      setSelectedMatchIds(new Set())
      alert(`${deletePromises.length}件の進捗を削除しました`)
    } catch (error) {
      console.error('一括削除エラー:', error)
      alert('進捗の削除に失敗しました')
    }
  }

  const toggleSelectMatch = (matchId: string) => {
    setSelectedMatchIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(matchId)) {
        newSet.delete(matchId)
      } else {
        newSet.add(matchId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedMatchIds.size === filteredMatches.length) {
      setSelectedMatchIds(new Set())
    } else {
      setSelectedMatchIds(new Set(filteredMatches.map(m => m.id)))
    }
  }

  // 選択された進捗が全て同じステータスかチェック
  const getSelectedMatchesStatus = (): Match['status'] | null => {
    if (selectedMatchIds.size === 0) return null
    
    const selectedMatches = matches.filter(m => selectedMatchIds.has(m.id))
    const firstStatus = selectedMatches[0]?.status
    
    const allSameStatus = selectedMatches.every(m => m.status === firstStatus)
    return allSameStatus ? firstStatus : null
  }

  // インライン編集の開始
  const handleStartDateEdit = (matchId: string, field: 'startDate' | 'endDate', currentValue?: string | Date) => {
    setEditingDateField({ matchId, field })
    if (currentValue) {
      const dateObj = new Date(currentValue)
      if (!isNaN(dateObj.getTime())) {
        setEditingDateValue(dateObj.toISOString().split('T')[0])
      } else {
        setEditingDateValue('')
      }
    } else {
      setEditingDateValue('')
    }
  }

  // インライン編集の保存
  const handleSaveDateEdit = async (matchId: string, field: 'startDate' | 'endDate') => {
    try {
      const { updateMatch } = await import('@/lib/firestore/matches')
      const updateData: any = {}
      
      if (editingDateValue) {
        updateData[field] = new Date(editingDateValue)
      } else {
        updateData[field] = null
      }
      
      await updateMatch(matchId, updateData)
      toast.success(`${field === 'startDate' ? '入社日' : '退職日'}を更新しました`)
      setEditingDateField(null)
      setEditingDateValue('')
      loadData(true) // データを再読み込み
    } catch (error) {
      console.error('Error updating date:', error)
      toast.error(`${field === 'startDate' ? '入社日' : '退職日'}の更新に失敗しました`)
    }
  }

  // インライン編集のキャンセル
  const handleCancelDateEdit = () => {
    setEditingDateField(null)
    setEditingDateValue('')
  }

  // 一括ステータス更新を開く
  const openBulkStatusUpdate = () => {
    const commonStatus = getSelectedMatchesStatus()
    if (!commonStatus) {
      alert('選択された進捗のステータスが異なるため、一括更新できません')
      return
    }

    const nextStatuses = statusFlow[commonStatus]
    if (nextStatuses.length === 0) {
      alert('このステータスから進められる次のステータスがありません')
      return
    }

    // デフォルトで最初の次ステータスを設定
    setNewStatus(nextStatuses[0])
    setEventDate('')
    setEventTime('')
    setStatusNotes('')
    setBulkStatusUpdateOpen(true)
  }

  const handleJobSelect = (jobId: string) => {
    setNewMatchData(prev => {
      const isSelected = prev.jobIds.includes(jobId)
      if (isSelected) {
        // 既に選択されている場合は削除
        return { ...prev, jobIds: prev.jobIds.filter(id => id !== jobId) }
      } else {
        // 選択されていない場合は追加
        return { ...prev, jobIds: [...prev.jobIds, jobId] }
      }
    })
  }

  const handleJobSelectComplete = () => {
    setJobSelectModalOpen(false)
    setJobSearchTerm('')
  }

  const handleCandidateSelect = (candidateId: string) => {
    setNewMatchData(prev => ({ ...prev, candidateId }))
    setCandidateSelectModalOpen(false)
    setCandidateSearchTerm('')
  }

  const getFilteredJobs = () => {
    return jobs.filter(job => {
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

  const getFilteredCandidates = () => {
    return candidates.filter(candidate => {
      const searchText = `${candidate.firstName} ${candidate.lastName} ${candidate.firstNameKana} ${candidate.lastNameKana} ${candidate.email || ''}`.toLowerCase()
      return searchText.includes(candidateSearchTerm.toLowerCase())
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

  const getSelectedCandidateDisplay = () => {
    if (!newMatchData.candidateId) return '求職者を選択'
    const candidate = candidates.find(c => c.id === newMatchData.candidateId)
    return candidate ? `${candidate.lastName} ${candidate.firstName}` : '求職者を選択'
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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // 同じフィールドをクリックした場合は昇順・降順を切り替え
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 新しいフィールドの場合は昇順から開始
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600">進捗データを読み込み中...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
        <div className="container mx-auto py-8 px-4">
          <ProgressHeader
            selectedMatchIds={selectedMatchIds}
            isAdmin={isAdmin}
            openBulkStatusUpdate={openBulkStatusUpdate}
            getSelectedMatchesStatus={getSelectedMatchesStatus}
            setBulkDeleteDialogOpen={setBulkDeleteDialogOpen}
            loadData={loadData}
            createMatchOpen={createMatchOpen}
            setCreateMatchOpen={setCreateMatchOpen}
            setNewMatchData={setNewMatchData}
            newMatchData={newMatchData}
            getSelectedCandidateDisplay={getSelectedCandidateDisplay}
            setCandidateSelectModalOpen={setCandidateSelectModalOpen}
            getSelectedJobDisplay={getSelectedJobDisplay}
            setJobSelectModalOpen={setJobSelectModalOpen}
            jobs={jobs}
            companies={companies}
            stores={stores}
            handleJobSelect={handleJobSelect}
            handleCreateMatch={handleCreateMatch}
          />

          {/* タブナビゲーション */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('progress')
                router.push('/progress')
              }}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'progress'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              進捗一覧
            </button>
            <button
              onClick={() => {
                setActiveTab('accepted')
                router.push('/progress?tab=accepted')
              }}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'accepted'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              内定承諾者一覧
            </button>
          </div>

          {activeTab === 'progress' && (
            <>
          <ProgressFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusFilterOpen={statusFilterOpen}
            setStatusFilterOpen={setStatusFilterOpen}
            showOverdueOnly={showOverdueOnly}
            setShowOverdueOnly={setShowOverdueOnly}
          />

          <ProgressTable
            filteredMatches={filteredMatches}
            candidates={candidates}
            users={users}
            selectedMatchIds={selectedMatchIds}
            toggleSelectAll={toggleSelectAll}
            toggleSelectMatch={toggleSelectMatch}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
            calculateAge={calculateAge}
            setSelectedMatch={setSelectedMatch}
            setNewStatus={setNewStatus}
            setEventDate={setEventDate}
            setStatusUpdateOpen={setStatusUpdateOpen}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalItems={totalItems}
            setCurrentPage={setCurrentPage}
            setItemsPerPage={setItemsPerPage}
          />

          {/* ステータス更新ダイアログ */}
          <StatusUpdateDialog
            open={statusUpdateOpen}
            onOpenChange={setStatusUpdateOpen}
            match={selectedMatch}
            candidateName={selectedMatch?.candidateName || ''}
            onUpdate={handleStatusUpdate}
            isEditMode={true}
            candidate={selectedMatch ? (() => {
              const c = candidates.find(cand => cand.id === selectedMatch.candidateId)
              return c ? {
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                phone: c.phone,
                email: c.email,
                resume: c.teacherComment,
                dateOfBirth: c.dateOfBirth,
                resumeUrl: c.resumeUrl,
                enrollmentDate: c.enrollmentDate,
                campus: c.campus
              } : undefined
            })() : undefined}
            job={selectedMatch ? jobs.find(j => j.id === selectedMatch.jobId) : undefined}
            company={selectedMatch ? (() => {
              const job = jobs.find(j => j.id === selectedMatch.jobId)
              return job ? companies.find(c => c.id === job.companyId) : undefined
            })() : undefined}
            userName={user?.displayName || user?.email || ''}
          />

          {/* 一括ステータス更新ダイアログ */}
          <Dialog open={bulkStatusUpdateOpen} onOpenChange={setBulkStatusUpdateOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>一括ステータス更新</DialogTitle>
                <DialogDescription>
                  選択した {selectedMatchIds.size} 件の進捗を次のステータスに更新します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* 現在のステータス表示 */}
                {getSelectedMatchesStatus() && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">現在のステータス</p>
                    <Badge className={`${statusColors[getSelectedMatchesStatus()!]} px-3 py-1 flex items-center gap-2 w-fit`}>
                      {React.createElement(statusIcons[getSelectedMatchesStatus()!], { className: "h-4 w-4" })}
                      {statusLabels[getSelectedMatchesStatus()!]}
                    </Badge>
                  </div>
                )}

                {/* 次のステータス選択 */}
                <div>
                  <Label className="text-base font-medium mb-3 block">次のステータスを選択</Label>
                  {getSelectedMatchesStatus() && statusFlow[getSelectedMatchesStatus()!].length > 0 ? (
                    <div className="space-y-2">
                      {/* 通常の進捗フロー */}
                      {statusFlow[getSelectedMatchesStatus()!].filter(s => !['offer', 'rejected', 'withdrawn'].includes(s)).length > 0 && (
                        <div className="space-y-2">
                          {statusFlow[getSelectedMatchesStatus()!].filter(s => !['offer', 'rejected', 'withdrawn'].includes(s)).map((status) => {
                            const Icon = statusIcons[status]
                            return (
                              <Button
                                key={status}
                                variant={newStatus === status ? "default" : "outline"}
                                className={`w-full justify-start gap-3 h-auto py-3 ${
                                  newStatus === status ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''
                                }`}
                                onClick={() => setNewStatus(status)}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{statusLabels[status]}</span>
                              </Button>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* 終了ステータス（内定・不採用・辞退） */}
                      {statusFlow[getSelectedMatchesStatus()!].some(s => ['offer', 'rejected', 'withdrawn'].includes(s)) && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-600 mb-2">または終了ステータス</p>
                          <div className="grid grid-cols-3 gap-2">
                            {statusFlow[getSelectedMatchesStatus()!].filter(s => ['offer', 'rejected', 'withdrawn'].includes(s)).map((status) => {
                              const Icon = statusIcons[status]
                              return (
                                <Button
                                  key={status}
                                  variant={newStatus === status ? "default" : "outline"}
                                  className={`justify-start gap-2 h-auto py-3 ${
                                    newStatus === status ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''
                                  }`}
                                  onClick={() => setNewStatus(status)}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="text-sm">{statusLabels[status]}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">次に進められるステータスがありません</p>
                  )}
                </div>

                {/* 日時入力（応募済み以外） */}
                {newStatus !== 'applied' && ['document_screening', 'document_passed', 'interview', 'interview_passed', 'offer', 'offer_accepted'].includes(newStatus) && (
                  <div>
                    <Label className="text-base font-medium mb-2 block">イベント日時</Label>
                    <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="bulkStatusNotes">備考</Label>
                  <Textarea
                    id="bulkStatusNotes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="全ての進捗に共通のメモを記入してください"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkStatusUpdateOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleBulkStatusUpdate}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {selectedMatchIds.size}件を更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 一括削除確認ダイアログ */}
          <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>一括削除の確認</DialogTitle>
                <DialogDescription>
                  選択した {selectedMatchIds.size} 件の進捗を削除してもよろしいですか？この操作は取り消せません。
                </DialogDescription>
              </DialogHeader>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      注意: この操作は取り消せません
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {selectedMatchIds.size} 件のマッチング進捗が完全に削除されます。
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkDeleteDialogOpen(false)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {selectedMatchIds.size}件を削除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
          )}

          {activeTab === 'accepted' && (
            <AcceptedMatchesTable
              matches={matches}
              candidates={candidates}
              users={users}
              editingDateField={editingDateField}
              editingDateValue={editingDateValue}
              setEditingDateValue={setEditingDateValue}
              handleSaveDateEdit={handleSaveDateEdit}
              handleCancelDateEdit={handleCancelDateEdit}
              handleStartDateEdit={handleStartDateEdit}
            />
          )}

          <JobSelectDialog
            open={jobSelectModalOpen}
            onOpenChange={setJobSelectModalOpen}
            jobSearchTerm={jobSearchTerm}
            setJobSearchTerm={setJobSearchTerm}
            getFilteredJobs={getFilteredJobs}
            newMatchData={newMatchData}
            handleJobSelect={handleJobSelect}
            handleJobSelectComplete={handleJobSelectComplete}
            companies={companies}
            stores={stores}
          />

          <CandidateSelectDialog
            open={candidateSelectModalOpen}
            onOpenChange={setCandidateSelectModalOpen}
            candidateSearchTerm={candidateSearchTerm}
            setCandidateSearchTerm={setCandidateSearchTerm}
            getFilteredCandidates={getFilteredCandidates}
            newMatchData={newMatchData}
            handleCandidateSelect={handleCandidateSelect}
            calculateAge={calculateAge}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function ProgressPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-orange-600">読み込み中...</div>
      </div>
    }>
      <ProgressPageContent />
    </Suspense>
  )
}