'use client'

import { ReactNode } from 'react'
import PageHeader from './PageHeader'
import { Button } from './Button'
import Link from 'next/link'

interface ActionPageHeaderProps {
    title: string
    actionLabel?: string
    actionIcon?: ReactNode
    actionType?: 'button' | 'submit' | 'link'
    href?: string
    onAction?: () => void | Promise<void>
    formId?: string
    loading?: boolean
    disabled?: boolean
    leftActions?: ReactNode
    rightActions?: ReactNode
    variant?: 'primary' | 'secondary' | 'delete'
}

export default function ActionPageHeader({
    title,
    actionLabel,
    actionIcon,
    actionType = 'button',
    href,
    onAction,
    formId,
    loading,
    disabled,
    leftActions,
    rightActions: customRightActions,
    variant = 'primary'
}: ActionPageHeaderProps) {
    const renderButton = () => (
        <Button
            variant={variant}
            onClick={actionType === 'button' ? onAction : undefined}
            type={actionType === 'submit' ? 'submit' : 'button'}
            form={formId}
            disabled={disabled}
            loading={loading}
            icon={actionIcon}
            className={actionType === 'submit' ? 'px-6' : ''}
        >
            {actionLabel}
        </Button>
    )

    const rightActions = customRightActions || (actionLabel ? (
        actionType === 'link' && href ? (
            <Link href={href}>
                {renderButton()}
            </Link>
        ) : (
            renderButton()
        )
    ) : null)

    return (
        <PageHeader
            title={title}
            leftActions={leftActions}
            rightActions={rightActions}
        />
    )
}
