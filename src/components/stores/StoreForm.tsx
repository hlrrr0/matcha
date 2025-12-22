"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Save, Loader2, Plus, Minus } from 'lucide-react'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { extractPrefecture } from '@/lib/utils/prefecture'

interface StoreFormProps {
  initialData?: Partial<Store>
  onSubmit: (data: Partial<Store>) => Promise<void>
  isEdit?: boolean
  loading?: boolean
}

export default function StoreForm({ 
  initialData = {}, 
  onSubmit, 
  isEdit = false,
  loading = false 
}: StoreFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [additionalPhotosCount, setAdditionalPhotosCount] = useState(0)
  const [tabelogUrlError, setTabelogUrlError] = useState<string>('')
  const [formData, setFormData] = useState<Partial<Store>>({
    companyId: '',
    name: '',
    businessType: '',
    address: '',
    nearestStation: '',
    website: '',
    unitPriceLunch: undefined,
    unitPriceDinner: undefined,
    seatCount: undefined,
    isReservationRequired: false,
    instagramUrl: '',
    tabelogUrl: '',
    tabelogUrlException: '',
    tabelogUrlExceptionOther: '',
    googleReviewScore: '',
    tabelogScore: '',
    reputation: '',
    staffReview: '',
    trainingPeriod: '',
    ownerPhoto: '',
    ownerVideo: '',
    interiorPhoto: '',
    photo1: '',
    photo2: '',
    photo3: '',
    photo4: '',
    photo5: '',
    photo6: '',
    photo7: '',
    status: 'active'
  })

  useEffect(() => {
    console.log('StoreForm useEffect - initialData:', initialData, 'keys length:', Object.keys(initialData).length)
    if (Object.keys(initialData).length > 0) {
      console.log('StoreForm - Setting form data with companyId:', initialData.companyId)
      setFormData({
        companyId: initialData.companyId || '',
        name: initialData.name || '',
        businessType: initialData.businessType || '',
        address: initialData.address || '',
        nearestStation: initialData.nearestStation || '',
        website: initialData.website || '',
        unitPriceLunch: initialData.unitPriceLunch,
        unitPriceDinner: initialData.unitPriceDinner,
        seatCount: initialData.seatCount,
        isReservationRequired: initialData.isReservationRequired || false,
        instagramUrl: initialData.instagramUrl || '',
        tabelogUrl: initialData.tabelogUrl || '',
        tabelogUrlException: initialData.tabelogUrlException || '',
        tabelogUrlExceptionOther: initialData.tabelogUrlExceptionOther || '',
        googleReviewScore: initialData.googleReviewScore || '',
        tabelogScore: initialData.tabelogScore || '',
        reputation: initialData.reputation || '',
        staffReview: initialData.staffReview || '',
        trainingPeriod: initialData.trainingPeriod || '',
        ownerPhoto: initialData.ownerPhoto || '',
        ownerVideo: initialData.ownerVideo || '',
        interiorPhoto: initialData.interiorPhoto || '',
        photo1: initialData.photo1 || '',
        photo2: initialData.photo2 || '',
        photo3: initialData.photo3 || '',
        photo4: initialData.photo4 || '',
        photo5: initialData.photo5 || '',
        photo6: initialData.photo6 || '',
        photo7: initialData.photo7 || '',
        status: initialData.status || 'active',
        ...initialData
      })

      // 既存の追加写真の数を計算
      const photoFields = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6', 'photo7']
      const existingPhotos = photoFields.filter(field => initialData[field as keyof Store])
      setAdditionalPhotosCount(existingPhotos.length)
    }
  }, [initialData])

  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true)
      try {
        // 全ての企業を取得（非アクティブも含む）
        const companiesSnapshot = await getDocs(collection(db, 'companies'))
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Company))
        
        console.log('Companies loaded:', companiesData.length, 'companies')
        console.log('Current formData.companyId:', formData.companyId)
        setCompanies(companiesData)
      } catch (error) {
        console.error('Error loading companies:', error)
      } finally {
        setLoadingCompanies(false)
      }
    }

    loadCompanies()
  }, [])

  const handleChange = (field: keyof Store, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 食べログURLの重複チェック
    if (field === 'tabelogUrl' && value) {
      checkTabelogUrlDuplicate(value)
    } else if (field === 'tabelogUrl') {
      setTabelogUrlError('')
    }
  }

  const checkTabelogUrlDuplicate = async (url: string) => {
    if (!url) {
      setTabelogUrlError('')
      return
    }

    try {
      const storesQuery = query(
        collection(db, 'stores'),
        where('tabelogUrl', '==', url)
      )
      const storesSnapshot = await getDocs(storesQuery)
      
      // 編集モードの場合、自分自身は除外
      const duplicates = storesSnapshot.docs.filter(doc => 
        !isEdit || doc.id !== initialData.id
      )
      
      if (duplicates.length > 0) {
        setTabelogUrlError('この食べログURLは既に登録されています')
      } else {
        setTabelogUrlError('')
      }
    } catch (error) {
      console.error('Error checking tabelog URL:', error)
    }
  }

  const addPhotoField = () => {
    if (additionalPhotosCount < 7) {
      setAdditionalPhotosCount(prev => prev + 1)
    }
  }

  const removePhotoField = () => {
    if (additionalPhotosCount > 0) {
      const photoFieldToRemove = `photo${additionalPhotosCount}` as keyof Store
      setFormData(prev => ({
        ...prev,
        [photoFieldToRemove]: ''
      }))
      setAdditionalPhotosCount(prev => prev - 1)
    }
  }

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
            onChange={(e) => handleChange(fieldName, e.target.value)}
            placeholder={`https://example.com/photo${i}.jpg`}
          />
        </div>
      )
    }
    return fields
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyId || !formData.name) {
      alert('必須項目を入力してください')
      return
    }

    // 食べログURLのバリデーション
    const hasException = formData.tabelogUrlException
    if (!hasException && !formData.tabelogUrl) {
      alert('食べログURLを入力するか、例外理由を選択してください')
      return
    }

    // 食べログURLの重複チェック
    if (tabelogUrlError) {
      alert('食べログURLが既に登録されています。別のURLを入力してください')
      return
    }

    // undefined値を除去してFirestore用にクリーンアップ
    const cleanFormData = { ...formData }
    
    // 住所から都道府県を自動抽出
    if (cleanFormData.address) {
      cleanFormData.prefecture = extractPrefecture(cleanFormData.address)
    }
    
    // undefined値を持つフィールドを除去
    Object.keys(cleanFormData).forEach(key => {
      const fieldKey = key as keyof Store
      if (cleanFormData[fieldKey] === undefined) {
        delete cleanFormData[fieldKey]
      }
    })

    await onSubmit(cleanFormData)
  }

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">企業データを読み込み中...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
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
              onValueChange={(value) => handleChange('status', value as 'active' | 'inactive')}
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
              onValueChange={(value) => {
                console.log('Select onValueChange called with:', value)
                handleChange('companyId', value)
              }}
            >
              <SelectTrigger onClick={() => console.log('Select clicked - current value:', formData.companyId, 'companies:', companies.length)}>
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
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="例: 寿司松 本店"
              required
            />
          </div>

          <div>
            <Label htmlFor="businessType">業態</Label>
            <Input
              id="businessType"
              value={formData.businessType || ''}
              onChange={(e) => handleChange('businessType', e.target.value)}
              placeholder="例: 江戸前寿司、回転寿司、立ち食い寿司"
            />
          </div>


          <div>
            <Label htmlFor="address">店舗住所 <span className="text-red-500">*</span></Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              placeholder="店舗の住所を入力してください"
              required
            />
            {formData.address && (
              <div className="mt-2">
                <span className="text-sm text-gray-500">自動抽出された都道府県: </span>
                {extractPrefecture(formData.address) ? (
                  <Badge variant="outline" className="ml-1">
                    {extractPrefecture(formData.address)}
                  </Badge>
                ) : (
                  <span className="text-sm text-amber-600">都道府県を抽出できませんでした</span>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="nearestStation">最寄り駅</Label>
            <Textarea
              id="nearestStation"
              value={formData.nearestStation || ''}
              onChange={(e) => handleChange('nearestStation', e.target.value)}
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
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input
              id="instagramUrl"
              type="url"
              value={formData.instagramUrl || ''}
              onChange={(e) => handleChange('instagramUrl', e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </div>

          <div>
            <Label htmlFor="tabelogUrl">
              食べログURL {!formData.tabelogUrlException && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="tabelogUrl"
              type="url"
              value={formData.tabelogUrl || ''}
              onChange={(e) => handleChange('tabelogUrl', e.target.value)}
              placeholder="https://tabelog.com/..."
              required={!formData.tabelogUrlException}
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
                  checked={formData.tabelogUrlException === '旅館'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChange('tabelogUrlException', '旅館')
                      handleChange('tabelogUrlExceptionOther', '')
                    } else {
                      handleChange('tabelogUrlException', '')
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
                  checked={formData.tabelogUrlException === '新店舗'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChange('tabelogUrlException', '新店舗')
                      handleChange('tabelogUrlExceptionOther', '')
                    } else {
                      handleChange('tabelogUrlException', '')
                    }
                  }}
                />
                <Label htmlFor="exception-new-store" className="font-normal cursor-pointer">
                  新店舗
                </Label>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exception-other"
                    checked={formData.tabelogUrlException === 'その他'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleChange('tabelogUrlException', 'その他')
                      } else {
                        handleChange('tabelogUrlException', '')
                        handleChange('tabelogUrlExceptionOther', '')
                      }
                    }}
                  />
                  <Label htmlFor="exception-other" className="font-normal cursor-pointer">
                    その他
                  </Label>
                </div>
                
                {formData.tabelogUrlException === 'その他' && (
                  <Input
                    id="tabelogUrlExceptionOther"
                    value={formData.tabelogUrlExceptionOther || ''}
                    onChange={(e) => handleChange('tabelogUrlExceptionOther', e.target.value)}
                    placeholder="理由を入力してください"
                    className="ml-6"
                  />
                )}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
      {/* 詳細セクション */}
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
              onCheckedChange={(checked) => handleChange('isReservationRequired', checked)}
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
                onChange={(e) => handleChange('unitPriceLunch', parseInt(e.target.value) || undefined)}
                placeholder="円"
              />
            </div>

            <div>
              <Label htmlFor="unitPriceDinner">単価（夜）</Label>
              <Input
                id="unitPriceDinner"
                type="number"
                value={formData.unitPriceDinner || ''}
                onChange={(e) => handleChange('unitPriceDinner', parseInt(e.target.value) || undefined)}
                placeholder="円"
              />
            </div>

            <div>
              <Label htmlFor="seatCount">席数</Label>
              <Input
                id="seatCount"
                type="number"
                value={formData.seatCount || ''}
                onChange={(e) => handleChange('seatCount', parseInt(e.target.value) || undefined)}
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
              onChange={(e) => handleChange('googleReviewScore', e.target.value)}
              rows={2}
              placeholder="Googleレビューのスコアや評価を記載してください"
            />
          </div>

          <div>
            <Label htmlFor="tabelogScore">食べログの口コミスコア</Label>
            <Textarea
              id="tabelogScore"
              value={formData.tabelogScore || ''}
              onChange={(e) => handleChange('tabelogScore', e.target.value)}
              rows={2}
              placeholder="食べログのスコアや評価を記載してください"
            />
          </div>

          <div>
            <Label htmlFor="reputation">その他 / ミシュランなどの獲得状況等の実績</Label>
            <Textarea
              id="reputation"
              value={formData.reputation || ''}
              onChange={(e) => handleChange('reputation', e.target.value)}
              rows={3}
              placeholder="ミシュラン獲得状況、その他の実績を記載してください"
            />
          </div>

          <div>
            <Label htmlFor="staffReview">スタッフが食べに行った&quot;正直な&quot;感想</Label>
            <Textarea
              id="staffReview"
              value={formData.staffReview || ''}
              onChange={(e) => handleChange('staffReview', e.target.value)}
              rows={4}
              placeholder="実際に食べに行ったスタッフの正直な感想を記載してください"
            />
          </div>

          <div>
            <Label htmlFor="trainingPeriod">握れるまでの期間</Label>
            <Input
              id="trainingPeriod"
              value={formData.trainingPeriod || ''}
              onChange={(e) => handleChange('trainingPeriod', e.target.value)}
              placeholder="例: 3ヶ月、半年、1年"
            />
          </div>
        </CardContent>
      </Card>

      {/* 素材セクション */}
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
              onChange={(e) => handleChange('ownerPhoto', e.target.value)}
              placeholder="https://example.com/owner-photo.jpg"
            />
          </div>

          <div>
            <Label htmlFor="ownerVideo">大将の動画</Label>
            <Input
              id="ownerVideo"
              type="url"
              value={formData.ownerVideo || ''}
              onChange={(e) => handleChange('ownerVideo', e.target.value)}
              placeholder="https://example.com/owner-video.mp4"
            />
          </div>

          <div>
            <Label htmlFor="interiorPhoto">店内の写真</Label>
            <Input
              id="interiorPhoto"
              type="url"
              value={formData.interiorPhoto || ''}
              onChange={(e) => handleChange('interiorPhoto', e.target.value)}
              placeholder="https://example.com/interior-photo.jpg"
            />
          </div>

          {/* 動的に追加される素材写真フィールド */}
          {renderAdditionalPhotoFields()}

          {/* 写真追加・削除ボタン */}
          <div className="flex gap-2">
            {additionalPhotosCount < 7 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhotoField}
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
                onClick={removePhotoField}
                className="flex items-center gap-2"
              >
                <Minus className="h-4 w-4" />
                最後の写真を削除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* タグ情報 */}
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
              onCheckedChange={(checked) => handleChange('tags', {
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
              onCheckedChange={(checked) => handleChange('tags', {
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
                handleChange('tags', {
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
              onCheckedChange={(checked) => handleChange('tags', {
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
              onCheckedChange={(checked) => handleChange('tags', {
                ...formData.tags,
                goetMiyoScore: checked ? 12 : undefined
              })}
            />
            <Label htmlFor="hasGoetMiyo" className="cursor-pointer">ゴ・エ・ミヨ掲載店</Label>
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? '更新中...' : '保存中...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? '店舗を更新' : '店舗を追加'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}