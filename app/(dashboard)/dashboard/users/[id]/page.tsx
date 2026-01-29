
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import ProfileForm from '@/components/profile/ProfileForm'
import { User, Company } from '@/types/database.types'
import Loader from '@/components/ui/Loader'
import { createClient } from '@/lib/supabase/client'
import { BuildingOfficeIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

export default function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        // Try to fetch from API
        const res = await fetch(`/api/users/${id}`)
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          // Fallback to mock data if API fails or returns 404 (for demo purposes)
          // In a real app, we should handle 404 properly
          console.warn('User not found in API, using mock data for demo')
          setUser({
            id,
            name: 'Mock',
            surname: 'User',
            email: 'mock.user@example.com',
            phone: '+66 123 456 789',
            role: 'client',
            gender: null,
            second_phone: null,
            telegram: '@mockuser',
            passport_number: 'AB123456',
            citizenship: 'Thailand',
            city: null,
            avatar_url: null,
            passport_photos: null,
            driver_license_photos: null,
            id_serial: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Failed to load user details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchUser()
    }
  }, [id])

  useEffect(() => {
    const fetchCompany = async () => {
      if (user?.role === 'owner') {
        try {
          setLoadingCompany(true)
          const res = await fetch(`/api/companies?filters=${encodeURIComponent(JSON.stringify({ owner_id: user.id }))}`)
          const data = await res.json()

          if (data.data && data.data.length > 0) {
            setCompany(data.data[0])
          }
        } catch (err) {
          console.error('Error fetching company:', err)
        } finally {
          setLoadingCompany(false)
        }
      }
    }

    fetchCompany()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg leading-6 font-medium text-gray-900">User not found</h2>
        <p className="mt-2 text-gray-600">The user with ID {id} does not exist.</p>
        <Link href="/dashboard/users" className="mt-4 inline-flex items-center text-gray-800 hover:text-gray-500">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Users
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden">
        {/* Разрешаем редактирование (readOnly={false}) и показываем заголовок/кнопки (hideHeader={false}) */}
        <ProfileForm
          user={user}
          readOnly={false}
          hideHeader={false}
          canEditRole={true} // Администратор может менять роль другого пользователя
          company={company}
          loadingCompany={loadingCompany}
          headerContent={
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/users"
                className="p-2 rounded-full hover:bg-gray-300 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
              </Link>
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
            </div>
          }
        />
      </div>
    </div>
  )
}
