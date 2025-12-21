export interface Store {
  id: string
  companyId: string              // 企業ID（外部キー）
  
  // 基本情報
  name: string                   // 店舗名
  businessType?: string          // 業態
  address?: string               // 店舗住所
  prefecture?: string            // 都道府県（住所から自動抽出）
  nearestStation?: string        // 最寄り駅
  website?: string               // 店舗URL
  unitPriceLunch?: number        // 単価（昼）
  unitPriceDinner?: number       // 単価（夜）
  seatCount?: number             // 席数
  isReservationRequired?: boolean // 予約制なのか(時間固定の)
  instagramUrl?: string          // Instagram URL
  tabelogUrl?: string           // 食べログURL
  tabelogUrlException?: string   // 食べログURL例外理由（旅館/新店舗/その他）
  tabelogUrlExceptionOther?: string // 食べログURL例外理由（その他の詳細）
  
  // 詳細セクション
  googleReviewScore?: string     // Googleの口コミスコア
  tabelogScore?: string          // 食べログの口コミスコア
  reputation?: string            // その他 / ミシュランなどの獲得状況等の実績
  staffReview?: string           // スタッフが食べに行った"正直な"感想
  trainingPeriod?: string        // 握れるまでの期間
  
  // タグ情報
  tags?: {
    michelinStars?: number              // ミシュラン星数（1-3）
    hasBibGourmand?: boolean            // ビブグルマン獲得
    tabelogAward?: string[]             // 食べログアワード・100名店（年度タグ）例: ['2023', '2024']
    goetMiyoScore?: number              // ゴ・エ・ミヨ スコア
  }
  
  // 素材セクション（10枚まで）
  ownerPhoto?: string            // 大将の写真
  ownerVideo?: string            // 大将の動画
  interiorPhoto?: string         // 店内の写真
  photo1?: string                // 素材写真1
  photo2?: string                // 素材写真2
  photo3?: string                // 素材写真3
  photo4?: string                // 素材写真4
  photo5?: string                // 素材写真5
  photo6?: string                // 素材写真6
  photo7?: string                // 素材写真7
  
  status: 'active' | 'inactive'  // 店舗ステータス
  createdAt: Date
  updatedAt: Date
  
  // Domino連携用フィールド
  dominoId?: string              // Domino側のID
  dominoCompanyId?: string       // Domino側の企業ID
  importedAt?: Date              // インポート日時
  phone?: string                 // 電話番号（Domino連携用）
  manager?: string               // 店長名（Domino連携用）
  operatingHours?: string        // 営業時間（Domino連携用）
  notes?: string                 // メモ（Domino連携用）
}

export const statusLabels = {
  active: 'アクティブ',
  inactive: '非アクティブ'
}