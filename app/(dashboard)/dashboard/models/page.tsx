'use client'

import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { CarModelForm } from '@/components/forms/CarModelForm'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import IdBadge from '@/components/ui/IdBadge'

interface CarModel {
  id: number
  name: string
  brand_id: number
  created_at: string
  updated_at: string
  car_brands: {
    id: number
    name: string
  }
}

interface CarBrand {
  id: number
  name: string
}

export default function CarModelsPage() {
  const [brands, setBrands] = useState<CarBrand[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null)
  const [editingModel, setEditingModel] = useState<CarModel | null>(null)
  const toast = useToast()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => setRefreshKey(prev => prev + 1)

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/car-brands')
      if (!response.ok) throw new Error('Failed to fetch car brands')

      const data = await response.json()
      setBrands(data.data || [])
    } catch (error) {
      toast.error('Error loading car brands')
      console.error('Error loading car brands:', error)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])


  const handleCreate = () => {
    setEditingModel(null)
    setShowForm(true)
  }

  const handleIdClick = (model: CarModel) => {
    setSelectedModel(model)
    setShowDetailsModal(true)
  }

  const handleEdit = (model: CarModel) => {
    setShowDetailsModal(false)
    setEditingModel(model)
    setShowForm(true)
  }

  const handleDelete = async (model: CarModel) => {
    try {
      const response = await fetch(`/api/car-models/${model.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete car model')
      }

      toast.success(`Car model "${model.name}" deleted successfully`)
      setShowDetailsModal(false)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting car model')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingModel
        ? `/api/car-models/${editingModel.id}`
        : '/api/car-models'

      const method = editingModel ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Если это дубликат или похожая модель, показываем детальное сообщение
        if (errorData.duplicate) {
          if (errorData.similarNames && errorData.similarNames.length > 0) {
            toast.error(`Model "${formData.name}" is similar to existing: ${errorData.similarNames.join(', ')}. Please use a different name.`)
          } else if (errorData.existingName) {
            toast.error(`Model "${formData.name}" already exists for this brand. Please use a different name.`)
          } else {
            toast.error(errorData.error || 'This model name already exists or is too similar to an existing model')
          }
        } else {
          toast.error(errorData.error || 'Failed to save car model')
        }
        return
      }

      toast.success(
        editingModel ? 'Car model updated successfully' : 'Car model created successfully'
      )
      setShowForm(false)
      setEditingModel(null)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving car model')
    }
  }

  const fetchCarModels = async (params: {
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

      const response = await fetch(`/api/car-models?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch car models')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading car models')
      return { data: [], totalCount: 0 }
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: CarModel) => {
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
      label: 'Model Name',
      sortable: true
    },
    {
      key: 'car_brands.name',
      label: 'Brand',
      sortable: true
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Car Models"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Add
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchCarModels}
        refreshKey={refreshKey}
      />

      {showForm && (
        <CarModelForm
          model={editingModel}
          brands={brands}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingModel(null)
          }}
        />
      )}

      {showDetailsModal && selectedModel && (
        <Modal
          title={`Car Model: ${selectedModel.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedModel(null)
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Brand</label>
                <p className="mt-1 text-sm text-gray-900">{selectedModel.car_brands?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedModel.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
