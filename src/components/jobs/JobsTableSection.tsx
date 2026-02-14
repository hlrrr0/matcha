'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Eye,
  Edit,
  Trash2,
  Copy,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react'
import { Job, jobStatusLabels } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { User } from '@/types/user'
import { sourceTypeLabels } from '@/types/candidate'
import { statusColors, jobFieldKeys, SortBy, SortOrder } from './constants'

interface JobsTableSectionProps {
  paginatedJobs: Job[]
  filteredJobsLength: number
  jobs: Job[]
  stores: StoreType[]
  companies: Company[]
  users: User[]
  isAdmin: boolean
  selectedJobs: Set<string>
  isAllSelected: boolean
  currentPage: number
  itemsPerPage: number
  totalPages: number
  sortBy: SortBy
  sortOrder: SortOrder
  onSelectAll: () => void
  onSelectJob: (jobId: string) => void
  onSort: (column: SortBy) => void
  onPageChange: (page: number) => void
  onDelete: (job: Job) => void
  onDuplicate: (job: Job) => void
}

export function JobsTableSection({
  paginatedJobs,
  filteredJobsLength,
  jobs,
  stores,
  companies,
  users,
  isAdmin,
  selectedJobs,
  isAllSelected,
  currentPage,
  itemsPerPage,
  totalPages,
  sortBy,
  sortOrder,
  onSelectAll,
  onSelectJob,
  onSort,
  onPageChange,
  onDelete,
  onDuplicate,
}: JobsTableSectionProps) {
  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    return company?.name || '不明な企業'
  }

  const getCompany = (companyId: string) => {
    return companies.find((c) => c.id === companyId)
  }

  const getStoreName = (storeId?: string) => {
    if (!storeId) return '-'
    const store = stores.find((s) => s.id === storeId)
    if (!store) return '不明な店舗'
    return store.prefecture ? `${store.name}【${store.prefecture}】` : store.name
  }

  const getAddress = (job: Job) => {
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])

    if (storeIds.length > 0) {
      const firstStore = stores.find((s) => s.id === storeIds[0])
      if (firstStore?.address) {
        return storeIds.length > 1
          ? `${firstStore.address} 他${storeIds.length - 1}店舗`
          : firstStore.address
      }
    }

    const company = companies.find((c) => c.id === job.companyId)
    return company?.address || '-'
  }

  const calculateCompletionRate = (job: Job): number => {
    let filledCount = 0
    jobFieldKeys.forEach((field) => {
      const value = (job as any)[field]
      if (value !== null && value !== undefined && value !== '') {
        filledCount++
      }
    })
    return Math.round((filledCount / jobFieldKeys.length) * 100)
  }

  const getStatusBadge = (status: Job['status']) => {
    const color = statusColors[status] || 'bg-gray-100 text-gray-800'
    return (
      <Badge className={color}>{jobStatusLabels[status]}</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>求人リスト ({filteredJobsLength}件)</CardTitle>
        <CardDescription>登録求人の一覧と管理</CardDescription>
      </CardHeader>
      <CardContent>
        {filteredJobsLength === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {jobs.length === 0
              ? '求人が登録されていません'
              : '検索条件に一致する求人がありません'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={onSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center gap-1">
                    ステータス
                    {sortBy === 'status' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('title')}
                >
                  <div className="flex items-center gap-1">
                    求人名
                    {sortBy === 'title' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('storeName')}
                >
                  <div className="flex items-center gap-1">
                    店舗名/企業名
                    {sortBy === 'storeName' && (
                      <span className="text-xs">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>住所</TableHead>
                <TableHead>入力率</TableHead>
                <TableHead>公開範囲</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>契約状況</TableHead>
                <TableHead>雇用形態</TableHead>
                <TableHead>年齢上限</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => {
                const company = getCompany(job.companyId)
                const isFreeOnly = company?.contractType === 'free_only'
                const isClosed = job.status === 'closed'

                return (
                  <TableRow
                    key={job.id}
                    className={
                      isClosed ? 'bg-gray-300' : isFreeOnly ? 'bg-gray-100' : ''
                    }
                  >
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={() => onSelectJob(job.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="hover:text-purple-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold hover:underline">
                            {job.title}
                          </span>
                          {job.flags &&
                            (job.flags.highDemand ||
                              job.flags.provenTrack ||
                              job.flags.weakRelationship) && (
                              <span className="flex gap-1">
                                {job.flags.highDemand && (
                                  <span title="ニーズ高">🔥</span>
                                )}
                                {job.flags.provenTrack && (
                                  <span title="実績あり">🎉</span>
                                )}
                                {job.flags.weakRelationship && (
                                  <span title="関係薄め">💧</span>
                                )}
                              </span>
                            )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const storeIds =
                          job.storeIds || (job.storeId ? [job.storeId] : [])
                        if (storeIds.length === 0) {
                          return (
                            <span className="text-gray-400">-</span>
                          )
                        } else if (storeIds.length === 1) {
                          return (
                            <Link
                              href={`/stores/${storeIds[0]}`}
                              className="hover:text-purple-600 hover:underline transition-colors"
                            >
                              {getStoreName(storeIds[0])}
                            </Link>
                          )
                        } else {
                          return (
                            <div>
                              <Link
                                href={`/stores/${storeIds[0]}`}
                                className="hover:text-purple-600 hover:underline transition-colors"
                              >
                                {getStoreName(storeIds[0])}
                              </Link>
                              <span className="text-sm text-gray-500 ml-1">
                                他{storeIds.length - 1}店舗
                              </span>
                            </div>
                          )
                        }
                      })()}
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        <Link
                          href={`/companies/${job.companyId}`}
                          className="hover:text-purple-600 hover:underline transition-colors"
                        >
                          {getCompanyName(job.companyId)}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600 max-w-[10rem] truncate">
                        {getAddress(job)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const rate = calculateCompletionRate(job)
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                              <div
                                className={`h-2 ${
                                  rate >= 80
                                    ? 'bg-green-500'
                                    : rate >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                rate >= 80
                                  ? 'text-green-600'
                                  : rate >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {rate}%
                            </span>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (job.visibilityType === 'all') {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-100 text-green-800 border-green-200"
                            >
                              全体公開
                            </Badge>
                          )
                        }
                        if (job.visibilityType === 'school_only') {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                            >
                              🎓 学校限定
                            </Badge>
                          )
                        }
                        if (job.visibilityType === 'specific_sources') {
                          const sources = job.allowedSources || []
                          if (sources.length === 0) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-400"
                              >
                                指定ソース（未設定）
                              </Badge>
                            )
                          }
                          const labels = sources
                            .map((s) => ({
                              label:
                                sourceTypeLabels[
                                  s as keyof typeof sourceTypeLabels
                                ],
                              type: s,
                            }))
                            .filter((item) => item.label)
                          return (
                            <div className="flex flex-col gap-1">
                              {labels.map((item, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className={`text-xs ${
                                    item.type === 'inshokujin_univ'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : item.type === 'mid_career'
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : item.type === 'referral'
                                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                                      : item.type === 'overseas'
                                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                                      : ''
                                  }`}
                                >
                                  {item.label}
                                </Badge>
                              ))}
                            </div>
                          )
                        }
                        return (
                          <Badge
                            variant="outline"
                            className="text-xs text-gray-400"
                          >
                            不明
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!company?.consultantId) {
                          return (
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-400">-</span>
                            </div>
                          )
                        }
                        const user = users.find(
                          (u) => u.id === company.consultantId
                        )
                        if (!user) {
                          return (
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-400">
                                不明
                              </span>
                            </div>
                          )
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.photoURL} />
                              <AvatarFallback className="text-xs">
                                {user.displayName?.charAt(0) ||
                                  user.email?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {user.displayName || user.email}
                            </span>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {company?.contractType ? (
                        <Badge
                          className={
                            company.contractType === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {company.contractType === 'paid'
                            ? '有料紹介可'
                            : '無料のみ'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {job.employmentType || '未設定'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.ageLimit ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-amber-700">
                            {job.ageLimit}歳
                          </span>
                          {job.ageNote && (
                            <span
                              className="text-xs text-gray-500"
                              title={job.ageNote}
                            >
                              ℹ️
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/jobs/${job.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDuplicate(job)}
                          className="text-blue-600 hover:text-blue-700"
                          title="複製"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(job)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* ページネーション */}
        {filteredJobsLength > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredJobsLength}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
