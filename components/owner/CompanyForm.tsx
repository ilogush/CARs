'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Company, Location } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'

interface CompanyFormProps {
  initialCompany: Company & { location?: Location } | null
  locations: Location[]
}

export default function CompanyForm({ initialCompany, locations }: CompanyFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const name = String(formData.get('name') ?? '').trim()
      const locationId = initialCompany
        ? initialCompany.location_id
        : Number(formData.get('location_id') ?? 0)

      if (!name) {
        toast.error('Enter company name')
        return
      }
      if (!locationId) {
        toast.error('Select location')
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('User not authorized')
        return
      }

      const companyData = {
        owner_id: user.id,
        name,
        location_id: locationId,
      }

      if (initialCompany) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', initialCompany.id)

        if (error) {
          toast.error('Error: ' + error.message)
        } else {
          toast.success('Company updated successfully')
          router.refresh()
        }
      } else {
        const { error } = await supabase
          .from('companies')
          .insert(companyData)

        if (error) {
          toast.error('Error: ' + error.message)
        } else {
          toast.success('Company created successfully')
          router.refresh()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-500">
            Company Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={initialCompany?.name || ''}
            required
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-500">
            Location
          </label>
          <select
            id="location"
            name="location_id"
            defaultValue={initialCompany?.location_id?.toString() || ''}
            required
            disabled={!!initialCompany}
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-200"
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {initialCompany && (
            <p className="mt-1 text-sm text-gray-500">Location cannot be changed after creation</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialCompany ? 'Update Company' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  )
}
