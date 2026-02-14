// 雇用形態の色とラベル
export const EMPLOYMENT_TYPE_COLORS = {
  'full-time': 'bg-blue-100 text-blue-800',
  'part-time': 'bg-purple-100 text-purple-800',
  'contract': 'bg-orange-100 text-orange-800',
  'temporary': 'bg-pink-100 text-pink-800',
  'intern': 'bg-green-100 text-green-800',
} as const

export const EMPLOYMENT_TYPE_LABELS = {
  'full-time': '正社員',
  'part-time': 'アルバイト・パート',
  'contract': '契約社員',
  'temporary': '派遣社員',
  'intern': 'インターン',
} as const

// スライドショーの設定
export const SLIDE_INTERVAL = 4000 // 4秒ごとに自動スライド

// デフォルト値
export const DEFAULT_IMAGE_ALT = 'プレースホルダー画像'
export const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/300x300/cccccc/666666?text=No+Image'
