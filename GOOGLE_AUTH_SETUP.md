# Google認証セットアップガイド

求職者マイページでGoogle認証を使用するための設定手順です。

## Firebase Consoleでの設定

### 1. Firebase Consoleにアクセス
https://console.firebase.google.com/

### 2. プロジェクトを選択
`agent-system-23630` プロジェクトを選択

### 3. Authentication（認証）を設定

#### ステップ1: Authenticationを有効化
1. 左メニューから「Authentication」をクリック
2. 「始める」ボタンをクリック（初回のみ）

#### ステップ2: Googleプロバイダーを有効化
1. 「Sign-in method」タブをクリック
2. 「Google」を選択
3. トグルスイッチを「有効」にする
4. プロジェクトのサポートメールを選択（例: hiroki.imai@super-shift.co.jp）
5. 「保存」をクリック

### 4. 承認済みドメインの確認

「Authentication」→「Settings」→「Authorized domains」で以下が登録されていることを確認：

- `localhost` （開発環境用）
- `agent-system-23630.firebaseapp.com` （Firebase Hosting）
- あなたの本番ドメイン（Vercelなど）

本番ドメインを追加する場合：
1. 「ドメインを追加」をクリック
2. ドメイン名を入力（例: `your-app.vercel.app`）
3. 「追加」をクリック

## 動作確認

### ローカル環境でのテスト
1. 開発サーバーを起動: `npm run dev`
2. ブラウザで `http://localhost:3000/public/candidates/auth` にアクセス
3. 「Googleでログイン」ボタンをクリック
4. Googleアカウントを選択
5. 求職者データベースに登録されているメールアドレスであれば、マイページにリダイレクトされる

### トラブルシューティング

#### エラー: "ポップアップがブロックされました"
- ブラウザのポップアップブロッカーを無効にしてください
- ブラウザの設定で `localhost` または本番ドメインを許可リストに追加

#### エラー: "登録されている求職者が見つかりません"
- 求職者データベースに正しいメールアドレスが登録されているか確認
- メールアドレスが小文字で統一されているか確認

#### エラー: "auth/unauthorized-domain"
- Firebase Consoleで承認済みドメインに追加されているか確認
- Vercelなどにデプロイしている場合、そのドメインも追加が必要

## セキュリティ考慮事項

1. **メールアドレスの一意性**: 求職者データベースで同じメールアドレスを複数登録しないこと
2. **データアクセス制限**: Firestore Rulesで適切なアクセス制限を設定すること
3. **HTTPS必須**: 本番環境では必ずHTTPSを使用すること

## Firestore Security Rules（参考）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 求職者マイページ用のルール
    match /candidates/{candidateId} {
      // 認証されたユーザーが自分のデータを読み取る場合のみ許可
      allow read: if request.auth != null 
        && request.auth.token.email == resource.data.email;
    }
    
    match /matches/{matchId} {
      // 認証されたユーザーが自分のマッチングデータを読み取る場合のみ許可
      allow read: if request.auth != null 
        && request.auth.token.email == get(/databases/$(database)/documents/candidates/$(resource.data.candidateId)).data.email;
    }
  }
}
```

注意: 上記のルールは参考例です。実際のアプリケーションの要件に合わせて調整してください。

## 完了

以上で、Google認証の設定は完了です。求職者はGoogleアカウントを使って安全にマイページにアクセスできるようになります。
