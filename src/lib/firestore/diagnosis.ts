import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Diagnosis, DiagnosisAnswer, DiagnosisResult } from '@/types/diagnosis'

/**
 * 診断結果を保存
 */
export async function saveDiagnosis(
  candidateId: string,
  answers: DiagnosisAnswer[],
  results: DiagnosisResult[]
): Promise<string> {
  try {
    // TOP3の価値観を抽出
    const topValues = results
      .slice(0, 3)
      .filter(r => r.score > 0)
      .map(r => r.valueId)

    const diagnosis: Omit<Diagnosis, 'id'> = {
      candidateId,
      answers,
      results,
      topValues,
      completedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, 'diagnoses'), diagnosis)
    return docRef.id
  } catch (error) {
    console.error('Error saving diagnosis:', error)
    throw error
  }
}

/**
 * 候補者の最新の診断結果を取得
 */
export async function getLatestDiagnosis(candidateId: string): Promise<Diagnosis | null> {
  try {
    const q = query(
      collection(db, 'diagnoses'),
      where('candidateId', '==', candidateId),
      orderBy('completedAt', 'desc'),
      limit(1)
    )

    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data()
    } as Diagnosis
  } catch (error) {
    console.error('Error getting latest diagnosis:', error)
    throw error
  }
}

/**
 * 候補者の全診断履歴を取得
 */
export async function getDiagnosisHistory(candidateId: string): Promise<Diagnosis[]> {
  try {
    const q = query(
      collection(db, 'diagnoses'),
      where('candidateId', '==', candidateId),
      orderBy('completedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Diagnosis[]
  } catch (error) {
    console.error('Error getting diagnosis history:', error)
    throw error
  }
}

/**
 * 全候補者の診断結果を取得（管理画面用）
 */
export async function getAllDiagnoses(): Promise<Diagnosis[]> {
  try {
    const q = query(
      collection(db, 'diagnoses'),
      orderBy('completedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Diagnosis[]
  } catch (error) {
    console.error('Error getting all diagnoses:', error)
    throw error
  }
}
