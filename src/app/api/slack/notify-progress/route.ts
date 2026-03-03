// 進捗更新のSlack通知API
import { NextRequest, NextResponse } from 'next/server'
import { initializeAdminApp } from '@/lib/firebase-admin'
import { Match } from '@/types/matching'

export async function POST(request: NextRequest) {
  try {
    const { matchId, candidateId, jobId, companyId, status, eventDate, notes } = await request.json()

    console.log('🔔 [Slack API] 通知処理開始:', { matchId, status, candidateId })
    
    // 通知対象のステータスをフィルタリング
    const notifiableStatuses = [
      'applied',
      'document_passed',
      'interview',
      'interview_passed',
      'offer',
      'offer_accepted'
    ]

    if (!notifiableStatuses.includes(status)) {
      console.log('[Slack API] 通知対象外のステータスです:', status)
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log('[Slack API] 関連データを取得中...')
    
    // Firebase Admin SDKでデータを取得
    const { db } = initializeAdminApp()
    
    const [candidateDoc, jobDoc, companyDoc] = await Promise.all([
      db.collection('candidates').doc(candidateId).get(),
      db.collection('jobs').doc(jobId).get(),
      db.collection('companies').doc(companyId).get()
    ])

    const candidate = candidateDoc.data()
    const job = jobDoc.data()
    const company = companyDoc.data()

    console.log('[Slack API] データ取得結果:', {
      hasCandidate: !!candidate,
      hasJob: !!job,
      hasCompany: !!company
    })

    if (!candidate || !job || !company) {
      console.log('[Slack API] 必要な情報が取得できませんでした')
      return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 })
    }

    // 通知対象の担当者を収集
    const notifyUserIds: string[] = []
    
    // 候補者の担当者
    if (candidate.assignedUserId) {
      notifyUserIds.push(candidate.assignedUserId)
    }
    
    // 企業の担当者
    if (company.assignedUserId && !notifyUserIds.includes(company.assignedUserId)) {
      notifyUserIds.push(company.assignedUserId)
    }

    if (notifyUserIds.length === 0) {
      console.log('[Slack API] 通知対象の担当者が設定されていません')
      return NextResponse.json({ success: true, skipped: true })
    }

    console.log('[Slack API] 通知対象担当者:', notifyUserIds)

    // 担当者情報を取得
    const userDocs = await Promise.all(
      notifyUserIds.map(userId => db.collection('users').doc(userId).get())
    )

    // Slack通知ライブラリを動的インポート
    const { sendProgressNotification } = await import('@/lib/slack/notifications')
    
    // 詳細ページのURL
    // 優先順位: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const detailUrl = `${baseUrl}/progress/${matchId}`
    
    // 各担当者に通知を送信
    let sentCount = 0
    for (let i = 0; i < userDocs.length; i++) {
      const userDoc = userDocs[i]
      const userId = notifyUserIds[i]
      
      if (!userDoc.exists) {
        console.log('[Slack API] 担当者が見つかりません:', userId)
        continue
      }

      const user = userDoc.data()

      console.log('[Slack API] 担当者確認:', {
        userId,
        userName: user?.displayName,
        slackId: user?.slackId
      })

      if (!user?.slackId) {
        console.log('[Slack API] 担当者にSlack IDが設定されていません', {
          userId,
          userName: user?.displayName
        })
        continue
      }

      try {
        console.log(`[Slack API] 通知送信中... (${i + 1}/${userDocs.length})`)
        await sendProgressNotification({
          slackUserId: user.slackId,
          candidateName: `${candidate.lastName} ${candidate.firstName}`,
          companyName: company.name,
          jobTitle: job.title,
          newStatus: status,
          detailUrl,
          eventDate,
          notes
        })
        sentCount++
        console.log(`✅ [Slack API] 通知送信成功: ${user.displayName}`)
      } catch (error) {
        console.error(`❌ [Slack API] 通知送信失敗: ${user.displayName}`, error)
      }
    }

    console.log(`✅ [Slack API] 通知送信完了: ${sentCount}/${userDocs.length}件`)
    return NextResponse.json({ success: true, sentCount })
  } catch (error) {
    console.error('❌ [Slack API] 通知送信エラー:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
