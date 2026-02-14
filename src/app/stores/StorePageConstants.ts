// 店舗ページの定数定義

// ステータス表示色
export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
}

// 店舗データの入力率チェック対象フィールド
export const STORE_COMPLETION_FIELDS = [
  'name', 
  'address', 
  'nearestStation', 
  'unitPriceLunch', 
  'unitPriceDinner',
  'seatCount', 
  'website', 
  'ownerPhoto', 
  'interiorPhoto'
]

// ページネーション設定
export const ITEMS_PER_PAGE = 50

// ソートタイプ
export type SortByType = 'name' | 'companyName' | 'createdAt' | 'updatedAt' | 'status'
export type SortOrderType = 'asc' | 'desc'

// フィルタータイプ
export type JobFilterType = 'all' | 'with-jobs' | 'without-jobs'
export type LocationFilterType = 'all' | 'with-location' | 'without-location'
