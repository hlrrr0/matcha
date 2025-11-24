// 求職者関連の型定義（完全版）

export interface Candidate {
  id: string
  
  // 基本情報
  status: 'active' | 'inactive'  // ステータス（必須）
  lastName: string                                            // 名前（姓）（必須）
  firstName: string                                           // 名前（名）（必須）
  lastNameKana?: string                                       // フリガナ（姓）（任意）
  firstNameKana?: string                                      // フリガナ（名）（任意）
  email?: string                                              // メールアドレス（任意）
  phone?: string                                              // 電話番号（任意）
  dateOfBirth?: string                                        // 生年月日（任意）
  enrollmentDate?: string                                     // 入学年月（任意）- 日付型
  campus?: 'tokyo' | 'osaka' | 'awaji' | 'fukuoka' | ''     // 入学校舎（任意）- 選択制
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
  interviewMemo?: string                                      // 面談メモ（任意）
  
  // システム管理項目
  createdAt: string
  updatedAt: string
}

export const candidateStatusLabels = {
  active: 'アクティブ',
  inactive: '非アクティブ'
}

export const campusLabels = {
  tokyo: '東京校',
  osaka: '大阪校',
  awaji: '淡路校',
  fukuoka: '福岡校'
}