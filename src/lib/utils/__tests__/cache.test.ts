import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setCache,
  getCache,
  removeCache,
  clearExpiredCache,
  clearAllCache,
  getCacheInfo,
  generateCacheKey,
} from '../cache'

// localStorage のモック
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

// Object.keys(localStorage) が動くようにする
Object.defineProperty(localStorageMock, Symbol.iterator, {
  value: function* () {
    yield* Object.keys(localStorageMock)
  }
})

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', localStorageMock)
  // Object.keys(localStorage) をモックするために store を参照
})

// Object.keys が localStorage に対して動くようにするために、
// localStorage の内部ストアを keys として返すようにする
vi.stubGlobal('localStorage', new Proxy(localStorageMock, {
  ownKeys: () => {
    // localStorageMock.setItem で保存されたキーを返す
    const calls = localStorageMock.setItem.mock.calls as [string, string][]
    const removedKeys = new Set(
      (localStorageMock.removeItem.mock.calls as [string][]).map(c => c[0])
    )
    const keys = new Set<string>()
    for (const [key] of calls) {
      if (!removedKeys.has(key)) keys.add(key)
    }
    return [...keys]
  },
  getOwnPropertyDescriptor: () => ({
    configurable: true,
    enumerable: true,
  }),
}))

describe('setCache / getCache', () => {
  it('データを保存して取得できる', () => {
    setCache('test', { name: 'hello' })
    const result = getCache<{ name: string }>('test')
    expect(result).toEqual({ name: 'hello' })
  })

  it('TTL切れのデータはnullを返す', () => {
    // 過去のタイムスタンプでデータを直接設定
    const expired = JSON.stringify({
      data: 'old',
      timestamp: Date.now() - 10 * 60 * 1000, // 10分前
      ttl: 5 * 60 * 1000, // 5分TTL
    })
    localStorageMock.setItem('app_cache_expired', expired)
    expect(getCache('expired')).toBeNull()
  })

  it('カスタムTTLを指定できる', () => {
    setCache('custom', 'data', 1000)
    const cached = localStorageMock.setItem.mock.calls.find(
      (c: [string, string]) => c[0] === 'app_cache_custom'
    )
    expect(cached).toBeDefined()
    const parsed = JSON.parse(cached![1])
    expect(parsed.ttl).toBe(1000)
  })
})

describe('removeCache', () => {
  it('指定したキャッシュを削除できる', () => {
    setCache('toRemove', 'data')
    removeCache('toRemove')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('app_cache_toRemove')
  })
})

describe('generateCacheKey', () => {
  it('フィルターなしの場合はページ名のみ返す', () => {
    expect(generateCacheKey('jobs')).toBe('jobs')
  })

  it('フィルター付きの場合はソートされたキーで生成する', () => {
    const key = generateCacheKey('jobs', { status: 'active', area: 'tokyo' })
    expect(key).toBe('jobs_area=tokyo&status=active')
  })

  it('フィルターのキー順序に依存しない', () => {
    const key1 = generateCacheKey('jobs', { b: '2', a: '1' })
    const key2 = generateCacheKey('jobs', { a: '1', b: '2' })
    expect(key1).toBe(key2)
  })
})
