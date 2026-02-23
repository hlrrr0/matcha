// 求職者関連の型定義（完全版）

export interface Candidate {
  id: string
  
  // 出自管理（求職者の出どころ）
  sourceType: 'inshokujin_univ' | 'mid_career' | 'referral' | 'overseas'  // 求職者区分（必須）
  sourceDetail?: string                                       // 詳細（学校名・紹介元など）（任意）
  
  // 基本情報
  status: 'active' | 'inactive' | 'hired'  // ステータス（必須）
  lastName: string                                            // 名前（姓）（必須）
  firstName: string                                           // 名前（名）（必須）
  lastNameKana?: string                                       // フリガナ（姓）（任意）
  firstNameKana?: string                                      // フリガナ（名）（任意）
  email?: string                                              // メールアドレス（任意）
  phone?: string                                              // 電話番号（任意）
  dateOfBirth?: string                                        // 生年月日（任意）
  enrollmentDate?: string                                     // 入学年月（任意）- 日付型
  campus?: 'tokyo' | 'osaka' | 'awaji' | 'fukuoka' | 'taiwan' | ''     // 入学校舎（任意）- 選択制
  nearestStation?: string                                     // 最寄り駅（任意）
  cookingExperience?: string                                  // 調理経験（任意）
  
  // 希望
  jobSearchTiming?: string                                    // 就職活動をスタートさせるタイミング（任意）
  graduationCareerPlan?: string                              // 卒業"直後"の希望進路（任意）
  preferredArea?: string                                      // 就職・開業希望エリア（任意）
  preferredWorkplace?: string                                 // 就職・開業したいお店の雰囲気・条件（任意）
  futureCareerVision?: string                                // 現時点で考えうる将来のキャリア像（任意）
  questions?: string                                          // その他、キャリア担当への質問等（任意）
  partTimeHope?: string                                       // 在校中のアルバイト希望について（任意）
  
  // inner情報
  applicationFormUrl?: string                                 // 願書_URL（任意）
  resumeUrl?: string                                          // 履歴書_URL（任意）
  teacherComment?: string                                     // 先生からのコメント（任意）
  personalityScore?: string                                   // スコア（人物）（任意）
  skillScore?: string                                         // スコア（スキル）（任意）
  interviewMemo?: string                                      // 面談メモ（任意・旧形式）
  interviewMemos?: InterviewMemo[]                            // 面談メモ（複数・新形式）
  assignedUserId?: string                                     // 担当者ID（任意）
  
  // Slack連携
  slackChannelId?: string                                     // SlackチャンネルID（任意）
  slackMessageTs?: string                                     // Slackメッセージタイムスタンプ（任意）
  slackThreadUrl?: string                                     // Slackスレッドリンク（任意）
  
  // システム管理項目
  createdAt: string
  updatedAt: string
}

// 面談メモ
export interface InterviewMemo {
  id: string
  content: string
  createdBy: string                                           // 作成者のUID
  createdAt: string | Date
}

export const candidateStatusLabels = {
  active: 'アクティブ',
  inactive: '非アクティブ',
  hired: '就職決定'
}

export const sourceTypeLabels = {
  inshokujin_univ: '飲食人大学',
  mid_career: '中途人材',
  referral: '紹介・リファラル',
  overseas: '海外人材'
} as const

export const campusLabels = {
  tokyo: '東京校',
  osaka: '大阪校',
  awaji: '淡路校',
  fukuoka: '福岡校',
  taiwan: '台湾校'
}