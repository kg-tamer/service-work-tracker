import { useId, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGE_NAMES } from '../i18n/translations'
import type { ImportPlan } from '../lib/records'
import type { Settings } from '../types'
import { CheckIcon } from './icons'
import { Modal } from './Modal'

export interface ImportPreview {
  kind: 'pdf' | 'backup'
  fileName: string
  nameInFile: string | null
  plan: ImportPlan
  /** Settings from a backup that differ from the current ones; null if there's nothing to restore. */
  restorableSettings: Settings | null
}

interface Props {
  preview: ImportPreview
  onCancel: () => void
  onConfirm: (restoreSettings: boolean) => void
}

/** Shows what an import would do. Nothing changes until the user confirms. */
export function ImportPreviewDialog({ preview, onCancel, onConfirm }: Props) {
  const { t, weekdayName, language } = useI18n()
  const separator = language === 'ar' ? '، ' : ', '
  const titleId = useId()
  const [restoreSettings, setRestoreSettings] = useState(false)
  const { plan, restorableSettings: settings } = preview
  const newCount = plan.newRecords.length
  const canImport = newCount > 0 || restoreSettings

  return (
    <Modal labelledBy={titleId} onClose={onCancel}>
      <h2 id={titleId} className="modal-title">
        {preview.kind === 'pdf' ? t('importPdfTitle') : t('importBackupTitle')}
      </h2>
      <dl className="import-meta">
        <div>
          <dt>{t('importFile')}</dt>
          <dd>
            <bdi>{preview.fileName}</bdi>
          </dd>
        </div>
        {preview.nameInFile && (
          <div>
            <dt>{t('importNameInFile')}</dt>
            <dd>
              <bdi>{preview.nameInFile}</bdi>
            </dd>
          </div>
        )}
      </dl>
      <dl className="import-stats">
        <div>
          <dt>{t('importDetected')}</dt>
          <dd>{plan.detected}</dd>
        </div>
        <div className="is-positive">
          <dt>{t('importNew')}</dt>
          <dd>{newCount}</dd>
        </div>
        <div>
          <dt>{t('importDuplicates')}</dt>
          <dd>{plan.duplicates}</dd>
        </div>
        <div className={plan.invalid > 0 ? 'is-warning' : undefined}>
          <dt>{t('importInvalid')}</dt>
          <dd>{plan.invalid}</dd>
        </div>
      </dl>
      <p className="notice success">
        <CheckIcon />
        <span>{t('importSafeNote')}</span>
      </p>
      {settings && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={restoreSettings}
            onChange={(event) => setRestoreSettings(event.target.checked)}
          />
          <span className="check-box" aria-hidden="true">
            <CheckIcon />
          </span>
          <span className="check-text">
            <span>{t('importRestoreSettings')}</span>
            <small>
              <bdi>{settings.name}</bdi> · {LANGUAGE_NAMES[settings.language]}
              {settings.requiredNetDays > 0 &&
                ` · ${t('requiredDaysLabel')}: ${settings.requiredNetDays} · ${t('shorteningLabel')}: ${settings.shorteningDays}`}
              {` · ${t('daysOffLabel')}: ${
                settings.weeklyDaysOff.length > 0 ? settings.weeklyDaysOff.map(weekdayName).join(separator) : t('none')
              }`}
            </small>
          </span>
        </label>
      )}
      {newCount === 0 && <p className="muted">{t('importNothingNew')}</p>}
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel} data-autofocus>
          {t('cancel')}
        </button>
        <button type="button" className="button primary" onClick={() => onConfirm(restoreSettings)} disabled={!canImport}>
          {t('importConfirm')}
        </button>
      </div>
    </Modal>
  )
}
