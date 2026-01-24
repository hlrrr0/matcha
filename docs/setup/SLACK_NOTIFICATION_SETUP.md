# Slack通知機能セットアップガイド

進捗更新時に担当者へSlack通知を送信する機能のセットアップ手順です。

## 前提条件

- Slackワークスペースの管理者権限
- Next.js開発環境が整っていること

## セットアップ手順

### 1. Slack Appの作成

1. [Slack API](https://api.slack.com/apps)にアクセスし、Slackアカウントでログイン

2. **「Create New App」**をクリック

3. **「From scratch」**を選択

4. アプリ情報を入力：
   - **App Name**: `MATCHA通知` (任意の名前)
   - **Pick a workspace**: 通知を送信したいワークスペースを選択
   - **Create App**をクリック

### 2. Bot権限の設定

1. 左メニューから**「OAuth & Permissions」**を選択

2. **「Scopes」**セクションの**「Bot Token Scopes」**に以下の権限を追加：
   ```
   chat:write          - メッセージを送信
   users:read          - ユーザー情報を取得
   users:read.email    - メールアドレスからユーザーを検索
   ```

3. ページ上部の**「Install to Workspace」**をクリック

4. 権限を確認して**「Allow」**をクリック

5. **「Bot User OAuth Token」**をコピー（`xoxb-`で始まる文字列）

### 3. 環境変数の設定

プロジェクトルートの`.env.local`ファイルに以下を追加：

```bash
# Slack通知設定
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_ENABLED=true

# アプリケーションURL（本番環境）
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**ローカル開発環境の場合：**
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_ENABLED=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 必要なパッケージのインストール

```bash
npm install @slack/web-api
```

### 5. Vercel環境変数の設定（本番デプロイ時）

Vercelダッシュボードで：

1. プロジェクトの**「Settings」** → **「Environment Variables」**を開く
2. 以下の環境変数を追加：
   - `SLACK_BOT_TOKEN`: Bot User OAuth Token
   - `SLACK_ENABLED`: `true`
   - `NEXT_PUBLIC_APP_URL`: 本番環境のURL

### 6. Slack IDの取得方法

#### 方法1: Slack UIから取得（推奨）

1. Slackアプリまたはブラウザ版を開く
2. 通知を受け取りたいユーザーのプロフィールを表示
3. **「その他」（...アイコン）**をクリック
4. **「メンバーIDをコピー」**を選択
5. 取得したID（例: `U01234567`）をコピー

#### 方法2: APIで取得

開発環境で以下のAPIを実行：

```bash
# メールアドレスからSlack IDを検索
curl "http://localhost:3000/api/slack/lookup?email=user@example.com"
```

レスポンス：
```json
{
  "success": true,
  "slackId": "U01234567"
}
```

### 7. ユーザーにSlack IDを設定

1. 管理画面（`/admin/users`）にアクセス
2. ユーザー一覧から対象ユーザーの**「編集」**ボタンをクリック
3. **「Slack ID」**フィールドに取得したIDを入力（例: `U01234567`）
4. **「保存」**をクリック

### 8. テスト通知の送信

開発環境で以下のAPIを実行してテスト：

```bash
# ユーザーIDを指定してテスト通知を送信
curl "http://localhost:3000/api/slack/test?userId=USER_ID_HERE"
```

成功すると、該当ユーザーのSlackにテストメッセージが届きます。

## 通知が送信されるタイミング

以下のステータス変更時に担当者へ自動的に通知されます：

- ✅ **応募** (applied)
- ✅ **書類選考通過** (document_passed)
- ✅ **面接設定** (interview)
- ✅ **面接通過** (interview_passed)
- ✅ **内定** (offer)
- ✅ **内定承諾** (offer_accepted)

## 通知の無効化

### 全体で無効化

`.env.local`で以下を設定：

```bash
SLACK_ENABLED=false
```

### 特定ユーザーのみ無効化

ユーザー管理画面で該当ユーザーの**「Slack ID」**を空にする

## トラブルシューティング

### 通知が届かない

1. **環境変数の確認**
   ```bash
   # 開発環境
   cat .env.local | grep SLACK
   ```

2. **Slack IDの確認**
   - 管理画面でSlack IDが正しく設定されているか確認
   - IDの形式が`U`で始まる文字列か確認

3. **Bot権限の確認**
   - Slack App設定で必要な権限が付与されているか確認
   - ワークスペースにインストールされているか確認

4. **ログの確認**
   ```bash
   # サーバーログでSlack通知のエラーを確認
   npm run dev
   # 進捗を更新して、コンソールに [Slack] のメッセージが出力されるか確認
   ```

### よくあるエラー

#### `not_in_channel` エラー
- Botが該当のユーザーにDMを送る権限がない
- 解決策: ユーザーがBotとのDMを開始する必要がある
  1. Slackで「MATCHA通知」Botを検索
  2. DMを開始して「Hello」などを送信

#### `invalid_auth` エラー
- Bot Tokenが無効または期限切れ
- 解決策: Slack App設定から新しいTokenを再取得

#### `user_not_found` エラー
- Slack IDが間違っている
- 解決策: Slack IDを正しく再取得して設定

## セキュリティ注意事項

- ✅ `SLACK_BOT_TOKEN`は**絶対にGitにコミットしない**
- ✅ `.env.local`は`.gitignore`に含まれていることを確認
- ✅ 本番環境ではVercelの環境変数を使用
- ✅ Bot TokenはSlack App設定からいつでも再生成可能

## 参考リンク

- [Slack API Documentation](https://api.slack.com/)
- [Slack Web API - Node.js](https://slack.dev/node-slack-sdk/web-api)
- [Building Slack apps](https://api.slack.com/start/building)
