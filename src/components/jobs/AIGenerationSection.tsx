import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { Company } from '@/types/company'
import { Store } from '@/types/store'
import { FormData } from './JobFormTypes'
import { FIELD_LABELS } from './JobFormConstants'
import { authenticatedPost } from '@/lib/firebase/auth'

interface AIGenerationSectionProps {
  formData: FormData
  companies: Company[]
  stores: Store[]
  onDataGenerated: (data: Partial<FormData>) => void
  isGenerating: boolean
}

const AIGenerationSection = ({
  formData,
  companies,
  stores,
  onDataGenerated,
  isGenerating,
}: AIGenerationSectionProps) => {
  const [copied, setCopied] = useState(false)

  const handleGenerateWithAI = async () => {
    try {
      if (!formData.companyId || !formData.storeIds || formData.storeIds.length === 0) {
        alert('企業と店舗を選択してください')
        return
      }

      const selectedCompany = companies.find(c => c.id === formData.companyId)
      const selectedStore = stores.find(s => s.id === formData.storeIds?.[0])

      if (!selectedCompany || !selectedStore) {
        throw new Error('企業または店舗が見つかりません')
      }

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
      const generatedData = {
        ...(aiData.title && !formData.title && { title: aiData.title }),
        ...(aiData.jobDescription && !formData.jobDescription && { jobDescription: aiData.jobDescription }),
        ...(aiData.requiredSkills && !formData.requiredSkills && { requiredSkills: aiData.requiredSkills }),
        ...(aiData.trialPeriod && !formData.trialPeriod && { trialPeriod: aiData.trialPeriod }),
        ...(aiData.workingHours && !formData.workingHours && { workingHours: aiData.workingHours }),
        ...(aiData.holidays && !formData.holidays && { holidays: aiData.holidays }),
        ...(aiData.overtime && !formData.overtime && { overtime: aiData.overtime }),
        ...(aiData.salaryInexperienced && !formData.salaryInexperienced && { salaryInexperienced: aiData.salaryInexperienced }),
        ...(aiData.salaryExperienced && !formData.salaryExperienced && { salaryExperienced: aiData.salaryExperienced }),
        ...(aiData.smokingPolicy && !formData.smokingPolicy && { smokingPolicy: aiData.smokingPolicy }),
        ...(aiData.insurance && !formData.insurance && { insurance: aiData.insurance }),
        ...(aiData.benefits && !formData.benefits && { benefits: aiData.benefits }),
        ...(aiData.selectionProcess && !formData.selectionProcess && { selectionProcess: aiData.selectionProcess }),
        ...(aiData.recommendedPoints && !formData.recommendedPoints && { recommendedPoints: aiData.recommendedPoints }),
        ...(aiData.consultantReview && !formData.consultantReview && { consultantReview: aiData.consultantReview }),
        // matchingDataも反映
        ...(aiData.matchingData && {
          matchingData: {
            workLifeBalance: {
              ...formData.matchingData?.workLifeBalance,
              ...(aiData.matchingData.workLifeBalance?.monthlyScheduledHours && !formData.matchingData?.workLifeBalance?.monthlyScheduledHours && { monthlyScheduledHours: aiData.matchingData.workLifeBalance.monthlyScheduledHours }),
              ...(aiData.matchingData.workLifeBalance?.monthlyActualWorkHours && !formData.matchingData?.workLifeBalance?.monthlyActualWorkHours && { monthlyActualWorkHours: aiData.matchingData.workLifeBalance.monthlyActualWorkHours }),
              ...(aiData.matchingData.workLifeBalance?.averageOvertimeHours && !formData.matchingData?.workLifeBalance?.averageOvertimeHours && { averageOvertimeHours: aiData.matchingData.workLifeBalance.averageOvertimeHours }),
              ...(aiData.matchingData.workLifeBalance?.weekendWorkFrequency && !formData.matchingData?.workLifeBalance?.weekendWorkFrequency && { weekendWorkFrequency: aiData.matchingData.workLifeBalance.weekendWorkFrequency }),
              ...(aiData.matchingData.workLifeBalance?.holidaysPerMonth && !formData.matchingData?.workLifeBalance?.holidaysPerMonth && { holidaysPerMonth: aiData.matchingData.workLifeBalance.holidaysPerMonth }),
            },
            income: {
              ...formData.matchingData?.income,
              ...(aiData.matchingData.income?.firstYearMin && !formData.matchingData?.income?.firstYearMin && { firstYearMin: aiData.matchingData.income.firstYearMin }),
              ...(aiData.matchingData.income?.firstYearMax && !formData.matchingData?.income?.firstYearMax && { firstYearMax: aiData.matchingData.income.firstYearMax }),
              ...(aiData.matchingData.income?.firstYearAverage && !formData.matchingData?.income?.firstYearAverage && { firstYearAverage: aiData.matchingData.income.firstYearAverage }),
              ...(aiData.matchingData.income?.thirdYearExpected && !formData.matchingData?.income?.thirdYearExpected && { thirdYearExpected: aiData.matchingData.income.thirdYearExpected }),
            },
            organization: {
              ...formData.matchingData?.organization,
              ...(aiData.matchingData.organization?.teamSize && !formData.matchingData?.organization?.teamSize && { teamSize: aiData.matchingData.organization.teamSize }),
              ...(aiData.matchingData.organization?.averageAge && !formData.matchingData?.organization?.averageAge && { averageAge: aiData.matchingData.organization.averageAge }),
              ...(aiData.matchingData.organization?.storeScale && !formData.matchingData?.organization?.storeScale && { storeScale: aiData.matchingData.organization.storeScale }),
            },
            industry: {
              ...formData.matchingData?.industry,
              ...(aiData.matchingData.industry?.trainingPeriodMonths && !formData.matchingData?.industry?.trainingPeriodMonths && { trainingPeriodMonths: aiData.matchingData.industry.trainingPeriodMonths }),
              ...(aiData.matchingData.industry?.hasIndependenceSupport !== undefined && formData.matchingData?.industry?.hasIndependenceSupport === undefined && { hasIndependenceSupport: aiData.matchingData.industry.hasIndependenceSupport }),
              ...(aiData.matchingData.industry?.michelinStars !== undefined && !formData.matchingData?.industry?.michelinStars && { michelinStars: aiData.matchingData.industry.michelinStars }),
            },
          },
        }),
      }

      onDataGenerated(generatedData as Partial<FormData>)
      alert('✅ AIで求人情報を生成しました！\n\n既に入力されている項目は上書きされません。')
    } catch (error: any) {
      console.error('AI生成エラー:', error)
      alert(`❌ エラー: ${error.message}`)
    }
  }

  const handleCopyFieldLabels = async () => {
    try {
      const textToCopy = Object.entries(FIELD_LABELS)
        .map(([key, value]) => `${value}:`)
        .join('\n')

      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('コピーエラー:', error)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  return (
    <>
      {/* AI生成中の表示 */}
      {isGenerating && (
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
                disabled={isGenerating || !formData.companyId || !formData.storeIds || formData.storeIds.length === 0}
                className="ml-4 bg-white hover:bg-purple-50 border-purple-300"
              >
                {isGenerating ? (
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
    </>
  )
}

export default AIGenerationSection
