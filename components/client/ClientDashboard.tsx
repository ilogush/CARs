'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  ArrowRightIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  name?: string | null
  surname?: string | null
}

interface ClientProfile {
  phone?: string | null
  address?: string | null
  [key: string]: any
}

interface Contract {
  id: number
  status: string
  start_date: string
  end_date: string
  total_amount: number
  created_at: string
  company_cars?: {
    id: number
    license_plate: string
    photos?: string[] | null
    car_templates?: {
      car_brands?: { name: string }
      car_models?: { name: string }
      car_body_types?: { name: string }
    }
  }
  manager?: {
    id: string
    name?: string | null
    surname?: string | null
    email: string
  }
}

interface Payment {
  id: number
  amount: number
  status: string
  payment_date: string
  payment_type_id?: number
  contracts?: {
    id: number
    company_cars?: {
      car_templates?: {
        car_brands?: { name: string }
        car_models?: { name: string }
      }
    }
  }
}

interface Statistics {
  totalContracts: number
  activeContracts: number
  totalSpent: number
  totalPayments: number
}

interface ClientDashboardProps {
  user: User
  clientProfile?: ClientProfile | null
  contracts: Contract[]
  payments: Payment[]
  statistics: Statistics
}

export default function ClientDashboard({
  user,
  clientProfile,
  contracts,
  payments,
  statistics
}: ClientDashboardProps) {
  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0 ₽'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircleIcon,
        label: 'active'
      },
      completed: {
        bg: 'bg-brand-100',
        text: 'text-brand-800',
        icon: CheckCircleIcon,
        label: 'completed'
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircleIcon,
        label: 'cancelled'
      },
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: ClockIcon,
        label: 'pending'
      }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-200',
      text: 'text-brand-800',
      icon: ClockIcon,
      label: status
    }

    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Personal Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Rental and contract management
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Find Car
        </Link>
      </div>

      {/* User Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.name && user.surname
                  ? `${user.name} ${user.surname}`
                  : user.email
                }
              </h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4" />
                  {user.email}
                </div>
                {clientProfile?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4" />
                    {clientProfile.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contracts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{statistics.totalContracts}</p>
            </div>
            <div className="h-12 w-12 bg-brand-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-brand-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{statistics.activeContracts}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(statistics.totalSpent)}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{statistics.totalPayments}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contracts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Contracts</h2>
        </div>
        <div className="p-4">
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-500" />
              <p className="mt-4 text-sm text-gray-500">You don't have any contracts yet</p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Find a car to rent
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Contract #{contract.id}
                        </h3>
                        {getStatusBadge(contract.status)}
                      </div>

                      {contract.company_cars?.car_templates && (
                        <p className="text-sm text-gray-600 mb-1">
                          {contract.company_cars.car_templates.car_brands?.name}{' '}
                          {contract.company_cars.car_templates.car_models?.name}
                          {contract.company_cars.license_plate && (
                            <span className="ml-2 text-gray-500">
                              ({contract.company_cars.license_plate})
                            </span>
                          )}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span className="font-medium">{formatPrice(contract.total_amount)}</span>
                        </div>
                      </div>

                      {contract.manager && (
                        <p className="mt-2 text-xs text-gray-500">
                          Manager: {contract.manager.name || ''} {contract.manager.surname || ''}
                          {!contract.manager.name && !contract.manager.surname && contract.manager.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.contracts?.company_cars?.car_templates?.car_brands?.name || ''}{' '}
                      {payment.contracts?.company_cars?.car_templates?.car_models?.name || ''}
                      {!payment.contracts?.company_cars?.car_templates?.car_brands?.name &&
                        !payment.contracts?.company_cars?.car_templates?.car_models?.name &&
                        'Payment #' + payment.id}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(payment.amount)}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
