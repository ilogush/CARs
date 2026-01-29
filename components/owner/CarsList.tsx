'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, CarBrandModel } from '@/types/database.types'
import { useToast } from '@/lib/toast'

interface CarsListProps {
  companyId: number
  locationId: number
  initialCars: (Car & { brand_model?: CarBrandModel })[]
  brandModels: CarBrandModel[]
}

export default function CarsList({ companyId, locationId, initialCars, brandModels }: CarsListProps) {
  const toast = useToast()
  const [cars, setCars] = useState(initialCars)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    brand_model_id: '',
    year: new Date().getFullYear(),
    color: '',
    price_per_day: '',
    seats: '5',
    transmission: 'automatic',
    description: '',
    status: 'available' as 'available' | 'maintenance' | 'rented',
  })
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.brand_model_id) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('car_items')
      .insert({
        company_id: companyId,
        brand_model_id: Number(formData.brand_model_id),
        year: formData.year,
        color: formData.color.trim(),
        price_per_day: Number(formData.price_per_day),
        seats: Number(formData.seats),
        transmission: formData.transmission,
        description: formData.description.trim() || null,
        status: formData.status,
        photos: [],
      })
      .select(`
        *,
        brand_model:car_brand_models(*)
      `)
      .single()

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Car added successfully')
      setCars([data, ...cars])
      setFormData({
        brand_model_id: '',
        year: new Date().getFullYear(),
        color: '',
        price_per_day: '',
        seats: '5',
        transmission: 'automatic',
        description: '',
        status: 'available',
      })
      setShowAddForm(false)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Cars</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Car'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Марка и модель</label>
              <select
                value={formData.brand_model_id}
                onChange={(e) => setFormData({ ...formData, brand_model_id: e.target.value })}
                required
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select brand and model</option>
                {brandModels.map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.brand} {bm.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  required
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Price per Day (₽)</label>
                <input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Number of Seats</label>
                <input
                  type="number"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                  required
                  min="2"
                  max="50"
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Transmission</label>
              <select
                value={formData.transmission}
                onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                required
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="available">available</option>
                <option value="maintenance">maintenance</option>
                <option value="rented">rented</option>
                <option value="booked">booked</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Car'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {cars.length === 0 ? (
            <p className="text-gray-500 text-sm">No cars</p>
          ) : (
            cars.map((car) => (
              <div key={car.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {car.brand_model?.brand} {car.brand_model?.model} {car.year}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {car.color} • {car.seats} seats • {car.transmission === 'automatic' ? 'automatic' : 'manual'} • {car.price_per_day} ₽/day
                    </p>
                    {car.description && (
                      <p className="text-sm text-gray-600 mt-2">{car.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${car.status === 'available' ? 'bg-green-100 text-green-800' :
                    car.status === 'rented' ? 'bg-yellow-100 text-yellow-800' :
                      car.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-200 text-gray-800'
                    }`}>
                    {car.status === 'available' ? 'available' :
                      car.status === 'rented' ? 'rented' :
                        car.status === 'booked' ? 'booked' :
                          'maintenance'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

