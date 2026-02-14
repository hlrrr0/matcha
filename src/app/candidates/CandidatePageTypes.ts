import { Candidate } from '@/types/candidate'
import { Match } from '@/types/matching'

export interface MatchWithDetails extends Match {
  storeNames?: string[]
  interviewDate?: Date
}

export interface CandidateWithProgress extends Candidate {
  latestMatches?: MatchWithDetails[]
}

export type SortBy = 'name' | 'campus' | 'enrollmentDate' | 'status' | 'createdAt' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'

export interface CandidatesPageState {
  candidates: Candidate[]
  candidatesWithProgress: CandidateWithProgress[]
  filteredCandidates: CandidateWithProgress[]
  loading: boolean
  progressLoading: boolean
  csvImporting: boolean
  currentPage: number
  itemsPerPage: number
  totalItems: number
  searchTerm: string
  statusFilter: string
  campusFilter: string
  sourceTypeFilter: string
  enrollmentMonthFilter: string
  uniqueEnrollmentMonths: string[]
  sortBy: SortBy
  sortOrder: SortOrder
  stats: any
}
