import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const RATE_LIMITS = {
  free: 10,
  standard: 50,
  premium: 200
}

/**
 * レート制限をチェックする（1日単位）
 * @param client - クライアント情報
 * @returns レート制限内の場合true、超過している場合false
 */
export async function checkRateLimit(client: any): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  try {
    const db = getAdminDb()
    const apiKeyRef = db.collection('apiKeys').doc(client.key)
    const apiKeyDoc = await apiKeyRef.get()
    
    if (!apiKeyDoc.exists) return false
    
    const data = apiKeyDoc.data()
    if (!data) return false

    // 日付が変わったらリセット
    if (data.lastResetDate !== today) {
      await apiKeyRef.update({
        requestCount: 1,
        lastResetDate: today,
        lastUsedAt: FieldValue.serverTimestamp()
      })
      return true
    }

    // レート制限チェック
    const limit = RATE_LIMITS[client.plan as keyof typeof RATE_LIMITS] || RATE_LIMITS.free
    
    if (data.requestCount >= limit) {
      return false
    }

    // カウント増加
    await apiKeyRef.update({
      requestCount: data.requestCount + 1,
      lastUsedAt: FieldValue.serverTimestamp()
    })

    return true
  } catch (error) {
    console.error('Rate limit check error:', error)
    return false
  }
}
