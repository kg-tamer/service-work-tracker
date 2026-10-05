import type { Weekday } from '../types'

// Dates are stored as local calendar dates in ISO "YYYY-MM-DD" form.
// "Today" always comes from the device's local date parts. Calendar arithmetic
// is done on UTC-midnight Date objects with getUTC*/setUTC* only, so daylight
// saving time and timezone offsets can never move a date a day back or forward.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** month is 1-12 */
export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Today's date in the device's local timezone (never via toISOString(), which is UTC). */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** month is 1-12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/** True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null
}

/** A Date at UTC midnight of the calendar date. Format it with timeZone: 'UTC'. */
export function isoToUtcDate(iso: string): Date {
  const parts = parseIsoDate(iso)
  if (!parts) throw new Error(`Invalid date: ${iso}`)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function utcDateToIso(date: Date): string {
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function addDays(iso: string, days: number): string {
  const date = isoToUtcDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return utcDateToIso(date)
}

/** Weekday of a calendar date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): Weekday {
  return isoToUtcDate(iso).getUTCDay() as Weekday
}

/** month is 1-12 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}
