import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, Settings, WorkRecord } from '../types'
import { todayIso } from '../lib/dates'
import { createRecord, limitNote } from '../lib/records'
import { newWorkDayProblem, type NewWorkDayProblem } from '../lib/service'
import { deleteAllData, emptyData, loadData, saveData, STORAGE_KEY } from '../lib/storage'

export type AddRecordResult = 'added' | 'failed' | NewWorkDayProblem

export interface AppActions {
  saveSettings: (settings: Settings) => boolean
  addRecord: (date: string, note: string) => AddRecordResult
  updateNote: (date: string, note: string) => boolean
  deleteRecord: (date: string) => boolean
  /** Adds only dates that aren't saved yet. Returns how many were added, or null if saving failed. */
  importRecords: (records: readonly WorkRecord[], settings: Settings | null) => number | null
  deleteAll: () => boolean
}

/**
 * App data, persisted in localStorage. Every change starts from the latest
 * saved data (another open tab may have changed it), so nothing gets lost.
 */
export function useAppData(onSaveError: () => void): { data: AppData; actions: AppActions } {
  const [data, setData] = useState<AppData>(loadData)
  const onSaveErrorRef = useRef(onSaveError)
  useEffect(() => {
    onSaveErrorRef.current = onSaveError
  })

  // Follow changes made in another tab or window.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEY) setData(loadData())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const actions = useMemo<AppActions>(() => {
    function persist(next: AppData): boolean {
      try {
        saveData(next)
      } catch {
        onSaveErrorRef.current()
        return false
      }
      setData(next)
      return true
    }

    return {
      saveSettings(settings) {
        return persist({ ...loadData(), settings })
      },

      addRecord(date, note) {
        const current = loadData()
        const problem = newWorkDayProblem(date, current.records, current.settings?.weeklyDaysOff ?? [], todayIso())
        if (problem) {
          setData(current)
          return problem
        }
        const records = { ...current.records, [date]: createRecord(date, note) }
        return persist({ ...current, records }) ? 'added' : 'failed'
      },

      updateNote(date, note) {
        const current = loadData()
        const record = current.records[date]
        if (!record) {
          setData(current)
          return false
        }
        const updated = { ...record, note: limitNote(note), updatedAt: new Date().toISOString() }
        return persist({ ...current, records: { ...current.records, [date]: updated } })
      },

      deleteRecord(date) {
        const current = loadData()
        if (!current.records[date]) {
          setData(current)
          return true
        }
        const records = { ...current.records }
        delete records[date]
        return persist({ ...current, records })
      },

      importRecords(newRecords, settings) {
        const current = loadData()
        const records = { ...current.records }
        let added = 0
        for (const record of newRecords) {
          if (records[record.date]) continue // never overwrite an existing record
          records[record.date] = record
          added += 1
        }
        const next = { settings: settings ?? current.settings, records }
        return persist(next) ? added : null
      },

      deleteAll() {
        try {
          deleteAllData()
        } catch {
          onSaveErrorRef.current()
          return false
        }
        setData(emptyData())
        return true
      },
    }
  }, [])

  return { data, actions }
}
