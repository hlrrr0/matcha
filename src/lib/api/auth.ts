import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * APIキーを検証する
 * @param apiKey - 検証するAPIキー
 * @returns APIキーが有効な場合はクライアント情報、無効な場合はnull
 */
export async function verifyApiKey(apiKey: string | null) {
  if (!apiKey) return null

  try {
    const db = getAdminDb()
    const apiKeyDoc = await db.collection('apiKeys').doc(apiKey).get()
    
    if (!apiKeyDoc.exists) return null

    const data = apiKeyDoc.data()
    
    if (!data || !data.isActive) return null

    // 最終使用日時を更新
    await db.collection('apiKeys').doc(apiKey).update({
      lastUsedAt: FieldValue.serverTimestamp(),
      totalRequests: FieldValue.increment(1)
    })

    return {
      key: apiKey,
      ...data
    }
  } catch (error) {
    console.error('API key verification error:', error)
    return null
  }
}
