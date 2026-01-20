import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const { folderName, parentFolderId } = await request.json()

    if (!folderName) {
      return NextResponse.json(
        { message: 'フォルダー名が必要です' },
        { status: 400 }
      )
    }

    // サービスアカウントの認証情報を環境変数から取得
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!credentials) {
      return NextResponse.json(
        { message: 'Google認証情報が設定されていません' },
        { status: 500 }
      )
    }

    // 認証クライアントの作成
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    const drive = google.drive({ version: 'v3', auth })

    // フォルダーのメタデータ
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }

    // 親フォルダーが指定されている場合
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId]
    }

    // フォルダーを作成
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    })

    const folderId = response.data.id
    const folderUrl = response.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`

    return NextResponse.json({
      success: true,
      folderId,
      folderUrl,
    })
  } catch (error: any) {
    console.error('Google Drive フォルダー作成エラー:', error)
    return NextResponse.json(
      { message: error.message || 'フォルダー作成に失敗しました' },
      { status: 500 }
    )
  }
}
