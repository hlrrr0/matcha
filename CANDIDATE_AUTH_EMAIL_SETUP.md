# 求職者認証メール送信設定ガイド

## 概要
求職者がマイページにログインする際、メールで認証コード（8桁の数字）が送信されます。
このドキュメントでは、本番環境でメール送信を有効にするための設定方法を説明します。

## 実装内容

### 認証コードメール送信機能
- **API**: `/api/candidate-auth` (POST)
- **メールサービス**: Resend
- **認証コード形式**: 8桁の数字（例: 12345678）
- **有効期限**: 5分間
- **ワンタイム**: 使用後は無効化

### メール内容
```
[求職者名] 様

マイページへのログイン認証コードをお送りします。

━━━━━━━━━━━━━━━━━━━━━━━━
認証コード: [8桁の数字]
━━━━━━━━━━━━━━━━━━━━━━━━

このコードは5分間有効です。
ログイン画面で上記のコードを入力してください。

※このコードを他人に教えないでください。
※心当たりがない場合は、このメールを無視してください。
```

## 本番環境での設定

### 1. Resend APIキーの取得

1. [Resend](https://resend.com/)にアクセスしてアカウントを作成
2. ダッシュボードから「API Keys」を選択
3. 新しいAPIキーを作成（権限: Sending access）
4. 生成されたAPIキーをコピー（`re_`で始まる文字列）

### 2. 送信元メールアドレスの設定

Resendで検証済みのドメインまたはメールアドレスを使用する必要があります。

#### オプション1: Resendのテストドメインを使用（開発用）
```
onboarding@resend.dev
```
- すぐに使用可能
- ただし、送信先は自分のメールアドレスのみ

#### オプション2: 独自ドメインを使用（本番用）
1. Resendダッシュボードで「Domains」を選択
2. 独自ドメインを追加（例: `yourdomain.com`）
3. DNS設定でSPF、DKIM、DMARCレコードを追加
4. ドメイン検証が完了したら、送信元アドレスを設定（例: `noreply@yourdomain.com`）

### 3. Vercel環境変数の設定

Vercelのプロジェクトダッシュボードで以下の環境変数を設定:

```bash
# 必須: Resend APIキー
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 必須: 送信元メールアドレス（検証済みドメイン）
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### 設定手順
1. Vercelダッシュボードでプロジェクトを選択
2. 「Settings」→「Environment Variables」に移動
3. 上記の2つの環境変数を追加
4. Environment: `Production`, `Preview`, `Development`すべてにチェック
5. 「Save」をクリック
6. **重要**: 再デプロイを実行（環境変数の変更を反映）

### 4. デプロイ

環境変数を設定した後、必ず再デプロイを実行してください:

```bash
git commit --allow-empty -m "Trigger rebuild for env vars"
git push
```

または、Vercelダッシュボードから「Deployments」→「Redeploy」を実行

## トラブルシューティング

### メールが送信されない場合

#### 1. 環境変数の確認
```bash
# Vercelダッシュボードで確認
Settings → Environment Variables
- RESEND_API_KEY が設定されているか
- RESEND_FROM_EMAIL が設定されているか
```

#### 2. ログの確認
```bash
# Vercelダッシュボードで確認
Deployments → [最新のデプロイ] → Runtime Logs

# エラー例:
# "RESEND_API_KEYが設定されていません" → 環境変数が未設定
# "メール送信エラー" → APIキーまたは送信元アドレスが無効
```

#### 3. Resendダッシュボードの確認
- [Resend Logs](https://resend.com/logs)でメール送信履歴を確認
- エラーがある場合、詳細なエラーメッセージを確認

#### 4. 送信元アドレスの検証状態を確認
- Resendダッシュボード → Domains
- ドメインが「Verified」状態になっているか確認
- DNS設定が正しいか確認

### よくあるエラー

#### エラー1: "RESEND_API_KEYが設定されていません"
**原因**: 環境変数が設定されていないか、デプロイに反映されていない  
**解決策**: 
1. Vercel環境変数を確認
2. 再デプロイを実行

#### エラー2: "Missing required authentication"
**原因**: APIキーが無効  
**解決策**: 
1. Resendダッシュボードで新しいAPIキーを生成
2. Vercel環境変数を更新
3. 再デプロイ

#### エラー3: "Sender domain not verified"
**原因**: 送信元メールアドレスのドメインが未検証  
**解決策**: 
1. Resendでドメイン検証を完了させる
2. または、開発時は`onboarding@resend.dev`を使用

#### エラー4: メールが届かない
**原因**: 迷惑メールフォルダに入っている可能性  
**解決策**: 
1. 迷惑メールフォルダを確認
2. Resend Logsで送信ステータスを確認
3. SPF、DKIM、DMARC設定を確認

## 開発環境でのテスト

開発環境では、APIレスポンスに認証コードが含まれます:

```json
{
  "message": "認証コードをメールアドレスに送信しました",
  "authCode": "12345678"
}
```

これにより、メールを確認せずにテストが可能です。

## セキュリティ考慮事項

1. **APIキーの管理**: APIキーは絶対にコードにハードコーディングしない
2. **認証コードの有効期限**: 5分で自動的に無効化
3. **ワンタイムトークン**: 使用後は即座に無効化
4. **レート制限**: 必要に応じてレート制限を実装することを推奨

## 参考リンク

- [Resend公式ドキュメント](https://resend.com/docs)
- [Resendダッシュボード](https://resend.com/dashboard)
- [Vercel環境変数設定](https://vercel.com/docs/environment-variables)

## 更新履歴

- 2025-12-19: 認証コードメール送信機能を実装
