/**
 * Firebase Admin SDK用の企業データ操作関数
 * API Routes専用（サーバーサイドのみ）
 */

import { getAdminFirestore } from '@/lib/firebase-admin'
import { Company } from '@/types/company'

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
 * Domino IDで既存企業を検索（Admin SDK版）
 */
export async function findCompanyByDominoId(dominoId: string): Promise<Company | null> {
  try {
    if (!dominoId || !dominoId.trim()) {
      console.log('⚠️ Domino IDが空です')
      return null
    }
    
    console.log(`🔍 [Admin] Domino ID「${dominoId}」で企業を検索中...`)
    
    const db = getAdminFirestore()
    const snapshot = await db.collection('companies')
      .where('dominoId', '==', dominoId.trim())
      .limit(1)
      .get()
    
    if (snapshot.empty) {
      console.log(`📭 Domino ID「${dominoId}」に一致する企業が見つかりませんでした`)
      return null
    }
    
    const doc = snapshot.docs[0]
    console.log(`🎯 Domino ID「${dominoId}」に一致する企業を発見: Firestore ID「${doc.id}」`)
    
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as Company
  } catch (error) {
    console.error(`❌ [Admin] Domino ID「${dominoId}」での企業検索エラー:`, error)
    throw error
  }
}

/**
 * 企業名とウェブサイトで既存企業を検索（Admin SDK版）
 */
export async function findCompanyByNameAndWebsite(name: string, website?: string): Promise<Company | null> {
  try {
    if (!name || !name.trim()) {
      console.log('⚠️ 企業名が空です')
      return null
    }

    console.log(`🔍 [Admin] 企業名「${name}」${website ? `、ウェブサイト「${website}」` : ''}で重複チェック中...`)

    const db = getAdminFirestore()
    const snapshot = await db.collection('companies')
      .where('name', '==', name.trim())
      .get()

    if (snapshot.empty) {
      console.log(`📭 企業名「${name}」に一致する企業が見つかりませんでした`)
      return null
    }

    // 企業名が一致する企業が見つかった場合
    for (const doc of snapshot.docs) {
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
    console.error(`❌ [Admin] 企業名「${name}」${website ? `、ウェブサイト「${website}」` : ''}での重複チェックエラー:`, error)
    throw error
  }
}

/**
 * 新規企業を作成（Admin SDK版）
 */
export async function createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('📝 [Admin] 新規企業を作成中...', { name: companyData.name, dominoId: companyData.dominoId })
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(companyData)
    
    const db = getAdminFirestore()
    const docRef = await db.collection('companies').add({
      ...cleanedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    console.log(`✅ [Admin] 企業を作成しました: ID「${docRef.id}」`)
    return docRef.id
  } catch (error) {
    console.error('❌ [Admin] 企業作成エラー:', error)
    throw error
  }
}

/**
 * 企業情報を更新（Admin SDK版）
 */
export async function updateCompany(id: string, companyData: Partial<Omit<Company, 'id' | 'createdAt'>>): Promise<void> {
  try {
    if (!id || id.trim() === '') {
      throw new Error('無効な企業IDです')
    }
    console.log(`🔄 [Admin] 企業ID「${id}」の更新を開始...`)
    
    const db = getAdminFirestore()
    const docRef = db.collection('companies').doc(id)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      const error = `企業ID「${id}」が見つかりません`
      console.error('❌ ' + error)
      throw new Error(error)
    }
    
    // undefinedフィールドを除去
    const cleanedData = removeUndefinedFields(companyData)
    
    await docRef.update({
      ...cleanedData,
      updatedAt: new Date(),
    })
    
    console.log(`✅ [Admin] 企業ID「${id}」を更新しました`)
  } catch (error) {
    console.error(`❌ [Admin] 企業ID「${id}」の更新エラー:`, error)
    throw error
  }
}

/**
 * 企業をIDで取得（Admin SDK版）
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const db = getAdminFirestore()
    const doc = await db.collection('companies').doc(id).get()
    
    if (!doc.exists) {
      return null
    }
    
    const data = doc.data()!
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as Company
  } catch (error) {
    console.error('[Admin] 企業取得エラー:', error)
    throw error
  }
}
