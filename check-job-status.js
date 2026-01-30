require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

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

(async () => {
  try {
    console.log('=== 求人データのステータス確認 ===\n');
    
    const jobsQuery = query(collection(db, 'jobs'), limit(10));
    const snapshot = await getDocs(jobsQuery);
    
    console.log(`合計: ${snapshot.size}件の求人\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  タイトル: ${data.title || '(なし)'}`);
      console.log(`  ステータス: ${data.status || '(未設定)'}`);
      console.log(`  企業ID: ${data.companyId || '(なし)'}`);
      console.log(`  店舗ID: ${data.storeId || data.storeIds?.join(', ') || '(なし)'}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
})();
