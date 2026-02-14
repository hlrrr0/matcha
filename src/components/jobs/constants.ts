// Status colors for jobs
export const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
}

// Job field keys for completion rate calculation
export const jobFieldKeys = [
  'title',
  'businessType',
  'employmentType',
  'workingHours',
  'salaryInexperienced',
  'salaryExperienced',
  'jobDescription',
  'benefits',
  'selectionProcess',
  'consultantReview',
]

// Source type filter tabs configuration
export const sourceTypeTabs = [
  { value: 'all', label: 'すべて', icon: null },
  { value: 'inshokujin_univ', label: '🎓 飲食人大学', icon: null },
  { value: 'mid_career', label: '中途人材', icon: null },
  { value: 'referral', label: '紹介・リファラル', icon: null },
  { value: 'overseas', label: '海外人材', icon: null },
]

// View modes
export const VIEW_MODE_LIST = 'list'
export const VIEW_MODE_MAP = 'map'
export type ViewMode = typeof VIEW_MODE_LIST | typeof VIEW_MODE_MAP

// Filter state initial values
export const INITIAL_FILTER_STATE = {
  searchTerm: '',
  statusFilter: 'all' as const,
  sourceTypeFilter: 'all',
  employmentTypeFilter: new Set<string>(),
  consultantFilter: 'all',
  ageLimitFilter: 'all',
  unitPriceLunchMin: '',
  unitPriceLunchMax: '',
  unitPriceDinnerMin: '',
  unitPriceDinnerMax: '',
  reservationSystemFilter: 'all',
  housingSupportFilter: 'all',
  independenceSupportFilter: 'all',
  tabelogExceptionFilter: 'all',
  tagFilter: new Set<string>(),
  flagFilter: new Set<'highDemand' | 'provenTrack' | 'weakRelationship'>(),
}

// Sort options
export type SortBy = 'title' | 'companyName' | 'storeName' | 'status' | 'createdAt' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'

// Tag options
export const tagOptions = [
  'ミシュラン獲得店',
  'ミシュランビブグルマン獲得店',
  '食べログ100名店掲載店',
  '食べログアワード獲得店',
  'ゴ・エ・ミヨ掲載店',
]

// Tabelog exception reasons
export const tabelogExceptionReasons = [
  { value: '旅館', label: '旅館' },
  { value: '新店舗', label: '新店舗' },
  { value: '海外', label: '海外' },
  { value: 'その他', label: 'その他' },
]
