'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PhotoIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useToast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { useEnglishValidation } from '@/hooks/useEnglishValidation'
import DataTable from '@/components/ui/DataTable'
import type { CarTemplate, Company, Color } from '@/types/database.types'

interface OwnerCarFormProps {
  company: Company
  templates: CarTemplate[]
  colors: Color[]
  header: {
    title: string
    backHref: string
  }
  submitLabel: string
  formId: string
  initialData?: any
}

export default function OwnerCarForm({
  company,
  templates,
  colors,
  header,
  submitLabel,
  formId,
  initialData
}: OwnerCarFormProps) {
  const router = useRouter()
  const toast = useToast()
  const { handleInputChange, checkAndWarn } = useEnglishValidation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [templateId, setTemplateId] = useState<number | ''>(initialData?.template_id || '')
  const [selectedTemplate, setSelectedTemplate] = useState<CarTemplate | null>(null)
  const [colorId, setColorId] = useState<number | ''>(initialData?.color_id ? Number(initialData.color_id) : '')
  const [mileage, setMileage] = useState<string>(initialData?.mileage != null ? initialData.mileage.toString() : '0')
  const [vin, setVin] = useState(initialData?.vin || '')
  const [licensePlate, setLicensePlate] = useState(initialData?.license_plate || '')
  const [productionYear, setProductionYear] = useState<string>(initialData?.year ? initialData.year.toString() : '')
  const [pricePerDay, setPricePerDay] = useState<string>(initialData?.price_per_day != null ? initialData.price_per_day.toString() : '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [status, setStatus] = useState<'available' | 'maintenance' | 'rented'>(initialData?.status || 'available')
  const [photos, setPhotos] = useState<string[]>(Array.isArray(initialData?.photos) ? initialData.photos : [])
  const [documentPhotos, setDocumentPhotos] = useState<string[]>(Array.isArray(initialData?.document_photos) ? initialData.document_photos : [])
  const [nextOilChangeMileage, setNextOilChangeMileage] = useState<string>(initialData?.next_oil_change_mileage != null ? initialData.next_oil_change_mileage.toString() : '')
  const [insuranceExpiry, setInsuranceExpiry] = useState<string>(initialData?.insurance_expiry || '')
  const [registrationExpiry, setRegistrationExpiry] = useState<string>(initialData?.registration_expiry || '')
  const [insuranceType, setInsuranceType] = useState<string>(initialData?.insurance_type || '')
  const [pricePerMonth, setPricePerMonth] = useState<string>(initialData?.price_per_month != null ? initialData.price_per_month.toString() : '')
  const [marketingHeadline, setMarketingHeadline] = useState<string>(initialData?.marketing_headline || '')
  const [featuredImageIndex, setFeaturedImageIndex] = useState<number>(initialData?.featured_image_index || 0)
  const [seasonalPrices, setSeasonalPrices] = useState<any>(initialData?.seasonal_prices || {})

  const companySettings = company?.settings as any || {}
  const seasons = companySettings.seasons || []
  const durationRanges = companySettings.duration_ranges || [
    { id: 'd1', name: '1-3 days', min_days: 1, max_days: 3 },
    { id: 'd2', name: '4-7 days', min_days: 4, max_days: 7 },
    { id: 'd3', name: '8-14 days', min_days: 8, max_days: 14 },
    { id: 'd4', name: '15-29 days', min_days: 15, max_days: 29 },
    { id: 'd5', name: '30+ days', min_days: 30, max_days: null },
  ]

  // Rental Options
  const [deposit, setDeposit] = useState<string>(initialData?.deposit != null ? initialData.deposit.toString() : '')
  const [dailyMileageLimit, setDailyMileageLimit] = useState<string>(initialData?.daily_mileage_limit != null ? initialData.daily_mileage_limit.toString() : '')
  const [minRentalDays, setMinRentalDays] = useState<string>(initialData?.min_rental_days != null ? initialData.min_rental_days.toString() : '1')

  // Update selected template when templateId changes or when initialData is loaded
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId)
      setSelectedTemplate(template || null)
    } else if (initialData?.car_templates && templates.length > 0) {
      // If we have initialData with car_templates, find matching template from templates array
      const template = templates.find(t => t.id === initialData.template_id)
      if (template) {
        setSelectedTemplate(template)
      }
    }
  }, [templateId, templates, initialData])

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
      const msg = 'Please select a car template'
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    if (!licensePlate.trim()) {
      const msg = 'License plate is required'
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    if (!colorId) {
      const msg = 'Please select a color'
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    if (!deposit) {
      const msg = 'Security deposit is required'
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const adminMode = urlParams.get('admin_mode') === 'true'
      const companyIdParam = urlParams.get('company_id')

      const carData = {
        company_id: company.id,
        template_id: selectedTemplate!.id,
        color_id: parseInt(colorId.toString()),
        mileage: parseInt(mileage) || 0,
        vin: vin.trim() || null,
        license_plate: licensePlate.trim(),
        year: productionYear ? parseInt(productionYear) : null,
        price_per_day: parseFloat(pricePerDay) || 0,
        deposit: parseFloat(deposit) || 0,
        daily_mileage_limit: dailyMileageLimit ? parseInt(dailyMileageLimit) : null,
        min_rental_days: minRentalDays ? parseInt(minRentalDays) : 1,
        photos: photos,
        document_photos: documentPhotos,
        next_oil_change_mileage: nextOilChangeMileage ? parseInt(nextOilChangeMileage) : null,
        insurance_expiry: insuranceExpiry || null,
        registration_expiry: registrationExpiry || null,
        insurance_type: insuranceType || null,
        price_per_month: pricePerMonth ? parseFloat(pricePerMonth) : null,
        marketing_headline: marketingHeadline.trim() || null,
        featured_image_index: featuredImageIndex,
        description: description.trim() || null,
        status: status,
        seasonal_prices: seasonalPrices
      }

      let url = '/api/company-cars'
      if (adminMode && companyIdParam) {
        url += `?admin_mode=true&company_id=${companyIdParam}`
      }

      if (initialData) {
        // Update existing car
        const response = await fetch(`${url}/${initialData.id}${adminMode && companyIdParam ? `?admin_mode=true&company_id=${companyIdParam}` : ''}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(carData)
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to update car')
        }

        toast.success('Car updated successfully')
      } else {
        // Create new car
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(carData)
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to create car')
        }

        toast.success('Car created successfully')
      }

      router.push(header.backHref)
    } catch (error: any) {
      console.error('Error saving car:', error)
      const msg = error.message || 'Failed to save car'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href={header.backHref}
            className="p-2 hover:bg-gray-300 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <h3 className="text-lg font-medium text-gray-900">{header.title}</h3>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            type="submit"
            form={formId}
            loading={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        {/* Car Details & Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Car Template *
            </label>
            <select
              required
              disabled={!!initialData}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-200"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.car_brands?.name} {template.car_models?.name}
                  {template.body_type || template.fuel_type ? ' - ' : ''}
                  {template.body_type}
                  {template.fuel_type ? ` (${template.fuel_type})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Color *
            </label>
            <select
              required
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
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
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="0"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Year
            </label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              value={productionYear}
              onChange={(e) => setProductionYear(e.target.value)}
              placeholder="e.g. 2024"
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
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                checkAndWarn(val)
                setLicensePlate(val)
              }}
              placeholder="ABC-1234"
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
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                checkAndWarn(val)
                setVin(val)
              }}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Price per Day *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
            </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Security Deposit *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Mileage Limit (Daily)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                value={dailyMileageLimit}
                onChange={(e) => setDailyMileageLimit(e.target.value)}
                placeholder="Unlimited"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Min Rental Days
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-12"
                value={minRentalDays}
                onChange={(e) => setMinRentalDays(e.target.value)}
                placeholder="1"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">days</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Next Oil Change
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                value={nextOilChangeMileage}
                onChange={(e) => setNextOilChangeMileage(e.target.value)}
                placeholder="e.g. 50000"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
            </div>
          </div>
        </div>

        {/* Documents & Insurance */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Documents & Insurance</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Insurance Expiry
              </label>
              <input
                type="date"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Registration/Tax Expiry
              </label>
              <input
                type="date"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                value={registrationExpiry}
                onChange={(e) => setRegistrationExpiry(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Insurance Type
              </label>
              <select
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                value={insuranceType}
                onChange={(e) => setInsuranceType(e.target.value)}
              >
                <option value="">Select type</option>
                <option value="Basic">Basic</option>
                <option value="Full / First Class">Full / First Class</option>
                <option value="Third Party">Third Party</option>
              </select>
            </div>
          </div>
        </div>

        {/* Marketing & Pricing */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Marketing & Pricing</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Price per Month
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-8"
                  value={pricePerMonth}
                  onChange={(e) => setPricePerMonth(e.target.value)}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Marketing Headline
              </label>
              <input
                type="text"
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                value={marketingHeadline}
                onChange={(e) => {
                  checkAndWarn(e.target.value)
                  setMarketingHeadline(e.target.value)
                }}
                placeholder="e.g. Perfect for city trips, Family SUV, etc."
              />
            </div>
          </div>
        </div>

        {/* Seasonal Pricing Table */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-gray-900">Seasonal Pricing Table</h4>
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Prices in {company.currency_id === 1 ? '฿' : '$'}
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'season',
                label: 'Season / Duration',
                className: 'font-bold bg-gray-50/30 w-1/4',
                render: (season: any) => season.name
              },
              ...durationRanges.map((range: any) => ({
                key: range.id,
                label: range.name,
                className: 'text-center',
                render: (season: any) => (
                  <div className="relative group">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="-"
                      value={seasonalPrices[season.id]?.[range.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value)
                        setSeasonalPrices({
                          ...seasonalPrices,
                          [season.id]: {
                            ...(seasonalPrices[season.id] || {}),
                            [range.id]: val
                          }
                        })
                      }}
                      className="block w-full text-center bg-transparent border-transparent hover:border-gray-200 focus:border-gray-800 focus:ring-0 rounded-lg text-sm transition-all py-1.5 px-2 font-medium"
                    />
                  </div>
                )
              }))
            ]}
            data={seasons.length > 0 ? seasons : [{ id: 'standard', name: 'Standard' }]}
            disablePagination
          />
          <p className="mt-3 text-[11px] text-gray-400 italic">
            Enter the daily price for each combination of season and rental duration. If empty, the base "Price per Day" will be used.
          </p>
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Template Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm text-gray-600">
              <div><strong>Brand:</strong> {selectedTemplate.car_brands?.name || '-'}</div>
              <div><strong>Model:</strong> {selectedTemplate.car_models?.name || '-'}</div>
              <div><strong>Body Type:</strong> {selectedTemplate.car_body_types?.name || selectedTemplate.body_type || '-'}</div>
              <div><strong>Class:</strong> {selectedTemplate.car_classes?.name || selectedTemplate.car_class || '-'}</div>
              <div><strong>Fuel Type:</strong> {selectedTemplate.car_fuel_types?.name || selectedTemplate.fuel_type || '-'}</div>
              <div><strong>Body Year:</strong> {selectedTemplate.body_production_start_year || '-'}</div>
              <div><strong>Seats:</strong> {selectedTemplate.car_seat_counts?.count || '-'}</div>
              <div><strong>Doors:</strong> {selectedTemplate.car_door_counts?.count || '-'}</div>
              <div><strong>Transmission:</strong> {selectedTemplate.car_transmission_types?.name || '-'}</div>
              <div><strong>Engine Volume:</strong> {selectedTemplate.car_engine_volumes?.volume ? `${selectedTemplate.car_engine_volumes.volume}L` : '-'}</div>
            </div>
          </div>
        )}

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-4">
            Car Photos
          </label>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className={`relative aspect-square group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${featuredImageIndex === index ? 'border-gray-800' : 'border-transparent'}`}
                onClick={() => setFeaturedImageIndex(index)}
              >
                <img
                  src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                  alt={`Car photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-car.jpg'
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removePhoto(index, 'car')
                    if (featuredImageIndex === index) setFeaturedImageIndex(0)
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-1 bg-black/5 flex justify-between items-center">
                  <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {index + 1}
                  </span>
                  {featuredImageIndex === index && (
                    <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded leading-none">
                      Cover
                    </span>
                  )}
                </div>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-200 transition-all group">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e, 'car')}
                className="hidden"
              />
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors">
                <PhotoIcon className="w-5 h-5" />
              </div>
              <span className="text-sm mt-3 font-medium text-gray-400 group-hover:text-gray-600">Add</span>
            </label>
          </div>
        </div>

        {/* Document Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-4">
            Document Photos
          </label>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {documentPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square group">
                <img
                  src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                  alt={`Document photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-document.jpg'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index, 'document')}
                  className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-200 transition-all group">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e, 'document')}
                className="hidden"
              />
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors">
                <DocumentIcon className="w-5 h-5" />
              </div>
              <span className="text-sm mt-3 font-medium text-gray-400 group-hover:text-gray-600">Add</span>
            </label>
          </div>
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
            onChange={(e) => {
              checkAndWarn(e.target.value)
              setDescription(e.target.value)
            }}
            placeholder="Optional description"
          />
        </div>

      </form>
    </div>
  )
}
