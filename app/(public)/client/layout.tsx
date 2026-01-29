import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import LogoutButton from '@/components/auth/LogoutButton'
import Link from 'next/link'

// Force dynamic rendering for client routes (they require authentication via cookies)
export const dynamic = 'force-dynamic'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('client')

  // Этот layout используется для /client - личный кабинет клиента
  // Он переопределяет родительский layout из (public)
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                  CARs
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-500 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Каталог
                </Link>
                <Link
                  href="/client"
                  className="border-transparent text-blue-600 border-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Личный кабинет
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">{user.email}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}


