"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { MatchWithDetails } from '@/components/candidates/detail/types'
import { statusColors, statusLabels } from '@/components/candidates/detail/constants'

interface DeleteMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchToDelete: MatchWithDetails | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteMatchDialog({
  open,
  onOpenChange,
  matchToDelete,
  deleting,
  onCancel,
  onConfirm
}: DeleteMatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            進捗を削除
          </DialogTitle>
          <DialogDescription>
            この進捗を完全に削除します。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        {matchToDelete && (
          <div className="space-y-3 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">削除対象:</p>
              <p className="font-medium">{matchToDelete.jobTitle}</p>
              <p className="text-sm text-gray-600">{matchToDelete.companyName}</p>
              <div className="mt-2">
                <Badge className={statusColors[matchToDelete.status]}>
                  {statusLabels[matchToDelete.status]}
                </Badge>
              </div>
            </div>

            {matchToDelete.status !== 'suggested' && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  「提案済み」ステータスのもののみ削除できます
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={deleting || !!(matchToDelete && matchToDelete.status !== 'suggested')}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                削除する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
