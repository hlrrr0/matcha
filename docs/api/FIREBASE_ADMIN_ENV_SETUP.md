# 環境変数設定ガイド - Firebase Admin SDK

Public APIを本番環境で使用するために必要な環境変数の設定方法です。

## 📋 必要な環境変数

以下の3つの環境変数をVercelに設定する必要があります:

```bash
FIREBASE_ADMIN_PROJECT_ID=agent-system-23630
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@agent-system-23630.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 🔧 Vercelでの設定手順

### 1. Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. プロジェクト `agent-sytem` を選択
3. **Settings** タブをクリック
4. 左サイドバーから **Environment Variables** を選択

### 2. 環境変数を追加

#### (1) FIREBASE_ADMIN_PROJECT_ID

- **Name**: `FIREBASE_ADMIN_PROJECT_ID`
- **Value**: `agent-system-23630`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development
- **Add** ボタンをクリック

#### (2) FIREBASE_ADMIN_CLIENT_EMAIL

- **Name**: `FIREBASE_ADMIN_CLIENT_EMAIL`
- **Value**: `firebase-adminsdk-fbsvc@agent-system-23630.iam.gserviceaccount.com`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development
- **Add** ボタンをクリック

#### (3) FIREBASE_ADMIN_PRIVATE_KEY ⚠️ 重要

- **Name**: `FIREBASE_ADMIN_PRIVATE_KEY`
- **Value**: 以下の形式で入力
  ```
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2lbKJZsfbJSPj
  mJpIFFhWkk2t0XTRtrw0+E1DBlESaowKLuU4CvmlGgTXEBnlP3ZydjY6zOZ3uT+2
  ... (省略) ...
  alXhVwNVeCwBZB96/AOT3CRD
  -----END PRIVATE KEY-----
  ```

**⚠️ 注意事項:**
- 改行は `\n` として入力する必要があります
- または、Vercelの環境変数入力欄で直接改行を入力できます
- **重要**: private_key全体をコピーしてください（`-----BEGIN`から`-----END`まで）

- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development
- **Add** ボタンをクリック

### 3. serviceAccountKey.jsonから値を取得

プロジェクトルートの `serviceAccountKey.json` から以下の値をコピーします:

```json
{
  "project_id": "agent-system-23630",  ← FIREBASE_ADMIN_PROJECT_ID
  "client_email": "firebase-adminsdk-...",  ← FIREBASE_ADMIN_CLIENT_EMAIL
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"  ← FIREBASE_ADMIN_PRIVATE_KEY
}
```

### 4. 再デプロイ

環境変数を追加した後、以下のいずれかの方法で再デプロイします:

**方法1: Git push（推奨）**
```bash
git add .
git commit -m "Add Firebase Admin SDK configuration"
git push origin main
```

**方法2: Vercel Dashboardから**
1. **Deployments** タブを開く
2. 最新のデプロイメントの右側の`...`メニューをクリック
3. **Redeploy** を選択

## 🧪 動作確認

再デプロイ後、以下のコマンドでAPIが正常に動作するか確認します:

```bash
# 本番環境のAPIをテスト
curl -X GET "https://your-domain.vercel.app/api/public/jobs/export?limit=10" \
  -H "X-API-Key: test-api-key-12345"
```

成功すれば、以下のようなレスポンスが返ります:

```json
{
  "success": true,
  "data": {
    "exportedAt": "2026-01-06T12:00:00.000Z",
    "totalCount": 0,
    "jobs": [],
    "companies": [],
    "stores": []
  }
}
```

## 🔐 セキュリティ上の注意

### ❌ やってはいけないこと

- `serviceAccountKey.json` をGitにコミットする
- Private Keyを公開する
- 環境変数を外部に漏らす

### ✅ 推奨事項

- `serviceAccountKey.json` は `.gitignore` に追加済み（確認済み）
- 環境変数はVercelの管理画面でのみ設定
- APIキーは定期的にローテーション
- 不要なサービスアカウントキーは削除

## 📝 ローカル開発環境

ローカル開発環境では、`serviceAccountKey.json` を使用します:

1. Firebase Consoleからサービスアカウントキーをダウンロード
2. プロジェクトルートに `serviceAccountKey.json` として保存
3. `.gitignore` に含まれていることを確認
4. 開発サーバーを起動: `npm run dev`

`src/lib/firebase-admin.ts` が自動的にファイルを読み込みます。

## ✅ 設定完了チェックリスト

- [ ] Vercelに `FIREBASE_ADMIN_PROJECT_ID` を追加
- [ ] Vercelに `FIREBASE_ADMIN_CLIENT_EMAIL` を追加
- [ ] Vercelに `FIREBASE_ADMIN_PRIVATE_KEY` を追加
- [ ] 環境は Production/Preview/Development すべてに設定
- [ ] 再デプロイを実施
- [ ] APIの動作確認を実施
- [ ] `serviceAccountKey.json` がGitにコミットされていないことを確認

---

設定が完了したら、Public APIが本番環境で使用可能になります 🎉
