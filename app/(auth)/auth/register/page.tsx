import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCachedLocations } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import RegisterTabs from '@/components/auth/RegisterTabs'

// Force dynamic rendering (requires cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const user = await getCurrentUser()
  
  if (user) {
    redirect('/')
  }

  // Получаем список локаций для выбора (нужно для владельца компании)
  // Используем кэшированную функцию для оптимизации
  const locations = await getCachedLocations()

  // Получаем список валют
  const supabase = await createClient()
  const { data: currencies } = await supabase
    .from('currencies')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose registration type
          </p>
        </div>
        <RegisterTabs locations={locations || []} currencies={currencies || []} />
        <div className="text-center">
          <a
            href="/auth/login"
            className="font-medium text-gray-800 hover:text-gray-500 text-sm"
          >
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  )
}

