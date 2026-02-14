// Prefecture order (geographic from north to south)
export const PREFECTURE_ORDER = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県',
  '都道府県未設定'
]

// Store scale determination based on store count
export const STORE_SCALE_THRESHOLDS = {
  small: 3,      // <= 3 stores
  medium: 10,    // 4-10 stores
  large: Infinity // 11+
} as const

// Default field labels for copy function
export const FIELD_LABELS = `
求人情報入力項目:

【基本情報】
- 求人ステータス
- 企業
- 店舗
- 職種名
- 業種
- 雇用形態

【職務・スキル】
- 職務内容
- 求めるスキル

【勤務条件】
- 試用期間
- 勤務時間
- 休日・休暇
- 時間外労働

【給与情報】
- 給与（未経験）
- 給与（経験者）

【職場環境・福利厚生】
- 受動喫煙防止措置
- 加入保険
- 待遇・福利厚生

【選考・その他】
- 選考プロセス
- おすすめポイント
- キャリア担当からの"正直な"感想
`.trim()

// Employment types
export const EMPLOYMENT_TYPES = [
  '正社員',
  'アルバイト',
  'パートタイム',
  '契約社員',
  '派遣社員',
  '委託業務'
]

// Default form data structure
export const DEFAULT_FORM_DATA = {
  companyId: '',
  storeIds: [],
  visibilityType: 'all',
  allowedSources: [],
  title: '',
  businessType: '',
  employmentType: '',
  trialPeriod: '',
  workingHours: '',
  holidays: '',
  overtime: '',
  salaryInexperienced: '',
  salaryExperienced: '',
  requiredSkills: '',
  jobDescription: '',
  ageLimit: undefined,
  ageNote: '',
  smokingPolicy: '',
  insurance: '',
  benefits: '',
  selectionProcess: '',
  recommendedPoints: '',
  consultantReview: '',
  status: 'draft',
  matchingData: {}
}
