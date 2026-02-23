"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderPlus, Plus } from 'lucide-react'
import { Candidate, campusLabels, sourceTypeLabels } from '@/types/candidate'
import { campusColors } from '@/components/candidates/detail/constants'

interface CandidateBasicInfoSectionProps {
  candidate: Candidate
  creatingFolder: boolean
  onCreateFolder: () => void
  onAddMemo: () => void
  calculateAge: (dateOfBirth: Date | string | undefined) => number | null
}

export default function CandidateBasicInfoSection({
  candidate,
  creatingFolder,
  onCreateFolder,
  onAddMemo,
  calculateAge
}: CandidateBasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-800">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">求職者区分</label>
              <div className="mt-1">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
                  {sourceTypeLabels[candidate.sourceType || 'inshokujin_univ']}
                </Badge>
                {candidate.sourceDetail && (
                  <span className="ml-2 text-sm text-gray-600">({candidate.sourceDetail})</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">氏名</label>
              <p className="text-lg">{candidate.lastName}　{candidate.firstName}<br />（{candidate.lastNameKana} {candidate.firstNameKana}）</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">生年月日</label>
              <p>
                {candidate.dateOfBirth ? (
                  <>
                    {candidate.dateOfBirth}
                    <span className="ml-2 text-blue-600 font-medium">
                      （{calculateAge(candidate.dateOfBirth)}歳）
                    </span>
                  </>
                ) : (
                  '未登録'
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">メールアドレス</label>
              <p>{candidate.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">電話番号</label>
              <p>{candidate.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">入学校舎 / 入学年月</label>
              <div className="mt-1 flex items-center gap-2">
                {candidate.campus ? (
                  <Badge className={`${campusColors[candidate.campus]} border font-medium`}>
                    {campusLabels[candidate.campus]}
                  </Badge>
                ) : (
                  <span>未登録</span>
                )}
                <span>/</span>
                <span>{candidate.enrollmentDate || '未登録'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">最寄り駅</label>
              <p className="mt-1">{candidate.nearestStation || '未登録'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">調理経験</label>
              <p className="mt-1">{candidate.cookingExperience || '未登録'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-orange-800">内部管理情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">願書URL</label>
                <p className="mt-1">
                  {candidate.applicationFormUrl ? (
                    <a href={candidate.applicationFormUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      ファイルを開く
                    </a>
                  ) : '未登録'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">履歴書URL</label>
                <div className="mt-1 flex items-center gap-2">
                  {candidate.resumeUrl ? (
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      ファイルを開く
                    </a>
                  ) : (
                    <>
                      <span className="text-gray-500">未登録</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onCreateFolder}
                        disabled={creatingFolder || !candidate.lastName || !candidate.firstName || (candidate.sourceType === 'inshokujin_univ' && (!candidate.enrollmentDate || !candidate.campus))}
                        className="ml-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <FolderPlus className="h-4 w-4 mr-1.5" />
                        {creatingFolder ? '作成中...' : 'フォルダーを作成'}
                      </Button>
                    </>
                  )}
                </div>
                {!candidate.resumeUrl && !candidate.lastName && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ フォルダー作成には、姓名が必要です
                  </p>
                )}
                {!candidate.resumeUrl && candidate.sourceType === 'inshokujin_univ' && (!candidate.enrollmentDate || !candidate.campus) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ 飲食人大学のフォルダー作成には、入学年月・入学校舎が必要です
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">スコア（人物）</label>
                <p className="mt-1">{candidate.personalityScore || '未登録'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">スコア（スキル）</label>
                <p className="mt-1">{candidate.skillScore || '未登録'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">先生からのコメント</label>
              <p className="mt-1 whitespace-pre-wrap">{candidate.teacherComment || '未登録'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-800">面談メモ</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddMemo}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {candidate.interviewMemos && candidate.interviewMemos.length > 0 ? (
            <div className="space-y-4">
              {candidate.interviewMemos.map((memo, index) => (
                <div key={memo.id} className="border-l-4 border-orange-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(memo.createdAt).toLocaleString('ja-JP')}
                    </span>
                    <span className="text-xs text-gray-500">
                      作成者: {memo.createdBy}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{memo.content}</p>
                </div>
              ))}
            </div>
          ) : candidate.interviewMemo ? (
            <div className="border-l-4 border-orange-200 pl-4 py-2">
              <p className="text-sm whitespace-pre-wrap text-gray-600">{candidate.interviewMemo}</p>
              <p className="text-xs text-gray-400 mt-2">※旧形式のメモ</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">面談メモが登録されていません</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
