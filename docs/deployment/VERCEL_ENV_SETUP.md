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
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
DOMINO_API_URL=https://api.domino.example.com
DOMINO_API_KEY=your_domino_api_key_here
```

> **Note**: Replace all placeholder values with your actual Firebase and Domino API credentials. Never commit real API keys to the repository.

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