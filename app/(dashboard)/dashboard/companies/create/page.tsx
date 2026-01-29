'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { BackButton, ActionPageHeader } from '@/components/ui'

type Location = Database['public']['Tables']['locations']['Row']

export default function CreateCompanyPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    location_id: ''
  })

  useEffect(() => {
    async function fetchLocations() {
      const supabase = createClient()
      const { data } = await supabase.from('locations').select('*').order('name')
      if (data) setLocations(data)
    }
    fetchLocations()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.location_id) {
        toast.error('Please select a location')
        setLoading(false)
        return
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        location_id: parseInt(formData.location_id)
      }

      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create company')
      }

      toast.success('Company created successfully')
      router.push('/dashboard/companies')
    } catch (error: any) {
      console.error('Error creating company:', error)
      toast.error(error.message || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Create Company"
        leftActions={<BackButton href="/dashboard/companies" />}
        actionLabel="Add"
        actionType="submit"
        formId="create-company-form"
        loading={loading}
        disabled={loading}
      />

      <form id="create-company-form" onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-500 mb-1">Location <span className="text-red-500">*</span></label>
            <select
              id="location"
              required
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div className="lg:col-span-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-500 mb-1">Address</label>
            <textarea
              id="address"
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
