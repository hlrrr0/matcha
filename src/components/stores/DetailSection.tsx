import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface DetailSectionProps {
  formData: any
  onFieldChange: (field: any, value: any) => void
}

export function DetailSection({
  formData,
  onFieldChange,
}: DetailSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>詳細セクション</CardTitle>
        <CardDescription>店舗の詳細情報について管理します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isReservationRequired"
            checked={formData.isReservationRequired ?? false}
            onCheckedChange={(checked) => onFieldChange('isReservationRequired', checked)}
          />
          <Label htmlFor="isReservationRequired">予約制なのか（時間固定の）</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="unitPriceLunch">単価（昼）</Label>
            <Input
              id="unitPriceLunch"
              type="number"
              value={formData.unitPriceLunch || ''}
              onChange={(e) => onFieldChange('unitPriceLunch', parseInt(e.target.value) || undefined)}
              placeholder="円"
            />
          </div>

          <div>
            <Label htmlFor="unitPriceDinner">単価（夜）</Label>
            <Input
              id="unitPriceDinner"
              type="number"
              value={formData.unitPriceDinner || ''}
              onChange={(e) => onFieldChange('unitPriceDinner', parseInt(e.target.value) || undefined)}
              placeholder="円"
            />
          </div>

          <div>
            <Label htmlFor="seatCount">席数</Label>
            <Input
              id="seatCount"
              type="number"
              value={formData.seatCount || ''}
              onChange={(e) => onFieldChange('seatCount', parseInt(e.target.value) || undefined)}
              placeholder="席"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        </div>
        
        <div>
          <Label htmlFor="googleReviewScore">Googleの口コミスコア</Label>
          <Textarea
            id="googleReviewScore"
            value={formData.googleReviewScore || ''}
            onChange={(e) => onFieldChange('googleReviewScore', e.target.value)}
            rows={2}
            placeholder="Googleレビューのスコアや評価を記載してください"
          />
        </div>

        <div>
          <Label htmlFor="tabelogScore">食べログの口コミスコア</Label>
          <Textarea
            id="tabelogScore"
            value={formData.tabelogScore || ''}
            onChange={(e) => onFieldChange('tabelogScore', e.target.value)}
            rows={2}
            placeholder="食べログのスコアや評価を記載してください"
          />
        </div>

        <div>
          <Label htmlFor="reputation">その他 / ミシュランなどの獲得状況等の実績</Label>
          <Textarea
            id="reputation"
            value={formData.reputation || ''}
            onChange={(e) => onFieldChange('reputation', e.target.value)}
            rows={3}
            placeholder="ミシュラン獲得状況、その他の実績を記載してください"
          />
        </div>

        <div>
          <Label htmlFor="staffReview">スタッフが食べに行った&quot;正直な&quot;感想</Label>
          <Textarea
            id="staffReview"
            value={formData.staffReview || ''}
            onChange={(e) => onFieldChange('staffReview', e.target.value)}
            rows={4}
            placeholder="実際に食べに行ったスタッフの正直な感想を記載してください"
          />
        </div>

        <div>
          <Label htmlFor="trainingPeriod">握れるまでの期間</Label>
          <Input
            id="trainingPeriod"
            value={formData.trainingPeriod || ''}
            onChange={(e) => onFieldChange('trainingPeriod', e.target.value)}
            placeholder="例: 3ヶ月、半年、1年"
          />
        </div>
      </CardContent>
    </Card>
  )
}
