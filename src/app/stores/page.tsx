'use client'

import { useEffect, useState, Suspense, useMemo, useCallback, useRef } from 'react'
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { Job } from '@/types/job'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Upload, Plus, Trash2, MapPin, List, RefreshCw } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'
import { Pagination } from '@/components/ui/pagination'
import { useAuth } from '@/contexts/AuthContext'
import { StoreMapView } from '@/components/maps/StoreMapView'
import { ITEMS_PER_PAGE } from './StorePageConstants'
import { StorePageState } from './StorePageTypes'
import { 
  getJobCountForStore, 
  getStoreJobFlags,
  filterAndSortStores,
  CSV_EXPORT_HEADERS,
  escapeCsvField
} from './StorePageUtils'
import StoreFilters from './StoreFilters'
import StoreTableRow from './StoreTableRow'

export default function StoresPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <StoresPageContent />
    </Suspense>
  )
}

function StoresPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<StorePageState>({
    stores: [],
    jobs: [],
    companies: [],
    users: [],
    loading: true,
    searchTerm: searchParams?.get('search') || '',
    statusFilter: (searchParams?.get('status') as StorePageState['statusFilter']) || 'all',
    jobFilter: 'all',
    locationFilter: 'all',
    companyFilter: searchParams?.get('company') || 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    currentPage: parseInt(searchParams?.get('page') || '1'),
    selectedStores: [],
    isGeocodingInProgress: false,
    geocodingProgress: 0,
    viewMode: 'list',
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    updateURL()
  }, [state.searchTerm, state.statusFilter, state.currentPage, state.companyFilter])

  const fetchData = async () => {
    setState(prev => ({ ...prev, loading: true }))
    try {
      const [storesSnapshot, companiesSnapshot, usersSnapshot, jobsSnapshot] = await Promise.all([
        getDocs(collection(db, 'stores')),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'jobs'))
      ])

      const storesData = storesSnapshot.docs.map(doc => {
        const data = doc.data() as any
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        } as Store
      })
      const companiesData = companiesSnapshot.docs.map(doc => {
        const data = doc.data() as any
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        } as Company
      })
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job))

      setState(prev => ({ 
        ...prev, 
        stores: storesData,
        companies: companiesData,
        users: usersData,
        jobs: jobsData,
        loading: false 
      }))
    } catch (error) {
      console.error('データの取得に失敗しました:', error)
      toast.error('データの取得に失敗しました')
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const updateURL = () => {
    const params = new URLSearchParams()
    if (state.searchTerm) params.set('search', state.searchTerm)
    if (state.statusFilter !== 'all') params.set('status', state.statusFilter)
    if (state.companyFilter !== 'all') params.set('company', state.companyFilter)
    if (state.currentPage > 1) params.set('page', state.currentPage.toString())
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('この店舗を削除してもよろしいですか？')) return

    try {
      await deleteDoc(doc(db, 'stores', storeId))
      setState(prev => ({
        ...prev,
        stores: prev.stores.filter(s => s.id !== storeId),
        selectedStores: prev.selectedStores.filter(id => id !== storeId)
      }))
      toast.success('店舗を削除しました')
    } catch (error) {
      console.error('店舗の削除に失敗しました:', error)
      toast.error('店舗の削除に失敗しました')
    }
  }

  const handleSelectStore = (storeId: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedStores: checked
        ? [...prev.selectedStores, storeId]
        : prev.selectedStores.filter(id => id !== storeId)
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedStores: checked ? filteredStores.map(s => s.id) : []
    }))
  }

  const handleBulkDelete = async () => {
    if (state.selectedStores.length === 0) return
    if (!confirm(`選択した${state.selectedStores.length}件の店舗を削除してもよろしいですか？`)) return

    try {
      const batch = writeBatch(db)
      state.selectedStores.forEach(storeId => {
        batch.delete(doc(db, 'stores', storeId))
      })
      await batch.commit()

      setState(prev => ({
        ...prev,
        stores: prev.stores.filter(s => !prev.selectedStores.includes(s.id)),
        selectedStores: []
      }))
      toast.success(`${state.selectedStores.length}件の店舗を削除しました`)
    } catch (error) {
      console.error('一括削除に失敗しました:', error)
      toast.error('一括削除に失敗しました')
    }
  }

  const handleBulkGeocode = async () => {
    if (state.selectedStores.length === 0) return
    if (!confirm(`選択した${state.selectedStores.length}件の店舗をジオコーディングしますか？`)) return

    setState(prev => ({ ...prev, isGeocodingInProgress: true, geocodingProgress: 0 }))

    try {
      const selectedStoresData = state.stores.filter(s => state.selectedStores.includes(s.id))
      let completed = 0

      for (const store of selectedStoresData) {
        if (!store.address) {
          completed++
          setState(prev => ({ ...prev, geocodingProgress: Math.round((completed / selectedStoresData.length) * 100) }))
          continue
        }

        try {
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(store.address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`)
          const data = await response.json()

          if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location
            const storeRef = doc(db, 'stores', store.id)
            await writeBatch(db).set(storeRef, { latitude: lat, longitude: lng }, { merge: true })
          }

          completed++
          setState(prev => ({ ...prev, geocodingProgress: Math.round((completed / selectedStoresData.length) * 100) }))
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`店舗 ${store.name} のジオコーディングに失敗:`, error)
          completed++
          setState(prev => ({ ...prev, geocodingProgress: Math.round((completed / selectedStoresData.length) * 100) }))
        }
      }

      await fetchData()
      setState(prev => ({ ...prev, isGeocodingInProgress: false, geocodingProgress: 0, selectedStores: [] }))
      toast.success('ジオコーディングが完了しました')
    } catch (error) {
      console.error('ジオコーディングに失敗しました:', error)
      toast.error('ジオコーディングに失敗しました')
      setState(prev => ({ ...prev, isGeocodingInProgress: false, geocodingProgress: 0 }))
    }
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())

      const batch = writeBatch(db)
      let importCount = 0

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',').map(v => v.trim())
        const storeData: Partial<Store> = {}

        headers.forEach((header, index) => {
          const value = values[index]
          if (value) {
            if (header === 'latitude' || header === 'longitude') {
              storeData[header] = parseFloat(value)
            } else {
              (storeData as any)[header] = value
            }
          }
        })

        if (storeData.name) {
          const storeRef = doc(collection(db, 'stores'))
          batch.set(storeRef, {
            ...storeData,
            status: storeData.status || 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          importCount++
        }
      }

      await batch.commit()
      await fetchData()
      toast.success(`${importCount}件の店舗をインポートしました`)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('CSVインポートに失敗しました:', error)
      toast.error('CSVインポートに失敗しました')
    }
  }

  const exportSelectedStoresCSV = () => {
    if (state.selectedStores.length === 0) {
      toast.error('店舗を選択してください')
      return
    }

    const selectedStoresData = state.stores.filter(s => state.selectedStores.includes(s.id))
    const csvContent = [
      CSV_EXPORT_HEADERS.join(','),
      ...selectedStoresData.map(store => 
        CSV_EXPORT_HEADERS.map(header => {
          const value = (store as any)[header]
          return escapeCsvField(value?.toString() || '')
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `stores_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`${state.selectedStores.length}件の店舗をエクスポートしました`)
  }

  const downloadCSVTemplate = () => {
    const csvContent = CSV_EXPORT_HEADERS.join(',')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'stores_template.csv')
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredStores = useMemo(() => {
    return filterAndSortStores(
      state.stores,
      state.companies,
      state.jobs,
      {
        searchTerm: state.searchTerm,
        statusFilter: state.statusFilter,
        jobFilter: state.jobFilter,
        locationFilter: state.locationFilter,
        companyFilter: state.companyFilter,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      }
    )
  }, [
    state.stores,
    state.companies,
    state.jobs,
    state.searchTerm,
    state.statusFilter,
    state.jobFilter,
    state.locationFilter,
    state.companyFilter,
    state.sortBy,
    state.sortOrder
  ])

  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE)
  const paginatedStores = filteredStores.slice(
    (state.currentPage - 1) * ITEMS_PER_PAGE,
    state.currentPage * ITEMS_PER_PAGE
  )

  const allSelected = paginatedStores.length > 0 && state.selectedStores.length === paginatedStores.length

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg sm:text-2xl">店舗管理</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                登録店舗の一覧・検索・管理
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              disabled={state.loading}
              className="h-8 text-xs sm:h-9 sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${state.loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button
              variant={state.viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setState(prev => ({ ...prev, viewMode: 'list' }))}
              size="sm"
              className="h-8 text-xs sm:h-9 sm:text-sm"
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              リスト表示
            </Button>
            <Button
              variant={state.viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setState(prev => ({ ...prev, viewMode: 'map' }))}
              size="sm"
              className="h-8 text-xs sm:h-9 sm:text-sm"
            >
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              マップ表示
            </Button>
            <Button 
              onClick={() => router.push('/stores/new')}
              size="sm"
              className="h-8 text-xs sm:h-9 sm:text-sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              新規店舗
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {state.viewMode === 'map' ? (
            <StoreMapView stores={state.stores} companies={state.companies} jobs={state.jobs} />
          ) : (
            <>
              <StoreFilters
                searchTerm={state.searchTerm}
                statusFilter={state.statusFilter}
                jobFilter={state.jobFilter}
                locationFilter={state.locationFilter}
                sortBy={state.sortBy}
                sortOrder={state.sortOrder}
                onSearchChange={(value: string) => setState(prev => ({ ...prev, searchTerm: value, currentPage: 1 }))}
                onStatusChange={(value: Store['status'] | 'all') => setState(prev => ({ ...prev, statusFilter: value, currentPage: 1 }))}
                onJobFilterChange={(value: 'all' | 'with-jobs' | 'without-jobs') => setState(prev => ({ ...prev, jobFilter: value, currentPage: 1 }))}
                onLocationFilterChange={(value: 'all' | 'with-location' | 'without-location') => setState(prev => ({ ...prev, locationFilter: value, currentPage: 1 }))}
                onSortChange={(value: string) => {
                  const [newSortBy, newSortOrder] = value.split('-')
                  setState(prev => ({ ...prev, sortBy: newSortBy as any, sortOrder: newSortOrder as any }))
                }}
              />

              {isAdmin && state.selectedStores.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {state.selectedStores.length}件選択中
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportSelectedStoresCSV}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV出力
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkGeocode}
                      disabled={state.isGeocodingInProgress}
                    >
                      {state.isGeocodingInProgress ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {state.geocodingProgress}%
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          一括ジオコーディング
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      一括削除
                    </Button>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="mb-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    CSVインポート
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadCSVTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    テンプレートDL
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVImport}
                  />
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>店舗名</TableHead>
                      <TableHead>企業名</TableHead>
                      <TableHead>住所</TableHead>
                      <TableHead>入力完了率</TableHead>
                      <TableHead>求人</TableHead>
                      <TableHead>担当者</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>外部リンク</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStores.map((store) => (
                      <StoreTableRow
                        key={store.id}
                        store={store}
                        companies={state.companies}
                        users={state.users}
                        jobCount={getJobCountForStore(store.id, state.jobs)}
                        storeJobFlags={getStoreJobFlags(store.id, state.jobs)}
                        isAdmin={isAdmin}
                        isSelected={state.selectedStores.includes(store.id)}
                        currentPage={state.currentPage}
                        searchTerm={state.searchTerm}
                        statusFilter={state.statusFilter}
                        companyFilter={state.companyFilter}
                        onSelect={(checked) => handleSelectStore(store.id, checked)}
                        onDelete={() => handleDeleteStore(store.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={state.currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setState(prev => ({ ...prev, currentPage: page }))}
                  />
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500">
                全{filteredStores.length}件中 {(state.currentPage - 1) * ITEMS_PER_PAGE + 1}〜
                {Math.min(state.currentPage * ITEMS_PER_PAGE, filteredStores.length)}件を表示
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
