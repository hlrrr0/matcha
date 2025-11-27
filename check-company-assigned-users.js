#!/usr/bin/env node

/**
 * 企業の担当者設定を確認するスクリプト
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase設定
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

async function checkCompanyAssignedUsers() {
  try {
    console.log('🔍 企業の担当者設定を確認中...\n');
    
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    
    console.log(`📋 企業総数: ${companiesSnapshot.size}\n`);
    
    let withAssignedUser = 0;
    let withoutAssignedUser = 0;
    
    const companiesWithAssigned = [];
    const companiesWithoutAssigned = [];
    
    companiesSnapshot.forEach(doc => {
      const company = doc.data();
      const hasAssigned = !!company.assignedUserId;
      
      if (hasAssigned) {
        withAssignedUser++;
        companiesWithAssigned.push({
          id: doc.id,
          name: company.name,
          assignedUserId: company.assignedUserId
        });
      } else {
        withoutAssignedUser++;
        companiesWithoutAssigned.push({
          id: doc.id,
          name: company.name
        });
      }
    });
    
    console.log('📊 集計結果:');
    console.log(`  ✅ 担当者設定あり: ${withAssignedUser}件`);
    console.log(`  ❌ 担当者設定なし: ${withoutAssignedUser}件\n`);
    
    if (companiesWithAssigned.length > 0) {
      console.log('✅ 担当者が設定されている企業:');
      companiesWithAssigned.forEach(company => {
        console.log(`  - ${company.name} (ID: ${company.id})`);
        console.log(`    担当者ID: ${company.assignedUserId}`);
      });
      console.log('');
    }
    
    if (companiesWithoutAssigned.length > 0 && companiesWithoutAssigned.length <= 10) {
      console.log('❌ 担当者が未設定の企業:');
      companiesWithoutAssigned.forEach(company => {
        console.log(`  - ${company.name} (ID: ${company.id})`);
      });
      console.log('');
    } else if (companiesWithoutAssigned.length > 10) {
      console.log(`❌ 担当者が未設定の企業: ${companiesWithoutAssigned.length}件（多数のため省略）\n`);
    }
    
    // ユーザーデータとの突合
    if (companiesWithAssigned.length > 0) {
      console.log('🔄 ユーザーデータとの突合確認中...\n');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = new Set();
      const usersMap = new Map();
      
      usersSnapshot.forEach(doc => {
        userIds.add(doc.id);
        usersMap.set(doc.id, doc.data());
      });
      
      console.log('👥 存在確認:');
      companiesWithAssigned.forEach(company => {
        const exists = userIds.has(company.assignedUserId);
        const user = usersMap.get(company.assignedUserId);
        console.log(`  ${exists ? '✅' : '❌'} ${company.name}`);
        if (exists && user) {
          console.log(`    → ${user.displayName || user.email} (status: ${user.status || 'N/A'})`);
        } else if (!exists) {
          console.log(`    → ⚠️ ユーザーID ${company.assignedUserId} が見つかりません`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
  }
}

checkCompanyAssignedUsers().then(() => {
  console.log('\n✅ 確認完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
