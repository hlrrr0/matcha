export interface ImportResult {
  success: number
  updated: number
  errors: string[]
  totalRequested: number
  actualReceived: number
  activeReceived?: number
  storesCreated?: number
}

export interface ImportSettings {
  status: 'active'
  sizeCategory: string
  prefecture: string
  limit: number
  since: string
  sinceUntil: string
  includeEmpty: boolean
  useActualAPI: boolean
  useProxy: boolean
}

export interface ImportLog {
  id: string
  timestamp: string
  status: 'success' | 'partial' | 'error'
  settings: {
    status: string
    sizeCategory: string
    prefecture: string
    limit: number
    since: string
    sinceUntil: string
    includeEmpty: boolean
  }
  result: ImportResult
  duration: number // 実行時間（秒）
}

export interface LastImportResult {
  success: number
  updated: number
  errors: string[]
  timestamp: string
  storesCreated?: number
}
