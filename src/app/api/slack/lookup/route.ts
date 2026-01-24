/**
 * Slack ID検索API
 * GET /api/slack/lookup?email=xxx@example.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSlackIdByEmail } from '@/lib/slack/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスが指定されていません' },
        { status: 400 }
      )
    }

    // メールアドレスからSlack IDを検索
    const slackId = await getSlackIdByEmail(email)

    if (!slackId) {
      return NextResponse.json(
        { success: false, error: '該当するSlackユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      slackId,
    })
  } catch (error: any) {
    console.error('[API] Slack ID検索エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Slack ID検索に失敗しました' },
      { status: 500 }
    )
  }
}
