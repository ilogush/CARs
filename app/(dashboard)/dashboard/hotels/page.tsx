'use client'

import { useState } from 'react'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Hotel } from '@/types/database.types'
import IdBadge from '@/components/ui/IdBadge'
import StatusBadge from '@/components/ui/StatusBadge'

async function fetchHotels(params: any) {
    const searchParams = new URLSearchParams()
    searchParams.set('page', params.page.toString())
    searchParams.set('pageSize', params.pageSize.toString())
    if (params.search) {
        searchParams.set('search', params.search)
    }

    const response = await fetch(`/api/hotels?${searchParams.toString()}`)
    if (!response.ok) throw new Error('Failed to load hotels')
    return response.json()
}

export default function HotelsPage() {
    const [search, setSearch] = useState('')

    const columns: Column<Hotel & { districts?: { name: string }, locations?: { name: string } }>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (item) => <IdBadge>{item.id.toString().padStart(4, '0')}</IdBadge>
        },
        {
            key: 'name',
            label: 'Hotel Name',
            sortable: true,
            wrap: true
        },
        {
            key: 'location',
            label: 'Location',
            render: (item) => item.locations?.name || '-'
        },
        {
            key: 'district',
            label: 'District',
            render: (item) => item.districts?.name || '-'
        },
        {
            key: 'is_active',
            label: 'Status',
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
                title="Hotels Management"
                actionLabel="Add Hotel"
                actionIcon={<PlusIcon className="w-4 h-4" />}
                onAction={() => {
                    // Future: open modal
                }}
            />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <DataTable
                    columns={columns}
                    fetchData={fetchHotels}
                />
            </div>
        </div>
    )
}
