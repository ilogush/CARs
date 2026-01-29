'use client'

import { UserRole } from '@/types/database.types'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/lib/toast'
import { useAdminMode } from '@/components/admin/AdminModeProvider'
import {
  Squares2X2Icon,
  CubeIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  TruckIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  TagIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ClockIcon,
  SwatchIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  BellIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  KeyIcon,
  ChevronDownIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  MapPinIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  SunIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import LogoutButton from '@/components/auth/LogoutButton'

interface AdminDashboardLayoutProps {
  user: { email?: string; role: UserRole; name?: string | null; avatar_url?: string | null }
  title: string
  navItems: { href: string; label: string }[]
  children: React.ReactNode
  role?: UserRole
  scope?: { role: string; scope: string; company_id?: number }
}

const getIcon = (label: string) => {
  switch (label) {
    case 'Dashboard': return Squares2X2Icon
    case 'Companies': return BuildingOfficeIcon
    case 'Users': return UserGroupIcon
    case 'Logs': return ClipboardDocumentListIcon
    case 'Audit Logs': return ClipboardDocumentListIcon
    case 'System Logs': return ClipboardDocumentListIcon
    case 'Brands': return TagIcon
    case 'Colors': return SwatchIcon
    case 'Cars': return TruckIcon
    case 'My Cars': return TruckIcon
    case 'Contracts': return DocumentTextIcon
    case 'Calendar': return CalendarIcon
    case 'Payments': return BanknotesIcon
    case 'Reports': return DocumentTextIcon
    case 'Health': return ShieldCheckIcon
    case 'Maintenance': return WrenchScrewdriverIcon
    case 'Settings': return Cog6ToothIcon
    case 'Locations': return MapPinIcon
    case 'Bookings': return DocumentTextIcon
    case 'Clients': return UserGroupIcon
    case 'Chat': return ChatBubbleLeftRightIcon
    case 'Profile': return UserIcon
    case 'Search Cars': return TruckIcon
    case 'My Bookings': return DocumentTextIcon
    case 'My Contracts': return DocumentTextIcon
    case 'Seasons': return SunIcon
    case 'Durations': return ClockIcon
    case 'Currencies': return CurrencyDollarIcon
    case 'Hotels': return BuildingOffice2Icon
    default: return HomeIcon
  }
}

const getRoleName = (role: UserRole) => {
  switch (role) {
    case 'admin': return 'Administrator'
    case 'owner': return 'Owner'
    case 'manager': return 'Manager'
    case 'client': return 'Client'
    default: return role
  }
}

export default function AdminDashboardLayout({
  user,
  title,
  navItems,
  children,
  role,
  scope
}: AdminDashboardLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { isAdminMode, companyId, exitAdminMode } = useAdminMode()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<{ label: string, top: number } | null>(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [companyName, setCompanyName] = useState<string | null>(null)
  const toastShownRef = useRef(false)

  // Проверяем режим админа в компании
  const isAdminInOwnerMode = isAdminMode && companyId && user.role === 'admin'

  // If admin in Owner mode, update menu
  const ownerNavItems = isAdminInOwnerMode ? [
    { href: `/dashboard?admin_mode=true&company_id=${companyId}`, label: 'Dashboard' },
    { href: `/dashboard/contracts?admin_mode=true&company_id=${companyId}`, label: 'Contracts' },
    { href: `/dashboard/locations?admin_mode=true&company_id=${companyId}`, label: 'Locations' },
    { href: `/dashboard/cars?admin_mode=true&company_id=${companyId}`, label: 'My Cars' },
    { href: `/dashboard/users?admin_mode=true&company_id=${companyId}`, label: 'Users' },
    { href: `/dashboard/calendar?admin_mode=true&company_id=${companyId}`, label: 'Calendar' },
    { href: `/dashboard/payments?admin_mode=true&company_id=${companyId}`, label: 'Payments' },
    { href: `/dashboard/reports?admin_mode=true&company_id=${companyId}`, label: 'Reports' },
    { href: `/dashboard/logs?admin_mode=true&company_id=${companyId}`, label: 'Logs' },
    { href: `/dashboard/chat?admin_mode=true&company_id=${companyId}`, label: 'Chat' },
    { href: `/dashboard/settings?admin_mode=true&company_id=${companyId}`, label: 'Settings' },
  ] : navItems

  // Обработчик клика на логотип в режиме просмотра компании
  const handleLogoClickInAdminMode = (e: React.MouseEvent) => {
    e.preventDefault()
    // Выход из режима просмотра компании и переход в дашборд админа
    exitAdminMode()
    router.push('/dashboard')
  }

  // Sync searchTerm with URL when URL changes explicitly (e.g. back button)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== searchTerm) {
      setSearchTerm(q)
    }
  }, [searchParams])

  // Debounce URL update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (currentQ !== searchTerm) {
        const params = new URLSearchParams(searchParams)
        if (searchTerm) {
          params.set('q', searchTerm)
        } else {
          params.delete('q')
        }
        router.replace(`${pathname}?${params.toString()}`)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, pathname, router, searchParams])

  useEffect(() => {
    if (searchParams.get('login') === 'success' && !toastShownRef.current) {
      toastShownRef.current = true
      toast.success('Login successful')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, toast])

  // Fetch company name for display in header
  useEffect(() => {
    const fetchCompanyName = async () => {
      const targetId = companyId || scope?.company_id
      if (targetId) {
        // Set a fallback name while fetching or if ID is 1
        if (!companyName || Number(targetId) === 1) {
          setCompanyName(Number(targetId) === 1 ? 'Best Car Rental' : 'Island Hua Hin Drive')
        }

        try {
          // Include admin_mode params for proper access
          const url = isAdminMode && targetId
            ? `/api/companies/${targetId}?admin_mode=true&company_id=${targetId}`
            : `/api/companies/${targetId}`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            if (data && data.name) {
              setCompanyName(data.name)
            }
          }
        } catch (error) {
          console.error('Error fetching company name:', error)
          // Fallback already set above
        }
      } else {
        setCompanyName(null)
      }
    }
    fetchCompanyName()
  }, [companyId, scope?.company_id])

  const currentPageLabel = ownerNavItems.find(n => {
    if (n.href === '/dashboard' || n.href === `/dashboard?admin_mode=true&company_id=${companyId}`) {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(n.href.split('?')[0])
  })?.label || title || 'Dashboard'

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex text-gray-900 font-sans">
      {/* Sidebar - Fixed width, clean white */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 bg-white h-screen flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-50 print:hidden ${isSidebarOpen ? 'w-[240px] border-r border-gray-200 translate-x-0' : 'w-0 border-none md:w-[72px] md:border-r md:border-gray-200 overflow-hidden -translate-x-full md:translate-x-0'
          }`}
      >
        {/* Logo Area */}
        <div className={`h-16 flex items-center flex-shrink-0 transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'justify-center'}`}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center text-gray-900 hover:bg-gray-300 transition-all flex-shrink-0 shadow-sm"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5" />
            </svg>
          </button>

          {isSidebarOpen && (
            <Link href="/" className="flex items-center group">
              <div className="h-10 flex items-center justify-center text-black group-hover:scale-105 transition-transform flex-shrink-0">
                <span className="font-black text-2xl tracking-tighter">CARs</span>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {/* Section Label */}
          {isSidebarOpen && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase mb-2">Overview</div>
          )}

          {ownerNavItems.map((item) => {
            const Icon = getIcon(item.label)
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className={`
                  flex items-center gap-3 rounded-2xl transition-all duration-300 group
                  ${isSidebarOpen
                    ? 'px-4 py-2 w-full'
                    : 'w-10 h-10 justify-center p-0 mx-auto'
                  }
                  ${isActive
                    ? 'bg-gray-50 text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onMouseEnter={(e) => {
                  if (!isSidebarOpen) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHoveredItem({ label: item.label, top: rect.top })
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Icon className={`
                  flex-shrink-0 transition-transform duration-300
                  ${isActive ? 'text-black scale-110' : 'text-gray-500 group-hover:text-gray-600 group-hover:scale-110'}
                  w-6 h-6 stroke-[1.5px]
                `} />

                {isSidebarOpen && (
                  <span className="font-medium text-[15px] truncate">
                    {item.label}
                  </span>
                )}

                {/* Active Indicator Dot (optional) */}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Toggle Area removed for cleaner look as top toggle exists */}
      </aside>

      {/* Tooltip for Collapsed Sidebar */}
      {!isSidebarOpen && hoveredItem && (
        <div
          className="fixed z-50 bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-gray-700 pointer-events-none whitespace-nowrap left-[80px]"
          style={{ top: hoveredItem.top + 6 }}
        >
          {hoveredItem.label}
          <div className="absolute top-1/2 -left-1.5 -mt-1.5 border-[6px] border-transparent border-r-gray-800"></div>
        </div>
      )}

      {/* Main Content Area - Scrollable Container */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar print:h-auto print:overflow-visible">
        {/* Header - Part of scrollable area */}
        <header className="h-16 px-4 flex items-center justify-between flex-shrink-0 bg-transparent print:hidden">
          {/* Left: Mobile Menu Toggle & Company Info */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-900 bg-white shadow-sm border border-gray-200 rounded-xl transition-all active:scale-95"
              aria-label="Open sidebar"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              {(companyName || companyId || scope?.company_id) && (
                <span className="text-xs font-medium text-gray-400 leading-none truncate max-w-[150px]">
                  {companyName || (companyId ? (Number(companyId) === 1 ? 'Best Car Rental' : 'Island Hua Hin Drive') : '') || (scope?.company_id ? (Number(scope.company_id) === 1 ? 'Best Car Rental' : 'Island Hua Hin Drive') : '')}
                </span>
              )}
            </div>
          </div>

          {/* Right: Search & Actions */}
          <div className="flex items-center gap-4 md:gap-6 flex-1 justify-end">
            {/* Search Bar */}
            <div className="relative group max-w-md w-full hidden md:block">
              <input
                type="text"
                className="w-full bg-white/40 backdrop-blur-sm border-0 text-gray-900 text-sm rounded-2xl focus:ring-2 focus:ring-black/5 block pl-12 pr-10 p-3.5 shadow-sm hover:shadow-md transition-shadow placeholder-gray-500"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                  title="Clear search"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all border border-transparent hover:border-gray-200"
              >
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white overflow-hidden shadow-inner font-bold">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{user.email?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="text-left hidden lg:block pr-2 ml-1">
                  <p className="text-sm font-bold text-gray-900 leading-none mb-1">{user.name || 'User'}</p>
                  <p className="text-xs font-medium text-gray-400 leading-none">{getRoleName(user.role)}</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 transform origin-top-right transition-all">
                    <div className="px-5 py-3 border-b border-gray-50">
                      <p className="text-xs font-medium text-gray-400 mb-1">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                      >
                        <UserIcon className="w-5 h-5" />
                        Profile Settings
                      </Link>
                      <LogoutButton
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-sm font-medium"
                        icon={<ArrowRightOnRectangleIcon className="w-5 h-5 stroke-2" />}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 print:p-0">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>

        {isAdminInOwnerMode && (
          <div className="fixed bottom-6 right-6 z-50 print:hidden">
            <button
              onClick={handleLogoClickInAdminMode}
              className="bg-black/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-white/10 hover:bg-red-600 transition-all flex items-center gap-2 group"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              <span className="text-sm font-bold">exit mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
