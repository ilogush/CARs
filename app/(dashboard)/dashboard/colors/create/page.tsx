'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { BackButton, ActionPageHeader } from '@/components/ui'

export default function CreateColorPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '#000000'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Implement actual API call
      // const res = await fetch('/api/colors', { ... })

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Color created successfully')
      router.push('/dashboard/colors')
    } catch (error) {
      console.error('Error creating color:', error)
      toast.error('Failed to create color')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Create Color"
        leftActions={<BackButton href="/dashboard/colors" />}
        actionLabel="Add"
        actionType="submit"
        formId="create-color-form"
        loading={loading}
        disabled={loading}
      />

      <form id="create-color-form" onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Color Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">Color Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              placeholder="e.g. Metallic Silver"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-500 mb-1">Hex Code <span className="text-red-500">*</span></label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="code-picker"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer p-1"
              />
              <input
                type="text"
                id="code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 font-mono focus:ring-0 focus:border-gray-500 transition-colors"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
