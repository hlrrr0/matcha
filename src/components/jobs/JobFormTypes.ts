import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'

export interface JobFormProps {
  initialData?: Partial<Job>
  onSubmit: (data: Partial<Job>) => Promise<void>
  isEdit?: boolean
  loading?: boolean
}

export interface JobFormState {
  companies: Company[]
  stores: Store[]
  jobs: Job[]
  filteredStores: Store[]
  storeSearchTerm: string
  loadingData: boolean
  copied: boolean
  generatingAI: boolean
}

export interface FormData extends Partial<Job> {
  companyId: string
  storeIds: string[]
  mainStoreIds?: string[]
  visibilityType?: 'all' | 'school_only' | 'personal'
  allowedSources?: string[]
  title: string
  businessType: string
  employmentType: string
  trialPeriod: string
  workingHours: string
  holidays: string
  overtime: string
  salaryInexperienced: string
  salaryExperienced: string
  requiredSkills: string
  jobDescription: string
  ageLimit?: number
  ageNote: string
  smokingPolicy: string
  insurance: string
  benefits: string
  selectionProcess: string
  recommendedPoints: string
  consultantReview: string
  status: Job['status']
  matchingData: Record<string, any>
}

export interface JobCountByStore {
  [storeId: string]: number
}

export interface StoresByPrefecture {
  [prefecture: string]: Store[]
}

export interface TrainingPeriodMatch {
  years?: number
  months?: number
  isHalfYear?: boolean
}
