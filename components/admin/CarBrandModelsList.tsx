'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarBrandModel } from '@/types/database.types'
import { useToast } from '@/lib/toast'

interface CarBrandModelsListProps {
  locationId: number
  initialBrandModels: CarBrandModel[]
}

export default function CarBrandModelsList({ locationId, initialBrandModels }: CarBrandModelsListProps) {
  const toast = useToast()
  const [brandModels, setBrandModels] = useState(initialBrandModels)
  const [showAddForm, setShowAddForm] = useState(false)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brand.trim() || !model.trim()) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('car_brand_models')
      .insert({
        location_id: locationId,
        brand: brand.trim(),
        model: model.trim(),
      })
      .select()
      .single()

    if (error) {
      toast.error('Ошибка: ' + error.message)
    } else {
      toast.success('Марка и модель успешно добавлены')
      setBrandModels([...brandModels, data])
      setBrand('')
      setModel('')
      setShowAddForm(false)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Марки и модели</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {showAddForm ? 'Отмена' : '+ Добавить'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-4 space-y-2">
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Марка"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-lg"
              required
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Модель"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {brandModels.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет марок и моделей</p>
          ) : (
            brandModels.map((bm) => (
              <div
                key={bm.id}
                className="p-3 border border-gray-200 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900">{bm.brand} {bm.model}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

