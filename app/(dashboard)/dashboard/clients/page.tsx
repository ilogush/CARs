'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const [currentRole, setCurrentRole] = useState<string | null>(null)

  useEffect(() => {
    // Get user role from API
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setCurrentRole(data.role)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [])

  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager'
  const isAdmin = currentRole === 'admin'

  const handleIdClick = (client: any) => {
    router.push(`/dashboard/clients/${client.user_id}?from=/dashboard/clients`)
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row: any) => {
        const id_serial = row.users?.id_serial
        if (!id_serial) return '-'
        const displayId = id_serial.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleIdClick(row)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    {
      key: 'name',
      label: 'Name',
      render: (row: any) => {
        const user = row.users || {}
        return `${user.name || ''} ${user.surname || ''}`.trim() || 'N/A'
      }
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row: any) => {
        const phone = (row.client_profiles?.phone || row.users?.phone || '').replace(/\s/g, '')
        return (
          <div className="text-xs font-medium text-gray-900">
            {phone || 'Not set'}
          </div>
        )
      }
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (row: any) => {
        const secondPhone = (row.users?.second_phone || '').replace(/\s/g, '')
        return (
          <div className="text-xs font-medium text-gray-900">
            {secondPhone || '-'}
          </div>
        )
      }
    },
    {
      key: 'telegram',
      label: 'Telegram',
      render: (row: any) => row.users?.telegram ? `@${row.users.telegram}` : '-'
    },
    {
      key: 'contracts_count',
      label: 'Contracts',
      sortable: true,
      render: (row: any) => row.contracts_count || 0
    },
    {
      key: 'total_spent',
      label: 'Total Spent',
      sortable: true,
      render: (row: any) => `${row.total_spent || 0} ฿`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <StatusBadge variant={row.has_active_contract ? 'success' : 'neutral'}>
          {row.has_active_contract ? 'active' : 'inactive'}
        </StatusBadge>
      )
    },
    {
      key: 'city',
      label: 'City',
      render: (row: any) => row.users?.city || '-'
    },
  ]

  const fetchData = async (params: {
    page: number,
    pageSize: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      if (params.filters && params.filters.q) queryParams.set('filters', JSON.stringify({ q: params.filters.q }))

      const res = await fetch(`/api/clients?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      throw error
    }
  }

  const getCreateButton = () => {
    // Show create button for Owner, Manager, or Admin in Admin Mode
    if (isOwnerOrManager || (isAdmin && adminMode && companyId)) {
      const createUrl = `/dashboard/clients/create${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`
      return (
        <Link href={createUrl}>
          <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />}>
            Create
          </Button>
        </Link>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients List"
        rightActions={getCreateButton()}
      />
      <DataTable
        columns={columns}
        fetchData={fetchData}
      />
    </div>
  )
}
