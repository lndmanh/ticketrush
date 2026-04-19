import type { ClassValue } from 'clsx'
import type { Updater } from '@tanstack/vue-table'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DateTime } from 'luxon'
import type { Ref } from 'vue'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T extends Updater<unknown>>(updaterOrValue: T, ref: Ref) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}

/**
 * Format a date/time in a Facebook-like relative format using Luxon
 *
 * Past:
 * - Just now (< 1 minute)
 * - X minutes ago (1-59 minutes)
 * - X hours ago (1-23 hours)
 * - Yesterday at HH:MM
 * - Day at HH:MM (within the last week)
 * - MMM D, YYYY (beyond threshold)
 *
 * Future:
 * - In a moment (< 1 minute)
 * - In X minutes (1-59 minutes)
 * - In X hours (1-23 hours)
 * - Tomorrow at HH:MM
 * - Day at HH:MM (within the next week)
 * - MMM D, YYYY (beyond threshold)
 *
 * @param date - The date to format (Date object, timestamp, or ISO string)
 * @param options - Configuration options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | number | string,
  options: {
    /** Maximum time in days to show relative time (default: 7) */
    relativeDaysThreshold?: number
    /** Locale for date formatting (default: 'en-US') */
    locale?: string
  } = {},
): string {
  const {
    relativeDaysThreshold = 7,
    locale = 'en-US',
  } = options

  const dt = toDateTime(date)
  const now = DateTime.now()
  const diffMillis = now.diff(dt).toMillis()
  const isFuture = diffMillis < 0

  // Calculate diff in the correct direction
  const diff = isFuture
    ? dt.diff(now, ['days', 'hours', 'minutes', 'seconds'])
    : now.diff(dt, ['days', 'hours', 'minutes', 'seconds'])

  const { days, hours, minutes } = diff.toObject()

  // Within relative threshold
  if ((days ?? 0) < relativeDaysThreshold) {
    // Just now / In a moment (< 1 minute)
    if ((minutes ?? 0) < 1 && (hours ?? 0) === 0 && (days ?? 0) === 0) {
      return isFuture ? 'In a moment' : 'Just now'
    }

    // Minutes (< 1 hour)
    if ((hours ?? 0) < 1 && (days ?? 0) === 0) {
      const m = Math.floor(minutes ?? 0)
      if (isFuture) {
        return dt.toRelative({ locale, unit: 'minutes' }) ?? `in ${m} minute${m === 1 ? '' : 's'}`
      }
      return dt.toRelative({ locale, unit: 'minutes' }) ?? `${m} minute${m === 1 ? '' : 's'} ago`
    }

    // Hours (< 24 hours)
    if ((days ?? 0) < 1) {
      const h = Math.floor(hours ?? 0)
      if (isFuture) {
        return dt.toRelative({ locale, unit: 'hours' }) ?? `in ${h} hour${h === 1 ? '' : 's'}`
      }
      return dt.toRelative({ locale, unit: 'hours' }) ?? `${h} hour${h === 1 ? '' : 's'} ago`
    }

    // Tomorrow / Yesterday
    if (isFuture && dt.hasSame(now.plus({ days: 1 }), 'day')) {
      return `Tomorrow at ${dt.toFormat('h:mm a', { locale })}`
    }
    if (!isFuture && dt.hasSame(now.minus({ days: 1 }), 'day')) {
      return `Yesterday at ${dt.toFormat('h:mm a', { locale })}`
    }

    // Within week (show day name)
    if ((days ?? 0) < 7) {
      return `${dt.toFormat('cccc', { locale })} at ${dt.toFormat('h:mm a', { locale })}`
    }
  }

  // Beyond threshold - show absolute date
  return formatAbsoluteDate(dt, now, locale)
}

/**
 * Convert various date inputs to Luxon DateTime
 */
function toDateTime(date: Date | number | string): DateTime {
  if (date instanceof Date) {
    return DateTime.fromJSDate(date)
  }
  if (typeof date === 'number') {
    return DateTime.fromMillis(date)
  }
  return DateTime.fromISO(date)
}

/**
 * Format an absolute date in Facebook style using Luxon "MMM D, YYYY" (e.g., "Nov 26, 2024")
 */
function formatAbsoluteDate(dt: DateTime, now: DateTime, locale: string) {
  return dt.toFormat('LLL d, yyyy', { locale })
}
