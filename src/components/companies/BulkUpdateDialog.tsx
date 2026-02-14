'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Company, contractTypeLabels } from '@/types/company'
import { User } from '@/types/user'

interface BulkUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  users: User[]
  onConfirm: (updates: BulkUpdateValues) => void
  isUpdating: boolean
}

export interface BulkUpdateValues {
  status?: Company['status']
  contractType?: Company['contractType']
  consultantId?: string
}

const statusLabels: Record<Company['status'], string> = {
  active: '有効',
  inactive: '非アクティブ',
  prospect: '見込み客',
  prospect_contacted: '見込み客/接触あり',
  appointment: 'アポ',
  no_approach: 'アプローチ不可',
  suspended: '停止',
  paused: '休止',
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  users,
  onConfirm,
  isUpdating,
}: BulkUpdateDialogProps) {
  const [updateValues, setUpdateValues] = useState<BulkUpdateValues>({})

  const handleConfirm = () => {
    // 少なくとも1つの更新項目が選択されている場合のみ実行
    if (Object.keys(updateValues).length > 0) {
      onConfirm(updateValues)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      setUpdateValues({})
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>企業情報の一括更新</DialogTitle>
          <DialogDescription>
            選択した{selectedCount}件の企業情報を一括更新します。
            <br />
            更新したい項目のみ選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ステータス */}
          <div className="space-y-2">
            <Label htmlFor="bulk-status">ステータス</Label>
            <Select
              value={updateValues.status || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  const { status, ...rest } = updateValues
                  setUpdateValues(rest)
                } else {
                  setUpdateValues({ ...updateValues, status: value as Company['status'] })
                }
              }}
            >
              <SelectTrigger id="bulk-status">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">変更しない</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 契約状況 */}
          <div className="space-y-2">
            <Label htmlFor="bulk-contract">契約状況</Label>
            <Select
              value={updateValues.contractType || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  const { contractType, ...rest } = updateValues
                  setUpdateValues(rest)
                } else {
                  setUpdateValues({ ...updateValues, contractType: value as Company['contractType'] })
                }
              }}
            >
              <SelectTrigger id="bulk-contract">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">変更しない</SelectItem>
                {Object.entries(contractTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 企業担当者 */}
          <div className="space-y-2">
            <Label htmlFor="bulk-consultant">企業担当者</Label>
            <Select
              value={updateValues.consultantId || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  const { consultantId, ...rest } = updateValues
                  setUpdateValues(rest)
                } else if (value === 'clear') {
                  setUpdateValues({ ...updateValues, consultantId: '' })
                } else {
                  setUpdateValues({ ...updateValues, consultantId: value })
                }
              }}
            >
              <SelectTrigger id="bulk-consultant">
                <SelectValue placeholder="変更しない" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">変更しない</SelectItem>
                <SelectItem value="clear">担当者をクリア</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUpdating}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || Object.keys(updateValues).length === 0}
          >
            {isUpdating ? '更新中...' : `${selectedCount}件を更新`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
