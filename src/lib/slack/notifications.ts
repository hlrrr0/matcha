/**
 * Slack通知クライアント
 * 進捗更新時に担当者へ通知を送信
 */

import { WebClient } from '@slack/web-api'

// Slack通知が有効かどうか
const isSlackEnabled = process.env.SLACK_ENABLED === 'true'
const slackBotToken = process.env.SLACK_BOT_TOKEN
const slackCandidateBotToken = process.env.SLACK_CANDIDATE_BOT_TOKEN

// Slackクライアントの初期化（進捗通知用）
let slackClient: WebClient | null = null
if (isSlackEnabled && slackBotToken) {
  slackClient = new WebClient(slackBotToken)
}

// Slackクライアントの初期化（求職者連携用）
let slackCandidateClient: WebClient | null = null
if (isSlackEnabled && slackCandidateBotToken) {
  slackCandidateClient = new WebClient(slackCandidateBotToken)
}

/**
 * ステータスに応じた絵文字を取得
 */
function getStatusEmoji(status: string): string {
  const emojiMap: Record<string, string> = {
    suggested: '💡',
    applied: '📝',
    document_screening: '📄',
    document_passed: '✅',
    interview: '🗓️',
    interview_passed: '🎉',
    offer: '🎁',
    offer_accepted: '🎊',
    rejected: '❌',
    withdrawn: '↩️',
  }
  return emojiMap[status] || '📌'
}

/**
 * ステータスの日本語表示名を取得
 */
function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    suggested: '提案',
    applied: '応募',
    document_screening: '書類選考中',
    document_passed: '書類選考通過',
    interview: '面接設定',
    interview_passed: '面接通過',
    offer: '内定',
    offer_accepted: '内定承諾',
    rejected: '不採用',
    withdrawn: '辞退',
  }
  return labelMap[status] || status
}

interface NotificationParams {
  slackUserId: string
  candidateName: string
  companyName: string
  jobTitle?: string
  newStatus: string
  detailUrl: string
  eventDate?: string
  notes?: string
}

/**
 * 進捗更新の通知を送信
 */
export async function sendProgressNotification(params: NotificationParams): Promise<boolean> {
  // Slack通知が無効の場合は何もしない
  if (!isSlackEnabled || !slackClient) {
    console.log('[Slack] 通知機能が無効です')
    return false
  }

  // Slack IDが設定されていない場合は何もしない
  if (!params.slackUserId) {
    console.log('[Slack] ユーザーのSlack IDが設定されていません')
    return false
  }

  try {
    const emoji = getStatusEmoji(params.newStatus)
    const statusLabel = getStatusLabel(params.newStatus)
    
    // メッセージブロックの構築
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} 進捗更新通知`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*候補者:*\n${params.candidateName}`,
          },
          {
            type: 'mrkdwn',
            text: `*企業:*\n${params.companyName}`,
          },
        ],
      },
    ]

    // 求人タイトルがある場合は追加
    if (params.jobTitle) {
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*求人:*\n${params.jobTitle}`,
          },
        ],
      })
    }

    // 新しいステータス
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*新しいステータス:*\n${emoji} ${statusLabel}`,
        },
      ],
    })

    // イベント日（面接日程など）がある場合は追加
    if (params.eventDate) {
      try {
        const date = new Date(params.eventDate)
        if (!isNaN(date.getTime())) {
          const dateStr = date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tokyo'
          })
          blocks.push({
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*日時:*\n📅 ${dateStr}`,
              },
            ],
          })
        }
      } catch (error) {
        console.error('[Slack] 日付のフォーマットに失敗:', error)
      }
    }

    // メモがある場合は追加
    if (params.notes) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*メモ:*\n${params.notes}`,
        },
      })
    }

    // 詳細ページへのリンク
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '詳細を見る',
            emoji: true,
          },
          url: params.detailUrl,
          style: 'primary',
        },
      ],
    })

    // Slackメッセージを送信
    console.log('[Slack] メッセージ送信開始:', {
      channel: params.slackUserId,
      hasBlocks: blocks.length > 0
    })
    
    const result = await slackClient.chat.postMessage({
      channel: params.slackUserId,
      text: `${emoji} ${params.candidateName}さんの進捗が「${statusLabel}」に更新されました`,
      blocks,
    })

    console.log('[Slack] 通知送信成功:', {
      channel: params.slackUserId,
      ts: result.ts,
    })

    return true
  } catch (error: any) {
    console.error('[Slack] 通知送信失敗:', {
      error: error.message,
      code: error.code,
      data: error.data,
      slackUserId: params.slackUserId
    })
    // エラーが発生しても処理は続行（通知失敗で全体の処理を止めない）
    return false
  }
}

/**
 * テスト通知を送信
 */
export async function sendTestNotification(slackUserId: string): Promise<boolean> {
  if (!isSlackEnabled || !slackClient) {
    throw new Error('Slack通知が有効になっていません')
  }

  if (!slackUserId) {
    throw new Error('Slack IDが指定されていません')
  }

  try {
    console.log('[Slack] テスト通知送信開始:', { slackUserId })
    
    const result = await slackClient.chat.postMessage({
      channel: slackUserId,
      text: '🧪 これはテスト通知です',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 テスト通知',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Slack通知が正常に設定されています。\n進捗更新時にこのような通知が届きます。',
          },
        },
      ],
    })

    console.log('[Slack] テスト通知送信成功:', {
      channel: slackUserId,
      ts: result.ts,
    })

    return true
  } catch (error: any) {
    console.error('[Slack] テスト通知送信失敗:', {
      error: error.message,
      code: error.code,
      data: error.data,
      slackUserId
    })
    throw error
  }
}

/**
 * メールアドレスからSlack IDを取得
 */
export async function getSlackIdByEmail(email: string): Promise<string | null> {
  if (!isSlackEnabled || !slackClient) {
    throw new Error('Slack通知が有効になっていません')
  }

  try {
    const result = await slackClient.users.lookupByEmail({ email })
    return result.user?.id || null
  } catch (error) {
    console.error('[Slack] ユーザー検索失敗:', error)
    return null
  }
}

/**
 * スレッドURLを生成
 * @param channelId SlackチャンネルID
 * @param messageTs メッセージタイムスタンプ
 * @returns スレッドURL
 */
export function generateSlackThreadUrl(channelId: string, messageTs: string): string {
  const workspaceDomain = process.env.SLACK_WORKSPACE_DOMAIN || 'your-workspace'
  
  // メッセージタイムスタンプから小数点を削除（例: 1769340801.064719 → 1769340801064719）
  const messageTsFormatted = messageTs.replace('.', '')
  
  // Slackの直接URLを生成
  // 形式: https://{workspace}.slack.com/archives/{channel_id}/p{message_ts_without_dot}
  return `https://${workspaceDomain}.slack.com/archives/${channelId}/p${messageTsFormatted}`
}

interface SendCandidateParentMessageParams {
  candidateName: string      // 求職者氏名
  campus?: string            // 入学校舎
  age?: number               // 年齢
  enrollmentDate?: string    // 入学年月
  channelId: string          // 送信先チャンネルID
}

interface SendCandidateParentMessageResult {
  success: boolean
  channelId?: string
  messageTs?: string
  threadUrl?: string
  error?: string
}

/**
 * 求職者の親メッセージをSlackチャンネルに送信
 * @param params 送信パラメータ
 * @returns 送信結果（スレッドURL含む）
 */
export async function sendCandidateParentMessage(
  params: SendCandidateParentMessageParams
): Promise<SendCandidateParentMessageResult> {
  // Slack Candidate Bot（求職者連携用）が無効の場合
  if (!isSlackEnabled || !slackCandidateClient) {
    console.log('[Slack] 求職者連携Bot（SLACK_CANDIDATE_BOT_TOKEN）が無効です')
    return {
      success: false,
      error: 'Slack求職者連携Botが有効になっていません。SLACK_CANDIDATE_BOT_TOKENを設定してください。'
    }
  }

  try {
    // メッセージテキストの構築
    let messageText = params.candidateName
    
    const additionalInfo: string[] = []
    if (params.campus) {
      const campusLabels: Record<string, string> = {
        tokyo: '東京校',
        osaka: '大阪校',
        awaji: '淡路校',
        fukuoka: '福岡校',
        taiwan: '台湾校'
      }
      additionalInfo.push(campusLabels[params.campus] || params.campus)
    }
    if (params.age) {
      additionalInfo.push(`${params.age}歳`)
    }
    if (params.enrollmentDate) {
      additionalInfo.push(params.enrollmentDate)
    }
    
    if (additionalInfo.length > 0) {
      messageText += `（${additionalInfo.join('・')}）`
    }

    // Slackに親メッセージを投稿（求職者連携用クライアントを使用）
    console.log('[Slack] 親メッセージ送信開始:', {
      channel: params.channelId,
      text: messageText
    })
    
    const result = await slackCandidateClient.chat.postMessage({
      channel: params.channelId,
      text: messageText
    })

    if (!result.ok || !result.ts) {
      throw new Error('Slackメッセージの送信に失敗しました')
    }

    // スレッドURLを生成
    const threadUrl = generateSlackThreadUrl(params.channelId, result.ts)

    console.log('[Slack] 親メッセージ送信成功:', {
      channel: params.channelId,
      ts: result.ts,
      threadUrl
    })

    return {
      success: true,
      channelId: params.channelId,
      messageTs: result.ts,
      threadUrl
    }
  } catch (error: any) {
    console.error('[Slack] 親メッセージ送信失敗:', {
      error: error.message,
      code: error.code,
      data: error.data
    })
    
    // Slackエラーを分かりやすいメッセージに変換
    let errorMessage = error.message || 'Slackメッセージの送信に失敗しました'
    
    if (error.data?.error === 'not_in_channel') {
      errorMessage = 'Slack Botがチャンネルのメンバーではありません。チャンネルで `/invite @Bot名` を実行してBotを招待してください。'
    } else if (error.data?.error === 'channel_not_found') {
      errorMessage = '指定されたチャンネルが見つかりません。チャンネルIDを確認してください。'
    } else if (error.data?.error === 'invalid_auth' || error.data?.error === 'not_authed') {
      errorMessage = 'Slack認証に失敗しました。SLACK_BOT_TOKENを確認してください。'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}
