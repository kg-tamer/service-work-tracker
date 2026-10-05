import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { CALENDAR_WEEKDAYS } from '../i18n/translations'
import { addMonths, daysInMonth, pad2, parseIsoDate, toIsoDate, weekdayOf } from '../lib/dates'
import { isDayOff } from '../lib/service'
import type { RecordMap, Weekday } from '../types'
import { CheckIcon, ChevronEndIcon, ChevronStartIcon } from './icons'
import type { EditorState } from './RecordDialog'

interface Props {
  records: RecordMap
  weeklyDaysOff: readonly Weekday[]
  today: string
  onOpenEditor: (state: EditorState) => void
  onDayOffTapped: () => void
}

type DayState = 'worked' | 'off' | 'future' | 'open'

export function CalendarScreen({ records, weeklyDaysOff, today, onOpenEditor, onDayOffTapped }: Props) {
  const i18n = useI18n()
  const { t } = i18n
  const now = parseIsoDate(today) ?? { year: 2000, month: 1, day: 1 }
  const [cursor, setCursor] = useState({ year: now.year, month: now.month })

  const isCurrentMonth = cursor.year === now.year && cursor.month === now.month
  const atLatestMonth = cursor.year * 12 + cursor.month >= now.year * 12 + now.month
  const leadingBlanks = weekdayOf(toIsoDate(cursor.year, cursor.month, 1)) // weeks start on Sunday
  const monthPrefix = `${cursor.year}-${pad2(cursor.month)}-`
  const monthCount = Object.keys(records).filter((date) => date.startsWith(monthPrefix)).length
  const days = Array.from({ length: daysInMonth(cursor.year, cursor.month) }, (_, index) => index + 1)

  function handleDay(date: string, state: DayState) {
    if (state === 'worked') onOpenEditor({ mode: 'edit', date })
    else if (state === 'off') onDayOffTapped() // explain; never offers to add a work day
    else if (state === 'open') onOpenEditor({ mode: 'add', date })
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title" tabIndex={-1}>
          {t('calendarTitle')}
        </h1>
        {!isCurrentMonth && (
          <button
            type="button"
            className="button secondary small"
            onClick={() => setCursor({ year: now.year, month: now.month })}
          >
            {t('backToToday')}
          </button>
        )}
      </header>

      <section className="card calendar-card">
        <div className="calendar-nav">
          <button
            type="button"
            className="icon-button"
            onClick={() => setCursor((current) => addMonths(current.year, current.month, -1))}
            aria-label={t('previousMonth')}
          >
            <ChevronStartIcon />
          </button>
          <h2 className="calendar-month" aria-live="polite">
            {i18n.monthYear(cursor.year, cursor.month)}
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => setCursor((current) => addMonths(current.year, current.month, 1))}
            disabled={atLatestMonth}
            aria-label={t('nextMonth')}
          >
            <ChevronEndIcon />
          </button>
        </div>

        <div className="calendar-grid">
          {CALENDAR_WEEKDAYS[i18n.language].map((name, index) => (
            <span key={name} className={`calendar-weekday${weeklyDaysOff.includes(index as Weekday) ? ' is-off' : ''}`} aria-hidden="true">
              {name}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {days.map((day) => {
            const date = toIsoDate(cursor.year, cursor.month, day)
            const worked = Boolean(records[date])
            const off = isDayOff(date, weeklyDaysOff)
            // An existing record always wins, even on a date that is now a day off.
            const state: DayState = worked ? 'worked' : off ? 'off' : date > today ? 'future' : 'open'
            const isToday = date === today
            const dateText = i18n.weekdayDate(date)
            const label =
              (state === 'worked'
                ? t('dayLabelWorked', { date: dateText })
                : state === 'off'
                  ? t('dayLabelDayOff', { date: dateText })
                  : state === 'future'
                    ? dateText
                    : t('dayLabelEmpty', { date: dateText })) + (isToday ? ` ${t('todaySuffix')}` : '')
            return (
              <button
                key={date}
                type="button"
                className={`day is-${state}${isToday ? ' is-today' : ''}${worked && off ? ' is-on-day-off' : ''}`}
                onClick={() => handleDay(date, state)}
                disabled={state === 'future' || (state === 'off' && date > today)}
                aria-disabled={state === 'off' ? true : undefined}
                aria-current={isToday ? 'date' : undefined}
                aria-label={label}
              >
                <span className="day-number">{day}</span>
                {state === 'worked' && <CheckIcon className="day-mark" />}
              </button>
            )
          })}
        </div>

        <p className="calendar-count">{t('monthWorkDays', { count: monthCount })}</p>

        <ul className="legend">
          <li>
            <span className="legend-swatch is-worked" aria-hidden="true">
              <CheckIcon />
            </span>
            {t('legendWorked')}
          </li>
          <li>
            <span className="legend-swatch is-off" aria-hidden="true" />
            {t('legendDayOff')}
          </li>
          <li>
            <span className="legend-swatch is-today" aria-hidden="true" />
            {t('legendToday')}
          </li>
        </ul>
      </section>

      <p className="hint">{t('calendarHint')}</p>
    </div>
  )
}
