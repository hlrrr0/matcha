"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { getCache, setCache } from '@/lib/utils/cache'
import { RefreshCw } from 'lucide-react'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { User as UserType } from '@/types/user'
import { Job } from '@/types/job'
import { getCompanies, deleteCompany, deleteMultipleCompanies } from '@/lib/firestore/companies'
import { getStoresByCompany } from '@/lib/firestore/stores'
import { getActiveUsers } from '@/lib/firestore/users'
import { getJobsByCompany } from '@/lib/firestore/jobs'
import { importCompaniesFromCSV, generateCompaniesCSVTemplate } from '@/lib/csv/companies'
import { toast } from 'sonner'
import {
  CompaniesHeader,
  CompaniesSearchFilters,
  CompaniesTable,
  CompanyDeleteDialog,
  BulkDeleteDialog,
  companyFields,
  statusLabels,
} from '@/components/companies'
import { CompanyFilters } from '@/components/companies/types'

function CompaniesPageContent() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Data states
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [userDisplayNameMap, setUserDisplayNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [csvImporting, setCsvImporting] = useState(false)

  // Filter states
  const [filters, setFilters] = useState<CompanyFilters>({
    searchTerm: searchParams.get('search') || '',
    status: (searchParams.get('status') as any) || 'all',
    size: (searchParams.get('size') as any) || 'all',
    dominoStatus: (searchParams.get('domino') as any) || 'all',
    consultantId: searchParams.get('consultant') || 'all',
  })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))

  // Sort states
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'createdAt' | 'status'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Selection states
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())

  // Store accordion states
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [companyStores, setCompanyStores] = useState<Record<string, StoreType[]>>({})
  const [loadingStores, setLoadingStores] = useState<Set<string>>(new Set())
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({})

  // Job flags
  const [companyJobFlags, setCompanyJobFlags] = useState<Record<string, { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean }>>({})

  // Initialize
  useEffect(() => {
    loadCompanies()
    loadUsers()
  }, [])

  // Load users
  const loadUsers = async () => {
    try {
      const userData = await getActiveUsers()
      setUsers(userData)
      const displayNameMap = userData.reduce((acc, user) => {
        acc[user.id] = user.displayName
        return acc
      }, {} as Record<string, string>)
      setUserDisplayNameMap(displayNameMap)
    } catch (error) {
      console.error('❌ ユーザーデータの読み込みエラー:', error)
    }
  }

  // Load companies
  const loadCompanies = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      const cacheKey = 'companies_data'

      if (!forceRefresh) {
        const cached = getCache<{ companies: any[]; storeCounts: Record<string, number> }>(cacheKey)
        if (cached) {
          console.log('📦 キャッシュからデータ読み込み')
          setCompanies(cached.companies)
          setStoreCounts(cached.storeCounts)
          setLoading(false)
          return
        }
      }

      console.log('🔄 Firestoreからデータ読み込み')
      const data = await getCompanies()
      setCompanies(data)

      // Load store counts
      const storeCountPromises = data.map(async (company) => {
        try {
          const stores = await getStoresByCompany(company.id)
          return { companyId: company.id, count: stores.length }
        } catch (error) {
          console.error(`❌ 企業「${company.name}」の店舗数取得エラー:`, error)
          return { companyId: company.id, count: 0 }
        }
      })

      const storeCountResults = await Promise.all(storeCountPromises)
      const storeCountsMap = storeCountResults.reduce(
        (acc, { companyId, count }) => {
          acc[companyId] = count
          return acc
        },
        {} as Record<string, number>
      )
      setStoreCounts(storeCountsMap)

      // Load job flags
      const jobFlagsPromises = data.map(async (company) => {
        try {
          const jobs = await getJobsByCompany(company.id)
          return {
            companyId: company.id,
            flags: {
              highDemand: jobs.some(j => j.flags?.highDemand),
              provenTrack: jobs.some(j => j.flags?.provenTrack),
              weakRelationship: jobs.some(j => j.flags?.weakRelationship),
            },
          }
        } catch (error) {
          console.error(`❌ 企業「${company.name}」の求人フラグ取得エラー:`, error)
          return {
            companyId: company.id,
            flags: { highDemand: false, provenTrack: false, weakRelationship: false },
          }
        }
      })

      const jobFlagsResults = await Promise.all(jobFlagsPromises)
      const jobFlagsMap = jobFlagsResults.reduce(
        (acc, { companyId, flags }) => {
          acc[companyId] = flags
          return acc
        },
        {} as Record<string, { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean }>
      )
      setCompanyJobFlags(jobFlagsMap)

      setCache(cacheKey, { companies: data, storeCounts: storeCountsMap })
      console.log('💾 データをキャッシュに保存')
    } catch (error) {
      console.error('❌ 企業データの読み込みエラー:', error)
      toast.error('企業データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // CSV import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('CSVファイルを選択してください')
      return
    }

    setCsvImporting(true)
    try {
      const text = await file.text()
      const result = await importCompaniesFromCSV(text)

      if (result.errors.length > 0) {
        toast.error(`インポート完了: 新規${result.success}件、更新${result.updated}件、エラー${result.errors.length}件`)
        console.error('Import errors:', result.errors)
      } else {
        const totalProcessed = result.success + result.updated
        if (result.updated > 0) {
          toast.success(`インポート完了: 新規${result.success}件、更新${result.updated}件（計${totalProcessed}件）`)
        } else {
          toast.success(`${result.success}件の企業データをインポートしました`)
        }
      }

      await loadCompanies(true)
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('CSVインポートに失敗しました')
    } finally {
      setCsvImporting(false)
    }
  }

  // Download CSV template
  const downloadCSVTemplate = () => {
    const csvContent = generateCompaniesCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'companies_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get store count
  const getStoreCount = (companyId: string): number => {
    return storeCounts[companyId] ?? 0
  }

  // Get assigned user info
  const getAssignedUser = (company: Company): UserType | undefined => {
    const assignedTo = (company as any).assignedTo
    if (assignedTo) {
      const user = users.find(u => u.id === assignedTo)
      if (user) return user
    }

    if (company.consultantId) {
      return users.find(u => u.id === company.consultantId)
    }

    return undefined
  }

  const getAssignedToDisplayName = (company: Company): string => {
    const assignedTo = (company as any).assignedTo
    if (assignedTo && userDisplayNameMap[assignedTo]) {
      return userDisplayNameMap[assignedTo]
    }
    if (assignedTo && typeof assignedTo === 'string') {
      return assignedTo
    }

    if (company.consultantId && userDisplayNameMap[company.consultantId]) {
      return userDisplayNameMap[company.consultantId]
    }

    return '-'
  }

  // Calculate completion rate
  const calculateCompletionRate = (company: Company): number => {
    let filledCount = 0
    companyFields.forEach(field => {
      const value = (company as any)[field]
      if (value !== null && value !== undefined && value !== '') {
        filledCount++
      }
    })
    return Math.round((filledCount / companyFields.length) * 100)
  }

  // Filter companies
  const filteredAndSortedCompanies = companies
    .filter(company => {
      const matchesSearch =
        (company.name && company.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (company.email && company.email.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (company.address && company.address.toLowerCase().includes(filters.searchTerm.toLowerCase()))

      const matchesStatus = filters.status === 'all' || company.status === filters.status
      const matchesSize = filters.size === 'all' || company.size === filters.size

      const matchesDomino =
        filters.dominoStatus === 'all' ||
        (filters.dominoStatus === 'connected' && company.dominoId) ||
        (filters.dominoStatus === 'not_connected' && !company.dominoId)

      const matchesConsultant =
        filters.consultantId === 'all' ||
        company.consultantId === filters.consultantId ||
        (filters.consultantId === 'unassigned' && (!company.consultantId || company.consultantId === ''))

      return matchesSearch && matchesStatus && matchesSize && matchesDomino && matchesConsultant
    })
    .sort((a, b) => {
      let valueA: string | Date
      let valueB: string | Date

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'createdAt':
          valueA = new Date(a.createdAt)
          valueB = new Date(b.createdAt)
          break
        case 'updatedAt':
          valueA = new Date(a.updatedAt)
          valueB = new Date(b.updatedAt)
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filteredAndSortedCompanies.length / 50)

  // Update URL params
  const updateURLParams = (newFilters?: Partial<CompanyFilters>, page?: number) => {
    const searchParams = new URLSearchParams()

    const currentFilters = newFilters ? { ...filters, ...newFilters } : filters
    if (currentFilters.searchTerm) searchParams.set('search', currentFilters.searchTerm)
    if (currentFilters.status !== 'all') searchParams.set('status', currentFilters.status)
    if (currentFilters.size !== 'all') searchParams.set('size', currentFilters.size)
    if (currentFilters.dominoStatus !== 'all') searchParams.set('domino', currentFilters.dominoStatus)
    if (currentFilters.consultantId !== 'all') searchParams.set('consultant', currentFilters.consultantId)
    if (page && page > 1) searchParams.set('page', page.toString())

    router.push(`/companies?${searchParams.toString()}`)
  }

  // Handle filter change
  const handleFilterChange = (newFilters: CompanyFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
    updateURLParams(newFilters, 1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateURLParams(undefined, page)
  }

  // Handle selection
  const handleSelectCompany = (id: string) => {
    const newSelected = new Set(selectedCompanies)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCompanies(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCompanies.size === filteredAndSortedCompanies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(filteredAndSortedCompanies.map(c => c.id)))
    }
  }

  // Handle store accordion
  const handleToggleExpand = async (companyId: string) => {
    const isExpanded = expandedCompanies.has(companyId)

    if (isExpanded) {
      const newExpanded = new Set(expandedCompanies)
      newExpanded.delete(companyId)
      setExpandedCompanies(newExpanded)
    } else {
      const newExpanded = new Set(expandedCompanies)
      newExpanded.add(companyId)
      setExpandedCompanies(newExpanded)

      if (!companyStores[companyId]) {
        setLoadingStores(prev => new Set([...prev, companyId]))

        try {
          const stores = await getStoresByCompany(companyId)
          setCompanyStores(prev => ({
            ...prev,
            [companyId]: stores,
          }))
        } catch (error) {
          console.error(`店舗データの読み込みに失敗しました (企業ID: ${companyId}):`, error)
          toast.error('店舗データの読み込みに失敗しました')
        } finally {
          setLoadingStores(prev => {
            const newLoading = new Set(prev)
            newLoading.delete(companyId)
            return newLoading
          })
        }
      }
    }
  }

  // Handle delete
  const handleDeleteCompany = async () => {
    if (!companyToDelete) {
      toast.error('削除対象の企業が選択されていません')
      return
    }

    try {
      await deleteCompany(companyToDelete.id)
      toast.success(`「${companyToDelete.name}」を削除しました`)
    } catch (error) {
      console.error('❌ 企業削除エラー:', error)
      toast.error(`「${companyToDelete.name}」の削除に失敗しました`)
    } finally {
      try {
        await loadCompanies(true)
      } catch (reloadError) {
        console.error('❌ 一覧再読み込みエラー:', reloadError)
        toast.error('一覧の更新に失敗しました。ページを再読み込みしてください。')
      }

      setDeleteDialogOpen(false)
      setCompanyToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCompanies.size === 0) {
      toast.error('削除する企業を選択してください')
      return
    }

    setDeletingBulk(true)

    try {
      const selectedIds = Array.from(selectedCompanies)
      const result = await deleteMultipleCompanies(selectedIds)

      if (result.errors.length > 0) {
        toast.error(`一括削除完了: 成功 ${result.success}件、エラー ${result.errors.length}件`)
        console.error('❌ 一括削除エラー:', result.errors)
      } else {
        toast.success(`${result.success}件の企業とその関連データを削除しました`)
      }
    } catch (error) {
      console.error('❌ 一括削除エラー:', error)
      toast.error(`一括削除に失敗しました: ${error}`)
    } finally {
      setDeletingBulk(false)
      setBulkDeleteDialogOpen(false)
      setSelectedCompanies(new Set())

      try {
        await loadCompanies(true)
      } catch (reloadError) {
        console.error('❌ 一覧再読み込みエラー:', reloadError)
        toast.error('一覧の更新に失敗しました。ページを再読み込みしてください。')
      }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">企業データを読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <CompaniesHeader
          isAdmin={isAdmin}
          companiesCount={companies.length}
          selectedCount={selectedCompanies.size}
          isLoading={loading}
          onRefresh={() => loadCompanies(true)}
          onCSVImport={handleCSVImport}
          onGenerateTemplate={downloadCSVTemplate}
          onDeleteClick={() => setBulkDeleteDialogOpen(true)}
        />

        <CompaniesSearchFilters
          filters={filters}
          users={users}
          onFilterChange={handleFilterChange}
        />

        <CompaniesTable
          companies={companies}
          filteredCompanies={filteredAndSortedCompanies}
          currentPage={currentPage}
          totalPages={totalPages}
          selectedCompanies={selectedCompanies}
          expandedCompanies={expandedCompanies}
          companyStores={companyStores}
          loadingStores={loadingStores}
          isAdmin={isAdmin}
          onPageChange={handlePageChange}
          onSelectCompany={handleSelectCompany}
          onSelectAll={handleSelectAll}
          onToggleExpand={handleToggleExpand}
          onEdit={() => {}}
          onDelete={(company) => {
            setCompanyToDelete(company)
            setDeleteDialogOpen(true)
          }}
          calculateCompletionRate={calculateCompletionRate}
          getStoreCount={getStoreCount}
          getAssignedUser={getAssignedUser}
          getAssignedToDisplayName={getAssignedToDisplayName}
          companyJobFlags={companyJobFlags}
        />

        <CompanyDeleteDialog
          open={deleteDialogOpen}
          company={companyToDelete}
          isDeleting={loading}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteCompany}
        />

        <BulkDeleteDialog
          open={bulkDeleteDialogOpen}
          companies={companies}
          selectedIds={selectedCompanies}
          isDeleting={deletingBulk}
          onOpenChange={setBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
        />
      </div>
    </ProtectedRoute>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      }
    >
      <CompaniesPageContent />
    </Suspense>
  )
}
