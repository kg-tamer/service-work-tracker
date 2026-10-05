import type { Language, Weekday } from '../types'
import * as format from './format'
import { translations, type TranslationKey } from './translations'

export type TranslationValues = Record<string, string | number>

export interface I18n {
  language: Language
  dir: 'rtl' | 'ltr'
  t: (key: TranslationKey, values?: TranslationValues) => string
  /** "5 October 2026" */
  date: (iso: string) => string
  /** "Monday" */
  weekday: (iso: string) => string
  /** "05/10/2026" */
  numericDate: (iso: string) => string
  /** "Monday, 05/10/2026" */
  weekdayDate: (iso: string) => string
  /** "Mon, 05/10/2026" */
  shortWeekdayDate: (iso: string) => string
  /** "October 2026" */
  monthYear: (year: number, month: number) => string
  /** "October" */
  monthName: (month: number) => string
  /** "Sunday" */
  weekdayName: (weekday: Weekday) => string
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
}

/** Wraps user text (like a name) so it can't disturb the direction of the sentence around it. */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`
}

export function createI18n(language: Language): I18n {
  const dictionary = translations[language]
  return {
    language,
    dir: language === 'en' ? 'ltr' : 'rtl',
    t: (key, values) => interpolate(dictionary[key], values),
    date: (iso) => format.formatDate(iso, language),
    weekday: (iso) => format.formatWeekday(iso, language),
    numericDate: (iso) => format.formatNumericDate(iso, language),
    weekdayDate: (iso) => format.formatWeekdayNumericDate(iso, language),
    shortWeekdayDate: (iso) => format.formatShortWeekdayDate(iso, language),
    monthYear: (year, month) => format.formatMonthYear(year, month, language),
    monthName: (month) => format.formatMonthName(month, language),
    weekdayName: (weekday) => format.formatWeekdayName(weekday, language),
  }
}

/** Language for the first-launch screen, guessed from the browser settings. */
export function detectLanguage(): Language {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase()
    if (code.startsWith('ar')) return 'ar'
    if (code.startsWith('he') || code.startsWith('iw')) return 'he'
    if (code.startsWith('en')) return 'en'
  }
  return 'en'
}
