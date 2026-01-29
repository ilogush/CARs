'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DataTable, { Column, Tab } from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { useToast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Database } from '@/types/database.types'
import IdBadge from '@/components/ui/IdBadge'
import StatusBadge from '@/components/ui/StatusBadge'

type User = Database['public']['Tables']['users']['Row']

interface UsersPageProps {
  userRole?: string
}

export default function UsersPage({ userRole }: UsersPageProps) {
  const searchParams = useSearchParams()
  const toast = useToast()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTabId, setActiveTabId] = useState<string>('clients')
  const [selectedManagerIds, setSelectedManagerIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Get user role from API
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me', { cache: 'no-store' })
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

  const isOwner = currentRole === 'owner'
  const isAdmin = currentRole === 'admin'

  // Columns for clients
  const clientColumns: Column<any>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const userId = item.users?.id || item.user_id
        const id_serial = item.users?.id_serial
        if (!id_serial) return '-'
        const displayId = id_serial.toString().padStart(4, '0')
        return (
          <Link
            href={`/dashboard/clients/${userId}`}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </Link>
        )
      }
    },
    {
      key: 'name',
      label: 'Name',
      wrap: true,
      render: (item) => {
        const user = item.users || {}
        return `${user.name || ''} ${user.surname || ''}`.trim() || 'N/A'
      }
    },
    {
      key: 'phone',
      label: 'Phone',
      wrap: true,
      render: (item) => {
        const phone = (item.users?.phone || item.client_profiles?.phone || '').replace(/\s/g, '')
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
      wrap: true,
      render: (item) => {
        const secondPhone = (item.users?.second_phone || '').replace(/\s/g, '')
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
      render: (item) => item.users?.telegram ? `@${item.users.telegram}` : '-'
    },
    {
      key: 'contracts_count',
      label: 'Contracts',
      sortable: true,
      render: (item) => item.contracts_count || 0
    },
    {
      key: 'city',
      label: 'City',
      wrap: true,
      render: (item) => item.users?.city || '-'
    },
  ]

  // Handler for manager toggle
  const handleManagerToggle = async (managerId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/managers/${managerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          is_active: !currentStatus,
          ...(adminMode && companyId ? { company_id: companyId } : {})
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update manager status')
      }

      // Обновляем локальное состояние на основе нового статуса
      setSelectedManagerIds(prev => {
        const newSet = new Set(prev)
        if (!currentStatus) {
          // Активируем менеджера
          newSet.add(managerId)
        } else {
          // Деактивируем менеджера
          newSet.delete(managerId)
        }
        return newSet
      })

      // Обновляем таблицу для получения свежих данных
      setRefreshKey(prev => prev + 1)
      toast.success(`Manager ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Failed to toggle manager status:', error)
      toast.error(error instanceof Error ? error.message : 'Error updating manager status')
    }
  }

  // Columns for managers
  const managerColumns: Column<any>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const id_serial = item.user?.id_serial
        if (!id_serial) return '-'
        const displayId = id_serial.toString().padStart(4, '0')
        return (
          <Link
            href={`/dashboard/managers/${item.id}${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </Link>
        )
      }
    },
    {
      key: 'user.name',
      label: 'Name',
      sortable: true,
      wrap: true,
      render: (item) => {
        const name = item.user?.name || ''
        const surname = item.user?.surname || ''
        return `${name} ${surname}`.trim() || '-'
      }
    },
    {
      key: 'user.phone',
      label: 'Phone',
      wrap: true,
      render: (item) => {
        const phone = (item.user?.phone || '').replace(/\s/g, '')
        return (
          <div className="text-xs font-medium text-gray-900">
            {phone || '-'}
          </div>
        )
      }
    },
    {
      key: 'user.second_phone',
      label: 'WhatsApp',
      wrap: true,
      render: (item) => {
        const secondPhone = (item.user?.second_phone || '').replace(/\s/g, '')
        return (
          <div className="text-xs font-medium text-gray-900">
            {secondPhone || '-'}
          </div>
        )
      }
    },
    {
      key: 'user.telegram',
      label: 'Telegram',
      render: (item) => item.user?.telegram ? `@${item.user.telegram}` : '-'
    },
    {
      key: 'toggle',
      label: '',
      sortable: false,
      render: (item) => {
        // Используем реальный статус из данных
        const isActive = item.is_active || false
        return (
          <button
            type="button"
            onClick={() => handleManagerToggle(item.id, isActive)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${isActive ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            role="switch"
            aria-checked={isActive}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
          </button>
        )
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (item) => {
        // Используем реальный статус из данных
        const isActive = item.is_active || false
        return (
          <StatusBadge variant={isActive ? 'neutral' : 'error'}>
            {isActive ? 'active' : 'inactive'}
          </StatusBadge>
        )
      }
    },
    {
      key: 'city',
      label: 'City',
      wrap: true,
      render: (item) => item.user?.city || '-'
    },
  ]

  // Columns for admin (all users)
  const adminColumns: Column<User>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (item) => {
        const id_serial = (item as any).id_serial
        if (!id_serial) return '-'
        const displayId = id_serial.toString().padStart(4, '0')
        return (
          <Link
            href={`/dashboard/users/${item.id}`}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </Link>
        )
      }
    },
    {
      key: 'fullName',
      label: 'Name',
      wrap: true,
      render: (item) => `${item.name || ''} ${item.surname || ''}`.trim() || '-'
    },
    {
      key: 'phone',
      label: 'Phone',
      wrap: true,
      render: (item) => {
        const phone = (item.phone || '').replace(/\s/g, '')
        return (
          <div className="text-xs font-medium text-gray-900">
            {phone || '-'}
          </div>
        )
      }
    },
    {
      key: 'second_phone',
      label: 'WhatsApp',
      wrap: true,
      render: (item) => {
        const secondPhone = ((item as any).second_phone || '').replace(/\s/g, '')
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
      render: (item) => item.telegram ? `@${item.telegram}` : '-'
    },
    {
      key: 'role',
      label: 'Role',
      render: (item) => {
        const roles: Record<string, string> = {
          admin: 'admin',
          owner: 'owner',
          manager: 'manager',
          client: 'client'
        }
        const roleLabel = roles[item.role] || item.role
        return (
          <StatusBadge variant={
            item.role === 'admin' ? 'info' :
              item.role === 'owner' ? 'success' :
                item.role === 'manager' ? 'warning' :
                  'neutral'
          }>
            {roleLabel}
          </StatusBadge>
        )
      }
    },
    {
      key: 'city',
      label: 'City',
      wrap: true,
      render: (item) => (item as any).city || '-'
    },
  ]

  const getCreateUrl = (tabId?: string) => {
    const activeTab = tabId || activeTabId

    // For clients
    if (activeTab === 'clients') {
      if (adminMode && companyId) {
        return `/dashboard/clients/create?admin_mode=true&company_id=${companyId}`
      }
      if (isOwner || (isAdmin && adminMode && companyId)) {
        return '/dashboard/clients/create'
      }
      // If admin not in company mode, we use general user create
      return '/dashboard/users/create'
    }

    // For managers
    if (activeTab === 'managers') {
      if (adminMode && companyId) {
        return `/dashboard/managers/create?admin_mode=true&company_id=${companyId}`
      }
      if (isOwner) {
        return '/dashboard/managers/create'
      }
      // If admin not in company mode, use general user create
      return '/dashboard/users/create'
    }

    // For Owners and Admins tabs
    return '/dashboard/users/create'
  }

  async function fetchClients(params: any) {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) {
        queryParams.set('sortBy', params.sortBy)
        queryParams.set('sortOrder', params.sortOrder || 'asc')
      }
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }
      // Передаем admin_mode и company_id для правильной фильтрации
      if (adminMode && companyId) {
        queryParams.set('admin_mode', 'true')
        queryParams.set('company_id', companyId)
      }

      const response = await fetch(`/api/clients?${queryParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load data')
      }
      const json = await response.json()
      return { data: json.data || [], totalCount: json.totalCount || 0 }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      throw error
    }
  }

  async function fetchManagers(params: any) {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) {
        queryParams.set('sortBy', params.sortBy)
        queryParams.set('sortOrder', params.sortOrder || 'asc')
      }
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }
      // Передаем admin_mode и company_id для правильной фильтрации
      if (adminMode && companyId) {
        queryParams.set('admin_mode', 'true')
        queryParams.set('company_id', companyId)
      }

      const response = await fetch(`/api/managers?${queryParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load data')
      }
      const json = await response.json()
      const managers = json.data || []
      // Обновляем локальное состояние selectedManagerIds на основе данных из API
      const activeManagerIds = managers
        .filter((m: any) => m.is_active)
        .map((m: any) => m.id)
      setSelectedManagerIds(new Set(activeManagerIds))
      return { data: managers, totalCount: json.totalCount || 0 }
    } catch (error) {
      console.error('Failed to fetch managers:', error)
      throw error
    }
  }

  async function fetchUsersByRole(params: any, role: string) {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) {
        queryParams.set('sortBy', params.sortBy)
        queryParams.set('sortOrder', params.sortOrder || 'asc')
      }
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q, role }))
      } else {
        queryParams.set('filters', JSON.stringify({ role }))
      }

      const response = await fetch(`/api/users?${queryParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load data')
      }
      const json = await response.json()
      return { data: json.data || [], totalCount: json.totalCount || 0 }
    } catch (error) {
      console.error(`Failed to fetch ${role}s:`, error)
      throw error
    }
  }

  // Unified tabs for all roles in requested order
  const userTabs: Tab<any>[] = [
    {
      id: 'clients',
      label: 'Clients',
      columns: clientColumns,
      fetchData: fetchClients
    },
    {
      id: 'managers',
      label: 'Managers',
      columns: managerColumns,
      fetchData: (params) => fetchManagers(params)
    },
    {
      id: 'owners',
      label: 'Owners',
      columns: adminColumns,
      fetchData: (params) => fetchUsersByRole(params, 'owner')
    },
    {
      id: 'admins',
      label: 'Admins',
      columns: adminColumns,
      fetchData: (params) => fetchUsersByRole(params, 'admin')
    }
  ]

  async function fetchUsers(params: any) {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) {
        queryParams.set('sortBy', params.sortBy)
        queryParams.set('sortOrder', params.sortOrder || 'asc')
      }
      if (params.filters && params.filters.q) {
        queryParams.set('filters', JSON.stringify({ q: params.filters.q }))
      }

      const response = await fetch(`/api/users?${queryParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load data')
      }
      const json = await response.json()
      return { data: json.data || [], totalCount: json.totalCount || 0 }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw error
    }
  }


  // Показываем загрузку, пока не определена роль
  if (!currentRole) {
    return (
      <div className="space-y-6">
        <ActionPageHeader title="Users" />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      </div>
    )
  }

  if (isOwner || isAdmin) {
    return (
      <div className="space-y-6">
        <ActionPageHeader
          title="Users"
          actionLabel="Add"
          actionIcon={<PlusIcon className="w-4 h-4" />}
          actionType="link"
          href={getCreateUrl(activeTabId)}
        />

        <DataTable
          tabs={userTabs}
          refreshKey={refreshKey}
          defaultTabId="clients"
          onTabChange={setActiveTabId}
        />
      </div>
    )
  }

  // Fallback - обычная таблица без табов (для других ролей)
  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Users"
        actionLabel="Add"
        actionIcon={<PlusIcon className="w-4 h-4" />}
        actionType="link"
        href={getCreateUrl()}
      />

      <DataTable
        columns={adminColumns}
        refreshKey={refreshKey}
        fetchData={fetchUsers}
      />
    </div>
  )
}
