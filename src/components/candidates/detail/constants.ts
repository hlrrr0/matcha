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

export const statusColors: Record<Match['status'], string> = {
  pending_proposal: 'bg-slate-100 text-slate-800',
  suggested: 'bg-blue-100 text-blue-800',
  applied: 'bg-purple-100 text-purple-800',
  document_screening: 'bg-yellow-100 text-yellow-800',
  document_passed: 'bg-cyan-100 text-cyan-800',
  interview: 'bg-orange-100 text-orange-800',
  interview_passed: 'bg-teal-100 text-teal-800',
  offer: 'bg-green-100 text-green-800',
  offer_accepted: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
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

export const campusColors = {
  tokyo: 'bg-blue-100 text-blue-800 border-blue-200',
  osaka: 'bg-orange-100 text-orange-800 border-orange-200',
  awaji: 'bg-green-100 text-green-800 border-green-200',
  fukuoka: 'bg-purple-100 text-purple-800 border-purple-200',
  taiwan: 'bg-red-100 text-red-800 border-red-200'
}

export const getStatusLabel = (status: Match['status'], interviewRound?: number): string => {
  if (status === 'interview' && interviewRound) {
    return `${interviewRound}次面接`
  }
  if (status === 'interview_passed' && interviewRound) {
    return `${interviewRound}次面接合格（${interviewRound + 1}次面接設定中）`
  }
  return statusLabels[status]
}
