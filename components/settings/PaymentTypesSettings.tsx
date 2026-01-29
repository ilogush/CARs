'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DataTable, { Column } from '@/components/ui/DataTable'
import { Button, DeleteButton } from '@/components/ui/Button'
import { PaymentTypeForm } from '@/components/forms/PaymentTypeForm'
import ToastContainer from '@/components/ui/ToastContainer'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

interface PaymentType {
    id: number
    name: string
    sign: '+' | '-'
    description?: string
    is_active: boolean
    is_used?: boolean
    created_at: string
    updated_at: string
}

export default function PaymentTypesSettings() {
    const [showPaymentTypeForm, setShowPaymentTypeForm] = useState(false)
    const [showPaymentTypeDetailsModal, setShowPaymentTypeDetailsModal] = useState(false)
    const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null)
    const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([])

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now().toString()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id))
        }, 3000)
    }

    useEffect(() => {
        const handleOpenForm = () => handleCreate()
        window.addEventListener('open-payment-type-form', handleOpenForm)
        return () => window.removeEventListener('open-payment-type-form', handleOpenForm)
    }, [])

    const fetchPaymentTypes = async (params: {
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

            const response = await fetch(`/api/payment-types?${searchParams}`)
            if (!response.ok) throw new Error('Failed to fetch payment types')

            const data = await response.json()
            return { data: data.data || [], totalCount: data.totalCount || 0 }
        } catch (error) {
            addToast('Error loading payment types', 'error')
            return { data: [], totalCount: 0 }
        }
    }

    const handleCreate = () => {
        setEditingPaymentType(null)
        setShowPaymentTypeForm(true)
    }

    const handleEdit = (type: PaymentType) => {
        setShowPaymentTypeDetailsModal(false)
        setEditingPaymentType(type)
        setShowPaymentTypeForm(true)
    }

    const handleDelete = async (type: PaymentType) => {
        try {
            const response = await fetch(`/api/payment-types/${type.id}`, { method: 'DELETE' })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to delete payment type')
            }

            addToast('Payment type deleted successfully', 'success')
            setShowPaymentTypeDetailsModal(false)
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Error deleting payment type', 'error')
        }
    }

    const handleToggleActive = async (type: PaymentType) => {
        try {
            const response = await fetch(`/api/payment-types/${type.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...type, is_active: !type.is_active })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update payment type')
            }

            addToast(`Payment type ${type.is_active ? 'deactivated' : 'activated'} successfully`, 'success')
            setShowPaymentTypeDetailsModal(false)
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Error updating payment type', 'error')
        }
    }

    const handleFormSubmit = async (formData: any) => {
        try {
            const url = editingPaymentType ? `/api/payment-types/${editingPaymentType.id}` : '/api/payment-types'
            const method = editingPaymentType ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                addToast(errorData.error || 'Failed to save payment type', 'error')
                return
            }

            addToast(
                editingPaymentType ? `Payment type updated successfully` : `Payment type created successfully`,
                'success'
            )
            setShowPaymentTypeForm(false)
            setEditingPaymentType(null)
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Error saving payment type', 'error')
        }
    }

    const columns: Column<PaymentType>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (item) => {
                const displayId = item.id.toString().padStart(4, '0')
                return (
                    <button
                        onClick={() => handleEdit(item)}
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
            sortable: true,
            className: 'w-full',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.description && (
                        <span className="text-xs text-gray-500 mt-0.5">{item.description}</span>
                    )}
                </div>
            )
        },
        {
            key: 'sign',
            label: 'Sign',
            sortable: true,
            className: 'w-24',
            render: (item) => (
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border ${item.sign === '+' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                    {item.sign}
                </span>
            )
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            render: (item) => (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.is_active ? 'bg-gray-800' : 'bg-gray-200'
                            }`}
                        role="switch"
                        aria-checked={item.is_active}
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.is_active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                    <StatusBadge variant={item.is_active ? 'success' : 'error'}>
                        {item.is_active ? 'active' : 'inactive'}
                    </StatusBadge>
                </div>
            )
        },
    ]

    return (
        <>
            <DataTable
                key={`types-${refreshKey}`}
                columns={columns}
                fetchData={fetchPaymentTypes}
                disablePagination={false}
                initialPageSize={20}
            />

            <ToastContainer
                toasts={toasts}
                onRemove={(id) => setToasts(prev => prev.filter(toast => toast.id !== id))}
            />

            {showPaymentTypeForm && (
                <PaymentTypeForm
                    paymentType={editingPaymentType}
                    onSubmit={handleFormSubmit}
                    onDelete={handleDelete}
                    onCancel={() => {
                        setShowPaymentTypeForm(false)
                        setEditingPaymentType(null)
                    }}
                />
            )}
        </>
    )
}
