# Indeed掲載判定バッチシステム

Cloud Run で週次実行し、Firestore の企業データをもとに Indeed 掲載状況を判定するバッチシステム。

## 構成

```
cloud-run/indeed-checker/
├── main.py              # Flask エントリポイント
├── indeed_checker.py    # Indeed 判定ロジック
├── firestore_service.py # Firestore CRUD
├── normalization.py     # 企業名正規化
├── requirements.txt     # 依存ライブラリ
├── Dockerfile           # コンテナ定義
└── README.md            # このファイル
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `GOOGLE_API_KEY` | Google Custom Search API キー |
| `GOOGLE_CX` | カスタム検索エンジン ID |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |

## デプロイ

```bash
# ビルド & デプロイ
gcloud run deploy indeed-checker \
  --source . \
  --region asia-northeast1 \
  --no-allow-unauthenticated \
  --concurrency 1 \
  --max-instances 1 \
  --timeout 900 \
  --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_CX=GOOGLE_CX:latest

# スケジューラ設定（毎週月曜深夜3:00 JST）
gcloud scheduler jobs create http indeed-checker-weekly \
  --schedule="0 3 * * 1" \
  --time-zone="Asia/Tokyo" \
  --uri="https://indeed-checker-XXXXX.a.run.app/run" \
  --http-method=POST \
  --oidc-service-account-email=indeed-checker@PROJECT_ID.iam.gserviceaccount.com
```

## 判定ロジック

1. Firestore から全企業を取得
2. 企業名を正規化
3. Google Custom Search API で `site:jp.indeed.com/cmp/ "正規化企業名"` を検索
4. ヒットした URL の `/jobs` パスに HEAD リクエスト
5. 結果を Firestore に書き込み（`indeedStatus`）
6. 関連する Jobs の `indeedControl.canPost` を更新

## アクセス制御

- Cloud Run: 外部公開なし（`--no-allow-unauthenticated`）
- concurrency: 1（同時実行なし）
- max-instances: 1
- リクエスト間隔: 3〜5秒の sleep
- 実行時間帯: 深夜3:00 JST
