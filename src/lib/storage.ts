import type { AppData, RecordMap } from '../types'
import { isObject } from './guards'
import { parseRecord, sortedRecords } from './records'
import { parseSettings } from './settings'

/** localStorage key holding { schemaVersion, settings, records }. */
export const STORAGE_KEY = 'service-work-tracker'

/**
 * If stored data can't be read completely, the original text is copied here
 * before anything is overwritten, so records are never silently lost.
 */
const RECOVERY_KEY = 'service-work-tracker:recovery'

/**
 * Stored data versions:
 *   1 – settings { name, language }
 *   2 – settings also hold requiredNetDays, shorteningDays and weeklyDaysOff
 * Older data is migrated when it is loaded (see parseSettings).
 */
export const STORAGE_SCHEMA_VERSION = 2

export function emptyData(): AppData {
  return { settings: null, records: {} }
}

export function loadData(): AppData {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyData()
  }
  if (raw === null) return emptyData()
  try {
    const { data, lossy } = readStoredData(JSON.parse(raw))
    if (lossy) keepRecoveryCopy(raw)
    return data
  } catch {
    keepRecoveryCopy(raw)
    return emptyData()
  }
}

function readStoredData(value: unknown): { data: AppData; lossy: boolean } {
  if (!isObject(value) || !Array.isArray(value.records)) throw new Error('Unrecognized stored data')
  const version = typeof value.schemaVersion === 'number' ? value.schemaVersion : 1
  const settings = value.settings == null ? null : parseSettings(value.settings)
  let lossy = version > STORAGE_SCHEMA_VERSION || (value.settings != null && settings === null)

  const fallbackTimestamp = new Date().toISOString()
  const records: RecordMap = {}
  for (const item of value.records) {
    const record = parseRecord(item, fallbackTimestamp)
    if (!record) {
      lossy = true
      continue
    }
    const existing = records[record.date]
    if (existing) {
      lossy = true
      if (existing.updatedAt >= record.updatedAt) continue
    }
    records[record.date] = record
  }
  return { data: { settings, records }, lossy }
}

function keepRecoveryCopy(raw: string): void {
  try {
    if (window.localStorage.getItem(RECOVERY_KEY) === null) {
      window.localStorage.setItem(RECOVERY_KEY, raw)
    }
  } catch {
    // Storage is unavailable; there is nothing more we can do here.
  }
}

/** Throws if the browser refuses to store the data (storage full or blocked). */
export function saveData(data: AppData): void {
  const stored = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    settings: data.settings,
    records: sortedRecords(data.records, 'asc'),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function deleteAllData(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(RECOVERY_KEY)
}
