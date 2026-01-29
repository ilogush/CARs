'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { validateLatinOnly } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/forms/Input'
import { Select } from '@/components/ui/forms/Select'

interface CarBrand {
  id: number
  name: string
}

interface CarModel {
  id: number
  name: string
  brand_id: number
}

interface Location {
  id: number
  name: string
}

interface CarTemplate {
  id: number
  brand_id: number
  model_id: number
  body_type_id?: number
  car_class_id?: number
  fuel_type_id?: number
  door_count_id?: number
  seat_count_id?: number
  transmission_type_id?: number
  engine_volume_id?: number
  body_production_start_year: number
  body_type?: string
  car_class?: string
  fuel_type?: string
  car_body_types?: { id: number; name: string }
  car_classes?: { id: number; name: string }
  car_fuel_types?: { id: number; name: string }
  car_door_counts?: { id: number; count: number }
  car_seat_counts?: { id: number; count: number }
  car_transmission_types?: { id: number; name: string }
  car_engine_volumes?: { id: number; volume: number }
}

interface CarTemplateFormProps {
  template?: CarTemplate | null
  brands: CarBrand[]
  models: CarModel[]
  locations?: Location[]
  referenceData?: {
    bodyTypes: Array<{ id: number; name: string }>
    carClasses: Array<{ id: number; name: string }>
    fuelTypes: Array<{ id: number; name: string }>
    doorCounts: Array<{ id: number; count: number }>
    seatCounts: Array<{ id: number; count: number }>
    transmissionTypes: Array<{ id: number; name: string }>
    engineVolumes: Array<{ id: number; volume: number }>
  }
  onSubmit: (data: any) => void
  onCancel: () => void
  onModelCreated?: (newModel: CarModel) => void
}

export function CarTemplateForm({ template, brands, models, locations = [], referenceData, onSubmit, onCancel, onModelCreated }: CarTemplateFormProps) {
  const [formData, setFormData] = useState({
    brand_id: '',
    model_id: '',
    body_type_id: '',
    car_class_id: '',
    fuel_type_id: '',
    door_count_id: '',
    seat_count_id: '',
    transmission_type_id: '',
    engine_volume_id: '',
    body_production_start_year: '',
    island_trip_price: '',
    krabi_trip_price: '',
    full_insurance_price: '',
    baby_seat_price: ''
  })
  const [filteredModels, setFilteredModels] = useState<CarModel[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (template) {
      setFormData({
        brand_id: template.brand_id.toString(),
        model_id: template.model_id.toString(),
        body_type_id: template.body_type_id?.toString() || template.car_body_types?.id?.toString() || '',
        car_class_id: template.car_class_id?.toString() || template.car_classes?.id?.toString() || '',
        fuel_type_id: template.fuel_type_id?.toString() || template.car_fuel_types?.id?.toString() || '',
        door_count_id: template.door_count_id?.toString() || template.car_door_counts?.id?.toString() || '',
        seat_count_id: template.seat_count_id?.toString() || template.car_seat_counts?.id?.toString() || '',
        transmission_type_id: template.transmission_type_id?.toString() || template.car_transmission_types?.id?.toString() || '',
        engine_volume_id: template.engine_volume_id?.toString() || template.car_engine_volumes?.id?.toString() || '',
        body_production_start_year: template.body_production_start_year.toString(),
        island_trip_price: '',
        krabi_trip_price: '',
        full_insurance_price: '',
        baby_seat_price: ''
      })
    }
  }, [template])

  useEffect(() => {
    if (formData.brand_id) {
      const brandId = parseInt(formData.brand_id)
      const filtered = models.filter(model => model.brand_id === brandId)
      setFilteredModels(filtered)
    } else {
      setFilteredModels([])
    }
  }, [formData.brand_id, models])

  const handleFieldChange = (name: string, value: string | number) => {
    if (name === 'brand_id') {
      setFormData(prev => ({
        ...prev,
        [name]: String(value),
        model_id: '' // Reset model when brand changes
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: String(value) }))
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.brand_id) {
      newErrors.brand_id = 'Brand is required'
    }

    if (!formData.model_id) {
      newErrors.model_id = 'Model is required'
    }

    if (!formData.body_type_id) {
      newErrors.body_type_id = 'Body type is required'
    }

    if (!formData.car_class_id) {
      newErrors.car_class_id = 'Car class is required'
    }

    if (!formData.fuel_type_id) {
      newErrors.fuel_type_id = 'Fuel type is required'
    }

    if (!formData.body_production_start_year) {
      newErrors.body_production_start_year = 'Production year is required'
    } else {
      const year = parseInt(formData.body_production_start_year)
      const currentYear = new Date().getFullYear()
      if (year < 1900 || year > currentYear + 1) {
        newErrors.body_production_start_year = `Year must be between 1900 and ${currentYear + 1}`
      }
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
      brand_id: parseInt(formData.brand_id),
      model_id: parseInt(formData.model_id),
      body_type_id: formData.body_type_id ? parseInt(formData.body_type_id) : undefined,
      car_class_id: formData.car_class_id ? parseInt(formData.car_class_id) : undefined,
      fuel_type_id: formData.fuel_type_id ? parseInt(formData.fuel_type_id) : undefined,
      door_count_id: formData.door_count_id ? parseInt(formData.door_count_id) : undefined,
      seat_count_id: formData.seat_count_id ? parseInt(formData.seat_count_id) : undefined,
      transmission_type_id: formData.transmission_type_id ? parseInt(formData.transmission_type_id) : undefined,
      engine_volume_id: formData.engine_volume_id ? parseInt(formData.engine_volume_id) : undefined,
      body_production_start_year: parseInt(formData.body_production_start_year)
    })
  }

  return (
    <Modal
      title={template ? 'Edit Car Template' : 'Create Car Template'}
      onClose={onCancel}
      maxWidth="lg"
      actions={
        <Button
          type="submit"
          form="car-template-form"
          variant="primary"
        >
          {template ? 'Save' : 'Add'}
        </Button>
      }
    >
      <form id="car-template-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Select
              label="Brand"
              required
              options={brands.map(b => ({ value: b.id, label: b.name }))}
              value={formData.brand_id}
              onChange={(val) => handleFieldChange('brand_id', val as string)}
              placeholder="Select a brand"
              error={errors.brand_id}
            />
          </div>

          <div>
            <Select
              label="Model"
              required
              options={filteredModels.map(m => ({ value: m.id, label: m.name }))}
              value={formData.model_id}
              onChange={(val) => handleFieldChange('model_id', val as string)}
              placeholder="Select a model"
              disabled={!formData.brand_id}
              error={errors.model_id}
            />
          </div>

          <div>
            <Select
              label="Body Type"
              required
              options={(referenceData?.bodyTypes || []).map(t => ({ value: t.id, label: t.name }))}
              value={formData.body_type_id}
              onChange={(val) => handleFieldChange('body_type_id', val as string)}
              placeholder="Select body type"
              error={errors.body_type_id}
            />
          </div>

          <div>
            <Select
              label="Car Class"
              required
              options={(referenceData?.carClasses || []).map(c => ({ value: c.id, label: c.name }))}
              value={formData.car_class_id}
              onChange={(val) => handleFieldChange('car_class_id', val as string)}
              placeholder="Select car class"
              error={errors.car_class_id}
            />
          </div>

          <div>
            <Input
              label="Production Year"
              required
              type="number"
              value={formData.body_production_start_year}
              onChange={(val) => handleFieldChange('body_production_start_year', val)}
              placeholder="Enter production year"
              error={errors.body_production_start_year}
              min={1900}
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div>
            <Select
              label="Fuel Type"
              required
              options={(referenceData?.fuelTypes || []).map(t => ({ value: t.id, label: t.name }))}
              value={formData.fuel_type_id}
              onChange={(val) => handleFieldChange('fuel_type_id', val as string)}
              placeholder="Select fuel type"
              error={errors.fuel_type_id}
            />
          </div>

          <div>
            <Select
              label="Doors"
              options={(referenceData?.doorCounts || []).map(d => ({ value: d.id, label: d.count.toString() }))}
              value={formData.door_count_id}
              onChange={(val) => handleFieldChange('door_count_id', val as string)}
              placeholder="Select doors"
            />
          </div>

          <div>
            <Select
              label="Seats"
              options={(referenceData?.seatCounts || []).map(s => ({ value: s.id, label: s.count.toString() }))}
              value={formData.seat_count_id}
              onChange={(val) => handleFieldChange('seat_count_id', val as string)}
              placeholder="Select seats"
            />
          </div>

          <div>
            <Select
              label="Transmission"
              options={(referenceData?.transmissionTypes || []).map(t => ({ value: t.id, label: t.name }))}
              value={formData.transmission_type_id}
              onChange={(val) => handleFieldChange('transmission_type_id', val as string)}
              placeholder="Select transmission"
            />
          </div>

          <div>
            <Select
              label="Engine Volume"
              options={(referenceData?.engineVolumes || []).map(e => ({ value: e.id, label: `${e.volume}L` }))}
              value={formData.engine_volume_id}
              onChange={(val) => handleFieldChange('engine_volume_id', val as string)}
              placeholder="Select engine volume"
            />
          </div>

          <div>
            <Input
              label="Island Trip Cost"
              type="number"
              value={(formData as any).island_trip_price}
              onChange={(val) => handleFieldChange('island_trip_price', val)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Input
              label="Krabi Trip Cost"
              type="number"
              value={(formData as any).krabi_trip_price}
              onChange={(val) => handleFieldChange('krabi_trip_price', val)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Input
              label="Full Insurance Cost"
              type="number"
              value={(formData as any).full_insurance_price}
              onChange={(val) => handleFieldChange('full_insurance_price', val)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Input
              label="Baby Seat Cost"
              type="number"
              value={(formData as any).baby_seat_price}
              onChange={(val) => handleFieldChange('baby_seat_price', val)}
              placeholder="0.00"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
