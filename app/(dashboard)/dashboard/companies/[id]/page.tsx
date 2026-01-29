'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import { Loader, BackButton, PageHeader, Button, DeleteButton, DetailField, DetailGrid } from '@/components/ui'
import { AdminModeBadge } from '@/components/admin/AdminModeBadge'
import CompanyStats from '@/components/companies/CompanyStats'

interface Company {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  locations: {
    name: string
  }
  _meta?: {
    isAdminMode?: boolean
    userRole?: string
    canEdit?: boolean
  }
}

export default function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const toast = useToast()
  const { id } = use(params)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [enteringAsAdmin, setEnteringAsAdmin] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Получаем данные пользователя
        const userRes = await fetch('/api/users/me')
        if (userRes.ok) {
          const userData = await userRes.json()
          setCurrentUser(userData)
        }

        // Получаем данные компании
        const companyRes = await fetch(`/api/companies/${id}`)
        if (companyRes.ok) {
          const data = await companyRes.json()
          setCompany(data)
        } else {
          throw new Error('Company not found')
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load company details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete company')
      }

      toast.success('Company deleted successfully')
      router.push('/dashboard/companies')
    } catch (error: any) {
      console.error('Error deleting company:', error)
      toast.error(error.message || 'Failed to delete company')
      setDeleting(false)
    }
  }

  const handleEnterAsAdmin = async () => {
    if (!company) return

    setEnteringAsAdmin(true)
    try {
      const res = await fetch('/api/admin/enter-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: company.id
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to enter company')
      }

      router.push(`/dashboard?admin_mode=true&company_id=${company.id}`)
    } catch (error: any) {
      console.error('Error entering company as admin:', error)
      toast.error(error.message || 'Failed to enter company')
      setEnteringAsAdmin(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Mode Badge */}
      {company && (
        <AdminModeBadge
          companyId={company.id}
          companyName={company.name}
        />
      )}

      <PageHeader
        title="Company Details"
        leftActions={<BackButton href="/dashboard/companies" />}
        rightActions={
          company && (
            <div className="flex space-x-3">
              {/* Кнопка входа админа */}
              {currentUser?.role === 'admin' && !company._meta?.isAdminMode && (
                <Button
                  onClick={handleEnterAsAdmin}
                  disabled={enteringAsAdmin}
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                  icon={<ShieldCheckIcon className="w-4 h-4" />}
                >
                  {enteringAsAdmin ? 'Entering...' : 'Enter as Admin'}
                </Button>
              )}

              <Link href={`/dashboard/companies/${id}/edit`}>
                <Button variant="secondary">
                  Edit
                </Button>
              </Link>
              <DeleteButton
                onClick={handleDelete}
                disabled={deleting}
                title="Delete company"
                className="bg-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              />
            </div>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
      ) : error || !company ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-red-500">{error || 'Company not found'}</p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      ) : (
        <>
          {/* Статистика компании */}
          <CompanyStats companyId={parseInt(id)} />

          <div className="overflow-hidden">
            <div className="px-4 py-5 sm:px-0 mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
            </div>
            <DetailGrid cols={4} className="p-2">
              <DetailField label="Name" value={company.name} />
              <DetailField label="Location" value={company.locations?.name || '-'} />
              <DetailField label="Email" value={company.email || '-'} />
              <DetailField label="Phone" value={company.phone || '-'} />
              {company.address && (
                <DetailField
                  label="Address"
                  value={company.address}
                  className="md:col-span-4"
                />
              )}
              <DetailField
                label="Created At"
                value={new Date(company.created_at).toLocaleDateString()}
              />
            </DetailGrid>
          </div>
        </>
      )}
    </div>
  )
}
