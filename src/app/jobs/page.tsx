"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Pagination } from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
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
  Copy,
  User as UserIcon,
  ChevronDown,
  Map,
  List,
  Check,
  ChevronsUpDown
} from 'lucide-react'
import { Job, jobStatusLabels } from '@/types/job'
import { getJobs, deleteJob, updateJob } from '@/lib/firestore/jobs'
import { getCompanies } from '@/lib/firestore/companies'
import { getStores } from '@/lib/firestore/stores'
import { getUsers } from '@/lib/firestore/users'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { User } from '@/types/user'
import { importJobsFromCSV, generateJobsCSVTemplate } from '@/lib/csv/jobs'
import { toast } from 'sonner'
import { JobMapView } from '@/components/maps/JobMapView'

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
}

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      }>
        <JobsPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function JobsPageContent() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)
  
  // 表示モード切り替え
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  
  // 一括選択状態
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  
  // 一括ステータス変更用の状態
  const [bulkStatusChangeDialogOpen, setBulkStatusChangeDialogOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<Job['status']>('active')
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false)
  
  // ページネーション状態（URLパラメータから初期化）
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [itemsPerPage] = useState(50) // 1ページあたり50件
  
  // フィルター・検索状態（URLパラメータから初期化）
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<Job['status'] | 'all'>((searchParams.get('status') as Job['status']) || 'all')
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<Set<Job['employmentType']>>(() => {
    const param = searchParams.get('employmentType')
    if (param && param !== 'all') {
      return new Set(param.split(',') as Job['employmentType'][])
    }
    return new Set()
  })
  const [consultantFilter, setConsultantFilter] = useState<string>(searchParams.get('consultant') || 'all')
  const [ageLimitFilter, setAgeLimitFilter] = useState<string>(searchParams.get('ageLimit') || 'all')
  
  // 店舗条件フィルター
  const [unitPriceLunchMin, setUnitPriceLunchMin] = useState<string>('')
  const [unitPriceLunchMax, setUnitPriceLunchMax] = useState<string>('')
  const [unitPriceDinnerMin, setUnitPriceDinnerMin] = useState<string>('')
  const [unitPriceDinnerMax, setUnitPriceDinnerMax] = useState<string>('')
  const [reservationSystemFilter, setReservationSystemFilter] = useState<string>('all')
  
  // 企業条件フィルター
  const [housingSupportFilter, setHousingSupportFilter] = useState<string>('all')
  const [independenceSupportFilter, setIndependenceSupportFilter] = useState<string>('all')
  
  // 食べログURL例外理由フィルター
  const [tabelogExceptionFilter, setTabelogExceptionFilter] = useState<string>('all')
  
  // タグフィルター（複数選択）
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())

  // ソート状態
  const [sortBy, setSortBy] = useState<'title' | 'companyName' | 'storeName' | 'status' | 'createdAt' | 'updatedAt'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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

  // URLパラメータを更新する関数
  const updateURLParams = (params: { 
    search?: string
    status?: string
    employmentType?: string
    consultant?: string
    ageLimit?: string
  }) => {
    const newParams = new URLSearchParams()
    
    if (params.search) newParams.set('search', params.search)
    if (params.status && params.status !== 'all') newParams.set('status', params.status)
    if (params.employmentType && params.employmentType !== 'all' && params.employmentType !== '') newParams.set('employmentType', params.employmentType)
    if (params.consultant && params.consultant !== 'all') newParams.set('consultant', params.consultant)
    if (params.ageLimit && params.ageLimit !== 'all') newParams.set('ageLimit', params.ageLimit)
    
    router.push(`/jobs?${newParams.toString()}`)
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

  // 一括ステータス変更
  const handleBulkStatusChange = async () => {
    if (selectedJobs.size === 0) {
      toast.error('求人を選択してください')
      return
    }

    setBulkStatusChanging(true)
    try {
      const selectedJobIds = Array.from(selectedJobs)
      const updatePromises = selectedJobIds.map(jobId => 
        updateJob(jobId, { status: bulkStatusValue })
      )
      
      await Promise.all(updatePromises)
      
      toast.success(`${selectedJobs.size}件の求人ステータスを「${jobStatusLabels[bulkStatusValue]}」に変更しました`)
      
      // データを再読み込み
      await loadData()
      
      // 選択をクリア
      setSelectedJobs(new Set())
      setBulkStatusChangeDialogOpen(false)
    } catch (error) {
      console.error('一括ステータス変更エラー:', error)
      toast.error('ステータスの変更に失敗しました')
    } finally {
      setBulkStatusChanging(false)
    }
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
    if (!store) return '不明な店舗'
    return store.prefecture ? `${store.name}【${store.prefecture}】` : store.name
  }

  const getConsultantName = (userId?: string) => {
    if (!userId) return '未設定'
    const user = users.find(u => u.id === userId)
    return user?.displayName || user?.email || '不明な担当者'
  }

  const getAddress = (job: Job) => {
    // 複数店舗に対応: storeIdsまたはstoreIdから店舗を取得
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
    
    if (storeIds.length > 0) {
      const firstStore = stores.find(s => s.id === storeIds[0])
      if (firstStore?.address) {
        // 複数店舗の場合は件数も表示
        return storeIds.length > 1 
          ? `${firstStore.address} 他${storeIds.length - 1}店舗`
          : firstStore.address
      }
    }
    
    // 店舗が紐付いていない場合は企業の住所
    const company = companies.find(c => c.id === job.companyId)
    return company?.address || '-'
  }

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const newParams = new URLSearchParams()
    
    if (searchTerm) newParams.set('search', searchTerm)
    if (statusFilter !== 'all') newParams.set('status', statusFilter)
    if (employmentTypeFilter.size > 0) newParams.set('employmentType', Array.from(employmentTypeFilter).join(','))
    if (consultantFilter !== 'all') newParams.set('consultant', consultantFilter)
    if (ageLimitFilter !== 'all') newParams.set('ageLimit', ageLimitFilter)
    if (page > 1) newParams.set('page', page.toString())
    
    router.push(`/jobs?${newParams.toString()}`)
  }

  // フィルタリングとソートされた求人リストをuseMemoで計算
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 複数店舗対応: 最初の店舗を使用
      const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
      const store = storeIds.length > 0 ? stores.find(s => s.id === storeIds[0]) : undefined
      const company = companies.find(c => c.id === job.companyId)
      
      // 住所の検索: 店舗の住所がある場合はそれを、ない場合は企業の住所を検索対象に含める
      const addressMatch = store?.address 
        ? store.address.toLowerCase().includes(searchTerm.toLowerCase())
        : (company?.address && company.address.toLowerCase().includes(searchTerm.toLowerCase()))
      
      // 店舗名の検索（複数店舗の場合はいずれかにマッチすれば可）
      const storeNameMatch = storeIds.some(storeId => 
        getStoreName(storeId).toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      const matchesSearch = (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (job.jobDescription && job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           getCompanyName(job.companyId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           storeNameMatch ||
                           addressMatch ||
                           (store?.nearestStation && store.nearestStation.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      
      // 雇用形態フィルター: 求人の雇用形態（カンマ区切り）のいずれかが、選択されたフィルターに含まれているかチェック
      const matchesEmploymentType = employmentTypeFilter.size === 0 || (() => {
        if (!job.employmentType) return false
        const jobTypes = job.employmentType.split(',').map(t => t.trim())
        return jobTypes.some(type => employmentTypeFilter.has(type))
      })()
      // 企業の担当者でフィルタリング
      const matchesConsultant = consultantFilter === 'all' || company?.consultantId === consultantFilter

      // 年齢上限フィルター
      let matchesAgeLimit = true
      if (ageLimitFilter !== 'all') {
        if (ageLimitFilter === 'none') {
          matchesAgeLimit = !job.ageLimit
        } else if (ageLimitFilter === 'exists') {
          matchesAgeLimit = !!job.ageLimit
        }
      }

      // 店舗条件フィルター（店舗がある求人のみ・最初の店舗を使用）
      let matchesStoreConditions = true
      if (store) {
        // ランチ単価の範囲チェック
        if (unitPriceLunchMin && store.unitPriceLunch) {
          matchesStoreConditions = matchesStoreConditions && store.unitPriceLunch >= parseInt(unitPriceLunchMin)
        }
        if (unitPriceLunchMax && store.unitPriceLunch) {
          matchesStoreConditions = matchesStoreConditions && store.unitPriceLunch <= parseInt(unitPriceLunchMax)
        }
        
        // ディナー単価の範囲チェック
        if (unitPriceDinnerMin && store.unitPriceDinner) {
          matchesStoreConditions = matchesStoreConditions && store.unitPriceDinner >= parseInt(unitPriceDinnerMin)
        }
        if (unitPriceDinnerMax && store.unitPriceDinner) {
          matchesStoreConditions = matchesStoreConditions && store.unitPriceDinner <= parseInt(unitPriceDinnerMax)
        }
        
        // 予約制フィルター
        if (reservationSystemFilter !== 'all') {
          const hasReservation = store.isReservationRequired === true
          if (reservationSystemFilter === 'yes') {
            matchesStoreConditions = matchesStoreConditions && hasReservation
          } else if (reservationSystemFilter === 'no') {
            matchesStoreConditions = matchesStoreConditions && !hasReservation
          }
        }
      } else if (unitPriceLunchMin || unitPriceLunchMax || unitPriceDinnerMin || unitPriceDinnerMax || reservationSystemFilter !== 'all') {
        // 店舗条件が指定されているが、この求人に店舗が紐付いていない場合は除外
        matchesStoreConditions = false
      }

      // 企業条件フィルター
      let matchesCompanyConditions = true
      if (company) {
        // 福利厚生（寮・家賃保証）の有無
        if (housingSupportFilter !== 'all') {
          const hasHousingSupport = company.hasHousingSupport === true
          if (housingSupportFilter === 'yes') {
            matchesCompanyConditions = matchesCompanyConditions && hasHousingSupport
          } else if (housingSupportFilter === 'no') {
            matchesCompanyConditions = matchesCompanyConditions && !hasHousingSupport
          }
        }
        
        // 独立支援の有無
        if (independenceSupportFilter !== 'all') {
          const hasIndependenceSupport = company.hasIndependenceSupport === true
          if (independenceSupportFilter === 'yes') {
            matchesCompanyConditions = matchesCompanyConditions && hasIndependenceSupport
          } else if (independenceSupportFilter === 'no') {
            matchesCompanyConditions = matchesCompanyConditions && !hasIndependenceSupport
          }
        }
      }

      // 食べログURL例外理由フィルター（複数店舗対応）
      let matchesTabelogException = true
      if (tabelogExceptionFilter !== 'all') {
        if (storeIds.length > 0) {
          // いずれかの店舗が条件に一致すればOK
          matchesTabelogException = storeIds.some(storeId => {
            const s = stores.find(st => st.id === storeId)
            return s && s.tabelogUrlException === tabelogExceptionFilter
          })
        } else {
          // 店舗が紐付いていない場合はマッチしない
          matchesTabelogException = false
        }
      }

      // タグフィルター（複数選択）
      let matchesTag = true
      if (tagFilter.size > 0) {
        matchesTag = job.tags ? job.tags.some(tag => tagFilter.has(tag)) : false
      }

      return matchesSearch && matchesStatus && matchesEmploymentType && matchesConsultant && matchesAgeLimit && matchesStoreConditions && matchesCompanyConditions && matchesTabelogException && matchesTag
    }).sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'title':
          aValue = (a.title || '').toLowerCase()
          bValue = (b.title || '').toLowerCase()
          break
        case 'companyName':
          aValue = getCompanyName(a.companyId).toLowerCase()
          bValue = getCompanyName(b.companyId).toLowerCase()
          break
        case 'storeName':
          // 複数店舗対応: 最初の店舗名でソート
          const aStoreIds = a.storeIds || (a.storeId ? [a.storeId] : [])
          const bStoreIds = b.storeIds || (b.storeId ? [b.storeId] : [])
          aValue = aStoreIds.length > 0 ? getStoreName(aStoreIds[0]).toLowerCase() : ''
          bValue = bStoreIds.length > 0 ? getStoreName(bStoreIds[0]).toLowerCase() : ''
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [jobs, stores, companies, searchTerm, statusFilter, Array.from(employmentTypeFilter).join(','), consultantFilter, ageLimitFilter, 
      unitPriceLunchMin, unitPriceLunchMax, unitPriceDinnerMin, unitPriceDinnerMax, reservationSystemFilter,
      housingSupportFilter, independenceSupportFilter, tabelogExceptionFilter, tagFilter, sortBy, sortOrder])

  // ページネーション処理
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // フィルター変更時はページを1に戻す（初回ロード時は除外）
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setCurrentPage(1)
    handlePageChange(1)
  }, [searchTerm, statusFilter, Array.from(employmentTypeFilter).join(','), consultantFilter, ageLimitFilter,
      unitPriceLunchMin, unitPriceLunchMax, unitPriceDinnerMin, unitPriceDinnerMax,
      reservationSystemFilter, housingSupportFilter, independenceSupportFilter, tabelogExceptionFilter, tagFilter])

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
      {/* ページヘッダー */}
      <div className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white">
        <div className="flex justify-between items-center gap-4">
          {/* タイトル部分 */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-full">
              <Briefcase className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">求人管理</h1>
              <p className="text-purple-100 mt-1 text-xs sm:text-sm">
                求人情報の管理・検索・マッチング
              </p>
            </div>
          </div>
          
          {/* ヘッダーアクション */}
          <div className="flex flex-col gap-2">
            {isAdmin && selectedJobs.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-white/20 rounded-lg p-2">
                <Checkbox
                  checked={isAllSelectedCalculated}
                  onCheckedChange={handleSelectAll}
                  id="select-all-header"
                />
                <label htmlFor="select-all-header" className="text-xs sm:text-sm text-white cursor-pointer whitespace-nowrap">
                  全て選択 ({selectedJobs.size}件)
                </label>
                <Button
                  onClick={() => setBulkStatusChangeDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600 text-xs"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ステータス変更
                </Button>
                <Button
                  onClick={exportSelectedJobsCSV}
                  variant="outline"
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700 border-green-600 text-xs"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  CSV出力
                </Button>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={loadData}
                variant="outline"
                size="sm"
                className="bg-white text-purple-600 hover:bg-purple-50 border-white flex items-center gap-1 text-xs sm:text-sm"
                title="最新データを取得"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">更新</span>
              </Button>
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-purple-600 hover:bg-purple-50 border-white flex items-center gap-1 text-xs sm:text-sm"
                  disabled={csvImporting}
                  asChild
                >
                  <span>
                    {csvImporting ? (
                      <>
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden sm:inline">インポート中...</span>
                        <span className="sm:hidden">処理中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">CSVインポート</span>
                        <span className="sm:hidden">インポート</span>
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
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white text-purple-600 hover:bg-purple-50 border-white text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">新規求人追加</span>
                  <span className="sm:hidden">新規追加</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 表示モード切り替えタブ */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setViewMode('list')}
          className={`px-6 py-3 font-medium transition-colors ${
            viewMode === 'list'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="h-4 w-4 inline mr-2" />
          リスト表示
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-6 py-3 font-medium transition-colors ${
            viewMode === 'map'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Map className="h-4 w-4 inline mr-2" />
          マップ表示
        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 検索 */}
            <div>
              <Label htmlFor="job-search">求人名/企業名/住所</Label>
              <Input
                id="job-search"
                placeholder="求人名・企業名・住所で検索..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchTerm(value)
                  updateURLParams({ search: value, status: statusFilter, employmentType: Array.from(employmentTypeFilter).join(','), consultant: consultantFilter, ageLimit: ageLimitFilter })
                }}
                className="w-full"
              />
            </div>
            
            {/* ステータスフィルター */}
            <div>
              <Label htmlFor="status-filter">ステータス</Label>
              <Select value={statusFilter} onValueChange={(value: Job['status'] | 'all') => {
                setStatusFilter(value)
                updateURLParams({ search: searchTerm, status: value, employmentType: Array.from(employmentTypeFilter).join(','), consultant: consultantFilter, ageLimit: ageLimitFilter })
              }}>
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
              <Label>雇用形態</Label>
              <div className="border rounded-md p-3 space-y-2 bg-white">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="employment-fulltime"
                    checked={employmentTypeFilter.has('full-time')}
                    onCheckedChange={(checked) => {
                      const newFilter = new Set(employmentTypeFilter)
                      if (checked) {
                        newFilter.add('full-time')
                      } else {
                        newFilter.delete('full-time')
                      }
                      setEmploymentTypeFilter(newFilter)
                      updateURLParams({ 
                        search: searchTerm, 
                        status: statusFilter, 
                        employmentType: Array.from(newFilter).join(','), 
                        consultant: consultantFilter, 
                        ageLimit: ageLimitFilter 
                      })
                    }}
                  />
                  <label
                    htmlFor="employment-fulltime"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    正社員
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="employment-contract"
                    checked={employmentTypeFilter.has('contract')}
                    onCheckedChange={(checked) => {
                      const newFilter = new Set(employmentTypeFilter)
                      if (checked) {
                        newFilter.add('contract')
                      } else {
                        newFilter.delete('contract')
                      }
                      setEmploymentTypeFilter(newFilter)
                      updateURLParams({ 
                        search: searchTerm, 
                        status: statusFilter, 
                        employmentType: Array.from(newFilter).join(','), 
                        consultant: consultantFilter, 
                        ageLimit: ageLimitFilter 
                      })
                    }}
                  />
                  <label
                    htmlFor="employment-contract"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    契約社員
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="employment-parttime"
                    checked={employmentTypeFilter.has('part-time')}
                    onCheckedChange={(checked) => {
                      const newFilter = new Set(employmentTypeFilter)
                      if (checked) {
                        newFilter.add('part-time')
                      } else {
                        newFilter.delete('part-time')
                      }
                      setEmploymentTypeFilter(newFilter)
                      updateURLParams({ 
                        search: searchTerm, 
                        status: statusFilter, 
                        employmentType: Array.from(newFilter).join(','), 
                        consultant: consultantFilter, 
                        ageLimit: ageLimitFilter 
                      })
                    }}
                  />
                  <label
                    htmlFor="employment-parttime"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    アルバイト
                  </label>
                </div>
              </div>
            </div>
            
            {/* 担当者フィルター */}
            <div>
              <Label htmlFor="consultant-filter">担当者</Label>
              <Select value={consultantFilter} onValueChange={(value) => {
                setConsultantFilter(value)
                updateURLParams({ search: searchTerm, status: statusFilter, employmentType: Array.from(employmentTypeFilter).join(','), consultant: value, ageLimit: ageLimitFilter })
              }}>
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

            {/* 年齢上限フィルター */}
            <div>
              <Label htmlFor="age-limit-filter">年齢上限</Label>
              <Select value={ageLimitFilter} onValueChange={(value) => {
                setAgeLimitFilter(value)
                updateURLParams({ search: searchTerm, status: statusFilter, employmentType: Array.from(employmentTypeFilter).join(','), consultant: consultantFilter, ageLimit: value })
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="年齢上限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="exists">年齢上限あり</SelectItem>
                  <SelectItem value="none">年齢上限なし</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 店舗条件フィルター（アコーディオン） */}
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="store-conditions">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  店舗条件で絞り込み
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* ランチ単価 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">ランチ単価（円）</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="最小"
                        value={unitPriceLunchMin}
                        onChange={(e) => setUnitPriceLunchMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="number"
                        placeholder="最大"
                        value={unitPriceLunchMax}
                        onChange={(e) => setUnitPriceLunchMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* ディナー単価 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">ディナー単価（円）</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="最小"
                        value={unitPriceDinnerMin}
                        onChange={(e) => setUnitPriceDinnerMin(e.target.value)}
                        className="w-full"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="number"
                        placeholder="最大"
                        value={unitPriceDinnerMax}
                        onChange={(e) => setUnitPriceDinnerMax(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* 予約制 */}
                  <div>
                    <Label htmlFor="reservation-system-filter" className="text-sm font-medium mb-2 block">予約制</Label>
                    <Select value={reservationSystemFilter} onValueChange={setReservationSystemFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="予約制" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="yes">予約制のみ</SelectItem>
                        <SelectItem value="no">予約制以外</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* クリアボタン */}
                {(unitPriceLunchMin || unitPriceLunchMax || unitPriceDinnerMin || unitPriceDinnerMax || reservationSystemFilter !== 'all') && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUnitPriceLunchMin('')
                        setUnitPriceLunchMax('')
                        setUnitPriceDinnerMin('')
                        setUnitPriceDinnerMax('')
                        setReservationSystemFilter('all')
                      }}
                    >
                      店舗条件をクリア
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* 企業条件フィルター（アコーディオン） */}
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="company-conditions">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  企業条件で絞り込み
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {/* 福利厚生（寮・家賃保証） */}
                  <div>
                    <Label htmlFor="housing-support-filter" className="text-sm font-medium mb-2 block">福利厚生（寮・家賃保証）</Label>
                    <Select value={housingSupportFilter} onValueChange={setHousingSupportFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="福利厚生" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="yes">あり</SelectItem>
                        <SelectItem value="no">なし</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 独立支援 */}
                  <div>
                    <Label htmlFor="independence-support-filter" className="text-sm font-medium mb-2 block">独立支援</Label>
                    <Select value={independenceSupportFilter} onValueChange={setIndependenceSupportFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="独立支援" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="yes">あり</SelectItem>
                        <SelectItem value="no">なし</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* クリアボタン */}
                {(housingSupportFilter !== 'all' || independenceSupportFilter !== 'all') && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHousingSupportFilter('all')
                        setIndependenceSupportFilter('all')
                      }}
                    >
                      企業条件をクリア
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            {/* その他フィルター */}
            <AccordionItem value="other-filters">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  その他の条件で絞り込み
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {/* 食べログURL例外理由 */}
                  <div>
                    <Label htmlFor="tabelog-exception-filter" className="text-sm font-medium mb-2 block">食べログURL例外理由</Label>
                    <Select value={tabelogExceptionFilter} onValueChange={setTabelogExceptionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="例外理由" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="旅館">旅館</SelectItem>
                        <SelectItem value="新店舗">新店舗</SelectItem>
                        <SelectItem value="海外">海外</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* タグ検索（複数選択） */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">タグで検索</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {tagFilter.size > 0 
                            ? `${tagFilter.size}件選択中` 
                            : "タグを選択..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                const newSet = new Set(tagFilter)
                                if (newSet.has('ミシュラン獲得店')) {
                                  newSet.delete('ミシュラン獲得店')
                                } else {
                                  newSet.add('ミシュラン獲得店')
                                }
                                setTagFilter(newSet)
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={tagFilter.has('ミシュラン獲得店')}
                                className="mr-2"
                              />
                              ミシュラン獲得店
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                const newSet = new Set(tagFilter)
                                if (newSet.has('ミシュランビブグルマン獲得店')) {
                                  newSet.delete('ミシュランビブグルマン獲得店')
                                } else {
                                  newSet.add('ミシュランビブグルマン獲得店')
                                }
                                setTagFilter(newSet)
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={tagFilter.has('ミシュランビブグルマン獲得店')}
                                className="mr-2"
                              />
                              ミシュランビブグルマン獲得店
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                const newSet = new Set(tagFilter)
                                if (newSet.has('食べログ100名店掲載店')) {
                                  newSet.delete('食べログ100名店掲載店')
                                } else {
                                  newSet.add('食べログ100名店掲載店')
                                }
                                setTagFilter(newSet)
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={tagFilter.has('食べログ100名店掲載店')}
                                className="mr-2"
                              />
                              食べログ100名店掲載店
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                const newSet = new Set(tagFilter)
                                if (newSet.has('食べログアワード獲得店')) {
                                  newSet.delete('食べログアワード獲得店')
                                } else {
                                  newSet.add('食べログアワード獲得店')
                                }
                                setTagFilter(newSet)
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={tagFilter.has('食べログアワード獲得店')}
                                className="mr-2"
                              />
                              食べログアワード獲得店
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                const newSet = new Set(tagFilter)
                                if (newSet.has('ゴ・エ・ミヨ掲載店')) {
                                  newSet.delete('ゴ・エ・ミヨ掲載店')
                                } else {
                                  newSet.add('ゴ・エ・ミヨ掲載店')
                                }
                                setTagFilter(newSet)
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={tagFilter.has('ゴ・エ・ミヨ掲載店')}
                                className="mr-2"
                              />
                              ゴ・エ・ミヨ掲載店
                            </CommandItem>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* クリアボタン */}
                {(tabelogExceptionFilter !== 'all' || tagFilter.size > 0) && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTabelogExceptionFilter('all')
                        setTagFilter(new Set())
                      }}
                    >
                      その他条件をクリア
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* マップ表示 */}
      {viewMode === 'map' && (
        <div className="mb-6">
          <JobMapView 
            jobs={filteredJobs} 
            stores={stores} 
            companies={companies}
            onJobClick={(jobId) => {
              // マーカークリック時の処理（必要に応じて）
              console.log('Job clicked:', jobId)
            }}
          />
        </div>
      )}

      {/* 求人リスト */}
      {viewMode === 'list' && (
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
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      ステータス
                      {sortBy === 'status' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      求人名
                      {sortBy === 'title' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('storeName')}
                  >
                    <div className="flex items-center gap-1">
                      店舗名/企業名
                      {sortBy === 'storeName' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>入力率</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>契約状況</TableHead>
                  <TableHead>雇用形態</TableHead>
                  <TableHead>年齢上限</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedJobs.map((job) => {
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
                        {(() => {
                          const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
                          if (storeIds.length === 0) {
                            return <span className="text-gray-400">-</span>
                          } else if (storeIds.length === 1) {
                            return (
                              <Link href={`/stores/${storeIds[0]}`} className="hover:text-purple-600 hover:underline transition-colors">
                                {getStoreName(storeIds[0])}
                              </Link>
                            )
                          } else {
                            return (
                              <div>
                                <Link href={`/stores/${storeIds[0]}`} className="hover:text-purple-600 hover:underline transition-colors">
                                  {getStoreName(storeIds[0])}
                                </Link>
                                <span className="text-sm text-gray-500 ml-1">
                                  他{storeIds.length - 1}店舗
                                </span>
                              </div>
                            )
                          }
                        })()}
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
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {company?.consultantId 
                              ? (users.find(u => u.id === company.consultantId)?.displayName || 
                                 users.find(u => u.id === company.consultantId)?.email || 
                                 '不明')
                              : '-'
                            }
                          </span>
                        </div>
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
                      <TableCell>
                        {job.ageLimit ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-amber-700">{job.ageLimit}歳</span>
                            {job.ageNote && (
                              <span className="text-xs text-gray-500" title={job.ageNote}>
                                ℹ️
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
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
          
          {/* ページネーション */}
          {filteredJobs.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                totalItems={filteredJobs.length}
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* 一括ステータス変更ダイアログ */}
      <Dialog open={bulkStatusChangeDialogOpen} onOpenChange={setBulkStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選択した求人のステータスを一括変更</DialogTitle>
            <DialogDescription>
              {selectedJobs.size}件の求人のステータスを変更します
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-status">新しいステータス</Label>
              <Select
                value={bulkStatusValue}
                onValueChange={(value) => setBulkStatusValue(value as Job['status'])}
              >
                <SelectTrigger id="bulk-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="active">公開中</SelectItem>
                  <SelectItem value="closed">募集終了</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkStatusChangeDialogOpen(false)}
              disabled={bulkStatusChanging}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={bulkStatusChanging}
            >
              {bulkStatusChanging ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  変更中...
                </>
              ) : (
                '変更する'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
