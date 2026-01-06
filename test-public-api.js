/**
 * Public API テストスクリプト
 * 
 * 実行方法:
 * node test-public-api.js
 */

const TEST_API_KEY = 'test-api-key-12345' // テスト用APIキー

// エクスポートAPIのテスト
async function testExportAPI() {
  console.log('🧪 Testing Export API...')
  
  try {
    const url = 'http://localhost:3000/api/public/jobs/export?limit=10'
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_API_KEY
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('✅ Export API test passed')
      console.log(`- Total jobs: ${data.data.totalCount}`)
      console.log(`- Exported at: ${data.data.exportedAt}`)
    } else {
      console.log('❌ Export API test failed')
      console.log(`- Error: ${data.error.code} - ${data.error.message}`)
    }
  } catch (error) {
    console.error('❌ Export API test error:', error.message)
  }
  
  console.log('')
}

// 個別取得APIのテスト
async function testGetJobAPI(jobId) {
  console.log(`🧪 Testing Get Job API (ID: ${jobId})...`)
  
  try {
    const url = `http://localhost:3000/api/public/jobs/${jobId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_API_KEY
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('✅ Get Job API test passed')
      console.log(`- Job title: ${data.data.title}`)
    } else {
      console.log('❌ Get Job API test failed')
      console.log(`- Error: ${data.error.code} - ${data.error.message}`)
    }
  } catch (error) {
    console.error('❌ Get Job API test error:', error.message)
  }
  
  console.log('')
}

// 認証エラーのテスト
async function testAuthenticationError() {
  console.log('🧪 Testing Authentication Error...')
  
  try {
    const url = 'http://localhost:3000/api/public/jobs/export'
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': 'invalid-api-key'
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.status === 401 && data.error.code === 'UNAUTHORIZED') {
      console.log('✅ Authentication error test passed')
    } else {
      console.log('❌ Authentication error test failed')
    }
  } catch (error) {
    console.error('❌ Authentication error test error:', error.message)
  }
  
  console.log('')
}

// APIキーなしのテスト
async function testMissingAPIKey() {
  console.log('🧪 Testing Missing API Key...')
  
  try {
    const url = 'http://localhost:3000/api/public/jobs/export'
    
    const response = await fetch(url, {
      method: 'GET'
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.status === 401) {
      console.log('✅ Missing API key test passed')
    } else {
      console.log('❌ Missing API key test failed')
    }
  } catch (error) {
    console.error('❌ Missing API key test error:', error.message)
  }
  
  console.log('')
}

// パラメータテスト
async function testParameters() {
  console.log('🧪 Testing Parameters...')
  
  try {
    const url = 'http://localhost:3000/api/public/jobs/export?limit=5&includeCompanies=true&includeStores=false'
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_API_KEY
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Parameters test passed')
      console.log(`- Jobs count: ${data.data.jobs.length}`)
      console.log(`- Has companies: ${!!data.data.companies}`)
      console.log(`- Has stores: ${!!data.data.stores}`)
    } else {
      console.log('❌ Parameters test failed')
    }
  } catch (error) {
    console.error('❌ Parameters test error:', error.message)
  }
  
  console.log('')
}

// すべてのテストを実行
async function runAllTests() {
  console.log('==================================')
  console.log('🚀 Starting Public API Tests')
  console.log('==================================\n')
  
  await testAuthenticationError()
  await testMissingAPIKey()
  await testExportAPI()
  await testParameters()
  // await testGetJobAPI('test-job-id') // 実際のジョブIDに置き換えてください
  
  console.log('==================================')
  console.log('✨ All tests completed')
  console.log('==================================')
}

// テスト実行
runAllTests()
