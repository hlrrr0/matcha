'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Briefcase, DollarSign, MapPin, Star } from 'lucide-react'
import { Job } from '@/types/job'
import { Company } from '@/types/company'
import { Store as StoreType } from '@/types/store'
import { getEmploymentTypeBadgeColor, getEmploymentTypeLabel } from './SushiCareerJobUtils'
import StoreLocationSection from './StoreLocationSection'

interface JobBasicInfoCardProps {
  job: Job
  company: Company | null
  stores: StoreType[]
}

const JobBasicInfoCard = ({ job, company, stores }: JobBasicInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Briefcase className="h-6 w-6 hidden md:block" />
          {job.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">募集中</Badge>
          <Badge className={getEmploymentTypeBadgeColor(job.employmentType)}>
            {getEmploymentTypeLabel(job.employmentType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        <div className="space-y-4">
          {job.salaryInexperienced && (
            <div>
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                給与：未経験者
              </h3>
              <p className="text-lg whitespace-pre-line">{job.salaryInexperienced}</p>
            </div>
          )}
          {job.salaryExperienced && (
            <div>
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                給与：経験者（おおよそ3年経過時）
              </h3>
              <p className="text-lg whitespace-pre-line">{job.salaryExperienced}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* 勤務地・最寄り駅 */}
        <div>
          <h3 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4" />
            勤務地・最寄り駅
          </h3>
          <StoreLocationSection stores={stores} companyName={company?.name} />
        </div>

        {/* 職務内容 */}
        {job.jobDescription && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">職務内容</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.jobDescription}</p>
            </div>
          </>
        )}

        {/* 求めるスキル */}
        {job.requiredSkills && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">求めるスキル</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.requiredSkills}</p>
            </div>
          </>
        )}
        
        {/* 企業特徴 */}
        {(company?.feature1 || company?.feature2 || company?.feature3) && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">企業特徴</h4>
              <div className="space-y-1">
                {company?.feature1 && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap"> ①{company.feature1}</p>
                )}
                {company?.feature2 && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap"> ②{company.feature2}</p>
                )}
                {company?.feature3 && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap"> ③{company.feature3}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* キャリアパス */}
        {company?.careerPath && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">目指せるキャリア</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{company?.careerPath}</p>
            </div>
          </>
        )}

        {/* 若手入社理由 */}
        {company?.youngRecruitReason && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">若手の入社理由</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{company?.youngRecruitReason}</p>
            </div>
          </>
        )}

        {/* おすすめポイント */}
        {job.recommendedPoints && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                おすすめポイント
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.recommendedPoints}</p>
            </div>
          </>
        )}

        {/* キャリア担当からのコメント */}
        {job.consultantReview && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">キャリア担当からのコメント</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.consultantReview}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default JobBasicInfoCard
