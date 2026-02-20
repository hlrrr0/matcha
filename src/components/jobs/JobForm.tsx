"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { Job, visibilityTypeLabels } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import StoreSelectionSection from './StoreSelectionSection'
import EmploymentTypeSelector from './EmploymentTypeSelector'
import AIGenerationSection from './AIGenerationSection'
import { JobFormProps, FormData } from './JobFormTypes'
import { DEFAULT_FORM_DATA } from './JobFormConstants'
import { setNestedProperty, calculateStoreScale, parseTrainingPeriodToMonths } from './JobFormUtils'

export default function JobForm({ 
  initialData = {}, 
  onSubmit, 
  isEdit = false,
  loading = false 
}: JobFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA as FormData)

  // 初期データをセット
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      const storeIds = initialData.storeIds || (initialData.storeId ? [initialData.storeId] : [])
      setFormData({
        companyId: initialData.companyId || '',
        storeIds: storeIds,
        mainStoreIds: initialData.mainStoreIds || [],
        visibilityType: initialData.visibilityType || 'all',
        allowedSources: initialData.allowedSources || [],
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
        recommendedPoints: initialData.recommendedPoints || '',
        consultantReview: initialData.consultantReview || '',
        status: initialData.status || 'draft',
        matchingData: initialData.matchingData || {},
        ...initialData
      } as FormData)
    }
  }, [initialData])

  // Firestoreからデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')
        
        const [companiesSnapshot, storesSnapshot, jobsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'companies'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'stores'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'jobs'), where('status', '==', 'active')))
        ])

        setCompanies(companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)))
        setStores(storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store)))
        setJobs(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)))
      } catch (error) {
        console.error('データ読み込みエラー:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  // 企業・店舗データから自動的にマッチングデータを設定
  useEffect(() => {
    if (!formData.companyId || !formData.storeIds?.length) return

    const company = companies.find(c => c.id === formData.companyId)
    if (company?.hasIndependenceSupport && !formData.matchingData?.industry?.hasIndependenceSupport) {
      handleChange('matchingData.industry.hasIndependenceSupport', company.hasIndependenceSupport)
    }

    const selectedStores = stores.filter(store => formData.storeIds?.includes(store.id))
    const maxMichelinStars = Math.max(...selectedStores.map(store => store.tags?.michelinStars || 0), 0)
    if (maxMichelinStars > 0 && !formData.matchingData?.industry?.michelinStars) {
      handleChange('matchingData.industry.michelinStars', maxMichelinStars)
    }

    const trainingPeriods = selectedStores
      .map(store => store.trainingPeriod)
      .filter((period): period is string => !!period?.trim())
    
    if (trainingPeriods.length > 0 && !formData.matchingData?.industry?.trainingPeriodMonths) {
      const months = parseTrainingPeriodToMonths(trainingPeriods[0])
      if (months > 0) {
        handleChange('matchingData.industry.trainingPeriodMonths', months)
      }
    }
  }, [formData.companyId, formData.storeIds, companies, stores])

  // 企業選択時に店舗規模を自動設定
  useEffect(() => {
    if (!formData.companyId || formData.matchingData?.organization?.storeScale) return
    
    const companyStores = stores.filter(store => store.companyId === formData.companyId)
    const storeScale = calculateStoreScale(companyStores.length)
    handleChange('matchingData.organization.storeScale', storeScale)
  }, [formData.companyId, stores, formData.matchingData?.organization?.storeScale])

  // ネストされたプロパティを処理するハンドラー
  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        return setNestedProperty(prev, field, value) as FormData
      }
      return { ...prev, [field]: value } as FormData
    })
  }

  const handleStoreSelect = (storeIds: string[]) => {
    handleChange('storeIds', storeIds)
  }

  const handleMainStoreSelect = (mainStoreIds: string[]) => {
    handleChange('mainStoreIds', mainStoreIds)
  }

  const handleAIDataGenerated = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
    setGeneratingAI(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyId || !formData.title) {
      alert('企業と職種名は必須項目です')
      return
    }

    await onSubmit(formData)
  }

  // ⌘+S / Ctrl+S でフォーム保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!loading) {
          const form = document.querySelector('form')
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading])

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
      {/* AI生成セクション */}
      <AIGenerationSection
        formData={formData}
        companies={companies}
        stores={stores}
        onDataGenerated={handleAIDataGenerated}
        isGenerating={generatingAI}
      />

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
          
          {/* 公開範囲設定 */}
          <div>
            <Label htmlFor="visibilityType">
              公開範囲 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.visibilityType || 'all'} 
              onValueChange={(value) => handleChange('visibilityType', value as Job['visibilityType'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全体公開</SelectItem>
                <SelectItem value="school_only">🎓 飲食人大学限定</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* フラグ設定 */}
          <div>
            <Label>求人フラグ</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="flag-highDemand"
                  checked={formData.flags?.highDemand || false}
                  onChange={(e) => handleChange('flags', {
                    ...formData.flags,
                    highDemand: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="flag-highDemand" className="cursor-pointer font-normal">
                  🔥ニーズ高
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="flag-provenTrack"
                  checked={formData.flags?.provenTrack || false}
                  onChange={(e) => handleChange('flags', {
                    ...formData.flags,
                    provenTrack: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="flag-provenTrack" className="cursor-pointer font-normal">
                  🎉実績あり
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="flag-weakRelationship"
                  checked={formData.flags?.weakRelationship || false}
                  onChange={(e) => handleChange('flags', {
                    ...formData.flags,
                    weakRelationship: e.target.checked
                  })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="flag-weakRelationship" className="cursor-pointer font-normal">
                  💧関係薄め
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="companyId">
              企業 <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.companyId || ''} 
              onValueChange={(value) => {
                handleChange('companyId', value)
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
        </CardContent>
      </Card>

      {/* 店舗選択 */}
      <StoreSelectionSection
        companyId={formData.companyId}
        stores={stores}
        jobs={jobs}
        selectedStoreIds={formData.storeIds || []}
        mainStoreIds={formData.mainStoreIds || []}
        onStoreSelect={handleStoreSelect}
        onMainStoreSelect={handleMainStoreSelect}
      />

      {/* 職種・雇用形態 */}
      <Card>
        <CardHeader>
          <CardTitle>職種・雇用形態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <EmploymentTypeSelector
            value={formData.employmentType || ''}
            onChange={(value) => handleChange('employmentType', value)}
          />
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
              <Label htmlFor="businessType">業種</Label>
              <Input
                id="businessType"
                value={formData.businessType || ''}
                onChange={(e) => handleChange('businessType', e.target.value)}
                placeholder="例: 日本料理"
              />
            </div>
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
                placeholder="例: 11:00〜20:00（休憩1時間）"
              />
            </div>
            <div>
              <Label htmlFor="holidays">休日・休暇</Label>
              <Textarea
                id="holidays"
                value={formData.holidays || ''}
                onChange={(e) => handleChange('holidays', e.target.value)}
                rows={3}
                placeholder="例: 週2日制、年間休日110日"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="overtime">時間外労働</Label>
            <Textarea
              id="overtime"
              value={formData.overtime || ''}
              onChange={(e) => handleChange('overtime', e.target.value)}
              rows={3}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salaryInexperienced">給与（未経験）</Label>
              <Input
                id="salaryInexperienced"
                value={formData.salaryInexperienced || ''}
                onChange={(e) => handleChange('salaryInexperienced', e.target.value)}
                placeholder="例: 月給25万円"
              />
            </div>
            <div>
              <Label htmlFor="salaryExperienced">給与（経験者）</Label>
              <Input
                id="salaryExperienced"
                value={formData.salaryExperienced || ''}
                onChange={(e) => handleChange('salaryExperienced', e.target.value)}
                placeholder="例: 月給30万円～"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 職場環境・福利厚生 */}
      <Card>
        <CardHeader>
          <CardTitle>職場環境・福利厚生</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smokingPolicy">受動喫煙防止措置</Label>
              <Input
                id="smokingPolicy"
                value={formData.smokingPolicy || ''}
                onChange={(e) => handleChange('smokingPolicy', e.target.value)}
                placeholder="例: 店舗内禁煙"
              />
            </div>
            <div>
              <Label htmlFor="insurance">加入保険</Label>
              <Input
                id="insurance"
                value={formData.insurance || ''}
                onChange={(e) => handleChange('insurance', e.target.value)}
                placeholder="例: 雇用保険、健康保険"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="benefits">待遇・福利厚生</Label>
            <Textarea
              id="benefits"
              value={formData.benefits || ''}
              onChange={(e) => handleChange('benefits', e.target.value)}
              rows={4}
              placeholder="例: 社員割引、制服支給、研修制度"
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
              placeholder="例: 書類選考→1次面接→2次面接"
            />
          </div>

          <div>
            <Label htmlFor="recommendedPoints">おすすめポイント</Label>
            <Textarea
              id="recommendedPoints"
              value={formData.recommendedPoints || ''}
              onChange={(e) => handleChange('recommendedPoints', e.target.value)}
              rows={4}
              placeholder="例: 業界屈指の実績"
            />
          </div>

          <div>
            <Label htmlFor="consultantReview">キャリア担当からの"正直な"感想</Label>
            <Textarea
              id="consultantReview"
              value={formData.consultantReview || ''}
              onChange={(e) => handleChange('consultantReview', e.target.value)}
              rows={4}
              placeholder="例: ここは本当に素晴らしい環境です"
            />
          </div>
        </CardContent>
      </Card>

      {/* マッチングデータ */}
      <Card>
        <CardHeader>
          <CardTitle>マッチングデータ（AI対応）</CardTitle>
          <CardDescription>AIが自動填入する求人特性データです</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ワークライフバランス */}
          <div className="space-y-4 border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-sm">ワークライフバランス</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyScheduledHours">月間公式勤務時間</Label>
                <Input
                  id="monthlyScheduledHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.monthlyScheduledHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.monthlyScheduledHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 160"
                />
              </div>
              <div>
                <Label htmlFor="monthlyActualWorkHours">月間実勤務時間</Label>
                <Input
                  id="monthlyActualWorkHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.monthlyActualWorkHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.monthlyActualWorkHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 180"
                />
              </div>
              <div>
                <Label htmlFor="averageOvertimeHours">月間平均時間外労働</Label>
                <Input
                  id="averageOvertimeHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.averageOvertimeHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.averageOvertimeHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 20"
                />
              </div>
              <div>
                <Label htmlFor="weekendWorkFrequency">週末出勤頻度</Label>
                <Input
                  id="weekendWorkFrequency"
                  value={formData.matchingData?.workLifeBalance?.weekendWorkFrequency || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.weekendWorkFrequency', e.target.value)}
                  placeholder="例: 週1回程度"
                />
              </div>
              <div>
                <Label htmlFor="holidaysPerMonth">月間休日数</Label>
                <Input
                  id="holidaysPerMonth"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.holidaysPerMonth || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.holidaysPerMonth', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 8"
                />
              </div>
            </div>
          </div>

          {/* 所属組織 */}
          <div className="space-y-4 border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-sm">所属組織</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamSize">チームサイズ</Label>
                <Input
                  id="teamSize"
                  type="number"
                  value={formData.matchingData?.organization?.teamSize || ''}
                  onChange={(e) => handleChange('matchingData.organization.teamSize', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 5"
                />
              </div>
              <div>
                <Label htmlFor="averageAge">平均年齢</Label>
                <Input
                  id="averageAge"
                  type="number"
                  value={formData.matchingData?.organization?.averageAge || ''}
                  onChange={(e) => handleChange('matchingData.organization.averageAge', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 35"
                />
              </div>
              <div>
                <Label htmlFor="storeScale">店舗規模</Label>
                <Select
                  value={formData.matchingData?.organization?.storeScale || ''}
                  onValueChange={(value) => handleChange('matchingData.organization.storeScale', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">小規模 (1-3店舗)</SelectItem>
                    <SelectItem value="medium">中規模 (4-10店舗)</SelectItem>
                    <SelectItem value="large">大規模 (11+店舗)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 収入 */}
          <div className="space-y-4 border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-sm">収入</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstYearMin">初年度最低想定年収</Label>
                <Input
                  id="firstYearMin"
                  type="number"
                  value={formData.matchingData?.income?.firstYearMin || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 3000000"
                />
              </div>
              <div>
                <Label htmlFor="firstYearMax">初年度最高想定年収</Label>
                <Input
                  id="firstYearMax"
                  type="number"
                  value={formData.matchingData?.income?.firstYearMax || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 3500000"
                />
              </div>
              <div>
                <Label htmlFor="firstYearAverage">初年度平均年収</Label>
                <Input
                  id="firstYearAverage"
                  type="number"
                  value={formData.matchingData?.income?.firstYearAverage || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearAverage', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 3250000"
                />
              </div>
              <div>
                <Label htmlFor="thirdYearExpected">3年目想定年収</Label>
                <Input
                  id="thirdYearExpected"
                  type="number"
                  value={formData.matchingData?.income?.thirdYearExpected || ''}
                  onChange={(e) => handleChange('matchingData.income.thirdYearExpected', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 4000000"
                />
              </div>
            </div>
          </div>

          {/* 業界特有 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-purple-900 border-b border-purple-200 pb-2">
              飲食業界特有
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trainingPeriodMonths">一人前になるまでの期間（月）</Label>
                <Input
                  id="trainingPeriodMonths"
                  type="number"
                  value={formData.matchingData?.industry?.trainingPeriodMonths || ''}
                  onChange={(e) => handleChange('matchingData.industry.trainingPeriodMonths', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ※店舗の「握れるまでの期間」から自動設定されます
                </p>
              </div>
              
              <div>
                <Label htmlFor="michelinStars">ミシュラン星数</Label>
                <Input
                  id="michelinStars"
                  type="number"
                  min="0"
                  max="3"
                  value={formData.matchingData?.industry?.michelinStars || ''}
                  onChange={(e) => handleChange('matchingData.industry.michelinStars', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ※店舗タグから自動設定されます
                </p>
              </div>
              
              <div className="md:col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasIndependenceSupport"
                  checked={formData.matchingData?.industry?.hasIndependenceSupport || false}
                  onChange={(e) => handleChange('matchingData.industry.hasIndependenceSupport', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="hasIndependenceSupport" className="cursor-pointer">
                  独立支援制度あり
                </Label>
                <span className="text-xs text-gray-500 ml-2">
                  ※企業の「独立支援の有無」から自動設定されます
                </span>
              </div>
            </div>
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
