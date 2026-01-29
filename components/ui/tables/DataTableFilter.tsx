import { useState, ReactNode } from 'react'
import CustomDatePicker from '@/components/ui/DatePicker'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '../forms/Input'
import { Select } from '../forms'

interface FilterOption {
  value: string
  label: string
}

interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: FilterOption[]
  placeholder?: string
}

interface DataTableFilterProps {
  filters: FilterField[]
  onFilterChange: (filters: Record<string, any>) => void
  values: Record<string, any>
  className?: string
}

export function DataTableFilter({ filters, onFilterChange, values, className = '' }: DataTableFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localValues, setLocalValues] = useState<Record<string, any>>(values)

  const handleChange = (key: string, value: any) => {
    const newValues = { ...localValues, [key]: value }
    setLocalValues(newValues)
  }

  const handleApply = () => {
    onFilterChange(localValues)
  }

  const handleReset = () => {
    const emptyValues = filters.reduce((acc, filter) => {
      acc[filter.key] = ''
      return acc
    }, {} as Record<string, any>)

    setLocalValues(emptyValues)
    onFilterChange(emptyValues)
  }

  const hasActiveFilters = Object.keys(values).some(key => values[key] !== '' && values[key] !== null)

  const renderFilterField = (filter: FilterField) => {
    const value = localValues[filter.key] || ''

    switch (filter.type) {
      case 'text':
        return (
          <Input
            label={filter.label}
            value={value}
            onChange={(newValue) => handleChange(filter.key, newValue)}
            placeholder={filter.placeholder}
          />
        )
      case 'select':
        return (
          <Select
            label={filter.label}
            value={value}
            onChange={(newValue) => handleChange(filter.key, newValue)}
            options={filter.options || []}
            placeholder={filter.placeholder}
          />
        )

      case 'date':
        return (
          <div className="w-full">
            {filter.label && (
              <label className="block text-sm font-medium text-gray-500 mb-1">
                {filter.label}
              </label>
            )}
            <CustomDatePicker
              selected={value ? new Date(value) : null}
              onChange={(date) => handleChange(filter.key, date ? date.toISOString().split('T')[0] : '')}
              placeholderText={filter.placeholder}
            />
          </div>
        )
      case 'number':
        return (
          <Input
            label={filter.label}
            type="number"
            value={value}
            onChange={(newValue) => handleChange(filter.key, newValue)}
            placeholder={filter.placeholder}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1"
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-gray-800 rounded-full">
                {Object.keys(values).filter(key => values[key] !== '' && values[key] !== null).length}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              onClick={handleReset}
              className="flex items-center space-x-1"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key}>
                {renderFilterField(filter)}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" onClick={() => setIsExpanded(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
