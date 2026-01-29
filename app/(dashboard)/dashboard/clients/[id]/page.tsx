'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon, UserIcon } from '@heroicons/react/24/outline'
import Loader from '@/components/ui/Loader'
import DataTable from '@/components/ui/DataTable'
import { Button, PrintButton } from '@/components/ui/Button'

import IdBadge from '@/components/ui/IdBadge'
import PageHeader from '@/components/ui/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import { validatePhone, validateLatinOnly } from '@/lib/validation'

interface Client {
  id: string
  name: string | null
  surname: string | null
  email: string
  phone: string | null
  telegram: string | null
  passport_number: string | null
  citizenship: string | null
  avatar_url: string | null
  created_at: string
  gender: string | null
  second_phone: string | null
  city: string | null
  passport_photos: string[]
  driver_license_photos: string[]
  client_profile: {
    phone: string | null
    address: string | null
    passport_number: string | null
  } | null
}

interface Contract {
  id: number
  status: string
  start_date: string
  end_date: string
  total_amount: number
  created_at: string
  company_cars: {
    id: number
    license_plate: string
    car_templates: {
      car_brands: { name: string }
      car_models: { name: string }
    }
  }
  manager: {
    id: string
    name: string | null
    surname: string | null
    email: string
  } | null
}

interface Payment {
  id: number
  amount: number
  payment_date: string
  payment_method: string | null
  notes: string | null
  contracts: {
    id: number
    status: string
  }
  payment_statuses: {
    name: string
    color: string | null
  } | null
}

interface ClientDetails {
  client: Client
  contracts: Contract[]
  payments: Payment[]
  statistics: {
    total_contracts: number
    active_contracts: number
    total_spent: number
    total_payments: number
  }
}

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = use(params)
  const toast = useToast()
  const [data, setData] = useState<ClientDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/clients/${id}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          const errorData = await res.json()
          setError(errorData.error || 'Failed to load client details')
        }
      } catch (err) {
        console.error('Error fetching client:', err)
        setError('Failed to load client details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchClient()
    }
  }, [id])

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    second_phone: '',
    telegram: '',
    passport_number: '',
    citizenship: '',
    city: '',
    gender: ''
  })
  const [saving, setSaving] = useState(false)
  const [passportPhotos, setPassportPhotos] = useState<string[]>([])
  const [licensePhotos, setLicensePhotos] = useState<string[]>([])

  // Update formData when client data is loaded
  useEffect(() => {
    if (data?.client) {
      setFormData({
        name: data.client.name || '',
        surname: data.client.surname || '',
        email: data.client.email || '',
        phone: data.client.phone || '',
        second_phone: data.client.second_phone || '',
        telegram: data.client.telegram || '',
        passport_number: data.client.passport_number || '',
        citizenship: data.client.citizenship || '',
        city: data.client.city || '',
        gender: data.client.gender || ''
      })
      setPassportPhotos(data.client.passport_photos || [])
      setLicensePhotos(data.client.driver_license_photos || [])
    }
  }, [data?.client])

  const handlePhotoUpload = async (files: FileList, type: 'passport' | 'license') => {
    const supabase = createClient()
    const newUrls: string[] = []

    setSaving(true)
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${type}.${fileExt}`
        const filePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)

        newUrls.push(publicUrl)
      }

      if (type === 'passport') {
        setPassportPhotos(prev => [...prev, ...newUrls])
      } else {
        setLicensePhotos(prev => [...prev, ...newUrls])
      }
      toast.success('Photos uploaded successfully')
    } catch (err: any) {
      console.error('Error uploading photos:', err)
      toast.error('Failed to upload photos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500">{error || 'Client not found'}</p>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-gray-800 hover:text-gray-500"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Clients
        </Link>
      </div>
    )
  }

  const { client } = data

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    // Validation
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    const nameErr = validateLatinOnly(formData.name, 'First Name')
    if (nameErr) { toast.error(nameErr); return }

    const surnameErr = validateLatinOnly(formData.surname, 'Last Name')
    if (surnameErr) { toast.error(surnameErr); return }

    const phoneErr = validatePhone(formData.phone)
    if (phoneErr) { toast.error(`Phone: ${phoneErr}`); return }

    if (formData.second_phone) {
      const waErr = validatePhone(formData.second_phone)
      if (waErr) { toast.error(`WhatsApp: ${waErr}`); return }
    }

    const passportErr = validateLatinOnly(formData.passport_number, 'Passport Number')
    if (passportErr) { toast.error(passportErr); return }

    try {
      setSaving(true)
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          passport_photos: passportPhotos,
          driver_license_photos: licensePhotos
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setData(prev => prev ? { ...prev, client: { ...prev.client, ...updated } } : null)
        setIsEditing(false)
        toast.success('Client updated successfully')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving client:', err)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: client.name || '',
      surname: client.surname || '',
      email: client.email || '',
      phone: client.phone || '',
      second_phone: client.second_phone || '',
      telegram: client.telegram || '',
      passport_number: client.passport_number || '',
      citizenship: client.citizenship || '',
      city: client.city || '',
      gender: client.gender || ''
    })
    setPassportPhotos(data?.client.passport_photos || [])
    setLicensePhotos(data?.client.driver_license_photos || [])
    setIsEditing(false)
  }

  const backHref = searchParams.get('from') || '/dashboard/clients'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Profile"
        leftActions={
          <Link
            href={backHref}
            className="p-2 hover:bg-gray-300 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
        }
        rightActions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={saving}
                  className="!py-2 !px-4 text-gray-600 border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={saving}
                  className="min-w-[100px] !py-2 !px-4"
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <PrintButton onClick={() => window.print()} />
                <Button
                  variant="primary"
                  onClick={() => setIsEditing(true)}
                  className="min-w-[100px] !py-2 !px-4 bg-gray-900 border-gray-900 hover:bg-gray-800"
                >
                  Edit
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Client Data Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <UserIcon className="w-6 h-6" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">First Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="First Name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Last Name *</label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Last Name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Passport Number *</label>
            <input
              type="text"
              name="passport_number"
              value={formData.passport_number}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Passport Number"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Citizenship</label>
            <input
              type="text"
              name="citizenship"
              value={formData.citizenship}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="Citizenship"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Phone *</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="+123456789"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">WhatsApp</label>
            <input
              type="text"
              name="second_phone"
              value={formData.second_phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="+123456789"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Telegram</label>
            <div className="relative">
              <input
                type="text"
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors pl-8 disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="username"
              />
              <span className="absolute left-3 top-2 text-gray-500 sm:text-sm pointer-events-none">@</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
              placeholder="City"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-gray-600">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Documents
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-xs text-gray-600">Passport Photos (2)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {passportPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square group">
                  <img src={photo} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                  <button
                    type="button"
                    onClick={() => isEditing && setPassportPhotos(passportPhotos.filter((_, i) => i !== index))}
                    className={`absolute top-2 right-2 p-1 bg-white/80 rounded-full transition-opacity ${isEditing ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}
                  >
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {licensePhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square group">
                  <img src={photo} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                  <button
                    type="button"
                    onClick={() => isEditing && setLicensePhotos(licensePhotos.filter((_, i) => i !== index))}
                    className={`absolute top-2 right-2 p-1 bg-white/80 rounded-full transition-opacity ${isEditing ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}
                  >
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
    </div>
  )
}
