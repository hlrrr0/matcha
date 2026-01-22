"use client"

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCache, setCache, generateCacheKey } from '@/lib/utils/cache'
import { 
  TrendingUp, 
  Plus, 
  Search, 
  RefreshCw,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Edit,
  Eye,
  Briefcase,
  Users,
  Trash2,
  ArrowRight,
  Target,
  MessageSquare,
  Calendar,
  Star,
  XCircle,
  FileText,
  ChevronDown
} from 'lucide-react'
import { Match } from '@/types/matching'
import { Candidate, campusLabels } from '@/types/candidate'
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

interface MatchWithDetails extends Match {
  candidateName?: string
  jobTitle?: string
  jobEmploymentType?: string
  companyName?: string
  storeName?: string
  storeId?: string
  candidateAssignedUserId?: string
  companyAssignedUserId?: string
}

const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200',
  taiwan: 'bg-red-100 text-red-800 border-red-200'
}

// ステータスラベル定義
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
  
  // デフォルトで「辞退」と「不合格」を除外
  const [statusFilter, setStatusFilter] = useState<Set<Match['status']>>(new Set([
    'suggested', 
    'applied', 
    'document_screening', 
    'document_passed', 
    'interview', 
    'interview_passed', 
    'offer', 
    'offer_accepted'
  ]))
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  
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
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
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

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  useEffect(() => {
    filterMatches()
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1)
  }, [matches, searchTerm, statusFilter, companyFilter, sortField, sortDirection])

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
        const store = storesData.find(s => s.id === job?.storeId)

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

      // 更新日の降順にソート
      matchesWithDetails.sort((a, b) => {
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
            eventDate: t.eventDate && typeof t.eventDate === 'object' && 'toDate' in t.eventDate 
              ? t.eventDate.toDate().toISOString() 
              : t.eventDate
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
              withdrawn: 1,
              rejected: 1
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
          status: 'suggested',
          score: newMatchData.score,
          matchReasons: [{
            type: 'manual',
            description: '手動でマッチングを作成',
            weight: 1.0
          }],
          timeline: [{
            id: `timeline_${Date.now()}`,
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
        const store = stores.find(s => s.id === job?.storeId)
        
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
          const store = stores.find(s => s.id === job?.storeId)
          
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

  const getStatusIcon = (status: Match['status']) => {
    switch (status) {
      case 'suggested': return <Clock className="h-4 w-4" />
      case 'applied': return <Send className="h-4 w-4" />
      case 'document_screening': return <Eye className="h-4 w-4" />
      case 'document_passed': return <CheckCircle className="h-4 w-4" />
      case 'interview': return <Users className="h-4 w-4" />
      case 'interview_passed': return <CheckCircle className="h-4 w-4" />
      case 'offer': return <Briefcase className="h-4 w-4" />
      case 'offer_accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <AlertCircle className="h-4 w-4" />
      case 'withdrawn': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Match['status']) => {
    switch (status) {
      case 'suggested': return 'bg-gray-100 text-gray-800'
      case 'applied': return 'bg-blue-100 text-blue-800'
      case 'document_screening': return 'bg-yellow-100 text-yellow-800'
      case 'document_passed': return 'bg-green-100 text-green-800'
      case 'interview': return 'bg-purple-100 text-purple-800'
      case 'interview_passed': return 'bg-emerald-100 text-emerald-800'
      case 'offer': return 'bg-orange-100 text-orange-800'
      case 'offer_accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Match['status']) => {
    switch (status) {
      case 'suggested': return '提案済み'
      case 'applied': return '応募済み'
      case 'document_screening': return '書類選考中'
      case 'document_passed': return '書類選考通過'
      case 'interview': return '面接'
      case 'interview_passed': return '面接通過'
      case 'offer': return '内定'
      case 'offer_accepted': return '内定承諾'
      case 'rejected': return '不採用'
      case 'withdrawn': return '辞退'
      default: return status
    }
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
          {/* ヘッダー */}
          <div className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white">
            <div className="flex justify-between items-center gap-4">
              {/* タイトル部分 */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-full">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold">進捗管理</h1>
                  <p className="text-orange-100 text-xs sm:text-sm">求職者と求人のマッチング状況を管理</p>
                </div>
              </div>
              
              {/* ヘッダーアクション */}
              <div className="flex flex-wrap gap-2">
                {selectedMatchIds.size > 0 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openBulkStatusUpdate}
                      disabled={getSelectedMatchesStatus() === null}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">一括で進捗更新 ({selectedMatchIds.size})</span>
                      <span className="sm:hidden">進捗更新 ({selectedMatchIds.size})</span>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">削除 ({selectedMatchIds.size})</span>
                        <span className="sm:hidden">削除 ({selectedMatchIds.size})</span>
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadData(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
                  title="キャッシュをクリアして最新データを取得"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">更新</span>
                </Button>
                <Dialog open={createMatchOpen} onOpenChange={(open) => {
                  setCreateMatchOpen(open)
                  if (!open) {
                    // ダイアログを閉じる時に選択をクリア
                    setNewMatchData({ candidateId: '', jobId: '', jobIds: [], score: 50, notes: '' })
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">新規マッチング</span>
                      <span className="sm:hidden">新規</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>新規マッチング作成</DialogTitle>
                      <DialogDescription>
                        求職者と求人をマッチングします
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="candidate">求職者</Label>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => setCandidateSelectModalOpen(true)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {getSelectedCandidateDisplay()}
                        </Button>
                      </div>
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
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {newMatchData.jobIds.map((jobId) => {
                              const job = jobs.find(j => j.id === jobId)
                              const company = companies.find(c => c.id === job?.companyId)
                              const store = stores.find(s => s.id === job?.storeId)
                              return (
                                <div key={jobId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{job?.title}</div>
                                    <div className="text-xs text-gray-600 truncate">
                                      {company?.name}
                                      {store && (
                                        <span className="ml-1">
                                          - {store.name}
                                          {store.prefecture && `【${store.prefecture}】`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-2"
                                    onClick={() => handleJobSelect(jobId)}
                                  >
                                    <Trash2 className="h-3 w-3" />
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
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        作成
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

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
          {/* フィルター */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-orange-800">検索とフィルター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                <div className="flex-1">
                  <Label htmlFor="progress-search">求職者名・職種・企業名</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="progress-search"
                      placeholder="求職者名、職種、企業名で検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {/* ステータスフィルタープリセットボタン */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">クイックフィルター</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setStatusFilter(new Set([
                          'suggested',
                          'applied',
                          'document_screening',
                          'document_passed',
                          'interview',
                          'interview_passed',
                          'offer',
                          'offer_accepted',
                          'rejected',
                          'withdrawn'
                        ]))
                      }}
                    >
                      全選択
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setStatusFilter(new Set([
                          'applied',
                          'document_screening',
                          'document_passed',
                          'interview',
                          'interview_passed',
                          'offer'
                        ]))
                      }}
                    >
                      進捗中
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setStatusFilter(new Set([
                          'document_passed',
                          'interview_passed'
                        ]))
                      }}
                    >
                      日程調整中
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilterOpen(!statusFilterOpen)}
                    className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Label className="cursor-pointer">ステータスフィルター</Label>
                      <Badge variant="secondary" className="text-xs">
                        {statusFilter.size}/10
                      </Badge>
                    </div>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {statusFilterOpen && (
                    <div className="space-y-2 border rounded-md p-3 max-h-[300px] overflow-y-auto bg-background">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="status-all"
                          checked={statusFilter.size === 10}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter(new Set([
                                'suggested',
                                'applied',
                                'document_screening',
                                'document_passed',
                                'interview',
                                'interview_passed',
                                'offer',
                                'offer_accepted',
                                'rejected',
                                'withdrawn'
                              ]))
                            } else {
                              setStatusFilter(new Set())
                            }
                          }}
                        />
                        <label
                          htmlFor="status-all"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          すべて
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {[
                          { value: 'suggested', label: '提案済み' },
                          { value: 'applied', label: '応募済み' },
                          { value: 'document_screening', label: '書類選考中' },
                          { value: 'document_passed', label: '書類選考通過' },
                          { value: 'interview', label: '面接' },
                          { value: 'interview_passed', label: '面接通過' },
                          { value: 'offer', label: '内定' },
                          { value: 'offer_accepted', label: '内定承諾' },
                          { value: 'rejected', label: '不合格' },
                          { value: 'withdrawn', label: '辞退' }
                        ].map((status) => {
                          const isNegativeStatus = status.value === 'rejected' || status.value === 'withdrawn'
                          return (
                            <div key={status.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status.value}`}
                                checked={statusFilter.has(status.value as Match['status'])}
                                onCheckedChange={(checked) => {
                                  const newFilter = new Set(statusFilter)
                                  if (checked) {
                                    newFilter.add(status.value as Match['status'])
                                  } else {
                                    newFilter.delete(status.value as Match['status'])
                                  }
                                  setStatusFilter(newFilter)
                                }}
                              />
                              <label
                                htmlFor={`status-${status.value}`}
                                className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${
                                  isNegativeStatus ? 'text-muted-foreground' : ''
                                }`}
                              >
                                {status.label}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* マッチングテーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-800">マッチング進捗一覧</CardTitle>
              <CardDescription>
                {filteredMatches.length} 件のマッチング
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedMatchIds.size === filteredMatches.length && filteredMatches.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('candidate')}
                      >
                        <div className="flex items-center gap-1">
                          求職者 {getSortIcon('candidate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('job')}
                      >
                        <div className="flex items-center gap-1">
                          職種 {getSortIcon('job')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('company')}
                      >
                        <div className="flex items-center gap-1">
                          企業 {getSortIcon('company')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          ステータス {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('interviewDate')}
                      >
                        <div className="flex items-center gap-1">
                          面接日時 {getSortIcon('interviewDate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          更新日 {getSortIcon('updatedAt')}
                        </div>
                      </TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          マッチングデータがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMatches.map((match) => {
                        const candidate = candidates.find(c => c.id === match.candidateId)
                        const age = candidate?.dateOfBirth ? calculateAge(candidate.dateOfBirth) : null
                        
                        // 背景色の設定
                        let rowBgClass = ""
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
                              onCheckedChange={() => toggleSelectMatch(match.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-2">
                              {match.candidateAssignedUserId ? (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={users.find(u => u.id === match.candidateAssignedUserId)?.photoURL} />
                                  <AvatarFallback className="text-xs bg-green-100">
                                    {users.find(u => u.id === match.candidateAssignedUserId)?.displayName?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null}
                              <div>
                                <div>
                                  <Link 
                                    href={`/candidates/${match.candidateId}`}
                                    className="hover:underline text-blue-600 hover:text-blue-800"
                                  >
                                    {match.candidateName}
                                  </Link>
                                  {age !== null && (
                                    <>
                                      （{age}歳）
                                    </>
                                  )}
                                </div>
                                {candidate?.assignedUserId && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    担当者：{users.find(u => u.id === candidate.assignedUserId)?.displayName || '担当者不明'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Link 
                                href={`/jobs/${match.jobId}`}
                                className="hover:underline text-blue-600 hover:text-blue-800"
                              >
                                {match.jobTitle}
                              </Link>
                              {match.jobEmploymentType && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {match.jobEmploymentType}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              {match.companyAssignedUserId ? (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={users.find(u => u.id === match.companyAssignedUserId)?.photoURL} />
                                  <AvatarFallback className="text-xs bg-blue-100">
                                    {users.find(u => u.id === match.companyAssignedUserId)?.displayName?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null}
                              <div>
                                <Link 
                                  href={`/companies/${match.companyId}`}
                                  className="hover:underline text-blue-600 hover:text-blue-800"
                                >
                                  {match.companyName}
                                </Link><br></br>
                                {match.storeId ? (
                                  <Link 
                                    href={`/stores/${match.storeId}`}
                                    className="hover:underline text-blue-600 hover:text-blue-800 text-xs text-gray-500 mt-1"
                                  >
                                    {match.storeName}
                                  </Link>
                                ) : (
                                  <span className="text-xs text-gray-500 mt-1">{match.storeName}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(match.status)} border-0`}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(match.status)}
                                {getStatusLabel(match.status)}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // timelineから面接日時を取得
                              let interviewDate: Date | null = null
                              
                              // timelineから面接ステータスのeventDateを探す
                              if (match.timeline && match.timeline.length > 0) {
                                // 面接ステータスのタイムラインを日付順にソート（新しい順）
                                const interviewTimelines = match.timeline
                                  .filter(t => t.status === 'interview' && t.eventDate)
                                  .sort((a, b) => {
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
                                    console.error('面接日時の変換エラー:', e)
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
                            {match.updatedAt && typeof match.updatedAt === 'object' && match.updatedAt instanceof Date
                              ? match.updatedAt.toLocaleDateString()
                              : match.updatedAt && typeof match.updatedAt === 'string'
                              ? new Date(match.updatedAt).toLocaleDateString()
                              : '不明'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                                title="詳細を見る"
                              >
                                <Link href={`/progress/${match.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {statusFlow[match.status].length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMatch(match)
                                    const nextStatuses = statusFlow[match.status]
                                    if (nextStatuses.length > 0) {
                                      setNewStatus(nextStatuses[0])
                                      setEventDate('')
                                    }
                                    setStatusUpdateOpen(true)
                                  }}
                                  className="h-8 px-2"
                                >
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  <span className="text-xs">次へ</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* ページネーション */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700">
                      {totalItems}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)}件を表示
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={20}>20件</option>
                      <option value={50}>50件</option>
                      <option value={100}>100件</option>
                      <option value={200}>200件</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      最初
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      前へ
                    </Button>
                    <span className="text-sm px-4">
                      {currentPage} / {Math.ceil(totalItems / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                    >
                      次へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                    >
                      最後
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                    <Badge className={`${getStatusColor(getSelectedMatchesStatus()!)} px-3 py-1 flex items-center gap-2 w-fit`}>
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

          {/* 内定承諾者一覧タブ */}
          {activeTab === 'accepted' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-800">内定承諾者一覧</CardTitle>
                <CardDescription>
                  内定を承諾した求職者の店舗名と入社日を管理します
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>求職者名</TableHead>
                      <TableHead>店舗名</TableHead>
                      <TableHead>企業名</TableHead>
                      <TableHead>入社日</TableHead>
                      <TableHead>退職日</TableHead>
                      <TableHead>担当者</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead>進捗詳細</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches
                      .filter(match => match.status === 'offer_accepted')
                      .sort((a, b) => {
                        // 入社日でソート（新しい順）
                        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
                        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
                        return dateB - dateA
                      })
                      .map(match => {
                        const candidate = candidates.find(c => c.id === match.candidateId)
                        const assignedUser = users.find(u => u.id === match.candidateAssignedUserId)
                        
                        return (
                          <TableRow key={match.id}>
                            <TableCell className="font-medium">
                              <Link 
                                href={`/candidates/${match.candidateId}`}
                                className="text-blue-600 hover:underline"
                              >
                                {match.candidateName}
                              </Link>
                              {candidate?.campus && (
                                <Badge 
                                  variant="outline" 
                                  className={`ml-2 text-xs ${campusColors[candidate.campus]}`}
                                >
                                  {campusLabels[candidate.campus]}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {match.storeName ? (
                                <Link 
                                  href={`/stores/${match.storeId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {match.storeName}
                                </Link>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {match.companyName ? (
                                <Link 
                                  href={`/companies/${match.companyId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {match.companyName}
                                </Link>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {match.startDate ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  {new Date(match.startDate).toLocaleDateString('ja-JP')}
                                </div>
                              ) : (
                                <span className="text-gray-400">未設定</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {match.endDate ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  {new Date(match.endDate).toLocaleDateString('ja-JP')}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {assignedUser ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignedUser.photoURL} />
                                    <AvatarFallback className="text-xs">
                                      {assignedUser.displayName?.charAt(0) || assignedUser.email?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{assignedUser.displayName || assignedUser.email}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">未割当</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {match.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <Link 
                                href={`/progress/${match.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  詳細
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    {matches.filter(match => match.status === 'offer_accepted').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          内定承諾者はまだいません
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

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
                      const store = stores.find(s => s.id === job.storeId)
                      const isSelected = newMatchData.jobIds.includes(job.id)
                      
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
                              <h4 className="font-medium text-lg">{job.title}</h4>
                              <p className="text-gray-600 text-sm mt-1">
                                {company?.name || '企業名不明'}
                                {store && (
                                  <span className="ml-2">
                                    - {store.name}
                                    {store.prefecture && `【${store.prefecture}】`}
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

          {/* 求職者選択モーダル */}
          <Dialog open={candidateSelectModalOpen} onOpenChange={setCandidateSelectModalOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>求職者を選択</DialogTitle>
                <DialogDescription>
                  マッチングを作成する求職者を選択してください
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {/* 検索フィールド */}
                <div>
                  <Label htmlFor="candidate-dialog-search">検索</Label>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      id="candidate-dialog-search"
                      placeholder="氏名、カナ、メールアドレスで検索..."
                      value={candidateSearchTerm}
                      onChange={(e) => setCandidateSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* 求職者リスト */}
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <div className="space-y-2 p-4">
                    {getFilteredCandidates().map((candidate) => {
                      const isSelected = newMatchData.candidateId === candidate.id
                      const age = calculateAge(candidate.dateOfBirth)
                      
                      return (
                        <div
                          key={candidate.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                            isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                          }`}
                          onClick={() => handleCandidateSelect(candidate.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-lg">
                                  {candidate.lastName} {candidate.firstName}
                                </h4>
                                {age !== null && (
                                  <span className="text-sm text-gray-600">
                                    （{age}歳）
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm mt-1">
                                {candidate.lastNameKana} {candidate.firstNameKana}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                {candidate.enrollmentDate && (
                                  <span className="text-xs text-gray-600">
                                    📅 入学: {new Date(candidate.enrollmentDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                                  </span>
                                )}
                                {candidate.campus && (
                                  <Badge className={`${campusColors[candidate.campus]} border text-xs font-medium`}>
                                    {campusLabels[candidate.campus]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-5 w-5 text-orange-500 mt-1" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {getFilteredCandidates().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {candidateSearchTerm ? '検索条件に一致する求職者が見つかりません' : '求職者がいません'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCandidateSelectModalOpen(false)
                    setCandidateSearchTerm('')
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    setCandidateSelectModalOpen(false)
                    setCandidateSearchTerm('')
                  }}
                  disabled={!newMatchData.candidateId}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  選択
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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