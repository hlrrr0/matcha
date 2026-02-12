import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { generateCandidateApplicationEmailBody, generateCandidateApplicationEmailSubject } from '@/lib/email-templates'

// 環境変数がない場合はダミーキーを使用（ビルド時のエラー回避）
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build')

export async function POST(request: NextRequest) {
  console.log('📧 メール送信APIが呼び出されました')
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '設定済み' : '未設定')
  console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev (default)')
  
  // 実行時に環境変数がない場合はエラーを返す（ただし、本物のAPIキーでない場合は除外）
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
    console.error('❌ RESEND_API_KEY is not properly configured')
    return NextResponse.json(
      { 
        error: 'RESEND_API_KEYが正しく設定されていません', 
        details: 'Resend (https://resend.com) でAPIキーを取得して、.env.localに設定してください'
      },
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
      notes,
      matchId,
      candidateId,
      jobId,
      companyId,
      sentBy,
      cc
    } = await request.json()

    if (!companyEmail) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // メール本文を構築
    const emailBody = generateCandidateApplicationEmailBody({
      companyName,
      jobTitle,
      candidateName,
      candidatePhone,
      candidateEmail,
      candidateResume,
      notes
    })

    const emailSubject = generateCandidateApplicationEmailSubject({
      candidateName,
      jobTitle
    })

    // Resendを使ってメール送信
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: companyEmail,
      cc: cc || undefined,  // CCがある場合のみ設定
      bcc: 'sales+matcha@super-shift.co.jp',
      subject: emailSubject,
      text: emailBody,
    })

    console.log('✅ メール送信成功:', data)

    // エラーがある場合は処理を中断
    if (data.error) {
      console.error('❌ Resendエラー:', data.error)
      return NextResponse.json(
        { error: 'メール送信に失敗しました', details: data.error },
        { status: 500 }
      )
    }

    // メール送信履歴をFirestoreに保存（Firebase Admin SDK使用）
    const adminDb = getAdminDb()
    await adminDb.collection('emailHistory').add({
      type: 'candidate_application',
      matchId: matchId || null,
      candidateId: candidateId || null,
      jobId: jobId || null,
      companyId: companyId || null,
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: companyEmail,
      cc: cc || null,
      bcc: 'sales+matcha@super-shift.co.jp',
      subject: emailSubject,
      body: emailBody,
      status: 'sent',
      resendId: data.data?.id || null,
      sentBy: sentBy || null,
      sentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    })
    
    console.log('✅ メール履歴をFirestoreに保存しました')

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('メール送信エラー:', error)
    
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message)
      console.error('エラースタック:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: 'メール送信に失敗しました', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
