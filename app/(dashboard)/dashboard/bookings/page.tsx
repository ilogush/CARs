'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

export default function BookingsPage() {
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)

  const handleIdClick = (booking: any) => {
    setSelectedBooking(booking)
    setShowDetailsModal(true)
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row: any) => {
        const displayId = row.id.toString().padStart(4, '0')
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

      const res = await fetch(`/api/bookings?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings List" />
      <DataTable
        columns={columns}
        fetchData={fetchData}
      />

      {showDetailsModal && selectedBooking && (
        <Modal
          title={`Booking #${selectedBooking.id}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedBooking(null)
          }}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            {selectedBooking.status === 'pending' && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Link href={`/dashboard/contracts/create?booking_id=${selectedBooking.id}`}>
                  <Button
                    type="button"
                    variant="primary"
                  >
                    Create
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
