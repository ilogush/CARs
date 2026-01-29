'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DataTable from '@/components/ui/DataTable'
import ActionPageHeader from '@/components/ui/ActionPageHeader'
import { Button, PrintButton } from '@/components/ui/Button'
import { 
  ArrowDownTrayIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  BanknotesIcon,
  TruckIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Loader from '@/components/ui/Loader'
import StatusBadge from '@/components/ui/StatusBadge'
import IdBadge from '@/components/ui/IdBadge'
import Tabs from '@/components/ui/Tabs'

type TabType = 'financial' | 'list'

interface FinancialReport {
  period: {
    start: string
    end: string
    type: string
  }
  current: {
    income: number
    expenses: number
    profit: number
  }
  previous: {
    income: number
    expenses: number
    profit: number
  }
  trends: {
    income: number
    expenses: number
    profit: number
  }
}

interface CompanyStats {
  totalCars: number
  availableCars: number
  totalContracts: number
  activeContracts: number
  totalClients: number
  totalRevenue: number
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyId = searchParams.get('company_id')
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('financial')
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null)
  const [loadingFinancial, setLoadingFinancial] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setCurrentRole(data.role)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [])

  useEffect(() => {
    if (activeTab === 'financial' && (currentRole === 'owner' || (currentRole === 'admin' && adminMode))) {
      fetchFinancialData()
      fetchCompanyStats()
    }
  }, [activeTab, selectedPeriod, currentRole, adminMode, companyId])

  const fetchFinancialData = async () => {
    try {
      setLoadingFinancial(true)
      const queryParams = new URLSearchParams({
        period: selectedPeriod
      })

      if (adminMode && companyId) {
        queryParams.set('admin_mode', 'true')
        queryParams.set('company_id', companyId)
      }

      const response = await fetch(`/api/reports/financial?${queryParams.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFinancialData(data)
      } else {
        console.error('Failed to fetch financial data')
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoadingFinancial(false)
    }
  }

  const fetchCompanyStats = async () => {
    try {
      setLoadingStats(true)
      const queryParams = new URLSearchParams()
      
      if (adminMode && companyId) {
        queryParams.set('admin_mode', 'true')
        queryParams.set('company_id', companyId)
      }

      const response = await fetch(`/api/reports/stats?${queryParams.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCompanyStats(data)
      }
    } catch (error) {
      console.error('Error fetching company stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const isOwner = currentRole === 'owner'
  const isAdmin = currentRole === 'admin'

  const handleIdClick = (report: any) => {
    setSelectedReport(report)
    setShowDetailsModal(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatTrend = (trend: number) => {
    const isPositive = trend >= 0
    const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
    const color = isPositive ? 'text-green-600' : 'text-red-600'

    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
      </div>
    )
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row: any) => {
        const displayId = row.id.toString().padStart(4, '0')
        return (
          <button
            onClick={() => handleIdClick(row)}
            className="cursor-pointer"
          >
            <IdBadge>{displayId}</IdBadge>
          </button>
        )
      }
    },
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row: any) => (
        <span className="capitalize">{row.type}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <StatusBadge
          variant={
            row.status === 'ready' ? 'success' :
              row.status === 'processing' ? 'warning' :
                'error'
          }
        >
          {row.status === 'ready' ? 'ready' :
            row.status === 'processing' ? 'processing' : 'error'}
        </StatusBadge>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row: any) => new Date(row.created_at).toLocaleDateString()
    },
  ]

  const fetchData = async (params: { page: number, pageSize: number, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: Record<string, any> }) => {
    // Mock data for reports
    const mockData = Array.from({ length: 5 }).map((_, i) => ({
      id: i + 1,
      name: `Report ${2024 - i}`,
      type: 'Annual',
      generated_at: new Date().toISOString(),
      status: 'completed'
    }))

    return Promise.resolve({
      data: mockData,
      totalCount: 5
    })
  }

  const showFinancialTab = isOwner || (isAdmin && adminMode)

  return (
    <div className="space-y-6">
      <ActionPageHeader
        title="Reports"
        rightActions={
          <div className="flex items-center gap-2">
            <PrintButton onClick={() => window.print()} />
            {activeTab === 'financial' && financialData && (
              <Button
                variant="secondary"
                icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                onClick={() => {
                  const dataStr = JSON.stringify(financialData, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `financial-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`
                  link.click()
                }}
              >
                Export
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      {showFinancialTab && (
        <div className="mb-6">
          <Tabs
            tabs={[
              { id: 'financial', label: 'Financial Reports' },
              { id: 'list', label: 'Reports List' },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as TabType)}
          />
        </div>
      )}

      {/* Financial Reports Tab */}
      {activeTab === 'financial' && showFinancialTab && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-500">Period:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                >
                  <option value="day">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              {financialData && (
                <p className="text-sm text-gray-500">
                  {new Date(financialData.period.start).toLocaleDateString()} - {new Date(financialData.period.end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Company Statistics */}
          {!loadingStats && companyStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-sm border border-gray-200/60">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-600 font-medium">Total Cars</span>
                  <TruckIcon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{companyStats.totalCars}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {companyStats.availableCars} available
                  </div>
                </div>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-sm border border-gray-200/60">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-600 font-medium">Contracts</span>
                  <DocumentTextIcon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{companyStats.totalContracts}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {companyStats.activeContracts} active
                  </div>
                </div>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-sm border border-gray-200/60">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-600 font-medium">Clients</span>
                  <UserGroupIcon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{companyStats.totalClients}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Total registered
                  </div>
                </div>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-between h-[100px] shadow-sm border border-gray-200/60">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-600 font-medium">Total Revenue</span>
                  <BanknotesIcon className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{formatCurrency(companyStats.totalRevenue)} ฿</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    All time
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingFinancial ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader />
            </div>
          ) : financialData ? (
            <>
              {/* Financial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Income */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Income</h3>
                    {formatTrend(financialData.trends.income)}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-3">
                    {formatCurrency(financialData.current.income)} ฿
                  </p>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Previous period</p>
                    <p className="text-sm font-medium text-gray-500">
                      {formatCurrency(financialData.previous.income)} ฿
                    </p>
                  </div>
                </div>

                {/* Expenses */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Expenses</h3>
                    {formatTrend(financialData.trends.expenses)}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-3">
                    {formatCurrency(financialData.current.expenses)} ฿
                  </p>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Previous period</p>
                    <p className="text-sm font-medium text-gray-500">
                      {formatCurrency(financialData.previous.expenses)} ฿
                    </p>
                  </div>
                </div>

                {/* Profit */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Net Profit</h3>
                    {formatTrend(financialData.trends.profit)}
                  </div>
                  <p className={`text-3xl font-bold mb-3 ${
                    financialData.current.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {financialData.current.profit >= 0 ? '+' : ''}{formatCurrency(financialData.current.profit)} ฿
                  </p>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Previous period</p>
                    <p className={`text-sm font-medium ${
                      financialData.previous.profit >= 0 ? 'text-gray-500' : 'text-red-600'
                    }`}>
                      {financialData.previous.profit >= 0 ? '+' : ''}{formatCurrency(financialData.previous.profit)} ฿
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Profit Margin</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {financialData.current.income > 0 
                        ? ((financialData.current.profit / financialData.current.income) * 100).toFixed(1)
                        : '0.0'
                      }%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Expense Ratio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {financialData.current.income > 0
                        ? ((financialData.current.expenses / financialData.current.income) * 100).toFixed(1)
                        : '0.0'
                      }%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Period Type</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {selectedPeriod === 'day' ? 'Daily' :
                       selectedPeriod === 'week' ? 'Weekly' :
                       selectedPeriod === 'month' ? 'Monthly' : 'Yearly'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-gray-500">No financial data available for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Reports List Tab */}
      {activeTab === 'list' && (
        <div>
          <DataTable
            columns={columns}
            fetchData={fetchData}
          />

          {showDetailsModal && selectedReport && (
            <Modal
              title={`Report: ${selectedReport.title || selectedReport.name || 'Report'}`}
              onClose={() => {
                setShowDetailsModal(false)
                setSelectedReport(null)
              }}
              actions={
                selectedReport.status === 'ready' && (
                  <Link href={`/dashboard/reports/${selectedReport.id}`}>
                    <Button
                      type="button"
                      variant="primary"
                      icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    >
                      Download
                    </Button>
                  </Link>
                )
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Title</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.title || selectedReport.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedReport.type || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <StatusBadge
                        variant={
                          selectedReport.status === 'ready' ? 'success' :
                            selectedReport.status === 'processing' ? 'warning' :
                              'error'
                        }
                      >
                        {selectedReport.status === 'ready' ? 'ready' :
                          selectedReport.status === 'processing' ? 'processing' : 'error'}
                      </StatusBadge>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedReport.created_at || selectedReport.generated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  )
}
