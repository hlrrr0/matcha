import { Timestamp } from 'firebase/firestore'

export interface ApiKey {
  key: string                              // UUID v4
  name: string                             // 管理用の名前（例：○○人材紹介サイト）
  clientName: string                       // クライアント名
  isActive: boolean                        // 有効/無効
  plan: 'free' | 'standard' | 'premium'   // プラン
  
  // レート制限（1日単位）
  dailyLimit: number                       // 1日あたりのリクエスト制限
  requestCount: number                     // 当日のリクエスト数
  lastResetDate: string                    // 最後にリセットした日付（YYYY-MM-DD）
  
  // アクセス制御
  allowedOrigins: string[]                 // 許可するオリジン
  allowedIPs?: string[]                    // 許可するIPアドレス（オプション）
  
  // 利用状況
  createdAt: Timestamp | Date
  lastUsedAt?: Timestamp | Date
  totalRequests: number                    // 累計リクエスト数
  
  // メタデータ
  createdBy?: string                       // 作成者ID
  notes?: string                           // メモ
}

export const apiKeyPlanLabels = {
  'free': 'フリー（10リクエスト/日）',
  'standard': 'スタンダード（50リクエスト/日）',
  'premium': 'プレミアム（200リクエスト/日）'
}

export const rateLimits = {
  free: 10,
  standard: 50,
  premium: 200
}
