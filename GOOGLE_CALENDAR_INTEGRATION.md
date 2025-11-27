# Googleカレンダー連携機能

## 概要
面接日程が登録されると、Googleカレンダーに自動的に追加できる機能です。

## 実装方法

現在、以下の2つの方法で実装されています:

### 方法1: Googleカレンダーリンク（現在実装済み）✅

面接ステータスに更新する際、日時を設定すると自動的にGoogleカレンダーが開きます。

**特徴:**
- ✅ 簡単に実装できる
- ✅ Googleアカウントの認証不要
- ✅ すぐに使用可能
- ✅ 面接日程登録時に自動でカレンダーが開く
- ✅ 特定のカレンダーを指定可能

**使い方:**
1. 進捗一覧で面接ステータスに更新
2. 面接日時を入力
3. 「更新」ボタンをクリック
4. 自動的に新しいタブでGoogleカレンダーが開く
5. カレンダーに面接予定が入力された状態で表示される
6. 内容を確認して「保存」ボタンをクリック

**追加されるイベント情報:**
- タイトル: `面接: [求職者名] - [企業名]`
- 説明: 求職者名、企業名、職種、備考
- 場所: 店舗住所または企業住所
- 時間: 設定した日時から1時間

**カレンダーの指定:**
特定のカレンダーに追加したい場合は、環境変数を設定します。

## カレンダーの指定方法

デフォルトでは、ユーザーのメインカレンダー（primary）にイベントが追加されますが、特定のカレンダーを指定することもできます。

### 設定手順:

1. **カレンダーIDを取得**
   - Google Calendarを開く
   - 左側のカレンダーリストから対象カレンダーの「︙」をクリック
   - 「設定と共有」を選択
   - 「カレンダーの統合」セクションまでスクロール
   - 「カレンダーID」をコピー

2. **環境変数を設定**
   `.env.local`ファイルに以下を追加:
   ```env
   # 特定のカレンダーを指定する場合
   NEXT_PUBLIC_DEFAULT_CALENDAR_ID=abc123def456@group.calendar.google.com
   
   # 個人のメインカレンダーを明示的に指定する場合
   NEXT_PUBLIC_DEFAULT_CALENDAR_ID=primary
   
   # または自分のGmailアドレス
   NEXT_PUBLIC_DEFAULT_CALENDAR_ID=your-email@gmail.com
   ```

3. **アプリケーションを再起動**
   ```bash
   npm run dev
   ```

### カレンダーIDの例:

- **個人カレンダー**: `primary` または `your-email@gmail.com`
- **共有カレンダー**: `abc123def456@group.calendar.google.com`
- **部署カレンダー**: `company-dept@group.calendar.google.com`

### 方法2: Google Calendar API（将来の実装）

Google Calendar APIを使用して、完全自動でカレンダーに追加する方法です。

**必要な設定:**
1. Google Cloud Consoleでプロジェクト作成
2. Google Calendar APIを有効化
3. OAuth 2.0認証情報を作成
4. Firebase AuthenticationでGoogleプロバイダー設定
5. 必要なスコープ: `https://www.googleapis.com/auth/calendar.events`

**実装ファイル:**
- `/src/lib/google-calendar.ts` - カレンダー操作関数
- `/src/app/api/calendar/create/route.ts` - APIエンドポイント

## ファイル構成

```
src/
├── lib/
│   └── google-calendar.ts          # Googleカレンダー関連のユーティリティ関数
└── app/
    ├── api/
    │   └── calendar/
    │       └── create/
    │           └── route.ts         # カレンダーイベント作成API（準備中）
    └── progress/
        └── page.tsx                 # 面接日程登録時のカレンダー連携処理
```

## 機能詳細

### generateGoogleCalendarUrl
Googleカレンダーへのイベント追加URLを生成します。

```typescript
const calendarUrl = generateGoogleCalendarUrl(
  'タイトル',
  new Date('2025-12-01T10:00:00'),  // 開始日時
  new Date('2025-12-01T11:00:00'),  // 終了日時
  '説明文',
  '場所'
)
```

### createInterviewEvent
面接情報からカレンダーイベントオブジェクトを生成します（将来のAPI実装用）。

```typescript
const event = createInterviewEvent(
  '山田太郎',              // 求職者名
  '寿司レストラン',        // 企業名
  '寿司職人',              // 職種
  new Date(),              // 面接日時
  60,                      // 時間（分）
  '事前準備が必要',        // 備考
  '東京都渋谷区...'        // 住所
)
```

## トラブルシューティング

### カレンダーが自動で開かない
- **ポップアップブロッカーを確認**
  - ブラウザのアドレスバー右側にポップアップブロックのアイコンが表示されていないか確認
  - ブラウザの設定で当サイトのポップアップを許可してください
  - Chrome: 設定 > プライバシーとセキュリティ > サイトの設定 > ポップアップとリダイレクト
  - Safari: 環境設定 > Webサイト > ポップアップウィンドウ

### 面接日時が正しく表示されない
- タイムゾーンは「Asia/Tokyo」で固定されています
- 日時入力形式を確認してください
- ブラウザの日時設定を確認してください

### 指定したカレンダーに追加されない
- カレンダーIDが正しく設定されているか確認してください
- `.env.local`ファイルを編集後、アプリケーションを再起動してください
- カレンダーIDにスペースや余分な文字が含まれていないか確認してください
- Googleカレンダーでそのカレンダーへの書き込み権限があるか確認してください

### 複数件の面接を一括登録したい
- 現在は1件ずつの登録のみサポートしています
- 複数件の場合は、個別に面接ステータスを更新してください

## 今後の改善予定

- [ ] 複数件の一括カレンダー登録
- [ ] リマインダーのカスタマイズ
- [ ] 面接時間（終了時刻）の設定オプション
- [ ] 企業担当者のメールアドレスを招待者に追加
- [ ] Google Calendar API完全実装
- [ ] カレンダー同期（更新・削除の反映）

## 参考リンク

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Firebase Authentication with Google](https://firebase.google.com/docs/auth/web/google-signin)
