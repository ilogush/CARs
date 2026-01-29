'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader, BackButton, ActionPageHeader, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import BrandLocationsManager from '@/components/admin/BrandLocationsManager'

export default function BrandDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [brand, setBrand] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Fetch brand details from DB
        const { data, error } = await supabase
          .from('car_brand_models')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        setBrand(data)
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError('Failed to load brand details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchBrand()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500">{error || 'Brand not found'}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Brand Details"
        leftActions={<BackButton href="/dashboard/brands" />}
        actionLabel="Save"
        actionType="link"
        href={`/dashboard/brands/${id}/edit`}
      />

      <div className="overflow-hidden">
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Brand Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Brand</label>
            <input
              type="text"
              value={brand.brand}
              readOnly
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Model</label>
            <input
              type="text"
              value={brand.model}
              readOnly
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
            />
          </div>
        </div>

        {/* Locations Manager */}
        <div className="border-t border-gray-200 pt-6 px-2">
          <BrandLocationsManager brandModelId={parseInt(id)} />
        </div>
      </div>
    </div>
  )
}
