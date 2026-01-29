'use client'
import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { carSchema, CarFormData } from '@/lib/validations/car'
import { createBrandModel, upsertCar } from '@/app/actions/car-actions'
import { useToast } from '@/lib/toast'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEnglishValidation } from '@/hooks/useEnglishValidation'
import { Button } from '@/components/ui/Button'

interface CarFormProps {
  initialData?: Partial<CarFormData> & { id?: number }
  brands: string[] // List of unique brands
  locations: { id: number; name: string }[]
  companies: { id: number; name: string }[]
  header?: { title: string; backHref: string }
  submitLabel?: string
  formId?: string
  enableAddBrand?: boolean
}

export default function CarForm({ initialData, brands, locations, companies, header, submitLabel, formId, enableAddBrand }: CarFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isBrandPending, startBrandTransition] = useTransition()
  const toast = useToast()
  const { handleInputChange, checkAndWarn } = useEnglishValidation()
  const resolvedFormId = formId || 'car-form'
  const brandOnlyModelValue = '__brand__'
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)
  const [brandsList, setBrandsList] = useState<string[]>(brands)
  const [brandDraft, setBrandDraft] = useState('')

  const defaultLocationIds = initialData?.location_ids || (locations.length > 0 ? [locations[0].id] : [])
  const defaultCompanyId = initialData?.company_id || (companies.length > 0 ? companies[0].id : 0)

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      brand: initialData?.brand || '',
      model: initialData?.model || '',
      year: initialData?.year || new Date().getFullYear(),
      doors: initialData?.doors || 4,
      seats: initialData?.seats || 4,
      body_type: initialData?.body_type || 'Sedan',
      engine_volume: initialData?.engine_volume || 2.0,
      color: initialData?.color || 'Black',
      price_per_day: initialData?.price_per_day || 0,
      transmission: initialData?.transmission || 'Automatic',
      status: initialData?.status || 'available',
      description: initialData?.description || '',
      company_id: defaultCompanyId,
      location_ids: defaultLocationIds,
      photos: initialData?.photos || [],
    },
  })

  const { register, handleSubmit, setValue, getValues, formState: { errors } } = form

  useEffect(() => {
    if (!initialData) {
      if (companies.length > 0) setValue('company_id', companies[0].id)
      if (locations.length > 0) setValue('location_ids', [locations[0].id])
    }
  }, [companies, locations, setValue, initialData])

  useEffect(() => {
    if (!isBrandModalOpen) return
    setBrandDraft((getValues('brand') as string) || '')
  }, [getValues, isBrandModalOpen])

  useEffect(() => {
    setBrandsList(brands)
  }, [brands])

  const onSubmit = (data: CarFormData) => {
    startTransition(async () => {
      try {
        await upsertCar(data, initialData?.id)
        toast.success(initialData?.id ? 'Car updated successfully' : 'Car created successfully')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to save car'
        toast.error(message)
      }
    })
  }

  const handleCreateBrand = () => {
    startBrandTransition(async () => {
      const brand = brandDraft.trim()
      if (!brand) {
        toast.error('Enter brand')
        return
      }

      const locationId = getValues('location_ids')?.[0]
      if (!locationId) {
        toast.error('Select location first')
        return
      }

      try {
        const created = await createBrandModel({ brand, model: brandOnlyModelValue, location_id: locationId })

        if (!brandsList.includes(created.brand)) {
          setBrandsList((prev) => [...prev, created.brand].sort((a, b) => a.localeCompare(b)))
        }

        setValue('brand', created.brand)
        setIsBrandModalOpen(false)
        toast.success('Brand added')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create brand'
        toast.error(message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {header && (
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center space-x-4">
            <Link
              href={header.backHref}
              className="p-2 hover:bg-gray-300 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
            </Link>
            <h3 className="text-lg font-medium text-gray-900">{header.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {enableAddBrand && (
              <Button
                variant="secondary"
                onClick={() => setIsBrandModalOpen(true)}
                icon={<PlusIcon className="w-4 h-4" />}
                className="whitespace-nowrap"
              >
                Add Brand
              </Button>
            )}
            <Button
              type="submit"
              form={resolvedFormId}
              loading={isPending}
            >
              {submitLabel || (initialData?.id ? 'Save' : 'Create')}
            </Button>
          </div>
        </div>
      )}

      <form id={resolvedFormId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('company_id')} />
        <input type="hidden" {...register('location_ids.0')} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Brand</label>
            <input
              list="brands-list"
              onChange={(e) => {
                handleInputChange(e)
                setValue('brand', e.target.value)
              }}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
              placeholder="Select or type brand"
            />
            <datalist id="brands-list">
              {brandsList.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>}
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Model</label>
            <input
              type="text"
              onChange={(e) => {
                handleInputChange(e)
                setValue('model', e.target.value)
              }}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
              placeholder="e.g. Camry"
            />
            {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>}
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Year</label>
            <input
              type="number"
              {...register('year')}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
            />
            {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>}
          </div>

          {/* Doors */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Doors</label>
            <input
              type="number"
              {...register('doors')}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
            />
            {errors.doors && <p className="mt-1 text-sm text-red-600">{errors.doors.message}</p>}
          </div>

          {/* Seats */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Seats</label>
            <input
              type="number"
              {...register('seats')}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
            />
            {errors.seats && <p className="mt-1 text-sm text-red-600">{errors.seats.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Body type</label>
            <select
              {...register('body_type')}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            >
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Hatchback">Hatchback</option>
              <option value="Coupe">Coupe</option>
              <option value="Convertible">Convertible</option>
              <option value="Wagon">Wagon</option>
              <option value="Van">Van</option>
              <option value="Pickup">Pickup</option>
            </select>
            {errors.body_type && <p className="mt-1 text-sm text-red-600">{errors.body_type.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Engine volume (L)</label>
            <input
              type="number"
              step="0.1"
              {...register('engine_volume')}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
            />
            {errors.engine_volume && <p className="mt-1 text-sm text-red-600">{errors.engine_volume.message}</p>}
          </div>
        </div>
      </form>

      {enableAddBrand && isBrandModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xl" onClick={() => setIsBrandModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Add Brand</h3>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="p-2 hover:bg-gray-300 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Brand</label>
                    <input
                      type="text"
                      value={brandDraft}
                      onChange={(e) => {
                        checkAndWarn(e.target.value)
                        setBrandDraft(e.target.value)
                      }}
                      className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 placeholder:text-gray-500 focus:ring-0 focus:border-gray-500 transition-colors"
                      placeholder="e.g. Toyota"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    onClick={handleCreateBrand}
                    loading={isBrandPending}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
