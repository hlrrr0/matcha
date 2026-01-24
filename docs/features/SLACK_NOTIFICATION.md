# Slack通知機能

## 概要
候補者の進捗が更新された際に、担当者にSlack通知を送信する機能です。

## 機能仕様

### 通知タイミング
以下の進捗変更時に担当者へ通知を送信：
- 応募 (applied)
- 書類選考通過 (document_passed)
- 面接設定 (interview)
- 面接通過 (interview_passed)
- 内定 (offer)
- 内定承諾 (offer_accepted)

### 通知内容
- 候補者名
- 企業名
- 新しいステータス
- 詳細ページへのリンク

## 実装手順

### 1. 必要なパッケージのインストール

```bash
npm install @slack/web-api
```

### 2. Slack Appの作成

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. アプリ名とワークスペースを選択
5. OAuth & Permissions > Scopes で以下の権限を追加：
   - `chat:write` - メッセージ送信
   - `users:read` - ユーザー情報取得
   - `users:read.email` - ユーザーのメールアドレス取得
6. Install App to Workspace でインストール
7. Bot User OAuth Token をコピー（環境変数に設定）

### 3. Slack IDの取得方法

#### 方法1: Slack UIから取得
1. Slackアプリを開く
2. 通知を受け取りたいユーザーのプロフィールを表示
3. 「その他」→「メンバーIDをコピー」

#### 方法2: APIで取得
```javascript
// メールアドレスからSlack IDを取得
const { WebClient } = require('@slack/web-api');
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

const result = await client.users.lookupByEmail({
  email: 'user@example.com'
});
console.log(result.user.id); // U01234567
```

### 4. 環境変数の設定

`.env.local`に以下を追加：

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_ENABLED=true
```

### 5. データベーススキーマ変更

`User`型に`slackId`フィールドを追加：

```typescript
export interface User {
  // ... 既存のフィールド
  slackId?: string // Slack user ID (例: U01234567)
}
```

### 6. 通知関数の実装

`src/lib/slack/notifications.ts`を作成し、通知関数を実装。

### 7. 進捗更新時の統合

進捗を更新するAPIエンドポイント（`/api/progress/[id]/status`など）で通知関数を呼び出す。

## 使用方法

### 管理者側
1. ユーザー管理画面で各ユーザーにSlack IDを設定
2. Slack IDは `U01234567` のような形式

### 通知の無効化
以下のいずれかの方法で通知を無効化できます：
- 環境変数 `SLACK_ENABLED=false` に設定
- ユーザーの `slackId` を空にする

## エラーハンドリング
- Slack API呼び出しが失敗しても、進捗更新自体は成功させる
- エラーはログに記録し、管理者に別途通知

## セキュリティ
- Slack Bot Tokenは環境変数で管理し、Gitにコミットしない
- API呼び出しは認証済みユーザーのみ許可

## 今後の拡張案
- 通知テンプレートのカスタマイズ
- 通知設定のユーザー別カスタマイズ（通知ON/OFF、通知タイミング）
- Slack以外の通知チャネル（メール、LINE等）のサポート
- グループ通知（チャンネルへの投稿）
