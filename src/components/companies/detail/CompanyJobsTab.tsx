"use client"

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Briefcase, Store, Search, X } from 'lucide-react'
import { visibilityTypeLabels } from '@/types/job'

interface CompanyJobsTabProps {
  relatedJobs: any[]
  relatedStores: any[]
  companyId: string
  itemsPerPage: number
  jobsCurrentPage: number
  setJobsCurrentPage: (value: number) => void
}

export default function CompanyJobsTab({
  relatedJobs,
  relatedStores,
  companyId,
  itemsPerPage,
  jobsCurrentPage,
  setJobsCurrentPage
}: CompanyJobsTabProps) {
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'school_only' | 'personal'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 公開範囲ごとにジョブをフィルタリング
  const visibilityTypes = ['all', 'school_only', 'personal'] as const
  const filteredJobsByVisibility = visibilityTypes.map(visibility => ({
    visibility,
    jobs: relatedJobs.filter(job => (job.visibilityType || 'all') === visibility)
  }))

  const currentVisibilityJobs = filteredJobsByVisibility.find(
    item => item.visibility === selectedVisibility
  )?.jobs || []

  // ステータスでソート（募集中が上、下書き・募集終了は下部）
  const sortedJobs = [...currentVisibilityJobs].sort((a, b) => {
    const statusOrder = { 'active': 0, 'draft': 1, 'closed': 2 }
    const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 3
    const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 3
    return statusA - statusB
  })

  // 検索キーワードでフィルタリング
  const filteredJobs = searchKeyword.trim() === '' 
    ? sortedJobs 
    : sortedJobs.filter(job => 
        job.title.toLowerCase().includes(searchKeyword.toLowerCase())
      )

  const getVisibilityBadgeStyles = (visibility: string) => {
    switch (visibility) {
      case 'all':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'school_only':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'personal':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getJobCardBgClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100' // ライトグレー（やや濃く）
      case 'closed':
        return 'bg-gray-300' // グレー（やや濃く）
      case 'active':
      default:
        return 'bg-white'
    }
  }
  return (
    <>
      {relatedJobs.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              関連求人 ({relatedJobs.length}件)
            </CardTitle>
            <Link href={`/jobs/new?company=${companyId}`}>
              <Button variant="outline" size="sm">
                <Briefcase className="h-4 w-4 mr-2" />
                新しい求人を作成
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {/* 公開範囲タブ */}
            <div className="mb-4 flex gap-2 border-b border-gray-200">
              {visibilityTypes.map(visibility => {
                const count = filteredJobsByVisibility.find(
                  item => item.visibility === visibility
                )?.jobs.length || 0
                return (
                  <button
                    key={visibility}
                    onClick={() => {
                      setSelectedVisibility(visibility)
                      setJobsCurrentPage(1)
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      selectedVisibility === visibility
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {visibilityTypeLabels[visibility as keyof typeof visibilityTypeLabels]}
                    <span className="ml-1 text-xs text-gray-500">({count}件)</span>
                  </button>
                )
              })}
            </div>

            {/* 検索窓 */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="求人名で検索..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value)
                    setJobsCurrentPage(1)
                  }}
                  className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchKeyword && (
                  <button
                    onClick={() => {
                      setSearchKeyword('')
                      setJobsCurrentPage(1)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              {(() => {
                if (filteredJobs.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-500">
                      <p>条件に合う求人がありません</p>
                    </div>
                  )
                }

                const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
                const startIndex = (jobsCurrentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const displayJobs = filteredJobs.slice(startIndex, endIndex)

                return (
                  <>
                    {/* 2カラムグリッド */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {displayJobs.map((job) => {
                        const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
                        const jobStores = storeIds
                          .map((storeId: string) => relatedStores.find(s => s.id === storeId))
                          .filter(Boolean)

                        // メイン店舗を取得
                        const mainStoreId = job.mainStoreIds?.[0] || storeIds[0]
                        const mainStore = relatedStores.find(s => s.id === mainStoreId)
                        const nightUnitPrice =
                          mainStore?.unitPriceDinner ?? mainStore?.avgPrice?.night
                        
                        const prefecture = jobStores.length > 0 && jobStores[0]?.prefecture
                          ? jobStores[0].prefecture
                          : null

                        const jobStatus = job.status || 'draft'
                        const statusColors = {
                          draft: 'bg-gray-100 text-gray-800',
                          active: 'bg-green-100 text-green-800',
                          closed: 'bg-red-100 text-red-800'
                        }
                        const statusLabels = {
                          draft: '下書き',
                          active: '募集中',
                          closed: '募集終了'
                        }

                        return (
                          <div 
                            key={job.id} 
                            className={`flex flex-row justify-between p-2 border rounded-lg text-sm ${getJobCardBgClass(jobStatus)}`}
                          >
                            <div>
                              {/* 求人名 + 公開範囲 + 地域 + 雇用形態 + ステータス（1行） */}
                              <div className="flex items-center gap-1 mb-1 flex-wrap">
                                <h4 className="font-medium text-xs flex-1">{job.title}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs border ${getVisibilityBadgeStyles(job.visibilityType || 'all')} py-0 px-1 whitespace-nowrap`}
                                >
                                  {visibilityTypeLabels[(job.visibilityType || 'all') as keyof typeof visibilityTypeLabels].split('\u3000')[0]}
                                </Badge>
                                {prefecture && (
                                  <Badge variant="outline" className="text-xs py-0 px-1 whitespace-nowrap">
                                    {prefecture}
                                  </Badge>
                                )}
                                {job.employmentType && (
                                  <Badge variant="outline" className="text-xs py-0 px-1 whitespace-nowrap">
                                    {job.employmentType}
                                  </Badge>
                                )}
                                <Badge className={`${statusColors[jobStatus as keyof typeof statusColors]} text-xs py-0 px-1 whitespace-nowrap`}>
                                  {statusLabels[jobStatus as keyof typeof statusLabels]}
                                </Badge>
                              </div>

                              {/* 店舗名 + 客単価（1行） */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {jobStores.length > 0 && (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Store className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                    <p className="text-xs text-gray-600 truncate">
                                      {jobStores[0].name}
                                      {jobStores.length > 1 && ` + ${jobStores.length - 1}`}
                                    </p>
                                  </div>
                                )}

                                {typeof nightUnitPrice === 'number' && (
                                  <div className="text-xs text-gray-600 whitespace-nowrap font-medium">
                                    ¥{nightUnitPrice.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Link href={`/jobs/${job.id}`} className="mt-1">
                              <Button variant="outline" size="sm" className="w-full text-xs py-1 h-auto">
                                詳細
                              </Button>
                            </Link>
                          </div>
                        )
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={jobsCurrentPage}
                          totalPages={totalPages}
                          onPageChange={setJobsCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={filteredJobs.length}
                        />
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="mb-4">関連求人がありません</p>
              <Link href={`/jobs/new?company=${companyId}`}>
                <Button>
                  <Briefcase className="h-4 w-4 mr-2" />
                  新しい求人を作成
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
