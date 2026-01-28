"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { loadGoogleMapsScript } from '@/lib/google-maps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, MapPin, Store as StoreIcon, Search } from 'lucide-react'
import Link from 'next/link'

interface StoreMapViewProps {
  stores: Store[]
  companies: Company[]
  onStoreClick?: (storeId: string) => void
}

interface StoreWithLocation extends Store {
  company?: Company
}

export function StoreMapView({ stores, companies, onStoreClick }: StoreMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStore, setSelectedStore] = useState<StoreWithLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  // 店舗データに企業情報を結合
  const storesWithLocation: StoreWithLocation[] = stores
    .filter(store => store.latitude && store.longitude)
    .map(store => {
      const company = companies.find(c => c.id === store.companyId)
      return {
        ...store,
        company
      }
    })

  // 位置情報がない店舗の数
  const storesWithoutLocation = stores.length - storesWithLocation.length

  // デバッグログ
  useEffect(() => {
    console.log('StoreMapView mounted')
    console.log('Total stores:', stores.length)
    console.log('Stores with location:', storesWithLocation.length)
    console.log('Stores without location:', storesWithoutLocation)
  }, [stores.length, storesWithLocation.length, storesWithoutLocation])

  // 住所検索機能
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim() || !googleMapRef.current) return
    
    setSearching(true)
    
    try {
      const geocoder = new google.maps.Geocoder()
      
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results[0])
          } else {
            reject(new Error(`住所の検索に失敗しました: ${status}`))
          }
        })
      })

      const location = result.geometry.location
      const newCenter = { lat: location.lat(), lng: location.lng() }
      googleMapRef.current.setCenter(newCenter)
      googleMapRef.current.setZoom(14)

      // 検索位置にマーカーを一時的に表示
      const searchMarker = new google.maps.Marker({
        position: newCenter,
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#10b981',
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8
        },
        animation: google.maps.Animation.DROP,
      })

      setTimeout(() => {
        searchMarker.setMap(null)
      }, 3000)

    } catch (error) {
      console.error('住所検索エラー:', error)
      alert(error instanceof Error ? error.message : '住所の検索に失敗しました')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsScript()
        
        if (!mapRef.current) return

        const center = { lat: 35.6812, lng: 139.7671 } // 東京駅

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 10,
          mapId: 'store_map_view',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        googleMapRef.current = map

        infoWindowRef.current = new google.maps.InfoWindow()

        createMarkers(map)

        console.log('✅ 店舗マップを東京駅中心で表示します')
        console.log(`📍 店舗データ数: ${storesWithLocation.length}件`)

        setLoading(false)
      } catch (err) {
        console.error('Google Maps の初期化に失敗しました:', err)
        setError('地図の読み込みに失敗しました。APIキーを確認してください。')
        setLoading(false)
      }
    }

    initMap()

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  // マーカーを再作成
  useEffect(() => {
    if (googleMapRef.current) {
      createMarkers(googleMapRef.current)
    }
  }, [stores, companies])

  const createMarkers = (map: google.maps.Map) => {
    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // 新しいマーカーを作成
    storesWithLocation.forEach((store) => {
      if (!store.latitude || !store.longitude) {
        return
      }

      const marker = new google.maps.Marker({
        position: { lat: store.latitude, lng: store.longitude },
        map,
        title: store.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: getMarkerColor(store.status),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10
        }
      })

      // マーカークリック時の処理
      marker.addListener('click', () => {
        setSelectedStore(store)
        
        if (infoWindowRef.current) {
          const content = createInfoWindowContent(store)
          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open(map, marker)
        }

        if (onStoreClick) {
          onStoreClick(store.id)
        }
      })

      markersRef.current.push(marker)
    })
  }

  const getMarkerColor = (status: Store['status']): string => {
    switch (status) {
      case 'active':
        return '#10b981' // green
      case 'inactive':
        return '#ef4444' // red
      default:
        return '#3b82f6' // blue
    }
  }

  const createInfoWindowContent = (store: StoreWithLocation): string => {
    return `
      <div style="padding: 8px; max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${store.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; background: ${
            store.status === 'active' ? '#d1fae5' : '#fee2e2'
          }; color: ${
            store.status === 'active' ? '#065f46' : '#991b1b'
          }; border-radius: 4px; font-size: 12px;">
            ${store.status === 'active' ? '営業中' : '非営業'}
          </span>
        </div>
        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
          <strong>企業:</strong> ${store.company?.name || ''}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
          <strong>住所:</strong> ${store.address || ''}
        </p>
        ${store.nearestStation ? `
          <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
            <strong>最寄り駅:</strong> ${store.nearestStation}
          </p>
        ` : ''}
        ${store.seatCount ? `
          <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
            <strong>席数:</strong> ${store.seatCount}席
          </p>
        ` : ''}
        <div style="margin-top: 12px;">
          <a href="/stores/${store.id}" 
             style="display: inline-block; padding: 6px 12px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
            詳細を見る
          </a>
        </div>
      </div>
    `
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-red-500 mt-2">
            .env.local に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative h-[600px] w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">地図を読み込み中...</p>
          </div>
        </div>
      )}
      
      {/* 検索窓 */}
      <div className="absolute top-4 right-4 z-10 w-80">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="住所や地名を入力（例: 東京駅、渋谷区、大阪市中央区）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white shadow-lg"
            disabled={searching}
          />
          <Button 
            type="submit" 
            disabled={searching || !searchQuery.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
      
      <div ref={mapRef} className="w-full h-full rounded-lg shadow-lg" />

      {/* 統計情報 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-green-600" />
          <span className="font-semibold">店舗マップ</span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>営業中: {storesWithLocation.filter(s => s.status === 'active').length}件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>非営業: {storesWithLocation.filter(s => s.status === 'inactive').length}件</span>
          </div>
          {storesWithoutLocation > 0 && (
            <div className="flex items-center gap-2 text-orange-600">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <span>位置情報なし: {storesWithoutLocation}件</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          <div>マップ表示: {storesWithLocation.length}件</div>
          <div>全体: {stores.length}件</div>
        </div>
      </div>

      {/* 選択された店舗の詳細カード */}
      {selectedStore && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 z-10 max-w-md">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg">{selectedStore.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStore(null)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={selectedStore.status === 'active' ? 'default' : 'secondary'}>
                {selectedStore.status === 'active' ? '営業中' : '非営業'}
              </Badge>
              {selectedStore.prefecture && (
                <Badge variant="outline">{selectedStore.prefecture}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              <strong>企業:</strong> {selectedStore.company?.name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>住所:</strong> {selectedStore.address}
            </p>
            {selectedStore.nearestStation && (
              <p className="text-sm text-gray-600">
                <strong>最寄り駅:</strong> {selectedStore.nearestStation}
              </p>
            )}
            {selectedStore.seatCount && (
              <p className="text-sm text-gray-600">
                <strong>席数:</strong> {selectedStore.seatCount}席
              </p>
            )}
            <Link href={`/stores/${selectedStore.id}`}>
              <Button className="w-full mt-2 bg-green-600 hover:bg-green-700">
                <Eye className="h-4 w-4 mr-2" />
                詳細を見る
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
