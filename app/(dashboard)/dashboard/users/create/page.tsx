'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { BackButton, ActionPageHeader } from '@/components/ui'

export default function CreateUserPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    phone: '',
    second_phone: '',
    telegram: '',
    gender: 'male',
    citizenship: '',
    city: '',
    passport_number: '',
    role: 'client'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      router.push('/dashboard/users')
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Create User"
        leftActions={<BackButton href="/dashboard/users" />}
        actionLabel="Add"
        actionType="submit"
        formId="create-user-form"
        loading={loading}
        disabled={loading}
      />

      <form id="create-user-form" onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
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
            <label htmlFor="surname" className="block text-sm font-medium text-gray-500 mb-1">Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="surname"
              required
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-500 mb-1">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              id="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
          <div>
            <label htmlFor="second_phone" className="block text-sm font-medium text-gray-500 mb-1">Second Phone</label>
            <input
              type="tel"
              id="second_phone"
              value={formData.second_phone}
              onChange={(e) => setFormData({ ...formData, second_phone: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="telegram" className="block text-sm font-medium text-gray-500 mb-1">Telegram</label>
            <input
              type="text"
              id="telegram"
              value={formData.telegram}
              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              placeholder="@username"
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="citizenship" className="block text-sm font-medium text-gray-500 mb-1">Citizenship</label>
            <input
              type="text"
              id="citizenship"
              value={formData.citizenship}
              onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-500 mb-1">City</label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="passport_number" className="block text-sm font-medium text-gray-500 mb-1">Passport Number</label>
            <input
              type="text"
              id="passport_number"
              value={formData.passport_number}
              onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-500 mb-1">Role</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
            >
              <option value="client">Client</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  )
}
