// 不整合データをクリーンアップするスクリプト
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCtUxqKOhcJg6tC2ZnDTrOa0v9m0Uh7CgQ",
  authDomain: "agent-system-23630.firebaseapp.com",
  projectId: "agent-system-23630",
  storageBucket: "agent-system-23630.firebasestorage.app",
  messagingSenderId: "644508977654",
  appId: "1:644508977654:web:6e5fde7bcadc5b92a78b8f",
  measurementId: "G-TX7Q4JWV7M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCompanyData() {
  try {
    console.log('🔍 企業データの整合性チェック開始...');
    
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    
    console.log(`📊 総企業数: ${snapshot.size}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        // 個別に企業データを再取得して存在確認
        const docRef = doc(db, 'companies', docSnapshot.id);
        const recheck = await getDoc(docRef);
        
        if (recheck.exists()) {
          const data = recheck.data();
          console.log(`✅ 有効: ${docSnapshot.id} - ${data.name || 'Unknown'}`);
          validCount++;
        } else {
          console.log(`❌ 無効: ${docSnapshot.id} - データが存在しません`);
          invalidCount++;
        }
      } catch (error) {
        console.error(`❌ チェックエラー ${docSnapshot.id}:`, error);
        invalidCount++;
      }
    }
    
    console.log(`📋 チェック完了: 有効 ${validCount}件, 無効 ${invalidCount}件`);
    
  } catch (error) {
    console.error('❌ 整合性チェックエラー:', error);
  }
  
  process.exit(0);
}

checkCompanyData();