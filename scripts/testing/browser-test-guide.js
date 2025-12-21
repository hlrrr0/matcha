// ブラウザのコンソールで実行するテストマッチングデータ作成スクリプト

// Firebaseの初期化とデータベース接続（ブラウザで実行想定）
const testMatch = {
  candidateId: 'zmNk7uNnRJDtsBDfzuQM',  // 既存の候補者ID
  jobId: 'mBnLYErotMuqakXFeT0Y',        // 既存の求人ID
  companyId: 'test-company-1',           // テスト企業ID
  score: 88,
  status: 'interested',
  matchReasons: [
    {
      type: 'skill',
      description: 'TypeScript/React開発経験が豊富',
      weight: 0.9
    },
    {
      type: 'location',
      description: '希望勤務地が一致',
      weight: 0.7
    }
  ],
  timeline: [
    {
      id: 'timeline_1',
      status: 'suggested',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
      description: 'AIマッチングシステムによる自動提案',
      createdBy: 'system'
    },
    {
      id: 'timeline_2',
      status: 'interested',
      timestamp: new Date(),
      description: '候補者が興味を示し、詳細確認を希望',
      createdBy: 'recruiter-hiroki',
      notes: '候補者より「この求人について詳しく知りたい」との連絡あり'
    }
  ],
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(),
  createdBy: 'system',
  notes: 'スキルマッチ度が高く、地理的条件も良好なため優先度高'
}

console.log('ブラウザでテストマッチング作成:')
console.log('1. /progress ページに移動')
console.log('2. 「新規マッチング」ボタンをクリック') 
console.log('3. 以下のデータを入力:')
console.log('   - 候補者: 既存の候補者を選択')
console.log('   - 求人: 既存の求人を選択')
console.log('   - スコア: 88')
console.log('')
console.log('テストデータ構造:', JSON.stringify(testMatch, null, 2))