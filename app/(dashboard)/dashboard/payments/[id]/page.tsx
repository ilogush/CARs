
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Loader from '@/components/ui/Loader'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'

interface Payment {
  id: number
  amount: number
  payment_method: string
  notes: string | null
  created_at: string
  updated_at: string
  contract: {
    id: number
    status: string
    start_date: string
    end_date: string
    total_amount: number
    car: {
      id: number
      license_plate: string
      brand: string | null
      model: string | null
    } | null
    client: {
      id: string
      name: string | null
      surname: string | null
      email: string
    } | null
  } | null
  status: {
    id: number
    name: string
    value: number
    color: string | null
  } | null
  created_by: {
    id: string
    name: string | null
    surname: string | null
    email: string
  } | null
}

export default function PaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/payments/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPayment(data)
        } else {
          const errorData = await res.json()
          setError(errorData.error || 'Payment not found')
        }
      } catch (err) {
        console.error('Error fetching payment:', err)
        setError('Failed to load payment details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPayment()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg leading-6 font-medium text-gray-900">Payment not found</h2>
        <p className="mt-2 text-gray-600">{error || `The payment with ID ${id} does not exist.`}</p>
        <Link href="/dashboard/payments" className="mt-4 inline-flex items-center text-gray-800 hover:text-gray-500">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Payments
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/payments"
            className="p-2 rounded-full hover:bg-gray-300 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
            <p className="text-sm text-gray-500">
              Payment <IdBadge>{payment.id.toString().padStart(4, '0')}</IdBadge>
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-b border-gray-200 pb-6">
        <div className="mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Transaction details and status.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Payment ID</label>
            <div className="text-sm text-gray-900 font-mono">
              <IdBadge>{payment.id.toString().padStart(4, '0')}</IdBadge>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
            <p className="text-sm text-gray-900 font-bold text-lg">฿{payment.amount.toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            {payment.status ? (
              <StatusBadge
                variant={payment.status.value > 0 ? 'success' : payment.status.value < 0 ? 'error' : 'neutral'}
              >
                {payment.status.name}
              </StatusBadge>
            ) : (
              <p className="text-sm text-gray-900">N/A</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
            <p className="text-sm text-gray-900">{payment.payment_method || 'Not specified'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
            <p className="text-sm text-gray-900">{new Date(payment.created_at).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
            <p className="text-sm text-gray-900">{new Date(payment.updated_at).toLocaleString()}</p>
          </div>
          {payment.notes && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contract Information */}
      {payment.contract && (
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Contract Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Related contract details.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Contract ID</label>
              <Link
                href={`/dashboard/contracts/${payment.contract.id}`}
                className="text-sm text-gray-900 font-medium hover:text-gray-500"
              >
                <IdBadge>{payment.contract.id.toString().padStart(4, '0')}</IdBadge>
              </Link>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <StatusBadge
                variant={payment.contract.status === 'active' ? 'success' : payment.contract.status === 'completed' ? 'info' : 'neutral'}
              >
                {payment.contract.status.toUpperCase()}
              </StatusBadge>
            </div>
            {payment.contract.car && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Car</label>
                <p className="text-sm text-gray-900">
                  {payment.contract.car.brand && payment.contract.car.model
                    ? `${payment.contract.car.brand} ${payment.contract.car.model}`
                    : 'N/A'}
                  {payment.contract.car.license_plate && (
                    <span className="ml-2 text-gray-500">({payment.contract.car.license_plate})</span>
                  )}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Total Amount</label>
              <p className="text-sm text-gray-900 font-semibold">฿{payment.contract.total_amount.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
              <p className="text-sm text-gray-900">{new Date(payment.contract.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">End Date</label>
              <p className="text-sm text-gray-900">{new Date(payment.contract.end_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Client Information */}
      {payment.contract?.client && (
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Client Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Client details for this payment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              <Link
                href={`/dashboard/clients/${payment.contract.client.id}`}
                className="text-sm text-gray-900 font-medium hover:text-gray-500"
              >
                {`${payment.contract.client.name || ''} ${payment.contract.client.surname || ''}`.trim() || payment.contract.client.email}
              </Link>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-sm text-gray-900">{payment.contract.client.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Created By Information */}
      {payment.created_by && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Created By</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">User who created this payment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              <p className="text-sm text-gray-900">
                {`${payment.created_by.name || ''} ${payment.created_by.surname || ''}`.trim() || payment.created_by.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-sm text-gray-900">{payment.created_by.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
