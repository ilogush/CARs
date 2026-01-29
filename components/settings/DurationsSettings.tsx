'use client'

import { useState } from 'react'
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import { Button, DeleteButton } from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import PageHeader from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

interface DurationRange {
    id: string
    name: string
    min_days: number
    max_days: number | null
    price_coefficient?: number // Price multiplier (1.0 = base, 0.9 = -10%)
}

interface DurationsSettingsProps {
    company: any
    onSave: (settings: any) => Promise<void>
    saving: boolean
}

export default function DurationsSettings({ company, onSave, saving }: DurationsSettingsProps) {
    const toast = useToast()
    const currentSettings = company?.settings || {}
    const [durationRanges, setDurationRanges] = useState<DurationRange[]>(
        currentSettings.duration_ranges || [
            { id: 'd1', name: '1-3 days', min_days: 1, max_days: 3, price_coefficient: 1.0 },
            { id: 'd2', name: '4-7 days', min_days: 4, max_days: 7, price_coefficient: 0.95 },
            { id: 'd3', name: '8-14 days', min_days: 8, max_days: 14, price_coefficient: 0.90 },
            { id: 'd4', name: '15-21 days', min_days: 15, max_days: 21, price_coefficient: 0.85 },
            { id: 'd5', name: '22-28 days', min_days: 22, max_days: 28, price_coefficient: 0.80 },
            { id: 'd6', name: '29+ days', min_days: 29, max_days: null, price_coefficient: 0.75 },
        ]
    )

    const handleAddDuration = () => {
        const newRange: DurationRange = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Range',
            min_days: 1,
            max_days: null,
            price_coefficient: 1.0,
        }
        setDurationRanges([...durationRanges, newRange])
    }

    const handleRemoveDuration = (id: string) => {
        setDurationRanges(durationRanges.filter((r) => r.id !== id))
    }

    const handleUpdateDuration = (id: string, updates: Partial<DurationRange>) => {
        setDurationRanges(durationRanges.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    }

    // Validate duration ranges: no overlaps, no gaps
    const validateDurations = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (durationRanges.length === 0) {
            errors.push('At least one duration range is required')
            return { valid: false, errors }
        }

        // Sort by min_days
        const sorted = [...durationRanges].sort((a, b) => a.min_days - b.min_days)

        // Check that first range starts at 1
        if (sorted[0].min_days !== 1) {
            errors.push('Duration ranges must start from 1 day')
            return { valid: false, errors }
        }

        // Check for gaps and overlaps
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i]
            const next = sorted[i + 1]

            if (current.max_days === null) {
                errors.push(`"${current.name}" has unlimited max days but is not the last range`)
                return { valid: false, errors }
            }

            // Check for gap
            if (next.min_days > current.max_days + 1) {
                errors.push(`Gap detected between "${current.name}" and "${next.name}"`)
                return { valid: false, errors }
            }

            // Check for overlap
            if (next.min_days <= current.max_days) {
                errors.push(`Overlap detected between "${current.name}" and "${next.name}"`)
                return { valid: false, errors }
            }
        }

        return { valid: true, errors: [] }
    }

    const handleSave = () => {
        const validation = validateDurations()

        if (!validation.valid) {
            validation.errors.forEach(error => toast.error(error))
            return
        }

        toast.success('Duration ranges validated successfully')
        onSave({
            ...currentSettings,
            duration_ranges: durationRanges,
        })
    }

    return (
        <div className="space-y-6">
            {/* 2. Replace custom header div with ActionPageHeader */}
            <ActionPageHeader
                title="Rental Durations"
                rightActions={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleAddDuration}
                            icon={<PlusIcon className="w-4 h-4" />}
                        >
                            Add
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                }
            />

            {/* Duration Ranges List */}
            <DataTable
                columns={[
                    {
                        key: 'name',
                        label: 'Range Name',
                        render: (range: DurationRange) => (
                            <input
                                type="text"
                                value={range.name}
                                onChange={(e) => handleUpdateDuration(range.id, { name: e.target.value })}
                                className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                placeholder="e.g. Weekly"
                            />
                        )
                    },
                    {
                        key: 'min_days',
                        label: 'Min Days',
                        render: (range: DurationRange) => (
                            <input
                                type="number"
                                min="1"
                                value={range.min_days}
                                onChange={(e) => handleUpdateDuration(range.id, { min_days: parseInt(e.target.value) || 1 })}
                                className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                            />
                        )
                    },
                    {
                        key: 'max_days',
                        label: 'Max Days (0 = Unlimited)',
                        render: (range: DurationRange) => (
                            <input
                                type="number"
                                min="0"
                                value={range.max_days || 0}
                                onChange={(e) => handleUpdateDuration(range.id, { max_days: parseInt(e.target.value) || null })}
                                className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                placeholder="Unlimited"
                            />
                        )
                    },
                    {
                        key: 'price_coefficient',
                        label: 'Price Multiplier',
                        render: (range: DurationRange) => (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0.1"
                                    max="2"
                                    step="0.05"
                                    value={range.price_coefficient || 1}
                                    onChange={(e) => handleUpdateDuration(range.id, { price_coefficient: parseFloat(e.target.value) || 1 })}
                                    className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap hidden xl:inline-block">
                                    {(!range.price_coefficient || range.price_coefficient === 1) ? 'Base' : range.price_coefficient > 1 ? `+${Math.round((range.price_coefficient - 1) * 100)}%` : `${Math.round((range.price_coefficient - 1) * 100)}%`}
                                </span>
                            </div>
                        )
                    },
                    {
                        key: 'actions',
                        label: '',
                        className: 'w-10',
                        render: (range: DurationRange) => (
                            <DeleteButton
                                onClick={() => handleRemoveDuration(range.id)}
                                title="Delete range"
                            />
                        )
                    }
                ]}
                data={durationRanges}
                disablePagination
                initialPageSize={durationRanges.length}
            />
            {durationRanges.length === 0 && (
                <EmptyState
                    type="data"
                    title="No duration ranges defined"
                    description="Add at least one range to define rental duration tiers."
                    icon={<ClockIcon className="w-12 h-12 text-gray-300" />}
                />
            )}
        </div>
    )
}
