"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Job } from '@/types/job'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { loadGoogleMapsScript } from '@/lib/google-maps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, MapPin, Briefcase, Search, Navigation, Train, Car, Footprints, X } from 'lucide-react'
import Link from 'next/link'

interface JobMapViewProps {
  jobs: Job[]
  stores: Store[]
  companies: Company[]
  onJobClick?: (jobId: string) => void
}

interface JobWithLocation extends Job {
  store?: Store
  company?: Company
  latitude?: number
  longitude?: number
  displayTitle?: string // 複数店舗の場合に店舗名を含めたタイトル
}

type TravelMode = 'TRANSIT' | 'DRIVING' | 'WALKING'

interface RouteInfo {
  duration: string
  distance: string
  steps: google.maps.DirectionsStep[]
  transitDetails?: any[]
}

export function JobMapView({ jobs, stores, companies, onJobClick }: JobMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobWithLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  
  // 経路検索機能
  const [startLocation, setStartLocation] = useState('')
  const [travelMode, setTravelMode] = useState<TravelMode>('TRANSIT')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [calculatingRoute, setCalculatingRoute] = useState(false)
  const [showRoutePanel, setShowRoutePanel] = useState(false)

  // 求人データに店舗・企業・位置情報を結合
  // 複数店舗の場合は各店舗ごとに展開
  const jobsWithLocation: JobWithLocation[] = jobs.flatMap(job => {
    const company = companies.find(c => c.id === job.companyId)
    
    // storeIdsまたはstoreIdから店舗リストを取得
    const storeIds = job.storeIds || (job.storeId ? [job.storeId] : [])
    
    if (storeIds.length === 0) return []
    
    // 各店舗ごとにジョブエントリを作成
    return storeIds.map(storeId => {
      const store = stores.find(s => s.id === storeId)
      
      if (!store?.latitude || !store?.longitude) return null
      
      return {
        ...job,
        store,
        company,
        latitude: store.latitude,
        longitude: store.longitude,
        // 複数店舗の場合は店舗名を含める
        displayTitle: storeIds.length > 1 ? `${job.title} - ${store.name}` : job.title
      } as JobWithLocation
    }).filter((job): job is JobWithLocation => job !== null)
  })

  // 住所検索機能（クライアントサイドで直接Geocoding APIを呼び出す）
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim() || !googleMapRef.current) return
    
    setSearching(true)
    
    try {
      // Google Maps Geocoding サービスを使用（クライアントサイド）
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

      // マップの中心を移動
      const location = result.geometry.location
      const newCenter = { lat: location.lat(), lng: location.lng() }
      googleMapRef.current.setCenter(newCenter)
      googleMapRef.current.setZoom(14) // ズームレベルを上げて詳細表示

      // 検索位置にマーカーを一時的に表示
      const searchMarker = new google.maps.Marker({
        position: newCenter,
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#7c3aed',
          fillOpacity: 0.6,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8
        },
        animation: google.maps.Animation.DROP,
      })

      // 3秒後にマーカーを削除
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

  // 現在地を取得
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          
          // 逆ジオコーディングで住所を取得
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                setStartLocation(results[0].formatted_address)
              } else {
                setStartLocation(`${lat}, ${lng}`)
              }
            }
          )
        },
        (error) => {
          console.error('現在地取得エラー:', error)
          alert('現在地の取得に失敗しました。ブラウザの位置情報設定を確認してください。')
        }
      )
    } else {
      alert('このブラウザは位置情報をサポートしていません。')
    }
  }

  // 経路を計算
  const handleCalculateRoute = async () => {
    if (!startLocation.trim() || !selectedJob || !googleMapRef.current) {
      alert('出発地と目的地の求人を選択してください。')
      return
    }

    setCalculatingRoute(true)
    setRouteInfo(null)

    try {
      const directionsService = new google.maps.DirectionsService()
      
      // 目的地を住所優先で指定（TRANSITモードは座標だけだと失敗しやすい）
      const destination = selectedJob.store?.address 
        ? selectedJob.store.address  // 住所がある場合は住所を使用
        : selectedJob.store?.name 
        ? `${selectedJob.store.name}, 日本`  // 店舗名がある場合は店舗名を使用
        : `${selectedJob.latitude},${selectedJob.longitude}`  // 最終手段として座標
      
      // TRANSITモード用のdepartureTimeを設定（深夜は翌朝に設定）
      const getDepartureTime = () => {
        const now = new Date()
        const hour = now.getHours()
        
        // 深夜（0時〜5時）の場合は、同日〆6時に設定
        if (hour >= 0 && hour < 6) {
          const morning = new Date(now)
          morning.setHours(6, 0, 0, 0)
          return morning
        }
        return now
      }
      
      const request: google.maps.DirectionsRequest = {
        origin: startLocation,
        destination,
        travelMode: google.maps.TravelMode[travelMode],
        unitSystem: google.maps.UnitSystem.METRIC,
        region: 'JP',  // 日本での検索を明示
        language: 'ja',  // 日本語で検索
        provideRouteAlternatives: true,  // 複数のルートを取得
        ...(travelMode === 'TRANSIT' && {
          transitOptions: {
            departureTime: getDepartureTime(),  // 深夜対応の出発時刻
            modes: [google.maps.TransitMode.TRAIN, google.maps.TransitMode.BUS],  // 電車とバスを使用
            routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS  // 乗り換え少な目優先
          }
        })
      }

      console.log('経路検索リクエスト:', {
        ...request,
        storeInfo: {
          name: selectedJob.store?.name,
          address: selectedJob.store?.address,
          coordinates: `${selectedJob.latitude},${selectedJob.longitude}`
        }
      })
      
      // transitOptionsの詳細を確認
      if (travelMode === 'TRANSIT' && request.transitOptions) {
        console.log('transitOptions詳細:', {
          departureTime: request.transitOptions.departureTime,
          modes: request.transitOptions.modes,
          routingPreference: request.transitOptions.routingPreference
        })
      }

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result)
          } else {
            // エラーの詳細情報
            let errorMessage = '経路が見つかりませんでした。'
            if (status === 'ZERO_RESULTS') {
              if (travelMode === 'TRANSIT') {
                const hour = new Date().getHours()
                const isLateNight = hour >= 1 && hour < 5
                const nightMessage = isLateNight ? '\n\n※ 深夜は電車が運行していないため、翌朝6時以降の経路を検索しています。' : ''
                errorMessage = `公共交通機関（電車・バス）での経路が見つかりませんでした。${nightMessage}\n\n出発地: ${startLocation}\n目的地: ${selectedJob.store?.name || '店舗'}\n\n▼ 以下をお試しください：\n・ 🚗 「車」モードで経路を検索\n・ 🚶 「徒歩」モードで距離を確認\n・ 出発地をより具体的に入力（例: “渋谷駅”）`
              } else if (travelMode === 'DRIVING') {
                errorMessage = `車での経路が見つかりませんでした。\n\n出発地: ${startLocation}\n目的地: ${selectedJob.store?.name || '店舗'}\n\n住所を正確に入力するか、別の移動手段を試してください。`
              } else {
                errorMessage = `徒歩での経路が見つかりませんでした。\n\n出発地: ${startLocation}\n目的地: ${selectedJob.store?.name || '店舗'}\n\n住所を正確に入力するか、別の移動手段を試してください。`
              }
            } else if (status === 'NOT_FOUND') {
              errorMessage = '出発地または目的地が見つかりませんでした。住所を確認してください。'
            } else if (status === 'REQUEST_DENIED') {
              errorMessage = 'APIキーの設定を確認してください。Directions APIが有効で、課金設定がされているか確認してください。'
            }
            reject(new Error(errorMessage))
          }
        })
      })

      // 経路を地図上に表示
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result)
      }

      // 経路情報を抽出
      const route = result.routes[0]
      const leg = route.legs[0]
      
      const transitDetails = leg.steps
        .filter(step => step.travel_mode === 'TRANSIT')
        .map(step => ({
          instructions: step.instructions,
          transit: step.transit
        }))

      setRouteInfo({
        duration: leg.duration?.text || '',
        distance: leg.distance?.text || '',
        steps: leg.steps,
        transitDetails: transitDetails.length > 0 ? transitDetails : undefined
      })
      
      setShowRoutePanel(true)

    } catch (error) {
      console.error('経路計算エラー:', error)
      alert(error instanceof Error ? error.message : '経路の計算に失敗しました')
    } finally {
      setCalculatingRoute(false)
    }
  }

  // 経路をクリア
  const handleClearRoute = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as any)
    }
    setRouteInfo(null)
    setShowRoutePanel(false)
    setStartLocation('')
  }

  useEffect(() => {
    const initMap = async () => {
      try {
        // Google Maps スクリプトをロード
        await loadGoogleMapsScript()
        
        if (!mapRef.current) return

        // 東京の中心座標（東京駅周辺）
        const center = { lat: 35.6812, lng: 139.7671 }

        // マップを初期化（東京全体が見えるズームレベル）
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 10, // 東京全体が見えるズームレベル
          mapId: 'job_map_view', // Map ID for advanced markers
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        googleMapRef.current = map

        // InfoWindow を作成
        infoWindowRef.current = new google.maps.InfoWindow()
        
        // DirectionsRenderer を初期化
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#7c3aed',
            strokeWeight: 5,
            strokeOpacity: 0.7
          }
        })

        // マーカーを配置
        createMarkers(map)

        // デフォルト位置は常に東京駅を維持（fitBoundsは実行しない）
        // ユーザーが検索機能やマップ操作で位置を変更できます
        console.log('✅ マップを東京駅中心で表示します（デフォルト位置）')
        console.log(`📍 求人データ数: ${jobsWithLocation.length}件`)

        setLoading(false)
      } catch (err) {
        console.error('Google Maps の初期化に失敗しました:', err)
        setError('地図の読み込みに失敗しました。APIキーを確認してください。')
        setLoading(false)
      }
    }

    initMap()

    // クリーンアップ
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  // マーカーを再作成（求人データが変更された時）
  useEffect(() => {
    if (googleMapRef.current) {
      createMarkers(googleMapRef.current)
    }
  }, [jobs, stores, companies])

  const createMarkers = (map: google.maps.Map) => {
    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // 新しいマーカーを作成
    jobsWithLocation.forEach((job, index) => {
      if (!job.latitude || !job.longitude) {
        return
      }

      const marker = new google.maps.Marker({
        position: { lat: job.latitude, lng: job.longitude },
        map,
        title: job.displayTitle || job.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: getMarkerColor(job.status),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10
        }
      })

      // マーカークリック時の処理
      marker.addListener('click', () => {
        setSelectedJob(job)

        // コールバック実行
        if (onJobClick) {
          onJobClick(job.id)
        }
      })

      markersRef.current.push(marker)
    })
  }

  const getMarkerColor = (status: Job['status']): string => {
    switch (status) {
      case 'active':
        return '#22c55e' // green
      case 'draft':
        return '#94a3b8' // gray
      case 'closed':
        return '#ef4444' // red
      default:
        return '#3b82f6' // blue
    }
  }

  const createInfoWindowContent = (job: JobWithLocation): string => {
    return `
      <div style="padding: 8px; max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${job.title}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; background: ${
            job.status === 'active' ? '#dcfce7' : '#f1f5f9'
          }; color: ${
            job.status === 'active' ? '#166534' : '#64748b'
          }; border-radius: 4px; font-size: 12px;">
            ${job.status === 'active' ? '募集中' : job.status === 'draft' ? '下書き' : '募集終了'}
          </span>
        </div>
        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
          <strong>企業:</strong> ${job.company?.name || ''}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
          <strong>店舗:</strong> ${job.store?.name || ''}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
          <strong>雇用形態:</strong> ${job.employmentType}
        </p>
        ${job.salaryInexperienced || job.salaryExperienced ? `
          <p style="margin: 4px 0; font-size: 14px; color: #64748b;">
            <strong>給与:</strong> ${job.salaryInexperienced || job.salaryExperienced}
          </p>
        ` : ''}
        <div style="margin-top: 12px;">
          <a href="/jobs/${job.id}" 
             style="display: inline-block; padding: 6px 12px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">地図を読み込み中...</p>
          </div>
        </div>
      )}
      
      {/* 検索窓 */}
      <div className="absolute top-4 right-4 z-10 w-80 space-y-2">
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
            className="bg-purple-600 hover:bg-purple-700"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* 経路検索パネル */}
        {selectedJob && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">経路検索</span>
            </div>
            
            {/* 出発地入力 */}
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="出発地を入力"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGetCurrentLocation}
                  title="現在地を取得"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 移動手段選択 */}
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                size="sm"
                variant={travelMode === 'TRANSIT' ? 'default' : 'outline'}
                onClick={() => setTravelMode('TRANSIT')}
                className={travelMode === 'TRANSIT' ? 'bg-purple-600' : ''}
              >
                <Train className="h-4 w-4 mr-1" />
                電車
              </Button>
              <Button
                type="button"
                size="sm"
                variant={travelMode === 'DRIVING' ? 'default' : 'outline'}
                onClick={() => setTravelMode('DRIVING')}
                className={travelMode === 'DRIVING' ? 'bg-purple-600' : ''}
              >
                <Car className="h-4 w-4 mr-1" />
                車
              </Button>
              <Button
                type="button"
                size="sm"
                variant={travelMode === 'WALKING' ? 'default' : 'outline'}
                onClick={() => setTravelMode('WALKING')}
                className={travelMode === 'WALKING' ? 'bg-purple-600' : ''}
              >
                <Footprints className="h-4 w-4 mr-1" />
                徒歩
              </Button>
            </div>
            
            {/* 経路計算ボタン */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCalculateRoute}
                disabled={!startLocation.trim() || calculatingRoute}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {calculatingRoute ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  '経路を検索'
                )}
              </Button>
              {routeInfo && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearRoute}
                >
                  クリア
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div ref={mapRef} className="w-full h-full rounded-lg shadow-lg" />

      {/* 統計情報 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-purple-600" />
          <span className="font-semibold">求人マップ</span>
        </div>
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>募集中: {jobsWithLocation.filter(j => j.status === 'active').length}件</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>下書き: {jobsWithLocation.filter(j => j.status === 'draft').length}件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>募集終了: {jobsWithLocation.filter(j => j.status === 'closed').length}件</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          合計: {jobsWithLocation.length}件
        </div>
      </div>

      {/* 選択された求人の詳細カード */}
      {selectedJob && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 z-10 max-w-md">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg">{selectedJob.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedJob(null)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={selectedJob.status === 'active' ? 'default' : 'secondary'}>
                {selectedJob.status === 'active' ? '募集中' : selectedJob.status === 'draft' ? '下書き' : '募集終了'}
              </Badge>
              <Badge variant="outline">{selectedJob.employmentType}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              <strong>企業:</strong> {selectedJob.company?.name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>店舗:</strong> {selectedJob.store?.name}
            </p>
            {(selectedJob.salaryInexperienced || selectedJob.salaryExperienced) && (
              <p className="text-sm text-gray-600">
                <strong>給与:</strong> {selectedJob.salaryInexperienced || selectedJob.salaryExperienced}
              </p>
            )}
            <Link href={`/jobs/${selectedJob.id}`}>
              <Button className="w-full mt-2 bg-purple-600 hover:bg-purple-700">
                <Eye className="h-4 w-4 mr-2" />
                詳細を見る
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* 経路情報パネル */}
      {showRoutePanel && routeInfo && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 z-20 max-w-sm max-h-[500px] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-lg">経路情報</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoutePanel(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 移動手段アイコン */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-lg">
            {travelMode === 'TRANSIT' && <Train className="h-5 w-5 text-purple-600" />}
            {travelMode === 'DRIVING' && <Car className="h-5 w-5 text-purple-600" />}
            {travelMode === 'WALKING' && <Footprints className="h-5 w-5 text-purple-600" />}
            <div>
              <div className="font-semibold text-purple-900">
                {travelMode === 'TRANSIT' && '電車'}
                {travelMode === 'DRIVING' && '車'}
                {travelMode === 'WALKING' && '徒歩'}
              </div>
              <div className="text-sm text-purple-700">
                {routeInfo.duration} • {routeInfo.distance}
              </div>
            </div>
          </div>
          
          {/* 電車の乗り換え情報 */}
          {travelMode === 'TRANSIT' && routeInfo.transitDetails && routeInfo.transitDetails.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">乗り換え情報</h4>
              <div className="space-y-2">
                {routeInfo.transitDetails.map((detail, index) => {
                  const transit = detail.transit
                  return (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Train className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">{transit?.line?.name || '路線'}</span>
                      </div>
                      <div className="text-xs text-gray-600 ml-6">
                        <div>{transit?.departure_stop?.name} → {transit?.arrival_stop?.name}</div>
                        <div className="text-gray-500">
                          {transit?.num_stops ? `${transit.num_stops}駅` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* 詳細ステップ */}
          <div>
            <h4 className="font-semibold text-sm mb-2">詳細ルート</h4>
            <div className="space-y-2">
              {routeInfo.steps.map((step, index) => (
                <div key={index} className="text-xs text-gray-600 pb-2 border-b last:border-b-0">
                  <div 
                    dangerouslySetInnerHTML={{ __html: step.instructions }} 
                    className="leading-relaxed"
                  />
                  <div className="text-gray-500 mt-1">
                    {step.distance?.text} • {step.duration?.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
