'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw } from 'lucide-react'
import { Job } from '@/types/job'

interface BulkStatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedJobsCount: number
  bulkStatusValue: Job['status']
  onStatusChange: (status: Job['status']) => void
  onConfirm: () => void
  isLoading: boolean
}

export function BulkStatusChangeDialog({
  open,
  onOpenChange,
  selectedJobsCount,
  bulkStatusValue,
  onStatusChange,
  onConfirm,
  isLoading,
}: BulkStatusChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>選択した求人のステータスを一括変更</DialogTitle>
          <DialogDescription>
            {selectedJobsCount}件の求人のステータスを変更します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-status">新しいステータス</Label>
            <Select value={bulkStatusValue} onValueChange={onStatusChange}>
              <SelectTrigger id="bulk-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="active">公開中</SelectItem>
                <SelectItem value="closed">募集終了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                変更中...
              </>
            ) : (
              '変更する'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
