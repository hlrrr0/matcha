/**
 * Public API マニュアルテストガイド
 * 
 * このファイルには、Public APIを手動でテストする手順が記載されています。
 */

// ===================================
// 1. テスト用APIキーの作成
// ===================================

/**
 * Firebaseコンソールまたは管理画面で以下のAPIキーを作成してください：
 * 
 * コレクション: apiKeys
 * ドキュメントID: test-api-key-12345
 * 
 * データ:
 * {
 *   key: "test-api-key-12345",
 *   name: "テスト用APIキー",
 *   clientName: "Test Client",
 *   isActive: true,
 *   plan: "standard",
 *   dailyLimit: 50,
 *   requestCount: 0,
 *   lastResetDate: "2026-01-06",
 *   allowedOrigins: ["http://localhost:3000"],
 *   allowedIPs: [],
 *   createdAt: Firebase Timestamp,
 *   totalRequests: 0
 * }
 */

// ===================================
// 2. curlコマンドでのテスト
// ===================================

/**
 * テスト1: Export API（正常系）
 */
const test1 = `
curl -X GET "http://localhost:3000/api/public/jobs/export?limit=10" \\
  -H "X-API-Key: test-api-key-12345" \\
  | jq .
`

/**
 * テスト2: Export API（認証エラー）
 */
const test2 = `
curl -X GET "http://localhost:3000/api/public/jobs/export" \\
  -H "X-API-Key: invalid-key" \\
  | jq .
`

/**
 * テスト3: Export API（APIキーなし）
 */
const test3 = `
curl -X GET "http://localhost:3000/api/public/jobs/export" \\
  | jq .
`

/**
 * テスト4: Export API（パラメータテスト）
 */
const test4 = `
curl -X GET "http://localhost:3000/api/public/jobs/export?limit=5&includeCompanies=true&includeStores=false" \\
  -H "X-API-Key: test-api-key-12345" \\
  | jq .
`

/**
 * テスト5: 個別取得API（求人IDを実際のIDに置き換えてください）
 */
const test5 = `
curl -X GET "http://localhost:3000/api/public/jobs/YOUR_JOB_ID" \\
  -H "X-API-Key: test-api-key-12345" \\
  | jq .
`

/**
 * テスト6: レート制限テスト
 * 
 * standardプランは50リクエスト/日なので、51回リクエストして制限を確認
 */
const test6 = `
for i in {1..51}; do
  echo "Request $i"
  curl -X GET "http://localhost:3000/api/public/jobs/export?limit=1" \\
    -H "X-API-Key: test-api-key-12345"
  echo ""
done
`

// ===================================
// 3. ブラウザコンソールでのテスト
// ===================================

/**
 * ブラウザのコンソールで以下を実行:
 */

// テスト1: Export API
async function testExportAPI() {
  const response = await fetch('http://localhost:3000/api/public/jobs/export?limit=5', {
    headers: {
      'X-API-Key': 'test-api-key-12345'
    }
  })
  const data = await response.json()
  console.log('Export API Response:', data)
  return data
}

// テスト2: 認証エラー
async function testAuthError() {
  const response = await fetch('http://localhost:3000/api/public/jobs/export', {
    headers: {
      'X-API-Key': 'invalid-key'
    }
  })
  const data = await response.json()
  console.log('Auth Error Response:', data)
  return data
}

// テスト3: 個別取得API
async function testGetJob(jobId) {
  const response = await fetch(`http://localhost:3000/api/public/jobs/${jobId}`, {
    headers: {
      'X-API-Key': 'test-api-key-12345'
    }
  })
  const data = await response.json()
  console.log('Get Job Response:', data)
  return data
}

// ===================================
// 4. 期待される結果
// ===================================

/**
 * Export API（正常系）:
 * {
 *   "success": true,
 *   "data": {
 *     "exportedAt": "2026-01-06T...",
 *     "totalCount": 5,
 *     "jobs": [...],
 *     "companies": [...],
 *     "stores": [...]
 *   }
 * }
 */

/**
 * 認証エラー:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "UNAUTHORIZED",
 *     "message": "Invalid API key"
 *   }
 * }
 */

/**
 * レート制限超過:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "TOO_MANY_REQUESTS",
 *     "message": "Daily rate limit exceeded. Please try again tomorrow."
 *   }
 * }
 */

/**
 * 求人が見つからない:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "Job not found"
 *   }
 * }
 */

// ===================================
// 5. チェックリスト
// ===================================

const checklist = [
  '✅ APIキーがFirestoreに作成されている',
  '✅ 開発サーバーが起動している (npm run dev)',
  '✅ 募集中の求人データが存在する',
  '✅ Export APIが200を返す',
  '✅ Export APIがデータを返す',
  '✅ 無効なAPIキーで401を返す',
  '✅ APIキーなしで401を返す',
  '✅ limitパラメータが機能する',
  '✅ includeCompanies/includeStoresが機能する',
  '✅ 個別取得APIが機能する',
  '✅ レート制限が機能する',
  '✅ キャッシュヘッダーが設定されている'
]

console.log('Public API Test Checklist:')
checklist.forEach(item => console.log(item))

// ===================================
// 6. トラブルシューティング
// ===================================

/**
 * Q: "Invalid API key"エラーが出る
 * A: Firestoreに"apiKeys"コレクションとテスト用キーが作成されているか確認
 * 
 * Q: "Job not found"が返される
 * A: status='active'の求人が存在するか確認
 * 
 * Q: データが空で返される
 * A: 募集中の求人と、関連する企業・店舗が'active'状態か確認
 * 
 * Q: レート制限が機能しない
 * A: lastResetDateが今日の日付（YYYY-MM-DD形式）になっているか確認
 */

module.exports = {
  test1,
  test2,
  test3,
  test4,
  test5,
  test6,
  testExportAPI,
  testAuthError,
  testGetJob,
  checklist
}
