'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PhotoIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/lib/toast'
import { useEnglishValidation } from '@/hooks/useEnglishValidation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatErrorMessage } from '@/lib/error-handler'

interface ManagerFormProps {
  header: {
    title: string
    backHref: string
  }
  submitLabel: string
  formId: string
  companyId: number
  initialData?: any
}

export default function ManagerForm({
  header,
  submitLabel,
  formId,
  companyId,
  initialData
}: ManagerFormProps) {
  const router = useRouter()
  const toast = useToast()
  const { checkAndWarn } = useEnglishValidation()
  const [loading, setLoading] = useState(false)

  // Form state - same fields as ProfileForm
  const [email, setEmail] = useState(initialData?.user?.email || initialData?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState(initialData?.user?.name || initialData?.name || '')
  const [surname, setSurname] = useState(initialData?.user?.surname || initialData?.surname || '')
  const [gender, setGender] = useState(initialData?.user?.gender || initialData?.gender || '')
  const [phone, setPhone] = useState(initialData?.user?.phone || initialData?.phone || '')
  const [secondPhone, setSecondPhone] = useState(initialData?.user?.second_phone || initialData?.second_phone || '')
  const [telegram, setTelegram] = useState(initialData?.user?.telegram || initialData?.telegram || '')
  const [passportNumber, setPassportNumber] = useState(initialData?.user?.passport_number || initialData?.passport_number || '')
  const [citizenship, setCitizenship] = useState(initialData?.user?.citizenship || initialData?.citizenship || '')
  const [city, setCity] = useState(initialData?.user?.city || initialData?.city || '')
  const [avatarUrl, setAvatarUrl] = useState(initialData?.user?.avatar_url || initialData?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isActive, setIsActive] = useState(initialData?.is_active !== undefined ? initialData.is_active : true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (!initialData && !password) {
      toast.error('Password is required')
      setLoading(false)
      return
    }

    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    if (!email.trim()) {
      toast.error('Email is required')
      setLoading(false)
      return
    }

    try {
      const url = '/api/managers'
      const method = 'POST'

      const requestBody: any = {
        email: email.trim(),
        name: name.trim() || null,
        surname: surname.trim() || null,
        gender: gender || null,
        phone: phone.trim() || null,
        second_phone: secondPhone.trim() || null,
        telegram: telegram.trim().replace('@', '') || null,
        passport_number: passportNumber.trim() || null,
        citizenship: citizenship.trim() || null,
        city: city.trim() || null,
        company_id: companyId,
        is_active: isActive
      }

      if (password) {
        requestBody.password = password
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save manager')
      }

      toast.success(initialData ? 'Manager updated successfully' : 'Manager created successfully')
      router.push(header.backHref)
    } catch (error: any) {
      console.error('Error saving manager:', error)
      toast.error(formatErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size should not exceed 2MB')
      return
    }

    // Check type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image')
      return
    }

    setUploadingAvatar(true)
    try {
      const supabase = createClient()

      // For new manager, we'll upload after user creation
      // For now, just store the file for later
      const fileExt = file.name.split('.').pop()
      const tempFileName = `temp/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(tempFileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(tempFileName)

      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error(error.message || 'Error uploading avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    await handleSubmit({ preventDefault: () => { } } as any)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg leading-6 font-medium text-gray-900">{header.title}</h1>
        <Button
          onClick={handleSave}
          loading={loading}
        >
          Save
        </Button>
      </div>

      <div className="overflow-hidden">
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar Section - same as ProfileForm */}
          <div className="flex items-center space-x-6">
            <div className="relative h-24 w-24 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden ring-4 ring-gray-100 shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <PhotoIcon className="h-10 w-10 text-gray-100" />
              )}
            </div>
            <div>
              <Button
                variant="secondary"
                disabled={uploadingAvatar}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                {uploadingAvatar ? 'Loading...' : '+ Change Avatar'}
              </Button>
              <input
                type="file"
                id="avatar-upload"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <p className="mt-2 text-xs text-gray-500">PNG, JPG, WEBP up to 2MB</p>
            </div>
          </div>

          {/* Row 1: 4 inputs - same layout as ProfileForm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!initialData}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors disabled:bg-gray-50"
              />
            </div>

            {!initialData && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 pr-10 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 pr-10 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status
              </label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-500 transition-colors"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Row 2: 4 inputs - same layout as ProfileForm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  checkAndWarn(e.target.value)
                  setName(e.target.value)
                }}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => {
                  checkAndWarn(e.target.value)
                  setSurname(e.target.value)
                }}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Row 3: 4 inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Second Phone
              </label>
              <input
                type="tel"
                value={secondPhone}
                onChange={(e) => setSecondPhone(e.target.value)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Telegram
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">@</span>
                </div>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value.replace('@', ''))}
                  className="block w-full pl-7 rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Passport / ID Number
              </label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Citizenship
              </label>
              <input
                type="text"
                value={citizenship}
                onChange={(e) => {
                  checkAndWarn(e.target.value)
                  setCitizenship(e.target.value)
                }}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Row 4: City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  checkAndWarn(e.target.value)
                  setCity(e.target.value)
                }}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-0 sm:text-sm py-2 px-3 bg-white text-gray-900"
              />
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
