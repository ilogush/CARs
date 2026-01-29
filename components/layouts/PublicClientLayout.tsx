'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  TruckIcon,
  KeyIcon,
  GiftIcon,
  PhoneIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  CalculatorIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

export default function PublicClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const locationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
    fetchLocations()

    // Подписываемся на изменения аутентификации
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email || null)
      } else {
        setIsAuthenticated(false)
        setUserEmail(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchLocations = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  // Закрытие меню и локаций при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (locationsRef.current && !locationsRef.current.contains(event.target as Node)) {
        setShowLocations(false)
      }
    }

    if (showMenu || showLocations) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, showLocations])

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setIsAuthenticated(true)
        setUserEmail(user.email || null)
      } else {
        setIsAuthenticated(false)
        setUserEmail(null)
      }
    } catch (error) {
      setIsAuthenticated(false)
      setUserEmail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setIsAuthenticated(false)
      setUserEmail(null)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="font-black text-xl tracking-wide">
                CARs
              </div>
            </Link>

            {/* Navigation and Auth */}
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 border rounded-full text-sm font-medium hidden md:block">
                Why choose CARs
              </button>
              {!loading && (
                <>
                  {/* Locations Dropdown */}
                  <div
                    className="relative"
                    ref={locationsRef}
                    onMouseEnter={() => setShowLocations(true)}
                    onMouseLeave={() => setShowLocations(false)}
                  >
                    <button className="p-2 rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </button>

                    {/* Locations Dropdown Menu */}
                    {showLocations && locations.length > 0 && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        <div className="max-h-80 overflow-y-auto">
                          {locations.map((location) => (
                            <Link
                              key={location.id}
                              href="#"
                              className="block px-4 py-3 hover:bg-gray-300 transition-colors text-left"
                              onClick={() => setShowLocations(false)}
                            >
                              <span className="text-sm font-medium text-gray-900">{location.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Button */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        {isAuthenticated ? (
                          <>
                            <Link
                              href="/client"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                              onClick={() => setShowMenu(false)}
                            >
                              <UserIcon className="h-5 w-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Личный кабинет</span>
                            </Link>
                            <button
                              onClick={() => {
                                handleLogout()
                                setShowMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors text-left"
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Выход</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              href="/auth/login"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                              onClick={() => setShowMenu(false)}
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Log in</span>
                            </Link>
                            <Link
                              href="/auth/register"
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                              onClick={() => setShowMenu(false)}
                            >
                              <UserPlusIcon className="h-5 w-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-900">Sign up</span>
                            </Link>
                          </>
                        )}

                        <div className="border-t border-gray-200 my-2"></div>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <TruckIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Become a host</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <KeyIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Why choose CARs</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <GiftIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Gift cards</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <PhoneIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Contact support</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Legal</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Insurance & protection</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <WrenchScrewdriverIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Host tools</span>
                        </Link>

                        <Link
                          href="#"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-300 transition-colors"
                          onClick={() => setShowMenu(false)}
                        >
                          <CalculatorIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">Carculator</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-white">
        <div className={`max-w-7xl mx-auto px-4 ${pathname === '/' ? 'pt-0 pb-4' : 'py-4'}`}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} CARs. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
