import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createI18n } from '../../i18n/createI18n'
import type { RecordMap, Settings } from '../../types'
import { sortedRecords } from '../records'
import { computeServiceProgress } from '../service'
import { buildMachineLines, wrapMachineLine } from './machineFormat'
import {
  drawPage,
  layoutReport,
  MACHINE_BASELINE,
  MACHINE_FONT_SIZE,
  MACHINE_LINE_CHARS,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PIXELS_PER_POINT,
  type ReportContent,
} from './reportCanvas'

export interface PdfExportInput {
  settings: Settings
  records: RecordMap
  today: string
  now?: Date
}

function buildContent(settings: Settings, records: RecordMap, today: string): ReportContent {
  const i18n = createI18n(settings.language)
  const { t } = i18n
  const list = sortedRecords(records, 'asc') // the PDF lists dates ascending
  const progress = computeServiceProgress(settings, records, today)
  const finish = (remaining: number, date: string | null) =>
    remaining === 0 ? t('estimateCompleted') : date ? i18n.shortWeekdayDate(date) : '—'

  return {
    dir: i18n.dir,
    title: t('pdfTitle'),
    subtitle: t('pdfSubtitle'),
    summary: [
      { label: t('pdfName'), value: settings.name },
      { label: t('pdfExportDate'), value: i18n.date(today) },
      { label: t('pdfCompleted'), value: String(progress.workedDays) },
    ],
    service: progress.configured
      ? [
          { label: t('requiredDaysLabel'), value: String(progress.requiredNetDays) },
          { label: t('pdfRemainingWithout'), value: String(progress.remainingWithoutShortening) },
          {
            label: t('pdfEstimateWithout'),
            value: finish(progress.remainingWithoutShortening, progress.finishWithoutShortening),
          },
          { label: t('shorteningLabel'), value: String(progress.shorteningDays) },
          { label: t('pdfRemainingWith'), value: String(progress.remainingWithShortening) },
          {
            label: t('pdfEstimateWith'),
            value: finish(progress.remainingWithShortening, progress.finishWithShortening),
          },
        ]
      : null,
    columns: [t('pdfColDate'), t('pdfColWeekday'), t('pdfColStatus'), t('pdfColNote')],
    rows: list.map((record) => ({
      date: i18n.numericDate(record.date),
      weekday: i18n.weekday(record.date),
      status: `✓ ${t('statusWorked')}`,
      note: record.note,
    })),
    footer: t('appName'),
    pageLabel: (page, total) => t('pdfPage', { page, total }),
    importTitle: t('pdfImportTitle'),
    importNote: t('pdfImportNote'),
    machineLines: buildMachineLines(settings.name, list).flatMap((line) => wrapMachineLine(line, MACHINE_LINE_CHARS)),
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not render a PDF page'))
          return
        }
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject)
      },
      'image/jpeg',
      0.92,
    )
  })
}

/** Builds the PDF work log in the settings' language. Runs entirely in the browser. */
export async function createPdf({ settings, records, today, now = new Date() }: PdfExportInput): Promise<Blob> {
  const content = buildContent(settings, records, today)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PAGE_WIDTH * PIXELS_PER_POINT)
  canvas.height = Math.round(PAGE_HEIGHT * PIXELS_PER_POINT)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas is not available')
  const pages = layoutReport(ctx, content)

  const pdf = await PDFDocument.create()
  pdf.setTitle(`${content.title} – ${settings.name}`, { showInWindowTitleBar: true })
  pdf.setAuthor(settings.name)
  pdf.setSubject(content.subtitle)
  pdf.setCreator('Service Work Tracker')
  pdf.setProducer('Service Work Tracker')
  pdf.setLanguage(settings.language)
  pdf.setCreationDate(now)
  pdf.setModificationDate(now)

  const courier = await pdf.embedFont(StandardFonts.Courier)
  for (const [index, plan] of pages.entries()) {
    drawPage(ctx, content, plan, index, pages.length)
    const image = await pdf.embedJpg(await canvasToJpeg(canvas))
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    page.drawImage(image, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })
    // Machine-readable lines as real (ASCII) text, so PDF.js can read them back.
    for (const line of plan.machineLines) {
      page.drawText(line.text, {
        x: MARGIN,
        y: PAGE_HEIGHT - line.top - MACHINE_BASELINE,
        size: MACHINE_FONT_SIZE,
        font: courier,
        color: rgb(0.27, 0.3, 0.36),
      })
    }
  }

  const bytes = await pdf.save()
  // slice() copies into a plain ArrayBuffer-backed array, which Blob accepts.
  return new Blob([bytes.slice()], { type: 'application/pdf' })
}
