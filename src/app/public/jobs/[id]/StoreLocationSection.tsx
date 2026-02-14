'use client'

import { MapPin } from 'lucide-react'
import { Store as StoreType } from '@/types/store'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface StoreLocationSectionProps {
  stores: StoreType[]
  companyName?: string
}

const StoreLocationSection = ({ stores, companyName }: StoreLocationSectionProps) => {
  if (stores.length === 0) {
    return <p className="text-gray-600">{companyName || '勤務地情報なし'}</p>
  }

  if (stores.length === 1) {
    // 1店舗の場合は通常表示
    return (
      <div className="space-y-2">
        <div>
          <p className="font-medium">{stores[0].name}</p>
          {stores[0].address && (
            <p className="text-gray-600 text-sm">{stores[0].address}</p>
          )}
        </div>
        {stores[0].nearestStation && (
          <div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              <span className="font-medium">最寄り駅:</span> {stores[0].nearestStation}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 複数店舗の場合は1店舗目を表示、残りはアコーディオン
  return (
    <div className="space-y-3">
      {/* 参考店舗（1店舗目） */}
      <div className="border-l-4 border-blue-500 pl-3">
        <p className="text-xs text-gray-500 mb-1">参考店舗</p>
        <p className="font-medium">{stores[0].name}</p>
        {stores[0].address && (
          <p className="text-gray-600 text-sm">{stores[0].address}</p>
        )}
        {stores[0].nearestStation && (
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
            <span className="font-medium">最寄り駅:</span> {stores[0].nearestStation}
          </p>
        )}
      </div>
      
      {/* その他の店舗（アコーディオン） */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="other-stores">
          <AccordionTrigger className="text-sm">
            その他の勤務可能店舗 ({stores.length - 1}店舗)
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {stores.slice(1).map((store) => (
                <div key={store.id} className="border-l-2 border-gray-300 pl-3">
                  <p className="font-medium">
                    {store.name}
                    {store.prefecture && (
                      <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                    )}
                  </p>
                  {store.address && (
                    <p className="text-gray-600 text-sm">{store.address}</p>
                  )}
                  {store.nearestStation && (
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      <span className="font-medium">最寄り駅:</span> {store.nearestStation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default StoreLocationSection
