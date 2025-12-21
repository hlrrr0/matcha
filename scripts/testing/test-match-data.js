// シンプルなテストマッチングデータを作成
const testMatchData = {
  candidateId: 'zmNk7uNnRJDtsBDfzuQM', // 既存の候補者ID
  jobId: 'mBnLYErotMuqakXFeT0Y', // 既存の求人ID  
  companyId: 'test-company-1',
  score: 85,
  status: 'suggested',
  matchReasons: [
    {
      type: 'skill',
      description: 'TypeScript経験豊富',
      weight: 0.8
    }
  ],
  timeline: [
    {
      id: 'timeline_1',
      status: 'suggested',
      timestamp: new Date(),
      description: 'テストマッチング作成',
      createdBy: 'test-user'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test-user'
}

console.log('テストマッチングデータ:')
console.log(JSON.stringify(testMatchData, null, 2))