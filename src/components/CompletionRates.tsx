"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeRecordCompletion, FieldSpec } from '@/lib/fieldCompletion'

type Props = {
  records: any[]
  fields: FieldSpec[]
  getRecordName: (record: any) => string
  title?: string
}

export default function CompletionRates({ records, fields, getRecordName, title = '入力率' }: Props) {
  const stats = computeRecordCompletion(records, fields, getRecordName)

  // 平均入力率を計算
  const avgPercent = stats.length > 0 
    ? Math.round(stats.reduce((sum, s) => sum + s.percent, 0) / stats.length)
    : 0

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="text-sm text-gray-600">
            平均入力率: <span className="text-lg font-bold text-emerald-600">{avgPercent}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {stats.map((s) => (
            <div key={s.id} className="p-3 border rounded hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate" title={s.name}>
                  {s.name}
                </div>
                <div className={`text-sm font-bold ${
                  s.percent >= 80 ? 'text-green-600' :
                  s.percent >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {s.percent}%
                </div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div 
                  className={`h-2 ${
                    s.percent >= 80 ? 'bg-green-500' :
                    s.percent >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${s.percent}%` }} 
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {s.filledCount}/{s.totalFields} 項目入力済み
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
