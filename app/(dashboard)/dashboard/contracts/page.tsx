'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DataTable, { Column, Tab } from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { Button } from '@/components/ui/Button'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'
import { contractsApi, bookingsApi } from '@/lib/api/contracts'

export default function ContractsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [refreshKey, setRefreshKey] = useState(0)
    const [activeTabId, setActiveTabId] = useState<string>('contracts')
    const [locations, setLocations] = useState<any[]>([])

    // Get URL parameters
    const adminMode = searchParams.get('admin_mode') === 'true'
    const companyId = searchParams.get('company_id')

    // Load locations for mapping
    useEffect(() => {
        const loadLocations = async () => {
            try {
                const response = await fetch('/api/locations')
                if (response.ok) {
                    const data = await response.json()
                    setLocations(data.data || [])
                }
            } catch (error) {
                console.error('Failed to load locations:', error)
            }
        }
        loadLocations()
    }, [])

    // Bookings state
    const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState<any>(null)

    const handleBookingIdClick = (booking: any) => {
        setSelectedBooking(booking)
        setShowBookingDetailsModal(true)
    }

    // Bookings columns
    const bookingsColumns: Column<any>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (row: any) => {
                const displayId = row.id.toString().padStart(4, '0')
                return (
                    <button
                        onClick={() => handleBookingIdClick(row)}
                        className="cursor-pointer"
                    >
                        <IdBadge>{displayId}</IdBadge>
                    </button>
                )
            }
        },
        {
            key: 'client',
            label: 'Client',
            render: (row: any) => row.users ? `${row.users.name} ${row.users.surname}` : row.client_id
        },
        {
            key: 'car',
            label: 'Car',
            render: (row: any) => row.company_cars && row.company_cars.car_templates ?
                `${row.company_cars.car_templates.car_brands?.name} ${row.company_cars.car_templates.car_models?.name} (#${row.company_cars.license_plate})` :
                row.company_car_id
        },
        {
            key: 'dates',
            label: 'Period',
            render: (row: any) => `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}`
        },
        {
            key: 'total_amount',
            label: 'Amount',
            sortable: true,
            render: (row: any) => `${row.total_amount} ฿`
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (row: any) => (
                <StatusBadge
                    variant={
                        row.status === 'pending' ? 'warning' :
                            row.status === 'confirmed' ? 'success' :
                                'error'
                    }
                >
                    {row.status === 'pending' ? 'pending' :
                        row.status === 'confirmed' ? 'confirmed' : 'cancelled'}
                </StatusBadge>
            )
        },
    ]

    // Contracts columns
    const contractsColumns: Column<any>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (row: any) => {
                const displayId = row.id.toString().padStart(4, '0')
                return (
                    <Link
                        href={`/dashboard/contracts/${row.id}/edit${(adminMode && companyId) ? `?admin_mode=true&company_id=${companyId}` : ''}`}
                        className="cursor-pointer"
                    >
                        <IdBadge>{displayId}</IdBadge>
                    </Link>
                )
            }
        },
        {
            key: 'user',
            label: 'Client',
            render: (row: any) => {
                const name = row.client ? row.client.name : (row.users ? row.users.name : '')
                const surname = row.client ? row.client.surname : (row.users ? row.users.surname : '')
                const fallback = row.client_id || row.user_id

                if (!name && !surname) return <span>{fallback}</span>

                return (
                    <div className="flex flex-col leading-tight">
                        <span className="font-medium text-gray-900">{name}</span>
                        <span className="text-sm text-gray-500">{surname}</span>
                    </div>
                )
            }
        },
        {
            key: 'car',
            label: 'Car',
            render: (row: any) => {
                let brand = ''
                let model = ''
                let plate = ''

                if (row.company_cars && row.company_cars.car_templates) {
                    brand = row.company_cars.car_templates.car_brands?.name || ''
                    model = row.company_cars.car_templates.car_models?.name || ''
                    plate = row.company_cars.license_plate || ''
                } else if (row.cars && row.cars.car_brand_models) {
                    brand = row.cars.car_brand_models.brand
                    model = row.cars.car_brand_models.model
                    plate = row.cars.plate_number
                } else {
                    return row.company_car_id || row.car_id
                }

                return (
                    <div className="flex flex-col leading-tight">
                        <span className="font-medium text-gray-900">{brand} {model}</span>
                        <span className="text-sm text-gray-500">{plate}</span>
                    </div>
                )
            }
        },
        {
            key: 'start_date',
            label: 'Start Date',
            sortable: true,
            render: (row: any) => (
                <div className="flex flex-col leading-tight">
                    <span className="font-medium text-gray-900">{new Date(row.start_date).toLocaleDateString()}</span>
                    <span className="text-xs text-gray-500">{new Date(row.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            key: 'end_date',
            label: 'End Date',
            sortable: true,
            render: (row: any) => (
                <div className="flex flex-col leading-tight">
                    <span className="font-medium text-gray-900">{new Date(row.end_date).toLocaleDateString()}</span>
                    <span className="text-xs text-gray-500">{new Date(row.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            key: 'return_district',
            label: 'District',
            render: (row: any) => {
                if (!row.notes) return <span className="text-gray-500 text-sm">-</span>

                // Try parsing as text first (new format)
                if (typeof row.notes === 'string') {
                    const lines = row.notes.split('\n')
                    const districtLine = lines.find((l: string) => l.startsWith('District: ')) || lines.find((l: string) => l.startsWith('Return District: '))
                    if (districtLine) {
                        return <span className="text-gray-900 text-sm">{districtLine.replace('District: ', '').replace('Return District: ', '')}</span>
                    }
                }

                // Fallback or legacy JSON parsing
                try {
                    const notes = JSON.parse(row.notes)
                    if (notes.return_location_id) {
                        const location = locations.find(loc => loc.id === notes.return_location_id)
                        if (location && location.district_name) {
                            return <span className="text-gray-900 text-sm">{location.district_name}</span>
                        }
                        return <span className="text-gray-900 text-sm">{notes.return_location_name || `Location #${notes.return_location_id}`}</span>
                    }
                } catch (e) {
                    // notes is not JSON, ignore
                }

                return <span className="text-gray-500 text-sm">-</span>
            }
        },
        {
            key: 'hotel',
            label: 'Hotel',
            render: (row: any) => {
                if (!row.notes) return <span className="text-gray-500 text-sm">-</span>

                // Try parsing as text first (new format)
                if (typeof row.notes === 'string') {
                    const lines = row.notes.split('\n')
                    const hotelLine = lines.find((l: string) => l.startsWith('Hotel: '))
                    if (hotelLine) {
                        return (
                            <div className="text-gray-900 text-sm whitespace-normal max-w-[200px]">
                                {hotelLine.replace('Hotel: ', '')}
                            </div>
                        )
                    }
                }

                return <span className="text-gray-500 text-sm">-</span>
            }
        },
        {
            key: 'total_amount',
            label: 'Amount',
            sortable: true,
            render: (row: any) => `${row.total_amount} ฿`
        },
        {
            key: 'deposit',
            label: 'Deposit',
            render: (row: any) => row.deposit_amount ? `${row.deposit_amount} ฿` : <span className="text-gray-500 text-sm">-</span>
        }
    ]

    // Fetch functions
    const fetchBookings = async (params: {
        page: number,
        pageSize: number,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        filters?: Record<string, any>
    }) => {
        try {
            return bookingsApi.getBookings({
                ...params,
                admin_mode: adminMode,
                company_id: companyId ? parseInt(companyId) : undefined
            })
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
            throw error
        }
    }

    const fetchContracts = async (params: {
        page: number,
        pageSize: number,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        filters?: Record<string, any>
    }) => {
        try {
            return contractsApi.getContracts({
                ...params,
                admin_mode: adminMode,
                company_id: companyId ? parseInt(companyId) : undefined
            })
        } catch (error) {
            console.error('Failed to fetch contracts:', error)
            throw error
        }
    }

    // Define tabs for DataTable
    const tabs: Tab<any>[] = [
        {
            id: 'contracts',
            label: 'Contracts',
            columns: contractsColumns,
            fetchData: fetchContracts
        },
        {
            id: 'bookings',
            label: 'Bookings',
            columns: bookingsColumns,
            fetchData: fetchBookings
        }
    ]

    return (
        <div className="space-y-6">
            <ActionPageHeader
                title="Contracts"
                actionLabel="Add"
                actionIcon={<PlusIcon className="w-4 h-4" />}
                actionType="link"
                href={(() => {
                    const params = new URLSearchParams()
                    if (adminMode && companyId) {
                        params.set('admin_mode', 'true')
                        params.set('company_id', companyId)
                    }
                    const queryString = params.toString()
                    const baseUrl = activeTabId === 'bookings' ? '/dashboard/bookings/create' : '/dashboard/contracts/create'
                    return queryString ? `${baseUrl}?${queryString}` : baseUrl
                })()}
            />

            <DataTable
                key={`contracts-${refreshKey}`}
                tabs={tabs}
                defaultTabId="contracts"
                onTabChange={setActiveTabId}
            />

            {/* Booking Details Modal */}
            {showBookingDetailsModal && selectedBooking && (
                <Modal
                    title={`Booking #${selectedBooking.id}`}
                    onClose={() => {
                        setShowBookingDetailsModal(false)
                        setSelectedBooking(null)
                    }}
                    maxWidth="lg"
                    actions={
                        selectedBooking.status === 'pending' && (
                            <Link href={`/dashboard/contracts/create?booking_id=${selectedBooking.id}`}>
                                <Button
                                    type="button"
                                    variant="primary"
                                >
                                    Add
                                </Button>
                            </Link>
                        )
                    }
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Client</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedBooking.users ? `${selectedBooking.users.name} ${selectedBooking.users.surname}` : selectedBooking.client_id}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Car</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedBooking.company_cars && selectedBooking.company_cars.car_templates ?
                                        `${selectedBooking.company_cars.car_templates.car_brands?.name} ${selectedBooking.company_cars.car_templates.car_models?.name} (#${selectedBooking.company_cars.license_plate})` :
                                        selectedBooking.company_car_id}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Period</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {new Date(selectedBooking.start_date).toLocaleDateString()} - {new Date(selectedBooking.end_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Amount</label>
                                <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedBooking.total_amount} ฿</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Status</label>
                                <div className="mt-1">
                                    <StatusBadge
                                        variant={
                                            selectedBooking.status === 'pending' ? 'warning' :
                                                selectedBooking.status === 'confirmed' ? 'success' :
                                                    'error'
                                        }
                                    >
                                        {selectedBooking.status === 'pending' ? 'pending' :
                                            selectedBooking.status === 'confirmed' ? 'confirmed' : 'cancelled'}
                                    </StatusBadge>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
