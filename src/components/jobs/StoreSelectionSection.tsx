import { useState, useMemo } from 'react'
import { Store } from '@/types/store'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getCompanyStores,
  groupStoresByPrefecture,
  calculateJobCountByStore,
  isPrefectureSelected,
  isPrefecturePartiallySelected,
  handlePrefectureToggle,
} from './JobFormUtils'
import { StoresByPrefecture, JobCountByStore } from './JobFormTypes'

interface StoreSelectionSectionProps {
  companyId?: string
  stores: Store[]
  jobs: any[]
  selectedStoreIds: string[]
  onStoreSelect: (storeIds: string[]) => void
}

const StoreSelectionSection = ({
  companyId,
  stores,
  jobs,
  selectedStoreIds,
  onStoreSelect,
}: StoreSelectionSectionProps) => {
  const [storeSearchTerm, setStoreSearchTerm] = useState('')

  // Calculate job count by store
  const jobCountByStore = useMemo(
    () => calculateJobCountByStore(jobs),
    [jobs]
  )

  // Get filtered stores and group by prefecture
  const filteredStoresGrouped = useMemo(() => {
    if (!companyId) {
      return {}
    }

    const companyStores = getCompanyStores(stores, companyId, storeSearchTerm)
    return groupStoresByPrefecture(companyStores)
  }, [companyId, stores, storeSearchTerm])

  const handlePrefectureChange = (prefecture: string, checked: boolean) => {
    const updatedStoreIds = handlePrefectureToggle(
      prefecture,
      checked,
      filteredStoresGrouped,
      selectedStoreIds
    )
    onStoreSelect(updatedStoreIds)
  }

  const handleStoreChange = (storeId: string, checked: boolean) => {
    const updatedStoreIds = checked
      ? [...selectedStoreIds, storeId]
      : selectedStoreIds.filter(id => id !== storeId)
    onStoreSelect(updatedStoreIds)
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">企業を選択してください</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">店舗を選択</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="店舗名・住所・都道府県で検索"
          value={storeSearchTerm}
          onChange={(e) => setStoreSearchTerm(e.target.value)}
          className="mb-4"
        />

        <div className="space-y-3">
          {Object.entries(filteredStoresGrouped).map(([prefecture, prefectureStores]) => {
            const isSelected = isPrefectureSelected(
              prefecture,
              filteredStoresGrouped,
              selectedStoreIds
            )
            const isPartiallySelected = isPrefecturePartiallySelected(
              prefecture,
              filteredStoresGrouped,
              selectedStoreIds
            )

            return (
              <div key={prefecture} className="border-l-2 border-gray-200 pl-4">
                {/* Prefecture Header */}
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`prefecture-${prefecture}`}
                    checked={isSelected}
                    indeterminate={isPartiallySelected && !isSelected}
                    onChange={(checked) => handlePrefectureChange(prefecture, checked)}
                  />
                  <label
                    htmlFor={`prefecture-${prefecture}`}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {prefecture} ({prefectureStores.length})
                  </label>
                </div>

                {/* Stores in Prefecture */}
                <div className="space-y-2 ml-6">
                  {prefectureStores.map(store => {
                    const jobCount = jobCountByStore[store.id] || 0
                    const isStoreSelected = selectedStoreIds.includes(store.id)

                    return (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={isStoreSelected}
                          onChange={(checked) => handleStoreChange(store.id, checked)}
                        />
                        <label
                          htmlFor={`store-${store.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">{store.name}</span>
                          {store.address && (
                            <span className="text-gray-500 ml-2 text-xs">
                              {store.address}
                            </span>
                          )}
                          {jobCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">
                              求人: {jobCount}
                            </span>
                          )}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {selectedStoreIds.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <span className="font-medium">{selectedStoreIds.length}</span> 店舗を選択中
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StoreSelectionSection
