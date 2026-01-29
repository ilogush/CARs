'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DataTable, { Column } from '@/components/ui/DataTable'
import IdBadge from '@/components/ui/IdBadge'
import { format } from 'date-fns'

interface Payment {
    id: number
    amount: number
    payment_date: string
    payment_method: string
    notes: string
    created_at: string
    created_by: string
    payment_statuses: {
        name: string
        value: string
    }
    payment_types: {
        name: string
        sign: '+' | '-'
    }
    contracts: {
        id: number
        client: {
            name: string
            surname: string
        }
    }
    creator?: {
        name: string
        surname: string
    }
}

export default function PaymentsTable() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const companyId = searchParams.get('company_id')
    const adminMode = searchParams.get('admin_mode')

    const fetchPayments = async (params: {
        page: number
        pageSize: number
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
        filters?: Record<string, any>
    }) => {
        const queryParams = new URLSearchParams({
            page: params.page.toString(),
            pageSize: params.pageSize.toString(),
        })

        if (params.sortBy) {
            queryParams.set('sortBy', params.sortBy)
            queryParams.set('sortOrder', params.sortOrder || 'desc')
        }

        if (companyId) {
            queryParams.set('company_id', companyId)
        }

        const filters = params.filters || {}
        queryParams.set('filters', JSON.stringify(filters))

        const response = await fetch(`/api/payments?${queryParams.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch payments')
        return response.json()
    }

    const columns: Column<Payment>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (item) => (
                <button
                    onClick={() => {
                        const params = new URLSearchParams()
                        if (adminMode) params.set('admin_mode', 'true')
                        if (companyId) params.set('company_id', companyId)
                        router.push(`/dashboard/payments/${item.id}?${params.toString()}`)
                    }}
                    className="hover:opacity-70 transition-opacity"
                >
                    <IdBadge>{item.id.toString().padStart(4, '0')}</IdBadge>
                </button>
            )
        },
        {
            key: 'created_at',
            label: 'Date',
            sortable: true,
            render: (item) => {
                const date = item.payment_date || item.created_at
                return (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                            {format(new Date(date), 'dd MMM yyyy')}
                        </span>
                        <span className="text-xs text-gray-500">
                            {format(new Date(date), 'HH:mm')}
                        </span>
                    </div>
                )
            }
        },
        {
            key: 'contract_id',
            label: 'Contract',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                        #{item.contracts?.id?.toString().padStart(4, '0') || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                        {item.contracts?.client ? `${item.contracts.client.name} ${item.contracts.client.surname}` : 'Unknown Client'}
                    </span>
                </div>
            )
        },
        {
            key: 'payment_type',
            label: 'Type',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.payment_types?.name || '-'}
                </span>
            )
        },
        {
            key: 'payment_method',
            label: 'Method',
            render: (item) => (
                <span className="text-sm text-gray-500 capitalize">{item.payment_method}</span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.payment_statuses.name.toLowerCase()}
                </span>
            )
        },
        {
            key: 'created_by',
            label: 'Created By',
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {item.creator ? `${item.creator.name} ${item.creator.surname}` : '-'}
                </span>
            )
        },
        {
            key: 'amount',
            label: 'Amount',
            sortable: true,
            render: (item) => (
                <span className="text-sm font-bold text-gray-900">
                    {new Intl.NumberFormat('en-US').format(item.amount)} ฿
                </span>
            )
        }
    ]

    return (
        <DataTable
            columns={columns}
            fetchData={fetchPayments}
            initialPageSize={20}
        />
    )
}
