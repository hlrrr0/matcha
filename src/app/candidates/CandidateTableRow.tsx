'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { Edit, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { Candidate, candidateStatusLabels, campusLabels, sourceTypeLabels } from '@/types/candidate'
import { User as UserType } from '@/types/user'
import { CandidateWithProgress } from './CandidatePageTypes'
import { CAMPUS_COLORS, STATUS_COLORS, STATUS_LABELS } from './CandidatePageConstants'
import { calculateAge } from './CandidatePageUtils'

interface CandidateTableRowProps {
  candidate: CandidateWithProgress
  users: UserType[]
  progressLoading: boolean
  onStatusToggle: (candidateId: string, currentStatus: Candidate['status'], name: string) => void
}

function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text || text.trim() === '') {
    return <span className="text-gray-400 text-sm">-</span>
  }
  
  const needsExpansion = text.length > 150 || text.split('\n').length > 3
  
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation()
        if (needsExpansion) setIsExpanded(!isExpanded)
      }}
      className={`text-sm ${needsExpansion ? 'cursor-pointer' : ''}`}
    >
      <p className={`text-gray-800 break-words whitespace-pre-wrap ${!isExpanded && needsExpansion ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {needsExpansion && (
        <div className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium">
          {isExpanded ? '閉じる' : '続きを読む'}
        </div>
      )}
    </div>
  )
}

const CandidateTableRow = ({
  candidate,
  users,
  progressLoading,
  onStatusToggle,
}: CandidateTableRowProps) => {
  // ステータスに応じた背景色
  let rowClassName = 'cursor-pointer transition-colors hover:bg-blue-50'
  if (candidate.status === 'inactive') {
    rowClassName = 'cursor-pointer transition-colors bg-gray-300 hover:bg-gray-400'
  } else if (candidate.status === 'hired') {
    rowClassName = 'cursor-pointer transition-colors bg-gray-100 hover:bg-gray-200'
  }

  const getStatusBadge = (status: Candidate['status']) => {
    const config = {
      active: { variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200' },
      inactive: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800 border-gray-200' },
      hired: { variant: 'default' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    }

    const { variant, className } = config[status]

    return (
      <Badge variant={variant} className={className}>
        {candidateStatusLabels[status]}
      </Badge>
    )
  }

  return (
    <TableRow 
      className={rowClassName}
      onClick={() => window.open(`/candidates/${candidate.id}`, '_blank')}
      style={{ cursor: 'pointer' }}
    >
      <TableCell>
        <div>
          <div className="font-medium">
            {candidate.lastName} {candidate.firstName}
            <span className="ml-2 text-blue-600 font-medium">
              {candidate.dateOfBirth ? (
                <>
                  （{calculateAge(candidate.dateOfBirth)}歳）
                </>
              ) : (
                '（未登録）'
              )}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {candidate.lastNameKana} {candidate.firstNameKana}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-sm">{candidate.enrollmentDate || '未登録'}</div>
          {candidate.campus ? (
            <Badge className={`${CAMPUS_COLORS[candidate.campus]} border text-xs font-medium`}>
              {campusLabels[candidate.campus]}
            </Badge>
          ) : (
            <div className="text-sm text-gray-500">校舎未登録</div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline" 
          className={`text-xs font-medium ${
            candidate.sourceType === 'inshokujin_univ' ? 'bg-blue-100 text-blue-800 border-blue-200' :
            candidate.sourceType === 'mid_career' ? 'bg-green-100 text-green-800 border-green-200' :
            candidate.sourceType === 'referral' ? 'bg-purple-100 text-purple-800 border-purple-200' :
            candidate.sourceType === 'overseas' ? 'bg-orange-100 text-orange-800 border-orange-200' :
            ''
          }`}
        >
          {sourceTypeLabels[candidate.sourceType]}
        </Badge>
        {candidate.sourceDetail && (
          <div className="text-xs text-gray-500 mt-1">
            {candidate.sourceDetail}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {candidate.assignedUserId ? (
            users.find(u => u.id === candidate.assignedUserId)?.displayName || '不明'
          ) : (
            <span className="text-gray-400">未設定</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {getStatusBadge(candidate.status)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          {progressLoading ? (
            <span className="text-sm text-gray-500">...</span>
          ) : candidate.latestMatches && candidate.latestMatches.length > 0 ? (
            candidate.latestMatches.map((match) => (
              <div key={match.id} className="flex items-center gap-2">
                {/* 店舗名 */}
                <div className="text-xs text-gray-600 min-w-[80px]">
                  {match.storeNames && match.storeNames.length > 0 ? (
                    match.storeNames.length === 1 ? (
                      match.storeNames[0]
                    ) : (
                      `${match.storeNames[0]} 他${match.storeNames.length - 1}店舗`
                    )
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                {/* ステータスバッジ */}
                <Badge 
                  className={`${STATUS_COLORS[match.status]} text-xs border-0`}
                >
                  {STATUS_LABELS[match.status]}
                </Badge>
                {/* 面接日時 */}
                {match.interviewDate && (() => {
                  const interviewDate = match.interviewDate instanceof Date 
                    ? match.interviewDate 
                    : new Date(match.interviewDate)
                  
                  if (!isNaN(interviewDate.getTime())) {
                    return (
                      <div className="text-xs text-gray-600 whitespace-nowrap">
                        {interviewDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        <span className="ml-1">
                          {interviewDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <ExpandableText text={candidate.interviewMemo || ''} />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href={`/candidates/${candidate.id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStatusToggle(candidate.id, candidate.status, `${candidate.lastName} ${candidate.firstName}`)
            }}
            className={candidate.status === 'active' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
            title={candidate.status === 'active' ? '非アクティブにする' : 'アクティブにする'}
          >
            {candidate.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default CandidateTableRow
