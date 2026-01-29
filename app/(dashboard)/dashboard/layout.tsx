import { getCurrentUser, getUserScope } from '@/lib/auth'
import AdminDashboardLayout from '@/components/layouts/AdminDashboardLayout'
import { AdminModeProvider } from '@/components/admin/AdminModeProvider'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Loader from '@/components/ui/Loader'

// Force dynamic rendering for all dashboard routes (they require authentication via cookies)
export const dynamic = 'force-dynamic'

async function DashboardContent({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await getCurrentUser()
  } catch (error: any) {
    console.error('Error getting current user:', error)
    // Если ошибка связана с конфигурацией Supabase, показываем ошибку
    if (error?.message?.includes('Missing Supabase')) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Configuration Error</h2>
            <p className="text-gray-500 mb-4">
              Server configuration error: Missing Supabase credentials.
              Please check your deployment environment variables.
            </p>
            <p className="text-sm text-gray-500">
              Required variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
            </p>
          </div>
        </div>
      )
    }
    // Для других ошибок редиректим на логин
    redirect('/auth/login')
  }

  if (!user) {
    redirect('/auth/login')
  }

  // Клиенты должны использовать отдельный маршрут /client, а не /dashboard
  if (user.role === 'client') {
    redirect('/client')
  }

  let scope
  try {
    scope = await getUserScope(user)
  } catch (error: any) {
    console.error('Error getting user scope:', error)
    redirect('/auth/login')
  }

  // Ролевая навигация (только для admin, owner, manager)
  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/dashboard/companies', label: 'Companies' },
          { href: '/dashboard/cars', label: 'Cars' },
          { href: '/dashboard/colors', label: 'Colors' },
          { href: '/dashboard/seasons', label: 'Seasons' },
          { href: '/dashboard/durations', label: 'Durations' },
          { href: '/dashboard/payments', label: 'Payments' },
          { href: '/dashboard/locations', label: 'Locations' },
          { href: '/dashboard/users', label: 'Users' },
          { href: '/dashboard/reports', label: 'Reports' },
          { href: '/dashboard/hotels', label: 'Hotels' },
          { href: '/dashboard/admin/audit-logs', label: 'Audit Logs' },
        ]
      case 'owner':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/dashboard/contracts', label: 'Contracts' },
          { href: '/dashboard/locations', label: 'Locations' },
          { href: '/dashboard/cars', label: 'My Cars' },
          { href: '/dashboard/users', label: 'Users' },
          { href: '/dashboard/calendar', label: 'Calendar' },
          { href: '/dashboard/chat', label: 'Chat' },
          { href: '/dashboard/payments', label: 'Payments' },
          { href: '/dashboard/reports', label: 'Reports' },
          { href: '/dashboard/logs', label: 'Logs' },
          { href: '/dashboard/settings', label: 'Settings' },
        ]
      case 'manager':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/dashboard/bookings', label: 'Bookings' },
          { href: '/dashboard/contracts', label: 'Contracts' },
          { href: '/dashboard/clients', label: 'Clients' },
          { href: '/dashboard/calendar', label: 'Calendar' },
          { href: '/dashboard/payments', label: 'Payments' },
          { href: '/dashboard/reports', label: 'Reports' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <AdminModeProvider>
      <AdminDashboardLayout
        user={user}
        title="CARs"
        navItems={navItems}
        role={user.role}
        scope={scope}
      >
        {children}
      </AdminDashboardLayout>
    </AdminModeProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader /></div>}>
      <DashboardContent>
        {children}
      </DashboardContent>
    </Suspense>
  )
}
