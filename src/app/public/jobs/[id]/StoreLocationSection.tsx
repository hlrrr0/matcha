'use client'

import { MapPin } from 'lucide-react'
import { Store as StoreType } from '@/types/store'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface StoreLocationSectionProps {
  stores: StoreType[]
  mainStoreIds?: string[]
  companyName?: string
}

const StoreLocationSection = ({ stores, mainStoreIds, companyName }: StoreLocationSectionProps) => {
  if (stores.length === 0) {
    return <p className="text-gray-600">{companyName || '勤務地情報なし'}</p>
  }

  // メイン店舗とサブ店舗を分ける
  const mainStores = mainStoreIds && mainStoreIds.length > 0
    ? stores.filter(store => mainStoreIds.includes(store.id))
    : [stores[0]]  // mainStoreIdsがない場合は最初の店舗をメインとして扱う
  
  const subStores = mainStoreIds && mainStoreIds.length > 0
    ? stores.filter(store => !mainStoreIds.includes(store.id))
    : stores.slice(1)

  // 店舗情報を表示するコンポーネント
  const renderStoreLocation = (store: StoreType, isMain: boolean = false) => (
    <div className={`${isMain ? 'border-l-4 border-blue-500' : 'border-l-2 border-gray-300'} pl-3`}>
      {isMain && mainStores.length > 1 && (
        <p className="text-xs text-gray-500 mb-1">候補先店舗</p>
      )}
      {isMain && mainStores.length === 1 && stores.length > 1 && (
        <p className="text-xs text-gray-500 mb-1">参考店舗</p>
      )}
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
  )

  if (stores.length === 1) {
    // 1店舗の場合は通常表示
    return (
      <div className="space-y-2">
        {renderStoreLocation(stores[0], false)}
      </div>
    )
  }

  // 複数店舗の場合はメイン店舗を表示、残りはアコーディオン
  return (
    <div className="space-y-3">
      {/* メイン店舗を並列表示 */}
      {mainStores.map((store) => (
        <div key={store.id}>
          {renderStoreLocation(store, true)}
        </div>
      ))}
      
      {/* サブ店舗（アコーディオン） */}
      {subStores.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="other-stores">
            <AccordionTrigger className="text-sm">
              その他の勤務可能店舗 ({subStores.length}店舗)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {subStores.map((store) => (
                  <div key={store.id}>
                    {renderStoreLocation(store, false)}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}

export default StoreLocationSection
