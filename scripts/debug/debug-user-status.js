// Firebase Admin SDKを使用してユーザー情報を確認するスクリプト
const admin = require('firebase-admin');

// サービスアカウントキーの設定（環境変数から読み込み）
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'agent-system-db'
  });
}

const db = admin.firestore();

async function checkUserStatus(uid) {
  try {
    console.log(`🔍 ユーザー ${uid} の情報を確認中...`);
    
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📋 ユーザー情報:', JSON.stringify(userData, null, 2));
    
    console.log('🔍 アクセス制御状況:');
    console.log(`  - Role: ${userData.role}`);
    console.log(`  - Status: ${userData.status}`);
    console.log(`  - isApproved: ${userData.role === 'user' || userData.role === 'admin'}`);
    console.log(`  - isActive: ${userData.status === 'active'}`);
    console.log(`  - canAccess: ${(userData.role === 'user' || userData.role === 'admin') && userData.status === 'active'}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// コマンドライン引数からUIDを取得
const uid = process.argv[2];
if (!uid) {
  console.log('使用方法: node debug-user-status.js <UID>');
  process.exit(1);
}

checkUserStatus(uid);