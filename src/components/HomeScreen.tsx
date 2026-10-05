import { useId, useMemo, useState } from 'react'
import { isolate } from '../i18n/createI18n'
import { useI18n } from '../i18n/I18nContext'
import { MAX_NOTE_LENGTH } from '../lib/records'
import { computeServiceProgress, isDayOff } from '../lib/service'
import type { RecordMap, Settings } from '../types'
import { CheckIcon, EditIcon, MoonIcon, PlusIcon } from './icons'
import { ProgressCard } from './ProgressCard'
import type { EditorState } from './RecordDialog'

interface Props {
  settings: Settings
  records: RecordMap
  today: string
  /** Registers today's work. Returns true when a record was created. */
  onRegisterToday: (note: string) => boolean
  onOpenEditor: (state: EditorState) => void
}

export function HomeScreen({ settings, records, today, onRegisterToday, onOpenEditor }: Props) {
  const i18n = useI18n()
  const { t } = i18n
  const noteId = useId()
  const [note, setNote] = useState('')

  const todayRecord = records[today]
  const status = todayRecord ? 'registered' : isDayOff(today, settings.weeklyDaysOff) ? 'dayOff' : 'open'
  const progress = useMemo(() => computeServiceProgress(settings, records, today), [settings, records, today])
  const thisMonth = useMemo(() => {
    const month = today.slice(0, 7)
    return Object.keys(records).filter((date) => date.startsWith(month)).length
  }, [records, today])
  const lastDate = useMemo(
    () => Object.keys(records).reduce<string | null>((latest, date) => (latest && latest > date ? latest : date), null),
    [records],
  )

  function handleWorkedToday() {
    if (todayRecord) {
      // Never a duplicate: open today's existing record instead.
      onOpenEditor({ mode: 'edit', date: today, notice: 'alreadyRegistered' })
      return
    }
    if (onRegisterToday(note)) setNote('')
  }

  return (
    <div className="screen home">
      <header className="today-header">
        <h1 className="greeting" tabIndex={-1}>
          {t('greeting', { name: isolate(settings.name) })}
        </h1>
        <p className="today-date">
          <span className="today-weekday">{i18n.weekday(today)}</span>
          <span>{i18n.date(today)}</span>
        </p>
      </header>

      <section className={`card hero is-${status}`}>
        {status === 'registered' && (
          <p className="status-banner success">
            <CheckIcon />
            <span>{t('todayRegistered')}</span>
          </p>
        )}
        {status === 'dayOff' && (
          <div className="status-banner off">
            <MoonIcon />
            <span>
              <strong>{t('todayDayOff')}</strong>
              <span className="status-banner-detail">{t('todayDayOffHint')}</span>
            </span>
          </div>
        )}

        <button
          type="button"
          className={status === 'registered' ? 'worked-button is-done' : 'worked-button'}
          onClick={handleWorkedToday}
          disabled={status === 'dayOff'}
        >
          <span className="worked-button-label">{t('workedToday')}</span>
          {status === 'registered' && <span className="worked-button-sub">{t('todayRegisteredHint')}</span>}
        </button>

        {status === 'open' && (
          <div className="field">
            <label htmlFor={noteId}>{t('noteLabel')}</label>
            <textarea
              id={noteId}
              className="textarea"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={t('notePlaceholder')}
              dir="auto"
            />
          </div>
        )}

        {todayRecord && (
          <div className="today-note">
            <span className="today-note-label">{t('todayNote')}</span>
            <p className={todayRecord.note ? 'today-note-text' : 'today-note-text is-empty'} dir="auto">
              {todayRecord.note || t('noNote')}
            </p>
            <button type="button" className="button secondary small" onClick={() => onOpenEditor({ mode: 'edit', date: today })}>
              <EditIcon />
              {t('editNote')}
            </button>
          </div>
        )}
      </section>

      <ProgressCard progress={progress} />

      <dl className="stats">
        <div className="stat">
          <dt>{t('statThisMonth')}</dt>
          <dd>{thisMonth}</dd>
        </div>
        <div className="stat">
          <dt>{t('statLastDay')}</dt>
          <dd>
            {lastDate ? (
              <>
                <span className="stat-date">{i18n.date(lastDate)}</span>
                <span className="stat-sub">{i18n.weekday(lastDate)}</span>
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      <button type="button" className="button secondary block" onClick={() => onOpenEditor({ mode: 'add' })}>
        <PlusIcon />
        {t('addPastDay')}
      </button>
    </div>
  )
}
