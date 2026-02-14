// 食べログURL例外理由の選択肢
export const TABELOG_EXCEPTION_REASONS = [
  { value: '旅館', label: '旅館' },
  { value: '新店舗', label: '新店舗' },
  { value: '海外', label: '海外' },
  { value: 'その他', label: 'その他' },
] as const

// タグ（受賞歴）オプション
export const TAG_OPTIONS = [
  { id: 'hasMichelinStar', label: 'ミシュラン獲得店', tagField: 'michelinStars', tagValue: 1, unsetValue: undefined },
  { id: 'hasBibGourmand', label: 'ミシュランビブグルマン獲得店', tagField: 'hasBibGourmand', tagValue: true, unsetValue: undefined },
  { id: 'hasTabelog100', label: '食べログ100名店掲載店', tagField: 'tabelogAward', tagValue: ['2024'], unsetValue: undefined },
  { id: 'hasTabelogAward', label: '食べログアワード獲得店', tagField: 'hasTabelogAward', tagValue: true, unsetValue: undefined },
  { id: 'hasGoetMiyo', label: 'ゴ・エ・ミヨ掲載店', tagField: 'goetMiyoScore', tagValue: 12, unsetValue: undefined },
] as const

// 追加写真の最大数
export const MAX_ADDITIONAL_PHOTOS = 7
