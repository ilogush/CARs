'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
    currentPage: number
    totalCount: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
    pageSizeOptions?: number[]
}

export default function Pagination({
    currentPage,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [20, 50, 100, 10000]
}: PaginationProps) {
    const totalPages = Math.ceil(totalCount / pageSize)

    if (totalPages <= 1 && !onPageSizeChange) return null

    return (
        <div className="w-full">
            {/* Mobile view */}
            <div className="py-4 flex items-center justify-between sm:hidden">
                <button
                    onClick={() => {
                        onPageChange(Math.max(1, currentPage - 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 rounded-xl bg-gray-50/50 border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    <ChevronLeftIcon className="w-5 h-5 mr-1" />
                    Previous
                </button>
                <div className="flex items-center text-sm font-bold text-gray-900 px-4">
                    {currentPage} / {totalPages || 1}
                </div>
                <button
                    onClick={() => {
                        onPageChange(Math.min(totalPages, currentPage + 1))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="relative inline-flex items-center px-4 py-2 rounded-xl bg-gray-50/50 border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    Next
                    <ChevronRightIcon className="w-5 h-5 ml-1" />
                </button>
            </div>

            {/* Desktop view */}
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between py-4">
                <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-500">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                        <span className="font-medium">{totalCount}</span> results
                    </p>
                    {onPageSizeChange && (
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value))
                                onPageChange(1)
                            }}
                            className="block pl-3 pr-8 py-2 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-black/5 rounded-2xl shadow-sm hover:shadow-md text-gray-900 bg-gray-50/50 transition-shadow"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size === 10000 ? 'All' : `${size} / page`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-lg -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-200 bg-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                            const pageNum = i + 1
                            return (
                                <button
                                    key={i}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`relative inline-flex items-center px-3 py-2 border text-xs font-medium transition-colors ${currentPage === pageNum
                                            ? 'z-10 bg-gray-800 border-gray-800 text-white'
                                            : 'bg-gray-200 border-gray-200 text-gray-500 hover:bg-gray-300'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            )
                        })}
                        {totalPages > 5 && (
                            <span className="relative inline-flex items-center px-3 py-2 border border-gray-200 bg-gray-200 text-xs text-gray-500">
                                ...
                            </span>
                        )}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-200 bg-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    )
}
