'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { DistrictForm } from '@/components/forms/DistrictForm'
import { useToast } from '@/lib/toast'
import Loader from '@/components/ui/Loader'
import Modal from '@/components/ui/Modal'
import IdBadge from '@/components/ui/IdBadge'

interface District {
  id: number
  name: string
  location_id: number
  created_at: string
  updated_at: string
  locations: {
    id: number
    name: string
  }
}

interface Location {
  id: number
  name: string
}

export default function DistrictsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null)
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null)
  const toast = useToast()
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')

      const data = await response.json()
      setLocations(data.data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])


  const handleCreate = () => {
    setEditingDistrict(null)
    setShowForm(true)
  }

  const handleIdClick = (district: District) => {
    setSelectedDistrict(district)
    setShowDetailsModal(true)
  }

  const handleEdit = (district: District) => {
    setShowDetailsModal(false)
    setEditingDistrict(district)
    setShowForm(true)
  }

  const handleDelete = async (district: District) => {
    try {
      const response = await fetch(`/api/districts/${district.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to delete district')
      }

      toast.success(`District "${district.name}" deleted successfully`)
      setShowDetailsModal(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting district')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingDistrict
        ? `/api/districts/${editingDistrict.id}`
        : '/api/districts'

      const method = editingDistrict ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save district')
      }

      toast.success(
        editingDistrict ? 'District updated successfully' : 'District created successfully'
      )
      setShowForm(false)
      setEditingDistrict(null)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving district')
    }
  }

  const fetchDistricts = async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const searchParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString()
      })

      if (params.sortBy) {
        searchParams.set('sortBy', params.sortBy)
        searchParams.set('sortOrder', params.sortOrder || 'asc')
      }

      if (params.filters) {
        searchParams.set('filters', JSON.stringify(params.filters))
      }

      const response = await fetch(`/api/districts?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch districts')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading districts')
      return { data: [], totalCount: 0 }
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: District) => {
        const displayId = item.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleIdClick(item)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'locations.name',
      label: 'Location',
      sortable: true
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Districts"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Create
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchDistricts}
        refreshKey={refreshKey}
      />

      {showForm && (
        <DistrictForm
          district={editingDistrict}
          locations={locations}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingDistrict(null)
          }}
        />
      )}

      {showDetailsModal && selectedDistrict && (
        <Modal
          title={`District: ${selectedDistrict.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedDistrict(null)
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDistrict.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1 text-sm text-gray-900">{selectedDistrict.locations?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedDistrict.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => handleEdit(selectedDistrict)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton
                onClick={() => handleDelete(selectedDistrict)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
