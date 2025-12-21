# Firebase Authentication ドメイン設定エラーの解決方法

## 問題の原因
Firebase Authenticationで、Vercelのデプロイドメインが承認済みドメインに追加されていないため、Google認証のiframeがブロックされています。

## 解決手順

### 1. Firebase Console での設定
1. Firebase Console (https://console.firebase.google.com/) にアクセス
2. プロジェクト `agent-system-23630` を選択
3. 左メニューから「Authentication」を選択
4. 「Settings」タブをクリック
5. 「Authorized domains」セクションに移動

### 2. 承認済みドメインの追加
現在のVercelドメインを追加する必要があります：

**追加するドメイン:**
- `agent-system-ten.vercel.app` (現在のVercelドメイン)
- `agent-system-mxz55bg6y-hlrrr0s-projects.vercel.app` (最新デプロイのドメイン)
- `*.vercel.app` (すべてのVercelプレビューデプロイメント用)

### 3. カスタムドメインの設定（推奨）
Vercelで安定したカスタムドメインを設定することを推奨：

1. Vercelプロジェクト設定で「Domains」タブに移動
2. 独自ドメインを追加（例：`agent-system.yourdomain.com`）
3. そのドメインをFirebaseの承認済みドメインに追加

### 4. 現在のエラーURLの解析
エラーメッセージに含まれるURL:
- 要求元: `https://agent-system-ten.vercel.app`
- Firebaseドメイン: `https://agent-system-23630.firebaseapp.com`

この2つのドメイン間の通信が許可されていない状態です。

## 緊急対応手順

### すぐに追加すべきドメイン:
```
agent-system-ten.vercel.app
agent-system-mxz55bg6y-hlrrr0s-projects.vercel.app
```

### 長期的な解決策:
1. Vercelでカスタムドメインを設定
2. そのカスタムドメインのみをFirebaseに登録
3. プレビューデプロイメント用に `*.your-domain.com` パターンを使用

## 設定完了後の確認
1. Firebase Console で設定を保存
2. 数分待ってからVercelアプリを再読み込み
3. Googleログインを再テスト