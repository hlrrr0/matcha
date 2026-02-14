// Size categories
export const sizeCategoryOptions = [
  { value: 'all', label: '全ての企業規模' },
  { value: 'startup', label: 'スタートアップ' },
  { value: 'small', label: '小企業' },
  { value: 'medium', label: '中企業' },
  { value: 'large', label: '大企業' },
  { value: 'enterprise', label: 'エンタープライズ' }
]

// Limit options
export const limitOptions = [
  { value: '50', label: 'アクティブ企業50件' },
  { value: '100', label: 'アクティブ企業100件' },
  { value: '150', label: 'アクティブ企業150件' },
  { value: '500', label: 'アクティブ企業500件' },
  { value: '1000', label: 'アクティブ企業1000件' }
]

// Default settings
export const DEFAULT_IMPORT_SETTINGS = {
  status: 'active' as const,
  sizeCategory: 'all',
  prefecture: '',
  limit: 100,
  since: '',
  sinceUntil: '',
  includeEmpty: false,
  useActualAPI: false,
  useProxy: true
}

// Maximum logs to keep
export const MAX_IMPORT_LOGS = 10
