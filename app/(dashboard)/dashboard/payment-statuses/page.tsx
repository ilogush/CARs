'use client'

import { useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { PaymentStatusForm } from '@/components/forms/PaymentStatusForm'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

interface PaymentStatus {
  id: number
  name: string
  value: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PaymentStatusesPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | null>(null)
  const [editingStatus, setEditingStatus] = useState<PaymentStatus | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()

  const handleCreate = () => {
    setEditingStatus(null)
    setShowForm(true)
  }

  const handleIdClick = (status: PaymentStatus) => {
    setSelectedStatus(status)
    setShowDetailsModal(true)
  }

  const handleEdit = (status: PaymentStatus) => {
    setShowDetailsModal(false)
    setEditingStatus(status)
    setShowForm(true)
  }

  const handleToggleActive = async (status: PaymentStatus) => {
    try {
      const response = await fetch(`/api/payment-statuses/${status.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...status,
          is_active: !status.is_active
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment status')
      }

      toast.success(
        `Payment status ${status.is_active ? 'deactivated' : 'activated'} successfully`
      )
      setShowDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error updating payment status')
    }
  }

  const handleDelete = async (status: PaymentStatus) => {
    try {
      const response = await fetch(`/api/payment-statuses/${status.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to delete status')
      }

      toast.success(`Payment status "${status.name}" deleted successfully`)
      setShowDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting status')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingStatus
        ? `/api/payment-statuses/${editingStatus.id}`
        : '/api/payment-statuses'

      const method = editingStatus ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to save payment status'
        toast.error(errorMessage)
        return
      }

      toast.success(
        editingStatus ? `Payment status "${formData.name}" updated successfully` : `Payment status "${formData.name}" created successfully`
      )
      setShowForm(false)
      setEditingStatus(null)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving payment status')
    }
  }

  const fetchPaymentStatuses = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString()
      })

      if (params.sortBy) {
        searchParams.set('sortBy', params.sortBy)
        searchParams.set('sortOrder', params.sortOrder || 'asc')
      }

      if (params.filters) {
        searchParams.set('filters', JSON.stringify(params.filters))
      }

      const response = await fetch(`/api/payment-statuses?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch payment statuses')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading payment statuses')
      return { data: [], totalCount: 0 }
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: PaymentStatus) => {
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleIdClick(item)}
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
      sortable: true
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (item: PaymentStatus) => (
        <StatusBadge
          variant={
            item.value === 1 ? 'success' :
              item.value === -1 ? 'error' :
                'neutral'
          }
        >
          {item.value === 1 ? '+' : item.value === -1 ? '-' : '0'}{Math.abs(item.value)}
        </StatusBadge>
      )
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      render: (item: PaymentStatus) => (
        <span className="text-sm text-gray-600">
          {item.description || '-'}
        </span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (item: PaymentStatus) => (
        <StatusBadge variant={item.is_active ? 'success' : 'error'}>
          {item.is_active ? 'active' : 'inactive'}
        </StatusBadge>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Statuses"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Create
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchPaymentStatuses}
        refreshKey={refreshKey}
      />

      {showForm && (
        <PaymentStatusForm
          status={editingStatus}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingStatus(null)
          }}
        />
      )}

      {showDetailsModal && selectedStatus && (
        <Modal
          title={`Payment Status: ${selectedStatus.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedStatus(null)
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedStatus.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Value</label>
                <div className="mt-1">
                  <StatusBadge
                    variant={
                      selectedStatus.value === 1 ? 'success' :
                        selectedStatus.value === -1 ? 'error' :
                          'neutral'
                    }
                  >
                    {selectedStatus.value === 1 ? '+' : selectedStatus.value === -1 ? '-' : '0'}{Math.abs(selectedStatus.value)}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge variant={selectedStatus.is_active ? 'success' : 'error'}>
                    {selectedStatus.is_active ? 'active' : 'inactive'}
                  </StatusBadge>
                </div>
              </div>
            </div>
            {selectedStatus.description && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-sm text-gray-600">{selectedStatus.description}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => handleToggleActive(selectedStatus)}
                variant="secondary"
                icon={selectedStatus.is_active ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              >
                {selectedStatus.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                type="button"
                onClick={() => handleEdit(selectedStatus)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton
                onClick={() => handleDelete(selectedStatus)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
