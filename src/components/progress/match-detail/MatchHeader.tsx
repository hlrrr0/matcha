'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, MessageSquare, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Match } from '@/types/matching'
import { statusFlow } from './constants'

interface MatchHeaderProps {
  match: Match
  onRefresh: () => void
  onEdit: () => void
  onStatusUpdate: () => void
}

export default function MatchHeader({
  match,
  onRefresh,
  onEdit,
  onStatusUpdate
}: MatchHeaderProps) {
  const canUpdateStatus = !['offer_accepted', 'withdrawn', 'rejected'].includes(match.status) && statusFlow[match.status].length > 0

  return (
    <>
      {/* バックボタン */}
      <div className="mb-8">
        <Button
          variant="outline"
          asChild
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <Link href="/progress">
            <ArrowLeft className="h-4 w-4 mr-2" />
            進捗管理
          </Link>
        </Button>
      </div>

      {/* タイトルとアクションボタン */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-800">
              マッチング詳細
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              ID: {match.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 更新ボタン */}
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">更新</span>
          </Button>

          {/* 編集ボタン */}
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">編集</span>
          </Button>

          {/* 次の進捗へボタン */}
          {canUpdateStatus && (
            <Button
              onClick={onStatusUpdate}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">次の進捗へ</span>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
