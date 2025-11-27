"use client"

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'

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
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200'
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
  rejected: '不採用',
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
  const searchParams = useSearchParams()
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [filteredMatches, setFilteredMatches] = useState<MatchWithDetails[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
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

  // Dialog states
  const [createMatchOpen, setCreateMatchOpen] = useState(false)
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [bulkStatusUpdateOpen, setBulkStatusUpdateOpen] = useState(false)
  const [jobSelectModalOpen, setJobSelectModalOpen] = useState(false)
  const [candidateSelectModalOpen, setCandidateSelectModalOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
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
  }, [matches, searchTerm, statusFilter, companyFilter])

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

  const loadData = async () => {
    try {
      setLoading(true)
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
      console.log('  企業担当者設定数:', companiesData.filter(c => c.consultantId).length)
      console.log('  ユーザー数:', usersData.length)
      
      // 企業担当者の詳細
      const companiesWithAssigned = companiesData.filter(c => c.consultantId)
      if (companiesWithAssigned.length > 0) {
        console.log('✅ 担当者が設定されている企業:')
        companiesWithAssigned.forEach(c => {
          const user = usersData.find(u => u.id === c.consultantId)
          console.log(`  - ${c.name} → ${user?.displayName || user?.email || 'ユーザー不明'} (ID: ${c.consultantId})`)
        })
      } else {
        console.log('⚠️ 担当者が設定されている企業が見つかりません')
      }

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

        // デバッグ用ログ
        if (company?.consultantId) {
          console.log('企業担当者情報:', {
            companyName: company.name,
            consultantId: company.consultantId,
            user: usersData.find(u => u.id === company.consultantId)
          })
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

      // 更新日の降順にソート
      matchesWithDetails.sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt || 0)
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt || 0)
        return dateB.getTime() - dateA.getTime()
      })

      setMatches(matchesWithDetails)
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

    setFilteredMatches(filtered)
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

  const handleStatusUpdate = async () => {
    if (!selectedMatch) return

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
        user?.uid || '',
        statusNotes || undefined,
        combinedDateTime
      )
      
      await loadData() // Reload data
      
      setStatusUpdateOpen(false)
      setSelectedMatch(null)
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
      alert('ステータスを更新しました')
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
      
      setBulkStatusUpdateOpen(false)
      setSelectedMatchIds(new Set())
      setEventDate('')
      setEventTime('')
      setStatusNotes('')
      alert(`${selectedMatchIds.size}件の進捗を更新しました`)
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
      const store = stores.find(s => s.id === job.storeId)
      const searchText = `${job.title} ${company?.name || ''} ${store?.name || ''}`.toLowerCase()
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
          <div className="mb-8 p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">進捗管理</h1>
                  <p className="text-orange-100">求職者と求人のマッチング状況を管理</p>
                </div>
              </div>
              <div className="flex gap-4">
                {selectedMatchIds.size > 0 && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={openBulkStatusUpdate}
                      disabled={getSelectedMatchesStatus() === null}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      一括で進捗更新 ({selectedMatchIds.size})
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        選択中を削除 ({selectedMatchIds.size})
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="secondary"
                  onClick={() => loadData()}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  更新
                </Button>
                <Dialog open={createMatchOpen} onOpenChange={(open) => {
                  setCreateMatchOpen(open)
                  if (!open) {
                    // ダイアログを閉じる時に選択をクリア
                    setNewMatchData({ candidateId: '', jobId: '', jobIds: [], score: 50, notes: '' })
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <Plus className="h-4 w-4 mr-2" />
                      新規マッチング
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

          {/* フィルター */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-orange-800">検索とフィルター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
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
                      <TableHead>求職者</TableHead>
                      <TableHead>職種</TableHead>
                      <TableHead>企業</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>更新日</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          マッチングデータがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMatches.map((match) => {
                        const candidate = candidates.find(c => c.id === match.candidateId)
                        const age = candidate?.dateOfBirth ? calculateAge(candidate.dateOfBirth) : null
                        
                        return (
                        <TableRow key={match.id}>
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
            </CardContent>
          </Card>

          {/* ステータス更新ダイアログ */}
          <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>次の進捗へ</DialogTitle>
                <DialogDescription>
                  {selectedMatch?.candidateName} - {selectedMatch?.jobTitle}
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
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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