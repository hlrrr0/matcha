/**
 * 店舗の住所から緯度経度を一括取得してFirestoreに保存するスクリプト
 * 
 * 使い方:
 * node bulk-geocode-stores.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Geocoding APIキー（環境変数から取得）
const GEOCODING_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY;

// Firebase設定（環境変数から取得）
const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (!GEOCODING_API_KEY || !FIREBASE_CONFIG.apiKey) {
  console.error('エラー: 環境変数が設定されていません。.env.localファイルを確認してください。');
  process.exit(1);
}

// 住所から緯度経度を取得する関数
async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GEOCODING_API_KEY}&language=ja`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.status === 'OK' && json.results.length > 0) {
            const location = json.results[0].geometry.location;
            resolve({
              lat: location.lat,
              lng: location.lng,
              formattedAddress: json.results[0].formatted_address
            });
          } else {
            reject(new Error(`Geocoding failed: ${json.status}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Firestore REST APIで店舗を取得（ページネーション対応）
async function getStores() {
  let allStores = [];
  let pageToken = null;
  
  do {
    const url = pageToken 
      ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/stores?pageSize=300&pageToken=${pageToken}`
      : `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/stores?pageSize=300`;
    
    const result = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.documents) {
      allStores = allStores.concat(result.documents);
    }
    
    pageToken = result.nextPageToken;
  } while (pageToken);
  
  return allStores;
}

// Firestore REST APIで店舗を更新
async function updateStore(storeId, latitude, longitude) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/stores/${storeId}?updateMask.fieldPaths=latitude&updateMask.fieldPaths=longitude&updateMask.fieldPaths=updatedAt`;
    
    const updateData = {
      fields: {
        latitude: { doubleValue: latitude },
        longitude: { doubleValue: longitude },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };
    
    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Failed to update: ${res.statusCode} ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify(updateData));
    req.end();
  });
}

// Firestoreのフィールド値を取得するヘルパー関数
function getFieldValue(fields, fieldName) {
  if (!fields || !fields[fieldName]) return null;
  
  const field = fields[fieldName];
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  
  return null;
}

// ディレイ関数（APIレート制限対策）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bulkGeocodeStores() {
  try {
    console.log('===== 店舗の緯度経度一括取得開始 =====\n');

    // すべての店舗を取得
    console.log('店舗データを取得中...');
    const stores = await getStores();
    console.log(`総店舗数: ${stores.length}件\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const storeDoc of stores) {
      const fields = storeDoc.fields;
      const storeId = storeDoc.name.split('/').pop();
      const storeName = getFieldValue(fields, 'name') || '(名前なし)';
      const address = getFieldValue(fields, 'address');
      const latitude = getFieldValue(fields, 'latitude');
      const longitude = getFieldValue(fields, 'longitude');
      
      console.log(`\n処理中: ${storeName} (ID: ${storeId})`);

      // すでに緯度経度がある場合はスキップ
      if (latitude && longitude) {
        console.log('  ✓ すでに緯度経度情報があります');
        console.log(`    緯度: ${latitude}, 経度: ${longitude}`);
        skipCount++;
        continue;
      }

      // 住所がない場合はスキップ
      if (!address || address.trim() === '') {
        console.log('  ⚠ 住所がありません - スキップ');
        skipCount++;
        continue;
      }

      try {
        console.log(`  住所: ${address}`);
        console.log('  緯度経度を取得中...');

        // Geocoding APIを呼び出し
        const result = await geocodeAddress(address);
        
        console.log(`  ✓ 取得成功`);
        console.log(`    緯度: ${result.lat}`);
        console.log(`    経度: ${result.lng}`);
        console.log(`    正規化された住所: ${result.formattedAddress}`);

        // Firestoreに保存
        await updateStore(storeId, result.lat, result.lng);

        console.log('  ✓ Firestoreに保存しました');
        successCount++;

        // APIレート制限対策: 1秒待機
        await delay(1000);

      } catch (error) {
        console.error(`  ✗ エラー: ${error.message}`);
        errorCount++;
        errors.push({
          storeId,
          name: storeName,
          address: address,
          error: error.message
        });
      }
    }

    // 結果サマリー
    console.log('\n\n===== 処理完了 =====');
    console.log(`総店舗数: ${stores.length}件`);
    console.log(`成功: ${successCount}件`);
    console.log(`スキップ: ${skipCount}件`);
    console.log(`エラー: ${errorCount}件`);

    if (errors.length > 0) {
      console.log('\n===== エラー詳細 =====');
      errors.forEach((err, index) => {
        console.log(`\n${index + 1}. ${err.name}`);
        console.log(`   店舗ID: ${err.storeId}`);
        console.log(`   住所: ${err.address}`);
        console.log(`   エラー: ${err.error}`);
      });
    }

    console.log('\n処理が完了しました。');
    process.exit(0);

  } catch (error) {
    console.error('致命的なエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
bulkGeocodeStores();
