import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: '住所が指定されていません' },
        { status: 400 }
      )
    }

    // サーバーサイド用のAPIキーを使用（NEXT_PUBLIC_なし）
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps APIキーが設定されていません' },
        { status: 500 }
      )
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return NextResponse.json({
        lat: location.lat,
        lng: location.lng
      })
    } else if (data.status === 'REQUEST_DENIED') {
      return NextResponse.json(
        { error: `APIリクエストが拒否されました: ${data.error_message}` },
        { status: 403 }
      )
    } else {
      return NextResponse.json(
        { error: `住所の変換に失敗しました: ${data.status}` },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: error.message || 'サーバーエラー' },
      { status: 500 }
    )
  }
}
