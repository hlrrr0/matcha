"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Job } from '@/types/job'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { loadGoogleMapsScript } from '@/lib/google-maps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, MapPin, Briefcase } from 'lucide-react'
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

export function JobMapView({ jobs, stores, companies, onJobClick }: JobMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobWithLocation | null>(null)

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

  useEffect(() => {
    const initMap = async () => {
      try {
        // Google Maps スクリプトをロード
        await loadGoogleMapsScript()
        
        if (!mapRef.current) return

        // 大阪の中心座標（大阪市中心部）
        const center = { lat: 34.6937, lng: 135.5023 }

        // マップを初期化（大阪全体が見えるズームレベル）
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 10, // 大阪全体が見えるズームレベル（10-11が適切）
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

        // マーカーを配置
        createMarkers(map)

        // 求人がある場合、範囲を調整（ただし、広がりすぎないように制限）
        if (jobsWithLocation.length > 0) {
          const bounds = new google.maps.LatLngBounds()
          jobsWithLocation.forEach(job => {
            if (job.latitude && job.longitude) {
              bounds.extend({ lat: job.latitude, lng: job.longitude })
            }
          })
          map.fitBounds(bounds)
          
          // ズームレベルが広がりすぎないように制限（最小ズーム: 9）
          google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const currentZoom = map.getZoom()
            if (currentZoom !== undefined && currentZoom < 9) {
              map.setZoom(9)
            }
          })
        }

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
        
        // InfoWindow を表示
        if (infoWindowRef.current) {
          const content = createInfoWindowContent(job)
          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open(map, marker)
        }

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
    </div>
  )
}
