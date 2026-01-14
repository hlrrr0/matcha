"use client"

import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugFirebasePage() {
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    // Firebase設定を取得
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    
    setConfig(firebaseConfig)
  }, [])

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Configuration Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>API Key:</strong> {config?.apiKey ? '***CONFIGURED***' : 'MISSING'}</div>
            <div><strong>Auth Domain:</strong> {config?.authDomain || 'MISSING'}</div>
            <div><strong>Project ID:</strong> <span className="text-red-600 font-bold">{config?.projectId || 'MISSING'}</span></div>
            <div><strong>Storage Bucket:</strong> {config?.storageBucket || 'MISSING'}</div>
            <div><strong>Messaging Sender ID:</strong> {config?.messagingSenderId || 'MISSING'}</div>
            <div><strong>App ID:</strong> {config?.appId ? '***CONFIGURED***' : 'MISSING'}</div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Expected (agent-system-23630):</h3>
            <ul className="text-sm space-y-1">
              <li>projectId: agent-system-23630</li>
              <li>authDomain: agent-system-23630.firebaseapp.com</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
