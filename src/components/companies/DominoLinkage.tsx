"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Link, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { Company } from '@/types/company'
import { updateCompany } from '@/lib/firestore/companies'

interface DominoLinkageProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
}

export default function DominoLinkage({ company, onUpdate }: DominoLinkageProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dominoId, setDominoId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isLinked = Boolean(company.dominoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dominoId.trim()) {
      setError('Domino IDを入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 企業データを更新（dominoIdを設定）
      const updatedData = {
        ...company,
        dominoId: dominoId.trim(),
        importedAt: new Date()
      }

      await updateCompany(company.id, updatedData)

      // 親コンポーネントに更新を通知
      onUpdate(updatedData)

      // ダイアログを閉じる
      setIsOpen(false)
      setDominoId('')
      
    } catch (error) {
      console.error('Domino連携エラー:', error)
      setError('Domino連携の設定に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlink = async () => {
    setIsLoading(true)
    setError('')

    try {
      const updatedData = {
        ...company,
        dominoId: undefined,
        importedAt: undefined
      }

      await updateCompany(company.id, updatedData)
      onUpdate(updatedData)
      setIsOpen(false)
      
    } catch (error) {
      console.error('Domino連携解除エラー:', error)
      setError('Domino連携の解除に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const linkageStatus = () => {
    if (isLinked) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          連携済み
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-gray-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        未連携
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={isLinked ? "outline" : "default"} className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Domino連携
          {linkageStatus()}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Domino連携設定
          </DialogTitle>
          <DialogDescription>
            Dominoシステムとのデータ連携を設定します。
          </DialogDescription>
        </DialogHeader>
        {isLinked && (
          <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm text-green-800">
              現在のDomino ID: <code className="font-mono bg-green-100 px-1 rounded">{company.dominoId}</code>
            </p>
            {company.importedAt && (
              <p className="text-xs text-green-600 mt-1">
                連携日時: {new Date(company.importedAt).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dominoId">Domino ID</Label>
            <Input
              id="dominoId"
              value={dominoId}
              onChange={(e) => setDominoId(e.target.value)}
              placeholder="例: company_12345"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Dominoシステムで管理されている企業の一意識別子を入力してください
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {isLinked && (
              <Button
                type="button"
                variant="outline"
                onClick={handleUnlink}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700"
              >
                連携解除
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !dominoId.trim()}>
              {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {isLinked ? '更新' : '連携設定'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}