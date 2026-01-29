'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Loader from '@/components/ui/Loader'

interface CarCatalogItem {
  id: number
  template_id: number
  license_plate: string
  price_per_day: number
  photos: string[] | null
  description: string | null
  mileage: number
  car_templates: {
    id: number
    brand_id: number
    model_id: number
    body_production_start_year: number
    car_brands?: { id: number; name: string }
    car_models?: { id: number; name: string }
    car_body_types?: { id: number; name: string }
    car_fuel_types?: { id: number; name: string }
    car_transmission_types?: { id: number; name: string }
    car_engine_volumes?: { id: number; volume: number }
  } | null
  car_colors?: { id: number; name: string; hex_code: string | null }
  companies?: { id: number; name: string }
}

interface CarsCatalogProps {
  initialCars?: CarCatalogItem[]
  initialTotal?: number
}

export default function CarsCatalog({ initialCars = [], initialTotal = 0 }: CarsCatalogProps) {
  const [cars, setCars] = useState<CarCatalogItem[]>(initialCars)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 20))
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBodyType, setSelectedBodyType] = useState<string | null>(null)

  useEffect(() => {
    // Слушаем изменения выбранного типа кузова
    const handleBodyTypeChange = () => {
      const bodyType = sessionStorage.getItem('selectedBodyType')
      setSelectedBodyType(bodyType)
      setPage(1) // Сбрасываем на первую страницу
    }

    window.addEventListener('bodyTypeChanged', handleBodyTypeChange)

    // Проверяем начальное значение
    const initialBodyType = sessionStorage.getItem('selectedBodyType')
    if (initialBodyType) {
      setSelectedBodyType(initialBodyType)
    }

    return () => {
      window.removeEventListener('bodyTypeChanged', handleBodyTypeChange)
    }
  }, [])

  const fetchCars = async (search: string = '', pageNum: number = 1, bodyTypeId: string | null = null) => {
    setLoading(true)
    try {
      const filters: any = {}
      if (search.trim()) {
        filters.q = search.trim()
      }
      if (bodyTypeId) {
        filters.body_type_id = bodyTypeId
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: '20',
        filters: JSON.stringify(filters)
      })

      const response = await fetch(`/api/public/cars?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch cars')
      }

      const data = await response.json()
      setCars(data.data || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1)
        fetchCars(searchTerm, 1, selectedBodyType)
      } else {
        fetchCars('', 1, selectedBodyType)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedBodyType])

  useEffect(() => {
    fetchCars(searchTerm, page, selectedBodyType)
  }, [page, selectedBodyType])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCars(searchTerm, 1, selectedBodyType)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price)
  }

  // Группировка автомобилей по типу кузова
  const groupedCars = cars.reduce((acc, car) => {
    const bodyType = car.car_templates?.car_body_types?.name || 'Other'
    if (!acc[bodyType]) {
      acc[bodyType] = []
    }
    acc[bodyType].push(car)
    return acc
  }, {} as Record<string, CarCatalogItem[]>)

  // Компонент для одной строки с каруселью
  const CarRow = ({ bodyType, cars: rowCars }: { bodyType: string; cars: CarCatalogItem[] }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
        setCanScrollLeft(scrollLeft > 0)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
      }
    }

    useEffect(() => {
      checkScroll()
      const container = scrollContainerRef.current
      if (container) {
        container.addEventListener('scroll', checkScroll)
        window.addEventListener('resize', checkScroll)
        return () => {
          container.removeEventListener('scroll', checkScroll)
          window.removeEventListener('resize', checkScroll)
        }
      }
    }, [rowCars])

    const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const scrollAmount = 400
        const currentScroll = scrollContainerRef.current.scrollLeft
        scrollContainerRef.current.scrollTo({
          left: currentScroll + (direction === 'left' ? -scrollAmount : scrollAmount),
          behavior: 'smooth'
        })
      }
    }

    return (
      <div className="mb-12">
        {/* Заголовок с кнопками навигации */}
        <div className="flex items-center justify-between mb-4">
          <Link href="#" className="flex items-center gap-2 group">
            <h2 className="text-2xl font-bold text-gray-900 group-hover:text-gray-500 transition-colors">
              Monthly {bodyType} rentals
            </h2>
            <ChevronRightIcon className="h-5 w-5 text-gray-900 group-hover:text-gray-500 transition-colors" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-2 rounded-full border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors flex items-center justify-center"
              aria-label="Прокрутить влево"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-2 rounded-full border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors flex items-center justify-center"
              aria-label="Прокрутить вправо"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Горизонтальная карусель */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {rowCars.map((car) => (
            <Link
              key={car.id}
              href={`/cars/${car.id}`}
              className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 flex-shrink-0 w-80"
            >
              {/* Фото */}
              <div className="relative h-48 bg-gray-200 overflow-hidden">
                {car.photos && car.photos.length > 0 && car.photos[0] ? (
                  <img
                    src={car.photos[0]}
                    alt={`${car.car_templates?.car_brands?.name || ''} ${car.car_templates?.car_models?.name || ''}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      const placeholder = (e.target as HTMLElement).parentElement?.querySelector('.placeholder')
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'flex'
                      }
                    }}
                  />
                ) : null}
                <div className={`placeholder w-full h-full flex items-center justify-center text-gray-500 ${car.photos && car.photos.length > 0 && car.photos[0] ? 'hidden' : ''}`}>
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full shadow-md">
                  <span className="text-lg font-bold text-blue-600">{formatPrice(car.price_per_day)}</span>
                  <span className="text-xs text-gray-500">/день</span>
                </div>
              </div>

              {/* Информация */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {car.car_templates?.car_brands?.name || 'Бренд'} {car.car_templates?.car_models?.name || 'Модель'}
                </h3>
                {car.car_templates?.body_production_start_year && (
                  <p className="text-sm text-gray-500 mb-2">
                    {car.car_templates.body_production_start_year} год
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {car.car_templates?.car_body_types?.name && (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded">
                      {car.car_templates.car_body_types.name}
                    </span>
                  )}
                  {car.car_templates?.car_fuel_types?.name && (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded">
                      {car.car_templates.car_fuel_types.name}
                    </span>
                  )}
                  {car.car_templates?.car_transmission_types?.name && (
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded">
                      {car.car_templates.car_transmission_types.name}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Пробег: {car.mileage.toLocaleString('ru-RU')} км</p>
                  {car.companies?.name && (
                    <p className="text-xs text-gray-500 mt-1">Company: {car.companies.name}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Список автомобилей */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader />
        </div>
      ) : cars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cars found</p>
          <p className="text-gray-500 mt-2">Try changing search parameters</p>
        </div>
      ) : (
        <>
          {Object.entries(groupedCars).map(([bodyType, groupCars]) => (
            <CarRow key={bodyType} bodyType={bodyType} cars={groupCars} />
          ))}
        </>
      )}
    </div>
  )
}
