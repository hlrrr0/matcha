import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { Job } from '@/types/job'
import { STORE_COMPLETION_FIELDS } from './StorePageConstants'

// Firestore Timestamp または Date を Date に変換する関数
const convertToTimestamp = (value: any): Date => {
  if (!value) return new Date(0)
  if (value instanceof Date) return value
  if (value.toDate && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'number') return new Date(value)
  return new Date(value)
}

// 店舗の入力率を計算する関数
export const calculateCompletionRate = (store: Store): number => {
  let filledCount = 0
  STORE_COMPLETION_FIELDS.forEach(field => {
    const value = (store as any)[field]
    if (value !== null && value !== undefined && value !== '') {
      filledCount++
    }
  })
  return Math.round((filledCount / STORE_COMPLETION_FIELDS.length) * 100)
}

// 店舗に紐付いている求人数を取得
export const getJobCountForStore = (storeId: string, jobs: Job[]): number => {
  return jobs.filter(job => {
    if (job.storeId === storeId) return true
    if (job.storeIds && Array.isArray(job.storeIds) && job.storeIds.includes(storeId)) return true
    return false
  }).length
}

// 企業名を取得
export const getCompanyName = (companyId: string, companies: Company[]): string => {
  const company = companies.find(c => c.id === companyId)
  return company?.name || '不明な企業'
}

// 企業を取得
export const getCompany = (companyId: string, companies: Company[]): Company | undefined => {
  return companies.find(c => c.id === companyId)
}

// 店舗の求人フラグを集約
export const aggregateStoreJobFlags = (stores: Store[], jobs: Job[]): Record<string, { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean }> => {
  const flagsMap: Record<string, { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean }> = {}
  
  stores.forEach(store => {
    const storeJobs = jobs.filter(job => 
      job.storeId === store.id || job.storeIds?.includes(store.id)
    )
    flagsMap[store.id] = {
      highDemand: storeJobs.some(j => j.flags?.highDemand),
      provenTrack: storeJobs.some(j => j.flags?.provenTrack),
      weakRelationship: storeJobs.some(j => j.flags?.weakRelationship)
    }
  })
  
  return flagsMap
}

// 個別の店舗の求人フラグを取得
export const getStoreJobFlags = (storeId: string, jobs: Job[]): { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean } => {
  const storeJobs = jobs.filter(job => 
    job.storeId === storeId || job.storeIds?.includes(storeId)
  )
  return {
    highDemand: storeJobs.some(j => j.flags?.highDemand),
    provenTrack: storeJobs.some(j => j.flags?.provenTrack),
    weakRelationship: storeJobs.some(j => j.flags?.weakRelationship)
  }
}

// フィルタとソートを適用
export const filterAndSortStores = (
  stores: Store[],
  companies: Company[],
  jobs: Job[],
  filters: {
    searchTerm: string
    statusFilter: Store['status'] | 'all'
    companyFilter: string
    jobFilter: 'all' | 'with-jobs' | 'without-jobs'
    locationFilter: 'all' | 'with-location' | 'without-location'
    sortBy: 'name' | 'companyName' | 'createdAt' | 'updatedAt' | 'status'
    sortOrder: 'asc' | 'desc'
  }
): Store[] => {
  let filtered = stores.filter(store => {
    const matchesSearch = (store.name && store.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                         getCompanyName(store.companyId, companies).toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         (store.address && store.address.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                         (store.nearestStation && store.nearestStation.toLowerCase().includes(filters.searchTerm.toLowerCase()))
    
    const matchesStatus = filters.statusFilter === 'all' || store.status === filters.statusFilter
    const matchesCompany = filters.companyFilter === 'all' || store.companyId === filters.companyFilter
    
    // 求人の有無によるフィルタリング
    const jobCount = getJobCountForStore(store.id, jobs)
    const matchesJobFilter = 
      filters.jobFilter === 'all' || 
      (filters.jobFilter === 'with-jobs' && jobCount > 0) ||
      (filters.jobFilter === 'without-jobs' && jobCount === 0)

    // 位置情報の有無によるフィルタリング
    const hasLocation = !!(store.latitude && store.longitude)
    const matchesLocationFilter =
      filters.locationFilter === 'all' ||
      (filters.locationFilter === 'with-location' && hasLocation) ||
      (filters.locationFilter === 'without-location' && !hasLocation)

    return matchesSearch && matchesStatus && matchesCompany && matchesJobFilter && matchesLocationFilter
  })

  // ソート処理
  filtered = filtered.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (filters.sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
        break
      case 'companyName':
        aValue = getCompanyName(a.companyId, companies).toLowerCase()
        bValue = getCompanyName(b.companyId, companies).toLowerCase()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'createdAt':
        aValue = convertToTimestamp(a.createdAt).getTime()
        bValue = convertToTimestamp(b.createdAt).getTime()
        break
      case 'updatedAt':
        aValue = convertToTimestamp(a.updatedAt).getTime()
        bValue = convertToTimestamp(b.updatedAt).getTime()
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return filtered
}

// CSV出力用のフィールドリスト
export const CSV_EXPORT_HEADERS = [
  'id',
  'name',
  'companyId',
  'address',
  'nearestStation',
  'website',
  'unitPriceLunch',
  'unitPriceDinner',
  'seatCount',
  'isReservationRequired',
  'instagramUrl',
  'tabelogUrl',
  'googleReviewScore',
  'tabelogScore',
  'reputation',
  'staffReview',
  'trainingPeriod',
  'ownerPhoto',
  'ownerVideo',
  'interiorPhoto',
  'photo1',
  'photo2',
  'photo3',
  'photo4',
  'photo5',
  'photo6',
  'photo7',
  'status'
]

// CSV行をエスケープ
export const escapeCsvField = (value: any): string => {
  if (typeof value === 'boolean') {
    return value.toString()
  }
  
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString().split('T')[0]
  }
  
  const stringValue = String(value || '')
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}
