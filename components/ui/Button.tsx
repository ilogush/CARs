'use client'

import { ReactNode, useState } from 'react'
import { TrashIcon, PrinterIcon } from '@heroicons/react/24/outline'

interface ButtonProps {
  children?: ReactNode
  onClick?: () => void | Promise<void>
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  variant?: 'primary' | 'secondary' | 'delete'
  size?: 'sm' | 'md'
  icon?: ReactNode
  form?: string
  title?: string
  loading?: boolean
}

export function Button({
  children,
  onClick,
  disabled,
  type = 'button',
  className = '',
  variant = 'primary',
  size = 'md',
  icon,
  form,
  title,
  loading = false
}: ButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = async () => {
    if (isProcessing || disabled || loading) return
    if (!onClick) return

    setIsProcessing(true)
    try {
      await onClick()
    } finally {
      setIsProcessing(false)
    }
  }

  const isDisabled = disabled || loading || isProcessing

  const baseClasses = 'flex items-center justify-center space-x-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses = {
    sm: 'px-2.5 py-1.2 text-xs',
    md: 'px-4 py-2 text-sm'
  }

  const variantClasses = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 border border-transparent shadow-sm',
    secondary: 'bg-gray-200 text-gray-800 border border-gray-200 hover:bg-gray-300 shadow-sm',
    delete: 'bg-gray-200 text-gray-800 border border-gray-200 hover:bg-gray-300 hover:text-red-600 hover:border-red-200 transition-all'
  }

  return (
    <button
      type={type}
      onClick={type === 'button' ? handleClick : undefined}
      disabled={isDisabled}
      form={form}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {isDisabled && (loading || isProcessing) ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  )
}

export function DeleteButton({ onClick, disabled, className = '', title = 'Delete' }: { onClick?: () => void | Promise<void>, disabled?: boolean, className?: string, title?: string }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = async () => {
    if (isProcessing || disabled) return
    if (!onClick) return

    setIsProcessing(true)
    try {
      await onClick()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`p-2 bg-gray-200 text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={title}
    >
      {isProcessing ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
      ) : (
        <TrashIcon className="w-5 h-5" />
      )}
    </button>
  )
}

export function PrintButton({ onClick, disabled, className = '' }: { onClick?: () => void | Promise<void>, disabled?: boolean, className?: string }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = async () => {
    if (isProcessing || disabled) return
    if (!onClick) return

    setIsProcessing(true)
    try {
      await onClick()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`p-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Print"
    >
      {isProcessing ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
      ) : (
        <PrinterIcon className="w-5 h-5" />
      )}
    </button>
  )
}
