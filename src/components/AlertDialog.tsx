import { useId } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { AlertIcon } from './icons'
import { Modal } from './Modal'

interface Props {
  title: string
  message: string
  onClose: () => void
}

export function AlertDialog({ title, message, onClose }: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const messageId = useId()
  return (
    <Modal labelledBy={titleId} describedBy={messageId} role="alertdialog" onClose={onClose}>
      <div className="confirm">
        <span className="confirm-icon warning" aria-hidden="true">
          <AlertIcon />
        </span>
        <h2 id={titleId} className="modal-title">
          {title}
        </h2>
        <p id={messageId} className="confirm-message">
          {message}
        </p>
      </div>
      <div className="modal-actions">
        <button type="button" className="button primary" onClick={onClose} data-autofocus>
          {t('ok')}
        </button>
      </div>
    </Modal>
  )
}
