'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T, index: number, page: number, pageSize: number) => React.ReactNode
  wrap?: boolean
  className?: string
}

export interface Tab<T = any> {
  id: string
  label: string
  fetchData: (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => Promise<{ data: T[]; totalCount: number }>
  columns: Column<T>[]
}

interface DataTableProps<T> {
  columns?: Column<T>[]
  fetchData?: (params: {
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
  }) => Promise<{ data: T[]; totalCount: number }>
  title?: string
  actions?: React.ReactNode
  refreshKey?: string | number
  tabs?: Tab<T>[]
  defaultTabId?: string
  onTabChange?: (tabId: string) => void
  disablePagination?: boolean
  initialPageSize?: number
  data?: T[]
  totalCount?: number
  isLoading?: boolean
  getRowClassName?: (item: T, index: number) => string
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  emptyAction?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
}

import Loader from './Loader'
import TabsComponent from './Tabs'
import Pagination from './Pagination'

export default function DataTable<T>({
  columns,
  fetchData,
  title,
  actions,
  refreshKey,
  tabs,
  defaultTabId,
  onTabChange,
  disablePagination = false,
  initialPageSize = 20,
  data: providedData,
  totalCount: providedTotalCount,
  isLoading: providedIsLoading,
  getRowClassName,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction
}: DataTableProps<T>) {
  const searchParams = useSearchParams()
  const searchTerm = searchParams.get('q') || ''

  const initialTabId = defaultTabId || (tabs && tabs.length > 0 ? tabs[0].id : '')
  const [activeTab, setActiveTab] = useState<string>(initialTabId)

  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('page')
      return p ? parseInt(p) : 1
    }
    return 1
  })

  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const ps = new URLSearchParams(window.location.search).get('pageSize')
      return ps ? parseInt(ps) : initialPageSize
    }
    return initialPageSize
  })

  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>()

  const userHasSelectedTab = useRef(false)

  useEffect(() => {
    if (tabs && tabs.length > 0) {
      const foundTab = tabs.find(t => t.id === activeTab)
      if (!foundTab) {
        const targetTabId = defaultTabId && tabs.find(t => t.id === defaultTabId)
          ? defaultTabId
          : tabs[0].id
        setActiveTab(targetTabId)
        userHasSelectedTab.current = false
      }
    }
  }, [tabs, activeTab, defaultTabId])

  const actualActiveTab = tabs && tabs.length > 0
    ? (tabs.find(t => t.id === activeTab)?.id || tabs[0]?.id || '')
    : activeTab

  if (!tabs && (!columns || (!fetchData && !providedData))) {
    throw new Error('Either tabs or both columns and fetchData must be provided')
  }

  const currentColumns = tabs ? tabs.find(t => t.id === actualActiveTab)?.columns || [] : (columns || [])
  const currentFetchData = tabs ? tabs.find(t => t.id === actualActiveTab)?.fetchData : fetchData

  const swrKey = useMemo(() => {
    if (!currentFetchData) return null
    const filters = searchTerm ? { q: searchTerm } : {}
    return JSON.stringify({
      tab: actualActiveTab,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filters,
      refreshKey
    })
  }, [actualActiveTab, page, pageSize, sortBy, sortOrder, searchTerm, refreshKey, currentFetchData])

  const activeTabLabel = useMemo(() => {
    if (tabs) {
      return tabs.find(t => t.id === actualActiveTab)?.label || actualActiveTab
    }
    return title || 'data'
  }, [tabs, actualActiveTab, title])

  const { data: result, error, isLoading: swrLoading, mutate } = useSWR(
    swrKey,
    async () => {
      if (!currentFetchData) return null
      const filters = searchTerm ? { q: searchTerm } : {}
      return await currentFetchData({
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters
      })
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      revalidateOnMount: true,
      keepPreviousData: true,
    }
  )

  const data = providedData || result?.data || []
  const totalCount = providedTotalCount ?? result?.totalCount ?? 0
  const isLoading = providedIsLoading || swrLoading

  useEffect(() => {
    // Only reset if this is NOT the initial load with URL params
    const params = new URLSearchParams(window.location.search)
    const urlPage = params.get('page')
    const urlTab = params.get('tab')

    // If the tab in URL is different from current activeTab, or if we switched tabs
    if (urlTab !== activeTab) {
      setPage(1)
      const url = new URL(window.location.href)
      url.searchParams.set('page', '1')
      window.history.replaceState({}, '', url)
    }

    setSortBy(undefined)
    setSortOrder(undefined)
  }, [activeTab])

  // Sync page to URL
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('page') !== page.toString()) {
      url.searchParams.set('page', page.toString())
      window.history.replaceState({}, '', url)
    }
  }, [page])

  // Sync pageSize to URL
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('pageSize') !== pageSize.toString()) {
      url.searchParams.set('pageSize', pageSize.toString())
      window.history.replaceState({}, '', url)
    }
  }, [pageSize])

  const handleSort = (key: string) => {
    if (sortBy === key) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
    // Reset to first page when sorting changes
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="overflow-hidden">
      {tabs && tabs.length > 0 && (
        <TabsComponent
          tabs={tabs.map(t => ({ id: t.id, label: t.label }))}
          activeTab={actualActiveTab}
          onTabChange={(id) => {
            setActiveTab(id as string)
            if (onTabChange) {
              onTabChange(id as string)
            }
          }}
          className="mb-6"
        />
      )}

      {/* Table Section with perimeter border and radius */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto sm:mx-0">
          <table className="min-w-full divide-y divide-gray-100 bg-transparent">
            <thead>
              <tr className="bg-gray-50/50">
                {currentColumns.map((col, idx) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${idx === 0 ? 'pl-4' : 'px-4'} py-2 text-left text-base font-bold text-gray-900 tracking-wider ${col.sortable ? 'cursor-pointer hover:text-gray-500' : ''} ${idx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      {sortBy === col.key && (
                        sortOrder === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && data.length === 0 ? (
                <tr>
                  <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                    <div className="flex justify-center items-center">
                      <Loader />
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-red-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span>Failed to load data.</span>
                      <button
                        onClick={() => mutate()}
                        className="text-gray-800 hover:text-gray-500 underline text-xs font-medium"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={currentColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                    <EmptyState
                      type="data"
                      title={emptyTitle || (searchTerm ? "No results found" : `No ${activeTabLabel.toLowerCase()} found`)}
                      description={emptyDescription || (searchTerm ? `We couldn't find anything matching "${searchTerm}"` : `There are no ${activeTabLabel.toLowerCase()} to display.`)}
                      icon={emptyIcon}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr
                    key={(item as any).id || idx}
                    className={`group hover:bg-gray-50/50 transition-all ${isLoading ? 'opacity-50' : ''} ${getRowClassName ? getRowClassName(item, idx) : ''}`}
                  >
                    {currentColumns.map((col, cIdx) => (
                      <td
                        key={col.key}
                        className={`${cIdx === 0 ? 'pl-4' : 'px-4'} py-2 text-sm text-gray-900 ${col.wrap ? 'whitespace-normal align-top' : 'whitespace-nowrap'} ${cIdx > 2 ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                      >
                        {col.render ? col.render(item, idx, page, pageSize) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!disablePagination && (
        <Pagination
          currentPage={page}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  )
}
