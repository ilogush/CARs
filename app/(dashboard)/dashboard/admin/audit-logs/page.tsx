'use client'

import React from 'react'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'

import { useToast } from '@/lib/toast'
import { DeleteButton } from '@/components/ui/Button'

const ActionBadge = ({ action }: { action: string }) => {
    const styles: Record<string, string> = {
        create: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        update: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        delete: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        login: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        default: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] lowercase font-medium border ${styles[action] || styles.default}`}>
            {action}
        </span>
    )
}

const columns = [
    {
        key: 'created_at',
        label: 'Timestamp',
        sortable: true,
        render: (row: any) => (
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-slate-500 lowercase tracking-wider font-mono">
                    {new Date(row.created_at).toLocaleTimeString()}
                </span>
            </div>
        )
    },
    {
        key: 'user',
        label: 'Actor',
        render: (row: any) => (
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">
                    {row.users?.name || row.users?.surname ? `${row.users.name || ''} ${row.users.surname || ''}` : row.users?.email || 'System'}
                </span>
                <span className="text-[10px] text-slate-500 lowercase tracking-widest font-medium font-mono">
                    {row.role}
                </span>
            </div>
        )
    },
    {
        key: 'action',
        label: 'Action',
        render: (row: any) => <ActionBadge action={row.action} />
    },
    {
        key: 'entity',
        label: 'Target Entity',
        render: (row: any) => (
            <div className="flex flex-col truncate max-w-[150px]">
                <span className="text-sm text-slate-800 font-bold tracking-tight">
                    {row.companies?.name || 'System'}
                </span>
                <span className="text-[10px] text-slate-500 lowercase tracking-widest font-mono">
                    {row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}
                </span>
            </div>
        )
    },
    {
        key: 'details',
        label: 'Change Details',
        render: (row: any) => {
            if (row.action === 'update' && row.before_state && row.after_state) {
                const changes = Object.keys(row.after_state).filter(k =>
                    JSON.stringify(row.before_state[k]) !== JSON.stringify(row.after_state[k]) &&
                    !['updated_at'].includes(k)
                )
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                            Modified {changes.length} field{changes.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex -space-x-1">
                            {changes.slice(0, 3).map(k => (
                                <div key={k} title={k} className="h-4 px-1 rounded bg-slate-100 border border-black/5 text-[9px] text-slate-500 flex items-center">
                                    {k}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            return <span className="text-xs text-slate-400">-</span>
        }
    },
    {
        key: 'ip',
        label: 'Source',
        render: (row: any) => (
            <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500">{row.ip}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px] tracking-tighter">{row.user_agent}</span>
            </div>
        )
    }
]

export default function AuditLogsPage() {
    const toast = useToast()
    const [refreshKey, setRefreshKey] = React.useState(0)

    const fetchData = async (params: any) => {
        const queryParams = new URLSearchParams({
            page: params.page.toString(),
            pageSize: params.pageSize.toString(),
            filters: JSON.stringify(params.filters || {})
        })

        if (params.sortBy) queryParams.set('sortBy', params.sortBy)
        if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

        const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`)
        const json = await res.json()
        return {
            data: json.data || [],
            totalCount: json.totalCount || 0
        }
    }

    const handleClearLogs = async () => {
        if (!confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) return

        try {
            const res = await fetch('/api/admin/audit-logs', { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to clear logs')
            toast.success('Audit logs cleared successfully')
            setRefreshKey(prev => prev + 1)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader
                title="System Audit Logs"
                rightActions={
                    <DeleteButton
                        onClick={handleClearLogs}
                        title="Clear all logs"
                    />
                }
            />

            <DataTable
                key={refreshKey}
                columns={columns}
                fetchData={fetchData}
            />
        </div>
    )
}
