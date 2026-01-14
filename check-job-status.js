const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDmxEr7vQ6dVyPtZ5NNwzaCLDzOKEH-BrQ",
  authDomain: "tenshoku-28e18.firebaseapp.com",
  projectId: "tenshoku-28e18",
  storageBucket: "tenshoku-28e18.firebasestorage.app",
  messagingSenderId: "862088826186",
  appId: "1:862088826186:web:fde0e69889df06a3b0fe50",
  measurementId: "G-W2YPTTRN55"
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
