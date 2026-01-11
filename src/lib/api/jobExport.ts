import { getAdminDb } from '@/lib/firebase-admin'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'

interface ExportOptions {
  includeCompanies: boolean
  includeStores: boolean
  limit: number
}

interface PublicJob {
  id: string
  title: string
  description: string
  employmentType: string
  salary?: {
    min?: number
    max?: number
    type: string
    note?: string
  }
  workingHours?: {
    start?: string
    end?: string
    note?: string
  }
  holidays?: string
  welfare?: string
  selectionProcess?: string
  location?: {
    prefecture?: string
    city?: string
    address?: string
    nearestStation?: string
  }
  company: {
    id: string
    name?: string
    industry?: string
    description?: string
    website?: string
  }
  stores: Array<{
    id: string
    name: string
    address?: string
    phoneNumber?: string
    latitude?: number
    longitude?: number
  }>
  qualifications?: string[]
  benefits?: string[]
  recruitmentCount?: number
  ageLimit?: boolean
  ageLimitReason?: string
  recommendedPoints?: string
  publicUrl?: string
  status: string
  createdAt?: string
  updatedAt: string
}

/**
 * 企業情報を取得
 */
async function getCompany(companyId: string): Promise<Company | null> {
  if (!companyId) return null
  
  try {
    const db = getAdminDb()
    const companyDoc = await db.collection('companies').doc(companyId).get()
    if (!companyDoc.exists) return null
    
    return { id: companyDoc.id, ...companyDoc.data() } as Company
  } catch (error) {
    console.error('Error fetching company:', error)
    return null
  }
}

/**
 * 求人に関連する店舗を取得
 */
async function getJobStores(job: Job): Promise<Store[]> {
  const storeIds: string[] = []
  
  if (job.storeId) {
    storeIds.push(job.storeId)
  }
  
  if (job.storeIds && Array.isArray(job.storeIds)) {
    storeIds.push(...job.storeIds)
  }
  
  if (storeIds.length === 0) return []
  
  const db = getAdminDb()
  const stores: Store[] = []
  
  for (const storeId of storeIds) {
    try {
      const storeDoc = await db.collection('stores').doc(storeId).get()
      if (storeDoc.exists) {
        stores.push({ id: storeDoc.id, ...storeDoc.data() } as Store)
      }
    } catch (error) {
      console.error('Error fetching store:', error)
    }
  }
  
  return stores
}

/**
 * 企業データを取得
 */
async function getCompaniesData(companyIds: string[]) {
  const db = getAdminDb()
  const companies = []
  
  for (const companyId of companyIds) {
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get()
      if (companyDoc.exists) {
        const company = companyDoc.data() as Company
        
        // 求人数をカウント
        const jobsSnapshot = await db.collection('jobs')
          .where('companyId', '==', companyId)
          .where('status', '==', 'active')
          .get()
        
        companies.push({
          id: companyDoc.id,
          name: company.name,
          industry: undefined,
          description: undefined,
          website: company.website,
          jobCount: jobsSnapshot.size
        })
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
    }
  }
  
  return companies
}

/**
 * 店舗データを取得
 */
async function getStoresData(storeIds: string[]) {
  const db = getAdminDb()
  const stores = []
  
  for (const storeId of storeIds) {
    try {
      const storeDoc = await db.collection('stores').doc(storeId).get()
      if (storeDoc.exists) {
        const store = storeDoc.data() as Store
        const company = store.companyId ? await getCompany(store.companyId) : null
        
        // 求人数をカウント
        const jobsSnapshot1 = await db.collection('jobs')
          .where('storeId', '==', storeId)
          .where('status', '==', 'active')
          .get()
        
        const jobsSnapshot2 = await db.collection('jobs')
          .where('storeIds', 'array-contains', storeId)
          .where('status', '==', 'active')
          .get()
        
        const jobCount = jobsSnapshot1.size + jobsSnapshot2.size
        
        stores.push({
          id: storeDoc.id,
          name: store.name,
          companyId: store.companyId,
          companyName: company?.name || '',
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          jobCount
        })
      }
    } catch (error) {
      console.error('Error fetching store data:', error)
    }
  }
  
  return stores
}

/**
 * 公開求人データをエクスポート
 */
export async function exportPublicJobs(options: ExportOptions) {
  try {
    const db = getAdminDb()
    
    // 募集中の求人を取得（最大50件に制限）
    const jobsSnapshot = await db.collection('jobs')
      .where('status', '==', 'active')
      .limit(Math.min(options.limit, 50))
      .get()

    const jobs: PublicJob[] = []
    const companyIds = new Set<string>()
    const storeIds = new Set<string>()

    for (const jobDoc of jobsSnapshot.docs) {
      const job = { id: jobDoc.id, ...jobDoc.data() } as Job

      // 企業が有効かチェック
      const company = await getCompany(job.companyId)
      if (!company || company.status !== 'active') continue

      // 店舗を取得してチェック
      const stores = await getJobStores(job)
      if (stores.length === 0) continue
      if (stores.some(s => s.status !== 'active')) continue

      // 公開用データに変換（非公開情報を除外）
      const publicJob: PublicJob = {
        id: jobDoc.id,
        title: job.title || '',
        description: job.jobDescription || '',
        employmentType: job.employmentType || '',
        salary: {
          min: undefined,
          max: undefined,
          type: job.salaryInexperienced || job.salaryExperienced ? '月給' : '',
          note: job.salaryInexperienced || job.salaryExperienced || ''
        },
        workingHours: job.workingHours ? {
          start: undefined,
          end: undefined,
          note: job.workingHours
        } : undefined,
        holidays: job.holidays,
        welfare: job.benefits,
        selectionProcess: job.selectionProcess,
        location: {
          prefecture: undefined,
          city: undefined,
          address: undefined,
          nearestStation: undefined
        },
        company: {
          id: company.id,
          name: undefined,
          industry: undefined,
          description: undefined,
          website: undefined
        },
        stores: stores.map(s => ({
          id: s.id,
          name: s.name,
          address: s.address,
          phoneNumber: undefined,
          latitude: s.latitude,
          longitude: s.longitude
        })),
        qualifications: job.requiredSkills ? [job.requiredSkills] : undefined,
        benefits: job.benefits ? [job.benefits] : undefined,
        recruitmentCount: undefined,
        ageLimit: undefined,
        ageLimitReason: undefined,
        recommendedPoints: job.recommendedPoints,
        publicUrl: undefined,
        status: job.status,
        createdAt: undefined,
        updatedAt: typeof job.updatedAt === 'string' ? job.updatedAt : job.updatedAt instanceof Date ? job.updatedAt.toISOString() : new Date().toISOString()
      }

      jobs.push(publicJob)
      companyIds.add(job.companyId)
      stores.forEach(s => storeIds.add(s.id))
    }

    const result = {
      exportedAt: new Date().toISOString(),
      totalCount: jobs.length,
      jobs,
      companies: options.includeCompanies ? await getCompaniesData(Array.from(companyIds)) : undefined,
      stores: options.includeStores ? await getStoresData(Array.from(storeIds)) : undefined
    }

    return result
  } catch (error) {
    console.error('Export jobs error:', error)
    throw error
  }
}

/**
 * 個別の求人を取得
 */
export async function getPublicJob(jobId: string): Promise<PublicJob | null> {
  try {
    const db = getAdminDb()
    const jobDoc = await db.collection('jobs').doc(jobId).get()
    
    if (!jobDoc.exists) return null
    
    const job = { id: jobDoc.id, ...jobDoc.data() } as Job
    
    if (job.status !== 'active') return null
    
    // 企業が有効かチェック
    const company = await getCompany(job.companyId)
    if (!company || company.status !== 'active') return null
    
    // 店舗を取得してチェック
    const stores = await getJobStores(job)
    if (stores.length === 0) return null
    if (stores.some(s => s.status !== 'active')) return null
    
    // 公開用データに変換
    const publicJob: PublicJob = {
      id: jobDoc.id,
      title: job.title || '',
      description: job.jobDescription || '',
      employmentType: job.employmentType || '',
      salary: {
        min: undefined,
        max: undefined,
        type: job.salaryInexperienced || job.salaryExperienced ? '月給' : '',
        note: job.salaryInexperienced || job.salaryExperienced || ''
      },
      workingHours: job.workingHours ? {
        start: undefined,
        end: undefined,
        note: job.workingHours
      } : undefined,
      holidays: job.holidays,
      welfare: job.benefits,
      selectionProcess: job.selectionProcess,
      location: {
        prefecture: undefined,
        city: undefined,
        address: undefined,
        nearestStation: undefined
      },
      company: {
        id: company.id,
        name: undefined,
        industry: undefined,
        description: undefined,
        website: undefined
      },
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        phoneNumber: undefined,
        latitude: s.latitude,
        longitude: s.longitude
      })),
      qualifications: job.requiredSkills ? [job.requiredSkills] : undefined,
      benefits: job.benefits ? [job.benefits] : undefined,
      recruitmentCount: undefined,
      ageLimit: undefined,
      ageLimitReason: undefined,
      recommendedPoints: job.recommendedPoints,
      publicUrl: undefined,
      status: job.status,
      createdAt: undefined,
      updatedAt: typeof job.updatedAt === 'string' ? job.updatedAt : job.updatedAt instanceof Date ? job.updatedAt.toISOString() : new Date().toISOString()
    }
    
    return publicJob
  } catch (error) {
    console.error('Get public job error:', error)
    return null
  }
}
