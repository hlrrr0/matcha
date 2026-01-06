import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/rateLimit'
import { exportPublicJobs } from '@/lib/api/jobExport'

export async function GET(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('X-API-Key')
    const client = await verifyApiKey(apiKey)
    
    if (!client) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Invalid API key' 
          } 
        },
        { status: 401 }
      )
    }

    // レート制限チェック（1日単位）
    const rateLimitOk = await checkRateLimit(client)
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'TOO_MANY_REQUESTS', 
            message: 'Daily rate limit exceeded. Please try again tomorrow.' 
          } 
        },
        { status: 429 }
      )
    }

    // パラメータ取得
    const { searchParams } = new URL(request.url)
    const includeCompanies = searchParams.get('includeCompanies') !== 'false'
    const includeStores = searchParams.get('includeStores') !== 'false'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 50) : 50 // 1-50の範囲で制限

    // データエクスポート
    const data = await exportPublicJobs({
      includeCompanies,
      includeStores,
      limit
    })

    // レスポンス
    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=21600', // 6時間キャッシュ
        }
      }
    )
  } catch (error: any) {
    console.error('Export API error:', error)
    
    // 本番環境では詳細なエラーメッセージを隠す
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : error.message
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: errorMessage 
        } 
      },
      { status: 500 }
    )
  }
}
