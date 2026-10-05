import type { Language, Settings, Weekday } from '../types'
import { isObject } from './guards'

export const MAX_NAME_LENGTH = 60
export const MAX_REQUIRED_DAYS = 9999
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export function isLanguage(value: unknown): value is Language {
  return value === 'ar' || value === 'he' || value === 'en'
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

/** New settings from onboarding. The service fields start "not configured". */
export function createSettings(name: string, language: Language): Settings {
  return { name: name.trim(), language, requiredNetDays: 0, shorteningDays: 0, weeklyDaysOff: [] }
}

function toDayCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_REQUIRED_DAYS
    ? value
    : null
}

/** Sorted, unique weekday indexes. Having all 7 days off is not allowed and counts as none. */
export function normalizeDaysOff(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return []
  const days = new Set<Weekday>(value.filter(isWeekday))
  if (days.size === WEEKDAYS.length) return []
  return [...days].sort((a, b) => a - b)
}

/**
 * Reads settings saved in localStorage or a backup file.
 * Settings saved before the service fields existed (schema version 1) get safe
 * defaults: requiredNetDays 0 (not configured), shorteningDays 0, no days off.
 * Returns null only when the name or language are unusable.
 */
export function parseSettings(value: unknown): Settings | null {
  if (!isObject(value)) return null
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, MAX_NAME_LENGTH) : ''
  if (!name || !isLanguage(value.language)) return null
  const requiredNetDays = toDayCount(value.requiredNetDays) ?? 0
  const shorteningDays = Math.min(toDayCount(value.shorteningDays) ?? 0, requiredNetDays)
  return {
    name,
    language: value.language,
    requiredNetDays,
    shorteningDays,
    weeklyDaysOff: normalizeDaysOff(value.weeklyDaysOff),
  }
}

/**
 * Settings to apply when the user chooses to restore them from a backup.
 * Service fields that an older backup doesn't contain keep their current values.
 */
export function settingsFromBackup(value: unknown, current: Settings | null): Settings | null {
  const parsed = parseSettings(value)
  if (!parsed || !current || !isObject(value)) return parsed
  const requiredNetDays = 'requiredNetDays' in value ? parsed.requiredNetDays : current.requiredNetDays
  const shorteningDays = 'shorteningDays' in value ? parsed.shorteningDays : current.shorteningDays
  return {
    ...parsed,
    requiredNetDays,
    shorteningDays: Math.min(shorteningDays, requiredNetDays),
    weeklyDaysOff: 'weeklyDaysOff' in value ? parsed.weeklyDaysOff : current.weeklyDaysOff,
  }
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.name === b.name &&
    a.language === b.language &&
    a.requiredNetDays === b.requiredNetDays &&
    a.shorteningDays === b.shorteningDays &&
    a.weeklyDaysOff.join() === b.weeklyDaysOff.join()
  )
}

/**
 * Parses a whole number typed by the user. Accepts Western, Arabic-Indic and
 * Persian digits. An empty field means 0. Returns null when it isn't a whole number.
 */
export function parseWholeNumber(text: string): number | null {
  const digits = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  if (digits === '') return 0
  if (!/^\d{1,6}$/.test(digits)) return null
  return Number(digits)
}
