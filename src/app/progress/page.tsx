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
  Trash2
} from 'lucide-react'
import { Match } from '@/types/matching'
import { Candidate, campusLabels } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { getMatches, createMatch, updateMatchStatus, deleteMatch } from '@/lib/firestore/matches'
import { getCandidates } from '@/lib/firestore/candidates'
import { getJobs } from '@/lib/firestore/jobs'
import { getCompanies } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'

interface MatchWithDetails extends Match {
  candidateName?: string
  jobTitle?: string
  companyName?: string
  storeName?: string
  storeId?: string
}

const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200'
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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Match['status'] | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  // Dialog states
  const [createMatchOpen, setCreateMatchOpen] = useState(false)
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [jobSelectModalOpen, setJobSelectModalOpen] = useState(false)
  const [candidateSelectModalOpen, setCandidateSelectModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  const [newStatus, setNewStatus] = useState<Match['status']>('suggested')
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
      const [matchesData, candidatesData, jobsData, companiesData, storesData] = await Promise.all([
        getMatches(),
        getCandidates(),
        getJobs(),
        getCompanies(),
        getStores()
      ])

      setCandidates(candidatesData)
      setJobs(jobsData)
      setCompanies(companiesData)
      setStores(storesData)

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
          companyName: company?.name || '不明',
          storeName: store?.name || '-',
          storeId: store?.id
        }
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(match => match.status === statusFilter)
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
      await updateMatchStatus(
        selectedMatch.id,
        newStatus,
        `ステータスを${getStatusLabel(newStatus)}に更新`,
        user?.uid || '',
        ''
      )
      
      await loadData() // Reload data
      
      setStatusUpdateOpen(false)
      setSelectedMatch(null)
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  const handleDeleteMatch = async () => {
    if (!selectedMatch) return

    try {
      await deleteMatch(selectedMatch.id)
      await loadData() // Reload data
      
      setDeleteDialogOpen(false)
      setSelectedMatch(null)
      alert('進捗を削除しました')
    } catch (error) {
      console.error('進捗削除エラー:', error)
      alert('進捗の削除に失敗しました')
    }
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
      case 'interested': return <Send className="h-4 w-4" />
      case 'applied': return <Send className="h-4 w-4" />
      case 'interviewing': return <CheckCircle className="h-4 w-4" />
      case 'offered': return <CheckCircle className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <AlertCircle className="h-4 w-4" />
      case 'withdrawn': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Match['status']) => {
    switch (status) {
      case 'suggested': return 'bg-gray-100 text-gray-800'
      case 'interested': return 'bg-blue-100 text-blue-800'
      case 'applied': return 'bg-orange-100 text-orange-800'
      case 'interviewing': return 'bg-purple-100 text-purple-800'
      case 'offered': return 'bg-green-100 text-green-800'
      case 'accepted': return 'bg-emerald-100 text-emerald-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Match['status']) => {
    switch (status) {
      case 'suggested': return '提案済み'
      case 'interested': return '興味あり'
      case 'applied': return '応募済み'
      case 'interviewing': return '面接中'
      case 'offered': return '内定'
      case 'accepted': return '承諾'
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
                                      {store && <span className="ml-1">- {store.name}</span>}
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
                <div className="">
                  <Label htmlFor="progress-status">ステータス</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="suggested">提案済み</SelectItem>
                      <SelectItem value="interested">興味あり</SelectItem>
                      <SelectItem value="applied">応募済み</SelectItem>
                      <SelectItem value="interviewing">面接中</SelectItem>
                      <SelectItem value="offered">内定</SelectItem>
                      <SelectItem value="accepted">承諾</SelectItem>
                      <SelectItem value="rejected">不採用</SelectItem>
                      <SelectItem value="withdrawn">辞退</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <TableHead>求職者</TableHead>
                      <TableHead>職種</TableHead>
                      <TableHead>企業</TableHead>
                      <TableHead>店舗</TableHead>
                      <TableHead>スコア</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>更新日</TableHead>
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
                        
                        return (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
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
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/jobs/${match.jobId}`}
                              className="hover:underline text-blue-600 hover:text-blue-800"
                            >
                              {match.jobTitle}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/companies/${match.companyId}`}
                              className="hover:underline text-blue-600 hover:text-blue-800"
                            >
                              {match.companyName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {match.storeId ? (
                              <Link 
                                href={`/stores/${match.storeId}`}
                                className="hover:underline text-blue-600 hover:text-blue-800"
                              >
                                {match.storeName}
                              </Link>
                            ) : (
                              <span className="text-gray-400">{match.storeName}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-sm font-medium mr-2">
                                {match.score}
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(match.score, 100)}%` }}
                                />
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMatch(match)
                                  setNewStatus(match.status)
                                  setStatusUpdateOpen(true)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMatch(match)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ステータス更新</DialogTitle>
                <DialogDescription>
                  {selectedMatch?.candidateName} - {selectedMatch?.jobTitle} のステータスを変更
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newStatus">新しいステータス</Label>
                  <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggested">提案済み</SelectItem>
                      <SelectItem value="interested">興味あり</SelectItem>
                      <SelectItem value="applied">応募済み</SelectItem>
                      <SelectItem value="interviewing">面接中</SelectItem>
                      <SelectItem value="offered">内定</SelectItem>
                      <SelectItem value="accepted">承諾</SelectItem>
                      <SelectItem value="rejected">不採用</SelectItem>
                      <SelectItem value="withdrawn">辞退</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* 削除確認ダイアログ */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>進捗を削除</DialogTitle>
                <DialogDescription>
                  この進捗を削除してもよろしいですか？この操作は取り消せません。
                </DialogDescription>
              </DialogHeader>
              {selectedMatch && (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">求職者:</span> {selectedMatch.candidateName}
                  </div>
                  <div>
                    <span className="font-medium">求人:</span> {selectedMatch.jobTitle}
                  </div>
                  <div>
                    <span className="font-medium">企業:</span> {selectedMatch.companyName}
                  </div>
                  <div>
                    <span className="font-medium">ステータス:</span> {getStatusLabel(selectedMatch.status)}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setSelectedMatch(null)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleDeleteMatch}
                  className="bg-red-600 hover:bg-red-700"
                >
                  削除
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
                                {store && <span className="ml-2">- {store.name}</span>}
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