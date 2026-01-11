"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getCache, setCache, generateCacheKey } from '@/lib/utils/cache'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  User,
  Filter,
  Edit,
  RefreshCw,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Candidate, candidateStatusLabels, campusLabels } from '@/types/candidate'
import { getCandidates, getCandidateStats } from '@/lib/firestore/candidates'
import { getMatchesByCandidate } from '@/lib/firestore/matches'
import { getUsers } from '@/lib/firestore/users'
import { User as UserType } from '@/types/user'
import { Match } from '@/types/matching'
import { getJob } from '@/lib/firestore/jobs'
import { getStoreById } from '@/lib/firestore/stores'
import { importCandidatesFromCSV, generateCandidatesCSVTemplate } from '@/lib/csv/candidates'
import { toast } from 'sonner'

interface MatchWithDetails extends Match {
  storeNames?: string[]
}

interface CandidateWithProgress extends Candidate {
  latestMatches?: MatchWithDetails[]
}

const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200'
}

const statusLabels: Record<Match['status'], string> = {
  suggested: '提案',
  applied: '応募',
  document_screening: '書類選考',
  document_passed: '書類通過',
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

// 展開可能なテキストコンポーネント
function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text || text.trim() === '') {
    return <span className="text-gray-400 text-sm">-</span>
  }
  
  // テキストが3行を超えるかチェック（おおよそ）
  const needsExpansion = text.length > 150 || text.split('\n').length > 3
  
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation()
        if (needsExpansion) setIsExpanded(!isExpanded)
      }}
      className={`text-sm ${needsExpansion ? 'cursor-pointer' : ''}`}
    >
      <p className={`text-gray-800 break-words whitespace-pre-wrap ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {needsExpansion && (
        <div className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium">
          {isExpanded ? '閉じる' : '続きを読む'}
        </div>
      )}
    </div>
  )
}

export default function CandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<CandidateWithProgress[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithProgress[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState<any>(null)
  
  // フィルタ・検索の状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active') // デフォルトを「アクティブ」に設定
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [enrollmentMonthFilter, setEnrollmentMonthFilter] = useState<string>('all')
  const [uniqueEnrollmentMonths, setUniqueEnrollmentMonths] = useState<string[]>([])

  // ソート状態（デフォルト: ステータス昇順 = アクティブが上）
  const [sortBy, setSortBy] = useState<'name' | 'campus' | 'enrollmentDate' | 'status' | 'createdAt' | 'updatedAt'>('status')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // ソートハンドラー関数
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      // 同じカラムをクリックした場合は昇順・降順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるカラムをクリックした場合は、そのカラムで降順ソート
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // マウント時にURLの検索パラメータからフィルタを復元（クライアントサイドのみ）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const s = params.get('search') || ''
    const st = params.get('status') || 'active' // デフォルトを「active」に
    const cp = params.get('campus') || 'all'
    const en = params.get('enrollment') || 'all'

    setSearchTerm(s)
    setStatusFilter(st)
    setCampusFilter(cp)
    setEnrollmentMonthFilter(en)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
    updateURLParams()
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1)
  }, [candidates, searchTerm, statusFilter, campusFilter, enrollmentMonthFilter, sortBy, sortOrder])

  // ページ変更時のみフィルター再適用
  useEffect(() => {
    applyFilters()
  }, [currentPage, itemsPerPage])

  // 入学年月のユニーク値を抽出
  useEffect(() => {
    if (candidates.length > 0) {
      const months = candidates
        .filter(c => c.enrollmentDate)
        .map(c => c.enrollmentDate!.substring(0, 7)) // YYYY-MM形式
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => b.localeCompare(a)) // 降順（新しい順）
      setUniqueEnrollmentMonths(months)
    }
  }, [candidates])

  // URLパラメータを更新
  const updateURLParams = () => {
    const params = new URLSearchParams()
    
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (campusFilter !== 'all') params.set('campus', campusFilter)
    if (enrollmentMonthFilter !== 'all') params.set('enrollment', enrollmentMonthFilter)
    
    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : '/candidates'
    
    router.replace(newUrl, { scroll: false })
  }

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      
      // キャッシュキーを生成
      const cacheKey = 'candidates_data'
      
      // キャッシュチェック（強制更新でない場合のみ）
      if (!forceRefresh) {
        const cached = getCache<{
          candidates: any[]
          stats: any
          users: any[]
        }>(cacheKey)
        
        if (cached) {
          console.log('📦 キャッシュからデータ読み込み')
          setCandidates(cached.candidates)
          setStats(cached.stats)
          setUsers(cached.users)
          loadProgressCounts(cached.candidates)
          setLoading(false)
          return
        }
      }
      
      console.log('🔄 Firestoreからデータ読み込み')
      const [candidatesData, statsData, usersData] = await Promise.all([
        getCandidates(),
        getCandidateStats(),
        getUsers()
      ])
      
      // 進捗件数も含めて設定
      setCandidates(candidatesData)
      setStats(statsData)
      setUsers(usersData)
      
      // キャッシュに保存（5分間有効）
      setCache(cacheKey, {
        candidates: candidatesData,
        stats: statsData,
        users: usersData
      })
      console.log('💾 データをキャッシュに保存')
      
      // 進捗データを並行して取得
      loadProgressCounts(candidatesData)
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
            // ステータス降順でソート（優先度の高い順）
            const sortedMatches = matches.sort((a, b) => {
              return statusPriority[b.status] - statusPriority[a.status]
            })
            // 最新3件を取得
            const topMatches = sortedMatches.slice(0, 3)
            
            // 各マッチに店舗情報を追加
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
                  
                  return {
                    ...match,
                    storeNames
                  }
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
      
      setCandidates(candidatesWithProgress)
    } catch (error) {
      console.error('進捗データ読み込みエラー:', error)
    } finally {
      setProgressLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = candidates

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.status === statusFilter)
    }

    // 校舎フィルタ
    if (campusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.campus === campusFilter)
    }

    // 入学年月フィルタ
    if (enrollmentMonthFilter !== 'all') {
      filtered = filtered.filter(candidate => 
        candidate.enrollmentDate && candidate.enrollmentDate.startsWith(enrollmentMonthFilter)
      )
      console.log('📅 入学年月フィルタ後:', filtered.length)
    }

    // 検索フィルタ
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(candidate =>
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchLower) ||
        `${candidate.firstNameKana} ${candidate.lastNameKana}`.toLowerCase().includes(searchLower) ||
        candidate.email?.toLowerCase().includes(searchLower) ||
        candidate.phone?.toLowerCase().includes(searchLower)
      )
    }

    // ソート処理
    filtered = filtered.sort((a, b) => {
      let compareResult = 0

      switch (sortBy) {
        case 'name':
          compareResult = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja')
          break
        case 'campus':
          // 校舎でソート（校舎 → 入学年月の順）
          const campusA = a.campus || ''
          const campusB = b.campus || ''
          compareResult = campusA.localeCompare(campusB)
          // 校舎が同じ場合は入学年月でソート
          if (compareResult === 0) {
            const enrollA = a.enrollmentDate || ''
            const enrollB = b.enrollmentDate || ''
            compareResult = enrollA.localeCompare(enrollB)
          }
          break
        case 'enrollmentDate':
          // 入学年月でソート（入学年月 → 校舎の順）
          const enrollA = a.enrollmentDate || ''
          const enrollB = b.enrollmentDate || ''
          compareResult = enrollA.localeCompare(enrollB)
          // 入学年月が同じ場合は校舎でソート
          if (compareResult === 0) {
            const campusA2 = a.campus || ''
            const campusB2 = b.campus || ''
            compareResult = campusA2.localeCompare(campusB2)
          }
          break
        case 'status':
          compareResult = (a.status || '').localeCompare(b.status || '')
          break
        case 'updatedAt':
          const timeA = new Date(a.updatedAt).getTime()
          const timeB = new Date(b.updatedAt).getTime()
          compareResult = timeA - timeB
          break
        case 'createdAt':
          const createA = new Date(a.createdAt).getTime()
          const createB = new Date(b.createdAt).getTime()
          compareResult = createA - createB
          break
      }

      return sortOrder === 'asc' ? compareResult : -compareResult
    })

    // 総件数を更新
    setTotalItems(filtered.length)
    
    // ページネーション適用
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedCandidates = filtered.slice(startIndex, endIndex)

    console.log('✅ 最終的なフィルタ結果:', filtered.length, 'ページング後:', paginatedCandidates.length)
    setFilteredCandidates(paginatedCandidates)
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

  // CSVテンプレートをダウンロード
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

  // CSVインポート
  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvImporting(true)
    try {
      const text = await file.text()
      const result = await importCandidatesFromCSV(text)
      
      if (result.errors.length > 0) {
        toast.error(`インポート完了（エラーあり）\n成功: ${result.success}件、更新: ${result.updated}件\nエラー: ${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        toast.success(`CSVインポート完了\n成功: ${result.success}件、更新: ${result.updated}件`)
      }
      
      await loadData()
    } catch (error) {
      console.error('CSV import error:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
      // ファイル入力をリセット
      event.target.value = ''
    }
  }

  const handleToggleStatus = async (candidateId: string, currentStatus: Candidate['status'], name: string) => {
    // ステータスの2段階トグル: active ↔ inactive
    const newStatus: Candidate['status'] = currentStatus === 'active' ? 'inactive' : 'active'
    
    if (!confirm(`${name}さんのステータスを「${candidateStatusLabels[newStatus]}」に変更しますか？`)) {
      return
    }

    try {
      const { updateCandidate } = await import('@/lib/firestore/candidates')
      await updateCandidate(candidateId, { status: newStatus })
      toast.success(`ステータスを${candidateStatusLabels[newStatus]}に変更しました`)
      await loadData()
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      toast.error('ステータスの変更に失敗しました')
    }
  }

  const getStatusBadge = (status: Candidate['status']) => {
    const config = {
      active: { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' },
      inactive: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-200' },
      hired: { variant: 'default' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    }

    const { variant, className } = config[status]

    return (
      <Badge variant={variant} className={className}>
        {candidateStatusLabels[status]}
      </Badge>
    )
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
    
    let colorClass = 'bg-blue-100 text-blue-800 border-blue-200'
    if (count >= 5) colorClass = 'bg-red-100 text-red-800 border-red-200'
    else if (count >= 3) colorClass = 'bg-orange-100 text-orange-800 border-orange-200'
    else if (count >= 1) colorClass = 'bg-green-100 text-green-800 border-green-200'

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
        {/* ページヘッダー - 青系テーマ */}
        <div className="mb-8 p-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">求職者管理</h1>
              <p className="text-blue-100 mt-1">
                登録された求職者の管理・マッチング
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadData(true)}
              variant="outline"
              className="bg-white text-red-600 hover:bg-red-50 border-white flex items-center gap-2"
              title="キャッシュをクリアして最新データを取得"
            >
              <RefreshCw className="h-4 w-4" />
              更新
            </Button>
            <Button
              onClick={downloadCSVTemplate}
              variant="outline"
              className="bg-white text-green-600 hover:bg-green-50 border-white flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              テンプレート
            </Button>
            <Button
              variant="outline"
              className="bg-white text-blue-600 hover:bg-blue-50 border-white flex items-center gap-2 relative"
              disabled={csvImporting}
            >
              {csvImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  インポート中...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  CSVインポート
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
              <Button variant="outline" className="bg-white text-red-600 hover:bg-red-50 border-white">
                <Plus className="h-4 w-4 mr-2" />
                新規登録
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
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

          <Card>
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

          <Card>
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

      {/* 検索・フィルタ */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            検索・フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {/* 検索 */}
            <div className="flex-1">
              <Label htmlFor="candidate-search">検索</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="candidate-search"
                  placeholder="名前、メール、電話番号で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* ステータスフィルタ */}
            <div className="w-48">
              <Label>ステータス</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="inactive">非アクティブ</SelectItem>
                  <SelectItem value="hired">就職決定</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 校舎フィルタ */}
            <div className="w-48">
              <Label>校舎</Label>
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="校舎" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="tokyo">東京</SelectItem>
                  <SelectItem value="osaka">大阪</SelectItem>
                  <SelectItem value="awaji">淡路</SelectItem>
                  <SelectItem value="fukuoka">福岡</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 入学年月フィルタ */}
            <div className="w-48">
              <Label>入学年月</Label>
              <Select value={enrollmentMonthFilter} onValueChange={setEnrollmentMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="入学年月" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {uniqueEnrollmentMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
              {filteredCandidates.map((candidate) => {
                // ステータスに応じた背景色
                let rowClassName = 'cursor-pointer transition-colors hover:bg-blue-50'
                if (candidate.status === 'inactive') {
                  rowClassName = 'cursor-pointer transition-colors bg-gray-300 hover:bg-gray-400'
                } else if (candidate.status === 'hired') {
                  rowClassName = 'cursor-pointer transition-colors bg-gray-100 hover:bg-gray-200'
                }
                
                return (
                  <TableRow 
                    key={candidate.id}
                    className={rowClassName}
                    onClick={() => window.open(`/candidates/${candidate.id}`, '_blank')}
                    style={{ cursor: 'pointer' }}
                  >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {candidate.lastName} {candidate.firstName}
                        <span className="ml-2 text-blue-600 font-medium">
                          {candidate.dateOfBirth ? (
                            <>
                              （{calculateAge(candidate.dateOfBirth)}歳）
                            </>
                          ) : (
                            '（未登録）'
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {candidate.lastNameKana} {candidate.firstNameKana}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{candidate.enrollmentDate || '未登録'}</div>
                      {candidate.campus ? (
                        <Badge className={`${campusColors[candidate.campus]} border text-xs font-medium`}>
                          {campusLabels[candidate.campus]}
                        </Badge>
                      ) : (
                        <div className="text-sm text-gray-500">校舎未登録</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {candidate.assignedUserId ? (
                        users.find(u => u.id === candidate.assignedUserId)?.displayName || '不明'
                      ) : (
                        <span className="text-gray-400">未設定</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(candidate.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {progressLoading ? (
                        <span className="text-sm text-gray-500">...</span>
                      ) : candidate.latestMatches && candidate.latestMatches.length > 0 ? (
                        candidate.latestMatches.map((match, index) => (
                          <div key={match.id} className="flex items-center gap-2">
                            {/* 店舗名 */}
                            <div className="text-xs text-gray-600 min-w-[80px]">
                              {match.storeNames && match.storeNames.length > 0 ? (
                                match.storeNames.length === 1 ? (
                                  match.storeNames[0]
                                ) : (
                                  `${match.storeNames[0]} 他${match.storeNames.length - 1}店舗`
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            {/* ステータスバッジ */}
                            <Badge 
                              className={`${statusColors[match.status]} text-xs border-0`}
                            >
                              {statusLabels[match.status]}
                            </Badge>
                            {/* 面接日時 */}
                            {match.interviewDate && (() => {
                              const interviewDate = match.interviewDate instanceof Date 
                                ? match.interviewDate 
                                : new Date(match.interviewDate)
                              
                              if (!isNaN(interviewDate.getTime())) {
                                return (
                                  <div className="text-xs text-gray-600 whitespace-nowrap">
                                    {interviewDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                    <span className="ml-1">
                                      {interviewDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ExpandableText text={candidate.interviewMemo || ''} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/candidates/${candidate.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStatus(candidate.id, candidate.status, `${candidate.lastName} ${candidate.firstName}`)
                        }}
                        className={candidate.status === 'active' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                        title={candidate.status === 'active' ? '非アクティブにする' : 'アクティブにする'}
                      >
                        {candidate.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
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