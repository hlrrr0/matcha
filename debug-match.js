// 特定のマッチデータをデバッグするスクリプト
const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function debugMatch() {
  const matchId = 'pTiJLgk5NbeOKBgTM7R4' // URLから取得したマッチID
  
  try {
    const matchDoc = await db.collection('matches').doc(matchId).get()
    
    if (!matchDoc.exists) {
      console.log('❌ マッチが見つかりません')
      return
    }
    
    const matchData = matchDoc.data()
    
    // 候補者情報を取得
    const candidateDoc = await db.collection('candidates').doc(matchData.candidateId).get()
    const candidateData = candidateDoc.data()
    
    console.log('\n=== 基本情報 ===')
    console.log('候補者名:', candidateData.lastName, candidateData.firstName)
    console.log('ステータス:', matchData.status)
    
    // 面接タイムラインを探す
    const interviewTimeline = matchData.timeline.find(t => t.status === 'interview')
    if (interviewTimeline && interviewTimeline.eventDate) {
      console.log('\n=== 面接日時 ===')
      console.log('eventDate (raw):', interviewTimeline.eventDate)
      console.log('eventDate (converted):', interviewTimeline.eventDate.toDate())
      console.log('eventDate (JST):', interviewTimeline.eventDate.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    } else {
      console.log('\n❌ 面接日時が設定されていません')
    }
    
    return
    
    // 以下は元のコード
    const matchDoc2 = await db.collection('matches').doc(matchId).get()
    
    if (!matchDoc.exists) {
      console.log('❌ マッチが見つかりません')
      return
    }
    
    const matchData = matchDoc.data()
    
    console.log('\n=== Match Data ===')
    console.log('Match ID:', matchId)
    console.log('Status:', matchData.status)
    console.log('Candidate ID:', matchData.candidateId)
    console.log('Job ID:', matchData.jobId)
    console.log('\n=== Interview Date ===')
    console.log('interviewDate:', matchData.interviewDate)
    console.log('interviewDate type:', typeof matchData.interviewDate)
    
    console.log('\n=== Timeline ===')
    if (matchData.timeline && Array.isArray(matchData.timeline)) {
      console.log('Timeline length:', matchData.timeline.length)
      matchData.timeline.forEach((item, idx) => {
        console.log(`\nTimeline[${idx}]:`)
        console.log('  - id:', item.id)
        console.log('  - status:', item.status)
        console.log('  - timestamp:', item.timestamp)
        console.log('  - eventDate:', item.eventDate)
        console.log('  - eventDate type:', typeof item.eventDate)
        console.log('  - description:', item.description)
        console.log('  - notes:', item.notes)
      })
      
      // 面接ステータスのタイムラインを探す
      const interviewTimelines = matchData.timeline.filter(t => t.status === 'interview')
      console.log('\n=== Interview Timelines ===')
      console.log('Count:', interviewTimelines.length)
      interviewTimelines.forEach((item, idx) => {
        console.log(`\nInterview Timeline[${idx}]:`)
        console.log('  - eventDate:', item.eventDate)
        console.log('  - eventDate type:', typeof item.eventDate)
        if (item.eventDate) {
          if (item.eventDate.toDate) {
            console.log('  - eventDate (converted):', item.eventDate.toDate())
          } else {
            console.log('  - eventDate (as Date):', new Date(item.eventDate))
          }
        }
      })
    } else {
      console.log('Timeline not found or not an array')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

debugMatch()
