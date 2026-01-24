/**
 * Slackテスト通知API
 * GET /api/slack/test?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendTestNotification } from '@/lib/slack/notifications'
import { initializeAdminApp } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが指定されていません' },
        { status: 400 }
      )
    }

    // Firebase AdminでユーザーデータをFirestoreから取得
    const { db } = initializeAdminApp()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    
    if (!userData?.slackId) {
      return NextResponse.json(
        { success: false, error: 'Slack IDが設定されていません' },
        { status: 400 }
      )
    }

    // テスト通知を送信
    await sendTestNotification(userData.slackId)

    return NextResponse.json({
      success: true,
      message: 'テスト通知を送信しました',
    })
  } catch (error: any) {
    console.error('[API] Slackテスト通知エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || '通知送信に失敗しました' },
      { status: 500 }
    )
  }
}
