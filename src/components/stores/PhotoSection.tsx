import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import { Store } from '@/types/store'

interface PhotoSectionProps {
  formData: any
  additionalPhotosCount: number
  onFieldChange: (field: any, value: any) => void
  onAddPhoto: () => void
  onRemovePhoto: () => void
}

export function PhotoSection({
  formData,
  additionalPhotosCount,
  onFieldChange,
  onAddPhoto,
  onRemovePhoto,
}: PhotoSectionProps) {
  const renderAdditionalPhotoFields = () => {
    const fields = []
    for (let i = 1; i <= additionalPhotosCount; i++) {
      const fieldName = `photo${i}` as keyof Store
      fields.push(
        <div key={fieldName}>
          <Label htmlFor={fieldName}>素材写真{i}</Label>
          <Input
            id={fieldName}
            type="url"
            value={(formData[fieldName] as string) || ''}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            placeholder={`https://example.com/photo${i}.jpg`}
          />
        </div>
      )
    }
    return fields
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>素材セクション</CardTitle>
        <CardDescription>店舗の写真や動画素材を管理します（合計10枚まで登録可能）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ownerPhoto">大将の写真</Label>
          <Input
            id="ownerPhoto"
            type="url"
            value={formData.ownerPhoto || ''}
            onChange={(e) => onFieldChange('ownerPhoto', e.target.value)}
            placeholder="https://example.com/owner-photo.jpg"
          />
        </div>

        <div>
          <Label htmlFor="ownerVideo">大将の動画</Label>
          <Input
            id="ownerVideo"
            type="url"
            value={formData.ownerVideo || ''}
            onChange={(e) => onFieldChange('ownerVideo', e.target.value)}
            placeholder="https://example.com/owner-video.mp4"
          />
        </div>

        <div>
          <Label htmlFor="interiorPhoto">店内の写真</Label>
          <Input
            id="interiorPhoto"
            type="url"
            value={formData.interiorPhoto || ''}
            onChange={(e) => onFieldChange('interiorPhoto', e.target.value)}
            placeholder="https://example.com/interior-photo.jpg"
          />
        </div>

        {renderAdditionalPhotoFields()}

        <div className="flex gap-2">
          {additionalPhotosCount < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddPhoto}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              素材写真を追加
            </Button>
          )}
          {additionalPhotosCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemovePhoto}
              className="flex items-center gap-2"
            >
              <Minus className="h-4 w-4" />
              最後の写真を削除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
