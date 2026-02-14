"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Users, 
  Plus, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase
} from 'lucide-react'
import { Candidate, candidateStatusLabels } from '@/types/candidate'
import { getCandidates, getCandidateStats, updateCandidate } from '@/lib/firestore/candidates'
import { getMatchesByCandidate } from '@/lib/firestore/matches'
import { getUsers } from '@/lib/firestore/users'
import { User as UserType } from '@/types/user'
import { getJob } from '@/lib/firestore/jobs'
import { getStoreById } from '@/lib/firestore/stores'
import { importCandidatesFromCSV, generateCandidatesCSVTemplate } from '@/lib/csv/candidates'
import { getCache, setCache } from '@/lib/utils/cache'
import { toast } from 'sonner'

import CandidateFilters from './CandidateFilters'
import CandidateTableRow from './CandidateTableRow'
import { 
  CAMPUS_COLORS, 
  STATUS_LABELS, 
  STATUS_COLORS, 
  STATUS_PRIORITY,
  DEFAULT_ITEMS_PER_PAGE,
  DEFAULT_STATUS_FILTER,
  DEFAULT_CAMPUS_FILTER,
  DEFAULT_SOURCE_TYPE_FILTER,
  DEFAULT_ENROLLMENT_FILTER,
  SortBy,
  SortOrder
} from './CandidatePageConstants'
import { CandidateWithProgress } from './CandidatePageTypes'
import { 
  applyFilters,
  getSourceTypeCount,
  extractUniqueEnrollmentMonths,
  getProgressCountColor
} from './CandidatePageUtils'

export default function CandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidatesWithProgress, setCandidatesWithProgress] = useState<CandidateWithProgress[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithProgress[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState<any>(null)
  
  // フィルタ・検索の状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_STATUS_FILTER)
  const [campusFilter, setCampusFilter] = useState<string>(DEFAULT_CAMPUS_FILTER)
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>(DEFAULT_SOURCE_TYPE_FILTER)
  const [enrollmentMonthFilter, setEnrollmentMonthFilter] = useState<string>(DEFAULT_ENROLLMENT_FILTER)
  const [uniqueEnrollmentMonths, setUniqueEnrollmentMonths] = useState<string[]>([])

  // ソート状態（デフォルト: 進捗更新日降順）
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // ソートハンドラー関数
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // マウント時にURLの検索パラメータからフィルタを復元
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const s = params.get('search') || ''
    const st = params.get('status') || DEFAULT_STATUS_FILTER
    const cp = params.get('campus') || DEFAULT_CAMPUS_FILTER
    const src = params.get('sourceType') || DEFAULT_SOURCE_TYPE_FILTER
    const en = params.get('enrollment') || DEFAULT_ENROLLMENT_FILTER

    setSearchTerm(s)
    setStatusFilter(st)
    setCampusFilter(cp)
    setSourceTypeFilter(src)
    setEnrollmentMonthFilter(en)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyAndUpdate()
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1)
  }, [candidatesWithProgress, searchTerm, statusFilter, campusFilter, sourceTypeFilter, enrollmentMonthFilter, sortBy, sortOrder])

  // ページ変更時のみフィルター再適用
  useEffect(() => {
    applyAndUpdate()
  }, [currentPage, itemsPerPage])

  // 入学年月のユニーク値を抽出
  useEffect(() => {
    const months = extractUniqueEnrollmentMonths(candidates)
    setUniqueEnrollmentMonths(months)
  }, [candidates])

  // URLパラメータを更新
  const updateURLParams = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (campusFilter !== 'all') params.set('campus', campusFilter)
    if (sourceTypeFilter !== 'all') params.set('sourceType', sourceTypeFilter)
    if (enrollmentMonthFilter !== 'all') params.set('enrollment', enrollmentMonthFilter)
    
    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : '/candidates'
    router.replace(newUrl, { scroll: false })
  }

  const applyAndUpdate = () => {
    const result = applyFilters(
      candidatesWithProgress,
      candidates,
      {
        searchTerm,
        statusFilter,
        campusFilter,
        sourceTypeFilter,
        enrollmentMonthFilter,
        sortBy,
        sortOrder,
        currentPage,
        itemsPerPage,
      }
    )
    setTotalItems(result.totalItems)
    setFilteredCandidates(result.paginated)
    updateURLParams()
  }

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      const cacheKey = 'candidates_data'
      
      if (!forceRefresh) {
        const cached = getCache<{
          candidates: any[]
          stats: any
          users: any[]
          candidatesWithProgress?: CandidateWithProgress[]
        }>(cacheKey)
        
        if (cached) {
          setCandidates(cached.candidates)
          setStats(cached.stats)
          setUsers(cached.users)
          if (cached.candidatesWithProgress) {
            setCandidatesWithProgress(cached.candidatesWithProgress)
          }
          setLoading(false)
          return
        }
      }
      
      const [candidatesData, statsData, usersData] = await Promise.all([
        getCandidates(),
        getCandidateStats(),
        getUsers()
      ])
      
      setCandidates(candidatesData)
      setStats(statsData)
      setUsers(usersData)
      
      const candidatesWithProgressData = await loadProgressCounts(candidatesData)
      
      setCache(cacheKey, {
        candidates: candidatesData,
        stats: statsData,
        users: usersData,
        candidatesWithProgress: candidatesWithProgressData
      })
    } catch (error) {
      console.error('Error loading candidates:', error)
      toast.error('求職者データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const loadProgressCounts = async (candidatesData: Candidate[]) => {
    try {
      setProgressLoading(true)
      
      const candidatesWithProgress = await Promise.all(
        candidatesData.map(async (candidate) => {
          try {
            const matches = await getMatchesByCandidate(candidate.id)
            const sortedMatches = matches.sort((a, b) => {
              return STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status]
            })
            const topMatches = sortedMatches.slice(0, 3)
            
            const matchesWithDetails = await Promise.all(
              topMatches.map(async (match) => {
                try {
                  const jobData = await getJob(match.jobId)
                  let storeNames: string[] = []
                  
                  if (jobData) {
                    if (jobData.storeIds && jobData.storeIds.length > 0) {
                      const validStoreIds = jobData.storeIds.filter(id => id && id.trim() !== '')
                      if (validStoreIds.length > 0) {
                        const storesData = await Promise.all(
                          validStoreIds.map(id => getStoreById(id).catch(() => null))
                        )
                        storeNames = storesData
                          .filter((s): s is NonNullable<typeof s> => s !== null)
                          .map(s => s.name)
                      }
                    } else if (jobData.storeId && jobData.storeId.trim() !== '') {
                      const storeData = await getStoreById(jobData.storeId).catch(() => null)
                      if (storeData) storeNames = [storeData.name]
                    }
                  }
                  
                  let latestInterviewDate: Date | undefined
                  if (match.timeline && match.timeline.length > 0) {
                    const sortedTimeline = [...match.timeline].sort((a, b) => {
                      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
                      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
                      return timeB - timeA
                    })
                    
                    const currentStatusEvent = sortedTimeline.find(t => t.status === match.status && t.eventDate)
                    if (currentStatusEvent && currentStatusEvent.eventDate) {
                      latestInterviewDate = currentStatusEvent.eventDate instanceof Date 
                        ? currentStatusEvent.eventDate 
                        : new Date(currentStatusEvent.eventDate)
                    } else {
                      const latestEvent = sortedTimeline.find(t => t.eventDate)
                      if (latestEvent && latestEvent.eventDate) {
                        latestInterviewDate = latestEvent.eventDate instanceof Date 
                          ? latestEvent.eventDate 
                          : new Date(latestEvent.eventDate)
                      }
                    }
                  }
                  
                  if (!latestInterviewDate && match.interviewDate) {
                    const iDate = match.interviewDate instanceof Date 
                      ? match.interviewDate 
                      : new Date(match.interviewDate)
                    latestInterviewDate = iDate
                  }
                  
                  return {
                    ...match,
                    storeNames,
                    interviewDate: latestInterviewDate
                  } as any
                } catch (error) {
                  console.error('店舗情報取得エラー:', error)
                  return {
                    ...match,
                    storeNames: []
                  }
                }
              })
            )
            
            return {
              ...candidate,
              latestMatches: matchesWithDetails
            }
          } catch (error) {
            console.error(`進捗取得エラー for ${candidate.id}:`, error)
            return {
              ...candidate,
              latestMatches: []
            }
          }
        })
      )
      
      setCandidatesWithProgress(candidatesWithProgress)
      return candidatesWithProgress
    } catch (error) {
      console.error('進捗データ読み込みエラー:', error)
      return candidatesData
    } finally {
      setProgressLoading(false)
    }
  }

  const downloadCSVTemplate = () => {
    const csvContent = generateCandidatesCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', '求職者インポートテンプレート.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvImporting(true)
    try {
      const text = await file.text()
      const result = await importCandidatesFromCSV(text)
      
      const messages = []
      if (result.success > 0) messages.push(`新規: ${result.success}件`)
      if (result.updated > 0) messages.push(`更新: ${result.updated}件`)
      
      if (result.errors.length > 0) {
        toast.error(`インポート完了（エラーあり）\n${messages.join('、')}\nエラー: ${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        toast.success(`CSVインポート完了\n${messages.join('、')}`)
      }
      
      await loadData()
    } catch (error) {
      console.error('CSV import error:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
      event.target.value = ''
    }
  }

  const handleToggleStatus = async (candidateId: string, currentStatus: Candidate['status'], name: string) => {
    const newStatus: Candidate['status'] = currentStatus === 'active' ? 'inactive' : 'active'
    
    if (!confirm(`${name}さんのステータスを「${candidateStatusLabels[newStatus]}」に変更しますか？`)) {
      return
    }

    try {
      await updateCandidate(candidateId, { status: newStatus })
      toast.success(`ステータスを${candidateStatusLabels[newStatus]}に変更しました`)
      await loadData()
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      toast.error('ステータスの変更に失敗しました')
    }
  }

  const getProgressCountBadge = (count: number | undefined) => {
    if (count === undefined) {
      return (
        <Badge variant="outline" className="text-gray-400 border-gray-300">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          読込中
        </Badge>
      )
    }
    
    if (count === 0) {
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          0件
        </Badge>
      )
    }
    
    const colorClass = getProgressCountColor(count)
    return (
      <Badge className={colorClass}>
        {count}件
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* ページヘッダー */}
        <div className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white">
          <div className="flex justify-between items-center gap-4">
            {/* タイトル部分 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-white/20 rounded-full">
                <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">求職者管理</h1>
                <p className="text-red-100 mt-1 text-xs sm:text-sm">
                  登録された求職者の管理・マッチング
                </p>
              </div>
            </div>
            
            {/* ヘッダーアクション */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => loadData(true)}
                variant="outline"
                size="sm"
                className="bg-white text-red-600 hover:bg-red-50 border-white flex items-center gap-1 text-xs sm:text-sm"
                title="キャッシュをクリアして最新データを取得"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">更新</span>
              </Button>
              <Button
                onClick={downloadCSVTemplate}
                variant="outline"
                size="sm"
                className="bg-white text-green-600 hover:bg-green-50 border-white flex items-center gap-1 text-xs sm:text-sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">テンプレート</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-1 relative text-xs sm:text-sm"
                disabled={csvImporting}
              >
                {csvImporting ? (
                  <>
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">処理中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">CSVインポート</span>
                    <span className="sm:hidden">インポート</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={csvImporting}
                />
              </Button>
              <Link href="/candidates/new">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white text-red-600 hover:bg-red-50 border-white text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">新規登録</span>
                  <span className="sm:hidden">新規</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setStatusFilter('all')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  総求職者数
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setStatusFilter('active')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  アクティブ
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.byStatus?.active || 0}</div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setStatusFilter('hired')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  就職決定
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.byStatus?.hired || 0}</div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setStatusFilter('inactive')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  非アクティブ
                </CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.byStatus?.inactive || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 求職者区分フィルタタブ */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setSourceTypeFilter('all')}
            className={`px-6 py-3 font-medium transition-colors ${
              sourceTypeFilter === 'all'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            すべて ({getSourceTypeCount('all', candidates)})
          </button>
          <button
            onClick={() => setSourceTypeFilter('inshokujin_univ')}
            className={`px-6 py-3 font-medium transition-colors ${
              sourceTypeFilter === 'inshokujin_univ'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🎓 飲食人大学 ({getSourceTypeCount('inshokujin_univ', candidates)})
          </button>
          <button
            onClick={() => setSourceTypeFilter('mid_career')}
            className={`px-6 py-3 font-medium transition-colors ${
              sourceTypeFilter === 'mid_career'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            中途人材 ({getSourceTypeCount('mid_career', candidates)})
          </button>
          <button
            onClick={() => setSourceTypeFilter('referral')}
            className={`px-6 py-3 font-medium transition-colors ${
              sourceTypeFilter === 'referral'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            紹介・リファラル ({getSourceTypeCount('referral', candidates)})
          </button>
          <button
            onClick={() => setSourceTypeFilter('overseas')}
            className={`px-6 py-3 font-medium transition-colors ${
              sourceTypeFilter === 'overseas'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            海外人材 ({getSourceTypeCount('overseas', candidates)})
          </button>
        </div>

        {/* フィルタコンポーネント */}
        <CandidateFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          campusFilter={campusFilter}
          enrollmentMonthFilter={enrollmentMonthFilter}
          uniqueEnrollmentMonths={uniqueEnrollmentMonths}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onCampusChange={setCampusFilter}
          onEnrollmentChange={setEnrollmentMonthFilter}
        />

        {/* 求職者一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>求職者一覧</CardTitle>
            <CardDescription>
              {filteredCandidates.length} 件の求職者
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      名前
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 hover:bg-gray-100 justify-start"
                        onClick={() => handleSort('enrollmentDate')}
                      >
                        入学年月
                        {sortBy === 'enrollmentDate' ? (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 hover:bg-gray-100 justify-start"
                        onClick={() => handleSort('campus')}
                      >
                        校舎
                        {sortBy === 'campus' ? (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>求職者区分</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      ステータス
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>進捗</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <CandidateTableRow
                    key={candidate.id}
                    candidate={candidate}
                    users={users}
                    progressLoading={progressLoading}
                    onStatusToggle={handleToggleStatus}
                  />
                ))}
              </TableBody>
            </Table>

            {filteredCandidates.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  求職者が見つかりません
                </h3>
                <p className="text-gray-500">
                  条件を変更して再度検索してください
                </p>
              </div>
            )}
          </CardContent>
          
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
        </Card>
      </div>
    </ProtectedRoute>
  )
}
