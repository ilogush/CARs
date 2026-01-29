'use client'

import { useState, useEffect } from 'react'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import Card from '@/components/ui/Card'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import Loader from '@/components/ui/Loader'

interface ActivityData {
  date: string
  count: number
}

interface CompanyDistribution {
  location: string
  count: number
}

interface ContractsStats {
  active: number
  completed: number
  pending: number
}

export default function ChartsWidget() {
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [companyDistribution, setCompanyDistribution] = useState<CompanyDistribution[]>([])
  const [contractsStats, setContractsStats] = useState<ContractsStats>({ active: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Получаем данные активности за последние 7 дней
        const activityResponse = await fetch('/api/logs?page=1&pageSize=100&sortBy=created_at&sortOrder=desc')
        if (activityResponse.ok) {
          const activityResult = await activityResponse.json()
          const logs = activityResult.data || []
          
          // Группируем по дням
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (6 - i))
            return date.toISOString().split('T')[0]
          })

          const grouped = last7Days.map(date => {
            const count = logs.filter((log: any) => {
              const logDate = new Date(log.created_at).toISOString().split('T')[0]
              return logDate === date
            }).length
            return { date, count }
          })

          setActivityData(grouped)
        }

        // Получаем распределение компаний по локациям
        const companiesResponse = await fetch('/api/companies')
        if (companiesResponse.ok) {
          const companiesResult = await companiesResponse.json()
          const companies = companiesResult.data || []
          
          // Группируем по локациям
          const distribution: Record<string, number> = {}
          companies.forEach((company: any) => {
            const locationName = company.locations?.name || 'Unknown'
            distribution[locationName] = (distribution[locationName] || 0) + 1
          })

          const distributionArray = Object.entries(distribution).map(([location, count]) => ({
            location,
            count: count as number
          }))

          setCompanyDistribution(distributionArray)
        }

        // Получаем статистику контрактов
        const contractsResponse = await fetch('/api/contracts')
        if (contractsResponse.ok) {
          const contractsResult = await contractsResponse.json()
          const contracts = contractsResult.data || []
          
          const stats = {
            active: contracts.filter((c: any) => c.status === 'active').length,
            completed: contracts.filter((c: any) => c.status === 'completed').length,
            pending: contracts.filter((c: any) => c.status === 'pending').length
          }

          setContractsStats(stats)
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <SectionHeader>System Statistics</SectionHeader>
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center space-x-2 mb-6">
        <ChartBarIcon className="h-5 w-5 text-gray-500" />
        <SectionHeader className="mb-0">System Statistics</SectionHeader>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Активность за последние 7 дней */}
        <div>
          <SectionHeader size="sm">Activity Over Time (Last 7 Days)</SectionHeader>
          {activityData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No data available
            </div>
          ) : (
            <div className="space-y-2">
              {activityData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">
                    {formatDate(item.date)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count} actions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Распределение компаний по локациям */}
        <div>
          <SectionHeader size="sm">Companies by Location</SectionHeader>
          {companyDistribution.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No data available
            </div>
          ) : (
            <div className="space-y-2">
              {companyDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600 truncate">
                    {item.location}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count} companies
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Статистика контрактов */}
        <div className="lg:col-span-2">
          <SectionHeader size="sm">Contracts Statistics</SectionHeader>
          <div className="grid grid-cols-3 gap-3">
            <StatCard>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{contractsStats.active}</div>
                <div className="text-xs text-gray-500 mt-0.5">Active</div>
              </div>
            </StatCard>
            <StatCard>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{contractsStats.completed}</div>
                <div className="text-xs text-gray-500 mt-0.5">Completed</div>
              </div>
            </StatCard>
            <StatCard>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{contractsStats.pending}</div>
                <div className="text-xs text-gray-500 mt-0.5">Pending</div>
              </div>
            </StatCard>
          </div>
        </div>
      </div>
    </Card>
  )
}
