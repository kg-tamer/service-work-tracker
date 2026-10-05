export type Language = 'ar' | 'he' | 'en'

/**
 * Weekday index convention used everywhere in the app (settings, calendar,
 * calculations): the JavaScript `Date#getDay()` numbering.
 *   0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 *   4 = Thursday, 5 = Friday, 6 = Saturday
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Settings {
  name: string
  language: Language
  /** Total NET work days that must be completed. 0 = not configured yet. */
  requiredNetDays: number
  /** Work days deducted from `requiredNetDays` (קיצור). 0 ≤ shorteningDays ≤ requiredNetDays. */
  shorteningDays: number
  /** Regular weekly days off, as sorted unique weekday indexes (see `Weekday`). */
  weeklyDaysOff: Weekday[]
}

/** One actually worked day. Only these records count as completed work. */
export interface WorkRecord {
  /** Local calendar date, YYYY-MM-DD. There is at most one record per date. */
  date: string
  worked: true
  note: string
  createdAt: string
  updatedAt: string
}

/** Records keyed by date, which makes duplicate dates structurally impossible. */
export type RecordMap = Record<string, WorkRecord>

export interface AppData {
  settings: Settings | null
  records: RecordMap
}

export type View = 'home' | 'history' | 'calendar' | 'settings'
