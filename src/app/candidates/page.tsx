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
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { Candidate, candidateStatusLabels, campusLabels } from '@/types/candidate'
import { getCandidates, getCandidateStats, deleteCandidate } from '@/lib/firestore/candidates'
import { getMatchesByCandidate } from '@/lib/firestore/matches'
import { toast } from 'sonner'

interface CandidateWithProgress extends Candidate {
  activeProgressCount?: number
}

export default function CandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<CandidateWithProgress[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  
  // フィルタ・検索の状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [candidates, searchTerm, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🔍 求職者データを読み込み開始...')
      const [candidatesData, statsData] = await Promise.all([
        getCandidates(),
        getCandidateStats()
      ])
      console.log('📋 取得した求職者データ:', candidatesData)
      console.log('📊 統計データ:', statsData)
      
      // 進捗件数も含めて設定
      setCandidates(candidatesData)
      setStats(statsData)
      
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
      console.log('🔍 進捗データを読み込み開始...')
      
      const candidatesWithProgress = await Promise.all(
        candidatesData.map(async (candidate) => {
          try {
            const matches = await getMatchesByCandidate(candidate.id)
            // アクティブな進捗をカウント（suggested, interested, applied, interviewing, offered）
            const activeMatches = matches.filter(match => 
              ['suggested', 'interested', 'applied', 'interviewing', 'offered'].includes(match.status)
            )
            return {
              ...candidate,
              activeProgressCount: activeMatches.length
            }
          } catch (error) {
            console.error(`進捗取得エラー for ${candidate.id}:`, error)
            return {
              ...candidate,
              activeProgressCount: 0
            }
          }
        })
      )
      
      setCandidates(candidatesWithProgress)
      console.log('✅ 進捗データ読み込み完了')
    } catch (error) {
      console.error('進捗データ読み込みエラー:', error)
    } finally {
      setProgressLoading(false)
    }
  }

  const applyFilters = () => {
    console.log('🔍 フィルタリング開始', { 
      candidatesCount: candidates.length, 
      statusFilter, 
      searchTerm 
    })
    
    let filtered = candidates

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.status === statusFilter)
      console.log('📊 ステータスフィルタ後:', filtered.length)
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
      console.log('🔍 検索フィルタ後:', filtered.length)
    }

    console.log('✅ 最終的なフィルタ結果:', filtered)
    setFilteredCandidates(filtered)
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      await deleteCandidate(id)
      await loadData()
      toast.success('求職者を削除しました')
    } catch (error) {
      console.error('Error deleting candidate:', error)
      toast.error('求職者の削除に失敗しました')
    }
  }

  const getStatusBadge = (status: Candidate['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      placed: 'default',
      interviewing: 'outline'
    } as const

    return (
      <Badge variant={variants[status]}>
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
              onClick={loadData}
              variant="outline"
              className="bg-white text-red-600 hover:bg-red-50 border-white flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              更新
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
                就職済み
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus?.placed || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                面接中
              </CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus?.interviewing || 0}</div>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="inactive">非アクティブ</SelectItem>
                  <SelectItem value="placed">就職済み</SelectItem>
                  <SelectItem value="interviewing">面接中</SelectItem>
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
                <TableHead>名前</TableHead>
                <TableHead>入学年月|校舎</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
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
                    <div>
                      <div className="text-sm">{candidate.enrollmentDate || '未登録'}</div>
                      <div className="text-sm text-gray-500">
                        {candidate.campus ? campusLabels[candidate.campus] : '校舎未登録'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(candidate.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(candidate.updatedAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/candidates/${candidate.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/candidates/${candidate.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(candidate.id, `${candidate.firstName} ${candidate.lastName}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
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
      </Card>
      </div>
    </ProtectedRoute>
  )
}