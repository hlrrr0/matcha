import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'

export interface PublicJobClientProps {
  params: Promise<{
    id: string
  }>
}

export interface PublicJobState {
  loading: boolean
  jobId: string
  job: Job | null
  company: Company | null
  stores: StoreType[]
  modalImage: { src: string; alt: string } | null
  currentSlide: number
  isAutoPlay: boolean
}

export interface ImageData {
  src: string
  alt: string
}
