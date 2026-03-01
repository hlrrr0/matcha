"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Copy, Search, Store } from 'lucide-react'

interface CompanyStoresTabProps {
  relatedStores: any[]
  relatedJobs: any[]
  companyId: string
  itemsPerPage: number
  storePrefectureFilter: string
  setStorePrefectureFilter: (value: string) => void
  storeSearchTerm: string
  setStoreSearchTerm: (value: string) => void
  storesCurrentPage: number
  setStoresCurrentPage: (value: number) => void
}

export default function CompanyStoresTab({
  relatedStores,
  relatedJobs,
  companyId,
  itemsPerPage,
  storePrefectureFilter,
  setStorePrefectureFilter,
  storeSearchTerm,
  setStoreSearchTerm,
  storesCurrentPage,
  setStoresCurrentPage
}: CompanyStoresTabProps) {
  return (
    <>
      {relatedStores.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              関連店舗 ({relatedStores.length}件)
            </CardTitle>
            <Link href={`/stores/new?company=${companyId}`}>
              <Button variant="outline" size="sm">
                <Store className="h-4 w-4 mr-2" />
                新しい店舗を追加
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Select value={storePrefectureFilter} onValueChange={(value) => {
                setStorePrefectureFilter(value)
                setStoresCurrentPage(1)
              }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="都道府県で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての都道府県</SelectItem>
                  {(() => {
                    const prefectureOrder = [
                      '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
                      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
                      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
                      '岐阜県', '静岡県', '愛知県', '三重県',
                      '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
                      '鳥取県', '島根県', '岡山県', '広島県', '山口県',
                      '徳島県', '香川県', '愛媛県', '高知県',
                      '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
                    ]

                    const uniquePrefectures = Array.from(new Set(
                      relatedStores
                        .map(store => store.prefecture)
                        .filter(Boolean)
                    ))

                    const sortedPrefectures = uniquePrefectures.sort((a, b) => {
                      const indexA = prefectureOrder.indexOf(a)
                      const indexB = prefectureOrder.indexOf(b)
                      if (indexA === -1) return 1
                      if (indexB === -1) return -1
                      return indexA - indexB
                    })

                    return sortedPrefectures.map(pref => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="店舗名、住所で検索..."
                  value={storeSearchTerm}
                  onChange={(e) => setStoreSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                let filteredStores = [...relatedStores]

                if (storePrefectureFilter !== 'all') {
                  filteredStores = filteredStores.filter(store =>
                    store.prefecture === storePrefectureFilter
                  )
                }

                if (storeSearchTerm.trim() !== '') {
                  const searchLower = storeSearchTerm.toLowerCase()
                  filteredStores = filteredStores.filter(store =>
                    store.name?.toLowerCase().includes(searchLower) ||
                    store.address?.toLowerCase().includes(searchLower)
                  )
                }

                filteredStores.sort((a, b) => {
                  const addressA = a.address || ''
                  const addressB = b.address || ''
                  return addressA.localeCompare(addressB, 'ja')
                })

                if (filteredStores.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      {storeSearchTerm ? '検索条件に一致する店舗がありません' : '店舗がありません'}
                    </div>
                  )
                }

                const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
                const startIndex = (storesCurrentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const displayStores = filteredStores.slice(startIndex, endIndex)

                return (
                  <>
                    {displayStores.map((store) => {
                      // この店舗に紐づく求人数をカウント
                      const relatedJobsCount = relatedJobs.filter(job => {
                        const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
                        return storeIds.includes(store.id)
                      }).length

                      return (
                        <div key={store.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {store.name}
                              {store.prefecture && (
                                <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{store.address}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              {store.unitPriceLunch && (
                                <span>昼: ¥{store.unitPriceLunch.toLocaleString()}</span>
                              )}
                              {store.unitPriceDinner && (
                                <span>夜: ¥{store.unitPriceDinner.toLocaleString()}</span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                求人: {relatedJobsCount}件
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/stores/${store.id}`}>
                              <Button variant="outline" size="sm">
                                詳細
                              </Button>
                            </Link>
                            <Link href={`/stores/new?duplicate=${store.id}`}>
                              <Button variant="outline" size="sm">
                                <Copy className="h-4 w-4 mr-1" />
                                複製
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={storesCurrentPage}
                          totalPages={totalPages}
                          onPageChange={setStoresCurrentPage}
                          itemsPerPage={itemsPerPage}
                          totalItems={filteredStores.length}
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
              <Store className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="mb-4">関連店舗がありません</p>
              <Link href={`/stores/new?company=${companyId}`}>
                <Button>
                  <Store className="h-4 w-4 mr-2" />
                  新しい店舗を追加
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
