'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import PaymentTypesSettings from '@/components/settings/PaymentTypesSettings'
import PaymentsTable from '@/components/payments/PaymentsTable'
import { createClient } from '@/lib/supabase/client'
import Loader from '@/components/ui/Loader'

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center px-4 py-12"><Loader /></div>}>
      <PaymentsContent />
    </Suspense>
  )
}

function PaymentsContent() {
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient()
        const { data: { user: userData } } = await supabase.auth.getUser()
        if (userData) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single()
          setUser(profile)
        }
      } catch (err) {
        console.error('Error fetching user:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager'
  const showActualPayments = isOwnerOrManager || adminMode

  return (
    <div className="space-y-6">
      <PageHeader
        title={showActualPayments ? "Payments History" : "Payment Types"}
        rightActions={
          !showActualPayments && (
            <Button
              variant="primary"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => { window.dispatchEvent(new CustomEvent('open-payment-type-form')) }}
            >
              Create Type
            </Button>
          )
        }
      />

      {showActualPayments ? (
        <PaymentsTable />
      ) : (
        <PaymentTypesSettings />
      )}
    </div>
  )
}
