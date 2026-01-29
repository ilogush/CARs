'use client'

import { useState, useEffect } from 'react'
import {
  TruckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import IconBadge from '@/components/ui/IconBadge'
import Loader from '@/components/ui/Loader'

interface CompanyStats {
  carsCount: number
  contractsCount: number
  activeContracts: number
  completedContracts: number
  totalRevenue: number
  managersCount: number
  activeManagers: number
}

interface CompanyStatsProps {
  companyId: number
}

export default function CompanyStats({ companyId }: CompanyStatsProps) {
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/stats`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching company stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (companyId) {
      fetchStats()
    }
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <SectionHeader>Company Statistics</SectionHeader>
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      name: 'Cars',
      value: stats.carsCount,
      icon: TruckIcon
    },
    {
      name: 'Total Contracts',
      value: stats.contractsCount,
      icon: DocumentTextIcon
    },
    {
      name: 'Active Contracts',
      value: stats.activeContracts,
      icon: DocumentTextIcon
    },
    {
      name: 'Total Revenue',
      value: stats.totalRevenue.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }),
      icon: CurrencyDollarIcon
    },
    {
      name: 'Managers',
      value: stats.managersCount,
      subValue: `${stats.activeManagers} active`,
      icon: UserGroupIcon
    }
  ]

  return (
    <Card>
      <SectionHeader>Company Statistics</SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <StatCard key={stat.name}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">{stat.name}</p>
                <IconBadge>
                  <Icon className="h-4 w-4 text-gray-600" />
                </IconBadge>
              </div>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
              {stat.subValue && (
                <p className="text-xs text-gray-500 mt-0.5">{stat.subValue}</p>
              )}
            </StatCard>
          )
        })}
      </div>
    </Card>
  )
}
