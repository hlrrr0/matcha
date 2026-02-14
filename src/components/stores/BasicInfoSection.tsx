import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Company } from '@/types/company'
import { extractPrefecture } from '@/lib/utils/prefecture'

interface BasicInfoSectionProps {
  formData: any
  companies: Company[]
  loadingCompanies: boolean
  geocoding: boolean
  autoGeocodingEnabled: boolean
  onFieldChange: (field: any, value: any) => void
  onGeocode: () => void
  onAutoGeocodeToggle: (enabled: boolean) => void
  onAddressChange: (address: string) => void
}

export function BasicInfoSection({
  formData,
  companies,
  loadingCompanies,
  geocoding,
  autoGeocodingEnabled,
  onFieldChange,
  onGeocode,
  onAutoGeocodeToggle,
  onAddressChange,
}: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>基本情報</CardTitle>
        <CardDescription>店舗の基本的な情報を入力してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="status">
            店舗ステータス <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.status || 'active'} 
            onValueChange={(value) => onFieldChange('status', value as 'active' | 'inactive')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">アクティブ</SelectItem>
              <SelectItem value="inactive">閉店/クローズ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="companyId">
            所属企業 <span className="text-red-500">*</span>
          </Label>
          <Select 
            key={formData.companyId || 'no-company'}
            value={formData.companyId || ''} 
            onValueChange={(value) => onFieldChange('companyId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="企業を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="name">
            店舗名 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder="例: 寿司松 本店"
            required
          />
        </div>

        <div>
          <Label htmlFor="businessType">業態</Label>
          <Input
            id="businessType"
            value={formData.businessType || ''}
            onChange={(e) => onFieldChange('businessType', e.target.value)}
            placeholder="例: 江戸前寿司、回転寿司、立ち食い寿司"
          />
        </div>

        <div>
          <Label htmlFor="address">店舗住所 <span className="text-red-500">*</span></Label>
          <Textarea
            id="address"
            value={formData.address || ''}
            onChange={(e) => {
              const newAddress = e.target.value
              onFieldChange('address', newAddress)
              onAddressChange(newAddress)
            }}
            rows={2}
            placeholder="店舗の住所を入力してください"
            required
          />
          {formData.address && (
            <div className="mt-2 space-y-2">
              <div>
                <span className="text-sm text-gray-500">自動抽出された都道府県: </span>
                {extractPrefecture(formData.address) ? (
                  <Badge variant="outline" className="ml-1">
                    {extractPrefecture(formData.address)}
                  </Badge>
                ) : (
                  <span className="text-sm text-amber-600">都道府県を抽出できませんでした</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onGeocode}
                    disabled={geocoding}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    {geocoding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        取得中...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        地図用の位置情報を取得
                      </>
                    )}
                  </Button>
                  {formData.latitude && formData.longitude && (
                    <Badge variant="outline" className="text-green-600">
                      ✓ 位置情報設定済み
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-geocoding"
                    checked={autoGeocodingEnabled}
                    onCheckedChange={onAutoGeocodeToggle}
                  />
                  <Label htmlFor="auto-geocoding" className="text-xs text-gray-500 cursor-pointer">
                    自動取得
                  </Label>
                </div>
              </div>
              {formData.latitude && formData.longitude && (
                <div className="text-xs text-gray-500">
                  緯度: {formData.latitude.toFixed(6)}, 経度: {formData.longitude.toFixed(6)}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="nearestStation">最寄り駅</Label>
          <Textarea
            id="nearestStation"
            value={formData.nearestStation || ''}
            onChange={(e) => onFieldChange('nearestStation', e.target.value)}
            rows={2}
            placeholder="最寄り駅の情報を入力してください"
          />
        </div>

        <div>
          <Label htmlFor="website">店舗URL</Label>
          <Input
            id="website"
            type="url"
            value={formData.website || ''}
            onChange={(e) => onFieldChange('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <Label htmlFor="instagramUrl">Instagram URL</Label>
          <Input
            id="instagramUrl"
            type="url"
            value={formData.instagramUrl || ''}
            onChange={(e) => onFieldChange('instagramUrl', e.target.value)}
            placeholder="https://instagram.com/..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
