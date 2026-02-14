"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Job } from '@/types/job'
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
import { JobsHeader } from '@/components/jobs/JobsHeader'
import { JobsSourceTypeFilter } from '@/components/jobs/JobsSourceTypeFilter'
import { JobsViewModeToggle } from '@/components/jobs/JobsViewModeToggle'
import { JobsSearchFilters } from '@/components/jobs/JobsSearchFilters'
import { JobsTableSection } from '@/components/jobs/JobsTableSection'
import { BulkStatusChangeDialog } from '@/components/jobs/BulkStatusChangeDialog'
import { jobFieldKeys, SortBy } from '@/components/jobs/constants'
import { FilterState } from '@/components/jobs/types'

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
  
  // データ
  const [jobs, setJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)

  // 表示モード
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  // 一括選択
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())

  // ページネーション
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [itemsPerPage] = useState(50)

  // フィルター状態
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: searchParams.get('search') || '',
    statusFilter: (searchParams.get('status') as Job['status']) || 'all',
    sourceTypeFilter: searchParams.get('sourceType') || 'all',
    employmentTypeFilter: (() => {
      const param = searchParams.get('employmentType')
      if (param && param !== 'all') {
        return new Set(param.split(',') as string[])
      }
      return new Set()
    })(),
    consultantFilter: searchParams.get('consultant') || 'all',
    ageLimitFilter: searchParams.get('ageLimit') || 'all',
    unitPriceLunchMin: '',
    unitPriceLunchMax: '',
    unitPriceDinnerMin: '',
    unitPriceDinnerMax: '',
    reservationSystemFilter: 'all',
    housingSupportFilter: 'all',
    independenceSupportFilter: 'all',
    tabelogExceptionFilter: 'all',
    tagFilter: new Set(),
    flagFilter: new Set(),
  })

  // ソート状態
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 一括ステータス変更
  const [bulkStatusChangeDialogOpen, setBulkStatusChangeDialogOpen] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<Job['status']>('active')
  const [bulkStatusChanging, setBulkStatusChanging] = useState(false)

  // ソートハンドラー
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // フィルター状態更新ハンドラー
  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }))
  }

  // URLパラメータ更新
  const updateURLParams = (params: Record<string, string | number>) => {
    const newParams = new URLSearchParams()
    
    if (params.search) newParams.set('search', String(params.search))
    if (params.status && params.status !== 'all') newParams.set('status', String(params.status))
    if (params.employmentType && params.employmentType !== 'all' && params.employmentType !== '') newParams.set('employmentType', String(params.employmentType))
    if (params.consultant && params.consultant !== 'all') newParams.set('consultant', String(params.consultant))
    if (params.ageLimit && params.ageLimit !== 'all') newParams.set('ageLimit', String(params.ageLimit))
    
    router.push(`/jobs?${newParams.toString()}`)
  }

  // データロード
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

  // CSV インポート
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
      
      await loadData()
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
    }
  }

  // CSV エクスポート
  const exportSelectedJobsCSV = () => {
    if (selectedJobs.size === 0) {
      toast.error('エクスポートする求人を選択してください')
      return
    }

    const selectedJobData = jobs.filter(job => selectedJobs.has(job.id))
    
    const headers = [
      'id', 'title', 'companyId', 'storeId', 'businessType', 'employmentType', 'trialPeriod',
      'workingHours', 'holidays', 'overtime', 'salaryInexperienced', 'salaryExperienced',
      'requiredSkills', 'jobDescription', 'smokingPolicy', 'insurance', 'benefits',
      'selectionProcess', 'consultantReview', 'status', 'createdBy'
    ]

    const csvRows = [
      headers.join(','),
      ...selectedJobData.map(job => {
        return headers.map(header => {
          let value: any = job[header as keyof Job] || ''
          
          if (typeof value === 'boolean') {
            value = value.toString()
          }
          
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0]
          }
          
          if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
            value = (value as any).toDate().toISOString().split('T')[0]
          }
          
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
      
      toast.success(`${selectedJobs.size}件の求人ステータスを変更しました`)
      
      await loadData()
      setSelectedJobs(new Set())
      setBulkStatusChangeDialogOpen(false)
    } catch (error) {
      console.error('一括ステータス変更エラー:', error)
      toast.error('ステータスの変更に失敗しました')
    } finally {
      setBulkStatusChanging(false)
    }
  }

  // 求人削除
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

  // 求人複製
  const handleDuplicateJob = async (job: Job) => {
    if (confirm(`${job.title}を複製しますか？`)) {
      try {
        const { id, createdAt, updatedAt, ...jobData } = job
        const duplicatedJob = {
          ...jobData,
          title: `${job.title}（コピー）`,
          status: 'draft' as const,
        }
        
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

  // Helper functions for filtering
  const getSourceTypeCount = (sourceType: string) => {
    if (sourceType === 'all') return jobs.length

    return jobs.filter(job => {
      const visibility = job.visibilityType || 'all'

      if (visibility === 'all') return true
      if (visibility === 'school_only') return sourceType === 'inshokujin_univ'
      if (visibility === 'specific_sources') {
        return job.allowedSources ? job.allowedSources.includes(sourceType) : false
      }
      return false
    }).length
  }

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    return company?.name || '不明な企業'
  }

  const getStoreName = (storeId?: string) => {
    if (!storeId) return '-'
    const store = stores.find(s => s.id === storeId)
    if (!store) return '不明な店舗'
    return store.prefecture ? `${store.name}【${store.prefecture}】` : store.name
  }

  const checkMatchesSearch = (job: Job): boolean => {
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
    const store = storeIds.length > 0 ? stores.find(s => s.id === storeIds[0]) : undefined
    const company = companies.find(c => c.id === job.companyId)

    const addressMatch = store?.address
      ? store.address.toLowerCase().includes(filterState.searchTerm.toLowerCase())
      : (company?.address && company.address.toLowerCase().includes(filterState.searchTerm.toLowerCase())) || false

    const storeNameMatch = storeIds.some(storeId =>
      getStoreName(storeId).toLowerCase().includes(filterState.searchTerm.toLowerCase())
    )

    return !!(job.title && job.title.toLowerCase().includes(filterState.searchTerm.toLowerCase())) ||
      !!(job.jobDescription && job.jobDescription.toLowerCase().includes(filterState.searchTerm.toLowerCase())) ||
      getCompanyName(job.companyId).toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
      storeNameMatch ||
      addressMatch ||
      !!(store?.nearestStation && store.nearestStation.toLowerCase().includes(filterState.searchTerm.toLowerCase()))
  }

  const checkMatchesStoreConditions = (job: Job): boolean => {
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
    const store = storeIds.length > 0 ? stores.find(s => s.id === storeIds[0]) : undefined

    if (store) {
      if (filterState.unitPriceLunchMin && store.unitPriceLunch) {
        if (store.unitPriceLunch < parseInt(filterState.unitPriceLunchMin)) return false
      }
      if (filterState.unitPriceLunchMax && store.unitPriceLunch) {
        if (store.unitPriceLunch > parseInt(filterState.unitPriceLunchMax)) return false
      }
      if (filterState.unitPriceDinnerMin && store.unitPriceDinner) {
        if (store.unitPriceDinner < parseInt(filterState.unitPriceDinnerMin)) return false
      }
      if (filterState.unitPriceDinnerMax && store.unitPriceDinner) {
        if (store.unitPriceDinner > parseInt(filterState.unitPriceDinnerMax)) return false
      }
      if (filterState.reservationSystemFilter !== 'all') {
        const hasReservation = store.isReservationRequired === true
        if (filterState.reservationSystemFilter === 'yes' && !hasReservation) return false
        if (filterState.reservationSystemFilter === 'no' && hasReservation) return false
      }
      return true
    }

    return !(filterState.unitPriceLunchMin || filterState.unitPriceLunchMax ||
      filterState.unitPriceDinnerMin || filterState.unitPriceDinnerMax ||
      filterState.reservationSystemFilter !== 'all')
  }

  // フィルタリングとソート
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
      const company = companies.find(c => c.id === job.companyId)

      const matchesSearch = checkMatchesSearch(job)
      const matchesStatus = filterState.statusFilter === 'all' || job.status === filterState.statusFilter

      const visibility = job.visibilityType || 'all'
      let matchesSourceType = true
      if (filterState.sourceTypeFilter !== 'all') {
        if (visibility === 'all') {
          matchesSourceType = true
        } else if (visibility === 'school_only') {
          matchesSourceType = filterState.sourceTypeFilter === 'inshokujin_univ'
        } else if (visibility === 'specific_sources') {
          matchesSourceType = job.allowedSources ? job.allowedSources.includes(filterState.sourceTypeFilter) : false
        } else {
          matchesSourceType = false
        }
      }

      const matchesEmploymentType = filterState.employmentTypeFilter.size === 0 || (() => {
        if (!job.employmentType) return false
        const jobTypes = job.employmentType.split(',').map(t => t.trim())
        return jobTypes.some(type => filterState.employmentTypeFilter.has(type))
      })()

      const matchesConsultant = filterState.consultantFilter === 'all' || company?.consultantId === filterState.consultantFilter

      let matchesAgeLimit = true
      if (filterState.ageLimitFilter !== 'all') {
        if (filterState.ageLimitFilter === 'none') {
          matchesAgeLimit = !job.ageLimit
        } else if (filterState.ageLimitFilter === 'exists') {
          matchesAgeLimit = !!job.ageLimit
        }
      }

      const matchesStoreConditions = checkMatchesStoreConditions(job)

      let matchesCompanyConditions = true
      if (company) {
        if (filterState.housingSupportFilter !== 'all') {
          const hasHousingSupport = company.hasHousingSupport === true
          if (filterState.housingSupportFilter === 'yes' && !hasHousingSupport) return false
          if (filterState.housingSupportFilter === 'no' && hasHousingSupport) return false
        }
        if (filterState.independenceSupportFilter !== 'all') {
          const hasIndependenceSupport = company.hasIndependenceSupport === true
          if (filterState.independenceSupportFilter === 'yes' && !hasIndependenceSupport) return false
          if (filterState.independenceSupportFilter === 'no' && hasIndependenceSupport) return false
        }
      }

      let matchesTabelogException = true
      if (filterState.tabelogExceptionFilter !== 'all') {
        if (storeIds.length > 0) {
          matchesTabelogException = storeIds.some(storeId => {
            const s = stores.find(st => st.id === storeId)
            return s && s.tabelogUrlException === filterState.tabelogExceptionFilter
          })
        } else {
          matchesTabelogException = false
        }
      }

      const matchesTag = filterState.tagFilter.size === 0 || (job.tags ? job.tags.some(tag => filterState.tagFilter.has(tag)) : false)
      const matchesFlag = filterState.flagFilter.size === 0 || Array.from(filterState.flagFilter).some(flag => job.flags?.[flag] === true)

      return matchesSearch && matchesStatus && matchesSourceType && matchesEmploymentType &&
        matchesConsultant && matchesAgeLimit && matchesStoreConditions && matchesCompanyConditions &&
        matchesTabelogException && matchesTag && matchesFlag
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
  }, [jobs, stores, companies, filterState, sortBy, sortOrder])

  // ページネーション
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // ページ変更ハンドラー
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const newParams = new URLSearchParams()

    if (filterState.searchTerm) newParams.set('search', filterState.searchTerm)
    if (filterState.statusFilter !== 'all') newParams.set('status', filterState.statusFilter)
    if (filterState.employmentTypeFilter.size > 0) newParams.set('employmentType', Array.from(filterState.employmentTypeFilter).join(','))
    if (filterState.consultantFilter !== 'all') newParams.set('consultant', filterState.consultantFilter)
    if (filterState.ageLimitFilter !== 'all') newParams.set('ageLimit', filterState.ageLimitFilter)
    if (page > 1) newParams.set('page', page.toString())

    router.push(`/jobs?${newParams.toString()}`)
  }

  // フィルター変更時はページを1に戻す
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setCurrentPage(1)
    handlePageChange(1)
  }, [filterState])

  // 一括選択状態計算
  const isAllSelected = useMemo(() => {
    return selectedJobs.size === filteredJobs.length && filteredJobs.length > 0
  }, [selectedJobs, filteredJobs])

  // 一括選択ハンドラー
  const handleSelectAll = () => {
    if (!isAdmin) return

    if (isAllSelected) {
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

  const availableEmploymentTypes = Array.from(
    new Set(jobs.filter(job => job.employmentType && job.employmentType.trim()).map(job => job.employmentType!))
  ).sort()

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
      {/* ヘッダー */}
      <JobsHeader
        isAdmin={isAdmin}
        selectedJobsCount={selectedJobs.size}
        csvImporting={csvImporting}
        onRefresh={loadData}
        onCsvImport={handleCSVImport}
        onExportCsv={exportSelectedJobsCSV}
        onBulkStatusChange={() => setBulkStatusChangeDialogOpen(true)}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
      />

      {/* 求職者区分フィルタータブ */}
      <JobsSourceTypeFilter
        sourceTypeFilter={filterState.sourceTypeFilter}
        getSourceTypeCount={getSourceTypeCount}
      />

      {/* 表示モード切り替え */}
      <JobsViewModeToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 検索・フィルター */}
      <JobsSearchFilters
        filterState={filterState}
        users={users}
        availableEmploymentTypes={availableEmploymentTypes}
        onFilterChange={handleFilterChange}
        onUpdateURLParams={updateURLParams}
      />

      {/* マップ表示 */}
      {viewMode === 'map' && (
        <div className="mb-6">
          <JobMapView
            jobs={filteredJobs}
            stores={stores}
            companies={companies}
            onJobClick={(jobId) => {
              console.log('Job clicked:', jobId)
            }}
          />
        </div>
      )}

      {/* リスト表示 */}
      {viewMode === 'list' && (
        <JobsTableSection
          paginatedJobs={paginatedJobs}
          filteredJobsLength={filteredJobs.length}
          jobs={jobs}
          stores={stores}
          companies={companies}
          users={users}
          isAdmin={isAdmin}
          selectedJobs={selectedJobs}
          isAllSelected={isAllSelected}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalPages={totalPages}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSelectAll={handleSelectAll}
          onSelectJob={handleSelectJob}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onDelete={handleDeleteJob}
          onDuplicate={handleDuplicateJob}
        />
      )}

      {/* 一括ステータス変更ダイアログ */}
      <BulkStatusChangeDialog
        open={bulkStatusChangeDialogOpen}
        onOpenChange={setBulkStatusChangeDialogOpen}
        selectedJobsCount={selectedJobs.size}
        bulkStatusValue={bulkStatusValue}
        onStatusChange={setBulkStatusValue}
        onConfirm={handleBulkStatusChange}
        isLoading={bulkStatusChanging}
      />
    </div>
  )
}
