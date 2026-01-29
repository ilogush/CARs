'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, TrashIcon, PlusIcon, XMarkIcon, WrenchIcon } from '@heroicons/react/24/outline'
import Loader from '@/components/ui/Loader'
import { DeleteButton } from '@/components/ui/Button'
import { useToast } from '@/lib/toast'
import { inputBaseStyles } from '@/lib/styles/input'
import { createClient } from '@/lib/supabase/client'
import MaintenanceModal from '@/components/cars/MaintenanceModal'

interface CompanyCar {
  id: number
  company_id: number
  template_id: number
  color_id: number | null
  mileage: number
  next_oil_change_mileage: number | null
  vin: string | null
  license_plate: string
  price_per_day: number
  photos: string[]
  document_photos: string[]
  description: string | null
  status: 'available' | 'maintenance' | 'rented'
  created_at: string
  updated_at: string
  car_templates?: {
    id: number
    car_brands?: { name: string }
    car_models?: { name: string }
    body_type?: string
    car_class?: string
    fuel_type?: string
    body_production_start_year: number
    car_body_types?: { id: number; name: string }
    car_classes?: { id: number; name: string }
    car_fuel_types?: { id: number; name: string }
    car_door_counts?: { id: number; count: number }
    car_seat_counts?: { id: number; count: number }
    car_transmission_types?: { id: number; name: string }
    car_engine_volumes?: { id: number; volume: number }
  }
  car_colors?: {
    id: number
    name: string
    hex_code: string | null
  }
  companies?: {
    name: string
  }
}

interface Color {
  id: number
  name: string
  hex_code: string | null
}

interface ReferenceData {
  bodyTypes: Array<{ id: number; name: string }>
  carClasses: Array<{ id: number; name: string }>
  fuelTypes: Array<{ id: number; name: string }>
  transmissionTypes: Array<{ id: number; name: string }>
  engineVolumes: Array<{ id: number; volume: number }>
}

export default function CarDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = use(params)
  const toast = useToast()
  const [car, setCar] = useState<CompanyCar | null>(null)
  const [colors, setColors] = useState<Color[]>([])
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    bodyTypes: [],
    carClasses: [],
    fuelTypes: [],
    transmissionTypes: [],
    engineVolumes: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Editable form state
  const [colorId, setColorId] = useState<number | ''>('')
  const [mileage, setMileage] = useState<string>('')
  const [nextOilChangeMileage, setNextOilChangeMileage] = useState<string>('')
  const [vin, setVin] = useState<string>('')
  const [licensePlate, setLicensePlate] = useState<string>('')
  const [pricePerDay, setPricePerDay] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<'available' | 'maintenance' | 'rented'>('available')
  const [carPhotos, setCarPhotos] = useState<string[]>([])
  const [documentPhotos, setDocumentPhotos] = useState<string[]>([])

  // Template fields state
  const [bodyTypeId, setBodyTypeId] = useState<number | ''>('')
  const [carClassId, setCarClassId] = useState<number | ''>('')
  const [fuelTypeId, setFuelTypeId] = useState<number | ''>('')
  const [transmissionTypeId, setTransmissionTypeId] = useState<number | ''>('')
  const [engineVolumeId, setEngineVolumeId] = useState<number | ''>('')

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)

  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }
    fetchUserRole()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        let url = `/api/company-cars/${id}`
        if (adminMode && companyId) {
          url += `?admin_mode=true&company_id=${companyId}`
        }

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setCar(data)
          // Set form state from car data
          setColorId(data.color_id || '')
          setMileage(data.mileage?.toString() || '0')
          setNextOilChangeMileage(data.next_oil_change_mileage?.toString() || '')
          setVin(data.vin || '')
          setLicensePlate(data.license_plate || '')
          setPricePerDay(data.price_per_day?.toString() || '0')
          setDescription(data.description || '')
          setStatus(data.status || 'available')
          setCarPhotos(Array.isArray(data.photos) ? data.photos : [])
          setDocumentPhotos(Array.isArray(data.document_photos) ? data.document_photos : [])

          // Fetch reference data for dropdowns using client-side Supabase
          const supabase = createClient()
          try {
            const [bodyTypes, carClasses, fuelTypes, transmissionTypes, engineVolumes] = await Promise.all([
              supabase.from('car_body_types').select('id, name').order('name'),
              supabase.from('car_classes').select('id, name').order('name'),
              supabase.from('car_fuel_types').select('id, name').order('name'),
              supabase.from('car_transmission_types').select('id, name').order('name'),
              supabase.from('car_engine_volumes').select('id, volume').order('volume')
            ])

            setReferenceData({
              bodyTypes: bodyTypes.data || [],
              carClasses: carClasses.data || [],
              fuelTypes: fuelTypes.data || [],
              transmissionTypes: transmissionTypes.data || [],
              engineVolumes: engineVolumes.data || []
            })

            // Set initial values from car template
            if (data.car_templates) {
              setBodyTypeId(data.car_templates.car_body_types?.id || '')
              setCarClassId(data.car_templates.car_classes?.id || '')
              setFuelTypeId(data.car_templates.car_fuel_types?.id || '')
              setTransmissionTypeId(data.car_templates.car_transmission_types?.id || '')
              setEngineVolumeId(data.car_templates.car_engine_volumes?.id || '')
            }
          } catch (refError) {
            console.error('Error fetching reference data:', refError)
          }
        } else {
          throw new Error('Car not found')
        }

        // Fetch colors
        const colorsRes = await fetch('/api/colors')
        if (colorsRes.ok) {
          const colorsData = await colorsRes.json()
          setColors(colorsData.data || colorsData || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load car details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, adminMode, companyId])

  const handleSave = async () => {
    if (!car || !car.car_templates) return

    if (!licensePlate.trim()) {
      toast.error('License plate is required')
      return
    }

    setSaving(true)
    try {
      // First, update the car template if any template fields changed
      const templateId = car.car_templates.id
      const templateUpdateData: any = {}

      const currentBodyTypeId = car.car_templates.car_body_types?.id
      const currentCarClassId = car.car_templates.car_classes?.id
      const currentFuelTypeId = car.car_templates.car_fuel_types?.id
      const currentTransmissionTypeId = car.car_templates.car_transmission_types?.id
      const currentEngineVolumeId = car.car_templates.car_engine_volumes?.id

      if (bodyTypeId && bodyTypeId !== currentBodyTypeId) {
        templateUpdateData.body_type_id = Number(bodyTypeId)
      }
      if (carClassId && carClassId !== currentCarClassId) {
        templateUpdateData.car_class_id = Number(carClassId)
      }
      if (fuelTypeId && fuelTypeId !== currentFuelTypeId) {
        templateUpdateData.fuel_type_id = Number(fuelTypeId)
      }
      if (transmissionTypeId && transmissionTypeId !== currentTransmissionTypeId) {
        templateUpdateData.transmission_type_id = Number(transmissionTypeId)
      }
      if (engineVolumeId && engineVolumeId !== currentEngineVolumeId) {
        templateUpdateData.engine_volume_id = Number(engineVolumeId)
      }

      // Update template if there are changes
      if (Object.keys(templateUpdateData).length > 0) {
        const templateUrl = `/api/car-templates/${templateId}`
        const templateRes = await fetch(templateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateUpdateData)
        })

        if (!templateRes.ok) {
          const err = await templateRes.json()
          throw new Error(err.error || 'Failed to update car template')
        }
      }

      // Update company car
      let url = `/api/company-cars/${id}`
      if (adminMode && companyId) {
        url += `?admin_mode=true&company_id=${companyId}`
      }

      const carData = {
        color_id: colorId ? Number(colorId) : null,
        mileage: parseInt(mileage) || 0,
        next_oil_change_mileage: nextOilChangeMileage ? parseInt(nextOilChangeMileage) : null,
        vin: vin.trim() || null,
        license_plate: licensePlate.trim(),
        price_per_day: parseFloat(pricePerDay) || 0,
        description: description.trim() || null,
        status: status,
        photos: carPhotos,
        document_photos: documentPhotos
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(carData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save car')
      }

      toast.success('Car updated successfully')
      // Reload car data
      const carRes = await fetch(url)
      if (carRes.ok) {
        const updatedCar = await carRes.json()
        setCar(updatedCar)
        setCarPhotos(Array.isArray(updatedCar.photos) ? updatedCar.photos : [])
        setDocumentPhotos(Array.isArray(updatedCar.document_photos) ? updatedCar.document_photos : [])

        // Update template field states
        if (updatedCar.car_templates) {
          setBodyTypeId(updatedCar.car_templates.car_body_types?.id || '')
          setCarClassId(updatedCar.car_templates.car_classes?.id || '')
          setFuelTypeId(updatedCar.car_templates.car_fuel_types?.id || '')
          setTransmissionTypeId(updatedCar.car_templates.car_transmission_types?.id || '')
          setEngineVolumeId(updatedCar.car_templates.car_engine_volumes?.id || '')
        }
      }
    } catch (error: any) {
      console.error('Error saving car:', error)
      toast.error(error.message || 'Failed to save car')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      let url = `/api/company-cars/${id}`
      if (adminMode && companyId) {
        url += `?admin_mode=true&company_id=${companyId}`
      }

      const res = await fetch(url, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete car')
      }

      toast.success('Car deleted successfully')
      const backHref = adminMode && companyId
        ? `/dashboard/cars?admin_mode=true&company_id=${companyId}`
        : '/dashboard/cars'
      router.push(backHref)
    } catch (error: any) {
      console.error('Error deleting car:', error)
      toast.error(error.message || 'Failed to delete car')
      setDeleting(false)
    }
  }

  const getBackHref = () => {
    if (adminMode && companyId) {
      return `/dashboard/cars?admin_mode=true&company_id=${companyId}`
    }
    return '/dashboard/cars'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Car not found</h2>
        <p className="mt-2 text-gray-600">The car with ID {id} does not exist.</p>
        <Link href={getBackHref()} className="mt-4 inline-flex items-center text-gray-800 hover:text-gray-500">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Cars
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={getBackHref()}
            className="p-2 rounded-full hover:bg-gray-300 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <h3 className="text-lg font-medium text-gray-900">Car Details</h3>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setShowMaintenanceModal(true)}
            className="px-4 py-2 bg-white text-gray-500 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Log Oil Change"
          >
            <WrenchIcon className="w-4 h-4" />
            Service
          </button>
          <DeleteButton
            onClick={handleDelete}
            disabled={deleting}
            title="Delete car"
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          {/* Template fields - read only */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Brand</label>
            <input
              type="text"
              value={car.car_templates?.car_brands?.name || '-'}
              readOnly
              className={`${inputBaseStyles} bg-gray-50`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Model</label>
            <input
              type="text"
              value={car.car_templates?.car_models?.name || '-'}
              readOnly
              className={`${inputBaseStyles} bg-gray-50`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Body Type</label>
            <select
              value={bodyTypeId}
              onChange={(e) => setBodyTypeId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
            >
              <option value="">Select body type</option>
              {referenceData.bodyTypes.map((bodyType) => (
                <option key={bodyType.id} value={bodyType.id}>
                  {bodyType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
            <select
              value={carClassId}
              onChange={(e) => setCarClassId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
            >
              <option value="">Select class</option>
              {referenceData.carClasses.map((carClass) => (
                <option key={carClass.id} value={carClass.id}>
                  {carClass.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Fuel Type</label>
            <select
              value={fuelTypeId}
              onChange={(e) => setFuelTypeId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
            >
              <option value="">Select fuel type</option>
              {referenceData.fuelTypes.map((fuelType) => (
                <option key={fuelType.id} value={fuelType.id}>
                  {fuelType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Body Year</label>
            <input
              type="text"
              value={car.car_templates?.body_production_start_year || '-'}
              readOnly
              className={`${inputBaseStyles} bg-gray-50`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Seats</label>
            <input
              type="text"
              value={car.car_templates?.car_seat_counts?.count || '-'}
              readOnly
              className={`${inputBaseStyles} bg-gray-50`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Doors</label>
            <input
              type="text"
              value={car.car_templates?.car_door_counts?.count || '-'}
              readOnly
              className={`${inputBaseStyles} bg-gray-50`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Transmission</label>
            <select
              value={transmissionTypeId}
              onChange={(e) => setTransmissionTypeId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
            >
              <option value="">Select transmission</option>
              {referenceData.transmissionTypes.map((transmissionType) => (
                <option key={transmissionType.id} value={transmissionType.id}>
                  {transmissionType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Engine Volume</label>
            <select
              value={engineVolumeId}
              onChange={(e) => setEngineVolumeId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
            >
              <option value="">Select engine volume</option>
              {referenceData.engineVolumes.map((engineVolume) => (
                <option key={engineVolume.id} value={engineVolume.id}>
                  {engineVolume.volume}L
                </option>
              ))}
            </select>
          </div>

          {/* Car fields - editable */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">License Plate *</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              required
              className={inputBaseStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Color</label>
            <select
              value={colorId}
              onChange={(e) => setColorId(e.target.value ? Number(e.target.value) : '')}
              className={inputBaseStyles}
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
            <label className="block text-sm font-medium text-gray-500 mb-1">Mileage</label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              min="0"
              className={inputBaseStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Next Oil Change Mileage</label>
            <input
              type="number"
              value={nextOilChangeMileage}
              onChange={(e) => setNextOilChangeMileage(e.target.value)}
              min="0"
              placeholder="e.g. 50000"
              className={`${inputBaseStyles} ${nextOilChangeMileage && mileage && (parseInt(nextOilChangeMileage) - parseInt(mileage) < 1000)
                ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500 bg-red-50 font-bold'
                : ''
                }`}
            />
            {nextOilChangeMileage && mileage && (parseInt(nextOilChangeMileage) - parseInt(mileage) < 1000) && (
              <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-bold animate-pulse">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Maintenance Due Soon! ({(parseInt(nextOilChangeMileage) - parseInt(mileage))} km left)
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">VIN Number</label>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              className={`${inputBaseStyles} font-mono`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Price per Day</label>
            <input
              type="number"
              value={pricePerDay}
              onChange={(e) => setPricePerDay(e.target.value)}
              min="0"
              step="0.01"
              className={inputBaseStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'available' | 'maintenance' | 'rented')}
              className={inputBaseStyles}
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 p-2">
          <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputBaseStyles}
          />
        </div>

        {/* Car Photos */}
        <div className="mt-6 p-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Car Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {carPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square group">
                <a
                  href={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                >
                  <img
                    src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    alt={`Car photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-gray-500 transition-colors"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex'
                      }
                    }}
                  />
                  <div className="hidden absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </a>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setCarPhotos(carPhotos.filter((_, i) => i !== index))
                  }}
                  className="absolute top-2 right-2 p-1 bg-gray-200 text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-300"
                  title="Remove photo"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
            {carPhotos.length < 6 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files) return
                    const remainingSlots = 6 - carPhotos.length
                    const filesToAdd = Array.from(files).slice(0, remainingSlots)
                    const fileNames: string[] = []
                    filesToAdd.forEach(file => {
                      // In production: upload to Supabase Storage and get URL
                      // For now: store file name
                      fileNames.push(file.name)
                    })
                    setCarPhotos([...carPhotos, ...fileNames])
                    e.target.value = ''
                  }}
                  multiple
                />
                <PlusIcon className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-sm text-gray-600">Add photo</span>
              </label>
            )}
          </div>
        </div>

        {/* Document Photos */}
        <div className="mt-6 p-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Document Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {documentPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square group">
                <a
                  href={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full"
                >
                  <img
                    src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    alt={`Document photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-gray-500 transition-colors"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex'
                      }
                    }}
                  />
                  <div className="hidden absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </a>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setDocumentPhotos(documentPhotos.filter((_, i) => i !== index))
                  }}
                  className="absolute top-2 right-2 p-1 bg-gray-200 text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-300"
                  title="Remove photo"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
            {documentPhotos.length < 6 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files) return
                    const remainingSlots = 6 - documentPhotos.length
                    const filesToAdd = Array.from(files).slice(0, remainingSlots)
                    const fileNames: string[] = []
                    filesToAdd.forEach(file => {
                      // In production: upload to Supabase Storage and get URL
                      // For now: store file name
                      fileNames.push(file.name)
                    })
                    setDocumentPhotos([...documentPhotos, ...fileNames])
                    e.target.value = ''
                  }}
                  multiple
                />
                <PlusIcon className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-sm text-gray-600">Add photo</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {showMaintenanceModal && car && (
        <MaintenanceModal
          carId={car.id}
          adminMode={adminMode}
          companyId={companyId}
          currentMileage={parseInt(mileage) || 0}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={() => {
            setShowMaintenanceModal(false)
            // Reload data
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
