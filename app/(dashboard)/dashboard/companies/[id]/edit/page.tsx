'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { Loader, BackButton, ActionPageHeader, Button } from '@/components/ui'
import { Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'

type Location = Database['public']['Tables']['locations']['Row']
type Company = Database['public']['Tables']['companies']['Row']

export default function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const toast = useToast()
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [locations, setLocations] = useState<Location[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    is_active: true,
    location_id: ''
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createClient()

        // Fetch locations
        const { data: locationsData } = await supabase.from('locations').select('*').order('name')
        if (locationsData) setLocations(locationsData)

        // Fetch company
        const res = await fetch(`/api/companies/${id}`)
        if (!res.ok) {
          throw new Error('Company not found')
        }
        const data = await res.json()
        setCompany(data)
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          is_active: data.is_active ?? true,
          location_id: data.location_id?.toString() || ''
        })
      } catch (error: any) {
        console.error('Error fetching data:', error)
        toast.error(error.message || 'Failed to load company data')
        router.push('/dashboard/companies')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        is_active: formData.is_active
      }

      const res = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update company')
      }

      toast.success('Company updated successfully')
      router.push(`/dashboard/companies/${id}`)
    } catch (error: any) {
      console.error('Error updating company:', error)
      toast.error(error.message || 'Failed to update company')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Edit Company"
        leftActions={<BackButton href={`/dashboard/companies/${id}`} />}
        actionLabel="Save"
        actionType="submit"
        formId="edit-company-form"
        loading={saving}
        disabled={saving}
      />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
      ) : !company ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-red-500">Company not found</p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      ) : (
        <form id="edit-company-form" onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:px-0 mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
            <div className="md:col-span-2">
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
              <label htmlFor="location" className="block text-sm font-medium text-gray-500 mb-1">Location</label>
              <select
                id="location"
                disabled
                value={formData.location_id}
                className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-gray-200 text-gray-500 cursor-not-allowed"
              >
                <option value="">Select Location</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Location cannot be changed after creation</p>
            </div>

            <div>
              <label htmlFor="is_active" className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${formData.is_active ? 'bg-gray-800' : 'bg-gray-200'
                    }`}
                  role="switch"
                  aria-checked={formData.is_active}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
                <span className="text-sm text-gray-500">{formData.is_active ? 'active' : 'inactive'}</span>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                id="email"
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
            <div className="md:col-span-2">
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
      )}
    </div>
  )
}
