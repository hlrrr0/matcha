"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, RefreshCw, MessageSquare, Send, Plus, Edit, ArrowLeft } from 'lucide-react'
import { Candidate } from '@/types/candidate'
import { Diagnosis } from '@/types/diagnosis'

interface CandidateHeaderProps {
  candidate: Candidate
  candidateId: string
  diagnosisHistory: Diagnosis[]
  sendingSlack: boolean
  onRefreshMatches: () => void
  onSendToSlack: () => void
  onOpenCreateMatch: () => void
}

export default function CandidateHeader({
  candidate,
  candidateId,
  diagnosisHistory,
  sendingSlack,
  onRefreshMatches,
  onSendToSlack,
  onOpenCreateMatch
}: CandidateHeaderProps) {
  return (
    <>
      <div className="mb-8">
        <Link href="/candidates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-red-800">
            <Users className="h-6 h-8 sm:h-8 sm:w-8" />
            求職者詳細
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {candidate.lastName} {candidate.firstName}の詳細情報
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onRefreshMatches}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">更新</span>
          </Button>
          {diagnosisHistory.length > 0 && (
            <Link href={`/admin/diagnosis/${diagnosisHistory[0].id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">診断結果</span>
              </Button>
            </Link>
          )}
          {candidate.slackThreadUrl ? (
            <Button
              onClick={() => window.open(candidate.slackThreadUrl!, '_blank')}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Slackスレッド</span>
            </Button>
          ) : (
            <Button
              onClick={onSendToSlack}
              disabled={sendingSlack}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              {sendingSlack ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">送信中...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Slackに送信</span>
                </>
              )}
            </Button>
          )}
          <Button
            onClick={onOpenCreateMatch}
            variant="outline"
            size="sm"
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">進捗を作成</span>
          </Button>
          <Link href={`/candidates/${candidateId}/edit`}>
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">編集</span>
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}
