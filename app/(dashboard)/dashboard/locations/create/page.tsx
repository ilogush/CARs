'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'
import { Button, BackButton, ActionPageHeader } from '@/components/ui'

export default function CreateLocationPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('locations')
        .insert([{ name: formData.name }])

      if (error) throw error

      toast.success('Location created successfully')
      router.push('/dashboard/locations')
    } catch (error) {
      console.error('Error creating location:', error)
      toast.error('Failed to create location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Create Location"
        leftActions={<BackButton href="/dashboard/locations" />}
        actionLabel="Add"
        actionType="submit"
        formId="create-location-form"
        loading={loading}
        disabled={loading}
      />

      <form id="create-location-form" onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Location Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-1">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">Location Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              placeholder="e.g. Dubai"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
