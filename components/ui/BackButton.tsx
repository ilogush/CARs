'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface BackButtonProps {
    href: string
}

export function BackButton({ href }: BackButtonProps) {
    return (
        <Link
            href={href}
            className="p-2 rounded-full hover:bg-gray-300 transition-colors"
        >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
    )
}
