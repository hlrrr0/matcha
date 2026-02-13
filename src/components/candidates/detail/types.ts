import { Match } from '@/types/matching'

export interface MatchWithDetails extends Match {
  jobTitle?: string
  companyName?: string
  candidateName?: string
  storeNames?: string[]
  employmentType?: string
}
