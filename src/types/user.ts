// ユーザー・認証関連の型定義
export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  role: 'pending' | 'user' | 'admin' | 'rejected'
  status: 'active' | 'inactive' | 'suspended'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  
  // プロフィール情報
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  
  // 権限
  permissions: Permission[]
  
  // 担当
  assignedCandidates?: string[] // candidate IDs
  assignedCompanies?: string[] // company IDs
  
  // Slack連携
  slackId?: string // Slack user ID (例: U01234567)
  
  // メタデータ
  lastLoginAt?: string | Date
}

// 権限
export interface Permission {
  resource: 'candidates' | 'companies' | 'jobs' | 'matches' | 'analytics' | 'settings'
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

// Dominoシステム連携設定
export interface DominoIntegration {
  id: string
  apiKey: string
  baseUrl: string
  webhookUrl?: string
  isActive: boolean
  
  // 同期設定
  syncSettings: SyncSettings
  
  // 統計
  lastSyncAt?: string | Date
  totalImports: number
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
}

// 同期設定
export interface SyncSettings {
  autoSync: boolean
  syncInterval: number // 分
  includeJobs: boolean
  includeLeads: boolean
  includeShops: boolean
  statusFilter: string[] // どのステータスの企業を取得するか
}