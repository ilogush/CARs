'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DataTable from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Button, DeleteButton } from '@/components/ui/Button'
import { ColorForm } from '@/components/forms/ColorForm'
import { useToast } from '@/lib/toast'
import Modal from '@/components/ui/Modal'
import IdBadge from '@/components/ui/IdBadge'

interface Color {
  id: number
  name: string
  hex_code: string
  created_at: string
  updated_at: string
}

export default function ColorsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedColor, setSelectedColor] = useState<Color | null>(null)
  const [editingColor, setEditingColor] = useState<Color | null>(null)
  const toast = useToast()

  const handleCreate = () => {
    setEditingColor(null)
    setShowForm(true)
  }

  const handleIdClick = (color: Color) => {
    setSelectedColor(color)
    setShowDetailsModal(true)
  }

  const handleEdit = (color: Color) => {
    setShowDetailsModal(false)
    setEditingColor(color)
    setShowForm(true)
  }

  const handleDelete = async (color: Color) => {
    try {
      const response = await fetch(`/api/colors/${color.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to delete color')
      }

      toast.success(`Color "${color.name}" deleted successfully`)
      setShowDetailsModal(false)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting color')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingColor
        ? `/api/colors/${editingColor.id}`
        : '/api/colors'

      const method = editingColor ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to save color'
        toast.error(errorMessage)
        return
      }

      toast.success(
        editingColor ? `Color "${formData.name}" updated successfully` : `Color "${formData.name}" created successfully`
      )
      setShowForm(false)
      setEditingColor(null)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving color')
    }
  }

  const fetchColors = useCallback(async (params: {
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

      const response = await fetch(`/api/colors?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch colors')

      const data = await response.json()
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      }
    } catch (error) {
      toast.error('Error loading colors')
      return { data: [], totalCount: 0 }
    }
  }, [])

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (item: Color) => {
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
      key: 'hex_code',
      label: 'Color',
      render: (item: Color) => (
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 rounded-full border border-gray-200"
            style={{ backgroundColor: item.hex_code || '#ccc' }}
          />
          <span>{item.hex_code}</span>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colors List"
        rightActions={
          <Button variant="primary" onClick={handleCreate} icon={<PlusIcon className="w-4 h-4" />}>
            Create
          </Button>
        }
      />
      <DataTable
        columns={columns}
        fetchData={fetchColors}
      />

      {showForm && (
        <ColorForm
          color={editingColor}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingColor(null)
          }}
        />
      )}

      {showDetailsModal && selectedColor && (
        <Modal
          title={`Color: ${selectedColor.name}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedColor(null)
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedColor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Hex Code</label>
                <div className="mt-1 flex items-center space-x-2">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: selectedColor.hex_code || '#ccc' }}
                  />
                  <p className="text-sm text-gray-900 font-mono">{selectedColor.hex_code || '-'}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-sm text-gray-900">{new Date(selectedColor.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => handleEdit(selectedColor)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <DeleteButton
                onClick={() => handleDelete(selectedColor)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
