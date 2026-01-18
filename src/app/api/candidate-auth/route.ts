import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Resend } from 'resend'

// Resendインスタンス（ビルド時のエラー回避のためダミーキーを使用）
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build')

// 簡易的な認証コード生成（8桁の数字）
function generateAuthCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

// 認証コードをメール送信するAPI
export async function POST(request: NextRequest) {
  try {
    // 実行時に環境変数がない場合はエラーを返す
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEYが設定されていません')
      return NextResponse.json(
        { message: 'メール送信サービスが設定されていません' },
        { status: 500 }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // Firestoreで該当する求職者を検索
    const candidatesRef = collection(db, 'candidates')
    const q = query(
      candidatesRef,
      where('email', '==', email.toLowerCase().trim())
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return NextResponse.json(
        { message: '登録されている求職者が見つかりません' },
        { status: 404 }
      )
    }

    if (snapshot.size > 1) {
      return NextResponse.json(
        { message: '複数の候補が見つかりました。管理者にお問い合わせください' },
        { status: 400 }
      )
    }

    const candidateDoc = snapshot.docs[0]
    const candidateData = candidateDoc.data()
    const candidateId = candidateDoc.id
    const authCode = generateAuthCode()

    // 認証コードをFirestoreに保存（5分間有効）
    await addDoc(collection(db, 'authCodes'), {
      code: authCode,
      email: email.toLowerCase().trim(),
      candidateId,
      expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000), // 5分
      createdAt: Timestamp.now()
    })

    // 求職者の名前を取得
    const candidateName = `${candidateData.lastName || ''} ${candidateData.firstName || ''}`.trim() || 'ご利用者'

    // メール本文を構築
    const emailBody = `
${candidateName} 様

マイページへのログイン認証コードをお送りします。

━━━━━━━━━━━━━━━━━━━━━━━━
認証コード: ${authCode}
━━━━━━━━━━━━━━━━━━━━━━━━

このコードは5分間有効です。
ログイン画面で上記のコードを入力してください。

※このコードを他人に教えないでください。
※心当たりがない場合は、このメールを無視してください。

━━━━━━━━━━━━━━━━━━━━━━━━
人材紹介システム MATCHA
━━━━━━━━━━━━━━━━━━━━━━━━
`

    try {
      // Resendを使ってメール送信
      const data = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: '【MATCHA】マイページログイン認証コード',
        text: emailBody,
      })

      console.log(`認証コード ${authCode} を ${email} に送信しました`)

      return NextResponse.json({
        message: '認証コードをメールアドレスに送信しました',
        // 開発環境のみコードを返す
        ...(process.env.NODE_ENV === 'development' && { authCode }),
      })
    } catch (emailError) {
      console.error('メール送信エラー:', emailError)
      // メール送信に失敗した場合
      return NextResponse.json(
        { message: 'メールの送信に失敗しました。しばらく時間をおいて再度お試しください' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('認証コード生成エラー:', error)
    return NextResponse.json(
      { message: '認証コードの生成に失敗しました' },
      { status: 500 }
    )
  }
}

// 認証コードを検証するAPI
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { message: '認証コードが必要です' },
        { status: 400 }
      )
    }

    // Firestoreから認証コードを検索
    const authCodesRef = collection(db, 'authCodes')
    const q = query(authCodesRef, where('code', '==', code))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return NextResponse.json(
        { message: '無効な認証コードです' },
        { status: 401 }
      )
    }

    const authDoc = snapshot.docs[0]
    const authData = authDoc.data()
    
    // 有効期限チェック
    const expiresAt = authData.expiresAt.toMillis()
    if (Date.now() > expiresAt) {
      // 期限切れのコードを削除
      await deleteDoc(doc(db, 'authCodes', authDoc.id))
      return NextResponse.json(
        { message: '認証コードの有効期限が切れています' },
        { status: 401 }
      )
    }

    // 認証成功後、コードを削除（ワンタイムトークン）
    await deleteDoc(doc(db, 'authCodes', authDoc.id))

    return NextResponse.json({
      candidateId: authData.candidateId,
      email: authData.email,
    })
  } catch (error) {
    console.error('認証コード検証エラー:', error)
    return NextResponse.json(
      { message: '認証に失敗しました' },
      { status: 500 }
    )
  }
}
