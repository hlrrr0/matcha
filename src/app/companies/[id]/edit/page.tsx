"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Flag } from 'lucide-react'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company } from '@/types/company'
import CompanyForm from '@/components/companies/CompanyForm'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface EditCompanyPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditCompanyPage({ params }: EditCompanyPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [company, setCompany] = useState<Partial<Company>>({})
  const [bulkFlags, setBulkFlags] = useState({
    highDemand: false,
    provenTrack: false,
    weakRelationship: false
  })
  const [applyingFlags, setApplyingFlags] = useState(false)

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      if (!resolvedParams.id || resolvedParams.id.trim() === '') {
        alert('無効な企業IDです')
        window.location.href = '/companies'
        return
      }
      setCompanyId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!companyId) return

    const fetchCompany = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId))
        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as Company
          setCompany(companyData)
        } else {
          toast.error('企業が見つかりません')
          router.push('/companies')
        }
      } catch (error) {
        console.error('企業データの取得に失敗しました:', error)
        toast.error('企業データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [companyId, router])

  const handleSubmit = async (formData: Partial<Company>) => {
    setSaving(true)
    
    try {
      const updateData = {
        ...formData,
        updatedAt: new Date().toISOString()
      }
      
      await updateDoc(doc(db, 'companies', companyId), updateData)
      toast.success('企業情報が正常に更新されました')
      router.push(`/companies/${companyId}`)
    } catch (error) {
      console.error('Error updating company:', error)
      toast.error('企業情報の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyBulkFlags = async () => {
    if (!companyId) return
    
    const selectedFlags = Object.entries(bulkFlags).filter(([_, checked]) => checked)
    if (selectedFlags.length === 0) {
      toast.error('フラグを選択してください')
      return
    }

    setApplyingFlags(true)
    try {
      // この企業の全求人を取得
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('companyId', '==', companyId)
      )
      const jobsSnapshot = await getDocs(jobsQuery)
      
      if (jobsSnapshot.empty) {
        toast.warning('この企業に紐づく求人がありません')
        setApplyingFlags(false)
        return
      }

      // バッチ更新
      const batch = writeBatch(db)
      jobsSnapshot.docs.forEach((jobDoc) => {
        const currentFlags = jobDoc.data().flags || {}
        batch.update(jobDoc.ref, {
          flags: {
            ...currentFlags,
            highDemand: bulkFlags.highDemand || currentFlags.highDemand || false,
            provenTrack: bulkFlags.provenTrack || currentFlags.provenTrack || false,
            weakRelationship: bulkFlags.weakRelationship || currentFlags.weakRelationship || false
          },
          updatedAt: new Date()
        })
      })

      await batch.commit()
      toast.success(`${jobsSnapshot.size}件の求人にフラグを設定しました`)
      
      // フラグをリセット
      setBulkFlags({
        highDemand: false,
        provenTrack: false,
        weakRelationship: false
      })
    } catch (error) {
      console.error('Error applying bulk flags:', error)
      toast.error('フラグ設定に失敗しました')
    } finally {
      setApplyingFlags(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Link href={`/companies/${companyId}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          企業詳細に戻る
        </Button>
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              企業情報編集
            </h1>
            <p className="text-gray-600 mt-2">
              {company.name}の情報を編集します
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              求人フラグ一括設定
            </CardTitle>
            <CardDescription>
              この企業に紐づく全ての求人にフラグを一括で設定できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bulk-highDemand"
                  checked={bulkFlags.highDemand}
                  onCheckedChange={(checked) => 
                    setBulkFlags(prev => ({ ...prev, highDemand: checked as boolean }))
                  }
                />
                <Label htmlFor="bulk-highDemand" className="cursor-pointer">
                  🔥 ニーズ高
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bulk-provenTrack"
                  checked={bulkFlags.provenTrack}
                  onCheckedChange={(checked) => 
                    setBulkFlags(prev => ({ ...prev, provenTrack: checked as boolean }))
                  }
                />
                <Label htmlFor="bulk-provenTrack" className="cursor-pointer">
                  🎉 実績あり
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bulk-weakRelationship"
                  checked={bulkFlags.weakRelationship}
                  onCheckedChange={(checked) => 
                    setBulkFlags(prev => ({ ...prev, weakRelationship: checked as boolean }))
                  }
                />
                <Label htmlFor="bulk-weakRelationship" className="cursor-pointer">
                  💧 関係薄め
                </Label>
              </div>
              <Button 
                onClick={handleApplyBulkFlags}
                disabled={applyingFlags}
                className="w-full"
              >
                {applyingFlags ? '設定中...' : 'フラグを一括設定'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <CompanyForm 
          initialData={company}
          onSubmit={handleSubmit}
          isEdit={true}
          loading={saving}
        />
      </div>
    </div>
  )
}
