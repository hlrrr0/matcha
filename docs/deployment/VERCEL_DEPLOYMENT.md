# Vercelデプロイ手順

このプロジェクトをVercelにデプロイするための手順です。

## 1. Vercelにサインアップ/ログイン

1. [Vercel](https://vercel.com) にアクセス
2. GitHubアカウントでサインアップ/ログイン

## 2. プロジェクトのインポート

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリ `agent-system` を選択
3. 「Import」をクリック

## 3. 環境変数の設定

プロジェクト設定画面で以下の環境変数を設定：

### Firebase設定
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD6pa5Qi9vumPncVNhc3fr3IzC9TON_YsA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=agent-system-23630.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=agent-system-23630
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=agent-system-23630.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=543575360817
NEXT_PUBLIC_FIREBASE_APP_ID=1:543575360817:web:dea8b4496f3814b2061c10
```

### Domino API設定
```
DOMINO_API_URL=https://api.domino.example.com
DOMINO_API_KEY=your-production-api-key
```

## 4. ビルド設定

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Development Command: `npm run dev`

## 5. デプロイ

「Deploy」ボタンをクリックしてデプロイを開始

## 6. カスタムドメイン設定（オプション）

1. プロジェクト設定 > Domains
2. カスタムドメインを追加
3. DNS設定を更新

## 注意事項

- 環境変数は本番環境用の値に変更してください
- Firebase Security Rulesを本番環境に適した設定に変更してください
- Domino APIキーは本番環境用のものを使用してください

## トラブルシューティング

### ビルドエラーが発生する場合
1. `package.json`の依存関係を確認
2. TypeScriptエラーがないか確認
3. 環境変数が正しく設定されているか確認

### Firebase接続エラーが発生する場合
1. Firebase設定が正しいか確認
2. Firebaseプロジェクトの認証設定を確認
3. Security Rulesが適切に設定されているか確認