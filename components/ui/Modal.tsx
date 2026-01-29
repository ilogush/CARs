import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
  isOpen?: boolean
  actions?: ReactNode
}

export default function Modal({ title, children, onClose, maxWidth, size, isOpen = true, actions }: ModalProps) {
  // Support both maxWidth and size props for backward compatibility
  const width = size || maxWidth || 'md'
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    large: 'max-w-4xl'
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  // Use createPortal to render outside of parent stacking contexts (e.g. transforms)
  // ensuring the backdrop covers the entire screen including sidebar/topbar
  const content = (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-xl flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className={`bg-gray-50 rounded-lg p-6 w-full ${maxWidthClasses[width]} shadow-xl max-h-[90vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 mb-6">
          {children}
        </div>

        {actions && (
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )

  // Safe check for document
  if (typeof document === 'undefined') return null

  return createPortal(content, document.body)
}
