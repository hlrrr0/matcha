'use client'

import React from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Pagination } from '@/components/ui/pagination'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { User } from '@/types/user'
import { Eye, Edit, Trash2, Store as StoreIcon, ChevronUp, ChevronDown, RefreshCw, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { statusLabels } from './constants'
import { CompanyCompletionInfo } from './types'

interface CompaniesTableProps {
  companies: Company[]
  filteredCompanies: Company[]
  currentPage: number
  totalPages: number
  selectedCompanies: Set<string>
  expandedCompanies: Set<string>
  companyStores: Record<string, Store[]>
  loadingStores: Set<string>
  isAdmin: boolean
  onPageChange: (page: number) => void
  onSelectCompany: (id: string) => void
  onSelectAll: () => void
  onToggleExpand: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (company: Company) => void
  onSort?: (sortBy: string) => void
  calculateCompletionRate: (company: Company) => number
  getStoreCount: (companyId: string) => number
  getAssignedUser: (company: Company) => User | undefined
  getAssignedToDisplayName: (company: Company) => string
  companyJobFlags?: Record<string, { highDemand?: boolean; provenTrack?: boolean; weakRelationship?: boolean }>
}

interface SortableHeaderProps {
  field: string
  children: React.ReactNode
  onSort?: (field: string) => void
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ field, children, onSort }) => (
  <TableHead
    className="cursor-pointer hover:bg-gray-100"
    onClick={() => onSort?.(field)}
  >
    {children}
  </TableHead>
)

export const CompaniesTable: React.FC<CompaniesTableProps> = ({
  companies,
  filteredCompanies,
  currentPage,
  totalPages,
  selectedCompanies,
  expandedCompanies,
  companyStores,
  loadingStores,
  isAdmin,
  onPageChange,
  onSelectCompany,
  onSelectAll,
  onToggleExpand,
  onEdit,
  onDelete,
  onSort,
  calculateCompletionRate,
  getStoreCount,
  getAssignedUser,
  getAssignedToDisplayName,
  companyJobFlags,
}) => {
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * 50,
    currentPage * 50
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">企業リスト ({filteredCompanies.length}件)</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          登録企業の一覧と管理
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {companies.length === 0 ? '企業が登録されていません' : '検索条件に一致する企業がありません'}
          </div>
        ) : (
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={companies.length > 0 && selectedCompanies.size === companies.length}
                        onCheckedChange={onSelectAll}
                        aria-label="全て選択"
                      />
                    </TableHead>
                  )}
                  <SortableHeader field="name" onSort={onSort}>企業名</SortableHeader>
                  <SortableHeader field="status" onSort={onSort}>ステータス</SortableHeader>
                  <TableHead>契約状況</TableHead>
                  <TableHead>入力率</TableHead>
                  <TableHead>Domino連携</TableHead>
                  <TableHead>Indeed</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>店舗数</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCompanies.map((company) => {
                  const isInactive = company.status === 'inactive'
                  const isExpanded = expandedCompanies.has(company.id)
                  const storeCount = getStoreCount(company.id)
                  const stores = companyStores[company.id] || []
                  const isLoadingStores = loadingStores.has(company.id)

                  return (
                    <React.Fragment key={company.id}>
                      <TableRow
                        className={`${isInactive ? 'bg-gray-300 hover:bg-gray-400' : ''} ${company.contractType === 'free_only' ? 'bg-gray-100' : ''}`}
                      >
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={selectedCompanies.has(company.id)}
                              onCheckedChange={() => onSelectCompany(company.id)}
                              aria-label={`${company.name}を選択`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <Link href={`/companies/${company.id}`} className="hover:text-blue-600 hover:underline">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{company.name}</span>
                              {/* フラグアイコン表示 */}
                              {companyJobFlags?.[company.id] && (companyJobFlags[company.id].highDemand || companyJobFlags[company.id].provenTrack || companyJobFlags[company.id].weakRelationship) && (
                                <span className="flex gap-1">
                                  {companyJobFlags[company.id].highDemand && <span title="ニーズ高の求人あり">🔥</span>}
                                  {companyJobFlags[company.id].provenTrack && <span title="実績ありの求人あり">🎉</span>}
                                  {companyJobFlags[company.id].weakRelationship && <span title="関係薄めの求人あり">💧</span>}
                                </span>
                              )}
                            </div>
                            {/* タグ表示 */}
                            {(company.tags?.overseasExpansion || company.tags?.hasFisheryCompany) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {company.tags.overseasExpansion?.map((country: string) => (
                                  <Badge key={country} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    🌏 {country}
                                  </Badge>
                                ))}
                                {company.tags.hasFisheryCompany && (
                                  <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                                    🐟 水産会社
                                  </Badge>
                                )}
                              </div>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {statusLabels[company.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.contractType ? (
                            <Badge className={
                              company.contractType === 'paid_contracted' ? 'bg-green-100 text-green-800' :
                              company.contractType === 'paid_available' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-700'
                            }>
                              {company.contractType === 'paid_contracted' ? '有料【契約済】' :
                               company.contractType === 'paid_available' ? '有料紹介可' : '無料のみ'}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">未設定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const rate = calculateCompletionRate(company)
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                                  <div
                                    className={`h-2 ${
                                      rate >= 80 ? 'bg-green-500' :
                                      rate >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className={`text-sm font-medium ${
                                  rate >= 80 ? 'text-green-600' :
                                  rate >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {rate}%
                                </span>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {company.dominoId ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-700 font-medium">連携済み</span>
                                <a
                                  href={`https://sushi-domino.vercel.app/companies/${company.dominoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline font-mono"
                                >
                                  {company.dominoId.length > 10
                                    ? `${company.dominoId.substring(0, 10)}...`
                                    : company.dominoId
                                  }
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">未連携</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Indeed掲載ステータス */}
                        <TableCell>
                          {company.indeedStatus ? (
                            company.indeedStatus.detected ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs text-orange-700 font-medium">掲載あり</span>
                                {company.indeedStatus.detectedBy && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {company.indeedStatus.detectedBy === 'agent' ? 'Agent' : '外部'}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-700 font-medium">掲載なし</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-xs text-gray-400">未チェック</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const assignedUser = getAssignedUser(company)
                            return assignedUser ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={assignedUser.photoURL} />
                                  <AvatarFallback className="text-xs">
                                    {assignedUser.displayName?.charAt(0) || assignedUser.email?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{assignedUser.displayName || assignedUser.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-400">
                                  {getAssignedToDisplayName(company)}
                                </span>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => onToggleExpand(company.id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <StoreIcon className="h-4 w-4" />
                            <span>{storeCount}件</span>
                            {storeCount > 0 && (
                              isExpanded ?
                                <ChevronUp className="h-4 w-4" /> :
                                <ChevronDown className="h-4 w-4" />
                            )}
                            {isLoadingStores && (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/companies/${company.id}`}>
                              <Button variant="outline" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </Link>
                            {isAdmin && (
                              <Link href={`/companies/${company.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </Link>
                            )}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(company)}
                                className="text-red-600 hover:text-red-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* 店舗一覧のアコーディオン */}
                      {isExpanded && storeCount > 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-gray-50 p-0">
                            <div className="p-4">
                              <h4 className="font-medium mb-3 text-gray-700">店舗一覧 ({storeCount}件)</h4>
                              <div className="grid gap-2">
                                {stores.map((store) => (
                                  <div
                                    key={store.id}
                                    className="bg-white p-3 rounded border border-gray-200 flex flex-col sm:flex-row justify-between items-start gap-3"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium truncate">
                                        {store.name}
                                        {store.prefecture && (
                                          <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                                        )}
                                      </div>
                                      {/* タグ表示 */}
                                      {(store.tags?.michelinStars || store.tags?.hasBibGourmand || store.tags?.tabelogAward || store.tags?.hasTabelogAward || store.tags?.goetMiyoScore) && (
                                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                                          {store.tags.michelinStars && store.tags.michelinStars > 0 && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                              ⭐ ミシュラン獲得店
                                            </Badge>
                                          )}
                                          {store.tags.hasBibGourmand && (
                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                              🍽️ ミシュランビブグルマン
                                            </Badge>
                                          )}
                                          {store.tags.tabelogAward && store.tags.tabelogAward.length > 0 && (
                                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                              📖 食べログ100名店
                                            </Badge>
                                          )}
                                          {store.tags.hasTabelogAward && (
                                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                              🏆 食べログアワード
                                            </Badge>
                                          )}
                                          {store.tags.goetMiyoScore && store.tags.goetMiyoScore > 0 && (
                                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                              🍷 ゴ・エ・ミヨ掲載店
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-600 break-words">
                                        {store.address && <div className="text-xs sm:text-sm">📍 {store.address}</div>}
                                        {store.website && <div className="text-xs sm:text-sm">🌐 <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{store.website}</a></div>}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 items-center mt-2 sm:mt-0">
                                      <Link href={`/stores/${store.id}`}>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-7 sm:w-7">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </Link>
                                      {isAdmin && (
                                        <Link href={`/stores/${store.id}/edit`}>
                                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-7 sm:w-7">
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ページネーション */}
        {filteredCompanies.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-center sm:justify-end">
              <div className="overflow-x-auto">
                <div className="inline-block">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    itemsPerPage={50}
                    totalItems={filteredCompanies.length}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
