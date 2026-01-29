'use client'

import Link from 'next/link'
import { useAdminLink } from '@/lib/hooks/useAdminLink'
import { ReactNode } from 'react'

interface AdminLinkProps {
    href: string
    children: ReactNode
    className?: string
    onClick?: () => void
    title?: string
}

/**
 * Link component that automatically handles admin mode parameters
 */
export function AdminLink({ href, children, className, onClick, title }: AdminLinkProps) {
    const { buildLink } = useAdminLink()

    return (
        <Link
            href={buildLink(href)}
            className={className}
            onClick={onClick}
            title={title}
        >
            {children}
        </Link>
    )
}

export default AdminLink
