// 求人票関連の型定義（新仕様対応版）

export interface Job {
  id: string
  
  // 関連ID
  companyId: string                       // 企業ID
  storeIds?: string[]                     // 店舗ID配列（任意・複数店舗対応）
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
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
  createdBy?: string                      // 作成者ID
}

export const jobStatusLabels = {
  'draft': '下書き',
  'active': '募集中',
  'closed': '募集終了'
}

export const employmentTypeLabels = {
  'full-time': '正社員',
  'part-time': 'アルバイト・パート',
  'contract': '契約社員',
  'temporary': '派遣社員',
  'intern': 'インターン',
  'freelance': 'フリーランス'
}