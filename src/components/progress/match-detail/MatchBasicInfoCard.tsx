'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Eye, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { Match } from '@/types/matching'
import { Candidate } from '@/types/candidate'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'

interface MatchBasicInfoCardProps {
  match: Match
  candidate: Candidate | null
  job: Job | null
  company: Company | null
  jobStores: Store[]
  users: User[]
  onScoreBadge: (score: number) => React.ReactNode
  onStatusBadge: (status: Match['status'], size?: 'sm' | 'lg') => React.ReactNode
  onCalculateAge: (dateOfBirth: string | Date | undefined) => number | null
  onFormatDate: (date: any) => string
}

export default function MatchBasicInfoCard({
  match,
  candidate,
  job,
  company,
  jobStores,
  users,
  onScoreBadge,
  onStatusBadge,
  onCalculateAge,
  onFormatDate
}: MatchBasicInfoCardProps) {
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? user.displayName : userId
  }

  return (
    <>
      {/* 基本情報カード */}
      <Card className="border-purple-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-purple-800">基本情報</CardTitle>
            <div className="flex items-center gap-3">
              {onScoreBadge(match.score)}
              {onStatusBadge(match.status, 'lg')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 候補者情報と求人情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 候補者情報 */}
            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <UserIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <h3 className="font-semibold text-blue-800 ">候補者</h3>
              </div>
              <div className="flex-1">
                {candidate ? (
                  <div className="space-y-2">
                    <div className="font-medium text-lg">
                      {candidate.lastName} {candidate.firstName}
                      <div className="text-sm text-gray-600">
                        {candidate.dateOfBirth && (
                          <>
                            （{onCalculateAge(candidate.dateOfBirth)}歳）
                          </>
                        )}
                      </div>
                      {candidate.enrollmentDate && (
                        <div className="text-sm text-gray-600">
                          入学日: {new Date(candidate.enrollmentDate).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                      {candidate.campus && (
                        <div className="text-sm text-gray-600">
                          校舎: {candidate.campus === 'tokyo' && '東京'}
                          {candidate.campus === 'osaka' && '大阪'}
                          {candidate.campus === 'awaji' && '淡路'}
                          {candidate.campus === 'fukuoka' && '福岡'}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link href={`/candidates/${candidate.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        詳細
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500">候補者情報を読み込み中...</div>
                )}
              </div>
            </div>

            {/* 求人情報 */}
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-100">
              <div>
                <Briefcase className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <h3 className="font-semibold text-green-800 mb-2">求人</h3>
              </div>

              <div className="flex-1">
                {job ? (
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-lg">
                        {job.title}
                      </div>
                      {company && (
                        <div className="text-sm text-gray-600">
                          {company.name}
                        </div>
                      )}
                      {jobStores.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {jobStores.map((s, idx) => (
                            <span key={s.id}>
                              {s.name}
                              {s.prefecture && ` 【${s.prefecture}】`}
                              {idx < jobStores.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">
                        {job.employmentType}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link href={`/jobs/${job.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        詳細
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500">求人情報を読み込み中...</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 詳細情報 */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-lg text-purple-800">詳細情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">作成日:</span>
            <span className="font-medium">{onFormatDate(match.createdAt)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">更新日:</span>
            <span className="font-medium">{onFormatDate(match.updatedAt)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <UserIcon className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">作成者:</span>
            <span className="font-medium">{getUserName(match.createdBy)}</span>
          </div>
          {match.startDate && (() => {
            const startDateObj = new Date(match.startDate)
            return !isNaN(startDateObj.getTime()) && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">入社予定日:</span>
                <span className="font-medium text-green-700">
                  {startDateObj.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )
          })()}
          {match.endDate && (() => {
            const endDateObj = new Date(match.endDate)
            return !isNaN(endDateObj.getTime()) && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-red-600" />
                <span className="text-gray-600">退職日:</span>
                <span className="font-medium text-red-700">
                  {endDateObj.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )
          })()}
          {match.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">備考</div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">{match.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* マッチング理由 */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-lg text-purple-800">マッチング理由</CardTitle>
        </CardHeader>
        <CardContent>
          {match.matchReasons.length > 0 ? (
            <div className="space-y-3">
              {match.matchReasons.map((reason, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{reason.description}</div>
                    <div className="text-sm text-gray-600 capitalize">{reason.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-600">
                      重要度: {Math.round(reason.weight * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              マッチング理由が設定されていません
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
