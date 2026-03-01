"use client"

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { createJob } from '@/lib/firestore/jobs'
import { Job } from '@/types/job'
import JobForm from '@/components/jobs/JobForm'

function NewJobPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [initialData, setInitialData] = useState<Partial<Job>>({})

  // URLパラメータから企業ID・店舗IDを取得して初期データを設定
  useEffect(() => {
    const companyParam = searchParams.get('company')
    const storeParam = searchParams.get('store')
    
    console.log('URL Parameters:', { company: companyParam, store: storeParam })
    
    const data: Partial<Job> = {
      storeIds: [] // 空配列で初期化
    }
    if (companyParam) {
      data.companyId = companyParam
    }
    if (storeParam && storeParam !== 'none') {
      data.storeIds = [storeParam]
    }
    
    console.log('Initial data being set:', data)
    
    setInitialData(data)
  }, [searchParams])

  const handleSubmit = async (data: Partial<Job>) => {
    if (!data.companyId || !data.title) {
      alert('企業と職種名は必須項目です')
      return
    }

    setLoading(true)

    try {
      const newJob: Omit<Job, 'id'> = {
        companyId: data.companyId,
        storeIds: data.storeIds,
        storeId: data.storeId,
        visibilityType: data.visibilityType || 'all',
        title: data.title,
        businessType: data.businessType,
        employmentType: data.employmentType,
        trialPeriod: data.trialPeriod,
        workingHours: data.workingHours,
        holidays: data.holidays,
        overtime: data.overtime,
        salaryInexperienced: data.salaryInexperienced,
        salaryExperienced: data.salaryExperienced,
        requiredSkills: data.requiredSkills,
        jobDescription: data.jobDescription,
        ageLimit: data.ageLimit,
        ageNote: data.ageNote,
        smokingPolicy: data.smokingPolicy,
        insurance: data.insurance,
        benefits: data.benefits,
        selectionProcess: data.selectionProcess,
        recommendedPoints: data.recommendedPoints,
        consultantReview: data.consultantReview,
        status: data.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const jobId = await createJob(newJob)
      alert('求人が正常に追加されました')
      router.push(`/jobs/${jobId}`)
    } catch (error) {
      console.error('求人の追加に失敗しました:', error)
      alert('求人の追加に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/jobs">
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-purple-800">
              <Briefcase className="h-8 w-8 text-purple-600" />
              新規求人追加
            </h1>
            <p className="text-purple-600 mt-2">
              新しい求人の情報を入力
            </p>
          </div>
        </div>
        
        <JobForm 
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-purple-600">読み込み中...</div>
      </div>
    }>
      <NewJobPageContent />
    </Suspense>
  )
}