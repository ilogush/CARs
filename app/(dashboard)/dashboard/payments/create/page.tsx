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
  company_car_id?: number
  client?: {
    name: string
    surname: string
    email?: string
  }
  company_cars?: {
    id: number
    license_plate: string
    car_templates?: {
      car_brands?: { name: string }
      car_models?: { name: string }
    }
  }
}

interface PaymentStatus {
  id: number
  name: string
  value: number
  is_active: boolean
}

interface PaymentType {
  id: number
  name: string
  sign: string
  is_active: boolean
}

interface CompanyCar {
  id: number
  license_plate: string
  car_templates?: {
    car_brands?: { name: string }
    car_models?: { name: string }
  }
}

interface Currency {
  id: number
  code: string
  name: string
  symbol: string
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

  // Data sources
  const [contracts, setContracts] = useState<Contract[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [companyCars, setCompanyCars] = useState<CompanyCar[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  // Form state
  const [autoId, setAutoId] = useState<string>('')
  const [contractId, setContractId] = useState<string>(contractIdParam || '')
  const [paymentStatusId, setPaymentStatusId] = useState<string>('')
  const [paymentTypeId, setPaymentTypeId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [currencyId, setCurrencyId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  // Auto-filter/select contract when Auto changes
  useEffect(() => {
    if (autoId) {
      // Try to find a contract for this car? 
      // Or just filter the contracts dropdown?
      // For now, let's just use it to potentially filter.
      // But if user manually selects contract, it overrides.
      const relatedContract = contracts.find(c => c.company_car_id === parseInt(autoId))
      if (relatedContract) {
        setContractId(relatedContract.id.toString())
      }
    }
  }, [autoId, contracts])

  async function loadData() {
    try {
      setInitialLoading(true)
      const commonParams = `page=1&pageSize=1000${adminMode && companyId ? `&admin_mode=true&company_id=${companyId}` : ''}`

      // Parallel fetching
      const [contractsRes, statusesRes, typesRes, carsRes, currenciesRes] = await Promise.all([
        fetch(`/api/contracts?${commonParams}`),
        fetch(`/api/payment-statuses?page=1&pageSize=1000`),
        fetch(`/api/payment-types?page=1&pageSize=1000`),
        fetch(`/api/company-cars?${commonParams}`),
        fetch(`/api/currencies?page=1&pageSize=1000`)
      ])

      const [contractsData, statusesData, typesData, carsData, currenciesData] = await Promise.all([
        contractsRes.json(),
        statusesRes.json(),
        typesRes.json(),
        carsRes.json(),
        currenciesRes.json()
      ])

      if (contractsData.data) setContracts(contractsData.data)
      if (statusesData.data) setPaymentStatuses(statusesData.data.filter((s: PaymentStatus) => s.is_active))
      if (typesData.data) setPaymentTypes(typesData.data.filter((t: PaymentType) => t.is_active))
      if (carsData.data) setCompanyCars(carsData.data)
      if (currenciesData.data) {
        setCurrencies(currenciesData.data)
        // Set default currency mostly likely THB
        const thb = currenciesData.data.find((c: Currency) => c.code === 'THB')
        if (thb) setCurrencyId(thb.id.toString())
        else if (currenciesData.data.length > 0) setCurrencyId(currenciesData.data[0].id.toString())
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

    // Validation
    // Contract is optional per user request

    if (!paymentTypeId) {
      setError('Please select a payment type')
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

    try {
      const url = `/api/payments${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId ? parseInt(contractId) : null,
          company_car_id: autoId ? parseInt(autoId) : null, // If backend supports it
          payment_type_id: parseInt(paymentTypeId),
          payment_status_id: parseInt(paymentStatusId),
          amount: parseFloat(amount),
          currency_id: currencyId ? parseInt(currencyId) : null,
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

            {/* Auto Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Auto
              </label>
              <select
                value={autoId}
                onChange={(e) => setAutoId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select Auto</option>
                {companyCars.map((car) => {
                  const carName = `${car.car_templates?.car_brands?.name || ''} ${car.car_templates?.car_models?.name || ''}`.trim()
                  return (
                    <option key={car.id} value={car.id}>
                      {car.license_plate} - {carName}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Contract Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Contract (Optional)
              </label>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select contract</option>
                {contracts.map((contract) => {
                  const clientName = contract.client
                    ? `${contract.client.name} ${contract.client.surname}`.trim()
                    : 'Unknown'
                  return (
                    <option key={contract.id} value={contract.id}>
                      #{contract.id} - {clientName} - {contract.total_amount}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Payment Type *
              </label>
              <select
                required
                value={paymentTypeId}
                onChange={(e) => setPaymentTypeId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select type</option>
                {paymentTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Method *
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

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status *
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
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
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

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Currency *
              </label>
              <select
                required
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="block w-full rounded-md border border-gray-200 text-sm py-2.5 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="">Select currency</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>

          </div>

          <div>
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
