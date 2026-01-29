'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import { BackButton, ActionPageHeader, PageContent } from '@/components/ui'
import { User } from '@/types/database.types'

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/users/${id}`)
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          console.error('User not found')
          router.push('/dashboard/users')
        }
      } catch (err) {
        console.error('Error fetching user:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchUser()
    }
  }, [id, router])

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title={user ? `Edit User: ${user.name} ${user.surname}` : 'Edit User'}
        leftActions={<BackButton href={user ? `/dashboard/users/${id}` : '/dashboard/users'} />}
      />

      <PageContent loading={loading}>
        {user && <ProfileForm user={user} canEditRole={true} />}
      </PageContent>
    </div>
  )
}
