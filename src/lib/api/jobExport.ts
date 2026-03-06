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

// バッチ取得用のキャッシュ（リクエスト内で再利用）
const companyCache = new Map<string, Company | null>()
const storeCache = new Map<string, Store | null>()

/**
 * 企業情報を取得（キャッシュ付き）
 */
async function getCompany(companyId: string): Promise<Company | null> {
  if (!companyId) return null

  if (companyCache.has(companyId)) {
    return companyCache.get(companyId)!
  }

  try {
    const db = getAdminDb()
    const companyDoc = await db.collection('companies').doc(companyId).get()
    const company = companyDoc.exists ? { id: companyDoc.id, ...companyDoc.data() } as Company : null
    companyCache.set(companyId, company)
    return company
  } catch (error) {
    console.error('Error fetching company:', error)
    companyCache.set(companyId, null)
    return null
  }
}

/**
 * 店舗情報を取得（キャッシュ付き）
 */
async function getStore(storeId: string): Promise<Store | null> {
  if (storeCache.has(storeId)) {
    return storeCache.get(storeId)!
  }

  try {
    const db = getAdminDb()
    const storeDoc = await db.collection('stores').doc(storeId).get()
    const store = storeDoc.exists ? { id: storeDoc.id, ...storeDoc.data() } as Store : null
    storeCache.set(storeId, store)
    return store
  } catch (error) {
    console.error('Error fetching store:', error)
    storeCache.set(storeId, null)
    return null
  }
}

/**
 * 求人に関連する店舗を取得（キャッシュ活用）
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

  const stores = await Promise.all(
    [...new Set(storeIds)].map(id => getStore(id))
  )

  return stores.filter((s): s is Store => s !== null)
}

/**
 * 企業データを取得（並列処理+キャッシュ活用）
 */
async function getCompaniesData(companyIds: string[]) {
  const db = getAdminDb()

  const results = await Promise.all(
    companyIds.map(async (companyId) => {
      try {
        const company = await getCompany(companyId)
        if (!company) return null

        const jobsSnapshot = await db.collection('jobs')
          .where('companyId', '==', companyId)
          .where('status', '==', 'active')
          .get()

        return {
          id: companyId,
          name: company.name,
          industry: undefined,
          description: undefined,
          website: company.website,
          jobCount: jobsSnapshot.size
        }
      } catch (error) {
        console.error('Error fetching company data:', error)
        return null
      }
    })
  )

  return results.filter((c): c is NonNullable<typeof c> => c !== null)
}

/**
 * 店舗データを取得（並列処理+キャッシュ活用）
 */
async function getStoresData(storeIds: string[]) {
  const db = getAdminDb()

  const results = await Promise.all(
    storeIds.map(async (storeId) => {
      try {
        const store = await getStore(storeId)
        if (!store) return null

        const company = store.companyId ? await getCompany(store.companyId) : null

        const [jobsSnapshot1, jobsSnapshot2] = await Promise.all([
          db.collection('jobs')
            .where('storeId', '==', storeId)
            .where('status', '==', 'active')
            .get(),
          db.collection('jobs')
            .where('storeIds', 'array-contains', storeId)
            .where('status', '==', 'active')
            .get()
        ])

        return {
          id: storeId,
          name: store.name,
          companyId: store.companyId,
          companyName: company?.name || '',
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          jobCount: jobsSnapshot1.size + jobsSnapshot2.size
        }
      } catch (error) {
        console.error('Error fetching store data:', error)
        return null
      }
    })
  )

  return results.filter((s): s is NonNullable<typeof s> => s !== null)
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

    const companyIds = new Set<string>()
    const storeIds = new Set<string>()

    // 企業と店舗を並列プリフェッチしてキャッシュに載せる
    const allJobs = jobsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job))
    const uniqueCompanyIds = [...new Set(allJobs.map(j => j.companyId).filter(Boolean))]
    await Promise.all(uniqueCompanyIds.map(id => getCompany(id)))

    const allStoreIds = new Set<string>()
    allJobs.forEach(job => {
      if (job.storeId) allStoreIds.add(job.storeId)
      if (job.storeIds) job.storeIds.forEach((id: string) => allStoreIds.add(id))
    })
    await Promise.all([...allStoreIds].map(id => getStore(id)))

    // キャッシュが温まった状態で変換
    const jobs: PublicJob[] = []
    for (const job of allJobs) {
      const company = await getCompany(job.companyId)
      if (!company || company.status !== 'active' || !company.isPublic) continue

      const stores = await getJobStores(job)
      if (stores.length === 0) continue
      if (stores.some(s => s.status !== 'active')) continue

      const publicJob: PublicJob = {
        id: job.id,
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
    
    // 企業が有効かつ公開状態かチェック
    const company = await getCompany(job.companyId)
    if (!company || company.status !== 'active' || !company.isPublic) return null
    
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
