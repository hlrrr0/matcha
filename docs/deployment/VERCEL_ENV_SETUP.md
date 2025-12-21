# Vercel環境変数設定手順

## 問題の原因
FirebaseのAPIキーエラーは、Vercelのプロダクション環境で環境変数が設定されていないために発生しています。

## 解決方法

### 1. Vercel Dashboardでの設定
1. https://vercel.com/dashboard にアクセス
2. プロジェクト (agent-sytem) を選択
3. "Settings" タブをクリック
4. "Environment Variables" セクションに移動
5. 以下の環境変数を追加：

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD6pa5Qi9vumPncVNhc3fr3IzC9TON_YsA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=agent-system-23630.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=agent-system-23630
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=agent-system-23630.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=543575360817
NEXT_PUBLIC_FIREBASE_APP_ID=1:543575360817:web:dea8b4496f3814b2061c10
DOMINO_API_URL=https://api.domino.example.com
DOMINO_API_KEY=demo-api-key
```

### 2. CLI での設定（代替方法）
```bash
# Vercel CLIを使用して環境変数を設定
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
```

### 3. 設定後の確認
1. 環境変数を設定した後、再デプロイが必要
2. Vercelが自動的に再デプロイするか、手動でデプロイを実行
3. デプロイ完了後、アプリケーションにアクセスしてFirebaseエラーが解決されているか確認

### 4. セキュリティ注意事項
- `NEXT_PUBLIC_` プレフィックスの環境変数はクライアント側で公開されるため、秘密情報は含めない
- Firebaseの設定はフロントエンドで使用されるため、公開されても問題ない
- 本来の秘密のAPIキー（サーバーサイド用）は別途 Firebase Admin SDK で管理

## 問題が解決しない場合
1. ブラウザのキャッシュをクリア
2. Vercelのデプロイログを確認
3. Firebase Console でプロジェクト設定を再確認