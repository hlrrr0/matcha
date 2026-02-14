'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, MapPin, Phone, Globe, Mail, Users } from 'lucide-react'
import { Company } from '@/types/company'

interface CompanyInfoCardProps {
  company: Company | null
}

const CompanyInfoCard = ({ company }: CompanyInfoCardProps) => {
  if (!company) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          企業情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        <div>
          <h3 className="font-medium text-lg">{company.name}</h3>
          {company.address && (
            <p className="text-sm text-gray-600 mt-1 flex items-start gap-1">
              <MapPin className="h-3 w-3 mt-0.5" />
              {company.address}
            </p>
          )}
        </div>
        
        {/* 企業の基本情報 */}
        <div className="space-y-2">
          {company.phone && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {company.phone}
            </p>
          )}
          
          {company.website && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                企業ウェブサイト
              </a>
            </p>
          )}

          {company.email && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {company.email}
            </p>
          )}

          {company.establishedYear && (
            <p className="text-sm text-gray-600">
              設立年: {company.establishedYear}年
            </p>
          )}

          {company.employeeCount && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Users className="h-3 w-3" />
              従業員数: {company.employeeCount}名
            </p>
          )}

          {company.capital && (
            <p className="text-sm text-gray-600">
              資本金: {company.capital}万円
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CompanyInfoCard
