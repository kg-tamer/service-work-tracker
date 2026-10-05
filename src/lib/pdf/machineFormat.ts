import type { WorkRecord } from '../../types'
import { isValidIsoDate } from '../dates'
import { cleanNote, MAX_NOTE_LENGTH } from '../records'

// Machine-readable section that exported PDFs contain as plain text:
//
//   SERVICE_WORK_TRACKER_V1
//   NAME: <name>
//   RECORD: 2026-09-01|worked|<note>
//   RECORD: 2026-09-02|worked|
//   END_SERVICE_WORK_TRACKER
//
// The name and notes are percent-encoded UTF-8 (encodeURIComponent, plus "_"),
// so every line is plain ASCII. That keeps the text exactly extractable by
// PDF.js in every language, and an encoded value can never contain "|", ":" or
// the marker words. Long lines are wrapped when drawn; a line that doesn't start
// with "NAME:" or "RECORD:" continues the previous line.

export const START_MARKER = 'SERVICE_WORK_TRACKER_V1'
export const END_MARKER = 'END_SERVICE_WORK_TRACKER'
export const MAX_PDF_BYTES = 25 * 1024 * 1024

const KEYWORD_LINE = /^(NAME|RECORD)\s*:\s*(.*)$/

/** Replaces unpaired UTF-16 surrogates (which encodeURIComponent rejects) with U+FFFD. */
function wellFormed(value: string): string {
  let result = ''
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    const next = value.charCodeAt(i + 1)
    if (code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      result += value[i] + value[i + 1]
      i += 1
    } else {
      result += code >= 0xd800 && code <= 0xdfff ? '�' : value[i]
    }
  }
  return result
}

export function encodeField(value: string): string {
  return encodeURIComponent(wellFormed(value)).replace(/_/g, '%5F')
}

/** Returns null when an encoded value is damaged. */
function decodeField(value: string): string | null {
  if (!value.includes('%')) return value.trim()
  try {
    // Encoded values never contain spaces, so any whitespace came from text extraction.
    return decodeURIComponent(value.replace(/\s+/g, ''))
  } catch {
    return null
  }
}

export function buildMachineLines(name: string, records: readonly WorkRecord[]): string[] {
  return [
    START_MARKER,
    `NAME: ${encodeField(name)}`,
    ...records.map((record) => `RECORD: ${record.date}|worked|${encodeField(record.note)}`),
    END_MARKER,
  ]
}

/** Splits a line into pieces of at most `width` characters. */
export function wrapMachineLine(line: string, width: number): string[] {
  const pieces: string[] = []
  for (let index = 0; index < line.length; index += width) pieces.push(line.slice(index, index + width))
  return pieces.length > 0 ? pieces : ['']
}

export interface MachineEntry {
  date: string
  status: string
  note: string
}

export type MachineParseResult =
  | { ok: true; name: string | null; entries: (MachineEntry | null)[] }
  | { ok: false; error: 'noMarker' | 'noEndMarker' }

/** Finds and parses the machine-readable section in text extracted from a PDF. */
export function parseMachineText(text: string): MachineParseResult {
  const lines = text.split(/\r\n|\r|\n/).map((line) => line.trim())
  const start = lines.findIndex((line) => line.includes(START_MARKER))
  if (start === -1) return { ok: false, error: 'noMarker' }
  const end = lines.findIndex((line, index) => index > start && line.includes(END_MARKER))
  if (end === -1) return { ok: false, error: 'noEndMarker' }

  // Join wrapped lines back together. A piece of a wrapped line never contains
  // ":" (it is always percent-encoded), so a stray line with ":" stays separate
  // and is reported as invalid instead of corrupting the previous record.
  const logicalLines: string[] = []
  for (const line of lines.slice(start + 1, end)) {
    if (!line) continue
    const isContinuation = logicalLines.length > 0 && !KEYWORD_LINE.test(line) && !line.includes(':')
    if (isContinuation) logicalLines[logicalLines.length - 1] += line
    else logicalLines.push(line)
  }

  let name: string | null = null
  const entries: (MachineEntry | null)[] = []
  for (const line of logicalLines) {
    const match = KEYWORD_LINE.exec(line)
    if (!match) {
      entries.push(null)
      continue
    }
    const [, keyword, rest] = match
    if (keyword === 'NAME') {
      name = decodeField(rest)
      continue
    }
    const [date = '', status = '', ...noteParts] = rest.split('|')
    const note = decodeField(noteParts.join('|'))
    entries.push(note === null ? null : { date: date.trim(), status: status.trim(), note })
  }
  return { ok: true, name, entries }
}

/** Turns a parsed entry into a work record, or null when it isn't valid. */
export function entryToRecord(entry: MachineEntry | null, timestamp: string): WorkRecord | null {
  if (!entry || entry.status.toLowerCase() !== 'worked' || !isValidIsoDate(entry.date)) return null
  const note = cleanNote(entry.note)
  if (note.length > MAX_NOTE_LENGTH) return null
  return { date: entry.date, worked: true, note, createdAt: timestamp, updatedAt: timestamp }
}
