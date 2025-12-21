// 企業データをクリアするスクリプト
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc } = require('firebase/firestore');

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

async function clearCompanies() {
  try {
    console.log('🗑️ 企業データのクリア開始...');
    
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    
    console.log(`📊 ${snapshot.size}件の企業データが見つかりました`);
    
    let deletedCount = 0;
    for (const doc of snapshot.docs) {
      try {
        await deleteDoc(doc.ref);
        deletedCount++;
        console.log(`🗑️ 企業ID: ${doc.id} を削除しました`);
      } catch (error) {
        console.error(`❌ 企業ID: ${doc.id} の削除エラー:`, error);
      }
    }
    
    console.log(`✅ ${deletedCount}件の企業データを削除しました`);
    
  } catch (error) {
    console.error('❌ 企業データクリアエラー:', error);
  }
  
  process.exit(0);
}

clearCompanies();