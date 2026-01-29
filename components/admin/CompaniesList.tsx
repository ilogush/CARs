'use client'

import { Company } from '@/types/database.types'
import Link from 'next/link'

interface CompaniesListProps {
  locationId: number
  initialCompanies: Company[]
}

export default function CompaniesList({ initialCompanies }: CompaniesListProps) {
  const companies = initialCompanies

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет компаний в этой локации</p>
          ) : (
            companies.map((company) => (
              <Link
                key={company.id}
                href={`/admin/companies/${company.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                <p className="text-sm text-gray-500 mt-1">ID: {company.id}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

