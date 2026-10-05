import { useId, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { sortedRecords } from '../lib/records'
import type { RecordMap } from '../types'
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from './icons'
import type { EditorState } from './RecordDialog'

interface Props {
  records: RecordMap
  onOpenEditor: (state: EditorState) => void
  /** Opens the delete confirmation. Nothing is deleted without it. */
  onRequestDelete: (date: string) => void
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function HistoryScreen({ records, onOpenEditor, onRequestDelete }: Props) {
  const i18n = useI18n()
  const { t } = i18n
  const monthId = useId()
  const yearId = useId()
  const [month, setMonth] = useState('all')
  const [year, setYear] = useState('all')

  const newestFirst = useMemo(() => sortedRecords(records, 'desc'), [records])
  const years = useMemo(() => [...new Set(newestFirst.map((record) => record.date.slice(0, 4)))], [newestFirst])
  const activeYear = years.includes(year) ? year : 'all'
  const visible = newestFirst.filter(
    (record) =>
      (activeYear === 'all' || record.date.startsWith(`${activeYear}-`)) &&
      (month === 'all' || Number(record.date.slice(5, 7)) === Number(month)),
  )

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title" tabIndex={-1}>
          {t('historyTitle')}
        </h1>
        <button type="button" className="button primary small" onClick={() => onOpenEditor({ mode: 'add' })}>
          <PlusIcon />
          {t('addPastDay')}
        </button>
      </header>

      <div className="filters">
        <div className="field">
          <label htmlFor={monthId}>{t('filterMonth')}</label>
          <select id={monthId} className="select" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t('allMonths')}</option>
            {MONTHS.map((value) => (
              <option key={value} value={String(value)}>
                {i18n.monthName(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={yearId}>{t('filterYear')}</label>
          <select id={yearId} className="select" value={activeYear} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{t('allYears')}</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="results-count" aria-live="polite">
        {t('daysShown', { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p className="empty-state">{newestFirst.length === 0 ? t('historyEmpty') : t('historyEmptyFiltered')}</p>
      ) : (
        <ul className="record-list">
          {visible.map((record) => {
            const dateText = i18n.date(record.date)
            return (
              <li key={record.date} className="record-card">
                <div className="record-top">
                  <div className="record-when">
                    <span className="record-weekday">{i18n.weekday(record.date)}</span>
                    <span className="record-date">{dateText}</span>
                  </div>
                  <span className="badge success">
                    <CheckIcon />
                    {t('statusWorked')}
                  </span>
                </div>
                {record.note && (
                  <p className="record-note" dir="auto">
                    {record.note}
                  </p>
                )}
                <div className="record-actions">
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => onOpenEditor({ mode: 'edit', date: record.date })}
                    aria-label={t('editDayAria', { date: dateText })}
                  >
                    <EditIcon />
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    className="button danger-ghost small"
                    onClick={() => onRequestDelete(record.date)}
                    aria-label={t('deleteDayAria', { date: dateText })}
                  >
                    <TrashIcon />
                    {t('delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
