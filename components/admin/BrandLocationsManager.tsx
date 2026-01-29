'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import { CheckIcon } from '@heroicons/react/24/outline'
import { logAction } from '@/lib/audit'

interface Location {
  id: number
  name: string
}

interface BrandLocationsManagerProps {
  brandModelId: number
}

export default function BrandLocationsManager({ brandModelId }: BrandLocationsManagerProps) {
  const toast = useToast()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // 1. Fetch all locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, name')
          .order('name')

        if (locationsError) throw locationsError

        setLocations(locationsData || [])

        // 2. Fetch existing relations for this brand model
        const { data: relationsData, error: relationsError } = await supabase
          .from('brand_locations')
          .select('location_id')
          .eq('brand_model_id', brandModelId)

        if (relationsError) throw relationsError

        const existingIds = new Set(relationsData?.map(r => r.location_id) || [])
        setSelectedLocationIds(existingIds)

      } catch (error: any) {
        console.error('Error fetching brand locations:', error)
        toast.error('Failed to load locations data')
      } finally {
        setLoading(false)
      }
    }

    if (brandModelId) {
      fetchData()
    }
  }, [brandModelId, toast])

  const handleToggleLocation = async (locationId: number) => {
    const newSelectedIds = new Set(selectedLocationIds)
    const isSelected = newSelectedIds.has(locationId)
    
    // Optimistic update
    if (isSelected) {
      newSelectedIds.delete(locationId)
    } else {
      newSelectedIds.add(locationId)
    }
    setSelectedLocationIds(newSelectedIds)

    try {
      setSaving(true)
      const supabase = createClient()

      if (isSelected) {
        // Remove relationship (Hard Delete)
        const { error } = await supabase
          .from('brand_locations')
          .delete()
          .match({ brand_model_id: brandModelId, location_id: locationId })

        if (error) throw error
      } else {
        // Add relationship
        const { error } = await supabase
          .from('brand_locations')
          .insert({ brand_model_id: brandModelId, location_id: locationId })

        if (error) throw error
      }
    } catch (error: any) {
      console.error('Error updating brand location:', error)
      toast.error('Failed to update location availability')
      // Revert optimistic update
      if (isSelected) {
        newSelectedIds.add(locationId)
      } else {
        newSelectedIds.delete(locationId)
      }
      setSelectedLocationIds(new Set(newSelectedIds))
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAll = async () => {
    if (locations.length === 0) return

    const allIds = locations.map(l => l.id)
    const allSelected = allIds.every(id => selectedLocationIds.has(id))

    try {
      setSaving(true)
      const supabase = createClient()

      if (allSelected) {
        // Deselect all (Soft Delete)
        const { error } = await supabase
          .from('brand_locations')
          .update({ deleted_at: new Date().toISOString() })
          .eq('brand_model_id', brandModelId)

        if (error) throw error
        setSelectedLocationIds(new Set())
      } else {
        // Select all (add missing ones)
        const missingIds = allIds.filter(id => !selectedLocationIds.has(id))
        if (missingIds.length > 0) {
          const records = missingIds.map(location_id => ({
            brand_model_id: brandModelId,
            location_id
          }))
          
          const { error } = await supabase
            .from('brand_locations')
            .insert(records)

          if (error) throw error
        }
        setSelectedLocationIds(new Set(allIds))
      }
      toast.success(allSelected ? 'All locations removed' : 'All locations added')
    } catch (error: any) {
      console.error('Error bulk updating brand locations:', error)
      toast.error('Failed to update locations')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Available Locations</h3>
        <button
          onClick={handleSelectAll}
          disabled={saving || locations.length === 0}
          className="text-sm text-gray-800 hover:text-gray-500 font-medium disabled:opacity-50"
        >
          {locations.every(l => selectedLocationIds.has(l.id)) ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {locations.length === 0 ? (
        <p className="text-gray-500 text-sm">No locations found. Add locations first.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {locations.map((location) => {
            const isSelected = selectedLocationIds.has(location.id)
            return (
              <label
                key={location.id}
                className={`
                  relative flex items-center p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected 
                    ? 'bg-gray-50 border-gray-200 ring-1 ring-gray-500' 
                    : 'bg-white border-gray-200 hover:border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <div className="min-w-0 flex-1 text-sm">
                  <div className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-900'}`}>
                    {location.name}
                  </div>
                </div>
                <div className="ml-3 flex h-5 items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-200 text-gray-800 focus:ring-gray-500"
                    checked={isSelected}
                    onChange={() => handleToggleLocation(location.id)}
                    disabled={saving}
                  />
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
