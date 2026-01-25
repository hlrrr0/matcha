# Slack スレッド連携機能

## 概要
求職者詳細画面からSlackに親メッセージのみを送信し、そのメッセージに紐づくスレッドのURLを保持することで、Slack上のやり取りはSlackで完結させ、管理画面からは「Slackスレッドへ遷移」できる疎結合な運用を実現します。

## 実装内容

### 1. データ構造の拡張

#### Candidate型への追加フィールド
```typescript
// src/types/candidate.ts
export interface Candidate {
  // ... 既存フィールド
  
  // Slack連携
  slackChannelId?: string     // SlackチャンネルID
  slackMessageTs?: string     // Slackメッセージタイムスタンプ
  slackThreadUrl?: string     // Slackスレッドリンク
}
```

### 2. Slack API統合

#### 親メッセージ送信関数
```typescript
// src/lib/slack/notifications.ts

/**
 * 求職者の親メッセージをSlackチャンネルに送信
 * @param params 送信パラメータ
 * @returns 送信結果（スレッドURL含む）
 */
export async function sendCandidateParentMessage(
  params: SendCandidateParentMessageParams
): Promise<SendCandidateParentMessageResult>
```

**送信メッセージ形式:**
```
{求職者氏名}（{入学校舎}・{年齢}歳・{入学年月}）
```

例: `山田 太郎（東京校・23歳・2022年4月）`

#### スレッドURL生成
```typescript
/**
 * スレッドURLを生成
 * @param channelId SlackチャンネルID
 * @param messageTs メッセージタイムスタンプ
 * @returns スレッドURL
 */
export function generateSlackThreadUrl(channelId: string, messageTs: string): string {
  return `https://slack.com/app_redirect?channel=${channelId}&message_ts=${messageTs}`
}
```

### 3. API エンドポイント

#### POST /api/slack/send-candidate-message

**リクエスト:**
```json
{
  "candidateId": "候補者ID",
  "channelId": "C07R84TQD4J" // オプション（デフォルト: C07R84TQD4J）
}
```

**レスポンス（成功時）:**
```json
{
  "success": true,
  "channelId": "C07R84TQD4J",
  "messageTs": "1716871234.567890",
  "threadUrl": "https://slack.com/app_redirect?channel=C07R84TQD4J&message_ts=1716871234.567890"
}
```

**レスポンス（エラー時）:**
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

**処理フロー:**
1. 候補者IDから候補者データを取得
2. 年齢を生年月日から計算
3. 入学年月をフォーマット
4. Slackに親メッセージを送信
5. レスポンスから`ts`（タイムスタンプ）を取得
6. スレッドURLを生成
7. Firestoreに保存（`slackChannelId`, `slackMessageTs`, `slackThreadUrl`）
8. 結果を返す

### 4. ユーザーインターフェース

#### 候補者詳細画面（/candidates/[id]）

**Slack連携カード:**
- 場所: 基本情報セクションの右側、3カラムレイアウトの一部
- 色: 紫系（`border-purple-100`）

**未送信状態:**
```
┌─────────────────────────────┐
│ 💬 Slack連携                │
├─────────────────────────────┤
│ この求職者の情報をSlackに    │
│ 送信し、スレッドでやり取りを │
│ 管理できます。               │
│                             │
│ [📤 Slackに送信]            │
└─────────────────────────────┘
```

**送信済み状態:**
```
┌─────────────────────────────┐
│ 💬 Slack連携                │
├─────────────────────────────┤
│ Slackスレッド:              │
│ [💬 Slackでこの案件を開く]  │
│                             │
│ 送信日時: 2026/1/25 14:23   │
│                             │
│ [🔄 再送信]                 │
└─────────────────────────────┘
```

**操作:**
- 初回送信: 「Slackに送信」ボタンをクリック
- 再送信: 「再送信」ボタンをクリック（確認ダイアログ表示）
- スレッドを開く: 「Slackでこの案件を開く」ボタンをクリック（新しいタブで開く）

### 5. Slack側の準備

#### Bot権限
必要な権限:
- `chat:write` - メッセージの投稿

#### 環境変数
```bash
# .env.local

# 進捗通知用Bot（既存）
SLACK_BOT_TOKEN=xoxb-...
SLACK_ENABLED=true

# 求職者連携用Bot（新規）
SLACK_CANDIDATE_BOT_TOKEN=xoxb-...
```

**重要**: 求職者連携機能は `SLACK_CANDIDATE_BOT_TOKEN` を使用します。進捗通知とは別のBotを使用できます。

#### デフォルトチャンネル
- チャンネルID: `C07R84TQD4J`
- 変更方法: APIリクエストに`channelId`を指定

## 使用方法

### 1. 候補者詳細画面を開く
```
/candidates/[候補者ID]
```

### 2. Slack連携カードで「Slackに送信」をクリック

### 3. Slackで親メッセージが投稿される
```
山田 太郎（東京校・23歳・2022年4月）
```

### 4. Slackスレッドリンクが表示される
「Slackでこの案件を開く」ボタンから直接スレッドに遷移可能

### 5. Slackでスレッドに返信
親メッセージに返信することで、その求職者専用のスレッドで会話

## メリット

### 疎結合な運用
- **Slackでの議論はSlackで完結**: スレッド内の会話はSlackで自由に行える
- **管理画面からの遷移**: 必要な時だけSlackスレッドに移動
- **自動通知不要**: スレッド内の進捗を自動で管理画面に反映する必要がない

### データの一元管理
- **候補者データにスレッドURLを保存**: どの候補者がどのSlackスレッドに対応するか一目瞭然
- **再送信も可能**: 間違って送信した場合や、チャンネルを変えたい場合に対応

### シンプルな実装
- **親メッセージのみ送信**: 複雑なスレッド管理が不要
- **URLで完結**: Slack API経由でスレッドの内容を取得する必要がない

## 注意事項

### 1. スレッドURLの有効性
- スレッドURLは、Slackワークスペースにログインしているユーザーのみアクセス可能
- チャンネルのメンバーでない場合はアクセスできない

### 2. 再送信
- 再送信すると新しい親メッセージが作成される
- 古いスレッドは残るが、候補者データは新しいスレッドURLを参照する

### 3. チャンネルID
- デフォルトチャンネル（`C07R84TQD4J`）以外に送信する場合は、APIリクエストで指定が必要
- チャンネルIDの取得方法:
  1. Slackでチャンネルを開く
  2. チャンネル名をクリック
  3. 「その他」→「チャンネル詳細」
  4. 下部にチャンネルIDが表示される

### 4. Slack Bot権限
- `chat:write`権限が必要
- チャンネルにBotを追加する必要がある（`/invite @Bot名`）

## トラブルシューティング

### Slack送信に失敗する

**エラー: "Slack通知が有効になっていません"**
- `.env.local`で`SLACK_ENABLED=true`と`SLACK_BOT_TOKEN`が設定されているか確認

**エラー: "channel_not_found"**
- チャンネルIDが正しいか確認
- Botがチャンネルに追加されているか確認

**エラー: "not_authed"**
- `SLACK_BOT_TOKEN`が正しいか確認
- トークンの権限が`chat:write`を含んでいるか確認

### スレッドURLにアクセスできない

**問題: リンクをクリックしても開かない**
- Slackにログインしているか確認
- チャンネルのメンバーであるか確認

### 年齢が正しく表示されない

**問題: 年齢が表示されない**
- 候補者の生年月日が登録されているか確認
- 生年月日の形式が正しいか確認（YYYY-MM-DD）

## 今後の拡張案

### 1. 複数チャンネル対応
- 校舎ごとに異なるチャンネルに自動振り分け
- 候補者のステータスによってチャンネルを変更

### 2. スレッドの既読管理
- Slack APIでスレッドの最終返信時刻を取得
- 未読がある場合に管理画面でバッジ表示

### 3. スレッドサマリー表示
- スレッド内の返信数を管理画面に表示
- 最新の返信内容のプレビュー

### 4. 自動通知の追加
- 特定のステータス変更時にスレッドに通知
- 例: 面接日程が決まった際にスレッドに投稿

## 関連ファイル

- 型定義: [src/types/candidate.ts](../../src/types/candidate.ts)
- Slack関数: [src/lib/slack/notifications.ts](../../src/lib/slack/notifications.ts)
- APIエンドポイント: [src/app/api/slack/send-candidate-message/route.ts](../../src/app/api/slack/send-candidate-message/route.ts)
- UI: [src/app/candidates/[id]/page.tsx](../../src/app/candidates/[id]/page.tsx)
