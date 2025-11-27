import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Calendar API - イベント作成エンドポイント
 * 
 * このエンドポイントは、ユーザーのGoogle Calendarに面接イベントを作成します。
 * 
 * セットアップ手順:
 * 1. Google Cloud Consoleでプロジェクトを作成
 * 2. Google Calendar APIを有効化
 * 3. OAuth 2.0認証情報を作成
 * 4. Firebase AuthenticationでGoogleプロバイダーを設定
 * 5. 必要なスコープ: https://www.googleapis.com/auth/calendar.events
 * 
 * 環境変数:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const eventData = await req.json()

    // TODO: Firebase Admin SDKでトークン検証
    // const decodedToken = await admin.auth().verifyIdToken(token)
    
    // Google Calendar API呼び出し
    // Note: この実装には、ユーザーのGoogle OAuth2トークンが必要です
    // Firebase Authenticationで取得したGoogle認証情報を使用します
    
    // 現時点では簡易実装として、カレンダーURL生成のみを提供
    console.log('Calendar event request:', eventData)

    // 実際のAPI実装は以下のようになります:
    /*
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData
    })
    */

    return NextResponse.json({
      success: true,
      message: 'この機能は現在準備中です。カレンダーリンクをご利用ください。',
      eventId: null
    })

  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'カレンダーイベントの作成に失敗しました' },
      { status: 500 }
    )
  }
}
