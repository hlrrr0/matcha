'use client'

import { Store as StoreType } from '@/types/store'
import { Company } from '@/types/company'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Store, Globe, Star, Camera, Play } from 'lucide-react'
import { ImageData } from './SushiCareerJobTypes'
import { getAllPhotos } from './SushiCareerJobUtils'
import { PLACEHOLDER_IMAGE_URL, DEFAULT_IMAGE_ALT } from './SushiCareerJobConstants'

interface StoreInfoCardProps {
  stores: StoreType[]
  company: Company | null
  onImageClick: (src: string, alt: string) => void
}

const StoreInfoCard = ({ stores, company, onImageClick }: StoreInfoCardProps) => {
  if (stores.length === 0) return null

  const allPhotos = getAllPhotos(company, stores[0])
  
  // 写真がない場合はプレースホルダーを追加
  const displayPhotos = allPhotos.length > 0 
    ? allPhotos 
    : [{ src: PLACEHOLDER_IMAGE_URL, alt: DEFAULT_IMAGE_ALT }]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          店舗情報{stores.length > 1 && ' (参考店舗)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        {/* 参考店舗（1店舗目） */}
        <div className="border-l-4 border-blue-500 pl-3 mb-3">
          {stores.length > 1 && (
            <p className="text-xs text-gray-500 mb-2">参考店舗</p>
          )}
          <p className="font-medium text-base mb-3">{stores[0].name}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {stores[0].trainingPeriod && (
              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-1">握れるまでのおおよその期間</h4>
                <p className="text-sm text-gray-600">{stores[0].trainingPeriod}</p>
              </div>
            )}
            
            {/* 店舗基本情報 */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 text-sm mb-1">基本情報</h4>
              <ul className="space-y-1">
                {stores[0].businessType && (
                  <li className="text-sm text-gray-600">
                    業態: {stores[0].businessType}
                  </li>
                )}
                {(stores[0].unitPriceLunch || stores[0].unitPriceDinner) && (
                  <li className="text-sm text-gray-600">
                    客単価: 
                    {stores[0].unitPriceLunch && ` 昼 ${stores[0].unitPriceLunch}円`}
                    {stores[0].unitPriceLunch && stores[0].unitPriceDinner && ' / '}
                    {stores[0].unitPriceDinner && ` 夜 ${stores[0].unitPriceDinner}円`}
                  </li>
                )}
                {stores[0].seatCount && (
                  <li className="text-sm text-gray-600">
                    座席数: {stores[0].seatCount}席
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        {/* その他の店舗情報（アコーディオン） */}
        {stores.length > 1 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="other-stores-info">
              <AccordionTrigger className="text-sm">
                その他の店舗情報 ({stores.length - 1}店舗)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {stores.slice(1).map((store) => (
                    <div key={store.id} className="border-l-2 border-gray-300 pl-3 pb-3">
                      <p className="font-medium text-base mb-3">
                        {store.name}
                        {store.prefecture && (
                          <span className="ml-2 text-gray-500">【{store.prefecture}】</span>
                        )}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {store.trainingPeriod && (
                          <div>
                            <h4 className="font-medium text-gray-700 text-sm mb-1">握れるまでのおおよその期間</h4>
                            <p className="text-sm text-gray-600">{store.trainingPeriod}</p>
                          </div>
                        )}
                        
                        {/* 店舗基本情報 */}
                        {(store.businessType || store.unitPriceLunch || store.unitPriceDinner || store.seatCount || store.isReservationRequired !== undefined) && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700 text-sm mb-1">基本情報</h4>
                            <ul className="space-y-1">
                              {store.businessType && (
                                <li className="text-sm text-gray-600">
                                  業態: {store.businessType}
                                </li>
                              )}
                              {(store.unitPriceLunch || store.unitPriceDinner) && (
                                <li className="text-sm text-gray-600">
                                  客単価: 
                                  {store.unitPriceLunch && ` 昼 ${store.unitPriceLunch}円`}
                                  {store.unitPriceLunch && store.unitPriceDinner && ' / '}
                                  {store.unitPriceDinner && ` 夜 ${store.unitPriceDinner}円`}
                                </li>
                              )}
                              {store.seatCount && (
                                <li className="text-sm text-gray-600">
                                  座席数: {store.seatCount}席
                                </li>
                              )}
                              {store.isReservationRequired !== undefined && (
                                <li className="text-sm text-gray-600">
                                  予約: {store.isReservationRequired ? '必要' : '不要'}
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* SNS・口コミ情報 */}
        <div className="space-y-2">
          <div className="grid grid-cols-1gap-4">
            <div className="py-2">
              {stores[0].website && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <a href={stores[0].website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    店舗ウェブサイト
                  </a>
                </p>
              )}
              {stores[0].instagramUrl && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  📷 <a href={stores[0].instagramUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Instagram
                  </a>
                </p>
              )}
              {stores[0].tabelogUrl && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  🍽️ <a href={stores[0].tabelogUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    食べログ
                  </a>
                </p>
              )}
            </div>
            <div>
              {stores[0].tabelogScore && (
                <div className="mb-2">
                  <h4 className="font-medium text-gray-700 text-sm mb-1 flex items-center gap-2">
                    <Star className="h-3 w-3 text-yellow-500" />
                    食べログスコア
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].tabelogScore}</p>
                </div>
              )}
              {stores[0].googleReviewScore && (
                <div className="mb-2">
                  <h4 className="font-medium text-gray-700 text-sm mb-1 flex items-center gap-2">
                    <Star className="h-3 w-3 text-yellow-500" />
                    Google口コミスコア
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].googleReviewScore}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 評判・その他情報 */}
        {stores[0].reputation && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">その他 / ミシュランなどの獲得状況等の実績</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].reputation}</p>
            </div>
          </>
        )}

        {stores[0].staffReview && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-2">スタッフからの評価</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{stores[0].staffReview}</p>
            </div>
          </>
        )}

        {/* 写真ギャラリー */}
        {displayPhotos.length > 0 && (
          <>
            <Separator />
            <div className="bg-white rounded-lg">
              <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-1">
                <Camera className="h-4 w-4" />
                写真ギャラリー ({displayPhotos.length}枚)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100 border"
                    onClick={() => onImageClick(photo.src, photo.alt)}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {photo.alt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* オーナー動画 */}
        {stores[0].ownerVideo && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Play className="h-4 w-4" />
                オーナー紹介動画
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition-colors duration-200">
                <a
                  href={stores[0].ownerVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="bg-blue-100 rounded-full p-2">
                      <Play className="h-4 w-4 text-blue-600 fill-current" />
                    </div>
                    <div>
                      <div className="font-medium">動画を視聴する</div>
                      <div className="text-sm text-gray-500 mt-1">店舗の雰囲気をご覧ください</div>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default StoreInfoCard
