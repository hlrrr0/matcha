/**
 * 認証付きAPIリクエストヘルパー
 */

import { auth } from '@/lib/firebase'

/**
 * 認証トークンを取得
 */
export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) {
    console.error('❌ No authenticated user found')
    throw new Error('ログインが必要です')
  }
  
  try {
    console.log('🔑 Getting ID token for user:', user.uid)
    const token = await user.getIdToken()
    console.log('✅ ID token obtained successfully')
    return token
  } catch (error) {
    console.error('❌ Token retrieval error:', error)
    throw new Error('認証トークンの取得に失敗しました')
  }
}

/**
 * 認証ヘッダーを取得
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * 認証付きPOSTリクエスト
 */
export async function authenticatedPost(url: string, body: any) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  
  if (response.status === 401) {
    throw new Error('認証エラー: ログインし直してください')
  }
  
  if (response.status === 429) {
    throw new Error('リクエスト制限: しばらく待ってから再度お試しください')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'リクエストに失敗しました')
  }
  
  return response.json()
}

/**
 * 認証付きGETリクエスト
 */
export async function authenticatedGet(url: string) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(url, {
    method: 'GET',
    headers
  })
  
  if (response.status === 401) {
    throw new Error('認証エラー: ログインし直してください')
  }
  
  if (response.status === 429) {
    throw new Error('リクエスト制限: しばらく待ってから再度お試しください')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'リクエストに失敗しました')
  }
  
  return response.json()
}
