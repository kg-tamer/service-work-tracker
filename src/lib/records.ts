import type { RecordMap, WorkRecord } from '../types'
import { isValidIsoDate } from './dates'
import { isObject } from './guards'

export const MAX_NOTE_LENGTH = 1000

export function cleanNote(note: string): string {
  return note.replace(/\r\n?/g, '\n').trim()
}

/** Shortens text to `max` UTF-16 units without cutting an emoji (surrogate pair) in half. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const code = text.charCodeAt(max - 1)
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? max - 1 : max)
}

/** A cleaned note, limited to MAX_NOTE_LENGTH. */
export function limitNote(note: string): string {
  return truncate(cleanNote(note), MAX_NOTE_LENGTH)
}

export function createRecord(date: string, note: string, now: Date = new Date()): WorkRecord {
  const timestamp = now.toISOString()
  return {
    date,
    worked: true,
    note: limitNote(note),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function sortedRecords(records: RecordMap, order: 'asc' | 'desc'): WorkRecord[] {
  const list = Object.values(records)
  list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  if (order === 'desc') list.reverse()
  return list
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

/** Validates a record read from storage or a backup file. Returns null if it isn't usable. */
export function parseRecord(value: unknown, fallbackTimestamp: string): WorkRecord | null {
  if (!isObject(value)) return null
  const { date, worked, note, createdAt, updatedAt } = value
  if (typeof date !== 'string' || !isValidIsoDate(date)) return null
  if (worked !== undefined && worked !== true) return null
  if (note !== undefined && note !== null && typeof note !== 'string') return null
  const cleanedNote = typeof note === 'string' ? cleanNote(note) : ''
  if (cleanedNote.length > MAX_NOTE_LENGTH) return null
  const created = isTimestamp(createdAt) ? createdAt : fallbackTimestamp
  return {
    date,
    worked: true,
    note: cleanedNote,
    createdAt: created,
    updatedAt: isTimestamp(updatedAt) ? updatedAt : created,
  }
}

export interface ImportPlan {
  /** Records found in the file. */
  detected: number
  /** Records whose date isn't saved yet. Only these get imported. */
  newRecords: WorkRecord[]
  /** Dates already saved on this device, or repeated in the file. Skipped. */
  duplicates: number
  /** Unreadable records, impossible dates or future dates. Skipped. */
  invalid: number
}

/**
 * Classifies imported records (null = failed validation). Existing records are
 * never overwritten: a date that is already saved is counted as a duplicate.
 */
export function planImport(
  candidates: readonly (WorkRecord | null)[],
  existing: RecordMap,
  today: string,
): ImportPlan {
  const seen = new Set<string>()
  const newRecords: WorkRecord[] = []
  let duplicates = 0
  let invalid = 0
  for (const candidate of candidates) {
    if (!candidate || candidate.date > today) {
      invalid += 1
      continue
    }
    if (existing[candidate.date] || seen.has(candidate.date)) duplicates += 1
    else newRecords.push(candidate)
    seen.add(candidate.date)
  }
  return { detected: candidates.length, newRecords, duplicates, invalid }
}
