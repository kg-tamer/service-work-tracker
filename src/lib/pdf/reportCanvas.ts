// The visual pages of the PDF report are drawn on a canvas by the browser's own
// text engine. It shapes Arabic, orders mixed Hebrew/Arabic/Latin text correctly
// and falls back to any font the device has, so no PDF font can break RTL text.
// Each page then goes into the PDF as an image; the machine-readable import
// lines are added separately as real text (see exportPdf.ts).

export const PAGE_WIDTH = 595.28 // A4 in PDF points
export const PAGE_HEIGHT = 841.89
export const MARGIN = 40
export const PIXELS_PER_POINT = 2.5 // ≈180 dpi

export const MACHINE_FONT_SIZE = 6.5
export const MACHINE_LINE_HEIGHT = 8.5
/** Distance from the top of a machine line to its text baseline. */
export const MACHINE_BASELINE = 6.3
/** Courier is 0.6 em wide: 120 characters at 6.5 pt fit easily in the content width. */
export const MACHINE_LINE_CHARS = 120

const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const CONTENT_BOTTOM = PAGE_HEIGHT - 52

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Arabic", "Noto Sans Hebrew", Arial, sans-serif'

interface Font {
  size: number
  weight?: number
}

const FONTS = {
  title: { size: 20, weight: 700 },
  subtitle: { size: 10 },
  label: { size: 8 },
  value: { size: 11, weight: 700 },
  tableHeader: { size: 8.5, weight: 700 },
  cell: { size: 9.5 },
  status: { size: 9.5, weight: 600 },
  captionTitle: { size: 9.5, weight: 700 },
  caption: { size: 7.5 },
  footer: { size: 7.5 },
} satisfies Record<string, Font>

const COLORS = {
  text: '#1d2433',
  muted: '#5d6679',
  faint: '#98a2b3',
  line: '#e3e6ec',
  box: '#f3f5f8',
  headerFill: '#e9edf3',
  zebra: '#f8f9fb',
  worked: '#137a46',
}

const TITLE_HEIGHT = 28
const SUBTITLE_HEIGHT = 16
const BOX_GAP = 12
const SUMMARY_HEIGHT = 44
const SERVICE_HEIGHT = 84
const TABLE_GAP = 18
const TABLE_HEADER_HEIGHT = 22
const ROW_LINE_HEIGHT = 13
const ROW_PADDING = 6
const CELL_PADDING = 8
/** Date, weekday, status, note. */
const COLUMNS = [78, 84, 80, CONTENT_WIDTH - 242] as const
const COLUMN_OFFSETS = COLUMNS.map((_, index) => COLUMNS.slice(0, index).reduce((sum, width) => sum + width, 0))
const CAPTION_GAP = 18
const CAPTION_LINE_HEIGHT = 10

type Direction = 'rtl' | 'ltr'
type Context = CanvasRenderingContext2D

export interface ReportItem {
  label: string
  value: string
}

export interface ReportRow {
  date: string
  weekday: string
  status: string
  note: string
}

export interface ReportContent {
  dir: Direction
  title: string
  subtitle: string
  summary: ReportItem[]
  /** Service progress items, or null when the service settings aren't configured. */
  service: ReportItem[] | null
  columns: readonly [string, string, string, string]
  rows: ReportRow[]
  footer: string
  pageLabel: (page: number, total: number) => string
  importTitle: string
  importNote: string
  machineLines: string[]
}

interface PlacedRow {
  row: ReportRow
  index: number
  top: number
  height: number
  noteLines: string[]
}

export interface PagePlan {
  first: boolean
  tableTop: number | null
  rows: PlacedRow[]
  captionTop: number | null
  captionLines: string[]
  machineLines: { text: string; top: number }[]
}

function setFont(ctx: Context, font: Font): void {
  ctx.font = `${font.weight ?? 400} ${font.size}px ${FONT_STACK}`
}

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/

/** Direction of the first strong character, like dir="auto" in HTML. */
function textDirection(text: string, fallback: Direction): Direction {
  for (const char of text) {
    if (RTL_CHAR.test(char)) return 'rtl'
    if (LTR_CHAR.test(char)) return 'ltr'
  }
  return fallback
}

function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment)
  }
  return Array.from(text)
}

/** Shortens text with "…" until it fits. */
function fitText(ctx: Context, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const parts = graphemes(text)
  let low = 0
  let high = parts.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (ctx.measureText(`${parts.slice(0, middle).join('')}…`).width <= maxWidth) low = middle
    else high = middle - 1
  }
  return `${parts.slice(0, low).join('').trimEnd()}…`
}

/** Breaks text into lines that fit the width, keeping the user's own line breaks. */
function wrapText(ctx: Context, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      line = ''
      if (ctx.measureText(word).width <= maxWidth) {
        line = word
        continue
      }
      // A single word wider than the column is broken between characters.
      for (const part of graphemes(word)) {
        if (line && ctx.measureText(line + part).width > maxWidth) {
          lines.push(line)
          line = ''
        }
        line += part
      }
    }
    lines.push(line)
  }
  return lines
}

/** Physical left x of a box that starts `offset` points from the content's start edge. */
function boxLeft(dir: Direction, offset: number, width: number): number {
  return dir === 'rtl' ? PAGE_WIDTH - MARGIN - offset - width : MARGIN + offset
}

function drawText(
  ctx: Context,
  dir: Direction,
  text: string,
  offset: number,
  width: number,
  y: number,
  font: Font,
  color: string,
  align: 'start' | 'end' = 'start',
  textDir: Direction = textDirection(text, dir),
): void {
  setFont(ctx, font)
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.direction = textDir
  const left = boxLeft(dir, offset, width)
  const alignLeft = (align === 'start') === (dir === 'ltr')
  ctx.textAlign = alignLeft ? 'left' : 'right'
  ctx.fillText(fitText(ctx, text, width), alignLeft ? left : left + width, y)
}

function fillBox(
  ctx: Context,
  dir: Direction,
  offset: number,
  width: number,
  top: number,
  height: number,
  color: string,
  radius = 0,
): void {
  const left = boxLeft(dir, offset, width)
  ctx.fillStyle = color
  ctx.beginPath()
  if (radius > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(left, top, width, height, radius)
  else ctx.rect(left, top, width, height)
  ctx.fill()
}

function horizontalLine(ctx: Context, y: number, color: string, lineWidth = 0.75): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(PAGE_WIDTH - MARGIN, y)
  ctx.stroke()
}

function headerHeight(content: ReportContent): number {
  const service = content.service ? 8 + SERVICE_HEIGHT : 0
  return TITLE_HEIGHT + SUBTITLE_HEIGHT + BOX_GAP + SUMMARY_HEIGHT + service + TABLE_GAP
}

/** Splits the report into pages. `ctx` is only used to measure text. */
export function layoutReport(ctx: Context, content: ReportContent): PagePlan[] {
  const pages: PagePlan[] = []
  const addPage = (): PagePlan => {
    const page: PagePlan = {
      first: pages.length === 0,
      tableTop: null,
      rows: [],
      captionTop: null,
      captionLines: [],
      machineLines: [],
    }
    pages.push(page)
    return page
  }

  let page = addPage()
  let y = MARGIN + headerHeight(content)

  setFont(ctx, FONTS.cell)
  const noteWidth = COLUMNS[3] - 2 * CELL_PADDING
  const maxNoteLines = Math.floor((CONTENT_BOTTOM - MARGIN - TABLE_HEADER_HEIGHT - 2 * ROW_PADDING) / ROW_LINE_HEIGHT)
  content.rows.forEach((row, index) => {
    const noteLines = wrapText(ctx, row.note, noteWidth).slice(0, maxNoteLines)
    const height = 2 * ROW_PADDING + Math.max(1, noteLines.length) * ROW_LINE_HEIGHT
    const headerSpace = page.tableTop === null ? TABLE_HEADER_HEIGHT : 0
    if (y + headerSpace + height > CONTENT_BOTTOM) {
      page = addPage()
      y = MARGIN
    }
    if (page.tableTop === null) {
      page.tableTop = y
      y += TABLE_HEADER_HEIGHT
    }
    page.rows.push({ row, index, top: y, height, noteLines })
    y += height
  })

  // Import data: a short caption, then the machine-readable lines.
  setFont(ctx, FONTS.caption)
  const captionLines = wrapText(ctx, content.importNote, CONTENT_WIDTH)
  const captionHeight = 16 + captionLines.length * CAPTION_LINE_HEIGHT + 8
  if (y + CAPTION_GAP + captionHeight + 2 * MACHINE_LINE_HEIGHT > CONTENT_BOTTOM) {
    page = addPage()
    y = MARGIN
  } else {
    y += CAPTION_GAP
  }
  page.captionTop = y
  page.captionLines = captionLines
  y += captionHeight
  for (const text of content.machineLines) {
    if (y + MACHINE_LINE_HEIGHT > CONTENT_BOTTOM) {
      page = addPage()
      y = MARGIN
    }
    page.machineLines.push({ text, top: y })
    y += MACHINE_LINE_HEIGHT
  }
  return pages
}

function drawItemGrid(ctx: Context, dir: Direction, items: ReportItem[], top: number, height: number): void {
  const columns = 3
  fillBox(ctx, dir, 0, CONTENT_WIDTH, top, height, COLORS.box, 8)
  const rowCount = Math.ceil(items.length / columns)
  const cellWidth = CONTENT_WIDTH / columns
  const rowHeight = (height - 8) / rowCount
  items.forEach((item, index) => {
    const offset = (index % columns) * cellWidth + 12
    const rowTop = top + 4 + Math.floor(index / columns) * rowHeight
    drawText(ctx, dir, item.label, offset, cellWidth - 20, rowTop + rowHeight * 0.34, FONTS.label, COLORS.muted)
    drawText(ctx, dir, item.value, offset, cellWidth - 20, rowTop + rowHeight * 0.7, FONTS.value, COLORS.text)
  })
}

function drawHeader(ctx: Context, content: ReportContent): void {
  const { dir } = content
  let y = MARGIN
  drawText(ctx, dir, content.title, 0, CONTENT_WIDTH, y + TITLE_HEIGHT / 2, FONTS.title, COLORS.text)
  y += TITLE_HEIGHT
  drawText(ctx, dir, content.subtitle, 0, CONTENT_WIDTH, y + SUBTITLE_HEIGHT / 2, FONTS.subtitle, COLORS.muted)
  y += SUBTITLE_HEIGHT + BOX_GAP
  drawItemGrid(ctx, dir, content.summary, y, SUMMARY_HEIGHT)
  y += SUMMARY_HEIGHT
  if (content.service) drawItemGrid(ctx, dir, content.service, y + 8, SERVICE_HEIGHT)
}

function drawTableHeader(ctx: Context, content: ReportContent, top: number): void {
  fillBox(ctx, content.dir, 0, CONTENT_WIDTH, top, TABLE_HEADER_HEIGHT, COLORS.headerFill, 6)
  content.columns.forEach((label, index) => {
    const offset = COLUMN_OFFSETS[index] + CELL_PADDING
    const width = COLUMNS[index] - 2 * CELL_PADDING
    drawText(ctx, content.dir, label, offset, width, top + TABLE_HEADER_HEIGHT / 2, FONTS.tableHeader, COLORS.muted)
  })
}

function drawRow(ctx: Context, content: ReportContent, placed: PlacedRow): void {
  const { dir } = content
  if (placed.index % 2 === 1) fillBox(ctx, dir, 0, CONTENT_WIDTH, placed.top, placed.height, COLORS.zebra)
  const y = placed.top + ROW_PADDING + ROW_LINE_HEIGHT / 2
  const cell = (index: number) => ({ offset: COLUMN_OFFSETS[index] + CELL_PADDING, width: COLUMNS[index] - 2 * CELL_PADDING })
  const [date, weekday, status, note] = [cell(0), cell(1), cell(2), cell(3)]
  drawText(ctx, dir, placed.row.date, date.offset, date.width, y, FONTS.cell, COLORS.text)
  drawText(ctx, dir, placed.row.weekday, weekday.offset, weekday.width, y, FONTS.cell, COLORS.text)
  drawText(ctx, dir, placed.row.status, status.offset, status.width, y, FONTS.status, COLORS.worked)
  const noteDir = textDirection(placed.row.note, dir)
  placed.noteLines.forEach((line, index) => {
    const lineY = y + index * ROW_LINE_HEIGHT
    drawText(ctx, dir, line, note.offset, note.width, lineY, FONTS.cell, COLORS.text, 'start', noteDir)
  })
  horizontalLine(ctx, placed.top + placed.height, COLORS.line)
}

function drawCaption(ctx: Context, content: ReportContent, page: PagePlan): void {
  if (page.captionTop === null) return
  const top = page.captionTop
  horizontalLine(ctx, top, COLORS.line)
  drawText(ctx, content.dir, content.importTitle, 0, CONTENT_WIDTH, top + 10, FONTS.captionTitle, COLORS.text)
  page.captionLines.forEach((line, index) => {
    const y = top + 21 + index * CAPTION_LINE_HEIGHT
    drawText(ctx, content.dir, line, 0, CONTENT_WIDTH, y, FONTS.caption, COLORS.muted)
  })
}

function drawFooter(ctx: Context, content: ReportContent, pageNumber: number, pageCount: number): void {
  const y = PAGE_HEIGHT - 26
  const half = CONTENT_WIDTH / 2
  horizontalLine(ctx, y - 10, COLORS.line, 0.5)
  drawText(ctx, content.dir, content.footer, 0, half, y, FONTS.footer, COLORS.faint)
  drawText(ctx, content.dir, content.pageLabel(pageNumber, pageCount), half, half, y, FONTS.footer, COLORS.faint, 'end')
}

/** Paints one complete page (white background, content, footer) onto the canvas. */
export function drawPage(ctx: Context, content: ReportContent, page: PagePlan, index: number, pageCount: number): void {
  ctx.setTransform(PIXELS_PER_POINT, 0, 0, PIXELS_PER_POINT, 0, 0)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  if (page.first) drawHeader(ctx, content)
  if (page.tableTop !== null) drawTableHeader(ctx, content, page.tableTop)
  for (const placed of page.rows) drawRow(ctx, content, placed)
  drawCaption(ctx, content, page)
  drawFooter(ctx, content, index + 1, pageCount)
}
