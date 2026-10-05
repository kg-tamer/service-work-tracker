import type { Language, Weekday } from '../types'
import { isoToUtcDate } from '../lib/dates'

/** Gregorian calendar and Western digits (0-9) in every language. */
const LOCALE_TAGS: Record<Language, string> = {
  ar: 'ar-u-ca-gregory-nu-latn',
  he: 'he-u-ca-gregory-nu-latn',
  en: 'en-GB-u-ca-gregory-nu-latn',
}

const cache = new Map<string, Intl.DateTimeFormat>()

// Dates are calendar dates turned into UTC-midnight Date objects, so they are
// always formatted with timeZone 'UTC': the printed day is exactly the stored day.
function formatter(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${language}|${JSON.stringify(options)}`
  let result = cache.get(key)
  if (!result) {
    result = new Intl.DateTimeFormat(LOCALE_TAGS[language], { ...options, timeZone: 'UTC' })
    cache.set(key, result)
  }
  return result
}

/** "5 October 2026" */
export function formatDate(iso: string, language: Language): string {
  return formatter(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(isoToUtcDate(iso))
}

/** "Monday" */
export function formatWeekday(iso: string, language: Language): string {
  return formatter(language, { weekday: 'long' }).format(isoToUtcDate(iso))
}

/** "05/10/2026" */
export function formatNumericDate(iso: string, language: Language): string {
  return formatter(language, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(isoToUtcDate(iso))
}

/** "Monday, 05/10/2026" */
export function formatWeekdayNumericDate(iso: string, language: Language): string {
  return formatter(language, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    isoToUtcDate(iso),
  )
}

/** "Mon, 05/10/2026" */
export function formatShortWeekdayDate(iso: string, language: Language): string {
  return formatter(language, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    isoToUtcDate(iso),
  )
}

/** "October 2026"; month is 1-12 */
export function formatMonthYear(year: number, month: number, language: Language): string {
  return formatter(language, { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** "October"; month is 1-12 */
export function formatMonthName(month: number, language: Language): string {
  return formatter(language, { month: 'long' }).format(new Date(Date.UTC(2000, month - 1, 1)))
}

/** "Sunday" for 0 … "Saturday" for 6 */
export function formatWeekdayName(weekday: Weekday, language: Language): string {
  // 1 January 2023 was a Sunday.
  return formatter(language, { weekday: 'long' }).format(new Date(Date.UTC(2023, 0, 1 + weekday)))
}
