'use client'

import { useState, useEffect } from 'react'
import { PhotoIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import type { CarTemplate, Company, Color } from '@/types/database.types'

interface OwnerCarFormModalProps {
  company: Company
  templates: CarTemplate[]
  colors: Color[]
  onSubmit: (carData: any) => Promise<void>
  onCancel: () => void
}

export default function OwnerCarFormModal({
  company,
  templates,
  colors,
  onSubmit,
  onCancel
}: OwnerCarFormModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [templateId, setTemplateId] = useState<number | ''>('')
  const [selectedTemplate, setSelectedTemplate] = useState<CarTemplate | null>(null)
  const [colorId, setColorId] = useState<number | ''>('')
  const [mileage, setMileage] = useState<string>('0')
  const [vin, setVin] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [pricePerDay, setPricePerDay] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'available' | 'maintenance' | 'rented'>('available')
  const [photos, setPhotos] = useState<string[]>([])
  const [documentPhotos, setDocumentPhotos] = useState<string[]>([])

  // Update selected template when templateId changes
  useEffect(() => {
    const template = templates.find(t => t.id === templateId)
    setSelectedTemplate(template || null)
  }, [templateId, templates])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'car' | 'document') => {
    const files = e.target.files
    if (!files) return

    // For now, we'll store file names. In production, upload to storage first
    const fileNames: string[] = []
    Array.from(files).forEach(file => {
      // In production: upload to Supabase Storage and get URL
      // For now: store file name
      fileNames.push(file.name)
    })

    if (type === 'car') {
      setPhotos([...photos, ...fileNames])
    } else {
      setDocumentPhotos([...documentPhotos, ...fileNames])
    }

    // Reset input
    e.target.value = ''
  }

  const removePhoto = (index: number, type: 'car' | 'document') => {
    if (type === 'car') {
      setPhotos(photos.filter((_, i) => i !== index))
    } else {
      setDocumentPhotos(documentPhotos.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!templateId || !selectedTemplate) {
      setError('Please select a car template')
      setLoading(false)
      return
    }

    if (!licensePlate.trim()) {
      setError('License plate is required')
      setLoading(false)
      return
    }

    if (!colorId) {
      setError('Please select a color')
      setLoading(false)
      return
    }

    try {
      const carData = {
        company_id: company.id,
        template_id: selectedTemplate.id,
        color_id: parseInt(colorId.toString()),
        mileage: parseInt(mileage) || 0,
        vin: vin.trim() || null,
        license_plate: licensePlate.trim(),
        price_per_day: parseFloat(pricePerDay) || 0,
        photos: photos,
        document_photos: documentPhotos,
        description: description.trim() || null,
        status: status
      }

      await onSubmit(carData)
      setLoading(false)
    } catch (error: any) {
      console.error('Error saving car:', error)
      toast.error(error.message || 'Failed to save car')
      setLoading(false)
    }
  }

  // State for template search/autocomplete
  const [templateSearch, setTemplateSearch] = useState('')
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => {
    if (!templateSearch) return true
    const searchLower = templateSearch.toLowerCase()
    const brand = template.car_brands?.name?.toLowerCase() || ''
    const model = template.car_models?.name?.toLowerCase() || ''
    const bodyType = template.body_type?.toLowerCase() || ''
    const fuelType = template.fuel_type?.toLowerCase() || ''
    return brand.includes(searchLower) ||
      model.includes(searchLower) ||
      bodyType.includes(searchLower) ||
      fuelType.includes(searchLower)
  })

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection with Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Car Template *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={templateSearch || (selectedTemplate ? `${selectedTemplate.car_brands?.name} ${selectedTemplate.car_models?.name} - ${selectedTemplate.body_type} (${selectedTemplate.fuel_type})` : '')}
              onChange={(e) => {
                setTemplateSearch(e.target.value)
                setShowTemplateDropdown(true)
                if (!e.target.value) {
                  setTemplateId('')
                  setSelectedTemplate(null)
                }
              }}
              onFocus={() => setShowTemplateDropdown(true)}
              onBlur={() => setTimeout(() => setShowTemplateDropdown(false), 200)}
              placeholder="Search by brand, model, body type..."
            />
            {showTemplateDropdown && filteredTemplates.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="px-3 py-2 hover:bg-gray-300 cursor-pointer text-gray-900"
                    onClick={() => {
                      setTemplateId(template.id)
                      setSelectedTemplate(template)
                      setTemplateSearch('')
                      setShowTemplateDropdown(false)
                    }}
                  >
                    <div className="font-medium">
                      {template.car_brands?.name} {template.car_models?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {template.body_type} • {template.fuel_type} • {template.body_production_start_year}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="hidden"
            value={templateId}
            required
          />
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Template Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div><strong>Brand:</strong> {selectedTemplate.car_brands?.name}</div>
              <div><strong>Model:</strong> {selectedTemplate.car_models?.name}</div>
              <div><strong>Body Type:</strong> {selectedTemplate.body_type}</div>
              <div><strong>Class:</strong> {selectedTemplate.car_class}</div>
              <div><strong>Fuel Type:</strong> {selectedTemplate.fuel_type}</div>
              <div><strong>Body Year:</strong> {selectedTemplate.body_production_start_year}</div>
            </div>
          </div>
        )}

        {/* Car Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Color *
            </label>
            <select
              required
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              style={{ color: colorId ? '#111827' : '#6B7280' }}
              value={colorId}
              onChange={(e) => setColorId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select color</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Mileage *
            </label>
            <input
              type="number"
              required
              min="0"
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              VIN Number
            </label>
            <input
              type="text"
              maxLength={17}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              License Plate *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Price per Day *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={pricePerDay}
              onChange={(e) => setPricePerDay(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Status *
            </label>
            <select
              required
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'available' | 'maintenance' | 'rented')}
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Car Photos
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoUpload(e, 'car')}
              className="hidden"
              id="car-photos-input"
            />
            <label
              htmlFor="car-photos-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <PhotoIcon className="w-8 h-8 text-gray-500" />
              <span className="text-sm text-gray-600">Click to upload car photos</span>
            </label>
          </div>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    alt={`Car photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-car.jpg'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index, 'car')}
                    className="absolute top-1 right-1 p-1 bg-gray-200 text-gray-800 border border-gray-200 rounded-full hover:bg-gray-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Document Photos (Registration, Insurance, etc.)
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoUpload(e, 'document')}
              className="hidden"
              id="document-photos-input"
            />
            <label
              htmlFor="document-photos-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <DocumentIcon className="w-8 h-8 text-gray-500" />
              <span className="text-sm text-gray-600">Click to upload document photos</span>
            </label>
          </div>
          {documentPhotos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              {documentPhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    alt={`Document photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-document.jpg'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index, 'document')}
                    className="absolute top-1 right-1 p-1 bg-gray-200 text-gray-800 border border-gray-200 rounded-full hover:bg-gray-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Car'}
          </button>
        </div>
      </form>
    </div>
  )
}
