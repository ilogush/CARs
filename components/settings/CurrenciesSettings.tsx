'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Currency } from '@/types/database.types'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import Modal from '@/components/ui/Modal'
import { Button, DeleteButton } from '@/components/ui/Button'
import IdBadge from '@/components/ui/IdBadge'
import Toggle from '@/components/ui/Toggle'
import { inputBaseStyles } from '@/lib/styles/input'
import FormField from '@/components/ui/FormField'

interface CurrenciesSettingsProps {
    company: any
    onUpdateCompany: (updates: any) => Promise<void>
    saving?: boolean
    userRole?: string | null
}

export interface CurrenciesSettingsRef {
    handleOpenCreate: () => void
}

const CurrenciesSettings = forwardRef<CurrenciesSettingsRef, CurrenciesSettingsProps>(({ company, onUpdateCompany, saving, userRole }: CurrenciesSettingsProps, ref) => {
    const toast = useToast()
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
    const [formData, setFormData] = useState({ name: '', code: '', symbol: '' })
    const [submitting, setSubmitting] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    useImperativeHandle(ref, () => ({
        handleOpenCreate
    }))

    useEffect(() => {
        fetchCurrencies()
    }, [refreshKey])

    const fetchCurrencies = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/currencies?page=1&pageSize=100&sortBy=code&showInactive=true')
            if (res.ok) {
                const data = await res.json()
                setCurrencies(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching currencies:', error)
            toast.error('Failed to load currencies')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenCreate = () => {
        setEditingCurrency(null)
        setFormData({ name: '', code: '', symbol: '' })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (currency: Currency) => {
        setEditingCurrency(currency)
        setFormData({
            name: currency.name,
            code: currency.code,
            symbol: currency.symbol
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.code || !formData.symbol) return

        setSubmitting(true)
        try {
            const url = editingCurrency ? `/api/currencies/${editingCurrency.id}` : '/api/currencies'
            const method = editingCurrency ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to save currency')
            }

            toast.success(editingCurrency ? 'Currency updated' : 'Currency created')
            setIsModalOpen(false)
            setRefreshKey(prev => prev + 1)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSetDefault = async (currencyId: number) => {
        await onUpdateCompany({ currency_id: currencyId })
    }

    const handleToggleActive = async (currency: Currency) => {
        try {
            const res = await fetch(`/api/currencies/${currency.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currency.is_active })
            })

            if (!res.ok) throw new Error('Failed to update status')

            setRefreshKey(prev => prev + 1)
            toast.success('Currency status updated')
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleDelete = async (currency: Currency) => {
        try {
            const res = await fetch(`/api/currencies/${currency.id}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to delete currency')
            }

            toast.success('Currency deleted')
            setRefreshKey(prev => prev + 1)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const currenciesColumns: Column<Currency>[] = [
        {
            key: 'id',
            label: 'ID',
            render: (row) => (
                <button onClick={() => handleOpenEdit(row)} className="hover:opacity-80 transition-opacity">
                    <IdBadge>{row.id.toString().padStart(4, '0')}</IdBadge>
                </button>
            )
        },
        {
            key: 'name',
            label: 'Currency',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{row.name}</span>
                    <span className="text-xs text-gray-500 uppercase">{row.code} ({row.symbol})</span>
                </div>
            )
        },
        {
            key: 'is_active',
            label: 'Active',
            render: (row) => (
                <Toggle
                    enabled={row.is_active}
                    onChange={() => handleToggleActive(row)}
                    disabled={company.currency_id === row.id}
                />
            )
        },
        {
            key: 'default',
            label: 'Default',
            render: (row) => (
                <Toggle
                    enabled={company.currency_id === row.id}
                    onChange={() => onUpdateCompany({ currency_id: row.id })}
                    disabled={!row.is_active || company.currency_id === row.id || saving}
                />
            )
        },
        ...(userRole !== 'admin' ? [{
            key: 'actions',
            label: '',
            className: 'w-10 text-right',
            render: (row: Currency) => (
                <DeleteButton
                    onClick={() => handleDelete(row)}
                    disabled={company.currency_id === row.id}
                />
            )
        }] : [])
    ]

    if (loading && currencies.length === 0) return <div className="py-8 text-center"><Loader /></div>

    return (
        <div className="space-y-6">
            <DataTable
                key={refreshKey}
                columns={currenciesColumns}
                fetchData={async () => ({ data: currencies, totalCount: currencies.length })}
                initialPageSize={100}
            />

            {/* Currency Modal (Create/Edit) */}
            {isModalOpen && (
                <Modal
                    title={editingCurrency ? 'Edit Currency' : 'Create Currency'}
                    onClose={() => setIsModalOpen(false)}
                    maxWidth="md"
                    actions={
                        <div className="flex items-center justify-end gap-3 w-full">
                            {editingCurrency && (
                                <DeleteButton
                                    onClick={() => handleDelete(editingCurrency)}
                                    disabled={company.currency_id === editingCurrency.id}
                                />
                            )}
                            <Button
                                type="submit"
                                form="currency-form"
                                variant="primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : (editingCurrency ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    }
                >
                    <form id="currency-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <FormField label="Currency Name" required>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className={inputBaseStyles}
                                    placeholder="US Dollar"
                                />
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Code (ISO)" required>
                                <input
                                    type="text"
                                    required
                                    maxLength={3}
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className={`${inputBaseStyles} uppercase font-mono`}
                                    placeholder="USD"
                                />
                            </FormField>
                        </div>
                        <div>
                            <FormField label="Symbol" required>
                                <input
                                    type="text"
                                    required
                                    value={formData.symbol}
                                    onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                                    className={inputBaseStyles}
                                    placeholder="$"
                                />
                            </FormField>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
})

export default CurrenciesSettings
