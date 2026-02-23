"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Copy } from 'lucide-react'
import { Company } from '@/types/company'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CompanyContactTabProps {
  company: Company
}

export default function CompanyContactTab({ company }: CompanyContactTabProps) {
  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('メールアドレスをコピーしました')
    } catch (error) {
      toast.error('コピーに失敗しました')
    }
  }

  const handleCopyAllCcEmails = async () => {
    if (!company.ccEmails || company.ccEmails.length === 0) return
    
    try {
      const emailList = company.ccEmails.join(', ')
      await navigator.clipboard.writeText(emailList)
      toast.success('全てのCCメールアドレスをコピーしました')
    } catch (error) {
      toast.error('コピーに失敗しました')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 担当者情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            担当者情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">担当者名</h3>
            {company.contactPersonName ? (
              <p className="text-lg">{company.contactPersonName}</p>
            ) : (
              <p className="text-gray-400 text-sm">担当者名が設定されていません</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium text-gray-700 mb-2">メールアドレス</h3>
            {company.email ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{company.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyEmail(company.email)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">メールアドレスが設定されていません</p>
            )}
          </div>

          {company.phone && (
            <div className="pt-4 border-t">
              <h3 className="font-medium text-gray-700 mb-2">電話番号</h3>
              <p className="text-sm">{company.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CCメールアドレス */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              CCメールアドレス
            </CardTitle>
            {company.ccEmails && company.ccEmails.length > 0 && (
              <Badge variant="secondary">
                {company.ccEmails.length}件
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {company.ccEmails && company.ccEmails.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllCcEmails}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  全てコピー
                </Button>
              </div>
              <div className="space-y-2">
                {company.ccEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyEmail(email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">CCメールアドレスが設定されていません</p>
              <p className="text-gray-400 text-xs mt-2">
                企業編集ページから設定できます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
