"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Loader2, Copy, Check, Search, Sparkles } from 'lucide-react'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { authenticatedPost } from '@/lib/api-client'

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
  const [storeSearchTerm, setStoreSearchTerm] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  
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
    recommendedPoints: '',
    consultantReview: '',
    status: 'draft',
    matchingData: {}
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
        recommendedPoints: initialData.recommendedPoints || '',
        consultantReview: initialData.consultantReview || '',
        status: initialData.status || 'draft',
        matchingData: initialData.matchingData || {},
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

  // 企業選択時に店舗をフィルタリング、検索、ソート、店舗規模を自動設定
  useEffect(() => {
    if (formData.companyId && formData.companyId !== '') {
      let companyStores = stores.filter(store => store.companyId === formData.companyId)
      
      // 店舗数から店舗規模を自動判定
      const storeCount = companyStores.length
      let storeScale: 'small' | 'medium' | 'large'
      if (storeCount <= 3) {
        storeScale = 'small'
      } else if (storeCount <= 10) {
        storeScale = 'medium'
      } else {
        storeScale = 'large'
      }
      
      // 店舗規模を自動設定（既存の値がない場合のみ）
      if (!formData.matchingData?.organization?.storeScale) {
        handleChange('matchingData.organization.storeScale', storeScale)
      }
      
      // 検索フィルタリング
      if (storeSearchTerm.trim() !== '') {
        const searchLower = storeSearchTerm.toLowerCase()
        companyStores = companyStores.filter(store => 
          store.name?.toLowerCase().includes(searchLower) ||
          store.address?.toLowerCase().includes(searchLower) ||
          store.prefecture?.toLowerCase().includes(searchLower)
        )
      }
      
      // 住所による昇順ソート
      companyStores.sort((a, b) => {
        const addressA = a.address || ''
        const addressB = b.address || ''
        return addressA.localeCompare(addressB, 'ja')
      })
      
      setFilteredStores(companyStores)
    } else {
      setFilteredStores([])
    }
  }, [formData.companyId, stores, storeSearchTerm])

  // 企業・店舗データから自動的にマッチングデータを設定
  useEffect(() => {
    if (!formData.companyId) return

    // 企業データから独立支援制度を取得
    const company = companies.find(c => c.id === formData.companyId)
    if (company?.hasIndependenceSupport && !formData.matchingData?.industry?.hasIndependenceSupport) {
      handleChange('matchingData.industry.hasIndependenceSupport', company.hasIndependenceSupport)
    }

    // 店舗データからミシュラン星数と修行期間を取得
    if (formData.storeIds && formData.storeIds.length > 0) {
      const selectedStores = stores.filter(store => formData.storeIds?.includes(store.id))
      
      // ミシュラン星数（最も高い星数を採用）
      const maxMichelinStars = Math.max(
        ...selectedStores.map(store => store.tags?.michelinStars || 0),
        0
      )
      if (maxMichelinStars > 0 && !formData.matchingData?.industry?.michelinStars) {
        handleChange('matchingData.industry.michelinStars', maxMichelinStars)
      }

      // 修行期間（握れるまでの期間を月数に変換）
      const trainingPeriods = selectedStores
        .map(store => store.trainingPeriod)
        .filter((period): period is string => !!period && period.trim() !== '')
      
      if (trainingPeriods.length > 0 && !formData.matchingData?.industry?.trainingPeriodMonths) {
        // "3ヶ月"、"半年"、"1年"などの文字列を月数に変換
        const firstPeriod = trainingPeriods[0]
        let months = 0
        
        if (firstPeriod && firstPeriod.includes('年')) {
          const yearMatch = firstPeriod.match(/(\d+)年/)
          if (yearMatch) months = parseInt(yearMatch[1]) * 12
        } else if (firstPeriod && firstPeriod.includes('半年')) {
          months = 6
        } else if (firstPeriod && (firstPeriod.includes('ヶ月') || firstPeriod.includes('ヵ月') || firstPeriod.includes('か月'))) {
          const monthMatch = firstPeriod.match(/(\d+)[ヶヵか]月/)
          if (monthMatch) months = parseInt(monthMatch[1])
        }
        
        if (months > 0) {
          handleChange('matchingData.industry.trainingPeriodMonths', months)
        }
      }
    }
  }, [formData.companyId, formData.storeIds, companies, stores])

  const handleChange = (field: keyof Job | string, value: any) => {
    // ネストされたプロパティ（例: 'matchingData.income.firstYearMin'）に対応
    if (field.includes('.')) {
      const keys = field.split('.')
      setFormData(prev => {
        const updated = { ...prev }
        let current: any = updated
        
        // ネストされた各レベルを作成
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i]
          if (!current[key]) {
            current[key] = {}
          } else {
            current[key] = { ...current[key] }
          }
          current = current[key]
        }
        
        // 最後のキーに値を設定
        current[keys[keys.length - 1]] = value
        
        return updated
      })
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
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
- おすすめポイント
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

  // AIで求人情報を自動生成する関数
  const handleGenerateWithAI = async () => {
    // 企業と店舗が選択されているかチェック
    if (!formData.companyId || !formData.storeIds || formData.storeIds.length === 0) {
      alert('企業と店舗を先に選択してください')
      return
    }

    setGeneratingAI(true)
    try {
      // 選択された企業と店舗の情報を取得
      const selectedCompany = companies.find(c => c.id === formData.companyId)
      const selectedStore = stores.find(s => s.id === formData.storeIds?.[0])

      if (!selectedCompany || !selectedStore) {
        alert('企業または店舗の情報が見つかりません')
        return
      }

      // AI APIを呼び出し（認証付き）
      const aiData = await authenticatedPost('/api/ai/generate-job', {
        companyName: selectedCompany.name,
        storeName: selectedStore.name,
        storeAddress: selectedStore.address,
        businessType: selectedStore.businessType || formData.businessType,
      })

      if (!aiData) {
        throw new Error('AI生成に失敗しました')
      }

      // 生成されたデータをフォームに反映（既存のデータは上書きしない）
      setFormData(prev => ({
        ...prev,
        ...(aiData.title && !prev.title && { title: aiData.title }),
        ...(aiData.jobDescription && !prev.jobDescription && { jobDescription: aiData.jobDescription }),
        ...(aiData.requiredSkills && !prev.requiredSkills && { requiredSkills: aiData.requiredSkills }),
        ...(aiData.trialPeriod && !prev.trialPeriod && { trialPeriod: aiData.trialPeriod }),
        ...(aiData.workingHours && !prev.workingHours && { workingHours: aiData.workingHours }),
        ...(aiData.holidays && !prev.holidays && { holidays: aiData.holidays }),
        ...(aiData.overtime && !prev.overtime && { overtime: aiData.overtime }),
        ...(aiData.salaryInexperienced && !prev.salaryInexperienced && { salaryInexperienced: aiData.salaryInexperienced }),
        ...(aiData.salaryExperienced && !prev.salaryExperienced && { salaryExperienced: aiData.salaryExperienced }),
        ...(aiData.smokingPolicy && !prev.smokingPolicy && { smokingPolicy: aiData.smokingPolicy }),
        ...(aiData.insurance && !prev.insurance && { insurance: aiData.insurance }),
        ...(aiData.benefits && !prev.benefits && { benefits: aiData.benefits }),
        ...(aiData.selectionProcess && !prev.selectionProcess && { selectionProcess: aiData.selectionProcess }),
        ...(aiData.recommendedPoints && !prev.recommendedPoints && { recommendedPoints: aiData.recommendedPoints }),
        ...(aiData.consultantReview && !prev.consultantReview && { consultantReview: aiData.consultantReview }),
        // matchingDataも反映
        ...(aiData.matchingData && {
          matchingData: {
            workLifeBalance: {
              ...prev.matchingData?.workLifeBalance,
              ...(aiData.matchingData.workLifeBalance?.monthlyScheduledHours && !prev.matchingData?.workLifeBalance?.monthlyScheduledHours && { monthlyScheduledHours: aiData.matchingData.workLifeBalance.monthlyScheduledHours }),
              ...(aiData.matchingData.workLifeBalance?.monthlyActualWorkHours && !prev.matchingData?.workLifeBalance?.monthlyActualWorkHours && { monthlyActualWorkHours: aiData.matchingData.workLifeBalance.monthlyActualWorkHours }),
              ...(aiData.matchingData.workLifeBalance?.averageOvertimeHours && !prev.matchingData?.workLifeBalance?.averageOvertimeHours && { averageOvertimeHours: aiData.matchingData.workLifeBalance.averageOvertimeHours }),
              ...(aiData.matchingData.workLifeBalance?.weekendWorkFrequency && !prev.matchingData?.workLifeBalance?.weekendWorkFrequency && { weekendWorkFrequency: aiData.matchingData.workLifeBalance.weekendWorkFrequency }),
              ...(aiData.matchingData.workLifeBalance?.holidaysPerMonth && !prev.matchingData?.workLifeBalance?.holidaysPerMonth && { holidaysPerMonth: aiData.matchingData.workLifeBalance.holidaysPerMonth }),
            },
            income: {
              ...prev.matchingData?.income,
              ...(aiData.matchingData.income?.firstYearMin && !prev.matchingData?.income?.firstYearMin && { firstYearMin: aiData.matchingData.income.firstYearMin }),
              ...(aiData.matchingData.income?.firstYearMax && !prev.matchingData?.income?.firstYearMax && { firstYearMax: aiData.matchingData.income.firstYearMax }),
              ...(aiData.matchingData.income?.firstYearAverage && !prev.matchingData?.income?.firstYearAverage && { firstYearAverage: aiData.matchingData.income.firstYearAverage }),
              ...(aiData.matchingData.income?.thirdYearExpected && !prev.matchingData?.income?.thirdYearExpected && { thirdYearExpected: aiData.matchingData.income.thirdYearExpected }),
            },
            organization: {
              ...prev.matchingData?.organization,
              ...(aiData.matchingData.organization?.teamSize && !prev.matchingData?.organization?.teamSize && { teamSize: aiData.matchingData.organization.teamSize }),
              ...(aiData.matchingData.organization?.averageAge && !prev.matchingData?.organization?.averageAge && { averageAge: aiData.matchingData.organization.averageAge }),
              ...(aiData.matchingData.organization?.storeScale && !prev.matchingData?.organization?.storeScale && { storeScale: aiData.matchingData.organization.storeScale }),
            },
            industry: {
              ...prev.matchingData?.industry,
              ...(aiData.matchingData.industry?.trainingPeriodMonths && !prev.matchingData?.industry?.trainingPeriodMonths && { trainingPeriodMonths: aiData.matchingData.industry.trainingPeriodMonths }),
              ...(aiData.matchingData.industry?.hasIndependenceSupport !== undefined && prev.matchingData?.industry?.hasIndependenceSupport === undefined && { hasIndependenceSupport: aiData.matchingData.industry.hasIndependenceSupport }),
              ...(aiData.matchingData.industry?.michelinStars !== undefined && !prev.matchingData?.industry?.michelinStars && { michelinStars: aiData.matchingData.industry.michelinStars }),
            },
          },
        }),
      }))

      alert('✅ AIで求人情報を生成しました！\n\n既に入力されている項目は上書きされません。')
    } catch (error: any) {
      console.error('AI生成エラー:', error)
      alert(`❌ エラー: ${error.message}`)
    } finally {
      setGeneratingAI(false)
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
      {/* AI生成中の表示 */}
      {generatingAI && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="font-semibold">AIで求人情報を生成中...</span>
          </div>
        </div>
      )}

      {/* AI自動生成・フォーム項目コピーボタン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI自動生成ボタン */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">AIで自動生成</h3>
                <p className="text-sm text-purple-700">
                  企業と店舗情報からAIが求人情報を自動生成します
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateWithAI}
                disabled={generatingAI || !formData.companyId || !formData.storeIds || formData.storeIds.length === 0}
                className="ml-4 bg-white hover:bg-purple-50 border-purple-300"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI生成
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
      </div>

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
                
                {/* 店舗検索 */}
                {formData.companyId && formData.companyId !== '' && (
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="店舗名、住所で検索..."
                      value={storeSearchTerm}
                      onChange={(e) => setStoreSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
                
                <div className="space-y-2 mt-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {filteredStores.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {formData.companyId && formData.companyId !== '' 
                        ? (storeSearchTerm ? '検索条件に一致する店舗がありません' : '企業を選択すると店舗が表示されます')
                        : '企業を選択すると店舗が表示されます'}
                    </p>
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
                          {store.address && (
                            <span className="ml-2 text-xs text-gray-500">({store.address})</span>
                          )}
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
            <Label htmlFor="recommendedPoints">おすすめポイント</Label>
            <Textarea
              id="recommendedPoints"
              value={formData.recommendedPoints || ''}
              onChange={(e) => handleChange('recommendedPoints', e.target.value)}
              rows={4}
              placeholder="この求人の魅力やおすすめポイントを記入してください"
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

      {/* キャリア診断マッチング用データ */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="text-purple-800">キャリア診断マッチング用データ（任意）</CardTitle>
          <CardDescription>
            求職者の診断結果とマッチングするためのデータを入力してください。すべて任意項目です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ワークライフバランス関連 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-purple-900 border-b border-purple-200 pb-2">
              ワークライフバランス関連
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyScheduledHours">月間拘束時間（時間）</Label>
                <Input
                  id="monthlyScheduledHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.monthlyScheduledHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.monthlyScheduledHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 200"
                />
              </div>
              
              <div>
                <Label htmlFor="monthlyActualWorkHours">月間実働時間（時間）</Label>
                <Input
                  id="monthlyActualWorkHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.monthlyActualWorkHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.monthlyActualWorkHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 180"
                />
              </div>
              
              <div>
                <Label htmlFor="averageOvertimeHours">平均残業時間（月/時間）</Label>
                <Input
                  id="averageOvertimeHours"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.averageOvertimeHours || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.averageOvertimeHours', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 20"
                />
              </div>
              
              <div>
                <Label htmlFor="holidaysPerMonth">月間休日数（日）</Label>
                <Input
                  id="holidaysPerMonth"
                  type="number"
                  value={formData.matchingData?.workLifeBalance?.holidaysPerMonth || ''}
                  onChange={(e) => handleChange('matchingData.workLifeBalance.holidaysPerMonth', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 8"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="weekendWorkFrequency">休日出勤頻度</Label>
                <Select
                  value={formData.matchingData?.workLifeBalance?.weekendWorkFrequency || ''}
                  onValueChange={(value) => handleChange('matchingData.workLifeBalance.weekendWorkFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="休日出勤の頻度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    <SelectItem value="rare">稀に（年数回）</SelectItem>
                    <SelectItem value="monthly">月1-2回</SelectItem>
                    <SelectItem value="weekly">毎週</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 収入関連 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-purple-900 border-b border-purple-200 pb-2">
              収入関連
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstYearMin">初年度想定年収・最低（万円）</Label>
                <Input
                  id="firstYearMin"
                  type="number"
                  value={formData.matchingData?.income?.firstYearMin || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 300"
                />
              </div>
              
              <div>
                <Label htmlFor="firstYearMax">初年度想定年収・最高（万円）</Label>
                <Input
                  id="firstYearMax"
                  type="number"
                  value={formData.matchingData?.income?.firstYearMax || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 400"
                />
              </div>
              
              <div>
                <Label htmlFor="firstYearAverage">初年度想定年収・平均（万円）</Label>
                <Input
                  id="firstYearAverage"
                  type="number"
                  value={formData.matchingData?.income?.firstYearAverage || ''}
                  onChange={(e) => handleChange('matchingData.income.firstYearAverage', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 350"
                />
              </div>
              
              <div>
                <Label htmlFor="thirdYearExpected">3年目想定年収（万円）</Label>
                <Input
                  id="thirdYearExpected"
                  type="number"
                  value={formData.matchingData?.income?.thirdYearExpected || ''}
                  onChange={(e) => handleChange('matchingData.income.thirdYearExpected', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 450"
                />
              </div>
            </div>
          </div>

          {/* 組織・チーム関連 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-purple-900 border-b border-purple-200 pb-2">
              組織・チーム関連
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamSize">チームサイズ（人数）</Label>
                <Input
                  id="teamSize"
                  type="number"
                  value={formData.matchingData?.organization?.teamSize || ''}
                  onChange={(e) => handleChange('matchingData.organization.teamSize', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 5"
                />
              </div>
              
              <div>
                <Label htmlFor="averageAge">平均年齢（歳）</Label>
                <Input
                  id="averageAge"
                  type="number"
                  value={formData.matchingData?.organization?.averageAge || ''}
                  onChange={(e) => handleChange('matchingData.organization.averageAge', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="例: 30"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="storeScale">店舗規模（企業の店舗数に基づく）</Label>
                <Select
                  value={formData.matchingData?.organization?.storeScale || ''}
                  onValueChange={(value) => handleChange('matchingData.organization.storeScale', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="店舗の規模を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">小規模（1-3店舗）</SelectItem>
                    <SelectItem value="medium">中規模（4-10店舗）</SelectItem>
                    <SelectItem value="large">大規模（11店舗以上）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  ※企業選択時に自動設定されます
                </p>
              </div>
            </div>
          </div>

          {/* 飲食業界特有 */}
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
                <Checkbox
                  id="hasIndependenceSupport"
                  checked={formData.matchingData?.industry?.hasIndependenceSupport || false}
                  onCheckedChange={(checked) => handleChange('matchingData.industry.hasIndependenceSupport', checked)}
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