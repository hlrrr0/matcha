import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// 環境変数がない場合はダミーキーを使用（ビルド時のエラー回避）
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build')

export async function POST(request: NextRequest) {
  // 実行時に環境変数がない場合はエラーを返す
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEYが設定されていません' },
      { status: 500 }
    )
  }
  try {
    const { 
      companyEmail, 
      companyName, 
      candidateName,
      candidatePhone,
      candidateEmail,
      candidateResume,
      jobTitle,
      notes 
    } = await request.json()

    if (!companyEmail) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // メール本文を構築
    const emailBody = `
${companyName} 御中

いつもお世話になっております。
求職者の応募情報をお送りいたします。

━━━━━━━━━━━━━━━━━━━━━━━━
■ 求人情報
━━━━━━━━━━━━━━━━━━━━━━━━
求人タイトル: ${jobTitle}

━━━━━━━━━━━━━━━━━━━━━━━━
■ 候補者情報
━━━━━━━━━━━━━━━━━━━━━━━━
氏名: ${candidateName}
電話番号: ${candidatePhone || '未入力'}
メールアドレス: ${candidateEmail || '未入力'}

${candidateResume ? `■ 先生からのコメント
${candidateResume}` : ''}

${notes ? `■ 備考
${notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━

ご確認の上、次のステップへお進みください。
ご不明な点がございましたら、お気軽にお問い合わせください。

何卒よろしくお願い申し上げます。
`

    // Resendを使ってメール送信
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: companyEmail,
      subject: `【求職者応募】${candidateName}様 - ${jobTitle}`,
      text: emailBody,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('メール送信エラー:', error)
    return NextResponse.json(
      { error: 'メール送信に失敗しました', details: error },
      { status: 500 }
    )
  }
}
