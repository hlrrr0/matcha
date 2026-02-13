import { Match } from '@/types/matching'

export interface MatchWithDetails extends Match {
  candidateName?: string
  jobTitle?: string
  jobEmploymentType?: string
  companyName?: string
  storeName?: string
  storeId?: string
  candidateAssignedUserId?: string
  companyAssignedUserId?: string
}
