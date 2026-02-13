import { Match } from '@/types/matching'
import type { LucideIcon } from 'lucide-react'
import {
  Target,
  Send,
  Eye,
  CheckCircle,
  MessageSquare,
  Star,
  XCircle,
  AlertCircle
} from 'lucide-react'

export const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200',
  taiwan: 'bg-red-100 text-red-800 border-red-200'
}

export const statusLabels: Record<Match['status'], string> = {
  pending_proposal: '提案待ち',
  suggested: '提案済み',
  applied: '応募済み',
  document_screening: '書類選考中',
  document_passed: '書類選考通過',
  interview: '面接',
  interview_passed: '面接通過',
  offer: '内定',
  offer_accepted: '内定承諾',
  rejected: '不合格',
  withdrawn: '辞退'
}

export const statusIcons: Record<Match['status'], LucideIcon> = {
  pending_proposal: Target,
  suggested: Target,
  applied: Send,
  document_screening: Eye,
  document_passed: CheckCircle,
  interview: MessageSquare,
  interview_passed: CheckCircle,
  offer: Star,
  offer_accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: AlertCircle
}

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

export const statusColors: Record<Match['status'], string> = {
  pending_proposal: 'bg-slate-100 text-slate-800',
  suggested: 'bg-gray-100 text-gray-800',
  applied: 'bg-blue-100 text-blue-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-green-100 text-green-800',
  interview: 'bg-purple-100 text-purple-800',
  interview_passed: 'bg-emerald-100 text-emerald-800',
  offer: 'bg-orange-100 text-orange-800',
  offer_accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-red-100 text-red-800'
}
