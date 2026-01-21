# API連携エラー対応ガイド

## 🔴 発生しているエラー

```
人材紹介システムとの連携に失敗しました: HR System API Error: 500 Internal Server Error - 
{"success":false,"error":"INTERNAL_ERROR","message":"企業データの作成中にエラーが発生しました"}
```

## 📋 エラー原因の可能性

### 1. Firebase Admin SDK の環境変数が未設定 (最も可能性が高い)

Vercelで以下の環境変数が設定されていない、または間違っている可能性があります:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### 2. API認証情報の不一致

- `HR_SYSTEM_API_KEY`
- `HR_SYSTEM_AUTH_TOKEN`

### 3. Firestoreのアクセス権限の問題

Firebase Admin SDKがFirestoreにアクセスできない可能性があります。

## 🔧 対応手順

### ステップ1: 診断スクリプトの実行

```bash
# 本番環境のAPIをテスト
node diagnose-api-error.js https://agent-system-ten.vercel.app

# ローカル環境のAPIをテスト (開発時)
node diagnose-api-error.js http://localhost:3000
```

このスクリプトは以下を確認します:
- 認証情報
- リクエストヘッダー
- レスポンスの詳細
- エラーの種類

### ステップ2: Vercelの環境変数を確認

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `agent-sytem` を選択
3. **Settings** → **Environment Variables** を開く
4. 以下の変数が設定されているか確認:

#### Firebase Admin SDK (必須)

```
FIREBASE_ADMIN_PROJECT_ID=agent-system-23630
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@agent-system-23630.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

#### API認証 (任意 - デフォルト値が使用される)

```
HR_SYSTEM_API_KEY=hr-system-api-key-2024
HR_SYSTEM_AUTH_TOKEN=hr-system-auth-token-2024
```

### ステップ3: 環境変数の設定方法

#### FIREBASE_ADMIN_PRIVATE_KEY の設定 (重要!)

**方法1: Vercel Dashboard (推奨)**

1. `serviceAccountKey.json` を開く
2. `private_key` の値全体をコピー
3. Vercelの Environment Variables で貼り付け
4. Vercelは自動的に改行を適切に処理します

**方法2: コマンドラインから設定**

```bash
# serviceAccountKey.jsonから値を取得
cat serviceAccountKey.json | jq -r '.private_key' | pbcopy

# Vercel CLIで設定
vercel env add FIREBASE_ADMIN_PRIVATE_KEY
# (貼り付け)
```

**⚠️ 注意事項:**
- `-----BEGIN PRIVATE KEY-----` と `-----END PRIVATE KEY-----` を含める
- 改行は `\n` として保存される
- すべての環境 (Production, Preview, Development) にチェックを入れる

### ステップ4: serviceAccountKey.json から値を取得

```bash
# プロジェクトIDを取得
cat serviceAccountKey.json | jq -r '.project_id'

# クライアントメールを取得
cat serviceAccountKey.json | jq -r '.client_email'

# プライベートキーを取得 (コピー用)
cat serviceAccountKey.json | jq -r '.private_key'
```

または、以下のコマンドで一覧表示:

```bash
cat serviceAccountKey.json | jq '{project_id, client_email}'
```

### ステップ5: 再デプロイ

環境変数を設定したら、必ず再デプロイが必要です:

**方法1: Git push (推奨)**

```bash
git add .
git commit -m "Fix: Update API error handling and logging" --allow-empty
git push origin main
```

**方法2: Vercel Dashboard**

1. **Deployments** タブを開く
2. 最新のデプロイメントの `...` メニューをクリック
3. **Redeploy** を選択
4. **Use existing Build Cache** のチェックを外す (重要!)
5. **Redeploy** をクリック

### ステップ6: ログの確認

再デプロイ後、ログを確認:

1. [Vercel Dashboard](https://vercel.com/dashboard) → プロジェクト選択
2. **Functions** タブを開く
3. `/api/companies` を選択
4. 最新のログを確認

以下のログが表示されるか確認:
```
🔧 Initializing Firebase Admin SDK...
Environment: production
Environment variables check:
- FIREBASE_ADMIN_PROJECT_ID: ✅ Set
- FIREBASE_ADMIN_CLIENT_EMAIL: ✅ Set
- FIREBASE_ADMIN_PRIVATE_KEY: ✅ Set
✅ Firebase Admin SDK initialized with environment variables
```

## 🧪 動作確認

再デプロイ後、診断スクリプトで確認:

```bash
node diagnose-api-error.js https://agent-system-ten.vercel.app
```

成功すると以下のメッセージが表示されます:
```
✅ APIリクエスト成功!
作成された企業ID: xxxxx
```

## 📝 追加のデバッグ方法

### ローカルでのテスト

```bash
# 開発サーバーを起動
npm run dev

# 別のターミナルで診断スクリプトを実行
node diagnose-api-error.js http://localhost:3000
```

### Vercelログのリアルタイム確認

```bash
# Vercel CLIをインストール (まだの場合)
npm i -g vercel

# ログインとプロジェクトリンク
vercel login
vercel link

# リアルタイムログの確認
vercel logs --follow
```

## 🔍 トラブルシューティング

### エラー: "Firebase Admin SDK initialization failed"

**原因**: 環境変数が設定されていない

**対応**:
1. Vercelの Environment Variables を確認
2. すべての環境 (Production, Preview, Development) にチェックが入っているか確認
3. 再デプロイ

### エラー: "Invalid API Key"

**原因**: API Key が一致しない

**対応**:
1. リクエストヘッダーの `X-API-Key` を確認
2. デフォルトは `hr-system-api-key-2024`
3. 環境変数 `HR_SYSTEM_API_KEY` が設定されている場合は、その値を使用

### エラー: "Invalid Bearer token"

**原因**: Auth Token が一致しない

**対応**:
1. リクエストヘッダーの `Authorization` を確認
2. `Bearer hr-system-auth-token-2024` の形式
3. 環境変数 `HR_SYSTEM_AUTH_TOKEN` が設定されている場合は、その値を使用

## 📚 関連ドキュメント

- [Firebase Admin SDK 環境変数設定ガイド](./docs/api/FIREBASE_ADMIN_ENV_SETUP.md)
- [Domino API 連携仕様](./docs/api/DOMINO_API_SPEC.md)
- [Vercel 環境変数設定](./docs/deployment/VERCEL_ENV_SETUP.md)

## ✅ チェックリスト

デプロイ前に以下を確認:

- [ ] `serviceAccountKey.json` が存在する
- [ ] Vercel環境変数: `FIREBASE_ADMIN_PROJECT_ID` が設定されている
- [ ] Vercel環境変数: `FIREBASE_ADMIN_CLIENT_EMAIL` が設定されている
- [ ] Vercel環境変数: `FIREBASE_ADMIN_PRIVATE_KEY` が設定されている
- [ ] すべての環境変数が全環境 (Production, Preview, Development) に設定されている
- [ ] 再デプロイを実行した (キャッシュなし)
- [ ] Vercelのログで初期化メッセージを確認した
- [ ] 診断スクリプトで動作確認した

## 🆘 それでも解決しない場合

1. Vercelのログ全体を確認
2. Firebase Console でサービスアカウントの権限を確認
3. Firestoreのルールを確認
4. ローカル環境で同じエラーが再現するか確認

---

**最終更新**: 2026年1月21日
