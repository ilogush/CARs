'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import { DeleteButton } from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

interface Season {
    id: string
    name: string
    start_date: string // MM-DD
    end_date: string // MM-DD
    price_coefficient: number // 1.0 = base price, 1.2 = +20%
}

interface SeasonsSettingsProps {
    company: any
    onSave: (settings: any) => Promise<void>
    saving: boolean
    readOnly?: boolean
    tabs?: { id: number | string; label: string }[]
    activeTab?: number | string
    onTabChange?: (id: number | string) => void
}

// Convert MM-DD to day of year (1-366)
function dateToDayOfYear(mmdd: string): number {
    const [month, day] = mmdd.split('-').map(Number)
    const daysInMonths = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let dayOfYear = day
    for (let i = 1; i < month; i++) {
        dayOfYear += daysInMonths[i]
    }
    return dayOfYear
}

// Check if a range spans year boundary (e.g., Dec 20 - Jan 20)
function spansYearBoundary(start: string, end: string): boolean {
    const startDay = dateToDayOfYear(start)
    const endDay = dateToDayOfYear(end)
    return startDay > endDay
}

// Get all days covered by a season (returns array of day numbers 1-366)
function getSeasonDays(start: string, end: string): number[] {
    const startDay = dateToDayOfYear(start)
    const endDay = dateToDayOfYear(end)
    const days: number[] = []

    if (spansYearBoundary(start, end)) {
        // From start to end of year
        for (let d = startDay; d <= 366; d++) days.push(d)
        // From beginning of year to end
        for (let d = 1; d <= endDay; d++) days.push(d)
    } else {
        for (let d = startDay; d <= endDay; d++) days.push(d)
    }

    return days
}

import Tabs from '@/components/ui/Tabs'

export default function SeasonsSettings({
    company,
    onSave,
    saving,
    readOnly = false,
    tabs,
    activeTab,
    onTabChange
}: SeasonsSettingsProps) {
    const toast = useToast()
    const currentSettings = company?.settings || {}
    const [seasons, setSeasons] = useState<Season[]>(currentSettings.seasons || [])

    // Sync state when props change (e.g. when switching location tabs)
    useEffect(() => {
        setSeasons(currentSettings.seasons || [])
    }, [currentSettings.seasons])

    const handleAddSeason = () => {
        const newSeason: Season = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Season',
            start_date: '01-01',
            end_date: '01-31',
            price_coefficient: 1.0,
        }
        setSeasons([...seasons, newSeason])
    }

    const handleRemoveSeason = (id: string) => {
        setSeasons(seasons.filter((s) => s.id !== id))
    }

    const handleUpdateSeason = (id: string, updates: Partial<Season>) => {
        setSeasons(seasons.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    }

    // Validate seasons: no overlaps and complete year coverage
    const validateSeasons = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = []

        if (seasons.length === 0) {
            errors.push('At least one season is required')
            return { valid: false, errors }
        }

        // Check for overlaps
        const allDays = new Map<number, string>()
        for (const season of seasons) {
            const days = getSeasonDays(season.start_date, season.end_date)
            for (const day of days) {
                if (allDays.has(day)) {
                    errors.push(`Date overlap detected between "${season.name}" and "${allDays.get(day)}"`)
                    return { valid: false, errors }
                }
                allDays.set(day, season.name)
            }
        }

        // Check for gaps (all 366 days should be covered)
        const coveredDays = new Set(allDays.keys())
        const missingDays: number[] = []
        for (let d = 1; d <= 366; d++) {
            if (!coveredDays.has(d)) {
                missingDays.push(d)
            }
        }

        if (missingDays.length > 0) {
            // Convert first missing day back to approximate date for user feedback
            const firstMissing = missingDays[0]
            errors.push(`Gap detected in year coverage. ${missingDays.length} days are not assigned to any season.`)
        }

        return { valid: errors.length === 0, errors }
    }

    const handleSave = () => {
        const validation = validateSeasons()

        if (!validation.valid) {
            validation.errors.forEach(error => toast.error(error))
            return
        }

        toast.success('Seasons validated successfully')
        onSave({
            ...currentSettings,
            seasons,
        })
    }

    const months = [
        { value: '01', label: 'Jan' },
        { value: '02', label: 'Feb' },
        { value: '03', label: 'Mar' },
        { value: '04', label: 'Apr' },
        { value: '05', label: 'May' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Aug' },
        { value: '09', label: 'Sep' },
        { value: '10', label: 'Oct' },
        { value: '11', label: 'Nov' },
        { value: '12', label: 'Dec' },
    ]

    const days = Array.from({ length: 31 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, '0'),
        label: (i + 1).toString(),
    }))

    return (
        <div className="space-y-6">
            {/* Header */}
            <ActionPageHeader
                title="Seasons"
                rightActions={
                    <div className="flex gap-2">
                        {!readOnly && (
                            <button
                                onClick={handleAddSeason}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-800 bg-gray-200 border border-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4 mr-1.5" />
                                Add
                            </button>
                        )}
                        {!readOnly && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-900 text-white border border-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        )}
                    </div>
                }
            />

            {tabs && activeTab !== undefined && onTabChange && (
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                />
            )}

            {/* Seasons List Container */}
            <DataTable
                columns={[
                    {
                        key: 'name',
                        label: 'Season Name',
                        render: (season: Season) => (
                            <span className="font-medium text-gray-900">{season.name}</span>
                        )
                    },
                    {
                        key: 'start_date',
                        label: 'Start Date',
                        render: (season: Season) => (
                            <div className="flex gap-2">
                                <select
                                    disabled={readOnly}
                                    value={season.start_date.split('-')[0]}
                                    onChange={(e) => handleUpdateSeason(season.id, { start_date: `${e.target.value}-${season.start_date.split('-')[1]}` })}
                                    className="flex-1 rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                >
                                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <select
                                    disabled={readOnly}
                                    value={season.start_date.split('-')[1]}
                                    onChange={(e) => handleUpdateSeason(season.id, { start_date: `${season.start_date.split('-')[0]}-${e.target.value}` })}
                                    className="w-16 rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                >
                                    {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                        )
                    },
                    {
                        key: 'end_date',
                        label: 'End Date',
                        render: (season: Season) => (
                            <div className="flex gap-2">
                                <select
                                    disabled={readOnly}
                                    value={season.end_date.split('-')[0]}
                                    onChange={(e) => handleUpdateSeason(season.id, { end_date: `${e.target.value}-${season.end_date.split('-')[1]}` })}
                                    className="flex-1 rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                >
                                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <select
                                    disabled={readOnly}
                                    value={season.end_date.split('-')[1]}
                                    onChange={(e) => handleUpdateSeason(season.id, { end_date: `${season.end_date.split('-')[0]}-${e.target.value}` })}
                                    className="w-16 rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white"
                                >
                                    {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                        )
                    },
                    {
                        key: 'price_coefficient',
                        label: 'Price Multiplier',
                        render: (season: Season) => (
                            <div className="flex items-center gap-2">
                                <input
                                    disabled={readOnly}
                                    type="number"
                                    min="1"
                                    max="3"
                                    step="0.05"
                                    value={season.price_coefficient || 1}
                                    onChange={(e) => handleUpdateSeason(season.id, { price_coefficient: parseFloat(e.target.value) || 1 })}
                                    className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white disabled:bg-gray-50"
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap hidden xl:inline-block">
                                    {(!season.price_coefficient || season.price_coefficient === 1) ? 'Base' : `+${Math.round((season.price_coefficient - 1) * 100)}%`}
                                </span>
                            </div>
                        )
                    },
                    {
                        key: 'actions',
                        label: '',
                        className: 'w-10',
                        render: (season: Season) => !readOnly ? (
                            <DeleteButton
                                onClick={() => handleRemoveSeason(season.id)}
                                title="Delete season"
                            />
                        ) : null
                    }
                ]}
                data={seasons}
                disablePagination
                initialPageSize={seasons.length}
            />
            {seasons.length === 0 && (
                <EmptyState
                    type="data"
                    title="No seasons defined"
                    description="Add at least one season to configure pricing multipliers."
                    icon={<CalendarIcon className="w-12 h-12 text-gray-300" />}
                />
            )}
        </div>
    )
}
