'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import DataTable, { Column, Tab } from '@/components/ui/DataTable'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button, Section } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { TaskForm } from '@/components/forms/TaskForm'
import ToastContainer from '@/components/ui/ToastContainer'
import IdBadge from '@/components/ui/IdBadge'
import StatusBadge from '@/components/ui/StatusBadge'

interface User {
  id: string
  name: string
  surname: string
  email: string
}

interface Task {
  id: number
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
  assigned_to_user?: User
  created_by_user?: User
}

export default function TasksTable() {
  const [activeTabId, setActiveTabId] = useState<string>('current')
  const [showForm, setShowForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([])

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.id)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      // Get company users (owner + managers only, no clients)
      const response = await fetch('/api/tasks/company-users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
      } else {
        console.error('Error fetching company users:', response.statusText)
        setUsers([])
      }
    } catch (error) {
      console.error('Error fetching company users:', error)
      setUsers([])
    }
  }

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }

  const handleCreate = () => {
    setEditingTask(null)
    setShowForm(true)
  }

  const handleIdClick = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`)
      if (response.ok) {
        const { data } = await response.json()
        setSelectedTask(data)
        setShowDetailsModal(true)
      } else {
        setSelectedTask(task)
        setShowDetailsModal(true)
      }
    } catch (error) {
      setSelectedTask(task)
      setShowDetailsModal(true)
    }
  }

  const handleEdit = (task: Task) => {
    setShowDetailsModal(false)
    setEditingTask(task)
    setShowForm(true)
  }

  const handleDelete = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete task')
      }

      addToast('Task deleted successfully', 'success')
      setShowDetailsModal(false)
      window.location.reload()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Error deleting task', 'error')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks'
      const method = editingTask ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        addToast(errorData.error || 'Failed to save task', 'error')
        return
      }

      const responseData = await response.json()
      const createdCount = responseData.created || 1
      addToast(
        editingTask
          ? 'Task updated successfully'
          : `Task${createdCount > 1 ? 's' : ''} created successfully (${createdCount} recipient${createdCount > 1 ? 's' : ''})`,
        'success'
      )
      setShowForm(false)
      setEditingTask(null)
      window.location.reload()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Error saving task', 'error')
    }
  }

  const fetchCurrentTasks = useCallback(async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

      const filters = params.filters || {}
      filters.status = ['pending', 'in_progress']
      if (params.filters && params.filters.q) {
        filters.q = params.filters.q
      }
      queryParams.set('filters', JSON.stringify(filters))

      const res = await fetch(`/api/tasks?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount || json.data.length }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      throw error
    }
  }, [])

  const fetchCompletedTasks = useCallback(async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

      const filters = params.filters || {}
      filters.status = 'completed'
      if (params.filters && params.filters.q) {
        filters.q = params.filters.q
      }
      queryParams.set('filters', JSON.stringify(filters))

      const res = await fetch(`/api/tasks?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount || json.data.length }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      throw error
    }
  }, [])

  const fetchAllTasks = useCallback(async (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => {
    try {
      // Get current user ID if not already loaded
      let userId = currentUserId
      if (!userId) {
        try {
          const userResponse = await fetch('/api/users/me')
          if (userResponse.ok) {
            const userData = await userResponse.json()
            userId = userData.id
            setCurrentUserId(userData.id)
          }
        } catch (error) {
          console.error('Failed to fetch current user:', error)
        }
      }

      const queryParams = new URLSearchParams()
      queryParams.set('page', params.page.toString())
      queryParams.set('pageSize', params.pageSize.toString())
      if (params.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)

      const filters = params.filters || {}
      if (userId) {
        filters.created_by = userId
      }
      if (params.filters && params.filters.q) {
        filters.q = params.filters.q
      }
      queryParams.set('filters', JSON.stringify(filters))

      const res = await fetch(`/api/tasks?${queryParams.toString()}`)
      const json = await res.json()

      if (json.data) {
        return { data: json.data, totalCount: json.totalCount || json.data.length }
      }
      return { data: [], totalCount: 0 }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      throw error
    }
  }, [currentUserId]) // Depend on currentUserId

  const columns: Column<Task>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (row: Task, index: number, page: number, pageSize: number) => {
        const displayId = ((page - 1) * pageSize + index + 1).toString().padStart(3, '0')
        return (
          <button
            onClick={() => handleIdClick(row)}
            className="cursor-pointer"
          >
            <IdBadge>
              #{displayId}
            </IdBadge>
          </button>
        )
      }
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row: Task) => new Date(row.due_date || row.created_at).toLocaleDateString()
    },
    {
      key: 'time',
      label: 'Time',
      render: (row: Task) => new Date(row.due_date || row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      key: 'author',
      label: 'Author',
      render: (row: Task) => row.created_by_user
        ? `${row.created_by_user.name} ${row.created_by_user.surname}`
        : 'Unknown'
    },
    {
      key: 'assignee',
      label: 'Assignee',
      render: (row: Task) => row.assigned_to_user
        ? `${row.assigned_to_user.name} ${row.assigned_to_user.surname}`
        : 'Unassigned'
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      render: (row: Task) => row.title || '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: Task) => {
        const variants: Record<string, 'warning' | 'info' | 'neutral' | 'error'> = {
          pending: 'warning',
          in_progress: 'info',
          completed: 'neutral',
          cancelled: 'error'
        }
        const labels: Record<string, string> = {
          pending: 'pending',
          in_progress: 'in progress',
          completed: 'completed',
          cancelled: 'cancelled'
        }
        return (
          <StatusBadge variant={variants[row.status] || 'neutral'}>
            {labels[row.status] || row.status}
          </StatusBadge>
        )
      }
    },
  ]

  const tabs: Tab<Task>[] = useMemo(() => [
    {
      id: 'current',
      label: 'Current',
      columns: columns,
      fetchData: fetchCurrentTasks
    },
    {
      id: 'completed',
      label: 'Completed',
      columns: columns,
      fetchData: fetchCompletedTasks
    },
    {
      id: 'created',
      label: 'Created',
      columns: columns,
      fetchData: fetchAllTasks
    }
  ], [fetchCurrentTasks, fetchCompletedTasks, fetchAllTasks])

  return (
    <>
      <Section
        title="Tasks"
        headerAction={
          <Button variant="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={handleCreate}>
            Create
          </Button>
        }
      >
        <DataTable
          tabs={tabs}
          defaultTabId="current"
          onTabChange={setActiveTabId}
        />
      </Section>

      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts(prev => prev.filter(toast => toast.id !== id))}
      />

      {showForm && (
        <TaskForm
          task={editingTask}
          users={users}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingTask(null)
          }}
        />
      )}

      {showDetailsModal && selectedTask && (
        <Modal
          title={`Task: ${selectedTask.title}`}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedTask(null)
          }}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Title</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTask.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <StatusBadge variant={
                    selectedTask.status === 'pending' ? 'warning' :
                      selectedTask.status === 'in_progress' ? 'info' :
                        selectedTask.status === 'completed' ? 'neutral' :
                          'error'
                  }>
                    {selectedTask.status === 'pending' ? 'pending' :
                      selectedTask.status === 'in_progress' ? 'in progress' :
                        selectedTask.status === 'completed' ? 'completed' :
                          'cancelled'}
                  </StatusBadge>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedTask.created_by_user
                    ? `${selectedTask.created_by_user.name} ${selectedTask.created_by_user.surname} (${selectedTask.created_by_user.email})`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Assigned To</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedTask.assigned_to_user
                    ? `${selectedTask.assigned_to_user.name} ${selectedTask.assigned_to_user.surname} (${selectedTask.assigned_to_user.email})`
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Due Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedTask.due_date
                    ? new Date(selectedTask.due_date).toLocaleString()
                    : 'No due date'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedTask.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            {selectedTask.description && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => handleEdit(selectedTask)}
                variant="primary"
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                type="button"
                onClick={() => handleDelete(selectedTask)}
                variant="delete"
                icon={<TrashIcon className="w-4 h-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
