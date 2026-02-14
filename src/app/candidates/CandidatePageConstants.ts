// キャンパス関連の定数
export const CAMPUS_COLORS = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200',
  taiwan: 'bg-red-100 text-red-800 border-red-200'
}

// マッチングステータス関連の定数
export const STATUS_LABELS: Record<string, string> = {
  pending_proposal: '提案待ち',
  suggested: '提案',
  applied: '応募',
  document_screening: '書類選考',
  document_passed: '書類通過',
  interview: '面接',
  interview_passed: '面接通過',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

export const STATUS_COLORS: Record<string, string> = {
  pending_proposal: 'bg-slate-100 text-slate-800',
  suggested: 'bg-blue-100 text-blue-800',
  applied: 'bg-purple-100 text-purple-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-cyan-100 text-cyan-800',
  interview: 'bg-orange-100 text-orange-800',
  interview_passed: 'bg-teal-100 text-teal-800',
  offer: 'bg-green-100 text-green-800',
  offer_accepted: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
}

export const STATUS_PRIORITY: Record<string, number> = {
  offer_accepted: 9,
  offer: 8,
  interview_passed: 7,
  interview: 6,
  document_passed: 5,
  document_screening: 4,
  applied: 3,
  suggested: 2,
  pending_proposal: 1,
  withdrawn: 0,
  rejected: 0
}

// デフォルト設定
export const DEFAULT_ITEMS_PER_PAGE = 50
export const DEFAULT_STATUS_FILTER = 'active'
export const DEFAULT_CAMPUS_FILTER = 'all'
export const DEFAULT_SOURCE_TYPE_FILTER = 'all'
export const DEFAULT_ENROLLMENT_FILTER = 'all'

// ソートオプション
export type SortBy = 'name' | 'campus' | 'enrollmentDate' | 'status' | 'createdAt' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'
