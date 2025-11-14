"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Loader2, Copy, Check } from 'lucide-react'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'

interface JobFormProps {
  initialData?: Partial<Job>
  onSubmit: (data: Partial<Job>) => Promise<void>
  isEdit?: boolean
  loading?: boolean
}

export default function JobForm({ 
  initialData = {}, 
  onSubmit, 
  isEdit = false,
  loading = false 
}: JobFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Job>>({
    companyId: '',
    storeIds: [],
    title: '',
    businessType: '',
    employmentType: '',
    trialPeriod: '',
    workingHours: '',
    holidays: '',
    overtime: '',
    salaryInexperienced: '',
    salaryExperienced: '',
    requiredSkills: '',
    jobDescription: '',
    ageLimit: undefined,
    ageNote: '',
    smokingPolicy: '',
    insurance: '',
    benefits: '',
    selectionProcess: '',
    consultantReview: '',
    status: 'draft'
  })

  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      // 初期データを設定（loadingDataの状態に関係なく）
      console.log('JobForm: Setting initial data:', initialData)
      // 既存のstoreIdがあればstoreIdsに変換
      const storeIds = initialData.storeIds || (initialData.storeId ? [initialData.storeId] : [])
      setFormData({
        companyId: initialData.companyId || '',
        storeIds: storeIds,
        title: initialData.title || '',
        businessType: initialData.businessType || '',
        employmentType: initialData.employmentType || '',
        trialPeriod: initialData.trialPeriod || '',
        workingHours: initialData.workingHours || '',
        holidays: initialData.holidays || '',
        overtime: initialData.overtime || '',
        salaryInexperienced: initialData.salaryInexperienced || '',
        salaryExperienced: initialData.salaryExperienced || '',
        requiredSkills: initialData.requiredSkills || '',
        jobDescription: initialData.jobDescription || '',
        ageLimit: initialData.ageLimit,
        ageNote: initialData.ageNote || '',
        smokingPolicy: initialData.smokingPolicy || '',
        insurance: initialData.insurance || '',
        benefits: initialData.benefits || '',
        selectionProcess: initialData.selectionProcess || '',
        consultantReview: initialData.consultantReview || '',
        status: initialData.status || 'draft',
        ...initialData
      })
    }
  }, [initialData])

  // 企業・店舗データが読み込まれた後に、initialDataがある場合は再設定
  useEffect(() => {
    if (!loadingData && Object.keys(initialData).length > 0) {
      console.log('JobForm: Re-setting initial data after data load:', initialData)
      const storeIds = initialData.storeIds || (initialData.storeId ? [initialData.storeId] : [])
      setFormData(prev => ({
        ...prev,
        companyId: initialData.companyId || prev.companyId,
        storeIds: storeIds,
      }))
    }
  }, [loadingData, initialData])

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      try {
        // 動的にFirestoreライブラリをインポート
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')
        
        // 企業一覧を取得
        const companiesQuery = query(
          collection(db, 'companies'),
          where('status', '==', 'active')
        )
        const companiesSnapshot = await getDocs(companiesQuery)
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Company))
        
        setCompanies(companiesData)

        // 店舗一覧を取得
        const storesQuery = query(
          collection(db, 'stores'),
          where('status', '==', 'active')
        )
        const storesSnapshot = await getDocs(storesQuery)
        const storesData = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Store))
        
        setStores(storesData)
      } catch (error) {
        console.error('データの取得に失敗しました:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  // 企業選択時に店舗をフィルタリング
  useEffect(() => {
    if (formData.companyId && formData.companyId !== '') {
      const companyStores = stores.filter(store => store.companyId === formData.companyId)
      setFilteredStores(companyStores)
    } else {
      setFilteredStores([])
    }
  }, [formData.companyId, stores])

  const handleChange = (field: keyof Job, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 雇用形態の複数選択を処理
  const handleEmploymentTypeChange = (employmentType: string, checked: boolean) => {
    const currentTypes = formData.employmentType ? formData.employmentType.split(',').map(t => t.trim()) : []
    
    let updatedTypes: string[]
    if (checked) {
      updatedTypes = [...currentTypes, employmentType]
    } else {
      updatedTypes = currentTypes.filter(type => type !== employmentType)
    }
    
    handleChange('employmentType', updatedTypes.join(', '))
  }

  // 雇用形態が選択されているかチェック
  const isEmploymentTypeSelected = (employmentType: string) => {
    if (!formData.employmentType) return false
    const currentTypes = formData.employmentType.split(',').map(t => t.trim())
    return currentTypes.includes(employmentType)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyId || !formData.title) {
      alert('企業と職種名は必須項目です')
      return
    }

    // undefined値を除去してFirestore用にクリーンアップ
    const cleanFormData = { ...formData }
    
    // undefined値を持つフィールドを除去
    Object.keys(cleanFormData).forEach(key => {
      const fieldKey = key as keyof Job
      if (cleanFormData[fieldKey] === undefined) {
        delete cleanFormData[fieldKey]
      }
    })

    await onSubmit(cleanFormData)
  }

  // フォーム項目の見出しをコピーする関数
  const handleCopyFieldLabels = async () => {
    const fieldLabels = `
求人情報入力項目:

【基本情報】
- 求人ステータス
- 企業
- 店舗
- 職種名
- 業種
- 雇用形態

【職務・スキル】
- 職務内容
- 求めるスキル

【勤務条件】
- 試用期間
- 勤務時間
- 休日・休暇
- 時間外労働

【給与情報】
- 給与（未経験）
- 給与（経験者）

【職場環境・福利厚生】
- 受動喫煙防止措置
- 加入保険
- 待遇・福利厚生

【選考・その他】
- 選考プロセス
- キャリア担当からの"正直な"感想
`.trim()

    try {
      await navigator.clipboard.writeText(fieldLabels)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('コピーに失敗しました:', err)
      alert('コピーに失敗しました')
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* フォーム項目コピーボタン */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">入力項目をコピー</h3>
              <p className="text-sm text-blue-700">
                全ての入力項目の見出しをコピーして、GPTなどのAIに求人情報の作成を依頼できます
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyFieldLabels}
              className="ml-4 bg-white hover:bg-blue-50 border-blue-300"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  項目をコピー
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>求人の基本的な情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="status">
              求人ステータス <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.status || 'draft'} 
              onValueChange={(value) => handleChange('status', value as Job['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="active">募集中</SelectItem>
                <SelectItem value="closed">募集終了</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="companyId">
                  企業 <span className="text-red-500">*</span>
                </Label>
                <Select 
                value={formData.companyId || ''} 
                onValueChange={(value) => {
                    handleChange('companyId', value)
                    // 企業変更時は店舗もリセット
                    handleChange('storeIds', [])
                }}
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
                <Label htmlFor="storeIds">店舗（複数選択可）</Label>
                <div className="space-y-2 mt-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {filteredStores.length === 0 ? (
                    <p className="text-sm text-gray-500">企業を選択すると店舗が表示されます</p>
                  ) : (
                    filteredStores.map((store) => (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={formData.storeIds?.includes(store.id) || false}
                          onCheckedChange={(checked) => {
                            const currentStoreIds = formData.storeIds || []
                            if (checked) {
                              handleChange('storeIds', [...currentStoreIds, store.id])
                            } else {
                              handleChange('storeIds', currentStoreIds.filter(id => id !== store.id))
                            }
                          }}
                        />
                        <Label htmlFor={`store-${store.id}`} className="text-sm font-normal cursor-pointer">
                          {store.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {formData.storeIds && formData.storeIds.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {formData.storeIds.length}店舗選択中
                  </p>
                )}
            </div>
        </div>

          <div>
            <Label htmlFor="title">
              職種名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="例: 寿司職人"
              required
            />
          </div>

          <div>
            <Label>雇用形態 (複数選択可)</Label>
            <div className="space-y-2 mt-2">
              {['正社員', '契約社員', 'アルバイト'].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`employment-${type}`}
                    checked={isEmploymentTypeSelected(type)}
                    onCheckedChange={(checked) => handleEmploymentTypeChange(type, checked as boolean)}
                  />
                  <Label htmlFor={`employment-${type}`} className="text-sm font-normal">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

 {/* 職務・スキル */}
      <Card>
        <CardHeader>
          <CardTitle>職務・スキル</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobDescription">職務内容</Label>
            <Textarea
              id="jobDescription"
              value={formData.jobDescription || ''}
              onChange={(e) => handleChange('jobDescription', e.target.value)}
              rows={6}
              placeholder="例: 寿司の握り、仕込み作業、接客対応"
            />
          </div>
          <div>
            <Label htmlFor="requiredSkills">求めるスキル</Label>
            <Textarea
              id="requiredSkills"
              value={formData.requiredSkills || ''}
              onChange={(e) => handleChange('requiredSkills', e.target.value)}
              rows={4}
              placeholder="例: 寿司作りの基本技術、接客経験"
            />
          </div>

          {/* 年齢制限（管理用・非公開） */}
          <div className="pt-4 border-t border-gray-200">
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-xs text-amber-800">
                ⚠️ 管理用項目（公開ページには表示されません）
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ageLimit">年齢上限</Label>
                <Input
                  id="ageLimit"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.ageLimit ?? ''}
                  onChange={(e) => handleChange('ageLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="例: 65"
                />
              </div>
              <div>
                <Label htmlFor="ageNote">年齢補足</Label>
                <Input
                  id="ageNote"
                  value={formData.ageNote || ''}
                  onChange={(e) => handleChange('ageNote', e.target.value)}
                  placeholder="例: 定年制のため"
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* 勤務条件 */}
      <Card>
        <CardHeader>
          <CardTitle>勤務条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="trialPeriod">試用期間</Label>
                <Input
                id="trialPeriod"
                value={formData.trialPeriod || ''}
                onChange={(e) => handleChange('trialPeriod', e.target.value)}
                placeholder="例: 3ヶ月"
                />
            </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="workingHours">勤務時間</Label>
                    <Textarea
                    id="workingHours"
                    value={formData.workingHours || ''}
                    onChange={(e) => handleChange('workingHours', e.target.value)}
                    rows={3}
                    placeholder="例: 10:00〜22:00（実働8時間、休憩2時間）"
                    />
                </div>

                <div>
                <Label htmlFor="holidays">休日・休暇</Label>
                <Textarea
                    id="holidays"
                    value={formData.holidays || ''}
                    onChange={(e) => handleChange('holidays', e.target.value)}
                    rows={3}
                    placeholder="例: 週休2日制、年間休日120日"
                />
                </div>
            </div>
          <div>
            <Label htmlFor="overtime">時間外労働</Label>
            <Textarea
              id="overtime"
              value={formData.overtime || ''}
              onChange={(e) => handleChange('overtime', e.target.value)}
              rows={2}
              placeholder="例: 月平均20時間程度"
            />
          </div>
        </CardContent>
      </Card>

      {/* 給与情報 */}
      <Card>
        <CardHeader>
          <CardTitle>給与情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="salaryInexperienced">給与（未経験）</Label>
            <Textarea
              id="salaryInexperienced"
              value={formData.salaryInexperienced || ''}
              onChange={(e) => handleChange('salaryInexperienced', e.target.value)}
              rows={3}
              placeholder="例: 月給25万円〜（昇給あり）"
            />
          </div>

          <div>
            <Label htmlFor="salaryExperienced">給与（経験者）</Label>
            <Textarea
              id="salaryExperienced"
              value={formData.salaryExperienced || ''}
              onChange={(e) => handleChange('salaryExperienced', e.target.value)}
              rows={3}
              placeholder="例: 月給30万円〜（経験・能力を考慮）"
            />
          </div>
        </CardContent>
      </Card>

      {/* 職場環境・福利厚生 */}
      <Card>
        <CardHeader>
          <CardTitle>職場環境・福利厚生</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="smokingPolicy">受動喫煙防止措置</Label>
            <Textarea
              id="smokingPolicy"
              value={formData.smokingPolicy || ''}
              onChange={(e) => handleChange('smokingPolicy', e.target.value)}
              rows={2}
              placeholder="例: 店内全面禁煙"
            />
          </div>

          <div>
            <Label htmlFor="insurance">加入保険</Label>
            <Textarea
              id="insurance"
              value={formData.insurance || ''}
              onChange={(e) => handleChange('insurance', e.target.value)}
              rows={2}
              placeholder="例: 社会保険完備（健康保険、厚生年金、雇用保険、労災保険）"
            />
          </div>

          <div>
            <Label htmlFor="benefits">待遇・福利厚生</Label>
            <Textarea
              id="benefits"
              value={formData.benefits || ''}
              onChange={(e) => handleChange('benefits', e.target.value)}
              rows={4}
              placeholder="例: 交通費支給、制服貸与、食事補助"
            />
          </div>
        </CardContent>
      </Card>

      {/* 選考・その他 */}
      <Card>
        <CardHeader>
          <CardTitle>選考・その他</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="selectionProcess">選考プロセス</Label>
            <Textarea
              id="selectionProcess"
              value={formData.selectionProcess || ''}
              onChange={(e) => handleChange('selectionProcess', e.target.value)}
              rows={4}
              placeholder="例: 書類選考 → 面接 → 実技試験"
            />
          </div>

          <div>
            <Label htmlFor="consultantReview">キャリア担当からの&quot;正直な&quot;感想</Label>
            <Textarea
              id="consultantReview"
              value={formData.consultantReview || ''}
              onChange={(e) => handleChange('consultantReview', e.target.value)}
              rows={4}
              placeholder="この求人についてのキャリア担当者からの率直な意見や感想"
            />
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
              {isEdit ? '求人を更新' : '求人を追加'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}