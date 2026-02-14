import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { Job } from '@/types/job'

export interface StorePageState {
  stores: Store[]
  companies: Company[]
  users: User[]
  jobs: Job[]
  loading: boolean
  
  // 表示モード
  viewMode: 'list' | 'map'
  
  // フィルター・検索
  searchTerm: string
  statusFilter: Store['status'] | 'all'
  companyFilter: string
  jobFilter: 'all' | 'with-jobs' | 'without-jobs'
  locationFilter: 'all' | 'with-location' | 'without-location'
  
  // ページネーション
  currentPage: number
  
  // ソート
  sortBy: 'name' | 'companyName' | 'createdAt' | 'updatedAt' | 'status'
  sortOrder: 'asc' | 'desc'
  
  // 複数選択
  selectedStores: string[]
  
  // 一括位置情報取得
  isGeocodingInProgress: boolean
  geocodingProgress: number
}

export interface StoreJobFlags {
  highDemand: boolean
  provenTrack: boolean
  weakRelationship: boolean
}
