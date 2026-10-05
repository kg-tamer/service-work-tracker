import { useEffect, useId, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { NEW_WORK_DAY_PROBLEM_MESSAGES } from '../i18n/translations'
import { cleanNote, MAX_NOTE_LENGTH } from '../lib/records'
import { newWorkDayProblem } from '../lib/service'
import type { RecordMap, Weekday } from '../types'
import { CloseIcon, InfoIcon, TrashIcon } from './icons'
import { Modal } from './Modal'

export type EditorState =
  /** Add a work day; `date` is preset when it comes from the calendar. */
  | { mode: 'add'; date?: string }
  | { mode: 'edit'; date: string; notice?: 'alreadyRegistered' }

interface Props {
  state: EditorState
  records: RecordMap
  weeklyDaysOff: readonly Weekday[]
  today: string
  onClose: () => void
  onAdd: (date: string, note: string) => void
  onSave: (date: string, note: string) => void
  onRequestDelete: (date: string) => void
  onEditExisting: (date: string) => void
}

export function RecordDialog({
  state,
  records,
  weeklyDaysOff,
  today,
  onClose,
  onAdd,
  onSave,
  onRequestDelete,
  onEditExisting,
}: Props) {
  const { t, weekday, date: formatDate } = useI18n()
  const titleId = useId()
  const dateId = useId()
  const dateMessageId = useId()
  const noteId = useId()

  const isEdit = state.mode === 'edit'
  const record = isEdit ? records[state.date] : undefined
  const presetDate = state.date
  const [date, setDate] = useState(state.date ?? '')
  const [note, setNote] = useState(record?.note ?? '')
  const [triedToSave, setTriedToSave] = useState(false)

  // The record disappeared (deleted in another tab): there is nothing left to edit.
  const recordMissing = isEdit && !record
  useEffect(() => {
    if (recordMissing) onClose()
  }, [recordMissing, onClose])

  const problem = isEdit ? null : newWorkDayProblem(date, records, weeklyDaysOff, today)
  // Show a problem as soon as a date is picked; "no date" only after trying to save.
  const shownProblem = problem && (triedToSave || problem !== 'invalidDate') ? problem : null
  const unchanged = isEdit && record !== undefined && cleanNote(note) === record.note

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isEdit) {
      if (!unchanged) onSave(state.date, note)
      return
    }
    if (problem) {
      setTriedToSave(true)
      return
    }
    onAdd(date, note)
  }

  const title = isEdit ? t('editWorkDayTitle') : presetDate ? t('addWorkDayTitle') : t('addPastDay')

  return (
    <Modal labelledBy={titleId} onClose={onClose} closeOnBackdrop={false}>
      <form className="dialog-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>
            <CloseIcon />
          </button>
        </div>

        {isEdit && state.notice === 'alreadyRegistered' && (
          <p className="notice info" role="status">
            <InfoIcon />
            <span>{t('alreadyRegisteredNotice')}</span>
          </p>
        )}

        {presetDate ? (
          <div className="date-display">
            <strong>{weekday(presetDate)}</strong>
            <span>{formatDate(presetDate)}</span>
          </div>
        ) : (
          <div className="field">
            <label htmlFor={dateId}>{t('dateLabel')}</label>
            <input
              id={dateId}
              className="input"
              type="date"
              value={date}
              max={today}
              required
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={shownProblem ? true : undefined}
              aria-describedby={dateMessageId}
            />
          </div>
        )}

        {!isEdit && (
          <div id={dateMessageId} className="date-message" aria-live="polite">
            {shownProblem ? (
              <p className="field-error">{t(NEW_WORK_DAY_PROBLEM_MESSAGES[shownProblem])}</p>
            ) : !presetDate && problem === null ? (
              <p className="field-hint">
                {weekday(date)} · {formatDate(date)}
              </p>
            ) : null}
            {shownProblem === 'duplicate' && (
              <button type="button" className="link-button" onClick={() => onEditExisting(date)}>
                {t('editThatDay')}
              </button>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor={noteId}>{t('noteLabel')}</label>
          <textarea
            id={noteId}
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            placeholder={t('notePlaceholder')}
            dir="auto"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="button primary" disabled={unchanged}>
            {t('save')}
          </button>
        </div>

        {isEdit && (
          // Only opens the delete confirmation; nothing is deleted here.
          <button type="button" className="button danger-ghost block" onClick={() => onRequestDelete(state.date)}>
            <TrashIcon />
            {t('delete')}
          </button>
        )}
      </form>
    </Modal>
  )
}
