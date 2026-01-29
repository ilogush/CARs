'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DataTable, { Column, Tab } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { PlusIcon } from '@heroicons/react/24/outline'
import IdBadge from '@/components/ui/IdBadge'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ManagersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const [refreshKey, setRefreshKey] = useState(0)

  const managersColumns: Column<any>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (row: any) => {
        const displayId = row.id.toString().padStart(4, '0')
        return (
          <IdBadge>{displayId}</IdBadge>
        )
      }
    },
    {
      key: 'user.name',
      label: 'Name',
      sortable: true,
      render: (row: any) => {
        const name = row.user?.name || ''
        const surname = row.user?.surname || ''
        return `${name} ${surname}`.trim() || '-'
      }
    },
    {
      key: 'user.email',
      label: 'Email',
      sortable: true,
      render: (row: any) => row.user?.email || '-'
    },
    {
      key: 'user.phone',
      label: 'Phone',
      render: (row: any) => {
        const phone = row.user?.phone?.replace(/\s+/g, '')
        const secondPhone = row.user?.second_phone?.replace(/\s+/g, '')
        if (phone && secondPhone) {
          return `${phone} / ${secondPhone}`
        }
        return phone || secondPhone || '-'
      }
    },
    {
      key: 'user.telegram',
      label: 'Telegram',
      render: (row: any) => row.user?.telegram ? `@${row.user.telegram}` : '-'
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <StatusBadge variant={row.is_active ? 'neutral' : 'error'}>
          {row.is_active ? 'active' : 'inactive'}
        </StatusBadge>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row: any) => new Date(row.created_at).toLocaleDateString()
    }
  ]

  const fetchManagers = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }
      if (adminMode && companyId) {
        queryParams.set('company_id', companyId)
      }

      const res = await fetch(`/api/managers?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch managers:', error)
      throw error
    }
  }

  const fetchActiveManagers = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }
      queryParams.set('is_active', 'true')
      if (adminMode && companyId) {
        queryParams.set('company_id', companyId)
      }

      const res = await fetch(`/api/managers?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch active managers:', error)
      throw error
    }
  }

  const fetchInactiveManagers = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }
      queryParams.set('is_active', 'false')
      if (adminMode && companyId) {
        queryParams.set('company_id', companyId)
      }

      const res = await fetch(`/api/managers?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch inactive managers:', error)
      throw error
    }
  }

  const tabs: Tab<any>[] = [
    {
      id: 'all',
      label: 'All Managers',
      columns: managersColumns,
      fetchData: fetchManagers
    },
    {
      id: 'active',
      label: 'Active',
      columns: managersColumns,
      fetchData: fetchActiveManagers
    },
    {
      id: 'inactive',
      label: 'Inactive',
      columns: managersColumns,
      fetchData: fetchInactiveManagers
    }
  ]

  const getCreateUrl = () => {
    if (adminMode && companyId) {
      return `/dashboard/managers/create?admin_mode=true&company_id=${companyId}`
    }
    return '/dashboard/managers/create'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Managers"
        rightActions={
          <Link href={getCreateUrl()}>
            <Button
              variant="primary"
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Create
            </Button>
          </Link>
        }
      />

      <DataTable
        key={`managers-${refreshKey}`}
        tabs={tabs}
        defaultTabId="all"
      />
    </div>
  )
}
