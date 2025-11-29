const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCandidateProgress() {
  const candidateId = 'AV4CGbI1wDXJmIzkubZC';
  
  console.log(`\n🔍 求職者ID: ${candidateId} の進捗を確認中...\n`);
  
  try {
    // matchesコレクションから該当候補者のマッチングを取得
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('candidateId', '==', candidateId));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 全マッチング数: ${querySnapshot.size}`);
    
    if (querySnapshot.empty) {
      console.log('❌ マッチングデータが見つかりません');
      return;
    }
    
    const matches = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        status: data.status,
        jobId: data.jobId,
        companyId: data.companyId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    
    console.log('\n📋 全マッチング一覧:');
    matches.forEach((match, index) => {
      console.log(`  ${index + 1}. ID: ${match.id}`);
      console.log(`     ステータス: ${match.status}`);
      console.log(`     求人ID: ${match.jobId}`);
      console.log(`     企業ID: ${match.companyId}`);
      console.log('');
    });
    
    // アクティブな進捗をフィルタリング
    const activeStatuses = ['suggested', 'interested', 'applied', 'interviewing', 'offered'];
    const activeMatches = matches.filter(match => activeStatuses.includes(match.status));
    
    console.log(`\n✅ アクティブな進捗数 (${activeStatuses.join(', ')}): ${activeMatches.length}`);
    
    if (activeMatches.length > 0) {
      console.log('\n📌 アクティブなマッチング:');
      activeMatches.forEach((match, index) => {
        console.log(`  ${index + 1}. ID: ${match.id}, ステータス: ${match.status}`);
      });
    }
    
    // 一覧ページで使用されているステータス
    console.log('\n🔍 一覧ページのフィルタ条件:');
    console.log(`   対象ステータス: ${activeStatuses.join(', ')}`);
    
    // 実際のステータスの分布
    const statusCounts = {};
    matches.forEach(match => {
      statusCounts[match.status] = (statusCounts[match.status] || 0) + 1;
    });
    
    console.log('\n📊 ステータス別の件数:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const isActive = activeStatuses.includes(status);
      console.log(`   ${status}: ${count}件 ${isActive ? '✅ アクティブ' : '❌ 非アクティブ'}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  process.exit(0);
}

checkCandidateProgress();
