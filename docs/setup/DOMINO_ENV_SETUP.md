# Domino連携 環境変数設定ガイド

## 概要
Dominoシステムとの連携に必要な環境変数の設定方法

## 1. 必要な環境変数

### 人材紹介システム側（このアプリケーション）

`.env.local` ファイルに以下を追加：

```bash
# Domino連携API認証設定
HR_SYSTEM_API_KEY=hr-system-api-key-2024
HR_SYSTEM_AUTH_TOKEN=hr-system-auth-token-2024

# Dominoシステムへのアクセス用
DOMINO_API_KEY=domino-hr-api-secret-2024
DOMINO_BASE_URL=https://sushi-domino.vercel.app

# Webhook設定
DOMINO_WEBHOOK_URL=https://sushi-domino.vercel.app/api/webhooks/hr-system
DOMINO_WEBHOOK_SECRET=domino-hr-webhook-secret-2024
```

### Vercel本番環境での設定

Vercelダッシュボード > Settings > Environment Variables で以下を設定：

```bash
HR_SYSTEM_API_KEY=hr-system-api-key-2024
HR_SYSTEM_AUTH_TOKEN=hr-system-auth-token-2024
DOMINO_API_KEY=domino-hr-api-secret-2024
DOMINO_BASE_URL=https://sushi-domino.vercel.app
DOMINO_WEBHOOK_URL=https://sushi-domino.vercel.app/api/webhooks/hr-system
DOMINO_WEBHOOK_SECRET=domino-hr-webhook-secret-2024
```

## 2. Domino側での設定

Domino側の `.env.local` に以下を追加：

```bash
# 人材紹介システムへのアクセス用
HR_SYSTEM_BASE_URL=https://your-hr-system.vercel.app/api
HR_SYSTEM_API_KEY=hr-system-api-key-2024
HR_SYSTEM_AUTH_TOKEN=hr-system-auth-token-2024

# Webhook設定
HR_SYSTEM_WEBHOOK_URL=https://your-hr-system.vercel.app/api/webhooks/domino
HR_SYSTEM_WEBHOOK_SECRET=hr-system-webhook-secret-2024
```

## 3. セキュリティ考慮事項

### API キーの生成方法
```bash
# セキュアなAPIキーを生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 環境ごとの設定

#### 開発環境 (localhost)
```bash
HR_SYSTEM_BASE_URL=http://localhost:3000/api
DOMINO_BASE_URL=http://localhost:3001
```

#### ステージング環境
```bash
HR_SYSTEM_BASE_URL=https://hr-system-staging.vercel.app/api
DOMINO_BASE_URL=https://domino-staging.vercel.app
```

#### 本番環境
```bash
HR_SYSTEM_BASE_URL=https://your-hr-system.vercel.app/api
DOMINO_BASE_URL=https://sushi-domino.vercel.app
```

## 4. 設定の検証

### API認証テスト用エンドポイント

`GET /api/domino-auth-test` を実行して設定を確認：

```bash
curl -X POST https://your-hr-system.vercel.app/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hr-system-auth-token-2024" \
  -H "X-API-Key: hr-system-api-key-2024" \
  -d '{
    "id": "test_company_001",
    "name": "テスト企業株式会社",
    "address": "東京都渋谷区テスト1-1-1",
    "status": "active"
  }'
```

期待されるレスポンス：
```json
{
  "success": true,
  "id": "generated_company_id",
  "message": "Company created successfully"
}
```

## 5. トラブルシューティング

### よくある問題

1. **401 Unauthorized**
   - API Key または Bearer Token が間違っている
   - ヘッダー名が正しくない（`X-API-Key`, `Authorization: Bearer`）

2. **400 Bad Request**
   - Content-Type が `application/json` でない
   - 必須フィールドが不足している

3. **500 Internal Server Error**
   - Firebase設定が正しくない
   - 環境変数が設定されていない

### デバッグ用ログ

開発時は以下の環境変数でデバッグログを有効化：

```bash
DEBUG=domino:*
NODE_ENV=development
```

## 6. 運用時の注意事項

- API Key は定期的にローテーションする
- ログファイルに認証情報が含まれないよう注意
- レート制限の実装を推奨（1分間に100リクエストなど）
- 異常なリクエストパターンを監視する

## 7. 連絡先

設定に関する質問や問題が発生した場合：
- 技術担当: GitHub Copilot
- ドキュメント: [このREADME]
- 緊急時: [緊急連絡先]