'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, Calendar } from 'lucide-react'
import { Job } from '@/types/job'

interface WorkConditionsCardProps {
  job: Job
}

const WorkConditionsCard = ({ job }: WorkConditionsCardProps) => {
  // 表示する項目が1つもない場合は何も表示しない
  if (!job.trialPeriod && !job.workingHours && !job.holidays && !job.overtime && 
      !job.benefits && !job.smokingPolicy && !job.insurance) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>勤務条件</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        {/* 試用期間 */}
        {job.trialPeriod && (
          <div>
            <h3 className="font-medium text-gray-700">試用期間</h3>
            <p className="mt-1">{job.trialPeriod}</p>
          </div>
        )}

        {/* 勤務時間 */}
        {job.workingHours && (
          <>
            {job.trialPeriod && <Separator />}
            <div>
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                勤務時間
              </h3>
              <p className="mt-1 whitespace-pre-wrap">{job.workingHours}</p>
            </div>
          </>
        )}

        {/* 休日・休暇 */}
        {job.holidays && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                休日・休暇
              </h3>
              <p className="mt-1 whitespace-pre-wrap">{job.holidays}</p>
            </div>
          </>
        )}

        {/* 時間外労働 */}
        {job.overtime && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">時間外労働</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.overtime}</p>
            </div>
          </>
        )}

        {/* 待遇・福利厚生 */}
        {job.benefits && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">待遇・福利厚生</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.benefits}</p>
            </div>
          </>
        )}

        {/* 受動喫煙防止措置 */}
        {job.smokingPolicy && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">受動喫煙防止措置</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.smokingPolicy}</p>
            </div>
          </>
        )}

        {/* 加入保険 */}
        {job.insurance && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium text-gray-700">加入保険</h3>
              <p className="mt-1 whitespace-pre-wrap">{job.insurance}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkConditionsCard
