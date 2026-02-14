'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Company } from '@/types/company'
import { Trash2, RefreshCw } from 'lucide-react'

interface BulkDeleteDialogProps {
  open: boolean
  companies: Company[]
  selectedIds: Set<string>
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
  open,
  companies,
  selectedIds,
  isDeleting,
  onOpenChange,
  onConfirm,
}) => {
  const selectedCompanies = companies.filter(c => selectedIds.has(c.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>企業の一括削除</DialogTitle>
          <DialogDescription>
            選択された{selectedIds.size}件の企業とその関連データ（店舗・求人）を削除しますか？
            <br />
            <strong className="text-red-600">この操作は取り消すことができません。</strong>
            <br />
            <br />
            削除対象企業：
            <br />
            {selectedCompanies.map(c => c.name).join('、')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {selectedIds.size}件削除
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
