"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mail, X } from 'lucide-react'

interface EmailPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailData: {
    to: string
    cc?: string
    bcc: string
    subject: string
    body: string
  }
  onConfirm: () => void
  isSending?: boolean
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailData,
  onConfirm,
  isSending = false
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            メール送信内容の確認
          </DialogTitle>
          <DialogDescription>
            以下の内容でメールを送信します。内容を確認してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 送信先 */}
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="space-y-2 text-sm">
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
              <div className="flex">
                <span className="font-semibold w-20">件名:</span>
                <span className="text-gray-700">{emailData.subject}</span>
              </div>
            </div>
          </div>

          {/* メール本文 */}
          <div className="border rounded-md p-4">
            <div className="font-semibold text-sm mb-2">メール本文:</div>
            <pre className="text-sm whitespace-pre-wrap bg-white p-4 border rounded-md max-h-96 overflow-y-auto">
              {emailData.body}
            </pre>
          </div>
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
            onClick={onConfirm}
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
