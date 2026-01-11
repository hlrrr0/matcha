/**
 * LocalStorageベースのキャッシュユーティリティ
 * Firestoreの読み取り件数を削減するために使用
 */

const CACHE_PREFIX = 'app_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5分

interface CacheData<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * キャッシュにデータを保存
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('キャッシュ保存エラー:', error)
    // LocalStorageが満杯の場合は古いキャッシュを削除
    clearExpiredCache()
  }
}

/**
 * キャッシュからデータを取得
 */
export function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    if (!cached) return null

    const cacheData: CacheData<T> = JSON.parse(cached)
    const now = Date.now()

    // TTLチェック
    if (now - cacheData.timestamp > cacheData.ttl) {
      // 期限切れ
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.warn('キャッシュ取得エラー:', error)
    return null
  }
}

/**
 * 特定のキャッシュを削除
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch (error) {
    console.warn('キャッシュ削除エラー:', error)
  }
}

/**
 * 期限切れキャッシュをすべて削除
 */
export function clearExpiredCache(): void {
  try {
    const now = Date.now()
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const cacheData: CacheData<any> = JSON.parse(cached)
            if (now - cacheData.timestamp > cacheData.ttl) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // パース失敗したら削除
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.warn('期限切れキャッシュクリアエラー:', error)
  }
}

/**
 * すべてのアプリケーションキャッシュを削除
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('全キャッシュクリアエラー:', error)
  }
}

/**
 * キャッシュのサイズ情報を取得（デバッグ用）
 */
export function getCacheInfo(): { count: number; totalSize: number } {
  try {
    let count = 0
    let totalSize = 0
    
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        count++
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      }
    })
    
    return { count, totalSize }
  } catch (error) {
    console.warn('キャッシュ情報取得エラー:', error)
    return { count: 0, totalSize: 0 }
  }
}

/**
 * キャッシュキーを生成（フィルター条件を含む）
 */
export function generateCacheKey(
  page: string, 
  filters?: Record<string, any>
): string {
  if (!filters) return page
  
  // フィルター条件をソートして一貫性のあるキーを生成
  const sortedFilters = Object.keys(filters)
    .sort()
    .map(key => `${key}=${filters[key]}`)
    .join('&')
  
  return `${page}_${sortedFilters}`
}
