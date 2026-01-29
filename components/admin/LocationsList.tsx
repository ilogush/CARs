'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Location } from '@/types/database.types'
import Link from 'next/link'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import { TrashIcon } from '@heroicons/react/24/outline'
import { DeleteButton } from '@/components/ui/Button'

interface LocationsListProps {
  initialLocations: Location[]
}

export default function LocationsList({ initialLocations }: LocationsListProps) {
  const toast = useToast()
  const [locations, setLocations] = useState(initialLocations)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocationName.trim()) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('locations')
      .insert({ name: newLocationName.trim() })
      .select()
      .single()

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Location added successfully')
      setLocations([...locations, data])
      setNewLocationName('')
      setShowAddForm(false)
    }
    setLoading(false)
  }

  const handleDelete = async (locationId: number, locationName: string) => {
    setDeletingId(locationId)

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete location')
      }

      setLocations(prev => prev.filter(loc => loc.id !== locationId))
      toast.success('Location deleted successfully')
    } catch (error) {
      console.error('Error deleting location:', error)
      toast.error(`Error deleting location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Locations</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Location'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Location name"
                className="flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-lg"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {locations.length === 0 ? (
            <p className="text-gray-500 text-sm">No locations</p>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Link
                  href={`/admin/locations/${location.id}`}
                  className="flex-1"
                >
                  <h4 className="text-lg font-medium text-gray-900">{location.name}</h4>
                </Link>
                <DeleteButton
                  onClick={() => handleDelete(location.id, location.name)}
                  disabled={deletingId === location.id}
                  title="Delete location"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

