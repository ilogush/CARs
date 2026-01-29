'use client'

import { useState, useRef, useCallback } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

interface ImageUploaderProps {
    bucket: string
    folder?: string
    maxFiles?: number
    maxSizeMB?: number
    values?: string[]
    onChange: (urls: string[]) => void
    className?: string
    disabled?: boolean
}

export default function ImageUploader({
    bucket,
    folder = '',
    maxFiles = 6,
    maxSizeMB = 1,
    values = [],
    onChange,
    className = '',
    disabled = false
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const compressImage = async (file: File): Promise<File> => {
        const options = {
            maxSizeMB,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp' as const
        }

        try {
            return await imageCompression(file, options)
        } catch (err) {
            console.error('Compression failed:', err)
            return file
        }
    }

    const uploadFile = async (file: File): Promise<string | null> => {
        const compressed = await compressImage(file)
        const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, compressed, {
                contentType: 'image/webp',
                upsert: false
            })

        if (error) {
            console.error('Upload error:', error)
            return null
        }

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path)

        return urlData.publicUrl
    }

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const remainingSlots = maxFiles - values.length
        if (remainingSlots <= 0) {
            setError(`Maximum ${maxFiles} images allowed`)
            return
        }

        const filesToUpload = Array.from(files).slice(0, remainingSlots)
        setUploading(true)
        setError(null)

        try {
            const uploadPromises = filesToUpload.map(uploadFile)
            const results = await Promise.all(uploadPromises)
            const successfulUrls = results.filter((url): url is string => url !== null)

            if (successfulUrls.length > 0) {
                onChange([...values, ...successfulUrls])
            }

            if (successfulUrls.length < filesToUpload.length) {
                setError('Some images failed to upload')
            }
        } catch (err) {
            setError('Failed to upload images')
            console.error(err)
        } finally {
            setUploading(false)
            if (inputRef.current) {
                inputRef.current.value = ''
            }
        }
    }, [values, maxFiles, onChange, bucket, folder, maxSizeMB])

    const removeImage = (index: number) => {
        const newValues = values.filter((_, i) => i !== index)
        onChange(newValues)
    }

    return (
        <div className={className}>
            {/* Image Grid */}
            {values.length > 0 && (
                <div className={`grid gap-2 mb-3 ${maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {values.map((url, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img
                                src={url}
                                alt={`Image ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {values.length < maxFiles && !disabled && (
                <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${maxFiles === 1 ? 'aspect-square' : 'h-24'}`}>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading || disabled}
                        className="hidden"
                    />
                    {uploading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Uploading...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-500">
                            <PhotoIcon className="w-8 h-8 mb-1" />
                            <span className="text-xs">Click to upload ({values.length}/{maxFiles})</span>
                        </div>
                    )}
                </label>
            )}

            {/* Error Message */}
            {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
        </div>
    )
}
