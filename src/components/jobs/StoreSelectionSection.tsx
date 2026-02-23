import { useState, useMemo } from 'react'
import { Store } from '@/types/store'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  mainStoreIds?: string[]
  onStoreSelect: (storeIds: string[]) => void
  onMainStoreSelect?: (mainStoreIds: string[]) => void
}

// ドラッグ可能な店舗アイテム
interface SortableStoreItemProps {
  store: Store
  index: number
  isMain: boolean
  onMainToggle: (storeId: string, isMain: boolean) => void
}

function SortableStoreItem({ store, index, isMain, onMainToggle }: SortableStoreItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: store.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded hover:border-gray-300 transition-colors"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isMain}
            onChange={(e) => onMainToggle(store.id, e.target.checked)}
            className="rounded border-gray-300"
            title="メイン店舗"
          />
          {isMain && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              メイン
            </span>
          )}
          {index === 0 && !isMain && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
              参考店舗
            </span>
          )}
          <span className="font-medium text-sm truncate">{store.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {store.prefecture && <span>{store.prefecture}</span>}
          {store.address && <span className="truncate">{store.address}</span>}
        </div>
      </div>
    </div>
  )
}

const StoreSelectionSection = ({
  companyId,
  stores,
  jobs,
  selectedStoreIds,
  mainStoreIds = [],
  onStoreSelect,
  onMainStoreSelect,
}: StoreSelectionSectionProps) => {
  const [storeSearchTerm, setStoreSearchTerm] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = selectedStoreIds.indexOf(active.id as string)
      const newIndex = selectedStoreIds.indexOf(over.id as string)
      const newStoreIds = arrayMove(selectedStoreIds, oldIndex, newIndex)
      onStoreSelect(newStoreIds)
    }
  }

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
    
    // メイン店舗から削除された場合は、mainStoreIdsからも削除
    if (!checked && onMainStoreSelect && mainStoreIds.includes(storeId)) {
      onMainStoreSelect(mainStoreIds.filter(id => id !== storeId))
    }
  }

  const handleMainToggle = (storeId: string, isMain: boolean) => {
    if (!onMainStoreSelect) return
    
    const updatedMainStoreIds = isMain
      ? [...mainStoreIds, storeId]
      : mainStoreIds.filter(id => id !== storeId)
    onMainStoreSelect(updatedMainStoreIds)
  }

  // 選択された店舗のデータを取得
  const selectedStoresData = useMemo(() => {
    return selectedStoreIds
      .map(id => stores.find(s => s.id === id))
      .filter((store): store is Store => store !== undefined)
  }, [selectedStoreIds, stores])

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-gray-500">企業を選択してください</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">店舗を選択</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="text"
          placeholder="店舗名・住所・都道府県で検索"
          value={storeSearchTerm}
          onChange={(e) => setStoreSearchTerm(e.target.value)}
          className="mb-2"
        />

        <div className="space-y-2">
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
              <div key={prefecture} className="border-l-2 border-gray-200 pl-3">
                {/* Prefecture Header */}
                <div className="flex items-center space-x-2 mb-1.5">
                  <div className="relative">
                    <Checkbox
                      id={`prefecture-${prefecture}`}
                      checked={isSelected || isPartiallySelected}
                      onCheckedChange={(checked) => {
                        if (typeof checked === 'boolean') {
                          handlePrefectureChange(prefecture, checked)
                        }
                      }}
                    />
                    {isPartiallySelected && !isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-sm"></div>
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor={`prefecture-${prefecture}`}
                    className="text-xs font-medium cursor-pointer flex-1"
                  >
                    {prefecture} ({prefectureStores.length})
                  </label>
                </div>

                {/* Stores in Prefecture */}
                <div className="space-y-1.5 ml-5">
                  {prefectureStores.map(store => {
                    const jobCount = jobCountByStore[store.id] || 0
                    const isStoreSelected = selectedStoreIds.includes(store.id)

                    return (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={isStoreSelected}
                          onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                              handleStoreChange(store.id, checked)
                            }
                          }}
                        />
                        <label
                          htmlFor={`store-${store.id}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          <span className="font-medium">{store.name}</span>
                          {store.address && (
                            <span className="text-gray-500 ml-1.5 text-xs">
                              {store.address}
                            </span>
                          )}
                          {jobCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1.5">
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
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <span className="font-medium">{selectedStoreIds.length}</span> 店舗を選択中
          </div>
        )}

        {/* 選択された店舗の順序変更 */}
        {selectedStoresData.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <h3 className="text-xs font-semibold mb-2 text-gray-700">
              選択された店舗の順序（ドラッグで並べ替え、チェックでメイン店舗指定）
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedStoreIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {selectedStoresData.map((store, index) => (
                    <SortableStoreItem 
                      key={store.id} 
                      store={store} 
                      index={index} 
                      isMain={mainStoreIds.includes(store.id)}
                      onMainToggle={handleMainToggle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StoreSelectionSection
