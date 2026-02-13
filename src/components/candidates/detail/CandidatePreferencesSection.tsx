"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Candidate } from '@/types/candidate'

interface CandidatePreferencesSectionProps {
  candidate: Candidate
}

export default function CandidatePreferencesSection({ candidate }: CandidatePreferencesSectionProps) {
  return (
    <Card className="border-green-100">
      <CardHeader>
        <CardTitle className="text-green-800">希望条件</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">就職活動をスタートさせるタイミング</label>
            <p className="mt-1">{candidate.jobSearchTiming || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">卒業"直後"の希望進路</label>
            <p className="mt-1">{candidate.graduationCareerPlan || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">就職・開業希望エリア</label>
            <p className="mt-1">{candidate.preferredArea || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">就職・開業したいお店の雰囲気・条件</label>
            <p className="mt-1 whitespace-pre-wrap">{candidate.preferredWorkplace || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">将来のキャリア像</label>
            <p className="mt-1 whitespace-pre-wrap">{candidate.futureCareerVision || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">キャリア担当への質問・要望</label>
            <p className="mt-1 whitespace-pre-wrap">{candidate.questions || '未登録'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">在校中のアルバイト希望</label>
            <p className="mt-1 whitespace-pre-wrap">{candidate.partTimeHope || '未登録'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
