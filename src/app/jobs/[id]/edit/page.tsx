"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { getJob, updateJob } from '@/lib/firestore/jobs'
import { Job } from '@/types/job'
import JobForm from '@/components/jobs/JobForm'

interface EditJobPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditJobPage({ params }: EditJobPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [jobId, setJobId] = useState<string>('')
  const [initialData, setInitialData] = useState<Partial<Job>>({})

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な求人IDです')
        window.location.href = '/jobs'
        return
      }
      setJobId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return

      try {
        const jobData = await getJob(jobId)
        if (jobData) {
          console.log('Edit page: Loaded job data:', jobData)
          setInitialData(jobData)
        } else {
          alert('求人が見つかりませんでした')
          router.push('/jobs')
        }
      } catch (error) {
        console.error('求人の読み込みに失敗しました:', error)
        alert('求人の読み込みに失敗しました')
        router.push('/jobs')
      } finally {
        setLoading(false)
      }
    }

    loadJob()
  }, [jobId, router])

  const handleSubmit = async (data: Partial<Job>) => {
    if (!data.companyId || !data.title) {
      alert('企業と職種名は必須項目です')
      return
    }

    setSaving(true)

    try {
      const updatedJob: Partial<Job> = {
        ...data,
        updatedAt: new Date()
      }

      await updateJob(jobId, updatedJob)
      alert('求人が正常に更新されました')
      router.push(`/jobs/${jobId}`)
    } catch (error) {
      console.error('求人の更新に失敗しました:', error)
      alert('求人の更新に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-purple-600">読み込み中...</div>
      </div>
    )
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
              求人編集
            </h1>
            <p className="text-purple-600 mt-2">
              求人の情報を編集
            </p>
          </div>
        </div>
        
        <JobForm 
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={saving}
          isEdit={true}
        />
      </div>
    </div>
  )
}