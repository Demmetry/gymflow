import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const membershipColors: Record<string, string> = {
  ACTIVE: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
  EXPIRED: 'text-red-400 bg-red-400/10 border-red-400/20',
  FROZEN: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  CANCELED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
}

export const paymentColors: Record<string, string> = {
  COMPLETED: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
  REFUNDED: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
}

/**
 * Cleans a request body before passing to Prisma.
 * Converts empty-string date fields to null, and valid date strings to Date objects.
 * Prevents "Invalid value for argument" crashes from <input type="date"/datetime-local">
 * fields that were left blank (which submit as '').
 */
export function sanitizeDates<T extends Record<string, any>>(body: T, dateFields: string[]): T {
  const clean = { ...body }
  for (const field of dateFields) {
    if (field in clean) {
      const val = clean[field]
      if (val === '' || val === undefined) {
        ;(clean as any)[field] = null
      } else if (typeof val === 'string') {
        const d = new Date(val)
        ;(clean as any)[field] = isNaN(d.getTime()) ? null : d
      }
    }
  }
  return clean
}
