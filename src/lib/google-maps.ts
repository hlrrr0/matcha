/**
 * Google Maps JavaScript API ユーティリティ関数
 */

// Geocoding API を使って住所から緯度経度を取得
// サーバーサイドプロキシ経由で呼び出し（HTTPリファラー制限の回避）
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log('Geocoding API リクエスト:', address)
    
    // Next.js API Route経由で呼び出し
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Geocoding API エラー:', data.error)
      throw new Error(data.error || '緯度経度の取得に失敗しました')
    }

    console.log('緯度経度取得成功:', data)
    return {
      lat: data.lat,
      lng: data.lng
    }
  } catch (error) {
    console.error('Geocoding APIエラー:', error)
    throw error
  }
}

// Google Maps JavaScript APIのスクリプトを動的にロード
export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 既にロード済みの場合
    if (window.google?.maps) {
      resolve()
      return
    }

    // 既にスクリプトタグが存在する場合
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('Google Maps APIキーが設定されていません'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = (error) => reject(error)
    document.head.appendChild(script)
  })
}

// 緯度経度から住所を取得（逆ジオコーディング）
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    console.error('Google Maps APIキーが設定されていません')
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address
    } else {
      console.error('逆ジオコーディングに失敗しました:', data.status)
      return null
    }
  } catch (error) {
    console.error('逆ジオコーディングエラー:', error)
    return null
  }
}
