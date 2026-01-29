'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { validateLatinOnly } from '@/lib/validation'
import { Button, DeleteButton } from '@/components/ui/Button'

interface Location {
  id: number
  name: string
}

interface District {
  id: number
  name: string
  location_id: number
  created_at: string
  updated_at: string
  locations: {
    id: number
    name: string
  }
}

interface DistrictFormProps {
  district?: District | null
  locations: Location[]
  defaultLocationId?: number
  onSubmit: (data: any) => void
  onCancel: () => void
  onDelete?: () => void
}

export function DistrictForm({ district, locations, defaultLocationId, onSubmit, onCancel, onDelete }: DistrictFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    location_id: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (district) {
      setFormData({
        name: district.name,
        location_id: district.location_id.toString()
      })
    } else if (defaultLocationId) {
      setFormData(prev => ({ ...prev, location_id: defaultLocationId.toString() }))
    }
  }, [district, defaultLocationId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else {
      const latinError = validateLatinOnly(formData.name, 'District name')
      if (latinError) {
        newErrors.name = latinError
      }
    }

    if (!formData.location_id) {
      newErrors.location_id = 'Location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit({
      name: formData.name.trim(),
      location_id: parseInt(formData.location_id)
    })
  }

  return (
    <Modal
      title={district ? 'Edit District' : 'Create District'}
      onClose={onCancel}
      actions={
        <div className="flex gap-2">
          {district && onDelete && (
            <DeleteButton onClick={onDelete} />
          )}
          <Button
            type="submit"
            form="district-form"
            variant="primary"
          >
            {district ? 'Save' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id="district-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-500">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-gray-900 transition-colors ${errors.name ? 'border-red-500' : ''
              }`}
            placeholder="Enter district name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="location_id" className="block text-sm font-medium text-gray-500">
            Location *
          </label>
          <select
            id="location_id"
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            className={`block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-0 focus:border-gray-900 transition-colors ${errors.location_id ? 'border-red-500' : ''
              }`}
          >
            <option value="">Select a location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {errors.location_id && (
            <p className="mt-1 text-sm text-red-600">{errors.location_id}</p>
          )}
        </div>

      </form>
    </Modal>
  )
}
