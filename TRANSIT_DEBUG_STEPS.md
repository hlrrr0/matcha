# TRANSIT（電車）モード経路検索 デバッグ手順

## ステップ1: Google Cloud Console - API有効化確認

### 1-1. Directions API
- URL: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com?project=agent-system-23630
- ステータス: [ ] 有効 / [ ] 無効
- アクション: 「有効にする」をクリック

### 1-2. Places API (New)
- URL: https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=agent-system-23630
- ステータス: [ ] 有効 / [ ] 無効
- アクション: 「有効にする」をクリック
- **重要**: TRANSITモードには必須

### 1-3. Routes API
- URL: https://console.cloud.google.com/apis/library/routes.googleapis.com?project=agent-system-23630
- ステータス: [ ] 有効 / [ ] 無効
- アクション: 「有効にする」をクリック（代替手段として使用）

---

## ステップ2: APIキー設定確認

### 2-1. フロントエンド用APIキー（現在: AIzaSyBOy7iW9Q9_kfu9FtyLdv8ANBh2bNnaRKI）
- URL: https://console.cloud.google.com/apis/credentials?project=agent-system-23630
- 確認項目:
  - [ ] HTTPリファラー制限: `localhost:3000/*` が含まれているか
  - [ ] API制限: 以下が含まれているか
    - Maps JavaScript API
    - Directions API
    - Places API
    - Geocoding API

### 2-2. サーバーサイド用APIキー（現在: AIzaSyBOy7iW9Q9_kfu9FtyLdv8ANBh2bNnaRKI）
- 確認項目:
  - [ ] API制限: 「制限しない」または上記API全て含む
  - [ ] IP制限: なし（開発環境）

---

## ステップ3: テスト実行

### 3-1. ブラウザでテスト
1. ブラウザを開く: http://localhost:3000/jobs
2. マップ上のピンをクリック
3. 出発地に「渋谷駅」を入力
4. 「電車」モードを選択
5. 「経路を検索」ボタンをクリック
6. ブラウザのコンソール（F12）を開いて、以下を確認:
   - [ ] `経路検索リクエスト:` のログが表示される
   - [ ] `transitOptions詳細:` のログが表示される
   - [ ] エラーメッセージの内容

**期待される結果**: 経路が表示される
**実際の結果**: （ここに記入）

### 3-2. cURLでRoutes APIをテスト
```bash
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{"origin":"渋谷駅","destination":"新宿駅","travelMode":"TRANSIT"}' \
  | jq
```

**期待される結果**: routesオブジェクトが返る
**実際の結果**: （ここに記入）

---

## ステップ4: 問題の特定

### 4-1. APIキーの問題か？
- [ ] REQUEST_DENIED エラーが出る → APIキーの制限を確認（ステップ2）
- [ ] ZERO_RESULTS が返る → ステップ4-2へ

### 4-2. データの問題か？
テストケース:
```javascript
// コンソールで実行
const service = new google.maps.DirectionsService();
service.route({
  origin: "東京駅",
  destination: "新宿駅",
  travelMode: "TRANSIT",
  transitOptions: {
    departureTime: new Date(),
    modes: ["TRAIN"],
    routingPreference: "FEWER_TRANSFERS"
  }
}, (result, status) => {
  console.log("Status:", status);
  console.log("Result:", result);
});
```

**結果**: （ここに記入）

### 4-3. プロジェクトの課金は有効か？
- URL: https://console.cloud.google.com/billing?project=agent-system-23630
- [ ] 課金アカウントがリンクされている
- [ ] 無料枠を使い切っていない

---

## ステップ5: 代替手段（Routes API統合）

JavaScript APIでダメな場合、サーバーサイドのRoutes APIを使用します。

### 5-1. Routes APIエンドポイントが動作するか確認
```bash
# ターミナルで実行
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "origin":"渋谷駅",
    "destination":"新宿駅",
    "travelMode":"TRANSIT"
  }'
```

**成功の場合**: routesオブジェクトが返る
**失敗の場合**: エラーメッセージを確認

### 5-2. フロントエンドをRoutes APIに切り替え
`src/components/maps/JobMapView.tsx` の `handleCalculateRoute` 関数を修正して、
`/api/routes` エンドポイントを呼び出すように変更します。

---

## トラブルシューティング

### Q1: "Directions request returned no results" が出る
A1: 以下を確認:
1. Places API (New) が有効か（ステップ1-2）
2. 出発地・目的地が正しいフォーマットか（住所または駅名）
3. departureTime が深夜（0-5時）になっていないか

### Q2: "API_KEY_HTTP_REFERRER_BLOCKED" が出る
A2: APIキーのHTTPリファラー制限に `localhost:3000/*` を追加（ステップ2-1）

### Q3: "Routes API has not been used" が出る
A3: Routes APIを有効化（ステップ1-3）

### Q4: 課金エラーが出る
A4: Google Cloud Consoleで課金アカウントをリンク

---

## 次のアクション

上記のステップを順番に実行して、各ステップの結果を記録してください。
問題が特定できたら、適切な修正を行います。
