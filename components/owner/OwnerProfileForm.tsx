'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OwnerProfile } from '@/types/database.types'
import { useToast } from '@/lib/toast'

interface OwnerProfileFormProps {
  initialProfile: OwnerProfile | null
}

export default function OwnerProfileForm({ initialProfile }: OwnerProfileFormProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const name = String(formData.get('name') ?? '').trim()
      const phone = String(formData.get('phone') ?? '').trim()
      const address = String(formData.get('address') ?? '').trim()

      if (!name) {
        toast.error('Введите имя')
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('User not authorized')
        return
      }

      const profileData = {
        user_id: user.id,
        name,
        phone: phone || null,
        address: address || null,
      }

      if (initialProfile) {
        const { error } = await supabase
          .from('owner_profiles')
          .update(profileData)
          .eq('id', initialProfile.id)

        if (error) {
          toast.error('Ошибка: ' + error.message)
        } else {
          toast.success('Профиль успешно обновлен')
        }
      } else {
        const { error } = await supabase
          .from('owner_profiles')
          .insert(profileData)

        if (error) {
          toast.error('Ошибка: ' + error.message)
        } else {
          toast.success('Профиль успешно создан')
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
            Имя
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={initialProfile?.name || ''}
            required
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-500">
            Телефон
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            defaultValue={initialProfile?.phone || ''}
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-500">
            Адрес
          </label>
          <textarea
            id="address"
            name="address"
            defaultValue={initialProfile?.address || ''}
            rows={3}
            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить профиль'}
          </button>
        </div>
      </form>
    </div>
  )
}
