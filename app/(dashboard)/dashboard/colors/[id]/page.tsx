'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader, BackButton, ActionPageHeader, Button } from '@/components/ui'

export default function ColorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [color, setColor] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchColor = async () => {
      try {
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        setColor({
          id,
          name: 'Metallic Silver',
          code: '#C0C0C0',
          created_at: new Date().toISOString()
        })
      } catch (err) {
        setError('Failed to load color details')
      } finally {
        setLoading(false)
      }
    }
    fetchColor()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !color) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500">{error || 'Color not found'}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Color Details"
        leftActions={<BackButton href="/dashboard/colors" />}
        actionLabel="Edit Color"
        actionType="link"
        href={`/dashboard/colors/${id}/edit`}
      />

      <div className="">
        <div className="px-4 py-5 sm:px-0 mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Color Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Color Name</label>
            <div className="flex items-center space-x-2">
              <div
                className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: color.code }}
              ></div>
              <input
                type="text"
                value={color.name}
                readOnly
                className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Hex Code</label>
            <input
              type="text"
              value={color.code}
              readOnly
              className="block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm py-2.5 px-3 bg-white text-gray-900 font-mono focus:ring-0 focus:border-gray-300 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
