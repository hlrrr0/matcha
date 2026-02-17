"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Briefcase, Store } from 'lucide-react'

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
            <div className="space-y-3">
              {(() => {
                const totalPages = Math.ceil(relatedJobs.length / itemsPerPage)
                const startIndex = (jobsCurrentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const displayJobs = relatedJobs.slice(startIndex, endIndex)

                return (
                  <>
                    {displayJobs.map((job) => {
                      const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
                      const jobStores = storeIds
                        .map((storeId: string) => relatedStores.find(s => s.id === storeId))
                        .filter(Boolean)

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
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg md:flex-row">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{job.title}</h4>
                              <Badge className={statusColors[jobStatus as keyof typeof statusColors]}>
                                {statusLabels[jobStatus as keyof typeof statusLabels]}
                              </Badge>
                              {prefecture && (
                                <Badge variant="outline" className="text-xs">
                                  {prefecture}
                                </Badge>
                              )}
                              {job.employmentType && (
                                <Badge variant="outline" className="text-xs">
                                  {job.employmentType}
                                </Badge>
                              )}
                            </div>
                            {jobStores.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Store className="h-3 w-3 text-gray-500" />
                                <p className="text-sm text-gray-600">
                                  {jobStores[0].name}
                                  {jobStores.length > 1 && (
                                    <span className="text-gray-500 ml-1">
                                      他{jobStores.length - 1}店舗
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            {job.location && (
                              <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                            )}
                          </div>
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              詳細
                            </Button>
                          </Link>
                        </div>
                      )
                    })}
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={jobsCurrentPage}
                          totalPages={totalPages}
                          onPageChange={setJobsCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={relatedJobs.length}
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
