import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, travelMode } = await request.json()

    if (!origin || !destination || !travelMode) {
      return NextResponse.json(
        { error: '出発地、目的地、移動手段は必須です。' },
        { status: 400 }
      )
    }

    // Google Routes APIを呼び出し（サーバーサイド用のAPIキー - 制限なし）
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
    
    // 深夜対応の出発時刻を設定
    const getDepartureTime = () => {
      const now = new Date()
      const hour = now.getHours()
      
      // 深夜（0時〜5時）の場合は、同日の6時に設定
      if (hour >= 0 && hour < 6) {
        const morning = new Date(now)
        morning.setHours(6, 0, 0, 0)
        return morning.toISOString()
      }
      return now.toISOString()
    }

    const requestBody: any = {
      origin: {
        address: origin
      },
      destination: {
        address: destination
      },
      travelMode,
      languageCode: 'ja',
      units: 'METRIC',
      computeAlternativeRoutes: true
    }

    // TRANSITモードの場合はtransitPreferencesを追加
    if (travelMode === 'TRANSIT') {
      requestBody.transitPreferences = {
        allowedTravelModes: ['BUS', 'TRAIN'],
        routingPreference: 'FEWER_TRANSFERS'
      }
      requestBody.departureTime = getDepartureTime()
    }

    console.log('Routes API リクエスト:', requestBody)

    const response = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey || '',
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs'
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Routes API エラー:', errorText)
      return NextResponse.json(
        { error: 'Routes APIからエラーが返されました。', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    console.log('Routes API レスポンス:', JSON.stringify(data, null, 2))

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: '経路が見つかりませんでした。' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('経路検索エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。', details: String(error) },
      { status: 500 }
    )
  }
}
