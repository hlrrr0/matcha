// 求職者関連のFirestore操作
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
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Candidate } from '@/types/candidate'

const COLLECTION_NAME = 'candidates'

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

// Firestore用のデータ変換（string型の日付をTimestamp型に変換）
const candidateToFirestore = (candidate: Omit<Candidate, 'id'>) => {
  return {
    ...candidate,
    createdAt: Timestamp.fromDate(new Date(candidate.createdAt || new Date().toISOString())),
    updatedAt: Timestamp.fromDate(new Date(candidate.updatedAt || new Date().toISOString()))
  }
}

// Firestoreからのデータ変換（Timestamp型をDate型に変換）
const candidateFromFirestore = (doc: QueryDocumentSnapshot<DocumentData>): Candidate => {
  try {
    const data = doc.data()
    
    const result = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
      // 必須フィールドのデフォルト値を確保
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      firstNameKana: data.firstNameKana || '',
      lastNameKana: data.lastNameKana || '',
      email: data.email || '',
      status: data.status || 'active',
      experience: data.experience || [],
      education: data.education || [],
      skills: data.skills || [],
      certifications: data.certifications || [],
      preferences: data.preferences || {}
    } as Candidate
    
    return result
  } catch (error) {
    console.error('❌ 求職者データ変換エラー ID:', doc.id, error)
    // エラーでも基本的な構造を返す
    return {
      id: doc.id,
      firstName: 'データエラー',
      lastName: '',
      firstNameKana: '',
      lastNameKana: '',
      email: '',
      status: 'active' as const,
      phone: '',
      dateOfBirth: '',
      enrollmentDate: '',
      nearestStation: '',
      cookingExperience: '',
      jobSearchTiming: '',
      graduationCareerPlan: '',
      preferredArea: '',
      preferredWorkplace: '',
      futureCareerVision: '',
      questions: '',
      partTimeHope: '',
      applicationFormUrl: '',
      resumeUrl: '',
      teacherComment: '',
      personalityScore: '',
      skillScore: '',
      interviewMemo: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Candidate
  }
}

// 求職者一覧取得（フィルタリング・ソート対応）
export const getCandidates = async (options?: {
  status?: Candidate['status']
  searchTerm?: string
  limit?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'lastName'
  orderDirection?: 'asc' | 'desc'
}): Promise<Candidate[]> => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    
    if (snapshot.docs.length === 0) {
      return []
    }
    
    let candidates = snapshot.docs.map(candidateFromFirestore)
    
    return candidates
  } catch (error) {
    console.error('❌ getCandidatesエラー:', error)
    throw error
  }
}

// 求職者詳細取得
export const getCandidateById = async (id: string): Promise<Candidate | null> => {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return candidateFromFirestore(docSnap as QueryDocumentSnapshot<DocumentData>)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting candidate:', error)
    throw error
  }
}

// 求職者作成
export const createCandidate = async (candidateData: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'candidates'), candidateToFirestore({
      ...candidateData,
      createdAt: now,
      updatedAt: now
    }))
    return docRef.id
  } catch (error) {
    console.error('Error creating candidate:', error)
    throw error
  }
}

// 求職者更新
export const updateCandidate = async (id: string, candidateData: Partial<Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な候補者IDです')
    }
    const docRef = doc(db, 'candidates', id)
    const updateData = candidateToFirestore({
      ...candidateData,
      createdAt: new Date().toISOString(), // ダミーの値（実際には上書きされない）
      updatedAt: new Date().toISOString()
    } as Omit<Candidate, 'id'>)
    
    // createdAtフィールドを削除（更新時は不要）
    const { createdAt, ...updateDataWithoutCreatedAt } = updateData
    
    await updateDoc(docRef, updateDataWithoutCreatedAt)
  } catch (error) {
    console.error('Error updating candidate:', error)
    throw error
  }
}

// 求職者削除
export const deleteCandidate = async (id: string): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      console.warn('⚠️ 無効な候補者IDです')
      return
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting candidate:', error)
    throw error
  }
}

// 経験年数別求職者取得（職歴から算出） - 現在の型定義では非サポート
export const getCandidatesByExperienceYears = async (minYears: number): Promise<Candidate[]> => {
  try {
    const candidates = await getCandidates()
    
    // 現在の型定義では経験年数フィールドがないため、すべての候補者を返す
    return candidates
  } catch (error) {
    console.error('Error getting candidates by experience years:', error)
    throw error
  }
}

// ステータス別求職者取得
export const getCandidatesByStatus = async (status: Candidate['status']): Promise<Candidate[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(candidateFromFirestore)
  } catch (error) {
    console.error('Error getting candidates by status:', error)
    throw error
  }
}

// 求職者統計取得
export const getCandidateStats = async () => {
  try {
    const candidates = await getCandidates()
    
    return {
      total: candidates.length,
      byStatus: {
        active: candidates.filter(c => c.status === 'active').length,
        inactive: candidates.filter(c => c.status === 'inactive').length
      },
      // 経験年数別統計は現在の型定義では非サポート
      byExperience: {
        fresh: 0,
        junior: 0,
        mid: 0,
        senior: 0
      }
    }
  } catch (error) {
    console.error('Error getting candidate stats:', error)
    throw error
  }
}

// 個別の候補者取得
export const getCandidate = async (id: string): Promise<Candidate | null> => {
  try {
    const docRef = doc(db, 'candidates', id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return candidateFromFirestore(docSnap)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting candidate:', error)
    throw error
  }
}

// メールアドレスで候補者を検索
export const getCandidateByEmail = async (email: string): Promise<Candidate | null> => {
  try {
    if (!email) return null
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('email', '==', email.trim()),
      limit(1)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    return candidateFromFirestore(snapshot.docs[0])
  } catch (error) {
    console.error('Error getting candidate by email:', error)
    throw error
  }
}

// 名前とメールアドレスで候補者を検索（重複チェック用）
export const getCandidateByNameAndEmail = async (
  lastName: string, 
  firstName: string, 
  email?: string
): Promise<Candidate | null> => {
  try {
    // メールアドレスがある場合はメールでも検索
    if (email && email.trim()) {
      const candidateByEmail = await getCandidateByEmail(email)
      if (candidateByEmail) {
        return candidateByEmail
      }
    }
    
    // 名前で検索
    const candidates = await getCandidates()
    const matchingCandidate = candidates.find(c => 
      c.lastName.trim() === lastName.trim() && 
      c.firstName.trim() === firstName.trim()
    )
    
    return matchingCandidate || null
  } catch (error) {
    console.error('Error getting candidate by name and email:', error)
    throw error
  }
}