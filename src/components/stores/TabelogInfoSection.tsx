import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TabelogInfoSectionProps {
  tabelogUrl: string
  tabelogUrlException: string
  tabelogUrlExceptionOther: string
  tabelogUrlError: string
  fetchingTabelog: boolean
  onFieldChange: (field: any, value: any) => void
  onFetchTabelog: () => void
}

export function TabelogInfoSection({
  tabelogUrl,
  tabelogUrlException,
  tabelogUrlExceptionOther,
  tabelogUrlError,
  fetchingTabelog,
  onFieldChange,
  onFetchTabelog,
}: TabelogInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>食べログから自動入力</CardTitle>
        <CardDescription>食べログURLを入力して、店舗情報を自動取得できます</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="tabelogUrl">
            食べログURL {!tabelogUrlException && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="tabelogUrl"
            type="url"
            value={tabelogUrl}
            onChange={(e) => onFieldChange('tabelogUrl', e.target.value)}
            placeholder="https://tabelog.com/..."
            required={!tabelogUrlException}
          />
          {tabelogUrlError && (
            <p className="text-sm text-red-500 mt-1">{tabelogUrlError}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>食べログURL例外理由（該当する場合のみチェック）</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exception-ryokan"
                checked={tabelogUrlException === '旅館'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldChange('tabelogUrlException', '旅館')
                    onFieldChange('tabelogUrlExceptionOther', '')
                  } else {
                    onFieldChange('tabelogUrlException', '')
                  }
                }}
              />
              <Label htmlFor="exception-ryokan" className="font-normal cursor-pointer">
                旅館
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exception-new-store"
                checked={tabelogUrlException === '新店舗'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldChange('tabelogUrlException', '新店舗')
                    onFieldChange('tabelogUrlExceptionOther', '')
                  } else {
                    onFieldChange('tabelogUrlException', '')
                  }
                }}
              />
              <Label htmlFor="exception-new-store" className="font-normal cursor-pointer">
                新店舗
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exception-overseas"
                checked={tabelogUrlException === '海外'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onFieldChange('tabelogUrlException', '海外')
                    onFieldChange('tabelogUrlExceptionOther', '')
                  } else {
                    onFieldChange('tabelogUrlException', '')
                  }
                }}
              />
              <Label htmlFor="exception-overseas" className="font-normal cursor-pointer">
                海外
              </Label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exception-other"
                  checked={tabelogUrlException === 'その他'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onFieldChange('tabelogUrlException', 'その他')
                    } else {
                      onFieldChange('tabelogUrlException', '')
                      onFieldChange('tabelogUrlExceptionOther', '')
                    }
                  }}
                />
                <Label htmlFor="exception-other" className="font-normal cursor-pointer">
                  その他
                </Label>
              </div>
              
              {tabelogUrlException === 'その他' && (
                <Input
                  id="tabelogUrlExceptionOther"
                  value={tabelogUrlExceptionOther}
                  onChange={(e) => onFieldChange('tabelogUrlExceptionOther', e.target.value)}
                  placeholder="理由を入力してください"
                  className="ml-6"
                />
              )}
            </div>
          </div>
        </div>

        {tabelogUrl && (
          <div className="pt-2">
            <Button
              type="button"
              onClick={onFetchTabelog}
              disabled={fetchingTabelog || !tabelogUrl}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {fetchingTabelog ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  取得中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  食べログから情報を取得
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
