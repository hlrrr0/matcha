/**
 * 求職者のSlack親メッセージ送信API
 * POST /api/slack/send-candidate-message
 * 
 * リクエストボディ:
 * {
 *   "candidateId": "候補者ID",
 *   "channelId": "C07R84TQD4J" (デフォルト)
 * }
 * 
 * レスポンス:
 * {
 *   "success": true,
 *   "channelId": "C07R84TQD4J",
 *   "messageTs": "1716871234.567890",
 *   "threadUrl": "https://slack.com/app_redirect?channel=..."
 * }
 */

import { NextResponse } from 'next/server'
import { initializeAdminApp } from '@/lib/firebase-admin'
import { sendCandidateParentMessage } from '@/lib/slack/notifications'
import { Candidate } from '@/types/candidate'

// デフォルトチャンネルID
const DEFAULT_CHANNEL_ID = 'C07R84TQD4J'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { candidateId, channelId = DEFAULT_CHANNEL_ID } = body

    if (!candidateId) {
      return NextResponse.json(
        { success: false, error: '候補者IDが指定されていません' },
        { status: 400 }
      )
    }

    console.log('[Slack API] 候補者メッセージ送信開始:', { candidateId, channelId })

    // Firebase Admin SDKでデータを取得
    const { db } = initializeAdminApp()
    
    // 候補者データを取得
    const candidateDoc = await db.collection('candidates').doc(candidateId).get()

    if (!candidateDoc.exists) {
      return NextResponse.json(
        { success: false, error: '候補者が見つかりません' },
        { status: 404 }
      )
    }

    const candidate = candidateDoc.data() as Candidate

    // 年齢を計算
    let age: number | undefined
    if (candidate.dateOfBirth) {
      const birthDate = new Date(candidate.dateOfBirth)
      const today = new Date()
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    // 入学年月のフォーマット
    let enrollmentDate: string | undefined
    if (candidate.enrollmentDate) {
      const date = new Date(candidate.enrollmentDate)
      enrollmentDate = `${date.getFullYear()}年${date.getMonth() + 1}月`
    }

    // Slackに親メッセージを送信
    const result = await sendCandidateParentMessage({
      candidateName: `${candidate.lastName} ${candidate.firstName}`,
      campus: candidate.campus,
      age,
      enrollmentDate,
      channelId
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'メッセージ送信に失敗しました' },
        { status: 500 }
      )
    }

    // FirestoreにSlack情報を保存
    await db.collection('candidates').doc(candidateId).update({
      slackChannelId: result.channelId,
      slackMessageTs: result.messageTs,
      slackThreadUrl: result.threadUrl,
      updatedAt: new Date().toISOString()
    })

    console.log('[Slack API] 候補者メッセージ送信完了:', {
      candidateId,
      threadUrl: result.threadUrl
    })

    return NextResponse.json({
      success: true,
      channelId: result.channelId,
      messageTs: result.messageTs,
      threadUrl: result.threadUrl
    })

  } catch (error: any) {
    console.error('[Slack API] エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
