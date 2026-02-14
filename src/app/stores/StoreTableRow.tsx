'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ExternalLink, Edit, Trash2, Eye, User as UserIcon } from 'lucide-react'
import { Store, statusLabels } from '@/types/store'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { STATUS_COLORS } from './StorePageConstants'
import { calculateCompletionRate, getCompanyName, getCompany, getJobCountForStore } from './StorePageUtils'

interface StoreTableRowProps {
  store: Store
  companies: Company[]
  users: User[]
  jobCount: number
  storeJobFlags: { highDemand: boolean; provenTrack: boolean; weakRelationship: boolean }
  isAdmin: boolean
  isSelected: boolean
  currentPage: number
  searchTerm: string
  statusFilter: string
  companyFilter: string
  onSelect: (checked: boolean) => void
  onDelete: () => void
}

const StoreTableRow = ({
  store,
  companies,
  users,
  jobCount,
  storeJobFlags,
  isAdmin,
  isSelected,
  currentPage,
  searchTerm,
  statusFilter,
  companyFilter,
  onSelect,
  onDelete,
}: StoreTableRowProps) => {
  const completionRate = calculateCompletionRate(store)
  const companyName = getCompanyName(store.companyId, companies)
  const company = getCompany(store.companyId, companies)
  
  const getStatusBadge = (status: Store['status']) => {
    const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
    return (
      <Badge className={color}>
        {statusLabels[status]}
      </Badge>
    )
  }

  return (
    <TableRow className={store.status === 'inactive' ? 'bg-gray-100' : ''}>
      {isAdmin && (
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        </TableCell>
      )}
      <TableCell className="font-medium">
        <div className="font-semibold">
          <Link 
            href={`/stores/${store.id}?returnPage=${currentPage}&search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&company=${companyFilter}`}
            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{store.name}</span>
            {/* フラグアイコン表示 */}
            {(storeJobFlags.highDemand || storeJobFlags.provenTrack || storeJobFlags.weakRelationship) && (
              <span className="flex gap-1">
                {storeJobFlags.highDemand && <span title="ニーズ高の求人あり">🔥</span>}
                {storeJobFlags.provenTrack && <span title="実績ありの求人あり">🎉</span>}
                {storeJobFlags.weakRelationship && <span title="関係薄めの求人あり">💧</span>}
              </span>
            )}
          </Link>
          {store.prefecture && (
            <span className="ml-2 text-gray-500 font-normal">【{store.prefecture}】</span>
          )}
        </div>
        {/* タグ表示 */}
        {(store.tags?.michelinStars || store.tags?.hasBibGourmand || store.tags?.tabelogAward || store.tags?.hasTabelogAward || store.tags?.goetMiyoScore) && (
          <div className="flex flex-wrap gap-1 mt-1">
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
      </TableCell>
      <TableCell>
        {companyName ? (
          <Link 
            href={`/companies/${store.companyId}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {companyName}
          </Link>
        ) : (
          <span className="text-gray-500">企業情報なし</span>
        )}
      </TableCell>
      <TableCell className="max-w-[10rem] truncate">{store.address}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
            <div 
              className={`h-2 ${
                completionRate >= 80 ? 'bg-green-500' :
                completionRate >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${completionRate}%` }} 
            />
          </div>
          <span className={`text-sm font-medium ${
            completionRate >= 80 ? 'text-green-600' :
            completionRate >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {completionRate}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {jobCount > 0 ? (
            <Link 
              href={`/stores/${store.id}#related-jobs`}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              {jobCount}件
            </Link>
          ) : (
            <span className="text-gray-400">0件</span>
          )}
        </div>
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
          const user = users.find(u => u.id === company.consultantId)
          if (!user) {
            return (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">不明</span>
              </div>
            )
          }
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="text-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.displayName || user.email}</span>
            </div>
          )
        })()}
      </TableCell>
      <TableCell>{getStatusBadge(store.status)}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          {store.website && (
            <Link href={store.website} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
          {store.tabelogUrl && (
            <Link href={store.tabelogUrl} target="_blank">
              <Button variant="outline" size="sm" className="text-orange-600">
                🍽️
              </Button>
            </Link>
          )}
          {store.instagramUrl && (
            <Link href={store.instagramUrl} target="_blank">
              <Button variant="outline" size="sm" className="text-pink-600">
                📷
              </Button>
            </Link>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/stores/${store.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/stores/${store.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default StoreTableRow
