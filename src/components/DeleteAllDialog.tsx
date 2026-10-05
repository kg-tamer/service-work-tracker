import { useId, useState } from 'react'
import { useArmedAction } from '../hooks/useArmedAction'
import { useI18n } from '../i18n/I18nContext'
import { AlertIcon, DownloadIcon } from './icons'
import { Modal } from './Modal'

interface Props {
  recordCount: number
  onCancel: () => void
  onConfirm: () => void
  onExportBackup: () => void
}

/** Deleting everything requires typing a confirmation word, so it can't happen by accident. */
export function DeleteAllDialog({ recordCount, onCancel, onConfirm, onExportBackup }: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const messageId = useId()
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const word = t('deleteAllWord')
  const answer = typed.trim().toLocaleLowerCase()
  const confirmed = answer === word.toLocaleLowerCase() || answer === 'delete'
  const confirm = useArmedAction(() => {
    if (confirmed) onConfirm()
  })

  return (
    <Modal labelledBy={titleId} describedBy={messageId} role="alertdialog" onClose={onCancel}>
      <div className="confirm">
        <span className="confirm-icon danger" aria-hidden="true">
          <AlertIcon />
        </span>
        <h2 id={titleId} className="modal-title">
          {t('deleteAllTitle')}
        </h2>
        <p id={messageId} className="confirm-message">
          {t('deleteAllWarning', { count: recordCount })}
        </p>
      </div>
      <div className="notice info">
        <span>{t('deleteAllBackupTip')}</span>
      </div>
      <button type="button" className="button secondary block" onClick={onExportBackup}>
        <DownloadIcon />
        {t('exportBackup')}
      </button>
      <form
        className="field"
        onSubmit={(event) => {
          event.preventDefault()
          confirm()
        }}
      >
        <label htmlFor={inputId}>{t('deleteAllTypePrompt', { word })}</label>
        <input
          id={inputId}
          className="input"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby={messageId}
        />
      </form>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel} data-autofocus>
          {t('cancel')}
        </button>
        <button type="button" className="button danger" onClick={confirm} disabled={!confirmed}>
          {t('deleteAllConfirm')}
        </button>
      </div>
    </Modal>
  )
}
