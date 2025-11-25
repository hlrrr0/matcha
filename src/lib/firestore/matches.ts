// マッチング関連のFirestore操作
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
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Match, MatchTimeline } from '@/types/matching'

const COLLECTION_NAME = 'matches'

// 有効な日付かチェックするヘルパー関数
function isValidDate(date: any): boolean {
  if (!date) return false
  if (date instanceof Date) {
    return !isNaN(date.getTime())
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const testDate = new Date(date)
    return !isNaN(testDate.getTime())
  }
  return false
}

// 安全な日付変換
function safeCreateDate(dateValue: any): Date {
  if (!dateValue) return new Date()
  
  if (dateValue instanceof Date) {
    return isValidDate(dateValue) ? dateValue : new Date()
  }
  
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const newDate = new Date(dateValue)
    return isValidDate(newDate) ? newDate : new Date()
  }
  
  return new Date()
}

// undefinedフィールドを除去するヘルパー関数
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

// Firestore用のデータ変換
const matchToFirestore = (match: Omit<Match, 'id'>) => {
  const safeMatch = {
    ...match,
    createdAt: match.createdAt ? Timestamp.fromDate(safeCreateDate(match.createdAt)) : Timestamp.fromDate(new Date()),
    updatedAt: match.updatedAt ? Timestamp.fromDate(safeCreateDate(match.updatedAt)) : Timestamp.fromDate(new Date()),
    timeline: (match.timeline || []).map(item => ({
      ...item,
      timestamp: item.timestamp ? Timestamp.fromDate(safeCreateDate(item.timestamp)) : Timestamp.fromDate(new Date())
    }))
  }
  
  console.log('🔄 Firestore変換データ:', {
    createdAt: safeMatch.createdAt,
    updatedAt: safeMatch.updatedAt,
    timelineCount: safeMatch.timeline.length
  })
  
  return safeMatch
}

// Firestoreからのデータ変換
const matchFromFirestore = (doc: any): Match => {
  try {
    const data = doc.data()
    console.log('🔄 マッチング変換中 ID:', doc.id, 'データ:', data)
    
    const result = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : safeCreateDate(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : safeCreateDate(data.updatedAt),
      timeline: (data.timeline || []).map((item: any) => ({
        ...item,
        timestamp: item.timestamp?.toDate ? item.timestamp.toDate() : safeCreateDate(item.timestamp)
      })),
      // イベント日時フィールドの変換
      appliedDate: data.appliedDate?.toDate ? data.appliedDate.toDate() : (data.appliedDate ? safeCreateDate(data.appliedDate) : undefined),
      interviewDate: data.interviewDate?.toDate ? data.interviewDate.toDate() : (data.interviewDate ? safeCreateDate(data.interviewDate) : undefined),
      offerDate: data.offerDate?.toDate ? data.offerDate.toDate() : (data.offerDate ? safeCreateDate(data.offerDate) : undefined),
      acceptedDate: data.acceptedDate?.toDate ? data.acceptedDate.toDate() : (data.acceptedDate ? safeCreateDate(data.acceptedDate) : undefined),
      rejectedDate: data.rejectedDate?.toDate ? data.rejectedDate.toDate() : (data.rejectedDate ? safeCreateDate(data.rejectedDate) : undefined),
      // 必須フィールドのデフォルト値
      candidateId: data.candidateId || '',
      jobId: data.jobId || '',
      companyId: data.companyId || '',
      score: data.score || 0,
      status: data.status || 'suggested',
      matchReasons: data.matchReasons || [],
      createdBy: data.createdBy || ''
    } as Match
    
    console.log('✅ マッチング変換完了:', result)
    return result
  } catch (error) {
    console.error('❌ マッチングデータ変換エラー ID:', doc.id, error)
    return {
      id: doc.id,
      candidateId: 'エラー',
      jobId: 'エラー',
      companyId: 'エラー',
      score: 0,
      status: 'suggested',
      matchReasons: [],
      timeline: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ''
    } as Match
  }
}

// マッチング一覧取得
export const getMatches = async (options?: {
  status?: Match['status']
  candidateId?: string
  jobId?: string
  companyId?: string
  limit?: number
}): Promise<Match[]> => {
  try {
    console.log('🔍 getMatches開始', options)
    
    // シンプルなクエリでテスト
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    console.log('📋 Firestoreから取得したマッチングドキュメント数:', snapshot.docs.length)
    
    if (snapshot.docs.length === 0) {
      console.log('❌ Firestoreにマッチングドキュメントが存在しません')
      return []
    }
    
    let matches = snapshot.docs.map(matchFromFirestore)
    console.log('🔄 変換後のマッチングデータ:', matches)
    
    // クライアントサイドフィルタリング
    if (options?.status) {
      matches = matches.filter(match => match.status === options.status)
    }
    if (options?.candidateId) {
      matches = matches.filter(match => match.candidateId === options.candidateId)
    }
    if (options?.jobId) {
      matches = matches.filter(match => match.jobId === options.jobId)
    }
    if (options?.companyId) {
      matches = matches.filter(match => match.companyId === options.companyId)
    }
    if (options?.limit) {
      matches = matches.slice(0, options.limit)
    }
    
    console.log('✅ getMatches完了 返却データ件数:', matches.length)
    return matches
  } catch (error) {
    console.error('❌ getMatchesエラー:', error)
    throw error
  }
}

// マッチング詳細取得
export const getMatch = async (id: string): Promise<Match | null> => {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return matchFromFirestore(docSnap)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting match:', error)
    throw error
  }
}

// マッチング作成
export const createMatch = async (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date()
    const match = matchToFirestore({
      ...matchData,
      createdAt: now,
      updatedAt: now
    })
    
    const cleanedMatch = removeUndefinedFields(match)
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedMatch)
    return docRef.id
  } catch (error) {
    console.error('Error creating match:', error)
    throw error
  }
}

// マッチング更新
export const updateMatch = async (id: string, matchData: Partial<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効なマッチングIDです')
    }
    console.log('🔄 マッチング更新開始 ID:', id, 'データ:', matchData)
    
    const docRef = doc(db, COLLECTION_NAME, id)
    
    // 部分更新用のデータを準備
    const updateFields: any = {
      ...matchData,
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    // 日付フィールドを安全に変換
    if (matchData.timeline) {
      updateFields.timeline = matchData.timeline.map(item => ({
        ...item,
        timestamp: item.timestamp ? Timestamp.fromDate(safeCreateDate(item.timestamp)) : Timestamp.fromDate(new Date())
      }))
    }
    
    const cleanedUpdateData = removeUndefinedFields(updateFields)
    console.log('🔄 更新用データ準備完了:', cleanedUpdateData)
    
    await updateDoc(docRef, cleanedUpdateData)
    console.log('✅ マッチング更新完了')
  } catch (error) {
    console.error('❌ マッチング更新エラー:', error)
    throw error
  }
}

// マッチング削除
export const deleteMatch = async (id: string): Promise<void> => {
  try {
    if (!id || id.trim() === '') {
      console.warn('⚠️ 無効なマッチングIDです')
      return
    }
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting match:', error)
    throw error
  }
}

// ステータス更新（タイムライン追加）
export const updateMatchStatus = async (
  id: string, 
  status: Match['status'], 
  description: string, 
  createdBy: string,
  notes?: string,
  eventDate?: Date | string
): Promise<void> => {
  try {
    console.log('🔄 ステータス更新開始 ID:', id, 'ステータス:', status)
    
    const match = await getMatch(id)
    if (!match) {
      throw new Error('マッチングが見つかりません')
    }

    const newTimelineItem: MatchTimeline = {
      id: `timeline_${Date.now()}`,
      status,
      timestamp: new Date(),
      description,
      createdBy,
      notes
    }

    // 既存のタイムラインを安全に処理
    const existingTimeline = Array.isArray(match.timeline) ? match.timeline : []
    const updatedTimeline = [...existingTimeline, newTimelineItem]

    console.log('🔄 タイムライン更新:', {
      既存件数: existingTimeline.length,
      新規追加: newTimelineItem,
      更新後件数: updatedTimeline.length
    })

    // 更新データを準備
    const updateData: any = {
      status,
      timeline: updatedTimeline
    }

    // ステータスに応じてイベント日時を保存
    if (eventDate) {
      const dateValue = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
      
      switch (status) {
        case 'applied':
          updateData.appliedDate = dateValue
          break
        case 'interviewing':
          updateData.interviewDate = dateValue
          break
        case 'offered':
          updateData.offerDate = dateValue
          break
        case 'accepted':
          updateData.acceptedDate = dateValue
          break
        case 'rejected':
          updateData.rejectedDate = dateValue
          break
      }
    }

    await updateMatch(id, updateData)
    
    console.log('✅ ステータス更新完了')
  } catch (error) {
    console.error('❌ ステータス更新エラー:', error)
    throw error
  }
}

// 候補者のマッチング取得
export const getMatchesByCandidate = async (candidateId: string): Promise<Match[]> => {
  if (!candidateId || candidateId.trim() === '') {
    return []
  }
  return getMatches({ candidateId })
}

// 求人のマッチング取得
export const getMatchesByJob = async (jobId: string): Promise<Match[]> => {
  if (!jobId || jobId.trim() === '') {
    return []
  }
  return getMatches({ jobId })
}

// 企業のマッチング取得
export const getMatchesByCompany = async (companyId: string): Promise<Match[]> => {
  if (!companyId || companyId.trim() === '') {
    return []
  }
  return getMatches({ companyId })
}

// マッチング統計取得
export const getMatchStats = async () => {
  try {
    const matches = await getMatches()
    
    const stats = {
      total: matches.length,
      byStatus: {
        suggested: matches.filter(m => m.status === 'suggested').length,
        interested: matches.filter(m => m.status === 'interested').length,
        applied: matches.filter(m => m.status === 'applied').length,
        interviewing: matches.filter(m => m.status === 'interviewing').length,
        offered: matches.filter(m => m.status === 'offered').length,
        accepted: matches.filter(m => m.status === 'accepted').length,
        rejected: matches.filter(m => m.status === 'rejected').length,
        withdrawn: matches.filter(m => m.status === 'withdrawn').length
      },
      averageScore: matches.length > 0 
        ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
        : 0,
      thisMonth: matches.filter(m => {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return new Date(m.createdAt) > monthAgo
      }).length
    }
    
    return stats
  } catch (error) {
    console.error('Error getting match stats:', error)
    throw error
  }
}