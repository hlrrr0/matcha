"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  Store,
  Download,
  Upload,
  FileText,
  Copy
} from 'lucide-react'
import { Job, jobStatusLabels } from '@/types/job'
import { getJobs, deleteJob } from '@/lib/firestore/jobs'
import { getCompanies } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { User } from '@/types/user'
import { importJobsFromCSV, generateJobsCSVTemplate } from '@/lib/csv/jobs'
import { toast } from 'sonner'

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
}

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsPageContent />
    </ProtectedRoute>
  )
}

function JobsPageContent() {
  const { isAdmin } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // 一括選択状態
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  
  // フィルター・検索状態
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Job['status'] | 'all'>('all')
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<Job['employmentType'] | 'all'>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')

  // 求人データの入力率チェック対象フィールド
  const jobFieldKeys = [
    'title', 'businessType', 'employmentType', 'workingHours',
    'salaryInexperienced', 'salaryExperienced', 'jobDescription',
    'benefits', 'selectionProcess', 'consultantReview'
  ]
  
  // 求人の入力率を計算する関数
  const calculateCompletionRate = (job: Job): number => {
    let filledCount = 0
    jobFieldKeys.forEach(field => {
      const value = (job as any)[field]
      if (value !== null && value !== undefined && value !== '') {
        filledCount++
      }
    })
    return Math.round((filledCount / jobFieldKeys.length) * 100)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [jobsData, companiesData, storesData, usersData] = await Promise.all([
        getJobs(),
        getCompanies(),
        getStores(),
        getUsers()
      ])
      setJobs(jobsData)
      setCompanies(companiesData)
      setStores(storesData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCSVImport = async (file: File) => {
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('CSVファイルを選択してください')
      return
    }

    setCsvImporting(true)
    try {
      const text = await file.text()
      const result = await importJobsFromCSV(text)
      
      if (result.errors.length > 0) {
        toast.error(`インポート完了: 新規${result.success}件、更新${result.updated}件、エラー${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        const totalProcessed = result.success + result.updated
        if (result.updated > 0) {
          toast.success(`インポート完了: 新規${result.success}件、更新${result.updated}件（計${totalProcessed}件）`)
        } else {
          toast.success(`${result.success}件の求人データをインポートしました`)
        }
      }
      
      // データを再読み込み
      await loadData()
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
    }
  }

  // 選択された求人のCSV出力
  const exportSelectedJobsCSV = () => {
    if (selectedJobs.size === 0) {
      toast.error('エクスポートする求人を選択してください')
      return
    }

    const selectedJobData = jobs.filter(job => selectedJobs.has(job.id))
    
    // CSVヘッダー（Job型定義に基づく完全なフィールド）
    const headers = [
      'id',                         // ID追加
      'title',
      'companyId',
      'storeId',
      'businessType',
      'employmentType',
      'trialPeriod',
      'workingHours',
      'holidays',
      'overtime',
      'salaryInexperienced',
      'salaryExperienced',
      'requiredSkills',
      'jobDescription',
      'smokingPolicy',
      'insurance',
      'benefits',
      'selectionProcess',
      'consultantReview',
      'status',
      'createdBy'
    ]

    // CSVデータを生成
    const csvRows = [
      headers.join(','),
      ...selectedJobData.map(job => {
        return headers.map(header => {
          let value: any = job[header as keyof Job] || ''
          
          // Boolean値を文字列に変換
          if (typeof value === 'boolean') {
            value = value.toString()
          }
          
          // Date値を文字列に変換
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0] // YYYY-MM-DD形式
          }
          
          // Firestore Timestampを文字列に変換
          if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
            value = (value as any).toDate().toISOString().split('T')[0] // YYYY-MM-DD形式
          }
          
          // CSVフィールドをエスケープ
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        }).join(',')
      })
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `jobs_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`${selectedJobs.size}件の求人データをエクスポートしました`)
  }

  const downloadCSVTemplate = () => {
    const csvContent = generateJobsCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'jobs_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteJob = async (job: Job) => {
    if (confirm(`${job.title}を削除しますか？この操作は取り消せません。`)) {
      try {
        await deleteJob(job.id)
        await loadData()
      } catch (error) {
        console.error('Error deleting job:', error)
        alert('求人の削除に失敗しました')
      }
    }
  }

  const handleDuplicateJob = async (job: Job) => {
    if (confirm(`${job.title}を複製しますか？`)) {
      try {
        // IDとタイムスタンプを除いたデータをコピー
        const { id, createdAt, updatedAt, ...jobData } = job
        const duplicatedJob = {
          ...jobData,
          title: `${job.title}（コピー）`,
          status: 'draft' as const, // 複製は下書き状態にする
        }
        
        // createJobを使用して新規作成
        const { createJob } = await import('@/lib/firestore/jobs')
        await createJob(duplicatedJob)
        
        toast.success('求人を複製しました')
        await loadData()
      } catch (error) {
        console.error('Error duplicating job:', error)
        toast.error('求人の複製に失敗しました')
      }
    }
  }

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    return company?.name || '不明な企業'
  }

  const getCompany = (companyId: string) => {
    return companies.find(c => c.id === companyId)
  }

  const getStoreName = (storeId?: string) => {
    if (!storeId) return '-'
    const store = stores.find(s => s.id === storeId)
    return store?.name || '不明な店舗'
  }

  const getConsultantName = (userId?: string) => {
    if (!userId) return '未設定'
    const user = users.find(u => u.id === userId)
    return user?.displayName || user?.email || '不明な担当者'
  }

  const getAddress = (job: Job) => {
    // 店舗が紐付いている場合は店舗の住所
    if (job.storeId) {
      const store = stores.find(s => s.id === job.storeId)
      if (store?.address) return store.address
    }
    // 店舗が紐付いていない場合は企業の住所
    const company = companies.find(c => c.id === job.companyId)
    return company?.address || '-'
  }

  // フィルタリングされた求人リストをuseMemoで計算
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const store = stores.find(s => s.id === job.storeId)
      const company = companies.find(c => c.id === job.companyId)
      
      // 住所の検索: 店舗の住所がある場合はそれを、ない場合は企業の住所を検索対象に含める
      const addressMatch = job.storeId 
        ? (store?.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
        : (company?.address && company.address.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesSearch = (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (job.jobDescription && job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           getCompanyName(job.companyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           getStoreName(job.storeId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           addressMatch ||
                           (store?.nearestStation && store.nearestStation.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      const matchesEmploymentType = employmentTypeFilter === 'all' || job.employmentType === employmentTypeFilter
      const matchesConsultant = consultantFilter === 'all' || job.createdBy === consultantFilter

      return matchesSearch && matchesStatus && matchesEmploymentType && matchesConsultant
    })
  }, [jobs, stores, searchTerm, statusFilter, employmentTypeFilter, consultantFilter])

  // isAllSelectedをuseMemoで計算（filteredJobsに依存）
  const isAllSelectedCalculated = useMemo(() => {
    return selectedJobs.size === filteredJobs.length && filteredJobs.length > 0
  }, [selectedJobs, filteredJobs])

  // 一括選択関連の関数
  const handleSelectAll = () => {
    if (!isAdmin) return
    
    if (isAllSelectedCalculated) {
      setSelectedJobs(new Set())
    } else {
      const filteredJobIds = filteredJobs.map(job => job.id)
      setSelectedJobs(new Set(filteredJobIds))
    }
  }

  const handleSelectJob = (jobId: string) => {
    if (!isAdmin) return
    
    const newSelected = new Set(selectedJobs)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else {
      newSelected.add(jobId)
    }
    setSelectedJobs(newSelected)
  }

  // 実際のデータから雇用形態のオプションを動的に作成
  const availableEmploymentTypes = Array.from(
    new Set(jobs.filter(job => job.employmentType && job.employmentType.trim()).map(job => job.employmentType!))
  ).sort()

  const getStatusBadge = (status: Job['status']) => {
    const color = statusColors[status] || 'bg-gray-100 text-gray-800'
    return (
      <Badge className={color}>
        {jobStatusLabels[status]}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">求人データを読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ページヘッダー - 紫系テーマ */}
      <div className="mb-8 p-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Briefcase className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">求人管理</h1>
              <p className="text-purple-100 mt-1">
                求人情報の管理・検索・マッチング
              </p>
            </div>
          </div>
          
          {/* ヘッダーアクション */}
          <div className="flex flex-col sm:flex-col gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
                <Checkbox
                  checked={isAllSelectedCalculated}
                  onCheckedChange={handleSelectAll}
                  id="select-all-header"
                />
                <label htmlFor="select-all-header" className="text-sm text-white cursor-pointer">
                  全て選択 ({selectedJobs.size}件)
                </label>
                {selectedJobs.size > 0 && (
                  <Button
                    onClick={exportSelectedJobsCSV}
                    variant="outline"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700 border-green-600 ml-2"
                  >
                    CSV出力 ({selectedJobs.size}件)
                  </Button>
                )}
              </div>
            )}
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button
                variant="outline"
                className="bg-white text-purple-600 hover:bg-purple-50 border-white flex items-center gap-2"
                disabled={csvImporting}
                asChild
              >
                <span>
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
                </span>
              </Button>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleCSVImport(file)
                  e.target.value = '' // リセット
                }
              }}
            />
            <Link href="/jobs/new">
              <Button variant="outline" className="bg-white text-purple-600 hover:bg-purple-50 border-white">
                <Plus className="h-4 w-4 mr-2" />
                新規求人追加
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            検索・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <Label htmlFor="job-search">求人名/企業名/住所</Label>
              <Input
                id="job-search"
                placeholder="求人名・企業名・住所で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* ステータスフィルター */}
            <div>
              <Label htmlFor="status-filter">ステータス</Label>
              <Select value={statusFilter} onValueChange={(value: Job['status'] | 'all') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのステータス</SelectItem>
                  {Object.entries(jobStatusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 雇用形態フィルター */}
            <div>
              <Label htmlFor="employment-type-filter">雇用形態</Label>
              <Select value={employmentTypeFilter} onValueChange={(value: Job['employmentType'] | 'all') => setEmploymentTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="雇用形態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての雇用形態</SelectItem>
                  {availableEmploymentTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 担当者フィルター */}
            <div>
              <Label htmlFor="consultant-filter">担当者</Label>
              <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての担当者</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 求人リスト */}
      <Card>
        <CardHeader>
          <CardTitle>求人リスト ({filteredJobs.length}件)</CardTitle>
          <CardDescription>
            登録求人の一覧と管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {jobs.length === 0 ? '求人が登録されていません' : '検索条件に一致する求人がありません'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelectedCalculated}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>ステータス</TableHead>
                  <TableHead>求人名</TableHead>
                  <TableHead>店舗名/企業名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>入力率</TableHead>
                  <TableHead>契約状況</TableHead>
                  <TableHead>雇用形態</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const company = getCompany(job.companyId)
                  const isFreeOnly = company?.contractType === 'free_only'
                  
                  return (
                    <TableRow key={job.id} className={isFreeOnly ? 'bg-gray-100' : ''}>
                      {isAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedJobs.has(job.id)}
                            onCheckedChange={() => handleSelectJob(job.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/jobs/${job.id}`} className="hover:text-purple-600 transition-colors">
                          <div className="font-semibold hover:underline">{job.title}</div>
                          {/* <div className="text-sm text-gray-500 truncate max-w-xs">
                            {job.jobDescription || '詳細未入力'}
                          </div> */}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {job.storeId ? (
                          <Link href={`/stores/${job.storeId}`} className="hover:text-purple-600 hover:underline transition-colors">
                            {getStoreName(job.storeId)}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          <Link href={`/companies/${job.companyId}`} className="hover:text-purple-600 hover:underline transition-colors">
                            {getCompanyName(job.companyId)}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {getAddress(job)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const rate = calculateCompletionRate(job)
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                                <div 
                                  className={`h-2 ${
                                    rate >= 80 ? 'bg-green-500' :
                                    rate >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${rate}%` }} 
                                />
                              </div>
                              <span className={`text-sm font-medium ${
                                rate >= 80 ? 'text-green-600' :
                                rate >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {rate}%
                              </span>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {company?.contractType ? (
                          <Badge className={company.contractType === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}>
                            {company.contractType === 'paid' ? '有料紹介可' : '無料のみ'}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">未設定</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {job.employmentType || '未設定'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/jobs/${job.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateJob(job)}
                            className="text-blue-600 hover:text-blue-700"
                            title="複製"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteJob(job)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
