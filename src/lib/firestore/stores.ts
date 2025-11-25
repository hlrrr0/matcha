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
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Store } from '@/types/store'
import { extractPrefecture } from '@/lib/utils/prefecture'

export const storesCollection = collection(db, 'stores')

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

// 店舗一覧を取得
export async function getStores(): Promise<Store[]> {
  try {
    const q = query(storesCollection, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeToDate(doc.data().createdAt),
      updatedAt: safeToDate(doc.data().updatedAt),
    } as Store))
  } catch (error) {
    console.error('Error getting stores:', error)
    throw error
  }
}

/**
 * 店舗名と企業IDで既存店舗を検索（重複チェック用）
 */
export async function findStoreByNameAndCompany(name: string, companyId: string): Promise<Store | null> {
  try {
    const q = query(
      storesCollection, 
      where('name', '==', name.trim()),
      where('companyId', '==', companyId.trim())
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0] // 最初に見つかった店舗を返す
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: safeToDate(doc.data().createdAt),
      updatedAt: safeToDate(doc.data().updatedAt),
    } as Store
  } catch (error) {
    console.error('Error finding store by name and company:', error)
    throw error
  }
}

// 企業の店舗一覧を取得
export async function getStoresByCompany(companyId: string): Promise<Store[]> {
  try {
    if (!companyId || companyId.trim() === '') {
      return []
    }
    const q = query(
      storesCollection, 
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeToDate(doc.data().createdAt),
      updatedAt: safeToDate(doc.data().updatedAt),
    } as Store))
  } catch (error) {
    console.error('Error getting stores by company:', error)
    throw error
  }
}

// 特定の店舗を取得
export async function getStoreById(id: string): Promise<Store | null> {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    const docRef = doc(storesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: safeToDate(docSnap.data().createdAt),
        updatedAt: safeToDate(docSnap.data().updatedAt),
      } as Store
    }
    
    return null
  } catch (error) {
    console.error('Error getting store:', error)
    throw error
  }
}

// 店舗を新規作成
export async function createStore(data: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    // 住所から都道府県を自動抽出
    const prefecture = extractPrefecture(data.address)
    
    const storeData = {
      ...data,
      prefecture, // 都道府県を追加
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(storeData)
    
    const docRef = await addDoc(storesCollection, cleanedData)
    return docRef.id
  } catch (error) {
    console.error('Error creating store:', error)
    throw error
  }
}

// 店舗情報を更新
export async function updateStore(
  id: string, 
  data: Partial<Omit<Store, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な店舗IDです')
    }
    const docRef = doc(storesCollection, id)
    
    // 住所が更新される場合は都道府県も更新
    const prefecture = data.address ? extractPrefecture(data.address) : undefined
    
    const updateData = {
      ...data,
      ...(prefecture !== undefined && { prefecture }), // 都道府県がある場合のみ追加
      updatedAt: serverTimestamp(),
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(updateData)
    
    await updateDoc(docRef, cleanedData)
  } catch (error) {
    console.error('Error updating store:', error)
    throw error
  }
}

// 店舗を削除（関連する求人も削除）
export async function deleteStore(id: string): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      console.warn('⚠️ 無効な店舗IDです')
      return
    }
    console.log(`🗑️ 店舗削除開始: ID「${id}」`)
    
    // 削除前に店舗が存在するかチェック
    const docRef = doc(storesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      console.warn(`⚠️ 削除対象の店舗ID「${id}」が見つかりません。既に削除済みの可能性があります。`)
      return
    }
    
    const storeName = docSnap.data()?.name || 'Unknown'
    console.log(`📋 削除対象店舗: ${storeName}`)
    
    // 店舗に関連する求人を検索・削除
    console.log(`💼 店舗「${storeName}」に関連する求人を検索中...`)
    const jobsCollection = collection(db, 'jobs')
    const jobsQuery = query(jobsCollection, where('storeId', '==', id))
    const jobsSnapshot = await getDocs(jobsQuery)
    
    console.log(`📊 関連求人数: ${jobsSnapshot.size}件`)
    
    // 関連求人を削除
    for (const jobDoc of jobsSnapshot.docs) {
      const jobTitle = jobDoc.data().title || 'Unknown'
      console.log(`💼 求人「${jobTitle}」を削除中...`)
      await deleteDoc(jobDoc.ref)
      console.log(`✅ 求人「${jobTitle}」削除完了`)
    }
    
    // 店舗を削除
    await deleteDoc(docRef)
    console.log(`✅ 店舗「${storeName}」(ID: ${id})削除完了`)
    
    console.log(`🎯 削除サマリー:`)
    console.log(`  - 店舗: 1件`)
    console.log(`  - 関連求人: ${jobsSnapshot.size}件`)
    
  } catch (error) {
    console.error(`❌ 店舗ID「${id}」の削除エラー:`, error)
    throw error
  }
}

// 店舗名で検索
export async function searchStoresByName(searchTerm: string): Promise<Store[]> {
  try {
    // Firestoreでは部分一致検索が制限されているため、
    // 実際のプロダクションではAlgoliaやElasticsearchを使用することを推奨
    const querySnapshot = await getDocs(storesCollection)
    
    const stores = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Store))
    
    return stores.filter(store => 
      store.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  } catch (error) {
    console.error('Error searching stores:', error)
    throw error
  }
}

// tabelogURLで既存店舗をチェック
export async function checkStoreByTabelogUrl(tabelogUrl: string): Promise<Store | null> {
  try {
    console.log(`🔍 tabelogURL「${tabelogUrl}」で既存店舗をチェック中...`)
    
    const q = query(storesCollection, where('tabelogUrl', '==', tabelogUrl))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const store = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Store
      
      console.log(`🎯 tabelogURL「${tabelogUrl}」に一致する既存店舗を発見: 「${store.name}」(ID: ${store.id})`)
      return store
    }
    
    console.log(`✅ tabelogURL「${tabelogUrl}」は未登録です`)
    return null
  } catch (error) {
    console.error('tabelogURLチェック中にエラー:', error)
    throw error
  }
}

// 企業内での店舗名重複チェック
export async function checkStoreByNameAndCompany(storeName: string, companyId: string): Promise<Store | null> {
  try {
    console.log(`🔍 企業「${companyId}」内で店舗名「${storeName}」の重複をチェック中...`)
    
    const q = query(
      storesCollection, 
      where('name', '==', storeName),
      where('companyId', '==', companyId)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const store = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Store
      
      console.log(`🎯 企業「${companyId}」内で店舗名「${storeName}」に一致する既存店舗を発見: ID「${store.id}」`)
      return store
    }
    
    console.log(`✅ 企業「${companyId}」内で店舗名「${storeName}」は未登録です`)
    return null
  } catch (error) {
    console.error('店舗名重複チェック中にエラー:', error)
    throw error
  }
}