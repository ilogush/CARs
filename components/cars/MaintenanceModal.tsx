'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/lib/toast'

import { Input } from '@/components/ui/forms/Input'
import { Textarea } from '@/components/ui/forms/Textarea'

interface MaintenanceModalProps {
    carId: number
    adminMode: boolean
    companyId: string | null
    currentMileage: number
    onClose: () => void
    onSuccess: () => void
}

export default function MaintenanceModal({
    carId,
    adminMode,
    companyId,
    currentMileage,
    onClose,
    onSuccess
}: MaintenanceModalProps) {
    const [loading, setLoading] = useState(false)
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
    const [performedMileage, setPerformedMileage] = useState(currentMileage.toString())
    const [nextInterval, setNextInterval] = useState('10000') // Default interval
    const [notes, setNotes] = useState('')
    const toast = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = `/api/company-cars/${carId}/maintenance${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''
                }`

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_date: serviceDate,
                    performed_at_mileage: parseInt(performedMileage),
                    next_interval: parseInt(nextInterval),
                    notes
                })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to record maintenance')
            }

            toast.success('Maintenance recorded successfully')
            onSuccess()
        } catch (error: any) {
            console.error('Error recording maintenance:', error)
            toast.error(error.message || 'Failed to record maintenance')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title="Record Oil Change / Maintenance"
            onClose={onClose}
            maxWidth="md"
            actions={
                <Button type="submit" form="maintenance-form" variant="primary" loading={loading}>
                    Record Maintenance
                </Button>
            }
        >
            <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Service Date"
                    type="date"
                    value={serviceDate}
                    onChange={(val) => setServiceDate(val)}
                    required
                />

                <Input
                    label="Performed at Mileage (km)"
                    type="number"
                    value={performedMileage}
                    onChange={(val) => setPerformedMileage(val)}
                    required
                    min={0}
                />

                <div>
                    <Input
                        label="Next Service Interval (km)"
                        type="number"
                        value={nextInterval}
                        onChange={(val) => setNextInterval(val)}
                        required
                        min={1}
                        addonRight="km"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Next due at: {(parseInt(performedMileage) || 0) + (parseInt(nextInterval) || 0)} km
                    </p>
                </div>

                <Textarea
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(val) => setNotes(val)}
                    rows={3}
                    placeholder="Oil brand, filter type, etc."
                />

            </form>
        </Modal>
    )
}

