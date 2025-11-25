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
import { Company } from '@/types/company'

export const companiesCollection = collection(db, 'companies')

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

/**
 * 全企業を取得
 */
export async function getCompanies(): Promise<Company[]> {
  try {
    const q = query(companiesCollection, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    })) as Company[]
  } catch (error) {
    console.error('Error fetching companies:', error)
    throw error
  }
}

/**
 * ステータス別企業を取得
 */
export async function getCompaniesByStatus(status: Company['status']): Promise<Company[]> {
  try {
    const q = query(
      companiesCollection, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    })) as Company[]
  } catch (error) {
    console.error('Error fetching companies by status:', error)
    throw error
  }
}

/**
 * Domino IDで既存企業を検索
 */
export async function findCompanyByDominoId(dominoId: string): Promise<Company | null> {
  try {
    if (!dominoId || !dominoId.trim()) {
      console.log('⚠️ Domino IDが空です')
      return null
    }
    
    console.log(`🔍 Domino ID「${dominoId}」で企業を検索中...`)
    
    const q = query(
      companiesCollection, 
      where('dominoId', '==', dominoId.trim())
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log(`📭 Domino ID「${dominoId}」に一致する企業が見つかりませんでした`)
      return null
    }
    
    const doc = querySnapshot.docs[0] // 最初に見つかった企業を返す
    console.log(`🎯 Domino ID「${dominoId}」に一致する企業を発見: Firestore ID「${doc.id}」`)
    
    // 見つかった企業が実際に存在するか検証
    const docRef = doc.ref
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      console.log(`⚠️ 検索で見つかった企業ID「${doc.id}」が実際には存在しません`)
      return null
    }
    
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    } as Company
  } catch (error) {
    console.error(`❌ Domino ID「${dominoId}」での企業検索エラー:`, error)
    throw error
  }
}

/**
 * 企業名とウェブサイトで既存企業を検索（重複チェック用）
 */
export async function findCompanyByNameAndWebsite(name: string, website?: string): Promise<Company | null> {
  try {
    if (!name || !name.trim()) {
      console.log('⚠️ 企業名が空です')
      return null
    }

    console.log(`🔍 企業名「${name}」${website ? `、ウェブサイト「${website}」` : ''}で重複チェック中...`)

    // 企業名での検索
    const nameQuery = query(
      companiesCollection, 
      where('name', '==', name.trim())
    )
    const nameSnapshot = await getDocs(nameQuery)

    if (nameSnapshot.empty) {
      console.log(`📭 企業名「${name}」に一致する企業が見つかりませんでした`)
      return null
    }

    // 企業名が一致する企業が見つかった場合
    for (const doc of nameSnapshot.docs) {
      const companyData = doc.data()
      
      // ウェブサイトが指定されている場合は、ウェブサイトも一致するかチェック
      if (website && website.trim()) {
        if (companyData.website && companyData.website.trim() === website.trim()) {
          console.log(`🎯 企業名とウェブサイトの両方が一致する企業を発見: Firestore ID「${doc.id}」`)
          return {
            id: doc.id,
            ...companyData,
            createdAt: companyData.createdAt?.toDate?.() || companyData.createdAt,
            updatedAt: companyData.updatedAt?.toDate?.() || companyData.updatedAt,
          } as Company
        }
      } else {
        // ウェブサイトが指定されていない場合は、企業名のみの一致で重複とする
        console.log(`🎯 企業名が一致する企業を発見: Firestore ID「${doc.id}」`)
        return {
          id: doc.id,
          ...companyData,
          createdAt: companyData.createdAt?.toDate?.() || companyData.createdAt,
          updatedAt: companyData.updatedAt?.toDate?.() || companyData.updatedAt,
        } as Company
      }
    }

    // 企業名は一致したがウェブサイトが一致しない場合
    if (website) {
      console.log(`📭 企業名は一致しましたが、ウェブサイトが一致する企業は見つかりませんでした`)
    }

    return null
  } catch (error) {
    console.error(`❌ 企業名「${name}」${website ? `、ウェブサイト「${website}」` : ''}での重複チェックエラー:`, error)
    throw error
  }
}

/**
 * 企業名と住所で既存企業を検索（重複チェック用）
 */
export async function findCompanyByNameAndAddress(name: string, address: string): Promise<Company | null> {
  try {
    const q = query(
      companiesCollection, 
      where('name', '==', name.trim()),
      where('address', '==', address.trim())
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0] // 最初に見つかった企業を返す
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    } as Company
  } catch (error) {
    console.error('Error finding company by name and address:', error)
    throw error
  }
}

/**
 * 企業をIDで取得
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const docRef = doc(companiesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as Company
    }
    
    return null
  } catch (error) {
    console.error('Error fetching company:', error)
    throw error
  }
}

/**
 * 新規企業を作成
 */
export async function createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(companyData)
    
    const docRef = await addDoc(companiesCollection, {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    return docRef.id
  } catch (error) {
    console.error('Error creating company:', error)
    throw error
  }
}

/**
 * 企業情報を更新
 */
export async function updateCompany(id: string, companyData: Partial<Omit<Company, 'id' | 'createdAt'>>): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な企業IDです')
    }
    console.log(`🔄 企業ID「${id}」の更新を開始...`)
    
    // 企業が存在するかチェック
    const docRef = doc(companiesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      const error = `企業ID「${id}」が見つかりません`
      console.error('❌ ' + error)
      throw new Error(error)
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(companyData)
    console.log(`📝 更新データ（クリーンアップ後）:`, cleanedData)
    
    await updateDoc(docRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    })
    
    console.log(`✅ 企業ID「${id}」の更新が完了`)
  } catch (error) {
    console.error(`❌ 企業ID「${id}」の更新エラー:`, error)
    throw error
  }
}

/**
 * 企業を削除（関連する店舗と求人も削除）
 */
export async function deleteCompany(id: string): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      console.warn('⚠️ 無効な企業IDです')
      return
    }
    console.log(`🗑️ Firestore企業削除開始: ID「${id}」`)
    
    // 削除前に企業が存在するかチェック
    const docRef = doc(companiesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      const error = `削除対象の企業ID「${id}」が見つかりません。データの不整合が発生している可能性があります。`
      console.error('❌ ' + error)
      // エラーを投げる代わりに警告として処理（既に削除済みの可能性）
      console.warn('⚠️ 企業が既に削除されている可能性があります。処理を続行します。')
      return // エラーを投げずに正常終了
    }
    
    const companyName = docSnap.data()?.name || 'Unknown'
    console.log(`📋 削除対象企業: ${companyName}`)
    
    // 関連する店舗を検索・削除
    console.log(`🏪 企業「${companyName}」に関連する店舗を検索中...`)
    const storesCollection = collection(db, 'stores')
    const storesQuery = query(storesCollection, where('companyId', '==', id))
    const storesSnapshot = await getDocs(storesQuery)
    
    console.log(`📊 関連店舗数: ${storesSnapshot.size}件`)
    
    // 各店舗とその関連求人を削除
    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id
      const storeName = storeDoc.data().name || 'Unknown'
      console.log(`🏪 店舗「${storeName}」(ID: ${storeId})を削除中...`)
      
      // 店舗に関連する求人を検索・削除
      console.log(`💼 店舗「${storeName}」に関連する求人を検索中...`)
      const jobsCollection = collection(db, 'jobs')
      const jobsQuery = query(jobsCollection, where('storeId', '==', storeId))
      const jobsSnapshot = await getDocs(jobsQuery)
      
      console.log(`📊 店舗関連求人数: ${jobsSnapshot.size}件`)
      
      // 求人を削除
      for (const jobDoc of jobsSnapshot.docs) {
        const jobTitle = jobDoc.data().title || 'Unknown'
        console.log(`💼 求人「${jobTitle}」を削除中...`)
        await deleteDoc(jobDoc.ref)
        console.log(`✅ 求人「${jobTitle}」削除完了`)
      }
      
      // 店舗を削除
      await deleteDoc(storeDoc.ref)
      console.log(`✅ 店舗「${storeName}」削除完了`)
    }
    
    // 企業に直接紐づく求人（店舗IDなし）も削除
    console.log(`💼 企業「${companyName}」に直接関連する求人を検索中...`)
    const jobsCollection = collection(db, 'jobs')
    const directJobsQuery = query(jobsCollection, where('companyId', '==', id))
    const directJobsSnapshot = await getDocs(directJobsQuery)
    
    console.log(`📊 企業直接関連求人数: ${directJobsSnapshot.size}件`)
    
    // 企業直接関連求人を削除
    for (const jobDoc of directJobsSnapshot.docs) {
      const jobTitle = jobDoc.data().title || 'Unknown'
      console.log(`💼 企業直接求人「${jobTitle}」を削除中...`)
      await deleteDoc(jobDoc.ref)
      console.log(`✅ 企業直接求人「${jobTitle}」削除完了`)
    }
    
    // 最後に企業を削除
    await deleteDoc(docRef)
    console.log(`✅ 企業「${companyName}」(ID: ${id})の削除完了`)
    
    console.log(`🎯 削除サマリー:`)
    console.log(`  - 企業: 1件`)
    console.log(`  - 店舗: ${storesSnapshot.size}件`)
    console.log(`  - 求人: ${directJobsSnapshot.size + storesSnapshot.docs.reduce((total, storeDoc) => total + (storeDoc.data().jobCount || 0), 0)}件`)
    
  } catch (error) {
    console.error(`❌ 企業ID「${id}」の削除エラー:`, error)
    throw error
  }
}

/**
 * 複数企業を一括削除（関連する店舗と求人も削除）
 */
export async function deleteMultipleCompanies(ids: string[]): Promise<{
  success: number
  errors: string[]
}> {
  console.log(`🗑️ 一括削除開始: ${ids.length}件の企業`)
  
  const result = {
    success: 0,
    errors: [] as string[]
  }
  
  for (const id of ids) {
    try {
      await deleteCompany(id)
      result.success++
      console.log(`✅ 企業ID「${id}」の削除完了 (${result.success}/${ids.length})`)
    } catch (error) {
      const errorMessage = `企業ID「${id}」の削除に失敗: ${error}`
      console.error(`❌ ${errorMessage}`)
      result.errors.push(errorMessage)
    }
  }
  
  console.log(`🎯 一括削除完了: 成功 ${result.success}件、エラー ${result.errors.length}件`)
  return result
}

/**
 * 企業名で検索
 */
export async function searchCompaniesByName(searchTerm: string): Promise<Company[]> {
  try {
    // Firestoreは部分一致検索が制限されているため、クライアントサイドでフィルタリング
    const allCompanies = await getCompanies()
    
    return allCompanies.filter(company => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  } catch (error) {
    console.error('Error searching companies:', error)
    throw error
  }
}

/**
 * Dominoから取得したデータを一括インポート
 */
export async function importCompaniesFromDomino(companies: Company[]): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const company of companies) {
    try {
      // DominoIDで既存企業をチェック
      if (company.dominoId) {
        const q = query(companiesCollection, where('dominoId', '==', company.dominoId))
        const existing = await getDocs(q)
        
        if (!existing.empty) {
          // 既存企業を更新
          const existingDoc = existing.docs[0]
          await updateCompany(existingDoc.id, {
            ...company,
            importedAt: new Date(),
          })
        } else {
          // 新規企業を作成
          await createCompany({
            ...company,
            importedAt: new Date(),
          })
        }
      } else {
        // DominoIDがない場合は新規作成
        await createCompany({
          ...company,
          importedAt: new Date(),
        })
      }
      
      success++
    } catch (error) {
      failed++
      errors.push(`${company.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { success, failed, errors }
}

// 個別の企業取得
export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    if (!id || id.trim() === '') {
      return null
    }
    const docRef = doc(companiesCollection, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Company
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting company:', error)
    throw error
  }
}