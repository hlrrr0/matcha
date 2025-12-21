// テスト用のマッチングデータを作成するスクリプト
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBEOGEOGcMmUk8VRj70zDiGu2gqVyMZqso",
  authDomain: "agent-system-bc2ec.firebaseapp.com",
  projectId: "agent-system-bc2ec",
  storageBucket: "agent-system-bc2ec.firebasestorage.app",
  messagingSenderId: "577455306516",
  appId: "1:577455306516:web:bda95e6926996d89ea5bd8"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function createTestMatches() {
  try {
    console.log('🔍 既存データを確認中...')
    
    // 候補者、求人、企業データを取得
    const candidates = await getDocs(collection(db, 'candidates'))
    const jobs = await getDocs(collection(db, 'jobs'))
    const companies = await getDocs(collection(db, 'companies'))
    
    if (candidates.empty || jobs.empty) {
      console.log('❌ 候補者または求人データが不足しています')
      return
    }
    
    const candidateList = candidates.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const jobList = jobs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const companyList = companies.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    console.log(`📋 データ確認:`)
    console.log(`  候補者: ${candidateList.length}件`)
    console.log(`  求人: ${jobList.length}件`)
    console.log(`  企業: ${companyList.length}件`)
    
    // テストマッチングを作成
    const testMatches = [
      {
        candidateId: candidateList[0]?.id || 'test-candidate-1',
        jobId: jobList[0]?.id || 'test-job-1',
        companyId: companyList[0]?.id || 'test-company-1',
        score: 85,
        status: 'suggested',
        matchReasons: [
          {
            type: 'skill',
            description: 'TypeScript/Reactの経験が豊富',
            weight: 0.8
          },
          {
            type: 'experience',
            description: '3年以上のWebアプリ開発経験',
            weight: 0.7
          }
        ],
        timeline: [
          {
            id: 'timeline_1',
            status: 'suggested',
            timestamp: new Date(),
            description: 'AIマッチングシステムによる自動提案',
            createdBy: 'system'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        notes: 'AIによる自動マッチング'
      },
      {
        candidateId: candidateList[0]?.id || 'test-candidate-1',
        jobId: jobList[1]?.id || 'test-job-2',
        companyId: companyList[1]?.id || 'test-company-2',
        score: 92,
        status: 'interested',
        matchReasons: [
          {
            type: 'skill',
            description: 'Node.js/Express経験あり',
            weight: 0.9
          },
          {
            type: 'location',
            description: '希望勤務地が一致',
            weight: 0.6
          }
        ],
        timeline: [
          {
            id: 'timeline_1',
            status: 'suggested',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
            description: 'マッチング提案',
            createdBy: 'system'
          },
          {
            id: 'timeline_2',
            status: 'interested',
            timestamp: new Date(),
            description: '候補者が興味を示しました',
            createdBy: 'recruiter-1'
          }
        ],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ]
    
    if (candidateList.length > 1) {
      testMatches.push({
        candidateId: candidateList[1]?.id,
        jobId: jobList[0]?.id || 'test-job-1',
        companyId: companyList[0]?.id || 'test-company-1',
        score: 78,
        status: 'applied',
        matchReasons: [
          {
            type: 'experience',
            description: 'フロントエンド開発経験',
            weight: 0.7
          },
          {
            type: 'culture',
            description: 'スタートアップ環境に適合',
            weight: 0.5
          }
        ],
        timeline: [
          {
            id: 'timeline_1',
            status: 'suggested',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
            description: 'マッチング提案',
            createdBy: 'system'
          },
          {
            id: 'timeline_2',
            status: 'interested',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
            description: '候補者が興味を示しました',
            createdBy: 'recruiter-1'
          },
          {
            id: 'timeline_3',
            status: 'applied',
            timestamp: new Date(),
            description: '正式に応募しました',
            createdBy: 'recruiter-1',
            notes: '履歴書・職務経歴書を企業に送付'
          }
        ],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        createdBy: 'system'
      })
    }
    
    console.log('🔥 テストマッチングを作成中...')
    for (const match of testMatches) {
      const docRef = await addDoc(collection(db, 'matches'), match)
      console.log(`✅ マッチング作成: ${docRef.id}`)
    }
    
    console.log('🎉 テストマッチング作成完了!')
    console.log(`📊 ${testMatches.length}件のマッチングを作成しました`)
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

// 既存のマッチングデータを確認
async function checkExistingMatches() {
  try {
    const matches = await getDocs(collection(db, 'matches'))
    console.log(`📋 既存マッチング数: ${matches.docs.length}件`)
    
    matches.docs.forEach(doc => {
      const data = doc.data()
      console.log(`  - ${doc.id}: ${data.candidateId} -> ${data.jobId} (${data.status})`)
    })
    
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

// 実行
async function main() {
  console.log('🚀 マッチングデータ初期化開始...')
  await checkExistingMatches()
  await createTestMatches()
}

main().then(() => {
  console.log('✅ 完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ 失敗:', error)
  process.exit(1)
})