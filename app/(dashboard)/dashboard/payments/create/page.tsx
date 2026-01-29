'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useToast } from '@/lib/toast'
import Card from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'

import Loader from '@/components/ui/Loader'

interface Contract {
  id: number
  total_amount: number
  client?: {
    name: string
    surname: string
    email?: string
  }
  company_cars?: {
    car_templates?: {
      car_brands?: {
        name: string
      }
      car_models?: {
        name: string
      }
    }
  }
}

interface PaymentStatus {
  id: number
  name: string
  value: number
  is_active: boolean
}

export default function CreatePaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const contractIdParam = searchParams.get('contract_id')

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])

  // Form state
  const [contractId, setContractId] = useState<string>(contractIdParam || '')
  const [paymentStatusId, setPaymentStatusId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setInitialLoading(true)
      // Load contracts
      const contractsUrl = `/api/contracts?page=1&pageSize=1000${adminMode && companyId ? `&admin_mode=true&company_id=${companyId}` : ''}`
      const contractsRes = await fetch(contractsUrl)
      const contractsData = await contractsRes.json()
      if (contractsData.data) {
        setContracts(contractsData.data)
      }

      // Load payment statuses
      const statusesRes = await fetch('/api/payment-statuses?page=1&pageSize=1000')
      const statusesData = await statusesRes.json()
      if (statusesData.data) {
        setPaymentStatuses(statusesData.data.filter((s: PaymentStatus) => s.is_active))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load form data')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!contractId) {
      setError('Please select a contract')
      setLoading(false)
      return
    }

    if (!paymentStatusId) {
      setError('Please select a payment status')
      setLoading(false)
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      setLoading(false)
      return
    }

    if (!paymentMethod) {
      setError('Please select a payment method')
      setLoading(false)
      return
    }

    try {
      const url = `/api/payments${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: parseInt(contractId),
          payment_status_id: parseInt(paymentStatusId),
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          notes: notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment')
      }

      toast.success('Payment created successfully')
      const backUrl = `/dashboard/payments${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}&tab=payments` : '?tab=payments'}`
      router.push(backUrl)
    } catch (error: any) {
      setError(error.message || 'Error creating payment')
      toast.error(error.message || 'Error creating payment')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  const selectedContract = contracts.find(c => c.id.toString() === contractId)

  const backHref = `/dashboard/payments${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Payment"
        rightActions={
          <Link href={backHref}>
            <Button variant="secondary" icon={<ArrowLeftIcon className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Contract *
              </label>
              <select
                required
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select contract</option>
                {contracts.map((contract) => {
                  const clientName = contract.client
                    ? `${contract.client.name} ${contract.client.surname}`.trim()
                    : 'Unknown'
                  const carInfo = contract.company_cars?.car_templates
                    ? `${contract.company_cars.car_templates.car_brands?.name || ''} ${contract.company_cars.car_templates.car_models?.name || ''}`.trim()
                    : ''
                  return (
                    <option key={contract.id} value={contract.id}>
                      #{contract.id} - {clientName} {carInfo ? `(${carInfo})` : ''} - {contract.total_amount} ฿
                    </option>
                  )
                })}
              </select>
              {selectedContract && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>Total amount:</strong> {selectedContract.total_amount} ฿
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Payment Status *
              </label>
              <select
                required
                value={paymentStatusId}
                onChange={(e) => setPaymentStatusId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select status</option>
                {paymentStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name} ({status.value === 1 ? '+' : status.value === -1 ? '-' : '0'}{Math.abs(status.value)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Payment Method *
              </label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Link href={backHref}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
