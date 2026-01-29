'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  GlobeAltIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface BodyType {
  id: number
  name: string
}

export default function HeroSection() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [where, setWhere] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [untilDate, setUntilDate] = useState('')
  const [untilTime, setUntilTime] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchBodyTypes = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('car_body_types')
          .select('id, name')
          .order('name')

        if (!error && data) {
          // Сортируем типы кузова от маленкого к минивену
          // Обычно порядок: Sedan, Hatchback, Coupe, Convertible, SUV, Wagon, Van, Minivan
          const order = ['Sedan', 'Hatchback', 'Coupe', 'Convertible', 'SUV', 'Wagon', 'Van', 'Minivan']
          const sorted = data.sort((a, b) => {
            const aIndex = order.indexOf(a.name)
            const bIndex = order.indexOf(b.name)
            if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
            if (aIndex === -1) return 1
            if (bIndex === -1) return -1
            return aIndex - bIndex
          })
          setBodyTypes(sorted)
        }
      } catch (error) {
        console.error('Error fetching body types:', error)
      }
    }

    fetchBodyTypes()
  }, [])

  // Расчет позиции дропдауна и закрытие при клике вне его области
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (inputRef.current && searchWrapperRef.current) {
        const inputRect = inputRef.current.getBoundingClientRect()
        const wrapperRect = searchWrapperRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: inputRect.bottom + 12, // Отступ между поиском и дропдауном = 12px
          left: wrapperRect.left,
          width: inputRect.width
        })
      }
    }

    if (showDropdown) {
      updateDropdownPosition()
      window.addEventListener('resize', updateDropdownPosition)
      window.addEventListener('scroll', updateDropdownPosition, true)
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Проверяем клик вне input и вне дропдауна
      const clickedOnInput = inputRef.current?.contains(target)
      const clickedOnDropdown = dropdownRef.current?.contains(target) || target.closest('.location-dropdown')

      if (!clickedOnInput && !clickedOnDropdown) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      updateDropdownPosition()
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const tabs = [
    { id: 'all', label: 'All' },
    ...bodyTypes.map((bodyType) => ({
      id: bodyType.id.toString(),
      label: bodyType.name
    }))
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="pb-8">
        <div
          className="relative rounded-2xl overflow-hidden min-h-[420px] flex items-center justify-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30 z-0"></div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-5xl text-center text-white px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-serif font-semibold">
              Skip the rental car counter
            </h1>
            <p className="mt-3 text-lg">
              Rent just about any car, just about anywhere
            </p>

            {/* SEARCH BAR WRAPPER */}
            <div ref={searchWrapperRef} className="relative mt-8">
              {/* SEARCH BAR */}
              <div className="bg-white rounded-xl shadow-xl flex flex-col md:flex-row items-stretch text-gray-900 p-2 gap-3">
                {/* WHERE */}
                <div className="flex-1 relative border-r border-gray-200 pr-3">
                  <label className="block mb-2 text-left">
                    <p className="text-xs font-semibold text-gray-500 text-left">Where</p>
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="City, airport, address or hotel"
                    className="w-full text-sm bg-transparent border-none outline-none focus:bg-gray-50 transition-colors text-left"
                  />
                </div>

                {/* FROM */}
                <div className="flex-1 border-r border-gray-200 pr-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2 text-left">From</p>
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                      <span>Add dates</span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                      <span>Add time</span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* UNTIL */}
                <div className="flex-1 border-r border-gray-200 pr-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2 text-left">Until</p>
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                      <span>Add dates</span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                      <span>Add time</span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* SEARCH BUTTON */}
                <Link
                  href="/"
                  className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 flex items-center justify-center rounded-xl"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DROPDOWN через Portal - вынесен за пределы overflow-hidden контейнера */}
      {mounted && showDropdown && createPortal(
        <div
          ref={dropdownRef}
          className="location-dropdown fixed z-50 bg-white rounded-xl shadow-lg text-left text-gray-900"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 576)}px`,
            maxWidth: '36rem'
          }}
        >
          <div className="p-4 space-y-4 text-sm">
            <div
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded -m-2"
              onClick={() => {
                setWhere('Current location')
                setShowDropdown(false)
              }}
            >
              <MapPinIcon className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Current location</p>
              </div>
            </div>

            <div
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded -m-2"
              onClick={() => {
                setWhere('Anywhere')
                setShowDropdown(false)
              }}
            >
              <GlobeAltIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-indigo-600">Anywhere</p>
                <p className="text-gray-500 text-xs">Browse all cars</p>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs uppercase text-gray-500 mb-2">Airports</p>
              <p
                className="font-medium cursor-pointer hover:text-indigo-600"
                onClick={() => {
                  setWhere('SJC – San Jose Norman Mineta Airport')
                  setShowDropdown(false)
                }}
              >
                SJC – San Jose Norman Mineta Airport
              </p>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs uppercase text-gray-500 mb-2">Cities</p>
              <p
                className="cursor-pointer hover:text-indigo-600 mb-1"
                onClick={() => {
                  setWhere('Los Angeles')
                  setShowDropdown(false)
                }}
              >
                Los Angeles
              </p>
              <p
                className="cursor-pointer hover:text-indigo-600"
                onClick={() => {
                  setWhere('San Francisco')
                  setShowDropdown(false)
                }}
              >
                San Francisco
              </p>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs uppercase text-gray-500 mb-2">Hotels</p>
              <p
                className="cursor-pointer hover:text-indigo-600"
                onClick={() => {
                  setWhere('Sheraton Grand, Los Angeles')
                  setShowDropdown(false)
                }}
              >
                Sheraton Grand, Los Angeles
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tabs Section */}
      {bodyTypes.length > 0 && (
        <section className="-mt-4 mb-8">
          <div>
            <div className="flex flex-wrap gap-2 items-center">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      let newActiveTab: string
                      if (tab.id === 'all') {
                        // "All" всегда активен при клике
                        newActiveTab = 'all'
                      } else {
                        // Для других табов: если уже активен - переключаем на "All", иначе активируем
                        newActiveTab = isActive ? 'all' : tab.id
                      }
                      setActiveTab(newActiveTab)
                      // Передаем выбранный тип кузова через sessionStorage для использования в CarsCatalog
                      if (newActiveTab === 'all') {
                        sessionStorage.removeItem('selectedBodyType')
                      } else {
                        sessionStorage.setItem('selectedBodyType', newActiveTab)
                      }
                      // Триггерим событие для обновления каталога
                      window.dispatchEvent(new Event('bodyTypeChanged'))
                    }}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-900 hover:bg-gray-300 border border-gray-200'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
