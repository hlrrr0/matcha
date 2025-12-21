"use client"

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import CareerValuesDiagnosis from '@/components/diagnosis/CareerValuesDiagnosis'

export default function DiagnosisPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            onClick={() => router.push(`/public/candidates/${candidateId}/mypage`)}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            マイページに戻る
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            キャリア価値観診断
          </h1>
          <p className="text-gray-600 mt-2">
            あなたが大切にしている価値観を診断します
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <CareerValuesDiagnosis candidateId={candidateId} />
      </div>
    </div>
  )
}
