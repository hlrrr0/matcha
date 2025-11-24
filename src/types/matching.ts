// マッチング関連の型定義
export interface Match {
  id: string
  candidateId: string
  jobId: string
  companyId: string
  
  // マッチング詳細
  score: number // 0-100のマッチングスコア
  status: 'suggested' | 'interested' | 'applied' | 'interviewing' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'
  
  // マッチング理由
  matchReasons: MatchReason[]
  
  // 進捗情報
  timeline: MatchTimeline[]
  
  // イベント日時
  appliedDate?: string | Date // 応募日
  interviewDate?: string | Date // 面接日
  offerDate?: string | Date // オファー日
  acceptedDate?: string | Date // 承諾日
  rejectedDate?: string | Date // 不採用日
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
  createdBy: string // リクルーターID
  notes?: string
}

// マッチング理由
export interface MatchReason {
  type: 'skill' | 'experience' | 'location' | 'industry' | 'salary' | 'culture' | 'manual'
  description: string
  weight: number // 重要度 0-1
}

// マッチング進捗
export interface MatchTimeline {
  id: string
  status: Match['status']
  timestamp: string | Date
  description: string
  createdBy: string
  notes?: string
}

// インタビュー
export interface Interview {
  id: string
  matchId: string
  type: 'phone' | 'video' | 'in-person' | 'technical' | 'final'
  scheduledAt: string | Date
  duration: number // 分
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  
  // 参加者
  interviewers: Interviewer[]
  
  // 結果
  feedback?: InterviewFeedback
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
  notes?: string
}

// 面接官
export interface Interviewer {
  id: string
  name: string
  role: string
  email: string
}

// 面接フィードバック
export interface InterviewFeedback {
  rating: number // 1-5
  comments: string
  strengths: string[]
  concerns: string[]
  recommendation: 'hire' | 'no-hire' | 'maybe'
  submittedBy: string
  submittedAt: string | Date
}

// オファー
export interface Offer {
  id: string
  matchId: string
  
  // オファー詳細
  position: string
  salary: number
  benefits: string[]
  startDate: string | Date
  
  // ステータス
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'negotiating'
  
  // 期限
  expiryDate: string | Date
  
  // メタデータ
  createdAt: string | Date
  updatedAt: string | Date
  createdBy: string
  notes?: string
}