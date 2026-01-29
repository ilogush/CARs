'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, TruckIcon, UserIcon, MapPinIcon, BanknotesIcon, PrinterIcon, CubeIcon, ClockIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useToast } from '@/lib/toast'
import { Button, PrintButton } from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import CustomDatePicker from '@/components/ui/DatePicker'
import PageHeader from '@/components/ui/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { formatErrorMessage } from '@/lib/error-handler'
import { validateLatinOnly, validateEmail, validatePhone } from '@/lib/validation'
import { contractsApi, bookingsApi } from '@/lib/api/contracts'
import { clientsApi } from '@/lib/api/clients'
import { usersApi } from '@/lib/api/users'
import { contractSchema } from '@/lib/validations/contracts'

interface ContractFormProps {
  header: {
    title: string
    backHref: string
  }
  submitLabel: string
  formId: string
  initialData?: any
  companyId?: number
  initialReferences?: {
    districts: any[]
    hotels: any[]
    countries: any[]
    cities: any[]
    currencies: any[]
    availableCars: any[]
  }
}
const roundToNext10Min = (date: Date) => {
  const ms = 1000 * 60 * 10
  return new Date(Math.ceil(date.getTime() / ms) * ms)
}
const roundToNearest10Min = (date: Date) => {
  const ms = 1000 * 60 * 10
  return new Date(Math.round(date.getTime() / ms) * ms)
}

export default function ContractForm({
  header,
  submitLabel,
  formId,
  initialData,
  companyId,
  initialReferences
}: ContractFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isManager, setIsManager] = useState(false)

  // Get URL parameters for API requests
  const adminMode = searchParams.get('admin_mode') === 'true'
  const companyIdParam = searchParams.get('company_id')

  // Form state
  const [companyCarId, setCompanyCarId] = useState<string>(initialData?.company_car_id?.toString() || initialData?.car_id?.toString() || '')

  // Client details state
  const [clientEmail, setClientEmail] = useState<string>(initialData?.client?.email || initialData?.users?.email || '')
  const [clientName, setClientName] = useState<string>(initialData?.client?.name || initialData?.users?.name || '')
  const [clientSurname, setClientSurname] = useState<string>(initialData?.client?.surname || initialData?.users?.surname || '')
  const [clientPhone, setClientPhone] = useState<string>(initialData?.client?.phone || initialData?.users?.phone || '')
  const [clientWhatsapp, setClientWhatsapp] = useState<string>(initialData?.client?.second_phone || initialData?.users?.second_phone || '')
  const [clientTelegram, setClientTelegram] = useState<string>(initialData?.client?.telegram || initialData?.users?.telegram || '')
  const [clientPassport, setClientPassport] = useState<string>(initialData?.client?.passport_number || initialData?.users?.passport_number || '')
  const [clientCitizenship, setClientCitizenship] = useState<string>(initialData?.client?.citizenship || initialData?.users?.citizenship || '')
  const [clientCity, setClientCity] = useState<string>(initialData?.client?.city || initialData?.users?.city || '')
  const [clientGender, setClientGender] = useState<string>(initialData?.client?.gender || initialData?.users?.gender || '')

  const [clientId, setClientId] = useState<string>(initialData?.client_id || initialData?.user_id || '')
  const [managerId, setManagerId] = useState<string>(initialData?.manager_id || '')

  // Changed to Date | null
  const [startDate, setStartDate] = useState<Date | null>(initialData?.start_date ? new Date(initialData.start_date) : roundToNext10Min(new Date()))
  const [endDate, setEndDate] = useState<Date | null>(initialData?.end_date ? new Date(initialData.end_date) : roundToNext10Min(new Date(Date.now() + 24 * 60 * 60 * 1000)))

  const [totalAmount, setTotalAmount] = useState<string>(initialData?.total_amount?.toString() || '')
  const [depositAmount, setDepositAmount] = useState<string>(initialData?.deposit_amount?.toString() || '')
  const [notes, setNotes] = useState<string>(initialData?.notes || '')
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>(initialData?.status || 'active')
  const [isSearchingClient, setIsSearchingClient] = useState(false)
  const [formErrors, setFormErrors] = useState<{
    clientEmail?: string
    clientName?: string
    clientSurname?: string
    clientPhone?: string
    clientPassport?: string
    clientWhatsapp?: string
    clientTelegram?: string
  }>({})

  // Photo states
  const [carPhotos, setCarPhotos] = useState<string[]>(initialData?.photos?.filter((p: string) => !p.includes('_passport_') && !p.includes('_license_')) || [])
  const [passportPhotos, setPassportPhotos] = useState<string[]>(initialData?.photos?.filter((p: string) => p.includes('_passport_')) || [])
  const [licensePhotos, setLicensePhotos] = useState<string[]>(initialData?.photos?.filter((p: string) => p.includes('_license_')) || [])

  // Data for dropdowns
  const [availableCars, setAvailableCars] = useState<any[]>(initialReferences?.availableCars || [])

  const [locations, setLocations] = useState<any[]>(initialReferences?.districts || [])
  const [selectedCar, setSelectedCar] = useState<any>(null)
  const [bookingSelectedCar, setBookingSelectedCar] = useState<any>(null)
  const [daysCount, setDaysCount] = useState(0)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [loadingBooking, setLoadingBooking] = useState(false)

  // Extra fields (saved to notes)
  const [startMileage, setStartMileage] = useState<string>('')
  const [fuelLevel, setFuelLevel] = useState<string>('Full')
  const [pickupLocationId, setPickupLocationId] = useState<string>('')
  const [returnLocationId, setReturnLocationId] = useState<string>('')
  const [cleanliness, setCleanliness] = useState<string>('Clean')

  // Extras
  const [hasIslandTrip, setHasIslandTrip] = useState(false)
  const [hasFullInsurance, setHasFullInsurance] = useState(false)
  const [hasBabySeat, setHasBabySeat] = useState(false)
  const [islandTripPrice, setIslandTripPrice] = useState<string>('')
  const [fullInsurancePrice, setFullInsurancePrice] = useState<string>('')
  const [babySeatPrice, setBabySeatPrice] = useState<string>('')
  const [hasKrabiTrip, setHasKrabiTrip] = useState(false)
  const [krabiTripPrice, setKrabiTripPrice] = useState<string>('')


  const [hotels, setHotels] = useState<any[]>(initialReferences?.hotels || [])
  const [countries, setCountries] = useState<any[]>(initialReferences?.countries || [])
  const [cities, setCities] = useState<any[]>(initialReferences?.cities || [])
  const [currencies, setCurrencies] = useState<any[]>(initialReferences?.currencies || [])
  const [deliveryPrices, setDeliveryPrices] = useState<Record<string, string>>({})
  const [deliveryCost, setDeliveryCost] = useState('')
  const [returnCost, setReturnCost] = useState('')
  const [totalCurrency, setTotalCurrency] = useState('THB')
  const [depositCurrency, setDepositCurrency] = useState('THB')
  const [showCitizenshipSuggestions, setShowCitizenshipSuggestions] = useState(false)
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [hotelSearch, setHotelSearch] = useState<string>('')
  const [roomNumber, setRoomNumber] = useState<string>('')
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false)

  const [isEditing, setIsEditing] = useState(!initialData)

  // Load current user and set manager_id if user is manager
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await usersApi.getMe()
        if (user) {
          setCurrentUser(user)
          if (user.role === 'manager') {
            setIsManager(true)
            setManagerId(user.id)
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }
    fetchCurrentUser()
  }, [])

  // Load booking_id from URL
  useEffect(() => {
    const bookingIdParam = searchParams.get('booking_id')
    if (bookingIdParam) {
      setBookingId(bookingIdParam)
      loadBookingData(bookingIdParam)
    }
  }, [searchParams])

  // Load delivery prices if not provided or if we need them specifically for the company
  useEffect(() => {
    if (!initialReferences && companyId) {
       loadData()
    } else if (companyId || companyIdParam) {
       // We still need to load delivery prices as they are company-specific
       fetchDeliveryPrices()
    }
  }, [companyId, companyIdParam, initialReferences])

  async function fetchDeliveryPrices() {
    try {
      const supabase = createClient()
      const compId = companyId || companyIdParam
      if (!compId) return

      const { data: pricesData } = await supabase
        .from('company_delivery_prices')
        .select('district_id, price')
        .eq('company_id', compId)
        .eq('is_active', true)

      if (pricesData) {
        const pricesMap: Record<string, string> = {}
        pricesData.forEach((p: any) => {
          pricesMap[p.district_id.toString()] = p.price.toString()
        })
        setDeliveryPrices(pricesMap)
      }
    } catch (error) {
      console.error('Error loading delivery prices:', error)
    }
  }

  // Calculate days and total amount
  useEffect(() => {
    if (startDate && endDate) {
      if (endDate > startDate) {
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        setDaysCount(days)
        if (selectedCar && selectedCar.price_per_day) {
          const total = days * parseFloat(selectedCar.price_per_day)
          setTotalAmount(total.toFixed(2))
        }
      }
    }
  }, [startDate, endDate, selectedCar])

  // Update selected car
  useEffect(() => {
    if (companyCarId) {
      const isDifferentCar = !selectedCar || selectedCar.id.toString() !== companyCarId
      const car = availableCars.find(c => c.id.toString() === companyCarId)

      if (car) {
        setSelectedCar(car)
        if (isDifferentCar) setStartMileage(car.mileage?.toString() || '')
      } else if (initialData?.company_cars && initialData.company_cars.id.toString() === companyCarId) {
        setSelectedCar(initialData.company_cars)
        // Don't overwrite mileage from master record when editing existing contract
        // We rely on the mileage saved in notes
      } else if (bookingSelectedCar && bookingSelectedCar.id.toString() === companyCarId) {
        setSelectedCar(bookingSelectedCar)
        if (isDifferentCar) setStartMileage(bookingSelectedCar.mileage?.toString() || '')
      }
    }
  }, [companyCarId, availableCars, initialData, bookingSelectedCar])

  // Split effect for amount calculation to avoid unnecessary mileage resets
  useEffect(() => {
    if (selectedCar && startDate && endDate) {
      if (endDate > startDate) {
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        setDaysCount(days)
        if (selectedCar.price_per_day) {
          const total = days * parseFloat(selectedCar.price_per_day)
          setTotalAmount(total.toFixed(2))
        }
      }
    }
  }, [startDate, endDate, selectedCar])

  // Look up client by email
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientEmail && clientEmail.includes('@') && !initialData && !clientId) {
        setIsSearchingClient(true)
        try {
          const { user } = await clientsApi.search(clientEmail)
          if (user) {
            setClientId(user.id)
            setClientName(user.name || '')
            setClientSurname(user.surname || '')
            setClientPhone(user.phone || '')
            setClientWhatsapp(user.second_phone || '')
            setClientTelegram(user.telegram || '')
            setClientPassport(user.passport_number || '')
            setClientCitizenship(user.citizenship || '')
            setClientCity(user.city || '')
            setClientGender(user.gender || '')
            toast.success('Found existing client')
          }
        } catch (error) {
          console.error('Error searching client:', error)
        } finally {
          setIsSearchingClient(false)
        }
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [clientEmail])

  // Look up client by passport number
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientPassport && clientPassport.length >= 3 && !initialData && !clientId) {
        setIsSearchingClient(true)
        try {
          const response = await fetch(`/api/clients?passport=${encodeURIComponent(clientPassport)}`)
          if (response.ok) {
            const { data } = await response.json()
            if (data && data.length > 0) {
              const user = data[0]
              if (user.deleted_at) {
                setIsSearchingClient(false)
                return
              }
              setClientId(user.id)
              setClientName(user.name || '')
              setClientSurname(user.surname || '')
              setClientEmail(user.email || '')
              setClientPhone(user.phone || '')
              setClientWhatsapp(user.second_phone || '')
              setClientTelegram(user.telegram || '')
              setClientCitizenship(user.citizenship || '')
              setClientCity(user.city || '')
              setClientGender(user.gender || '')
              toast.success('Found existing client by passport')
            }
          }
        } catch (error) {
          console.error('Error searching client by passport:', error)
        } finally {
          setIsSearchingClient(false)
        }
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [clientPassport])

  async function loadBookingData(bookingId: string) {
    setLoadingBooking(true)
    try {
      const booking = await bookingsApi.getBooking(parseInt(bookingId), {
        admin_mode: adminMode,
        company_id: companyIdParam ? parseInt(companyIdParam) : undefined
      })

      if (booking) {
        // ... mapped booking data ...
        if (booking.company_cars) {
          // @ts-ignore
          setCompanyCarId(booking.company_cars.id?.toString() || booking.company_car_id.toString())
          setBookingSelectedCar(booking.company_cars)
        } else if (booking.company_car_id) {
          setCompanyCarId(booking.company_car_id.toString())
        }

        // Handle client_id (can be in .users or direct) - booking type has .client_id as string
        if (booking.client_id) {
          setClientId(booking.client_id)
        }

        if (booking.start_date) {
          setStartDate(new Date(booking.start_date))
        }
        if (booking.end_date) {
          setEndDate(new Date(booking.end_date))
        }
        if (booking.total_amount) {
          setTotalAmount(booking.total_amount.toString())
        }
        if (booking.notes) {
          setNotes(booking.notes)
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error)
      toast.error('Failed to load booking data')
    } finally {
      setLoadingBooking(false)
    }
  }

  async function loadData() {
    // Legacy client-side data loading. 
    // Now data is mostly passed via initialReferences prop from server.
    if (initialReferences) return;
    
    try {
      setLoading(true)
      const params = {
        admin_mode: adminMode,
        company_id: companyIdParam ? parseInt(companyIdParam) : undefined
      }

      const supabase = createClient()
      const locationId = 4 // Phuket

      await Promise.all([
        contractsApi.getReferenceData(params).then(({ data: refs }) => {
          if (refs && refs.cars) setAvailableCars(refs.cars)
        }),
        supabase.from('districts').select('id, name').eq('location_id', locationId).order('name').then(({ data }) => data && setLocations(data)),
        supabase.from('hotels').select('id, name, district_id').eq('location_id', locationId).eq('is_active', true).order('name').then(({ data }) => data && setHotels(data)),
        supabase.from('countries').select('name').order('name').then(({ data }) => data && setCountries(data)),
        supabase.from('cities').select('name').order('name').then(({ data }) => data && setCities(data)),
        supabase.from('currencies').select('id, code, symbol').eq('is_active', true).order('name').then(({ data }) => data && setCurrencies(data))
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  // Effect to restore state from notes if editing
  useEffect(() => {
    if (initialData?.notes && (locations.length > 0 || hotels.length > 0)) {
      const noteLines = initialData.notes.split('\n')

      const mileageLine = noteLines.find((l: string) => l.startsWith('Start Mileage: '))
      if (mileageLine) setStartMileage(mileageLine.replace('Start Mileage: ', '').trim())

      const waLine = noteLines.find((l: string) => l.startsWith('WhatsApp: '))
      if (waLine) setClientWhatsapp(waLine.replace('WhatsApp: ', '').trim())

      const tgLine = noteLines.find((l: string) => l.startsWith('Telegram: '))
      if (tgLine) setClientTelegram(tgLine.replace('Telegram: ', '').trim())

      const pickupLine = noteLines.find((l: string) => l.startsWith('Pickup District: '))
      if (pickupLine && !pickupLocationId) {
        const name = pickupLine.replace('Pickup District: ', '').trim()
        const found = locations.find(l => l.name === name)
        if (found) setPickupLocationId(found.id.toString())
      }

      const returnLine = noteLines.find((l: string) => l.startsWith('District: '))
      if (returnLine && !returnLocationId) {
        const name = returnLine.replace('District: ', '').trim()
        const found = locations.find(l => l.name === name)
        if (found) setReturnLocationId(found.id.toString())
      }

      const fuelLine = noteLines.find((l: string) => l.startsWith('Fuel Level: '))
      if (fuelLine) {
        setFuelLevel(fuelLine.replace('Fuel Level: ', '').trim())
      }

      const cleanLine = noteLines.find((l: string) => l.startsWith('Cleanliness: '))
      if (cleanLine) {
        setCleanliness(cleanLine.replace('Cleanliness: ', '').trim())
      }

      const totalCurrLine = noteLines.find((l: string) => l.startsWith('Total Currency: '))
      if (totalCurrLine) setTotalCurrency(totalCurrLine.replace('Total Currency: ', '').trim())

      const depositCurrLine = noteLines.find((l: string) => l.startsWith('Deposit Currency: '))
      if (depositCurrLine) setDepositCurrency(depositCurrLine.replace('Deposit Currency: ', '').trim())

      const deliveryCostLine = noteLines.find((l: string) => l.startsWith('Delivery Price: '))
      if (deliveryCostLine) setDeliveryCost(deliveryCostLine.replace('Delivery Price: ', '').trim())

      const returnCostLine = noteLines.find((l: string) => l.startsWith('Return Price: '))
      if (returnCostLine) setReturnCost(returnCostLine.replace('Return Price: ', '').trim())

      const islandPriceLine = noteLines.find((l: string) => l.startsWith('Island Trip Price: '))
      if (islandPriceLine) setIslandTripPrice(islandPriceLine.replace('Island Trip Price: ', '').trim())

      const krabiPriceLine = noteLines.find((l: string) => l.startsWith('Krabi Trip Price: '))
      if (krabiPriceLine) setKrabiTripPrice(krabiPriceLine.replace('Krabi Trip Price: ', '').trim())

      const insurancePriceLine = noteLines.find((l: string) => l.startsWith('Full Insurance Price: '))
      if (insurancePriceLine) setFullInsurancePrice(insurancePriceLine.replace('Full Insurance Price: ', '').trim())

      const babyPriceLine = noteLines.find((l: string) => l.startsWith('Baby Seat Price: '))
      if (babyPriceLine) setBabySeatPrice(babyPriceLine.replace('Baby Seat Price: ', '').trim())

      // Citizenship/City backup restore
      const citizenshipLine = noteLines.find((l: string) => l.startsWith('Citizenship: '))
      if (citizenshipLine && !clientCitizenship) setClientCitizenship(citizenshipLine.replace('Citizenship: ', '').trim())

      const cityLine = noteLines.find((l: string) => l.startsWith('City: '))
      if (cityLine && !clientCity) setClientCity(cityLine.replace('City: ', '').trim())

      if (noteLines.some((l: string) => l.includes('Island Trip: Yes'))) setHasIslandTrip(true)
      if (noteLines.some((l: string) => l.includes('Full Insurance: Yes'))) setHasFullInsurance(true)
      if (noteLines.some((l: string) => l.includes('Baby Seat: Yes'))) setHasBabySeat(true)
      if (noteLines.some((l: string) => l.includes('Krabi Trip: Yes'))) setHasKrabiTrip(true)

      const hotelLine = noteLines.find((l: string) => l.startsWith('Hotel: '))
      if (hotelLine && !hotelSearch) {
        const name = hotelLine.replace('Hotel: ', '').trim()
        setHotelSearch(name)
      }

      const roomLine = noteLines.find((l: string) => l.startsWith('Room Number: '))
      if (roomLine) {
        setRoomNumber(roomLine.replace('Room Number: ', '').trim())
      }

      // Cleanup notes field to remove system lines so they don't get duplicated on save
      const systemPrefixes = [
        'Start Mileage:', 'Fuel Level:', 'Pickup District:', 'District:',
        'Hotel:', 'Room Number:', 'WhatsApp:', 'Telegram:', 'Cleanliness:',
        'Island Trip:', 'Full Insurance:', 'Baby Seat:', 'Krabi Trip:',
        'Total Currency:', 'Deposit Currency:',
        'Island Trip Price:', 'Krabi Trip Price:', 'Full Insurance Price:', 'Baby Seat Price:',
        'Citizenship:', 'City:', 'Delivery Price:', 'Return Price:'
      ]

      const cleanLines = noteLines.filter((l: string) => !systemPrefixes.some(p => l.startsWith(p)))
      const cleanNotes = cleanLines.join('\n').trim()

      // Only update if we haven't touched the notes yet (it matches initial raw string)
      if (notes === initialData.notes) {
        setNotes(cleanNotes)
      }
    }
  }, [initialData, locations, hotels])

  // Auto-update delivery costs when location changes
  useEffect(() => {
    // Only auto-set if we are editing or creating, and NOT parsing from notes (which is done in initial load)
    // However, logic is simplified: if user changes location, update price.
    // If it's initial load, the parsing logic above handles overriding this if the user manually changed it previously?
    // Actually, persistence check runs ONCE.
    // This effect runs whenever pickupLocationId changes.
    // We should be careful not to overwrite saved custom price if location didn't meaningful change?
    // But usually if location changes, price should update.
    if (pickupLocationId && deliveryPrices[pickupLocationId]) {
      // Check if we already have a value?
      // For now, simple logic: update it.
      setDeliveryCost(deliveryPrices[pickupLocationId])
    } else if (pickupLocationId && !deliveryPrices[pickupLocationId]) {
      // If no configured price, maybe 0?
      // setDeliveryCost('0')
    }
  }, [pickupLocationId, deliveryPrices])

  useEffect(() => {
    if (returnLocationId && deliveryPrices[returnLocationId]) {
      setReturnCost(deliveryPrices[returnLocationId])
    }
  }, [returnLocationId, deliveryPrices])

  const validateForm = () => {
    const errors: typeof formErrors = {}
    let isValid = true

    if (clientEmail) {
      const emailErr = validateEmail(clientEmail)
      if (emailErr) { errors.clientEmail = emailErr; isValid = false }
    }

    const nameErr = validateLatinOnly(clientName, 'First Name')
    if (nameErr) { errors.clientName = nameErr; isValid = false }

    const surnameErr = validateLatinOnly(clientSurname, 'Last Name')
    if (surnameErr) { errors.clientSurname = surnameErr; isValid = false }

    const phoneErr = validatePhone(clientPhone)
    if (phoneErr) { errors.clientPhone = phoneErr; isValid = false }

    if (clientWhatsapp) {
      const waErr = validatePhone(clientWhatsapp)
      if (waErr) { errors.clientWhatsapp = waErr; isValid = false }
    }

    if (clientTelegram) {
      const tgErr = validateLatinOnly(clientTelegram, 'Telegram')
      if (tgErr) { errors.clientTelegram = tgErr; isValid = false }
    }

    const passportErr = validateLatinOnly(clientPassport, 'Passport Number')
    if (passportErr) { errors.clientPassport = passportErr; isValid = false }

    // Mandatory fields check
    if (!fuelLevel) {
      toast.error('Fuel Level is required')
      isValid = false
    }
    if (!cleanliness) {
      toast.error('Cleanliness is required')
      isValid = false
    }

    if (!pickupLocationId) {
      toast.error('Pickup District is required')
      isValid = false
    }

    if (!returnLocationId) {
      toast.error('District is required')
      isValid = false
    }

    // Start Mileage Check
    if (!startMileage) {
      toast.error('Start Mileage is required')
      isValid = false
    } else if (selectedCar && parseFloat(startMileage) < (selectedCar.mileage || 0)) {
      toast.error(`Start Mileage cannot be less than current car mileage (${selectedCar.mileage || 0} km)`)
      isValid = false
    }

    setFormErrors(errors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix form errors')
      return
    }

    setLoading(true)

    // Final Validations
    if (!totalAmount) { toast.error('Total amount is required'); setLoading(false); return }

    try {
      let finalClientId = clientId

      // 1. Create client if we don't have a finalClientId (Contract flow)
      if (!finalClientId && !initialData) {
        // Generate placeholder email if empty
        const effectiveEmail = clientEmail || `${clientPhone.replace(/\D/g, '') || clientPassport.replace(/\s/g, '') || Date.now()}@noemail.com`.toLowerCase()

        const clientData = await clientsApi.create({
          email: effectiveEmail,
          name: clientName,
          surname: clientSurname,
          phone: clientPhone,
          second_phone: clientWhatsapp,
          telegram: clientTelegram,
          passport_number: clientPassport,
          citizenship: clientCitizenship,
          city: clientCity,
          password: Math.random().toString(36).slice(-10),
          company_id: companyId || companyIdParam
        })

        // @ts-ignore
        finalClientId = clientData.user_id || clientData.id
        setClientId(finalClientId)
      }

      const url = initialData
        ? `/api/contracts/${initialData.id}`
        : '/api/contracts'

      const method = initialData ? 'PUT' : 'POST'

      if (!finalClientId) throw new Error('Client is required')

      const effectiveManagerId = managerId || currentUser?.id
      if (!effectiveManagerId) throw new Error('Manager is required')

      const allPhotos = [
        ...carPhotos,
        ...passportPhotos,
        ...licensePhotos
      ]

      const requestBody: any = {
        company_car_id: companyCarId, // Will be coerced to number by Zod
        client_id: finalClientId,
        manager_id: effectiveManagerId,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
        total_amount: totalAmount, // Will be coerced
        notes: [
          notes,
          startMileage ? `Start Mileage: ${startMileage}` : '',
          fuelLevel ? `Fuel Level: ${fuelLevel}` : '',
          pickupLocationId ? `Pickup District: ${locations.find((l: any) => l.id.toString() === pickupLocationId)?.name}` : '',
          returnLocationId ? `District: ${locations.find((l: any) => l.id.toString() === returnLocationId)?.name}` : '',
          hotelSearch ? `Hotel: ${hotelSearch}` : '',
          roomNumber ? `Room Number: ${roomNumber}` : '',
          clientWhatsapp ? `WhatsApp: ${clientWhatsapp}` : '',
          clientTelegram ? `Telegram: ${clientTelegram}` : '',
          cleanliness ? `Cleanliness: ${cleanliness}` : '',
          hasKrabiTrip ? 'Krabi Trip: Yes' : '',
          hasFullInsurance ? 'Full Insurance: Yes' : '',
          hasBabySeat ? 'Baby Seat: Yes' : '',
          totalCurrency !== 'THB' ? `Total Currency: ${totalCurrency}` : '',
          depositCurrency !== 'THB' ? `Deposit Currency: ${depositCurrency}` : '',
          deliveryCost ? `Delivery Price: ${deliveryCost}` : '',
          returnCost ? `Return Price: ${returnCost}` : '',
          islandTripPrice ? `Island Trip Price: ${islandTripPrice}` : '',
          krabiTripPrice ? `Krabi Trip Price: ${krabiTripPrice}` : '',
          fullInsurancePrice ? `Full Insurance Price: ${fullInsurancePrice}` : '',
          babySeatPrice ? `Baby Seat Price: ${babySeatPrice}` : '',
          clientCitizenship ? `Citizenship: ${clientCitizenship}` : '',
          clientCity ? `City: ${clientCity}` : ''
        ].filter(Boolean).join('\n').trim() || null,
        photos: allPhotos,
        deposit_amount: depositAmount === '' ? 0 : depositAmount,
        // Optional fields passed for Zod but handled by backend logic too if needed or just allowed
        booking_id: bookingId ? parseInt(bookingId) : null,
        status: initialData ? status : undefined
      }

      // OPTIONAL: Client-side Zod Validation (Double Check)
      // This ensures we catch errors before network request
      // We use a try-catch block specifically for validation to show nice toast
      // Client-side Zod Validation
      const validationResult = contractSchema.safeParse(requestBody)
      if (!validationResult.success) {
        const errors = (validationResult.error as any).errors.map((e: any) => e.message).join('\n')
        toast.error('Validation Error:\n' + errors)
        setLoading(false)
        return
      }

      if (initialData) {
        await contractsApi.updateContract(initialData.id, requestBody)
      } else {
        await contractsApi.createContract(requestBody)
      }

      toast.success(initialData ? 'Contract updated successfully' : 'Contract created successfully')
      router.push(header.backHref)
    } catch (error: any) {
      console.error('Error saving contract:', error)
      toast.error(formatErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoUpload(files: FileList, type: 'car' | 'passport' | 'license') {
    const supabase = createClient()
    const newUrls: string[] = []

    setLoading(true)
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const suffix = type === 'car' ? '' : `_${type}_`
        const fileName = `${Math.random().toString(36).substring(2)}${suffix}.${fileExt}`
        const filePath = `contracts/${fileName}`

        const { error } = await supabase.storage
          .from('photos')
          .upload(filePath, file)

        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      if (type === 'car') setCarPhotos(prev => [...prev, ...newUrls].slice(0, 12))
      else if (type === 'passport') setPassportPhotos(prev => [...prev, ...newUrls].slice(0, 2))
      else if (type === 'license') setLicensePhotos(prev => [...prev, ...newUrls].slice(0, 2))

      if (newUrls.length > 0) {
        toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={initialData?.id ? `${header.title} #${initialData.id.toString().padStart(3, '0')}` : header.title}
        leftActions={
          <Link
            href={header.backHref}
            className="p-2 hover:bg-gray-300 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
        }
        rightActions={
          <div className="flex items-center gap-2">
            {initialData?.id && (
              <PrintButton onClick={() => window.print()} className="!py-2 !px-4" />
            )}
            {initialData && !isEditing ? (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="min-w-[100px] !py-2 !px-4"
              >
                Edit
              </Button>
            ) : (
              <>

                <Button
                  form={formId}
                  type="submit"
                  loading={loading || loadingBooking}
                  disabled={loading || loadingBooking}
                  className="min-w-[100px] !py-2 !px-4"
                >
                  {initialData ? 'Save' : submitLabel}
                </Button>
              </>
            )}
          </div>
        }
      />



      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {/* Error/Loading notifications */}
        {loadingBooking && (
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center mb-6">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-3"></div>
            Loading booking data...
          </div>
        )}

        {/* Section 1: Car */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <TruckIcon className="w-6 h-6" />
            Car
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Car *</label>
              {initialData ? (
                <input
                  type="text"
                  disabled
                  value={
                    selectedCar
                      ? `${selectedCar.car_templates?.car_brands?.name} ${selectedCar.car_templates?.car_models?.name} - #${selectedCar.license_plate}`
                      : initialData.company_cars
                        ? `${initialData.company_cars.car_templates?.car_brands?.name} ${initialData.company_cars.car_templates?.car_models?.name} - #${initialData.company_cars.license_plate}`
                        : 'Loading car...'
                  }
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              ) : (
                <select
                  required
                  value={companyCarId}
                  onChange={(e) => setCompanyCarId(e.target.value)}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 cursor-not-allowed"
                  disabled={loadingBooking || !isEditing}
                >
                  <option value="">Select car</option>
                  {availableCars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.car_templates?.car_brands?.name} {car.car_templates?.car_models?.name} - #{car.license_plate}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Fuel Level *</label>
              <select
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              >
                <option value="Full">Full (8/8)</option>
                <option value="7/8">7/8 (87.5%)</option>
                <option value="6/8">6/8 (75%)</option>
                <option value="5/8">5/8 (62.5%)</option>
                <option value="Half">Half (4/8)</option>
                <option value="3/8">3/8 (37.5%)</option>
                <option value="2/8">2/8 (25%)</option>
                <option value="1/8">1/8 (12.5%)</option>
                <option value="Empty">Empty</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Cleanliness *</label>
              <select
                value={cleanliness}
                onChange={(e) => setCleanliness(e.target.value)}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              >
                <option value="Clean">Clean</option>
                <option value="Dirty">Dirty</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Start Mileage *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  value={startMileage}
                  onChange={(e) => setStartMileage(e.target.value)}
                  disabled={!isEditing}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pr-12 disabled:bg-gray-50"
                  placeholder="0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">km</span>
              </div>
            </div>

          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="block text-xs text-gray-600">Car Photos (max 12)</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {carPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square group">
                  <img
                    src={photo}
                    alt={`Car ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => isEditing && setCarPhotos(carPhotos.filter((_, i) => i !== index))}
                    className={`absolute top-2 right-2 p-1 bg-white/80 rounded-full transition-opacity ${isEditing ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {isEditing && carPhotos.length < 12 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="file" className="hidden" multiple onChange={(e) => e.target.files && handlePhotoUpload(e.target.files, 'car')} />
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Rental Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Rental Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Start Date *</label>
              <CustomDatePicker
                selected={startDate}
                onChange={(date) => {
                  const newDate = date || new Date()
                  if (startDate) {
                    newDate.setHours(startDate.getHours(), startDate.getMinutes())
                  } else {
                    newDate.setHours(9, 0) // Default 09:00
                  }
                  setStartDate(newDate)
                }}
                disabled={loadingBooking || !isEditing}
                required
                dateFormat="dd.MM.yyyy"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Start Time *</label>
              <CustomDatePicker
                selected={startDate}
                onChange={(date) => {
                  if (date) {
                    setStartDate(date)
                    if (endDate) {
                      const newEndDate = new Date(endDate)
                      newEndDate.setHours(date.getHours(), date.getMinutes())
                      setEndDate(newEndDate)
                    }
                  }
                }}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={10}
                timeCaption="Time"
                dateFormat="HH:mm"
                placeholderText="--:--"
                icon={ClockIcon}
                disabled={loadingBooking || !isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">End Date *</label>
              <CustomDatePicker
                selected={endDate}
                onChange={(date) => {
                  const newDate = date || new Date()
                  if (endDate) {
                    newDate.setHours(endDate.getHours(), endDate.getMinutes())
                  } else if (startDate) {
                    // Default to start time
                    newDate.setHours(startDate.getHours(), startDate.getMinutes())
                  } else {
                    newDate.setHours(9, 0)
                  }
                  setEndDate(newDate)
                }}
                minDate={startDate || undefined}
                disabled={loadingBooking || !isEditing}
                required
                dateFormat="dd.MM.yyyy"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">End Time *</label>
              <CustomDatePicker
                selected={endDate}
                onChange={(date) => {
                  if (date) setEndDate(date)
                }}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={10}
                timeCaption="Time"
                dateFormat="HH:mm"
                placeholderText="--:--"
                icon={ClockIcon}
                disabled={loadingBooking || !isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Pickup District *</label>
              <select
                required
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              >
                <option value="">Select district</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">District *</label>
              <select
                required
                value={returnLocationId}
                onChange={(e) => setReturnLocationId(e.target.value)}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              >
                <option value="">Select district</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>





            {/* Hotel Selection */}
            {/* Hotel Selection (Manual + Suggestions) */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs text-gray-600">Hotel {pickupLocationId ? '(in selected district)' : ''}</label>
              <input
                type="text"
                value={hotelSearch}
                onChange={(e) => {
                  setHotelSearch(e.target.value)
                  setShowHotelSuggestions(true)
                }}
                onFocus={() => setShowHotelSuggestions(true)}
                // Delay hiding to allow clicking suggestions
                onBlur={() => setTimeout(() => setShowHotelSuggestions(false), 200)}
                disabled={!isEditing}
                placeholder="Type or select hotel..."
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              />

              {/* Hotel Suggestions */}
              {showHotelSuggestions && isEditing && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {hotels
                    .filter(h => {
                      const districtMatch = !pickupLocationId || h.district_id?.toString() === pickupLocationId
                      const textMatch = !hotelSearch || h.name.toLowerCase().includes(hotelSearch.toLowerCase())
                      return districtMatch && textMatch
                    })
                    .slice(0, 50) // Limit results
                    .map((hotel) => (
                      <button
                        key={hotel.id}
                        type="button"
                        onClick={() => {
                          setHotelSearch(hotel.name)
                          setShowHotelSuggestions(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {hotel.name}
                      </button>
                    ))}
                  {hotels.filter(h => (!pickupLocationId || h.district_id?.toString() === pickupLocationId) && (!hotelSearch || h.name.toLowerCase().includes(hotelSearch.toLowerCase()))).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">No existing hotels match</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                disabled={!isEditing}
                placeholder="Room..."
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              />
            </div>
          </div>


        </div>

        {/* Section 2: Client Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <UserIcon className="w-6 h-6" />
            Client Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Passport Number *</label>
              <input
                type="text"
                required
                value={clientPassport}
                onChange={(e) => {
                  setClientPassport(e.target.value)
                  if (formErrors.clientPassport) setFormErrors(prev => ({ ...prev, clientPassport: undefined }))
                }}
                disabled={!isEditing}
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientPassport ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Passport ID"
              />
              {formErrors.clientPassport && <p className="mt-1 text-sm text-red-600">{formErrors.clientPassport}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">First Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value)
                  if (formErrors.clientName) setFormErrors(prev => ({ ...prev, clientName: undefined }))
                }}
                disabled={!isEditing}
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientName ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="John"
              />
              {formErrors.clientName && <p className="mt-1 text-sm text-red-600">{formErrors.clientName}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Last Name *</label>
              <input
                type="text"
                required
                value={clientSurname}
                onChange={(e) => {
                  setClientSurname(e.target.value)
                  if (formErrors.clientSurname) setFormErrors(prev => ({ ...prev, clientSurname: undefined }))
                }}
                disabled={!isEditing}
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientSurname ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Doe"
              />
              {formErrors.clientSurname && <p className="mt-1 text-sm text-red-600">{formErrors.clientSurname}</p>}
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-xs text-gray-600">Citizenship</label>
              <input
                type="text"
                value={clientCitizenship}
                onChange={(e) => {
                  setClientCitizenship(e.target.value)
                  setShowCitizenshipSuggestions(true)
                }}
                onFocus={() => setShowCitizenshipSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCitizenshipSuggestions(false), 200)}
                disabled={!isEditing}
                className="block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 border-gray-200"
                placeholder="Citizenship"
              />
              {showCitizenshipSuggestions && isEditing && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {countries
                    .filter(c => !clientCitizenship || c.name.toLowerCase().includes(clientCitizenship.toLowerCase()))
                    .slice(0, 50)
                    .map((country, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setClientCitizenship(country.name)
                          setShowCitizenshipSuggestions(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {country.name}
                      </button>
                    ))}
                  {countries.filter(c => !clientCitizenship || c.name.toLowerCase().includes(clientCitizenship.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">No matches</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-xs text-gray-600">City</label>
              <input
                type="text"
                value={clientCity}
                onChange={(e) => {
                  setClientCity(e.target.value)
                  setShowCitySuggestions(true)
                }}
                onFocus={() => setShowCitySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                disabled={!isEditing}
                className="block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 border-gray-200"
                placeholder="City"
              />
              {showCitySuggestions && isEditing && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {cities
                    .filter(c => !clientCity || c.name.toLowerCase().includes(clientCity.toLowerCase()))
                    .slice(0, 50)
                    .map((city, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setClientCity(city.name)
                          setShowCitySuggestions(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {city.name}
                      </button>
                    ))}
                  {cities.filter(c => !clientCity || c.name.toLowerCase().includes(clientCity.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">No matches</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Gender</label>
              <select
                value={clientGender || ''}
                onChange={(e) => {
                  setClientGender(e.target.value)
                }}
                disabled={!isEditing}
                className="block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 border-gray-200"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Phone *</label>
              <input
                type="text"
                required
                value={clientPhone}
                onChange={(e) => {
                  let val = e.target.value
                  if (val.startsWith('8')) val = '+7' + val.substring(1)
                  else if (val.startsWith('0')) val = '+66' + val.substring(1)
                  setClientPhone(val)
                  if (formErrors.clientPhone) setFormErrors(prev => ({ ...prev, clientPhone: undefined }))
                }}
                disabled={!isEditing}
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientPhone ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="+123456789"
              />
              {formErrors.clientPhone && <p className="mt-1 text-sm text-red-600">{formErrors.clientPhone}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">WhatsApp</label>
              <input
                type="text"
                value={clientWhatsapp}
                onChange={(e) => {
                  let val = e.target.value
                  if (val.startsWith('8')) val = '+7' + val.substring(1)
                  else if (val.startsWith('0')) val = '+66' + val.substring(1)
                  setClientWhatsapp(val)
                  if (formErrors.clientWhatsapp) setFormErrors(prev => ({ ...prev, clientWhatsapp: undefined }))
                }}
                disabled={!isEditing}
                className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientWhatsapp ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="+123456789"
              />
              {formErrors.clientWhatsapp && <p className="mt-1 text-sm text-red-600">{formErrors.clientWhatsapp}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Telegram</label>
              <div className="relative">
                <input
                  type="text"
                  value={clientTelegram}
                  onChange={(e) => {
                    setClientTelegram(e.target.value)
                    if (formErrors.clientTelegram) setFormErrors(prev => ({ ...prev, clientTelegram: undefined }))
                  }}
                  disabled={!isEditing}
                  className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pl-8 disabled:bg-gray-50 ${formErrors.clientTelegram ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="username"
                />
                <span className="absolute left-3 top-2 text-gray-500 sm:text-sm pointer-events-none">@</span>
              </div>
              {formErrors.clientTelegram && <p className="mt-1 text-sm text-red-600">{formErrors.clientTelegram}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value)
                    if (clientId) setClientId('')
                    if (formErrors.clientEmail) setFormErrors(prev => ({ ...prev, clientEmail: undefined }))
                  }}
                  disabled={!isEditing}
                  className={`block w-full rounded-lg shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 ${formErrors.clientEmail ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="client@example.com"
                />
                {isSearchingClient && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-xs text-gray-600">Passport Photos (2)</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {passportPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img src={photo} className="w-full h-full object-cover rounded-lg border" />
                    <button type="button" onClick={() => isEditing && setPassportPhotos(passportPhotos.filter((_, i) => i !== index))} className={`absolute top-2 right-2 p-1 bg-white/80 rounded-full transition-opacity ${isEditing ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {isEditing && passportPhotos.length < 2 && (
                  <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="file" className="hidden" onChange={(e) => e.target.files && handlePhotoUpload(e.target.files, 'passport')} />
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs text-gray-600">Driver's License (2)</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {licensePhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img src={photo} className="w-full h-full object-cover rounded-lg border" />
                    <button type="button" onClick={() => isEditing && setLicensePhotos(licensePhotos.filter((_, i) => i !== index))} className={`absolute top-2 right-2 p-1 bg-white/80 rounded-full transition-opacity ${isEditing ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {isEditing && licensePhotos.length < 2 && (
                  <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="file" className="hidden" onChange={(e) => e.target.files && handlePhotoUpload(e.target.files, 'license')} />
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Extras */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <CubeIcon className="w-6 h-6" />
            Extras
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">Full Insurance</span>
              <Toggle enabled={hasFullInsurance} disabled={!isEditing} onChange={(val) => {
                setHasFullInsurance(val)
                if (val) setDepositAmount('0')
              }} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">Island Trip</span>
              <Toggle enabled={hasIslandTrip} disabled={!isEditing} onChange={setHasIslandTrip} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">Krabi Trip</span>
              <Toggle enabled={hasKrabiTrip} disabled={!isEditing} onChange={setHasKrabiTrip} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">Baby Seat</span>
              <Toggle enabled={hasBabySeat} disabled={!isEditing} onChange={setHasBabySeat} />
            </div>
          </div>
        </div>

        {/* Section 4: Financial Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <BanknotesIcon className="w-6 h-6" />
            Financial Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">





            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Delivery Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                  disabled={!isEditing}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Return Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={returnCost}
                  onChange={(e) => setReturnCost(e.target.value)}
                  disabled={!isEditing}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
              </div>
            </div>

            {hasIslandTrip && (
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">Island Trip Price</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={islandTripPrice}
                    onChange={(e) => setIslandTripPrice(e.target.value)}
                    disabled={!isEditing}
                    className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                </div>
              </div>
            )}

            {hasKrabiTrip && (
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">Krabi Trip Price</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={krabiTripPrice}
                    onChange={(e) => setKrabiTripPrice(e.target.value)}
                    disabled={!isEditing}
                    className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                </div>
              </div>
            )}

            {hasFullInsurance && (
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">Full Insurance Price</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fullInsurancePrice}
                    onChange={(e) => setFullInsurancePrice(e.target.value)}
                    disabled={!isEditing}
                    className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                </div>
              </div>
            )}

            {hasBabySeat && (
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-600">Baby Seat Price</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={babySeatPrice}
                    onChange={(e) => setBabySeatPrice(e.target.value)}
                    disabled={!isEditing}
                    className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-8 disabled:bg-gray-50"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">฿</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Deposit Payment</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={!isEditing || !!initialData}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-16 disabled:bg-gray-50"
                  placeholder="0.00"
                />
                <div className="absolute right-1 top-1 bottom-1">
                  <select
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value)}
                    className="h-full border-none bg-transparent text-gray-500 text-xs font-medium focus:ring-0 cursor-pointer"
                    disabled={!isEditing || !!initialData}
                  >
                    {currencies.length > 0 ? (
                      currencies.map(c => (
                        <option key={c.id} value={c.code}>{c.symbol}</option>
                      ))
                    ) : (
                      <option value="THB">฿</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-gray-600">Total Amount *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  disabled={!isEditing || !!initialData}
                  className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors font-bold pr-16 disabled:bg-gray-50"
                  placeholder="0.00"
                />
                <div className="absolute right-1 top-1 bottom-1">
                  <select
                    value={totalCurrency}
                    onChange={(e) => setTotalCurrency(e.target.value)}
                    className="h-full border-none bg-transparent text-gray-500 text-xs font-medium focus:ring-0 cursor-pointer"
                    disabled={!isEditing || !!initialData}
                  >
                    {currencies.length > 0 ? (
                      currencies.map(c => (
                        <option key={c.id} value={c.code}>{c.symbol}</option>
                      ))
                    ) : (
                      <option value="THB">฿</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs text-gray-600">Notes & Comments</label>
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                  {daysCount > 0 ? `${daysCount} Rental Days` : '0 Rental Days'}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
                placeholder="Enter notes..."
              />
            </div>
          </div>
        </div>
      </form >
    </div >
  )
}

