import { Job } from '@/types/job'

// Helper type for store with job relation
export interface StoreForJob {
  id: string
  name: string
  prefecture?: string
  address?: string
  nearestStation?: string
  unitPriceLunch?: number
  unitPriceDinner?: number
  isReservationRequired?: boolean
  tabelogUrlException?: string
}

// Batch operation state
export interface BatchOperationState {
  bulkStatusChangeDialogOpen: boolean
  bulkStatusValue: Job['status']
  bulkStatusChanging: boolean
}

// Pagination state
export interface PaginationState {
  currentPage: number
  itemsPerPage: number
}

// Filter state
export interface FilterState {
  searchTerm: string
  statusFilter: Job['status'] | 'all'
  sourceTypeFilter: string
  employmentTypeFilter: Set<string>
  consultantFilter: string
  ageLimitFilter: string
  unitPriceLunchMin: string
  unitPriceLunchMax: string
  unitPriceDinnerMin: string
  unitPriceDinnerMax: string
  reservationSystemFilter: string
  housingSupportFilter: string
  independenceSupportFilter: string
  tabelogExceptionFilter: string
  tagFilter: Set<string>
  flagFilter: Set<'highDemand' | 'provenTrack' | 'weakRelationship'>
}

// Sort state
export interface SortState {
  sortBy: 'title' | 'companyName' | 'storeName' | 'status' | 'createdAt' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
}
