import { Match, MatchTimeline } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'

export interface MatchDetailPageState {
  match: Match | null
  candidate: Candidate | null
  job: Job | null
  company: Company | null
  store: Store | null
  jobStores: Store[]
  users: User[]
  loading: boolean
  allJobs: Job[]
  allCompanies: Company[]
  allStores: Store[]
}

export interface MatchEditState {
  open: boolean
  score: string
  notes: string
  jobId: string
  startDate: string
  endDate: string
}

export interface TimelineEditState {
  open: boolean
  timeline: MatchTimeline | null
  eventDate: string
  eventTime: string
  startDate: string
  statusNotes: string
}

export interface JobSelectState {
  open: boolean
  searchTerm: string
  selectedJobId: string
}

export interface MatchDetailContextType {
  match: Match | null
  candidate: Candidate | null
  job: Job | null
  company: Company | null
  store: Store | null
  loading: boolean
  allJobs: Job[]
  allCompanies: Company[]
  allStores: Store[]
  users: User[]
  onLoadData: () => Promise<void>
  onStatusUpdate: (status: Match['status'], notes: string, eventDateTime?: Date, startDate?: Date, endDate?: Date) => Promise<void>
}
