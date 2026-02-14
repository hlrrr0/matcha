import { Match } from '@/types/matching'
import {
  Target,
  Briefcase,
  Eye,
  Calendar,
  MessageSquare,
  CheckCircle,
  Star,
  XCircle,
  AlertCircle
} from 'lucide-react'

// ステータスラベル
export const statusLabels: Record<Match['status'], string> = {
  pending_proposal: '提案待ち',
  suggested: '提案済み',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過（面接設定中）',
  interview: '面接',
  interview_passed: '面接合格（次回面接設定中）',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

// ステータスカラー
export const statusColors: Record<Match['status'], string> = {
  pending_proposal: 'bg-slate-100 text-slate-800 border-slate-200',
  suggested: 'bg-blue-100 text-blue-800 border-blue-200',
  applied: 'bg-purple-100 text-purple-800 border-purple-200',
  document_screening: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  document_passed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  interview: 'bg-orange-100 text-orange-800 border-orange-200',
  interview_passed: 'bg-teal-100 text-teal-800 border-teal-200',
  offer: 'bg-green-100 text-green-800 border-green-200',
  offer_accepted: 'bg-green-600 text-white border-green-600',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-800 border-gray-200'
}

// ステータスアイコン
export const statusIcons: Record<Match['status'], any> = {
  pending_proposal: Target,
  suggested: Target,
  applied: Briefcase,
  document_screening: Eye,
  document_passed: Calendar,
  interview: MessageSquare,
  interview_passed: CheckCircle,
  offer: Star,
  offer_accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
}

// ステータス遷移フロー
export const statusFlow: Record<Match['status'], Match['status'][]> = {
  pending_proposal: ['suggested', 'rejected', 'withdrawn'],
  suggested: ['applied', 'offer', 'rejected', 'withdrawn'],
  applied: ['document_screening', 'offer', 'rejected', 'withdrawn'],
  document_screening: ['document_passed', 'offer', 'rejected', 'withdrawn'],
  document_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['interview_passed', 'offer', 'rejected', 'withdrawn'],
  interview_passed: ['interview', 'offer', 'rejected', 'withdrawn'],
  offer: ['offer_accepted', 'rejected', 'withdrawn'],
  offer_accepted: [],
  rejected: [],
  withdrawn: []
}

// ステータス表示順序
export const statusOrder: Record<Match['status'], number> = {
  pending_proposal: 0,
  suggested: 1,
  applied: 2,
  document_screening: 3,
  document_passed: 4,
  interview: 5,
  interview_passed: 6,
  offer: 7,
  offer_accepted: 8,
  rejected: 9,
  withdrawn: 10
}

// スコアバッジのテンプレート
export const scoreRanges = [
  { min: 90, max: 100, label: 'S', color: 'bg-red-500 text-white' },
  { min: 80, max: 89, label: 'A', color: 'bg-orange-500 text-white' },
  { min: 70, max: 79, label: 'B', color: 'bg-yellow-500 text-white' },
  { min: 60, max: 69, label: 'C', color: 'bg-green-500 text-white' },
  { min: 50, max: 59, label: 'D', color: 'bg-blue-500 text-white' },
  { min: 0, max: 49, label: 'E', color: 'bg-gray-500 text-white' }
]
