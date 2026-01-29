'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

const columns = [
  {
    key: 'id',
    label: 'ID',
    render: (row: any) => (
      <IdBadge>{row.id.toString().padStart(4, '0')}</IdBadge>
    )
  },
  {
    key: 'user',
    label: 'User',
    render: (row: any) => {
      if (row.users) {
        const name = row.users.name || ''
        const surname = row.users.surname || ''
        const email = row.users.email || ''
        return name || surname ? `${name} ${surname}`.trim() : email || row.user_id
      }
      return row.user_id
    }
  },
  {
    key: 'role',
    label: 'Role',
    render: (row: any) => (
      <StatusBadge
        variant={
          row.role === 'admin' ? 'info' :
            row.role === 'owner' ? 'success' :
              row.role === 'manager' ? 'warning' :
                'neutral'
        }
      >
        {row.role?.toLowerCase() || '-'}
      </StatusBadge>
    )
  },
  {
    key: 'action',
    label: 'Action',
    sortable: true,
    render: (row: any) => (
      <StatusBadge
        variant={
          row.action === 'login' ? 'success' :
            row.action === 'login_failed' || row.action === 'delete' ? 'error' :
              row.action === 'create' ? 'info' :
                row.action === 'update' ? 'warning' :
                  'neutral'
        }
        className="font-mono"
      >
        {row.action?.toLowerCase()}
      </StatusBadge>
    )
  },
  {
    key: 'entity',
    label: 'Entity',
    render: (row: any) => {
      const entityType = row.entity_type || row.entity || '-'
      const entityId = row.entity_id || ''
      return (
        <span>
          {entityType} {entityId ? `(#${entityId})` : ''}
        </span>
      )
    }
  },
  {
    key: 'company_id',
    label: 'Company',
    render: (row: any) => row.company_id ? `#${row.company_id}` : '-'
  },
  {
    key: 'changes',
    label: 'Changes',
    render: (row: any) => {
      if (row.action === 'update' && (row.before_state || row.after_state)) {
        try {
          const before = typeof row.before_state === 'string'
            ? JSON.parse(row.before_state)
            : row.before_state
          const after = typeof row.after_state === 'string'
            ? JSON.parse(row.after_state)
            : row.after_state

          if (!before || !after) return <span className="text-xs text-gray-500">-</span>

          const changes: string[] = []
          const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])

          allKeys.forEach(key => {
            const oldVal = before?.[key]
            const newVal = after?.[key]

            // Пропускаем служебные поля
            if (['id', 'created_at', 'updated_at'].includes(key)) return

            // Пропускаем, если значения одинаковые
            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return

            if (oldVal === undefined && newVal !== undefined) {
              changes.push(`${key}: added (${typeof newVal === 'object' ? JSON.stringify(newVal) : newVal})`)
            } else if (oldVal !== undefined && newVal === undefined) {
              changes.push(`${key}: removed (${typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal})`)
            } else {
              const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)
              const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)
              changes.push(`${key}: ${oldStr} → ${newStr}`)
            }
          })

          if (changes.length === 0) {
            return <span className="text-xs text-gray-500">No changes</span>
          }

          return (
            <div className="flex flex-col gap-0.5 max-w-md">
              {changes.slice(0, 3).map((change, idx) => (
                <span key={idx} className="text-xs text-gray-500 font-mono">
                  {change}
                </span>
              ))}
              {changes.length > 3 && (
                <span className="text-xs text-gray-500 italic">
                  +{changes.length - 3} more
                </span>
              )}
            </div>
          )
        } catch (error) {
          console.error('Error parsing changes:', error)
          return <span className="text-xs text-gray-500">Error</span>
        }
      } else if (row.action === 'create' && row.after_state) {
        try {
          const after = typeof row.after_state === 'string'
            ? JSON.parse(row.after_state)
            : row.after_state

          const fields = Object.keys(after || {}).filter(key =>
            !['id', 'created_at', 'updated_at'].includes(key)
          )

          if (fields.length === 0) {
            return <span className="text-xs text-gray-500">-</span>
          }

          return (
            <span className="text-xs text-gray-600">
              Created with {fields.length} field{fields.length !== 1 ? 's' : ''}
            </span>
          )
        } catch (error) {
          return <span className="text-xs text-gray-500">-</span>
        }
      } else if (row.action === 'delete' && row.before_state) {
        return <span className="text-xs text-red-600">Deleted</span>
      }

      return <span className="text-xs text-gray-500">-</span>
    }
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: true,
    render: (row: any) => {
      const date = row.created_at || row.timestamp
      return date ? new Date(date).toLocaleString() : '-'
    }
  },
]

export default function LogsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const [isClearing, setIsClearing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleClearLogs = async () => {
    try {
      setIsClearing(true)
      const queryParams = new URLSearchParams()
      if (searchParams.get('admin_mode') === 'true') {
        queryParams.set('admin_mode', 'true')
        const companyId = searchParams.get('company_id')
        if (companyId) queryParams.set('company_id', companyId)
      }

      const res = await fetch(`/api/logs?${queryParams.toString()}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to clear logs')
      }

      toast.success('Logs cleared successfully')
      setRefreshKey(prev => prev + 1)
      setIsClearing(false)
    } catch (error: any) {
      console.error('Error clearing logs:', error)
      toast.error(error.message || 'Failed to clear logs')
      setIsClearing(false)
    }
  }

  const fetchData = async (params: { page: number, pageSize: number, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: Record<string, any> }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

      // Объединяем фильтры из DataTable и из URL
      const urlFilters: Record<string, any> = {}
      const role = searchParams.get('role')
      const action = searchParams.get('action')
      const entityType = searchParams.get('entity_type')
      const dateFrom = searchParams.get('date_from')
      const dateTo = searchParams.get('date_to')

      if (role) urlFilters.role = role
      if (action) urlFilters.action = action
      if (entityType) urlFilters.entity_type = entityType
      if (dateFrom) urlFilters.date_from = dateFrom
      if (dateTo) urlFilters.date_to = dateTo

      // Поиск из DataTable
      if (params.filters && params.filters.q) {
        urlFilters.q = params.filters.q
      }

      if (Object.keys(urlFilters).length > 0) {
        queryParams.set('filters', JSON.stringify(urlFilters))
      }

      // Добавляем параметры для режима админа в компании
      if (searchParams.get('admin_mode') === 'true') {
        queryParams.set('admin_mode', 'true')
        const companyId = searchParams.get('company_id')
        if (companyId) {
          queryParams.set('company_id', companyId)
        }
      }

      const res = await fetch(`/api/logs?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount || 0 }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        rightActions={
          <DeleteButton
            onClick={handleClearLogs}
            disabled={isClearing}
            title="Clear Logs"
            className={isClearing ? 'animate-pulse' : ''}
          />
        }
      />

      <DataTable
        columns={columns}
        fetchData={fetchData}
        refreshKey={refreshKey}
      />
    </div>
  )
}
