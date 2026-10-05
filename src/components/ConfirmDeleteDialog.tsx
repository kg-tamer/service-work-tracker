import { useId } from 'react'
import { useArmedAction } from '../hooks/useArmedAction'
import { useI18n } from '../i18n/I18nContext'
import { TrashIcon } from './icons'
import { Modal } from './Modal'

interface Props {
  date: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Explicit confirmation before one work day is deleted. Cancel is the focused,
 * safe default; Escape, the backdrop and Cancel all keep the record.
 */
export function ConfirmDeleteDialog({ date, onCancel, onConfirm }: Props) {
  const { t, weekdayDate } = useI18n()
  const titleId = useId()
  const messageId = useId()
  const confirm = useArmedAction(onConfirm)

  return (
    <Modal labelledBy={titleId} describedBy={messageId} role="alertdialog" onClose={onCancel}>
      <div className="confirm">
        <span className="confirm-icon danger" aria-hidden="true">
          <TrashIcon />
        </span>
        <h2 id={titleId} className="modal-title">
          {t('deleteRecordTitle')}
        </h2>
        <div className="confirm-target">
          <span className="confirm-target-label">{t('deleteRecordAbout')}</span>
          <strong className="confirm-target-value">{weekdayDate(date)}</strong>
        </div>
        <p id={messageId} className="confirm-message">
          {t('deleteRecordMessage')}
        </p>
      </div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel} data-autofocus>
          {t('cancel')}
        </button>
        <button type="button" className="button danger" onClick={confirm}>
          <TrashIcon />
          {t('deleteDay')}
        </button>
      </div>
    </Modal>
  )
}
