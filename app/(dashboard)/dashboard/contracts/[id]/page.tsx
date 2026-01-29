'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PrinterIcon, PencilIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { Loader, BackButton, Button, PrintButton, PageHeader, SectionHeader, DetailGrid, DetailField, StatusBadge, DataTable, EmptyState } from '@/components/ui'
import IdBadge from '@/components/ui/IdBadge'
import { useToast } from '@/lib/toast'
import CloseContractModal from '@/components/contracts/CloseContractModal'


export default function ContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const { id } = use(params)
  const [contract, setContract] = useState<any | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/contracts/${id}`)
        const json = await res.json()

        if (json.data && json.data.length > 0) {
          setContract(json.data[0])
          const payRes = await fetch(`/api/payments?filters=${JSON.stringify({ contract_id: id })}`)
          if (payRes.ok) {
            const payJson = await payRes.json()
            setPayments(payJson.data || [])
          }
        } else {
          setError('Contract not found')
        }
      } catch (err) {
        setError('Failed to load contract details')
      } finally {
        setLoading(false)
      }
    }

    fetchContract()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500 font-medium">{error || 'Contract not found'}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const clientName = contract.client ? `${contract.client.name} ${contract.client.surname}` : (contract.users ? `${contract.users.name} ${contract.users.surname}` : 'Unknown')
  const carName = contract.company_cars && contract.company_cars.car_templates
    ? `${contract.company_cars.car_templates.car_brands?.name} ${contract.company_cars.car_templates.car_models?.name}`
    : 'Unknown'

  const plateNumber = contract.company_cars?.license_plate || ''

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'completed': return 'info'
      case 'cancelled': return 'error'
      default: return 'neutral'
    }
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title={`Contract #${contract.id.toString().padStart(4, '0')}`}
        leftActions={
          <BackButton href={`/dashboard/contracts${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`} />
        }
        rightActions={
          <div className="flex space-x-2">
            <PrintButton onClick={() => window.print()} />
            <Link href={`/dashboard/contracts/${id}/edit${adminMode && companyId ? `?admin_mode=true&company_id=${companyId}` : ''}`}>
              <Button variant="primary" icon={<PencilIcon className="w-4 h-4" />}>
                Edit
              </Button>
            </Link>
            {contract && (contract.status === 'active' || contract.status === 'confirmed') && (
              <Button
                variant="secondary"
                onClick={() => setShowCloseModal(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Close
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-12">
        {/* Car */}
        <div className="space-y-6">
          <SectionHeader size="md" className="text-xs font-semibold text-gray-400 uppercase pb-2 border-b border-gray-100">
            Car
          </SectionHeader>
          <DetailGrid cols={4}>
            <DetailField label="Vehicle" value={`${carName} (${plateNumber})`} />
            <DetailField label="Start Date" value={new Date(contract.start_date).toLocaleDateString()} />
            <DetailField label="End Date" value={new Date(contract.end_date).toLocaleDateString()} />
            <DetailField label="Status" value={
              <StatusBadge variant={getStatusVariant(contract.status)}>
                {contract.status.toLowerCase()}
              </StatusBadge>
            } />
          </DetailGrid>
        </div>

        {/* Client Details */}
        <div className="space-y-6">
          <SectionHeader size="md" className="lowercase tracking-wider text-xs font-medium text-gray-500 pb-2 border-b border-gray-100">
            Client Details
          </SectionHeader>
          <DetailGrid cols={4}>
            <DetailField label="Full Name" value={clientName} />
            <DetailField label="Email" value={contract.client?.email || contract.users?.email} />
            <DetailField label="Phone" value={contract.client?.phone || contract.users?.phone || '-'} />
            <DetailField label="Passport" value={contract.client?.passport_number || contract.users?.passport_number || '-'} />
          </DetailGrid>
        </div>

        {/* Financial Details */}
        <div className="space-y-6">
          <SectionHeader size="md" className="lowercase tracking-wider text-xs font-medium text-gray-500 pb-2 border-b border-gray-100">
            Financial Summary
          </SectionHeader>
          <DetailGrid cols={4}>
            <DetailField label="Rental Total" value={`${parseFloat(contract.total_amount).toLocaleString()} ฿`} />
            <DetailField label="Deposit" value={`${parseFloat(contract.deposit_amount || 0).toLocaleString()} ฿`} />
            <DetailField label="Total Received" value={
              <span className="text-green-600 font-bold">
                {payments.reduce((acc, p) => acc + (p.status === 'paid' ? parseFloat(p.amount) : 0), 0).toLocaleString()} ฿
              </span>
            } />
            <DetailField label="Balance Due" value={
              <span className="text-red-600 font-black">
                {(parseFloat(contract.total_amount) - payments.reduce((acc, p) => acc + (p.status === 'paid' ? parseFloat(p.amount) : 0), 0)).toLocaleString()} ฿
              </span>
            } />
          </DetailGrid>
        </div>

        {/* Additional Information */}
        <div className="space-y-6">
          <SectionHeader size="md" className="lowercase tracking-wider text-xs font-medium text-gray-500 pb-2 border-b border-gray-100">
            Additional Information
          </SectionHeader>
          <DetailGrid cols={1}>
            <DetailField
              label="Notes & Comments"
              value={contract.notes || 'No notes provided.'}
            />
          </DetailGrid>
        </div>

        {/* Car Photos */}
        {contract.photos && contract.photos.length > 0 && (
          <div className="space-y-6">
            <SectionHeader size="md" className="lowercase tracking-wider text-xs font-medium text-gray-500 pb-2 border-b border-gray-100">
              Car Photos
            </SectionHeader>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {contract.photos.map((photo: string, index: number) => (
                <div key={index} className="relative aspect-square group">
                  <a
                    href={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                      alt={`Car photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-gray-500 transition-colors"
                    />
                  </a>
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="space-y-6">
          <SectionHeader size="md" className="lowercase tracking-wider text-xs font-medium text-gray-500 pb-2 border-b border-gray-100" rightAction={
            <Link href={`/dashboard/payments/create?contract_id=${contract.id}`}>
              <Button variant="secondary" size="sm" icon={<BanknotesIcon className="w-4 h-4" />}>
                Add
              </Button>
            </Link>
          }>
            Transactions
          </SectionHeader>

          <div className="overflow-x-auto">
            {payments.length > 0 ? (
              <DataTable
                columns={[
                  {
                    key: 'id',
                    label: 'ID',
                    render: (p) => (
                      <Link href={`/dashboard/payments/${p.id}`} className="cursor-pointer">
                        <IdBadge>{p.id.toString().padStart(4, '0')}</IdBadge>
                      </Link>
                    )
                  },
                  {
                    key: 'date',
                    label: 'Date',
                    render: (p) => new Date(p.payment_date || p.created_at).toLocaleDateString()
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (p) => <span className="font-bold text-gray-900">{parseFloat(p.amount).toLocaleString()} ฿</span>
                  },
                  {
                    key: 'method',
                    label: 'Method',
                    render: (p) => <span className="lowercase font-medium text-xs text-gray-500">{p.payment_method || 'Cash'}</span>
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (p) => (
                      <StatusBadge variant={p.status === 'paid' ? 'success' : 'warning'}>
                        {p.status?.toLowerCase() || 'pending'}
                      </StatusBadge>
                    )
                  }
                ]}
                data={payments}
                disablePagination
                initialPageSize={payments.length}
              />
            ) : (
              <EmptyState
                type="data"
                title="No payments recorded"
                description="This contract has no associated transactions yet."
                className="bg-transparent py-8"
              />
            )}
          </div>
        </div>
      </div>

      {showCloseModal && contract && (
        <CloseContractModal
          contractId={contract.id}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false)
            // Reload page to update status
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
