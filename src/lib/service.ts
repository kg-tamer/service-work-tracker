import type { RecordMap, Settings, Weekday } from '../types'
import { addDays, isValidIsoDate, weekdayOf } from './dates'

// Service progress rules. These concepts are deliberately kept separate:
//
//   completed work    = number of saved work records (nothing else adds to it)
//   normal target     = requiredNetDays
//   shortened target  = requiredNetDays − shorteningDays   (קיצור only lowers the target)
//
// Weekly days off are never recorded and never count as work. They only block
// registering new work on those dates and are skipped when projecting dates.

/** Actual completed work: one per saved work record. */
export function countWorkedDays(records: RecordMap): number {
  return Object.keys(records).length
}

export function normalTarget(settings: Settings): number {
  return settings.requiredNetDays
}

export function shortenedTarget(settings: Settings): number {
  return Math.max(settings.requiredNetDays - settings.shorteningDays, 0)
}

/** Never negative. */
export function remainingDays(target: number, workedDays: number): number {
  return Math.max(target - workedDays, 0)
}

export function isDayOff(isoDate: string, weeklyDaysOff: readonly Weekday[]): boolean {
  return weeklyDaysOff.includes(weekdayOf(isoDate))
}

export type NewWorkDayProblem = 'invalidDate' | 'future' | 'duplicate' | 'dayOff'

/**
 * Why a NEW work day can't be registered on this date, or null if it can.
 * Days off only restrict creating records; existing records on such dates stay.
 */
export function newWorkDayProblem(
  date: string,
  records: RecordMap,
  weeklyDaysOff: readonly Weekday[],
  today: string,
): NewWorkDayProblem | null {
  if (!isValidIsoDate(date)) return 'invalidDate'
  if (date > today) return 'future'
  if (records[date]) return 'duplicate'
  if (isDayOff(date, weeklyDaysOff)) return 'dayOff'
  return null
}

/**
 * Date on which the remaining work days would be completed, working every
 * available day and skipping weekly days off.
 *
 * Counting always starts the day AFTER today: today only counts once it has
 * been saved (then it is already part of the worked days). If today is a day
 * off, or is still unregistered, it is not assumed to be worked, so the
 * estimate stays conservative.
 *
 * Returns null when nothing remains, or when every weekday is a day off.
 */
export function projectFinishDate(
  remaining: number,
  today: string,
  weeklyDaysOff: readonly Weekday[],
): string | null {
  if (remaining <= 0 || weeklyDaysOff.length >= 7) return null
  let weekday: number = weekdayOf(today)
  let calendarDays = 0
  let workDays = 0
  while (workDays < remaining) {
    calendarDays += 1
    weekday = (weekday + 1) % 7
    if (!weeklyDaysOff.includes(weekday as Weekday)) workDays += 1
  }
  return addDays(today, calendarDays)
}

export interface ServiceProgress {
  /** False until requiredNetDays has been set; nothing else is meaningful then. */
  configured: boolean
  workedDays: number
  requiredNetDays: number
  shorteningDays: number
  shortenedTarget: number
  remainingWithoutShortening: number
  remainingWithShortening: number
  /** 0–1: workedDays / requiredNetDays */
  progressWithoutShortening: number
  /** 0–1: workedDays / shortened target */
  progressWithShortening: number
  finishWithoutShortening: string | null
  finishWithShortening: string | null
}

function ratio(done: number, target: number): number {
  return target <= 0 ? 1 : Math.min(done / target, 1)
}

export function computeServiceProgress(settings: Settings, records: RecordMap, today: string): ServiceProgress {
  const workedDays = countWorkedDays(records)
  const required = normalTarget(settings)
  const shortened = shortenedTarget(settings)
  const remainingWithoutShortening = remainingDays(required, workedDays)
  const remainingWithShortening = remainingDays(shortened, workedDays)
  return {
    configured: required > 0,
    workedDays,
    requiredNetDays: required,
    shorteningDays: settings.shorteningDays,
    shortenedTarget: shortened,
    remainingWithoutShortening,
    remainingWithShortening,
    progressWithoutShortening: ratio(workedDays, required),
    progressWithShortening: ratio(workedDays, shortened),
    finishWithoutShortening: projectFinishDate(remainingWithoutShortening, today, settings.weeklyDaysOff),
    finishWithShortening: projectFinishDate(remainingWithShortening, today, settings.weeklyDaysOff),
  }
}
