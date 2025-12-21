# Firebase Authentication 承認済みドメイン設定手順

## 🔥 緊急修正が必要なドメイン設定

### エラーの原因
```
Error: Illegal url for new iframe - https://agent-system-23630.firebaseapp.com/__/auth/iframe
parent=https://agent-system-ten.vercel.app
```

Vercelのドメイン `agent-system-ten.vercel.app` がFirebaseの承認済みドメインに登録されていません。

### 📋 即座に追加すべきドメイン

**Firebase Console > Authentication > Settings > Authorized domains** に以下を追加：

1. ✅ `agent-system-ten.vercel.app` (現在のエイリアス)
2. ✅ `agent-system-hlrrr0s-projects.vercel.app` (プライマリエイリアス)
3. ✅ `agent-system-mxz55bg6y-hlrrr0s-projects.vercel.app` (最新デプロイ)

### 🔗 設定リンク
**直接アクセス**: https://console.firebase.google.com/project/agent-system-23630/authentication/settings

### 📝 設定手順
1. 上記リンクにアクセス
2. ページを下にスクロールして「Authorized domains」セクションを見つける
3. 「Add domain」ボタンをクリック
4. 上記3つのドメインを一つずつ追加
5. 各ドメインの追加後に「Save」または「Done」をクリック

### ⏱️ 設定反映時間
- 通常は数分以内に反映
- 最大で15分程度かかる場合がある
- 設定後にブラウザを更新してテスト

### 🔍 現在のVercelドメイン状況
```
プライマリURL: https://agent-system-mxz55bg6y-hlrrr0s-projects.vercel.app
エイリアス:
- https://agent-system-ten.vercel.app ← エラーの発生元
- https://agent-system-hlrrr0s-projects.vercel.app
- https://agent-system-hlrrr0-hlrrr0s-projects.vercel.app
```

### ✅ 確認方法
設定完了後:
1. Vercelアプリ (https://agent-system-ten.vercel.app) にアクセス
2. Googleログインボタンをクリック
3. エラーが解消され、認証画面が正常に表示されることを確認