import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// 簡易的な認証コード生成（実運用ではもっと強固な実装を推奨）
function generateAuthCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// 一時的な認証コードストレージ（実運用ではRedisなどを使用）
const authCodes = new Map<string, { email: string; candidateId: string; expiresAt: number }>()

// 認証コードをメール送信するAPI
export async function POST(request: NextRequest) {
  try {
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
    const candidateId = candidateDoc.id
    const authCode = generateAuthCode()

    // 認証コードを保存（5分間有効）
    authCodes.set(authCode, {
      email: email.toLowerCase().trim(),
      candidateId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5分
    })

    // TODO: 実際のメール送信（Resendなどを使用）
    console.log(`認証コード ${authCode} を ${email} に送信（デバッグ用）`)

    return NextResponse.json({
      message: '認証コードをメールアドレスに送信しました',
      // 開発環境のみコードを返す
      ...(process.env.NODE_ENV === 'development' && { authCode }),
    })
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

    const authData = authCodes.get(code)

    if (!authData) {
      return NextResponse.json(
        { message: '無効な認証コードです' },
        { status: 401 }
      )
    }

    if (Date.now() > authData.expiresAt) {
      authCodes.delete(code)
      return NextResponse.json(
        { message: '認証コードの有効期限が切れています' },
        { status: 401 }
      )
    }

    // 認証成功後、コードを削除（ワンタイムトークン）
    authCodes.delete(code)

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
