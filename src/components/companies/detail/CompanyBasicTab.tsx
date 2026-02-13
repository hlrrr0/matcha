"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  Globe,
  Users,
  Calendar,
  ExternalLink,
  Store,
  Briefcase,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import ExpandableFeature from '@/components/companies/detail/ExpandableFeature'
import { Company } from '@/types/company'
import { User } from '@/types/user'
import { formatDateTime } from '@/components/companies/detail/formatters'

interface CompanyBasicTabProps {
  company: Company
  consultant: User | null
  relatedStores: any[]
  relatedJobs: any[]
  companyId: string
}

export default function CompanyBasicTab({
  company,
  consultant,
  relatedStores,
  relatedJobs,
  companyId
}: CompanyBasicTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                所在地
              </h3>
              <p className="mt-1">{company.address}</p>
            </div>

            {company.website && (
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  ウェブサイト
                </h3>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-600 hover:underline flex items-center gap-1"
                >
                  {company.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">代表者名</h3>
                  <p className="text-lg">{company.representative || '未入力'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  従業員数
                </h3>
                <p className="mt-1 text-lg">{company.employeeCount || '未入力'}名</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  資本金
                </h3>
                <p className="mt-1 text-lg">{company.capital || '未入力'}万円</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  設立年
                </h3>
                <p className="mt-1 text-lg">{company.establishedYear || '未設定'}年</p>
              </div>
            </div>

            {(company.feature1 || company.feature2 || company.feature3) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">会社特徴</h3>
                  <div className="space-y-3">
                    {company.feature1 && (
                      <ExpandableFeature text={company.feature1} />
                    )}
                    {company.feature2 && (
                      <ExpandableFeature text={company.feature2} />
                    )}
                    {company.feature3 && (
                      <ExpandableFeature text={company.feature3} />
                    )}
                  </div>
                </div>
              </>
            )}

            {(company.contractType || company.contractDetails) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">契約情報</h3>
                  <div className="space-y-3">
                    {company.contractType && (
                      <div>
                        <h4 className="text-sm text-gray-600 mb-1">契約状況</h4>
                        <Badge className={company.contractType === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {company.contractType === 'paid' ? '有料紹介可' : '無料のみ'}
                        </Badge>
                      </div>
                    )}
                    {company.contractDetails && (
                      <div>
                        <h4 className="text-sm text-gray-600 mb-1">契約詳細</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{company.contractDetails}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(company.hasHousingSupport || company.hasIndependenceSupport || company.fullTimeAgeGroup || company.independenceRecord || company.careerPath || company.youngRecruitReason) && (
          <Card>
            <CardHeader>
              <CardTitle>福利厚生・キャリア情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(company.hasHousingSupport || company.hasIndependenceSupport) && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">サポート制度</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.hasHousingSupport && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        寮・家賃保証あり
                      </Badge>
                    )}
                    {company.hasIndependenceSupport && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        独立支援あり
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {company.fullTimeAgeGroup && (
                <div>
                  <h3 className="font-medium text-gray-700">正社員年齢層</h3>
                  <p className="mt-1 text-sm">{company.fullTimeAgeGroup}</p>
                </div>
              )}

              {company.independenceRecord && (
                <div>
                  <h3 className="font-medium text-gray-700">独立実績</h3>
                  <p className="mt-1 text-sm">{company.independenceRecord}</p>
                </div>
              )}

              {company.careerPath && (
                <div>
                  <h3 className="font-medium text-gray-700">目指せるキャリア</h3>
                  <p className="mt-1 text-sm">{company.careerPath}</p>
                </div>
              )}

              {company.youngRecruitReason && (
                <div>
                  <h3 className="font-medium text-gray-700">若手の入社理由</h3>
                  <p className="mt-1 text-sm">{company.youngRecruitReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/stores/new?company=${companyId}`}>
              <Button variant="outline" className="w-full justify-start">
                <Store className="h-4 w-4 mr-2" />
                新しい店舗を追加
              </Button>
            </Link>

            <Link href={`/jobs/new?company=${companyId}`}>
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="h-4 w-4 mr-2" />
                新しい求人を作成
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              統計情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">店舗数</span>
                <span className="font-medium">{relatedStores.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">求人数</span>
                <span className="font-medium">{relatedJobs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">公開求人数</span>
                <span className="font-medium">
                  {relatedJobs.filter(job => job.status === 'active').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {company.memo && (
          <Card>
            <CardHeader>
              <CardTitle>メモ・特記事項</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{company.memo}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              管理情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">作成日時</span>
                <span className="font-medium text-sm">{formatDateTime(company?.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">更新日時</span>
                <span className="font-medium text-sm">{formatDateTime(company?.updatedAt)}</span>
              </div>
              {company?.contractStartDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">取引開始日</span>
                  <span className="font-medium text-sm">
                    {new Date(company.contractStartDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
              {consultant && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">担当者</span>
                  <span className="font-medium text-sm">{consultant.displayName || consultant.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {company.dominoId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-800">Dominoシステム連携</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Domino ID:</span>
                    <span className="ml-2 font-mono">{company.dominoId}</span>
                  </div>
                  {company.importedAt && (
                    <div>
                      <span className="font-medium text-blue-700">インポート日時:</span>
                      <span className="ml-2">{formatDateTime(company.importedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
