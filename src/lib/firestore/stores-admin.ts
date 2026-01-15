/**
 * Firebase Admin SDK用の店舗データ操作関数
 * API Routes専用（サーバーサイドのみ）
 */

import { getAdminFirestore } from '@/lib/firebase-admin'
import { Store } from '@/types/store'
import { extractPrefecture } from '@/lib/utils/prefecture'

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

// 安全な日付変換関数
function safeToDate(value: any): Date {
  if (!value) return new Date()
  
  // Firestoreのタイムスタンプの場合
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate()
  }
  
  // 文字列の場合
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? new Date() : date
  }
  
  // Dateオブジェクトの場合
  if (value instanceof Date) {
    return value
  }
  
  return new Date()
}

/**
 * 店舗名と企業IDで既存店舗を検索（Admin SDK版）
 */
export async function findStoreByNameAndCompany(name: string, companyId: string): Promise<Store | null> {
  try {
    console.log(`🔍 [Admin] 店舗名「${name}」、企業ID「${companyId}」で重複チェック中...`)
    
    const db = getAdminFirestore()
    const snapshot = await db.collection('stores')
      .where('name', '==', name.trim())
      .where('companyId', '==', companyId.trim())
      .limit(1)
      .get()
    
    if (snapshot.empty) {
      console.log(`📭 該当する店舗が見つかりませんでした`)
      return null
    }
    
    const doc = snapshot.docs[0]
    console.log(`🎯 店舗を発見: Firestore ID「${doc.id}」`)
    
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: safeToDate(data.createdAt),
      updatedAt: safeToDate(data.updatedAt),
    } as Store
  } catch (error) {
    console.error('❌ [Admin] 店舗検索エラー:', error)
    throw error
  }
}

/**
 * 企業の店舗一覧を取得（Admin SDK版）
 */
export async function getStoresByCompany(companyId: string): Promise<Store[]> {
  try {
    if (!companyId || companyId.trim() === '') {
      return []
    }
    
    console.log(`🔍 [Admin] 企業ID「${companyId}」の店舗一覧を取得中...`)
    
    const db = getAdminFirestore()
    const snapshot = await db.collection('stores')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get()
    
    const stores = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      } as Store
    })
    
    console.log(`✅ [Admin] ${stores.length}件の店舗を取得しました`)
    return stores
  } catch (error) {
    console.error('❌ [Admin] 店舗一覧取得エラー:', error)
    throw error
  }
}

/**
 * 特定の店舗を取得（Admin SDK版）
 */
export async function getStoreById(id: string): Promise<Store | null> {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    
    const db = getAdminFirestore()
    const doc = await db.collection('stores').doc(id).get()
    
    if (!doc.exists) {
      return null
    }
    
    const data = doc.data()!
    return {
      id: doc.id,
      ...data,
      createdAt: safeToDate(data.createdAt),
      updatedAt: safeToDate(data.updatedAt),
    } as Store
  } catch (error) {
    console.error('[Admin] 店舗取得エラー:', error)
    throw error
  }
}

/**
 * 店舗を新規作成（Admin SDK版）
 */
export async function createStore(data: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('📝 [Admin] 新規店舗を作成中...', { name: data.name, companyId: data.companyId })
    
    // 住所から都道府県を自動抽出
    const prefecture = extractPrefecture(data.address)
    
    const storeData = {
      ...data,
      prefecture, // 都道府県を追加
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(storeData)
    
    const db = getAdminFirestore()
    const docRef = await db.collection('stores').add(cleanedData)
    
    console.log(`✅ [Admin] 店舗を作成しました: ID「${docRef.id}」`)
    return docRef.id
  } catch (error) {
    console.error('❌ [Admin] 店舗作成エラー:', error)
    throw error
  }
}

/**
 * 店舗情報を更新（Admin SDK版）
 */
export async function updateStore(
  id: string, 
  data: Partial<Omit<Store, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な店舗IDです')
    }
    
    console.log(`🔄 [Admin] 店舗ID「${id}」の更新を開始...`)
    
    const db = getAdminFirestore()
    const docRef = db.collection('stores').doc(id)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      const error = `店舗ID「${id}」が見つかりません`
      console.error('❌ ' + error)
      throw new Error(error)
    }
    
    // 住所が更新される場合は都道府県も更新
    const prefecture = data.address ? extractPrefecture(data.address) : undefined
    
    const updateData = {
      ...data,
      ...(prefecture !== undefined && { prefecture }), // 都道府県がある場合のみ追加
      updatedAt: new Date(),
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(updateData)
    
    await docRef.update(cleanedData)
    
    console.log(`✅ [Admin] 店舗ID「${id}」を更新しました`)
  } catch (error) {
    console.error(`❌ [Admin] 店舗ID「${id}」の更新エラー:`, error)
    throw error
  }
}
