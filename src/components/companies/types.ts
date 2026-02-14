import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'

export interface CompanyFilters {
  searchTerm: string
  status: Company['status'] | 'all'
  size: Company['size'] | 'all'
  dominoStatus: 'all' | 'connected' | 'not_connected'
  indeedStatus: 'all' | 'detected' | 'not_detected' | 'unchecked'
  consultantId: string | 'all'
}

export interface CompanySort {
  sortBy: 'name' | 'updatedAt' | 'createdAt' | 'status'
  sortOrder: 'asc' | 'desc'
}

export interface CompanyPagination {
  currentPage: number
  itemsPerPage: number
  total: number
}

export interface CompanyTableState {
  companies: Company[]
  filters: CompanyFilters
  sort: CompanySort
  pagination: CompanyPagination
  selectedCompanies: Set<string>
  expandedCompanies: Set<string>
  companyStores: Map<string, Store[]>
  storeCounts: Map<string, number>
  loading: boolean
}

export interface CompanyCompletionInfo {
  completedCount: number
  totalCount: number
  percentage: number
}

export interface DeleteCompanyState {
  isOpen: boolean
  companyId: string | null
  isDeleting: boolean
}

export interface BulkDeleteState {
  isOpen: boolean
  selectedCount: number
  isDeleting: boolean
}
