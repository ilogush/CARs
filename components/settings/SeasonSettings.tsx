'use client'

import { useState } from 'react'
import { PlusIcon, TrashIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import Section from '@/components/ui/Section'
import { Button, DeleteButton } from '@/components/ui/Button'

interface Season {
  id: string
  name: string
  start_date: string // MM-DD
  end_date: string // MM-DD
}

interface DurationRange {
  id: string
  name: string
  min_days: number
  max_days: number | null
}

interface SeasonSettingsProps {
  company: any
  onSave: (settings: any) => Promise<void>
  saving: boolean
}

export default function SeasonSettings({ company, onSave, saving }: SeasonSettingsProps) {
  const currentSettings = company?.settings || {}
  const [seasons, setSeasons] = useState<Season[]>(
    currentSettings.seasons?.length > 0
      ? currentSettings.seasons
      : [
        { id: 's1', name: 'Peak season', start_date: '12-20', end_date: '01-20' },
        { id: 's2', name: 'High season', start_date: '01-21', end_date: '05-05' },
        { id: 's3', name: 'Low season / Middle season', start_date: '09-15', end_date: '12-19' },
      ]
  )
  const [durationRanges, setDurationRanges] = useState<DurationRange[]>(
    currentSettings.duration_ranges || [
      { id: 'd1', name: '1-3 days', min_days: 1, max_days: 3 },
      { id: 'd2', name: '4-7 days', min_days: 4, max_days: 7 },
      { id: 'd3', name: '8-14 days', min_days: 8, max_days: 14 },
      { id: 'd4', name: '15-29 days', min_days: 15, max_days: 29 },
      { id: 'd5', name: '30+ days', min_days: 30, max_days: null },
    ]
  )

  const handleAddSeason = () => {
    const newSeason: Season = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Season',
      start_date: '01-01',
      end_date: '12-31',
    }
    setSeasons([...seasons, newSeason])
  }

  const handleRemoveSeason = (id: string) => {
    setSeasons(seasons.filter((s) => s.id !== id))
  }

  const handleUpdateSeason = (id: string, updates: Partial<Season>) => {
    setSeasons(seasons.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const handleAddDuration = () => {
    const newRange: DurationRange = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Range',
      min_days: 1,
      max_days: null,
    }
    setDurationRanges([...durationRanges, newRange])
  }

  const handleRemoveDuration = (id: string) => {
    setDurationRanges(durationRanges.filter((r) => r.id !== id))
  }

  const handleUpdateDuration = (id: string, updates: Partial<DurationRange>) => {
    setDurationRanges(durationRanges.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const handleSave = () => {
    onSave({
      ...currentSettings,
      seasons,
      duration_ranges: durationRanges,
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
    <Section
      title="Seasons & Pricing Structure"
      description="Define your seasons and rental duration ranges."
      headerAction={
        <Button
          onClick={handleSave}
          loading={saving}
        >
          {saving ? 'Saving...' : 'Save Pricing Structure'}
        </Button>
      }
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <div className="space-y-10 mt-6">
        {/* Seasons Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              Seasons
            </h4>
            <Button
              variant="secondary"
              onClick={handleAddSeason}
              icon={<PlusIcon className="w-4 h-4" />}
              size="sm"
            >
              Add Season
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {seasons.map((season) => (
              <div key={season.id} className="group flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 transition-all hover:border-gray-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Season Name</label>
                    <input
                      type="text"
                      value={season.name}
                      onChange={(e) => handleUpdateSeason(season.id, { name: e.target.value })}
                      className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors"
                      placeholder="e.g. High Season"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <div className="flex gap-2">
                      <select
                        value={season.start_date.split('-')[0]}
                        onChange={(e) => handleUpdateSeason(season.id, { start_date: `${e.target.value}-${season.start_date.split('-')[1]}` })}
                        className="flex-1 rounded-lg border-gray-200 text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white hover:bg-gray-50"
                      >
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select
                        value={season.start_date.split('-')[1]}
                        onChange={(e) => handleUpdateSeason(season.id, { start_date: `${season.start_date.split('-')[0]}-${e.target.value}` })}
                        className="w-20 rounded-lg border-gray-200 text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white hover:bg-gray-50"
                      >
                        {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <div className="flex gap-2">
                      <select
                        value={season.end_date.split('-')[0]}
                        onChange={(e) => handleUpdateSeason(season.id, { end_date: `${e.target.value}-${season.end_date.split('-')[1]}` })}
                        className="flex-1 rounded-lg border-gray-200 text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white hover:bg-gray-50"
                      >
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select
                        value={season.end_date.split('-')[1]}
                        onChange={(e) => handleUpdateSeason(season.id, { end_date: `${season.end_date.split('-')[0]}-${e.target.value}` })}
                        className="w-20 rounded-lg border-gray-200 text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors bg-white hover:bg-gray-50"
                      >
                        {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <DeleteButton
                  onClick={() => handleRemoveSeason(season.id)}
                />
              </div>
            ))}
            {seasons.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                <CalendarIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No seasons defined. Add one to start organizing your pricing.</p>
              </div>
            )}
          </div>
        </div>

        <hr className="border-gray-50" />

        {/* Duration Ranges Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              Rental Durations
            </h4>
            <Button
              variant="secondary"
              onClick={handleAddDuration}
              icon={<PlusIcon className="w-4 h-4" />}
              size="sm"
            >
              Add Range
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {durationRanges.map((range) => (
              <div key={range.id} className="group flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 transition-all hover:border-gray-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Range Name</label>
                    <input
                      type="text"
                      value={range.name}
                      onChange={(e) => handleUpdateDuration(range.id, { name: e.target.value })}
                      className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors"
                      placeholder="e.g. Weekly"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Min Days</label>
                    <input
                      type="number"
                      min="1"
                      value={range.min_days}
                      onChange={(e) => handleUpdateDuration(range.id, { min_days: parseInt(e.target.value) || 1 })}
                      className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Max Days (0 for unlimited)</label>
                    <input
                      type="number"
                      min="0"
                      value={range.max_days || 0}
                      onChange={(e) => handleUpdateDuration(range.id, { max_days: parseInt(e.target.value) || null })}
                      className="block w-full rounded-lg border-gray-200 shadow-sm text-sm py-2 px-3 focus:ring-0 focus:border-gray-500 transition-colors"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <DeleteButton
                  onClick={() => handleRemoveDuration(range.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
