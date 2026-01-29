'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { CarTemplateForm } from '@/components/forms/CarTemplateForm'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import IdBadge from '@/components/ui/IdBadge'

interface CarBrand {
  id: number
  name: string
}

interface CarModel {
  id: number
  name: string
  brand_id: number
}

interface Location {
  id: number
  name: string
}

interface CarTemplate {
  id: number
  brand_id: number
  model_id: number
  body_type: string
  car_class: string
  body_production_start_year: number
  fuel_type: string
  created_at: string
  updated_at: string
  car_brands: CarBrand
  car_models: CarModel
  car_fuel_types?: {
    id: number
    name: string
  }
}

export default function CarTemplatesPage() {
  const [brands, setBrands] = useState<CarBrand[]>([])
  const [models, setModels] = useState<CarModel[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CarTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<CarTemplate | null>(null)
  const toast = useToast()

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

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/car-models')
      if (!response.ok) throw new Error('Failed to fetch car models')

      const data = await response.json()
      setModels(data.data || [])
    } catch (error) {
      toast.error('Error loading car models')
      console.error('Error loading car models:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')

      const data = await response.json()
      setLocations(data.data || [])
    } catch (error) {
      toast.error('Error loading locations')
      console.error('Error loading locations:', error)
    }
  }

  useEffect(() => {
    fetchBrands()
    fetchModels()
    fetchLocations()
  }, [])


  const handleCreate = () => {
    setEditingTemplate(null)
    setShowForm(true)
  }

  const handleIdClick = (template: CarTemplate) => {
    setSelectedTemplate(template)
    setShowDetailsModal(true)
  }

  const handleEdit = (template: CarTemplate) => {
    setShowDetailsModal(false)
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleDelete = async (template: CarTemplate) => {
    try {
      const response = await fetch(`/api/car-templates/${template.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to delete car template')
      }

      toast.success('Car template deleted successfully')
      setShowDetailsModal(false)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting car template')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingTemplate
        ? `/api/car-templates/${editingTemplate.id}`
        : '/api/car-templates'

      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to save car template')
      }

      toast.success(
        editingTemplate ? 'Car template updated successfully' : 'Car template created successfully'
      )
      setShowForm(false)
      setEditingTemplate(null)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving car template')
    }
  }

  const fetchCarTemplates = async (params: {
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

      const response = await fetch(`/api/car-templates?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch car templates')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading car templates')
      return { data: [], totalCount: 0 }
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: CarTemplate) => {
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
      key: 'car_brands.name',
      label: 'Brand',
      sortable: true
    },
    {
      key: 'car_models.name',
      label: 'Model',
      sortable: true
    },
    {
      key: 'body_type',
      label: 'Body Type',
      sortable: true
    },
    {
      key: 'car_class',
      label: 'Class',
      sortable: true
    },
    {
      key: 'fuel_type',
      label: 'Fuel Type',
      sortable: true,
      render: (item: CarTemplate) => (
        <span>{item.car_fuel_types?.name || item.fuel_type}</span>
      )
    },
    {
      key: 'body_production_start_year',
      label: 'Year',
      sortable: true
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Car Templates"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Create
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchCarTemplates}
      />

      {showForm && (
        <CarTemplateForm
          template={editingTemplate}
          brands={brands}
          models={models}
          locations={locations}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingTemplate(null)
          }}
        />
      )}

      {showDetailsModal && selectedTemplate && (
        <Modal
          title={`Car Template: ${selectedTemplate.car_brands?.name} ${selectedTemplate.car_models?.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedTemplate(null)
          }}
          maxWidth="lg"
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleEdit(selectedTemplate)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleDelete(selectedTemplate)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Brand</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_brands?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Model</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_models?.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Body Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.body_type || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Class</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_class || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Fuel Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.car_fuel_types?.name || selectedTemplate.fuel_type || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Year</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTemplate.body_production_start_year || '-'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
