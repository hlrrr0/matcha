'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Settings } from 'lucide-react'
import { ImportSettings } from './types'
import { sizeCategoryOptions, limitOptions } from './constants'

interface DominoImportSettingsProps {
  settings: ImportSettings
  onSettingsChange: (settings: ImportSettings) => void
  onImport: () => void
  importing: boolean
}

export default function DominoImportSettings({
  settings,
  onSettingsChange,
  onImport,
  importing
}: DominoImportSettingsProps) {
  return (
    <>
      {/* インポート設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            インポート設定
          </CardTitle>
          <CardDescription>
            Dominoシステムからアクティブ企業のデータ取得条件を設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">企業ステータス</Label>
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">アクティブ企業のみ</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Dominoシステムからアクティブステータスの企業のみが取得されます<br/>
                  ⚠️ セキュリティ上の理由により、非アクティブ企業は対象外です
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">アクティブ企業の取得件数</Label>
                <Select 
                  value={settings.limit.toString()} 
                  onValueChange={(value) => onSettingsChange({ ...settings, limit: parseInt(value) })}
                >
                  <SelectTrigger id="limit">
                    <SelectValue placeholder="取得件数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {limitOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💡 指定した件数のアクティブ企業データのみが取得されます
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sizeCategory">企業規模でフィルタ</Label>
              <Select 
                value={settings.sizeCategory || 'all'} 
                onValueChange={(value) => onSettingsChange({ ...settings, sizeCategory: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="企業規模を選択（全て）" />
                </SelectTrigger>
                <SelectContent>
                  {sizeCategoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefecture">都道府県でフィルタ</Label>
              <Input
                id="prefecture"
                placeholder="例: 東京都"
                value={settings.prefecture}
                onChange={(e) => onSettingsChange({ ...settings, prefecture: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="since">更新日時（開始）</Label>
                <Input
                  id="since"
                  type="datetime-local"
                  value={settings.since}
                  onChange={(e) => onSettingsChange({ ...settings, since: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  この日時以降に更新された企業を取得
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sinceUntil">更新日時（終了）</Label>
                <Input
                  id="sinceUntil"
                  type="datetime-local"
                  value={settings.sinceUntil}
                  onChange={(e) => onSettingsChange({ ...settings, sinceUntil: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  この日時以前に更新された企業を取得（省略可）
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeEmpty"
                  checked={settings.includeEmpty}
                  onChange={(e) => onSettingsChange({ ...settings, includeEmpty: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="includeEmpty">更新日時が空白の企業も含める</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 更新日時が未設定の企業も取得対象に含めます
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">ステータス: アクティブ企業のみ</span>
              </div>
              <p className="text-xs text-blue-700">
                セキュリティ上の理由により、アクティブ企業のデータのみが取得対象となります。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* インポートボタン */}
      <Button 
        onClick={onImport}
        disabled={importing}
        size="lg"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {importing ? '処理中...' : 'Dominoからインポート'}
      </Button>
    </>
  )
}
