'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { BrandForm } from '@/components/forms/BrandForm'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import IdBadge from '@/components/ui/IdBadge'

interface Brand {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export default function BrandsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const toast = useToast()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => setRefreshKey(prev => prev + 1)

  const handleCreate = () => {
    setEditingBrand(null)
    setShowForm(true)
  }

  const handleIdClick = (brand: Brand) => {
    setSelectedBrand(brand)
    setShowDetailsModal(true)
  }

  const handleEdit = (brand: Brand) => {
    setShowDetailsModal(false)
    setEditingBrand(brand)
    setShowForm(true)
  }

  const handleDelete = async (brand: Brand) => {
    try {
      const response = await fetch(`/api/car-brands/${brand.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to delete brand')
      }

      toast.success(`Brand "${brand.name}" deleted successfully`)
      setShowDetailsModal(false)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting brand')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingBrand
        ? `/api/car-brands/${editingBrand.id}`
        : '/api/car-brands'

      const method = editingBrand ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to save brand'
        toast.error(errorMessage)
        return
      }

      toast.success(
        editingBrand ? `Brand "${formData.name}" updated successfully` : `Brand "${formData.name}" created successfully`
      )
      setShowForm(false)
      setEditingBrand(null)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving brand')
    }
  }

  const fetchBrands = async (params: {
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

      const response = await fetch(`/api/car-brands?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch brands')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading brands')
      return { data: [], totalCount: 0 }
    }
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: Brand) => {
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
      label: 'Brand Name',
      sortable: true
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands List"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Add
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchBrands}
        refreshKey={refreshKey}
      />

      {showForm && (
        <BrandForm
          brand={editingBrand}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingBrand(null)
          }}
        />
      )}

      {showDetailsModal && selectedBrand && (
        <Modal
          title={`Brand: ${selectedBrand.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedBrand(null)
          }}
          actions={
            <>
              <Button
                type="button"
                onClick={() => handleEdit(selectedBrand)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton onClick={() => handleDelete(selectedBrand)} />
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedBrand.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(selectedBrand.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
