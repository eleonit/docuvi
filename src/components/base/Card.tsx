/**
 * Componente Card
 */

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, hoverable = false, padding = 'md', className, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        hoverable && 'hover:shadow-md transition-shadow cursor-pointer',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-gray-200 pb-3 mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-gray-700', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-gray-200 pt-3 mt-4', className)} {...props}>
      {children}
    </div>
  )
}
