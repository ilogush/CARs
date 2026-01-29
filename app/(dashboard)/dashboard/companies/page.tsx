'use client'

import { useState } from 'react'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/lib/toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Database } from '@/types/database.types'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

type Company = Database['public']['Tables']['companies']['Row'] & {
  locations?: { name: string } | null
  owner?: { id: string; name: string | null; surname: string | null; email: string } | null
  _stats?: {
    carsCount: number
    managersCount: number
    districtName: string | null
  }
}

async function fetchCompanies(params: any) {
  const searchParams = new URLSearchParams()
  searchParams.set('page', params.page.toString())
  searchParams.set('pageSize', params.pageSize.toString())
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy)
    searchParams.set('sortOrder', params.sortOrder || 'asc')
  }
  if (params.filters) {
    searchParams.set('filters', JSON.stringify(params.filters))
  }

  const response = await fetch(`/api/companies?${searchParams.toString()}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to load data')
  }
  return response.json()
}

export default function CompaniesPage() {
  const router = useRouter()
  const toast = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const handleToggleActive = async (companyId: number, currentStatus: boolean) => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update company status')
      }

      toast.success(`Company ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      // Refresh the table
      window.location.reload()
    } catch (error: any) {
      console.error('Error toggling company status:', error)
      toast.error(error.message || 'Failed to update company status')
    } finally {
      setRefreshing(false)
    }
  }

  const columnsWithClick: Column<Company>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        if (!item.id) return '-'
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/enter-company', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ companyId: item.id })
                })
                if (res.ok) {
                  router.push(`/dashboard?admin_mode=true&company_id=${item.id}`)
                } else {
                  const err = await res.json()
                  toast.error(err.error || 'Failed to enter company')
                }
              } catch (error: any) {
                console.error('Error entering company:', error)
                toast.error('Failed to enter company')
              }
            }}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    { key: 'name', label: 'Name', sortable: false, wrap: true },
    {
      key: 'owner',
      label: 'Owner',
      wrap: true,
      render: (item) => {
        const owner = item.owner
        if (!owner) return '-'
        const fullName = [owner.name, owner.surname].filter(Boolean).join(' ')
        return fullName || owner.email || '-'
      }
    },
    {
      key: 'cars_count',
      label: 'Cars',
      render: (item) => item._stats?.carsCount || 0
    },

    { key: 'email', label: 'Email', sortable: false, wrap: true },
    {
      key: 'phone',
      label: 'Phone',
      sortable: false,
      wrap: false,
      render: (item) => item.phone?.replace(/\s+/g, '') || '-'
    },

    {
      key: 'district',
      label: 'District',
      wrap: true,
      render: (item) => item._stats?.districtName || '-'
    },
    {
      key: 'toggle',
      label: '',
      sortable: false,
      render: (item) => (
        <button
          onClick={() => handleToggleActive(item.id, item.is_active ?? true)}
          disabled={refreshing}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${item.is_active ? 'bg-gray-800' : 'bg-gray-200'
            } ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          role="switch"
          aria-checked={item.is_active ?? true}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.is_active ? 'translate-x-4' : 'translate-x-0'
              }`}
          />
        </button>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <StatusBadge variant={item.is_active ? 'success' : 'error'}>
          {item.is_active ? 'active' : 'inactive'}
        </StatusBadge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Companies List"
        actionLabel="Add"
        actionIcon={<PlusIcon className="w-4 h-4" />}
        actionType="link"
        href="/dashboard/companies/create"
      />
      <DataTable
        columns={columnsWithClick}
        fetchData={fetchCompanies}
      />
    </div>
  )
}
