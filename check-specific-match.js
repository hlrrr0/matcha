const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkMatchData() {
  const matchId = 'pTiJLgk5NbeOKBgTM7R4';
  
  try {
    const matchDoc = await db.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      console.log('❌ Match not found');
      return;
    }
    
    const matchData = matchDoc.data();
    console.log('✅ Match found:', matchId);
    console.log('\n📋 Timeline items:');
    
    if (matchData.timeline && Array.isArray(matchData.timeline)) {
      matchData.timeline
        .filter(item => item.status === 'interview')
        .forEach((item, idx) => {
          console.log(`\n面接イベント ${idx + 1}:`);
          console.log('  ID:', item.id);
          console.log('  Status:', item.status);
          console.log('  Timestamp:', item.timestamp?.toDate?.() || item.timestamp);
          
          if (item.eventDate) {
            const eventDate = item.eventDate.toDate ? item.eventDate.toDate() : new Date(item.eventDate);
            console.log('  eventDate (raw):', item.eventDate);
            console.log('  eventDate (converted):', eventDate.toISOString());
            console.log('  eventDate (JST):', eventDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
            console.log('  日付:', eventDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }));
            console.log('  時刻:', eventDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
          } else {
            console.log('  eventDate: なし');
          }
        });
    } else {
      console.log('❌ Timeline not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkMatchData();
