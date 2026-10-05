import type { AppData, WorkRecord } from '../types'
import { isObject } from './guards'
import { parseRecord, sortedRecords } from './records'

/**
 * Backup file versions:
 *   1 – settings { name, language }
 *   2 – settings also include requiredNetDays, shorteningDays and weeklyDaysOff
 * Both versions can be imported.
 */
export const BACKUP_SCHEMA_VERSION = 2
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export function createBackupBlob(data: AppData, now: Date = new Date()): Blob {
  const backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: data.settings,
    records: sortedRecords(data.records, 'asc'),
  }
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export type BackupReadResult =
  | { ok: true; candidates: (WorkRecord | null)[]; settings: unknown }
  | { ok: false; error: 'invalidJson' | 'notBackup' | 'newerVersion' }

/** Validates a backup file. Nothing is changed here; the caller shows a preview first. */
export function readBackup(text: string): BackupReadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
  if (
    !isObject(parsed) ||
    !Array.isArray(parsed.records) ||
    typeof parsed.schemaVersion !== 'number' ||
    !Number.isInteger(parsed.schemaVersion) ||
    parsed.schemaVersion < 1
  ) {
    return { ok: false, error: 'notBackup' }
  }
  if (parsed.schemaVersion > BACKUP_SCHEMA_VERSION) return { ok: false, error: 'newerVersion' }

  const fallbackTimestamp = new Date().toISOString()
  return {
    ok: true,
    candidates: parsed.records.map((item) => parseRecord(item, fallbackTimestamp)),
    settings: parsed.settings ?? null,
  }
}
