# Google Maps JavaScript API セットアップガイド

## 1. Google Cloud Console でAPIキーを取得

### 手順:

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com/ にアクセス
   - プロジェクトを選択（または新規作成）

2. **APIs & Services > Credentials に移動**
   - 左メニューから「APIとサービス」→「認証情報」を選択

3. **APIキーを作成**
   - 「認証情報を作成」→「APIキー」をクリック
   - APIキーが生成されます

4. **APIキーを制限（推奨）**
   - 生成されたAPIキーの右側の「編集」アイコンをクリック
   - 「アプリケーションの制限」で「HTTPリファラー（ウェブサイト）」を選択
   - リファラーを追加:
     - `localhost:3000/*`（開発環境）
     - `your-production-domain.com/*`（本番環境）
   - 「API の制限」で「キーを制限」を選択し、以下のAPIを有効化:
     - Maps JavaScript API
     - Geocoding API
     - Places API (optional)

5. **必要なAPIを有効化**
   - 「APIとサービス」→「ライブラリ」から以下を検索して有効化:
     - **Maps JavaScript API** ✅
     - **Geocoding API** ✅
     - **Directions API** ✅ (経路検索機能用)
     - **Places API** (オプション)

## 2. 環境変数に設定

`.env.local` ファイルにAPIキーを追加:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

⚠️ **注意**: 
- `NEXT_PUBLIC_` プレフィックスが必要です（クライアントサイドで使用するため）
- `.env.local` はGitにコミットしないでください

## 3. 既存の店舗データに緯度経度を追加

店舗の住所から自動的に緯度経度を取得するスクリプトを実行:

```bash
# スクリプト実行例（実装予定）
npm run geocode-stores
```

または、店舗編集画面で住所を入力すると自動的に緯度経度が取得されます。

## 4. 使い方

### 求人管理画面でマップ表示

1. `/jobs` にアクセス
2. 「マップ表示」タブをクリック
3. 地図上のマーカーをクリックして求人詳細を表示

### マーカーの色:
- 🟢 **緑**: 募集中（active）
- ⚪ **灰色**: 下書き（draft）
- 🔴 **赤**: 募集終了（closed）
### 経路検索機能

1. マップ上のマーカー（店舗または求人）をクリック
2. 右上に表示される経路検索パネルで以下を設定:
   - 出発地を入力（または📍ボタンで現在地を取得）
   - 移動手段を選択（🚃電車/🚗車/🚶徒歩）
3. 「経路を検索」ボタンをクリック
4. 左上に経路情報パネルが表示され、マップ上に経路が描画されます

**電車モードの場合:**
- 路線名、乗車駅、降車駅
- 停車駅数
- 所要時間と距離
## 5. 料金について

Google Maps JavaScript API は無料枠があります:

- **Maps JavaScript API**: 月28,000回まで無料
- **Geocoding API**: 月40,000回まで無料

通常の使用であれば無料枠内で収まります。

詳細: https://cloud.google.com/maps-platform/pricing

## トラブルシューティング

### エラー: "Google Maps APIキーが設定されていません"
→ `.env.local` にAPIキーを設定して、サーバーを再起動してください

### エラー: "RefererNotAllowedMapError"
→ Google Cloud Console でHTTPリファラーの制限を確認してください

### エラー: "Directions Service: You're calling a legacy API"
→ Google Cloud Console で **Directions API** を有効化してください:
1. https://console.cloud.google.com/apis/library/directions-backend.googleapis.com にアクセス
2. 「有効にする」ボタンをクリック
3. APIキーの制限設定で「Directions API」を追加

### マーカーが表示されない
→ 店舗データに緯度経度（latitude, longitude）が設定されているか確認してください

### 経路が表示されない
→ 以下を確認してください:
- Directions APIが有効化されているか
- 出発地と目的地が正しく入力されているか
- APIキーの制限設定で「Directions API」が許可されているか

## 今後の機能拡張案

- [x] 店舗作成/編集時に住所から自動的に緯度経度を取得
- [x] 経路検索機能（電車/車/徒歩）
- [ ] エリアで絞り込み（マップの表示範囲で自動フィルタ）
- [ ] マーカークラスタリング（多数の求人がある場合）
- [ ] 店舗一覧ページにもマップ表示を追加
- [ ] 複数の経路オプションを表示（最速ルート、最安ルート等）
