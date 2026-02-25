"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, X, Pencil, RotateCcw } from 'lucide-react'

interface EmailPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailData: {
    from?: string
    to: string
    cc?: string
    bcc: string
    subject: string
    body: string
  }
  onConfirm: (editedData: { subject: string; body: string }) => void
  isSending?: boolean
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailData,
  onConfirm,
  isSending = false
}: EmailPreviewDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(emailData.subject)
  const [editedBody, setEditedBody] = useState(emailData.body)

  // emailDataが変更されたらリセット
  useEffect(() => {
    setEditedSubject(emailData.subject)
    setEditedBody(emailData.body)
    setIsEditing(false)
  }, [emailData.subject, emailData.body])

  const handleReset = () => {
    setEditedSubject(emailData.subject)
    setEditedBody(emailData.body)
  }

  const handleConfirm = () => {
    onConfirm({ subject: editedSubject, body: editedBody })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              メール送信内容の確認
            </DialogTitle>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {isEditing ? '編集中' : '内容を編集'}
            </Button>
          </div>
          <DialogDescription>
            {isEditing
              ? '件名・本文を直接編集できます。編集後「送信する」を押してください。'
              : '以下の内容でメールを送信します。内容を確認してください。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 送信先 */}
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="space-y-2 text-sm">
              {emailData.from && (
                <div className="flex">
                  <span className="font-semibold w-20">送信元:</span>
                  <span className="text-gray-700">{emailData.from}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-semibold w-20">送信先:</span>
                <span className="text-gray-700">{emailData.to}</span>
              </div>
              {emailData.cc && (
                <div className="flex">
                  <span className="font-semibold w-20">CC:</span>
                  <span className="text-gray-700">{emailData.cc}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-semibold w-20">BCC:</span>
                <span className="text-gray-700">{emailData.bcc}</span>
              </div>
            </div>
          </div>

          {/* 件名 */}
          <div>
            <Label className="font-semibold text-sm mb-1 block">件名:</Label>
            {isEditing ? (
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full"
              />
            ) : (
              <div className="text-sm text-gray-700 border rounded-md p-3 bg-gray-50">
                {editedSubject}
              </div>
            )}
          </div>

          {/* メール本文 */}
          <div>
            <Label className="font-semibold text-sm mb-1 block">メール本文:</Label>
            {isEditing ? (
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="w-full font-mono text-sm min-h-[400px]"
                rows={20}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap bg-white p-4 border rounded-md max-h-96 overflow-y-auto">
                {editedBody}
              </pre>
            )}
          </div>

          {/* 編集時のリセットボタン */}
          {isEditing && (editedSubject !== emailData.subject || editedBody !== emailData.body) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                テンプレートに戻す
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSending ? '送信中...' : '送信する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
