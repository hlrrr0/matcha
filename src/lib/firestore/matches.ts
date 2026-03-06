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
const DEBUG = false // デバッグログを出力するかどうか

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
  
  // Firestore Timestamp の場合
  if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
    try {
      const d = dateValue.toDate()
      return isValidDate(d) ? d : new Date()
    } catch {
      return new Date()
    }
  }
  
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
      timestamp: item.timestamp ? Timestamp.fromDate(safeCreateDate(item.timestamp)) : Timestamp.fromDate(new Date()),
      // eventDateの変換を追加
      eventDate: item.eventDate ? Timestamp.fromDate(safeCreateDate(item.eventDate)) : undefined
    }))
  }
  
  if (DEBUG) {
    console.log('🔄 Firestore変換データ:', {
      createdAt: safeMatch.createdAt,
      updatedAt: safeMatch.updatedAt,
      timelineCount: safeMatch.timeline.length
    })
  }
  
  return safeMatch
}

// Firestoreからのデータ変換
const matchFromFirestore = (doc: any): Match => {
  try {
    const data = doc.data()
    
    const result = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : safeCreateDate(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : safeCreateDate(data.updatedAt),
      timeline: (data.timeline || []).map((item: any) => ({
        ...item,
        timestamp: item.timestamp?.toDate ? item.timestamp.toDate() : safeCreateDate(item.timestamp),
        // eventDateの変換を追加
        eventDate: item.eventDate?.toDate ? item.eventDate.toDate() : (item.eventDate ? safeCreateDate(item.eventDate) : undefined)
      })),
      // イベント日時フィールドの変換
      appliedDate: data.appliedDate?.toDate ? data.appliedDate.toDate() : (data.appliedDate ? safeCreateDate(data.appliedDate) : undefined),
      interviewDate: data.interviewDate?.toDate ? data.interviewDate.toDate() : (data.interviewDate ? safeCreateDate(data.interviewDate) : undefined),
      offerDate: data.offerDate?.toDate ? data.offerDate.toDate() : (data.offerDate ? safeCreateDate(data.offerDate) : undefined),
      acceptedDate: data.acceptedDate?.toDate ? data.acceptedDate.toDate() : (data.acceptedDate ? safeCreateDate(data.acceptedDate) : undefined),
      rejectedDate: data.rejectedDate?.toDate ? data.rejectedDate.toDate() : (data.rejectedDate ? safeCreateDate(data.rejectedDate) : undefined),
      startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate ? safeCreateDate(data.startDate) : undefined),
      endDate: data.endDate?.toDate ? data.endDate.toDate() : (data.endDate ? safeCreateDate(data.endDate) : undefined),
      // 必須フィールドのデフォルト値
      candidateId: data.candidateId || '',
      jobId: data.jobId || '',
      companyId: data.companyId || '',
      score: data.score || 0,
      status: data.status || 'pending_proposal',
      matchReasons: data.matchReasons || [],
      createdBy: data.createdBy || ''
    } as Match
    
    return result
  } catch (error) {
    console.error('❌ マッチングデータ変換エラー ID:', doc.id, error)
    return {
      id: doc.id,
      candidateId: 'エラー',
      jobId: 'エラー',
      companyId: 'エラー',
      score: 0,
      status: 'pending_proposal',
      matchReasons: [],
      timeline: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ''
    } as Match
  }
}

// マッチング一覧取得（Firestoreクエリでフィルタリング）
export const getMatches = async (options?: {
  status?: Match['status']
  candidateId?: string
  jobId?: string
  companyId?: string
  limit?: number
}): Promise<Match[]> => {
  try {
    if (DEBUG) console.log('🔍 getMatches開始', options)

    // Firestoreクエリを構築（サーバーサイドでフィルタリング）
    const constraints: any[] = []

    if (options?.status) {
      constraints.push(where('status', '==', options.status))
    }
    if (options?.candidateId) {
      constraints.push(where('candidateId', '==', options.candidateId))
    }
    if (options?.jobId) {
      constraints.push(where('jobId', '==', options.jobId))
    }
    if (options?.companyId) {
      constraints.push(where('companyId', '==', options.companyId))
    }
    if (options?.limit) {
      constraints.push(limit(options.limit))
    }

    const q = constraints.length > 0
      ? query(collection(db, COLLECTION_NAME), ...constraints)
      : query(collection(db, COLLECTION_NAME))

    const snapshot = await getDocs(q)
    if (DEBUG) console.log('📋 Firestoreから取得したマッチングドキュメント数:', snapshot.docs.length)

    if (snapshot.docs.length === 0) {
      if (DEBUG) console.log('❌ Firestoreにマッチングドキュメントが存在しません')
      return []
    }

    const matches = snapshot.docs.map(matchFromFirestore)

    if (DEBUG) console.log('✅ getMatches完了 返却データ件数:', matches.length)
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
    if (DEBUG) console.log('🔄 マッチング更新開始 ID:', id, 'データ:', matchData)
    
    const docRef = doc(db, COLLECTION_NAME, id)
    
    // 部分更新用のデータを準備
    const updateFields: any = {
      ...matchData,
      updatedAt: Timestamp.fromDate(new Date())
    }
    
    // startDateとendDateを安全に変換
    if (matchData.startDate !== undefined) {
      updateFields.startDate = matchData.startDate ? Timestamp.fromDate(safeCreateDate(matchData.startDate)) : null
    }
    if (matchData.endDate !== undefined) {
      updateFields.endDate = matchData.endDate ? Timestamp.fromDate(safeCreateDate(matchData.endDate)) : null
    }
    
    // 日付フィールドを安全に変換
    if (matchData.timeline) {
      updateFields.timeline = matchData.timeline.map(item => {
        const firestoreItem: any = {
          id: item.id,
          status: item.status,
          timestamp: item.timestamp ? Timestamp.fromDate(safeCreateDate(item.timestamp)) : Timestamp.fromDate(new Date()),
          description: item.description,
          createdBy: item.createdBy
        }
        
        // notes があれば追加（undefined は除外）
        if (item.notes !== undefined && item.notes !== null) {
          firestoreItem.notes = item.notes
        }
        
        // eventDate があれば Timestamp に変換して追加（undefined は除外）
        if (item.eventDate !== undefined && item.eventDate !== null) {
          // 既にFirestore Timestampの場合はそのまま使用
          if (item.eventDate && typeof item.eventDate === 'object' && 'toDate' in item.eventDate) {
            firestoreItem.eventDate = item.eventDate
          } else if (item.eventDate instanceof Date) {
            firestoreItem.eventDate = Timestamp.fromDate(item.eventDate)
          } else {
            firestoreItem.eventDate = Timestamp.fromDate(safeCreateDate(item.eventDate))
          }
        }
        
        return firestoreItem
      })
    }
    
    const cleanedUpdateData = removeUndefinedFields(updateFields)
    if (DEBUG) console.log('🔄 更新用データ準備完了:', cleanedUpdateData)
    
    await updateDoc(docRef, cleanedUpdateData)
    if (DEBUG) console.log('✅ マッチング更新完了')
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
  eventDate?: Date | string,
  interviewRound?: number,
  startDate?: Date | string,
  endDate?: Date | string
): Promise<void> => {
  try {
    if (DEBUG) console.log('🔄 ステータス更新開始 ID:', id, 'ステータス:', status)
    
    const match = await getMatch(id)
    if (!match) {
      throw new Error('マッチングが見つかりません')
    }

    // 一意のタイムスタンプを生成（既存のタイムラインとの重複を避ける）
    const now = Date.now()
    const existingTimeline = Array.isArray(match.timeline) ? match.timeline : []
    
    if (DEBUG) {
      console.log('🔍 既存タイムライン:', existingTimeline.map(item => {
        let eventDateStr = 'なし'
        let eventDateType = 'なし'
        if (item.eventDate) {
          eventDateType = typeof item.eventDate
          // Firestore Timestampかチェック
          if (item.eventDate && typeof item.eventDate === 'object' && 'toDate' in item.eventDate) {
            eventDateType = 'Firestore Timestamp'
            try {
              const d = (item.eventDate as any).toDate()
              eventDateStr = isNaN(d.getTime()) ? '無効な日付' : d.toISOString()
            } catch {
              eventDateStr = 'Timestamp変換エラー'
            }
          } else {
            try {
              const d = item.eventDate instanceof Date 
                ? item.eventDate 
                : new Date(item.eventDate as any)
              eventDateStr = isNaN(d.getTime()) ? '無効な日付' : d.toISOString()
            } catch {
              eventDateStr = 'エラー'
            }
          }
        }
        return {
          id: item.id,
          status: item.status,
          eventDate: eventDateStr,
          eventDateType: eventDateType,
          eventDateRaw: item.eventDate,
          timestamp: item.timestamp
        }
      }))
    }
    
    // 既存のタイムラインの最新のタイムスタンプを取得
    const latestTimestamp = existingTimeline.length > 0
      ? Math.max(...existingTimeline.map(item => {
          const ts = item.timestamp instanceof Date 
            ? item.timestamp.getTime() 
            : new Date(item.timestamp).getTime()
          return isNaN(ts) ? 0 : ts
        }))
      : 0
    
    // 最新のタイムスタンプより1ミリ秒以上後の時刻を使用
    const uniqueTimestamp = Math.max(now, latestTimestamp + 1)

    const newTimelineItem: any = {
      id: `timeline_${uniqueTimestamp}`,
      status,
      timestamp: new Date(uniqueTimestamp),
      description,
      createdBy
    }
    
    // notes があれば追加（undefined は除外）
    if (notes !== undefined && notes !== null) {
      newTimelineItem.notes = notes
    }
    
    // eventDate があれば追加(面接通過を除く)
    // 面接通過ステータスは登録日時のみ表示するため、eventDate は保存しない
    if (status !== 'interview_passed' && eventDate !== undefined && eventDate !== null) {
      newTimelineItem.eventDate = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
    }
    
    console.log('🆕 新規タイムラインアイテム作成:', {
      id: newTimelineItem.id,
      status: newTimelineItem.status,
      eventDate: newTimelineItem.eventDate 
        ? (newTimelineItem.eventDate instanceof Date 
            ? newTimelineItem.eventDate.toISOString() 
            : new Date(newTimelineItem.eventDate).toISOString())
        : 'なし',
      hasEventDateParam: eventDate !== undefined && eventDate !== null ? 'あり' : 'なし'
    })

    // 重複追加を防止するためのチェック:
    // - 直前のタイムラインが同じステータス、作成者、備考であれば追加をスキップする
    // - タイムスタンプ差は許容範囲（例: 10秒）で判定
    let updatedTimeline: MatchTimeline[]
    const lastItem = existingTimeline.length > 0 ? existingTimeline[existingTimeline.length - 1] : null
    const isDuplicate = lastItem && lastItem.status === status && lastItem.createdBy === createdBy && (lastItem.notes || '') === (notes || '') && Math.abs(new Date(lastItem.timestamp).getTime() - uniqueTimestamp) < 10000

    if (isDuplicate) {
      // 重複とみなして追加せず、そのまま既存のタイムラインを使う
      updatedTimeline = existingTimeline
      console.log('⚠️ タイムライン追加スキップ（重複検出）:', { status, createdBy, notes })
    } else {
      updatedTimeline = [...existingTimeline, newTimelineItem]
      if (DEBUG) {
        console.log('🔄 タイムライン更新:', {
          既存件数: existingTimeline.length,
          新規追加: newTimelineItem,
          更新後件数: updatedTimeline.length,
          タイムスタンプ: new Date(uniqueTimestamp).toISOString()
        })
        
        console.log('📋 更新後タイムライン:', updatedTimeline.map(item => {
          let eventDateStr = 'なし'
          if (item.eventDate) {
            try {
              const d = item.eventDate instanceof Date 
                ? item.eventDate 
                : new Date(item.eventDate)
              eventDateStr = isNaN(d.getTime()) ? '無効な日付' : d.toISOString()
            } catch {
              eventDateStr = 'エラー'
            }
          }
          return {
            id: item.id,
            status: item.status,
            eventDate: eventDateStr,
            timestamp: item.timestamp
          }
        }))
      }
    }

    // 更新データを準備
    const updateData: any = {
      status,
      timeline: updatedTimeline
    }

    // 面接回数を更新
    if (interviewRound !== undefined && (status === 'interview' || status === 'interview_passed')) {
      updateData.currentInterviewRound = interviewRound
    }

    // ステータスに応じてイベント日時を保存（後方互換性のため）
    // 面接日時は timeline.eventDate のみに保存し、match.interviewDate は使用しない
    if (eventDate) {
      const dateValue = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
      
      switch (status) {
        case 'applied':
          updateData.appliedDate = dateValue
          break
        case 'interview':
          // 面接日時は timeline.eventDate に保存済み
          // match.interviewDate は後方互換性のため残すが、新規では更新しない
          if (DEBUG) console.log('📅 面接日時を timeline に保存しました')
          break
        case 'interview_passed':
          // 面接通過の場合は日時不要（登録日時のみ表示）
          if (DEBUG) console.log('✅ 面接通過: 日時は保存しません（登録日時のみ表示）')
          break
        case 'offer':
          updateData.offerDate = dateValue
          break
        case 'offer_accepted':
          // 内定承諾日は timeline.eventDate に保存済み
          // match.acceptedDate は後方互換性のため残すが、新規では更新しない
          if (DEBUG) console.log('📅 内定承諾日を timeline に保存しました')
          break
        case 'rejected':
          updateData.rejectedDate = dateValue
          break
      }
    }

    // 入社日の保存
    if (startDate) {
      const startDateValue = typeof startDate === 'string' ? new Date(startDate) : startDate
      updateData.startDate = startDateValue
      if (DEBUG) console.log('📅 入社予定日を保存しました:', startDateValue.toISOString())
    }

    // 退職日の保存
    if (endDate) {
      const endDateValue = typeof endDate === 'string' ? new Date(endDate) : endDate
      updateData.endDate = endDateValue
      if (DEBUG) console.log('📅 退職日を保存しました:', endDateValue.toISOString())
    }

    await updateMatch(id, updateData)
    
    // ステータスが「内定承諾」の場合、候補者ステータスを「hired」に自動更新
    if (status === 'offer_accepted') {
      try {
        if (DEBUG) console.log('💼 内定承諾のため候補者ステータスを「hired」に更新します')
        const { updateCandidate } = await import('./candidates')
        await updateCandidate(match.candidateId, { status: 'hired' })
        if (DEBUG) console.log('✅ 候補者ステータスを「hired」に更新しました')
      } catch (candidateError) {
        console.error('⚠️ 候補者ステータスの更新に失敗しました:', candidateError)
        // 候補者ステータスの更新失敗はエラーにせず警告のみ
      }

      // 求人に「実績あり」フラグを自動設定
      try {
        if (DEBUG) console.log('🎉 内定承諾のため求人に「実績あり」フラグを設定します')
        const jobDocRef = doc(db, 'jobs', match.jobId)
        const jobSnapshot = await getDoc(jobDocRef)
        
        if (jobSnapshot.exists()) {
          const currentFlags = jobSnapshot.data().flags || {}
          await updateDoc(jobDocRef, {
            flags: {
              ...currentFlags,
              provenTrack: true
            },
            updatedAt: new Date()
          })
          if (DEBUG) console.log('✅ 求人に「実績あり」フラグを設定しました')
        }
      } catch (jobError) {
        console.error('⚠️ 求人フラグの更新に失敗しました:', jobError)
        // 求人フラグの更新失敗はエラーにせず警告のみ
      }
    }

    // Slack通知を送信（非同期で実行、エラーは無視）
    console.log('🔔 Slack通知を送信します - ステータス:', status)
    
    // API route経由で通知を送信（firebase-adminをクライアント側にバンドルしないため）
    fetch('/api/slack/notify-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        candidateId: match.candidateId,
        jobId: match.jobId,
        companyId: match.companyId,
        status,
        eventDate: eventDate ? (typeof eventDate === 'string' ? eventDate : eventDate.toISOString()) : undefined,
        notes
      })
    }).catch(error => {
      console.error('⚠️ Slack通知の送信に失敗しました:', error)
    })
    
    if (DEBUG) console.log('✅ ステータス更新完了')
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
        applied: matches.filter(m => m.status === 'applied').length,
        document_screening: matches.filter(m => m.status === 'document_screening').length,
        document_passed: matches.filter(m => m.status === 'document_passed').length,
        interview: matches.filter(m => m.status === 'interview').length,
        interview_passed: matches.filter(m => m.status === 'interview_passed').length,
        offer: matches.filter(m => m.status === 'offer').length,
        offer_accepted: matches.filter(m => m.status === 'offer_accepted').length,
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

// タイムラインアイテムの編集
export const updateTimelineItem = async (
  matchId: string,
  timelineId: string,
  description: string,
  notes?: string,
  eventDate?: Date | string
): Promise<void> => {
  if (!matchId || matchId.trim() === '') {
    throw new Error('Invalid match ID')
  }
  if (!timelineId || timelineId.trim() === '') {
    throw new Error('Invalid timeline ID')
  }

  try {
    const matchRef = doc(db, COLLECTION_NAME, matchId)
    const matchDoc = await getDoc(matchRef)
    
    if (!matchDoc.exists()) {
      throw new Error('Match not found')
    }

    const matchData = matchDoc.data() as Match
    const timeline = matchData.timeline || []
    
    // 該当するタイムラインアイテムを更新
    const updatedTimeline = timeline.map(item => {
      if (item.id === timelineId) {
        const updatedItem: any = {
          ...item,
          description,
          notes: notes || item.notes
        }
        
        // eventDate が指定されている場合は更新
        if (eventDate !== undefined) {
          updatedItem.eventDate = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
        }
        
        return updatedItem
      }
      return item
    })

    // Firestore に保存する際に Date を Timestamp に変換し、undefined を除外
    const firestoreTimeline = updatedTimeline.map(item => {
      const firestoreItem: any = {
        id: item.id,
        status: item.status,
        timestamp: item.timestamp instanceof Date 
          ? Timestamp.fromDate(item.timestamp)
          : Timestamp.fromDate(safeCreateDate(item.timestamp)),
        description: item.description,
        createdBy: item.createdBy
      }
      
      // notes があれば追加（undefined は除外）
      if (item.notes !== undefined && item.notes !== null) {
        firestoreItem.notes = item.notes
      }
      
      // eventDate があれば Timestamp に変換して追加（undefined は除外）
      if (item.eventDate !== undefined && item.eventDate !== null) {
        firestoreItem.eventDate = item.eventDate instanceof Date
          ? Timestamp.fromDate(item.eventDate)
          : Timestamp.fromDate(safeCreateDate(item.eventDate))
      }
      
      return firestoreItem
    })

    await updateDoc(matchRef, {
      timeline: firestoreTimeline,
      updatedAt: Timestamp.fromDate(new Date())
    })
  } catch (error) {
    console.error('Error updating timeline item:', error)
    throw error
  }
}

// タイムラインアイテムの削除（最新のみ）
export const deleteLatestTimelineItem = async (
  matchId: string,
  timelineId: string
): Promise<void> => {
  if (!matchId || matchId.trim() === '') {
    throw new Error('Invalid match ID')
  }
  if (!timelineId || timelineId.trim() === '') {
    throw new Error('Invalid timeline ID')
  }

  try {
    const matchRef = doc(db, COLLECTION_NAME, matchId)
    const matchDoc = await getDoc(matchRef)
    
    if (!matchDoc.exists()) {
      throw new Error('Match not found')
    }

    const matchData = matchDoc.data() as Match
    const timeline = matchData.timeline || []
    
    // タイムラインを時系列順にソート（最新が最後）
    const sortedTimeline = [...timeline].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return timeA - timeB
    })
    
    // 最新のタイムラインアイテムのIDを確認
    const latestItem = sortedTimeline[sortedTimeline.length - 1]
    if (!latestItem || latestItem.id !== timelineId) {
      throw new Error('削除できるのは最新の進捗のみです')
    }
    
    // 削除対象以外のタイムラインアイテムを残す
    const updatedTimeline = timeline.filter(item => item.id !== timelineId)
    
    // 削除後のステータスを前の進捗のステータスに戻す
    let previousStatus: Match['status'] = 'suggested'
    if (updatedTimeline.length > 0) {
      // 最新のタイムラインアイテムのステータスを取得
      const sortedUpdated = [...updatedTimeline].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
        return timeA - timeB
      })
      previousStatus = sortedUpdated[sortedUpdated.length - 1].status
    }

    await updateDoc(matchRef, {
      status: previousStatus,
      timeline: updatedTimeline.map(item => ({
        ...item,
        timestamp: item.timestamp instanceof Date 
          ? Timestamp.fromDate(item.timestamp)
          : Timestamp.fromDate(safeCreateDate(item.timestamp))
      })),
      updatedAt: Timestamp.fromDate(new Date())
    })
    
    console.log('✅ タイムライン削除完了 ステータスを戻しました:', previousStatus)
  } catch (error) {
    console.error('Error deleting timeline item:', error)
    throw error
  }
}