import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Job } from '@/types/job'

const COLLECTION_NAME = 'jobs'

// undefinedフィールドを深くネストされたオブジェクトからも除去するヘルパー関数
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)).filter(item => item !== undefined)
  }
  
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && value.constructor === Object) {
        const nestedCleaned = removeUndefinedFields(value)
        // 空のオブジェクトでなければ追加
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned
        }
      } else if (Array.isArray(value)) {
        const cleanedArray = removeUndefinedFields(value)
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray
        }
      } else {
        cleaned[key] = value
      }
    }
  }
  return cleaned
}

// FirestoreデータをJobオブジェクトに変換
function firestoreToJob(doc: any): Job {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
    visibilityType: data.visibilityType || 'all',  // 既存データは全体公開として扱う
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Job
}

// JobオブジェクトをFirestoreデータに変換
function jobToFirestore(job: Omit<Job, 'id'>): any {
  return {
    ...job,
    createdAt: job.createdAt instanceof Date ? Timestamp.fromDate(job.createdAt) : serverTimestamp(),
    updatedAt: job.updatedAt instanceof Date ? Timestamp.fromDate(job.updatedAt) : serverTimestamp(),
  }
}

// 求人作成
export const createJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const firestoreData = jobToFirestore({
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Omit<Job, 'id'>)
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(firestoreData)
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData)
    return docRef.id
  } catch (error) {
    console.error('Error creating job:', error)
    throw error
  }
}

/**
 * 求人タイトルと企業IDで既存求人を検索（重複チェック用）
 * 店舗IDがある場合はそれも含めてチェック
 */
export async function findJobByTitleAndCompany(
  title: string, 
  companyId: string, 
  storeId?: string
): Promise<Job | null> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('title', '==', title.trim()),
      where('companyId', '==', companyId.trim())
    )

    // 店舗IDがある場合は追加条件として含める
    if (storeId && storeId.trim()) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('title', '==', title.trim()),
        where('companyId', '==', companyId.trim()),
        where('storeId', '==', storeId.trim())
      )
    }
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0] // 最初に見つかった求人を返す
    return firestoreToJob(doc)
  } catch (error) {
    console.error('Error finding job by title and company:', error)
    throw error
  }
}

// 求人更新
export const updateJob = async (id: string, jobData: Partial<Omit<Job, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な求人IDです')
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData = jobToFirestore({
      ...jobData,
      updatedAt: new Date()
    } as Omit<Job, 'id'>)
    
    // undefinedフィールドを除去
    const cleanedUpdateData = removeUndefinedFields(updateData)
    
    await updateDoc(docRef, cleanedUpdateData)
  } catch (error) {
    console.error('Error updating job:', error)
    throw error
  }
}

// 求人削除
export const deleteJob = async (id: string): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      console.warn('⚠️ 無効な求人IDです')
      return
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting job:', error)
    throw error
  }
}

// 求人一覧取得
export const getJobs = async (): Promise<Job[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(firestoreToJob)
  } catch (error) {
    console.error('Error getting jobs:', error)
    throw error
  }
}

// 求人詳細取得
export const getJobById = async (id: string): Promise<Job | null> => {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return firestoreToJob(docSnap)
    }
    
    return null
  } catch (error) {
    console.error('Error getting job:', error)
    throw error
  }
}

// 企業の求人一覧取得
export const getJobsByCompany = async (companyId: string): Promise<Job[]> => {
  try {
    if (!companyId || companyId.trim() === '') {
      return []
    }
    const q = query(
      collection(db, COLLECTION_NAME),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(firestoreToJob)
  } catch (error) {
    console.error('Error getting jobs by company:', error)
    throw error
  }
}

// 店舗の求人一覧取得
export const getJobsByStore = async (storeId: string): Promise<Job[]> => {
  try {
    if (!storeId || storeId.trim() === '') {
      return []
    }
    const q = query(
      collection(db, COLLECTION_NAME),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(firestoreToJob)
  } catch (error) {
    console.error('Error getting jobs by store:', error)
    throw error
  }
}

// アクティブな求人一覧取得
export const getActiveJobs = async (): Promise<Job[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(firestoreToJob)
  } catch (error) {
    console.error('Error getting active jobs:', error)
    throw error
  }
}

// 求人検索
export const searchJobs = async (searchTerm: string): Promise<Job[]> => {
  try {
    // Firestoreは部分一致検索が制限されているため、クライアントサイドでフィルタリング
    const allJobs = await getJobs()
    
    return allJobs.filter(job => 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requiredSkills?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  } catch (error) {
    console.error('Error searching jobs:', error)
    throw error
  }
}

// 個別の求人取得
export const getJob = async (id: string): Promise<Job | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return firestoreToJob(docSnap)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting job:', error)
    throw error
  }
}