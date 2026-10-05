import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { WorkRecord } from '../../types'
import { entryToRecord, parseMachineText } from './machineFormat'

GlobalWorkerOptions.workerSrc = workerUrl

/** Extracts all text from a PDF with PDF.js. The file is read locally and never uploaded. */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const task = getDocument({
    data: new Uint8Array(data),
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  })
  try {
    const pdf = await task.promise
    const parts: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      for (const item of content.items) {
        if (!('str' in item)) continue
        parts.push(item.str)
        if (item.hasEOL) parts.push('\n')
      }
      parts.push('\n')
    }
    return parts.join('')
  } finally {
    await task.destroy()
  }
}

export type PdfImportResult =
  | { ok: true; name: string | null; candidates: (WorkRecord | null)[] }
  | { ok: false; error: 'notCompatible' | 'damaged' | 'unreadable' }

/** Reads the machine-readable section of a PDF exported by this app. Changes nothing. */
export async function readImportPdf(file: File): Promise<PdfImportResult> {
  let text: string
  try {
    text = await extractPdfText(await file.arrayBuffer())
  } catch {
    return { ok: false, error: 'unreadable' }
  }
  const parsed = parseMachineText(text)
  if (!parsed.ok) return { ok: false, error: parsed.error === 'noMarker' ? 'notCompatible' : 'damaged' }
  const timestamp = new Date().toISOString()
  return { ok: true, name: parsed.name, candidates: parsed.entries.map((entry) => entryToRecord(entry, timestamp)) }
}
