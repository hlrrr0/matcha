// 求人票関連の型定義（新仕様対応版）

export interface Job {
  id: string
  
  // 公開範囲管理
  visibilityType: 'all' | 'school_only' | 'personal'  // 公開範囲（必須）
  
  // 関連ID
  companyId: string                       // 企業ID
  storeIds?: string[]                     // 店舗ID配列（任意・複数店舗対応）
  mainStoreIds?: string[]                 // メイン店舗ID配列（任意・複数メイン店舗対応）
  storeId?: string                        // 店舗ID（任意・後方互換性のため残す）
  
  // 基本情報
  title: string                           // 職種名（必須）
  businessType?: string                   // 業態（任意）
  employmentType?: string                 // 雇用形態（任意）
  
  // 勤務条件
  trialPeriod?: string                    // 試用期間（任意）
  workingHours?: string                   // 勤務時間（任意）
  holidays?: string                       // 休日・休暇（任意）
  overtime?: string                       // 時間外労働（任意）
  
  // 給与情報
  salaryInexperienced?: string            // 給与（未経験）（任意）
  salaryExperienced?: string              // 給与（経験者）（任意）
  
  // 職務・スキル
  requiredSkills?: string                 // 求めるスキル（任意）
  jobDescription?: string                 // 職務内容（任意）
  
  // 年齢制限（管理用・非公開）
  ageLimit?: number                       // 年齢上限（任意）
  ageNote?: string                        // 年齢補足（任意）
  
  // 職場環境・福利厚生
  smokingPolicy?: string                  // 受動喫煙防止措置（任意）
  insurance?: string                      // 加入保険（任意）
  benefits?: string                       // 待遇・福利厚生（任意）
  
  // 選考・その他
  selectionProcess?: string               // 選考プロセス（任意）
  recommendedPoints?: string              // おすすめポイント（任意）
  consultantReview?: string               // キャリア担当からの"正直な"感想（任意）
  
  // ステータス
  status: 'draft' | 'active' | 'closed'  // 求人ステータス
  
  // タグ情報
  tags?: string[]                         // タグ配列（任意）
  
  // フラグ情報
  flags?: {
    highDemand?: boolean                  // 🔥ニーズ高
    provenTrack?: boolean                 // 🎉実績あり
    weakRelationship?: boolean            // 💧関係薄め
  }
  
  // キャリア診断マッチング用データ（任意）
  matchingData?: {
    // ワークライフバランス関連
    workLifeBalance?: {
      monthlyScheduledHours?: number      // 月間拘束時間（時間）
      monthlyActualWorkHours?: number     // 月間実働時間（時間）
      averageOvertimeHours?: number       // 平均残業時間（月/時間）
      weekendWorkFrequency?: 'none' | 'rare' | 'monthly' | 'weekly' // 休日出勤頻度
      holidaysPerMonth?: number           // 月間休日数（日）
    }
    
    // 収入関連
    income?: {
      firstYearMin?: number               // 初年度想定年収・最低（万円）
      firstYearMax?: number               // 初年度想定年収・最高（万円）
      firstYearAverage?: number           // 初年度想定年収・平均（万円）
      thirdYearExpected?: number          // 3年目想定年収（万円）
    }
    
    // 組織・チーム関連
    organization?: {
      teamSize?: number                   // チームサイズ（人数）
      averageAge?: number                 // 平均年齢（歳）
      storeScale?: 'small' | 'medium' | 'large' // 店舗規模
    }
    
    // 飲食業界特有
    industry?: {
      trainingPeriodMonths?: number       // 一人前になるまでの期間（月）
      hasIndependenceSupport?: boolean    // 独立支援制度
      michelinStars?: number              // ミシュラン星数
    }
  }
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
  createdBy?: string                      // 作成者ID
  
  // Indeed掲載管理
  indeedControl?: {
    canPost: boolean                       // Indeed出稿可能か（企業が未掲載なら true）
    exported: boolean                      // CSVエクスポート済みか
    exportedAt?: string | Date             // エクスポート日時
  }
}

export const jobStatusLabels = {
  'draft': '下書き',
  'active': '募集中',
  'closed': '募集終了'
}

export const visibilityTypeLabels = {
  'all': '全体公開',
  'school_only': '飲食人大学限定',
  'personal': '個人用'
} as const

export const employmentTypeLabels = {
  'full-time': '正社員',
  'part-time': 'アルバイト・パート',
  'contract': '契約社員',
  'temporary': '派遣社員',
  'intern': 'インターン',
  'freelance': 'フリーランス'
}

export const weekendWorkFrequencyLabels = {
  'none': 'なし',
  'rare': '稀に（年数回）',
  'monthly': '月1-2回',
  'weekly': '毎週'
}

export const storeScaleLabels = {
  'small': '小規模（1-3店舗）',
  'medium': '中規模（4-10店舗）',
  'large': '大規模（11店舗以上）'
}
