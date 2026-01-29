'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'
import { useEnglishValidation } from '@/hooks/useEnglishValidation'
import { UserRole, Company } from '@/types/database.types'
import { EyeIcon, EyeSlashIcon, PhotoIcon, PlusIcon, XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { inputBaseStyles } from '@/lib/styles/input'
import CitizenshipAutocomplete from '@/components/ui/CitizenshipAutocomplete'

interface Role {
  code: string
  name: string
  description?: string
}

interface ProfileFormProps {
  user: {
    id: string
    email: string
    name: string | null
    surname: string | null
    phone: string | null
    telegram: string | null
    passport_number: string | null
    citizenship: string | null
    avatar_url: string | null
    role: UserRole
    created_at?: string | null
    updated_at?: string | null
  }
  canEditRole?: boolean
  readOnly?: boolean
  hideHeader?: boolean
  headerContent?: React.ReactNode
  company?: Company | null
  loadingCompany?: boolean
}

export default function ProfileForm({ user, canEditRole = false, readOnly = false, hideHeader = false, headerContent, company, loadingCompany }: ProfileFormProps) {
  const router = useRouter()
  const toast = useToast()
  const { checkAndWarn } = useEnglishValidation()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  // Profile state
  const [name, setName] = useState(user.name || '')
  const [surname, setSurname] = useState(user.surname || '')
  const [gender, setGender] = useState((user as any).gender || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [secondPhone, setSecondPhone] = useState((user as any).second_phone || '')
  const [telegram, setTelegram] = useState(user.telegram || '')
  const [passportNumber, setPassportNumber] = useState(user.passport_number || '')
  const [citizenship, setCitizenship] = useState(user.citizenship || '')
  const [city, setCity] = useState((user as any).city || '')
  const [role, setRole] = useState(user.role)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Document photos state
  const [passportPhotos, setPassportPhotos] = useState<string[]>(Array.isArray((user as any).passport_photos) ? (user as any).passport_photos : [])
  const [driverLicensePhotos, setDriverLicensePhotos] = useState<string[]>(Array.isArray((user as any).driver_license_photos) ? (user as any).driver_license_photos : [])
  const [uploadingPassportPhotos, setUploadingPassportPhotos] = useState(false)
  const [uploadingDriverLicensePhotos, setUploadingDriverLicensePhotos] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Загружаем роли из БД
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('roles')
          .select('code, name, description')
          .order('name')

        if (error) {
          console.error('Error loading roles:', error)
          // Fallback to static list if table doesn't exist
          setRoles([
            { code: 'client', name: 'Client' },
            { code: 'admin', name: 'Administrator' },
            { code: 'owner', name: 'Owner' },
            { code: 'manager', name: 'Manager' }
          ])
        } else {
          setRoles(data || [])
        }
      } catch (err) {
        console.error('Error loading roles:', err)
        // Fallback to static list
        setRoles([
          { code: 'client', name: 'Client' },
          { code: 'admin', name: 'Administrator' },
          { code: 'owner', name: 'Owner' },
          { code: 'manager', name: 'Manager' }
        ])
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          surname: surname.trim(),
          gender: gender || null,
          phone: phone.trim(),
          second_phone: secondPhone.trim() || null,
          telegram: telegram.trim().replace('@', ''), // Store without @ prefix
          passport_number: passportNumber.trim() || null,
          citizenship: citizenship.trim() || null,
          city: city.trim() || null,
          passport_photos: passportPhotos,
          driver_license_photos: driverLicensePhotos,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated')
      router.refresh() // Refresh server data
    } catch (error: any) {
      toast.error(error.message || 'Error updating profile')
    } finally {
      setLoading(false)
    }
  }



  const handleCancel = () => {
    setName(user.name || '')
    setSurname(user.surname || '')
    setPhone(user.phone || '')
    setTelegram(user.telegram || '')
    setPassportNumber(user.passport_number || '')
    setCitizenship(user.citizenship || '')
    setCity((user as any).city || '')
    setRole(user.role)
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Сохраняем профиль
      const supabase = createClient()

      // Подготавливаем данные для обновления
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Добавляем поля только если они не пустые
      if (name.trim()) updateData.name = name.trim()
      else updateData.name = null

      if (surname.trim()) updateData.surname = surname.trim()
      else updateData.surname = null

      if (phone.trim()) updateData.phone = phone.trim()
      else updateData.phone = null

      if (telegram.trim()) updateData.telegram = telegram.trim().replace('@', '')
      else updateData.telegram = null

      if (passportNumber.trim()) updateData.passport_number = passportNumber.trim()
      else updateData.passport_number = null

      if (citizenship.trim()) updateData.citizenship = citizenship.trim()
      else updateData.citizenship = null

      if (city.trim()) updateData.city = city.trim()
      else updateData.city = null

      // Добавляем роль, если разрешено редактирование
      if (canEditRole && role !== user.role) {
        updateData.role = role
      }

      console.log('Обновление профиля:', { userId: user.id, updateData })

      const { data, error: profileError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (profileError) {
        console.error('Ошибка обновления профиля:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        })
        throw new Error(profileError.message || 'Ошибка обновления профиля')
      }

      if (!data || data.length === 0) {
        console.error('Data was not returned after update')
        throw new Error('Failed to update data. You may not have permission to edit this user.')
      }

      console.log('Profile updated successfully')

      // If there is a new password, update it
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error('Passwords do not match')
          setLoading(false)
          return
        }

        if (newPassword.length < 6) {
          toast.error('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (passwordError) throw passwordError

        setNewPassword('')
        setConfirmPassword('')
        toast.success('Password changed successfully')
      }

      toast.success('Profile updated')

      // Обновляем локальное состояние из ответа сервера
      if (data && data[0]) {
        const updatedUser = data[0]
        setName(updatedUser.name || '')
        setSurname(updatedUser.surname || '')
        setPhone(updatedUser.phone || '')
        setTelegram(updatedUser.telegram || '')
        setPassportNumber(updatedUser.passport_number || '')
        setCitizenship(updatedUser.citizenship || '')
        setCity((updatedUser as any).city || '')

        // Обновляем аватар, если он пришел с сервера (хотя мы его и так обновили через storage)
        if (updatedUser.avatar_url) {
          setAvatarUrl(updatedUser.avatar_url)
        }
      }

      router.refresh() // Update server data
    } catch (error: any) {
      console.error('Save error:', error)
      const errorMessage = error.message || error.details || 'Save error'
      toast.error(errorMessage)

      // If error is related to RLS, show a more understandable message
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        toast.error('No permission to update. Check RLS policies.')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US')
  }

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrator',
      owner: 'Owner',
      manager: 'Manager',
      client: 'Client'
    }
    return roles[role] || role
  }

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          {headerContent ? (
            headerContent
          ) : (
            <h1 className="text-lg leading-6 font-medium text-gray-900">Profile</h1>
          )}

          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={loading}
              loading={loading}
            >
              Save
            </Button>
          )}
        </div>
      )}

      <div className={`overflow-hidden ${hideHeader ? 'mt-0 border-0' : ''}`}>
        <div className="space-y-6">
          {/* Avatar Section */}
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
              <label
                htmlFor="avatar-upload"
                className={`flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-gray-700 transition-colors cursor-pointer ${readOnly ? 'hidden' : ''}`}
              >
                <span>{uploadingAvatar ? 'Loading...' : '+ Change Avatar'}</span>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar || readOnly}
                  onChange={async (e) => {
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

                      // Delete old avatar if exists
                      if (avatarUrl) {
                        const oldPath = avatarUrl.split('/').pop()
                        if (oldPath) {
                          await supabase.storage
                            .from('avatars')
                            .remove([`${user.id}/${oldPath}`])
                        }
                      }

                      // Upload new avatar
                      const fileExt = file.name.split('.').pop()
                      const fileName = `${user.id}/${Date.now()}.${fileExt}`

                      console.log('Uploading file:', { fileName, fileSize: file.size, fileType: file.type, userId: user.id })

                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, file, {
                          cacheControl: '3600',
                          upsert: false
                        })

                      if (uploadError) {
                        console.error('Error uploading to Storage:', uploadError)
                        throw uploadError
                      }

                      console.log('File uploaded successfully:', uploadData)

                      // Get public URL
                      const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName)

                      // Update in DB
                      const { error: updateError } = await supabase
                        .from('users')
                        .update({ avatar_url: publicUrl })
                        .eq('id', user.id)

                      if (updateError) throw updateError

                      setAvatarUrl(publicUrl)
                      toast.success('Avatar uploaded successfully')
                      router.refresh()
                    } catch (error: any) {
                      console.error('Error uploading avatar:', {
                        error,
                        message: error?.message,
                        details: error?.details,
                        hint: error?.hint,
                        code: error?.code,
                        statusCode: error?.statusCode,
                        error_description: error?.error_description
                      })

                      // More understandable error messages
                      const errorMessage = error?.message || error?.error_description || error?.details || JSON.stringify(error) || 'Error uploading avatar'

                      if (errorMessage.includes('Bucket not found') || errorMessage.includes('not found') || error?.statusCode === 404) {
                        toast.error('Bucket "avatars" not found. Create it in Supabase Dashboard → Storage')
                      } else if (errorMessage.includes('row-level security') || errorMessage.includes('permission') || errorMessage.includes('policy') || error?.code === '42501') {
                        toast.error('No permission to upload. Check Storage RLS policies')
                      } else if (error?.statusCode === 401 || error?.statusCode === 403) {
                        toast.error('Authentication error. Please login again')
                      } else {
                        toast.error(errorMessage)
                      }
                    } finally {
                      setUploadingAvatar(false)
                    }
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">PNG, JPG, WEBP up to 2MB</p>
            </div>
          </div>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  readOnly={readOnly}
                  onChange={(e) => {
                    checkAndWarn(e.target.value)
                    setName(e.target.value)
                  }}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-500 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="surname"
                  value={surname}
                  readOnly={readOnly}
                  onChange={(e) => {
                    checkAndWarn(e.target.value)
                    setSurname(e.target.value)
                  }}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-500 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={readOnly}
                  className={`${inputBaseStyles} disabled:bg-gray-50 disabled:text-gray-500`}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                {canEditRole ? (
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 bg-white text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={loadingRoles || readOnly}
                  >
                    {loadingRoles ? (
                      <option>Loading...</option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="role"
                    value={roles.find(r => r.code === user.role)?.name || getRoleName(user.role) || 'Undefined'}
                    readOnly
                    className={`${inputBaseStyles}`}
                  />
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-500 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  readOnly={readOnly}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {/* Second Phone */}
              <div>
                <label htmlFor="second_phone" className="block text-sm font-medium text-gray-500 mb-1">
                  Second Phone
                </label>
                <input
                  type="tel"
                  id="second_phone"
                  value={secondPhone}
                  readOnly={readOnly}
                  onChange={(e) => setSecondPhone(e.target.value)}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  value={user.email}
                  readOnly
                  className={`${inputBaseStyles}`}
                />
              </div>

              {/* Telegram */}
              <div>
                <label htmlFor="telegram" className="block text-sm font-medium text-gray-500 mb-1">
                  Telegram
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">@</span>
                  </div>
                  <input
                    type="text"
                    id="telegram"
                    value={telegram}
                    readOnly={readOnly}
                    onChange={(e) => setTelegram(e.target.value)}
                    className={`${inputBaseStyles} pl-7 read-only:bg-gray-50 read-only:text-gray-500`}
                  />
                </div>
              </div>

              {/* Citizenship */}
              <div>
                <label htmlFor="citizenship" className="block text-sm font-medium text-gray-500 mb-1">
                  Citizenship
                </label>
                <CitizenshipAutocomplete
                  value={citizenship}
                  onChange={(value) => {
                    checkAndWarn(value)
                    setCitizenship(value)
                  }}
                  disabled={readOnly}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                  placeholder="Start typing country name..."
                />
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-500 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  readOnly={readOnly}
                  onChange={(e) => {
                    checkAndWarn(e.target.value)
                    setCity(e.target.value)
                  }}
                  className={`${inputBaseStyles} read-only:bg-gray-50 read-only:text-gray-500`}
                />
              </div>

              {/* Passport / ID Number */}
              <div>
                <label htmlFor="passport_number" className="block text-sm font-medium text-gray-500 mb-1">
                  Passport / ID Number
                </label>
                <input
                  type="text"
                  id="passport_number"
                  value={passportNumber}
                  readOnly={readOnly}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 bg-white text-gray-900 read-only:bg-gray-50 read-only:text-gray-500"
                />
              </div>

              {/* Company (for owners) */}
              {user.role === 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Company Name
                  </label>
                  {loadingCompany ? (
                    <div className="h-[42px] flex items-center px-3 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                  ) : company ? (
                    <Link
                      href={`/dashboard/companies/${company.id}`}
                      className="flex items-center w-full rounded-lg border border-blue-100 bg-blue-50/30 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                      {company.name}
                    </Link>
                  ) : (
                    <div className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 border italic">
                      No company linked
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password Section */}
          {!readOnly && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500 pb-3 border-b border-gray-200">Change Password</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-500 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="new_password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`${inputBaseStyles}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-500 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm_password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 bg-white text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passport Photos Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-500 pb-3 border-b border-gray-200">Passport Photos</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {passportPhotos.map((photo, index) => (
                <div key={`passport-${index}`} className="relative aspect-square group">
                  <a
                    href={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                      alt={`Passport photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-gray-500 transition-colors"
                    />
                    <div className="hidden absolute inset-0 bg-gray-200/50 rounded-lg flex items-center justify-center">
                      <EyeIcon className="w-8 h-8 text-gray-800" />
                    </div>
                  </a>
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setPassportPhotos(passportPhotos.filter((_, i) => i !== index))
                      }}
                      className="absolute top-2 right-2 p-1 bg-white text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-300 shadow-sm"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}

              {/* Add Passport Photo Button */}
              {!readOnly && passportPhotos.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors bg-gray-50 hover:bg-gray-300">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files) return

                      setUploadingPassportPhotos(true)
                      try {
                        const supabase = createClient()
                        const newPhotos: string[] = []

                        for (const file of Array.from(files)) {
                          if (passportPhotos.length + newPhotos.length >= 5) break;

                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(`File ${file.name} exceeds 5MB limit`)
                            continue
                          }

                          const fileExt = file.name.split('.').pop()
                          const fileName = `documents/${user.id}/passport/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

                          const { error: uploadError } = await supabase.storage
                            .from('general-images')
                            .upload(fileName, file)

                          if (uploadError) throw uploadError

                          const { data: { publicUrl } } = supabase.storage
                            .from('general-images')
                            .getPublicUrl(fileName)

                          newPhotos.push(publicUrl)
                        }

                        if (newPhotos.length > 0) {
                          setPassportPhotos([...passportPhotos, ...newPhotos])
                          toast.success(`${newPhotos.length} passport photo(s) uploaded`)
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Error uploading photos')
                      } finally {
                        setUploadingPassportPhotos(false)
                        e.target.value = ''
                      }
                    }}
                  />
                  <PlusIcon className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingPassportPhotos ? 'Uploading...' : 'Add Passport'}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Driver License Photos Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-500 pb-3 border-b border-gray-200">Driver License Photos</h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {driverLicensePhotos.map((photo, index) => (
                <div key={`driver-${index}`} className="relative aspect-square group">
                  <a
                    href={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={photo.startsWith('http') ? photo : `/uploads/${photo}`}
                      alt={`Driver license photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-gray-500 transition-colors"
                    />
                    <div className="hidden absolute inset-0 bg-gray-200/50 rounded-lg flex items-center justify-center">
                      <EyeIcon className="w-8 h-8 text-gray-800" />
                    </div>
                  </a>
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setDriverLicensePhotos(driverLicensePhotos.filter((_, i) => i !== index))
                      }}
                      className="absolute top-2 right-2 p-1 bg-white text-gray-800 border border-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-300 shadow-sm"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </span>
                </div>
              ))}

              {/* Add Driver License Photo Button */}
              {!readOnly && driverLicensePhotos.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors bg-gray-50 hover:bg-gray-300">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files) return

                      setUploadingDriverLicensePhotos(true)
                      try {
                        const supabase = createClient()
                        const newPhotos: string[] = []

                        for (const file of Array.from(files)) {
                          if (driverLicensePhotos.length + newPhotos.length >= 5) break;

                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(`File ${file.name} exceeds 5MB limit`)
                            continue
                          }

                          const fileExt = file.name.split('.').pop()
                          const fileName = `documents/${user.id}/driver_license/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

                          const { error: uploadError } = await supabase.storage
                            .from('general-images')
                            .upload(fileName, file)

                          if (uploadError) throw uploadError

                          const { data: { publicUrl } } = supabase.storage
                            .from('general-images')
                            .getPublicUrl(fileName)

                          newPhotos.push(publicUrl)
                        }

                        if (newPhotos.length > 0) {
                          setDriverLicensePhotos([...driverLicensePhotos, ...newPhotos])
                          toast.success(`${newPhotos.length} license photo(s) uploaded`)
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Error uploading photos')
                      } finally {
                        setUploadingDriverLicensePhotos(false)
                        e.target.value = ''
                      }
                    }}
                  />
                  <PlusIcon className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingDriverLicensePhotos ? 'Uploading...' : 'Add License'}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
