import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Only admins can edit role
  const canEditRole = user.role === 'admin'

  return (
    <ProfileForm user={user} canEditRole={canEditRole} />
  )
}
