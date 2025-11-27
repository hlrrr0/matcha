/**
 * Google Calendar統合
 * 面接日程をGoogleカレンダーに登録する機能
 */

import { User as FirebaseUser } from 'firebase/auth'

interface CalendarEvent {
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{ email: string }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

/**
 * Google CalendarにイベントIDを作成する
 * Firebase AuthのアクセストークンからGoogle Calendar APIを呼び出す
 */
export async function createGoogleCalendarEvent(
  user: FirebaseUser,
  event: CalendarEvent
): Promise<string | null> {
  try {
    // Firebase AuthからGoogle OAuth2トークンを取得
    const credential = await user.getIdTokenResult()
    
    // Google Calendar API呼び出し用のトークンが必要
    // Note: Firebase Authの設定でGoogle認証が必要
    const response = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credential.token}`
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      throw new Error('カレンダーイベントの作成に失敗しました')
    }

    const data = await response.json()
    return data.eventId
  } catch (error) {
    console.error('Google Calendar API エラー:', error)
    return null
  }
}

/**
 * 面接日程からカレンダーイベントを生成
 */
export function createInterviewEvent(
  candidateName: string,
  companyName: string,
  jobTitle: string,
  interviewDate: Date,
  duration: number = 60, // デフォルト60分
  notes?: string,
  storeAddress?: string
): CalendarEvent {
  const startTime = new Date(interviewDate)
  const endTime = new Date(startTime.getTime() + duration * 60000)

  return {
    summary: `面接: ${candidateName} - ${companyName}`,
    description: `
【求職者】${candidateName}
【企業】${companyName}
【職種】${jobTitle}

${notes ? `【備考】\n${notes}` : ''}

※このイベントは人材紹介システムから自動登録されました
    `.trim(),
    location: storeAddress || companyName,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Tokyo'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Tokyo'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1日前
        { method: 'popup', minutes: 30 }       // 30分前
      ]
    }
  }
}

/**
 * カレンダーイベントのURL生成（Google Calendarへの追加リンク）
 * APIを使用しない場合の代替手段
 * 
 * @param title - イベントタイトル
 * @param startDate - 開始日時
 * @param endDate - 終了日時
 * @param description - イベント説明
 * @param location - 場所
 * @param calendarId - カレンダーID（例: 'primary' または特定のカレンダーID）
 */
export function generateGoogleCalendarUrl(
  title: string,
  startDate: Date,
  endDate: Date,
  description?: string,
  location?: string,
  calendarId?: string
): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: description || '',
    location: location || '',
    trp: 'true' // Show event details
  })

  // カレンダーIDが指定されている場合は追加
  if (calendarId) {
    params.append('src', calendarId)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * 環境変数からデフォルトのカレンダーIDを取得
 */
export function getDefaultCalendarId(): string | undefined {
  return process.env.NEXT_PUBLIC_DEFAULT_CALENDAR_ID
}
