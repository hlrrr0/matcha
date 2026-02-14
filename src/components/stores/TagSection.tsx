import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TagSectionProps {
  formData: any
  onFieldChange: (field: any, value: any) => void
}

export function TagSection({
  formData,
  onFieldChange,
}: TagSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>タグ情報</CardTitle>
        <CardDescription>店舗の受賞歴や評価情報をタグで管理します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ミシュラン獲得店 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasMichelinStar"
            checked={formData.tags?.michelinStars !== undefined && formData.tags?.michelinStars > 0}
            onCheckedChange={(checked) => onFieldChange('tags', {
              ...formData.tags,
              michelinStars: checked ? 1 : undefined
            })}
          />
          <Label htmlFor="hasMichelinStar" className="cursor-pointer">ミシュラン獲得店</Label>
        </div>

        {/* ミシュランビブグルマン獲得店 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasBibGourmand"
            checked={formData.tags?.hasBibGourmand || false}
            onCheckedChange={(checked) => onFieldChange('tags', {
              ...formData.tags,
              hasBibGourmand: checked as boolean
            })}
          />
          <Label htmlFor="hasBibGourmand" className="cursor-pointer">ミシュランビブグルマン獲得店</Label>
        </div>

        {/* 食べログ100名店掲載店 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasTabelogTop100"
            checked={formData.tags?.tabelogAward !== undefined && formData.tags?.tabelogAward.length > 0}
            onCheckedChange={(checked) => {
              onFieldChange('tags', {
                ...formData.tags,
                tabelogAward: checked ? ['2024'] : undefined
              })
            }}
          />
          <Label htmlFor="hasTabelogTop100" className="cursor-pointer">食べログ100名店掲載店</Label>
        </div>

        {/* 食べログアワード獲得店 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasTabelogAward"
            checked={formData.tags?.hasTabelogAward || false}
            onCheckedChange={(checked) => onFieldChange('tags', {
              ...formData.tags,
              hasTabelogAward: checked as boolean
            })}
          />
          <Label htmlFor="hasTabelogAward" className="cursor-pointer">食べログアワード獲得店</Label>
        </div>

        {/* ゴ・エ・ミヨ掲載店 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasGoetMiyo"
            checked={formData.tags?.goetMiyoScore !== undefined && formData.tags?.goetMiyoScore > 0}
            onCheckedChange={(checked) => onFieldChange('tags', {
              ...formData.tags,
              goetMiyoScore: checked ? 12 : undefined
            })}
          />
          <Label htmlFor="hasGoetMiyo" className="cursor-pointer">ゴ・エ・ミヨ掲載店</Label>
        </div>
      </CardContent>
    </Card>
  )
}
