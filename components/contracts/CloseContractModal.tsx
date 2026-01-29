'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { Button, DeleteButton } from '@/components/ui/Button'
import { useToast } from '@/lib/toast'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface CloseContractModalProps {
    contractId: number
    onClose: () => void
    onSuccess: () => void
}

interface ExtraFee {
    type_id: string
    amount: string
    notes: string
    custom_name?: string
}

export default function CloseContractModal({ contractId, onClose, onSuccess }: CloseContractModalProps) {
    const [loading, setLoading] = useState(false)
    const [paymentTypes, setPaymentTypes] = useState<any[]>([])
    const [extraFees, setExtraFees] = useState<ExtraFee[]>([])
    const [submitting, setSubmitting] = useState(false)
    const toast = useToast()

    useEffect(() => {
        const fetchPaymentTypes = async () => {
            try {
                setLoading(true)
                // Fetch all active payment types
                const res = await fetch('/api/payment-types')
                if (res.ok) {
                    const json = await res.json()
                    setPaymentTypes(json.data || [])
                }
            } catch (error) {
                console.error('Error fetching payment types:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchPaymentTypes()
    }, [])

    const handleAddFee = () => {
        setExtraFees([...extraFees, { type_id: '', amount: '', notes: '' }])
    }

    const handleRemoveFee = (index: number) => {
        setExtraFees(extraFees.filter((_, i) => i !== index))
    }

    const handleFeeChange = (index: number, field: keyof ExtraFee, value: string) => {
        const newFees = [...extraFees]
        // @ts-ignore - dynamic key assignment
        newFees[index][field] = value
        setExtraFees(newFees)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        // Validate fees
        const validFees = extraFees.filter(f =>
            (f.type_id || f.custom_name) && f.amount && parseFloat(f.amount) > 0
        )

        try {
            const res = await fetch(`/api/contracts/${contractId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fees: validFees.map(f => ({
                        type_id: f.type_id,
                        amount: parseFloat(f.amount),
                        notes: f.notes,
                        custom_name: f.custom_name
                    }))
                })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to close contract')
            }

            toast.success('Contract closed successfully')
            onSuccess()
        } catch (error: any) {
            console.error('Error closing contract:', error)
            toast.error(error.message || 'Failed to close contract')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            title="Close Contract"
            onClose={onClose}
            maxWidth="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> Closing this contract will mark the car as <strong>Available</strong> and calculate final payments. This action cannot be undone.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 lowercase tracking-wide">additional fees / fines</h4>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon={<PlusIcon className="w-4 h-4" />}
                            onClick={handleAddFee}
                        >
                            Add Fee
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-4 text-gray-500">Loading payment types...</div>
                    ) : extraFees.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No additional fees added.</p>
                    ) : (
                        <div className="space-y-3">
                            {extraFees.map((fee, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group transition-all hover:shadow-sm">
                                    <div className="flex gap-3 items-start pr-8">
                                        <div className="flex-1 space-y-2">
                                            {/* Fee Type Selection */}
                                            <div>
                                                {paymentTypes.length > 0 ? (
                                                    <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
                                                        <select
                                                            value={fee.type_id}
                                                            onChange={(e) => {
                                                                const val = e.target.value
                                                                handleFeeChange(index, 'type_id', val)
                                                                if (val !== 'custom') {
                                                                    handleFeeChange(index, 'custom_name', '')
                                                                }
                                                            }}
                                                            className="flex-1 rounded-l-md border-0 text-sm focus:ring-0 cursor-pointer py-2 pl-3 bg-transparent text-gray-900"
                                                        >
                                                            <option value="">Select Fee Type...</option>
                                                            {paymentTypes.map(type => (
                                                                <option key={type.id} value={type.id}>{type.name}</option>
                                                            ))}
                                                            <option value="custom" className="font-semibold text-blue-600">+ Custom Fee</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    /* No types loaded - default to custom input */
                                                    <input
                                                        type="text"
                                                        value={fee.custom_name || ''}
                                                        onChange={(e) => {
                                                            handleFeeChange(index, 'custom_name', e.target.value)
                                                            handleFeeChange(index, 'type_id', 'custom')
                                                        }}
                                                        placeholder="Fee Name (e.g. Cleaning)"
                                                        className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-black focus:ring-black"
                                                        required
                                                    />
                                                )}

                                                {/* Show Custom Name Input if "custom" is selected in dropdown */}
                                                {fee.type_id === 'custom' && paymentTypes.length > 0 && (
                                                    <input
                                                        type="text"
                                                        value={fee.custom_name || ''}
                                                        onChange={(e) => handleFeeChange(index, 'custom_name', e.target.value)}
                                                        placeholder="Enter fee name..."
                                                        className="mt-2 block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-black focus:ring-black animate-in fade-in slide-in-from-top-1"
                                                        required
                                                        autoFocus
                                                    />
                                                )}
                                            </div>

                                            {/* Amount & Notes Row */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={fee.amount}
                                                        onChange={(e) => handleFeeChange(index, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-black focus:ring-black pr-8"
                                                        required
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">฿</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={fee.notes}
                                                    onChange={(e) => handleFeeChange(index, 'notes', e.target.value)}
                                                    placeholder="Note (optional)"
                                                    className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-black focus:ring-black"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <DeleteButton
                                        onClick={() => handleRemoveFee(index)}
                                        className="absolute top-2 right-2 p-1.5"
                                        title="Remove fee"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 gap-3">
                    <Button type="submit" variant="primary" disabled={submitting}>
                        {submitting ? 'Closing...' : 'Close Contract'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
