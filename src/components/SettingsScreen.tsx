import { useId, useRef, useState, type FormEvent } from 'react'
import type { AppActions } from '../hooks/useAppData'
import { useI18n } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/translations'
import { createBackupBlob, MAX_BACKUP_BYTES, readBackup } from '../lib/backup'
import { downloadBlob } from '../lib/download'
import { MAX_PDF_BYTES } from '../lib/pdf/machineFormat'
import { planImport } from '../lib/records'
import { MAX_NAME_LENGTH, sameSettings, settingsFromBackup } from '../lib/settings'
import type { RecordMap, Settings } from '../types'
import { AlertDialog } from './AlertDialog'
import { DeleteAllDialog } from './DeleteAllDialog'
import { AlertIcon, DownloadIcon, FileIcon, LockIcon, SaveIcon, TrashIcon, UploadIcon, UserIcon } from './icons'
import { ImportPreviewDialog, type ImportPreview } from './ImportPreviewDialog'
import { LanguagePicker } from './LanguagePicker'
import { ServiceSettingsCard } from './ServiceSettingsCard'

type Notify = (text: string, tone?: 'success' | 'error' | 'info') => void

interface Props {
  settings: Settings
  records: RecordMap
  today: string
  actions: AppActions
  notify: Notify
}

const PDF_ERRORS: Record<'notCompatible' | 'damaged' | 'unreadable', TranslationKey> = {
  notCompatible: 'errorNotCompatiblePdf',
  damaged: 'errorDamagedPdf',
  unreadable: 'errorUnreadablePdf',
}

const BACKUP_ERRORS: Record<'invalidJson' | 'notBackup' | 'newerVersion', TranslationKey> = {
  invalidJson: 'errorInvalidJson',
  notBackup: 'errorNotBackup',
  newerVersion: 'errorNewerBackup',
}

function NameForm({ settings, onSave }: { settings: Settings; onSave: (name: string) => void }) {
  const { t } = useI18n()
  const inputId = useId()
  const [name, setName] = useState(settings.name)
  const trimmed = name.trim()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (trimmed && trimmed !== settings.name) onSave(trimmed)
  }

  return (
    <form className="field" onSubmit={handleSubmit}>
      <label htmlFor={inputId}>{t('nameLabel')}</label>
      <div className="inline-form">
        <input
          id={inputId}
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          enterKeyHint="done"
          dir="auto"
          required
        />
        <button type="submit" className="button primary" disabled={!trimmed || trimmed === settings.name}>
          {t('save')}
        </button>
      </div>
    </form>
  )
}

export function SettingsScreen({ settings, records, today, actions, notify }: Props) {
  const { t } = useI18n()
  const pdfInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'exportPdf' | 'importPdf' | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const recordCount = Object.keys(records).length

  function saveSettings(next: Settings): boolean {
    return actions.saveSettings(next)
  }

  function exportBackup() {
    downloadBlob(createBackupBlob({ settings, records }), `service-work-tracker-backup-${today}.json`)
    notify(t('backupExported'))
  }

  async function exportPdf() {
    if (recordCount === 0) {
      notify(t('nothingToExport'), 'info')
      return
    }
    setBusy('exportPdf')
    try {
      const { createPdf } = await import('../lib/pdf/exportPdf')
      const blob = await createPdf({ settings, records, today })
      downloadBlob(blob, `service-work-log-${today}.pdf`)
      notify(t('pdfExported'))
    } catch (error) {
      console.error(error)
      notify(t('pdfExportFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function importPdf(file: File) {
    if (file.size > MAX_PDF_BYTES) {
      setImportError(t('errorFileTooLarge'))
      return
    }
    setBusy('importPdf')
    try {
      const { readImportPdf } = await import('../lib/pdf/importPdf')
      const result = await readImportPdf(file)
      if (!result.ok) {
        setImportError(t(PDF_ERRORS[result.error]))
        return
      }
      setPreview({
        kind: 'pdf',
        fileName: file.name,
        nameInFile: result.name,
        plan: planImport(result.candidates, records, today),
        restorableSettings: null,
      })
    } catch (error) {
      console.error(error)
      setImportError(t('errorUnreadablePdf'))
    } finally {
      setBusy(null)
    }
  }

  async function importBackup(file: File) {
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError(t('errorFileTooLarge'))
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setImportError(t('errorInvalidJson'))
      return
    }
    const result = readBackup(text)
    if (!result.ok) {
      setImportError(t(BACKUP_ERRORS[result.error]))
      return
    }
    const backupSettings = settingsFromBackup(result.settings, settings)
    setPreview({
      kind: 'backup',
      fileName: file.name,
      nameInFile: backupSettings?.name ?? null,
      plan: planImport(result.candidates, records, today),
      restorableSettings: backupSettings && !sameSettings(backupSettings, settings) ? backupSettings : null,
    })
  }

  function confirmImport(restoreSettings: boolean) {
    if (!preview) return
    const settingsToRestore = restoreSettings ? preview.restorableSettings : null
    const added = actions.importRecords(preview.plan.newRecords, settingsToRestore)
    setPreview(null)
    if (added === null) return
    const message = t('importDone', { count: added })
    notify(settingsToRestore ? `${message} · ${t('settingsRestored')}` : message)
  }

  function deleteEverything() {
    setConfirmDeleteAll(false)
    if (actions.deleteAll()) notify(t('deleteAllDone'))
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title" tabIndex={-1}>
          {t('settingsTitle')}
        </h1>
      </header>

      <div className="stack">
        <section className="card" aria-labelledby="profile-title">
          <h2 id="profile-title" className="card-title">
            <UserIcon />
            {t('profileSection')}
          </h2>
          <div className="stack">
            <NameForm
              key={settings.name}
              settings={settings}
              onSave={(name) => {
                if (saveSettings({ ...settings, name })) notify(t('nameSaved'))
              }}
            />
            <LanguagePicker value={settings.language} onChange={(language) => saveSettings({ ...settings, language })} />
          </div>
        </section>

        <ServiceSettingsCard settings={settings} onSave={saveSettings} onSaved={() => notify(t('serviceSaved'))} />

        <section className="card backup-card" aria-labelledby="backup-title">
          <h2 id="backup-title" className="card-title">
            <SaveIcon />
            {t('backupSection')}
          </h2>
          <p className="notice warning">
            <AlertIcon />
            <span>{t('backupReminder')}</span>
          </p>
          <div className="action-list">
            <div className="action-item">
              <button type="button" className="button primary block" onClick={exportBackup}>
                <DownloadIcon />
                {t('exportBackup')}
              </button>
              <p className="field-hint">{t('exportBackupHint')}</p>
            </div>
            <div className="action-item">
              <button type="button" className="button secondary block" onClick={() => backupInput.current?.click()}>
                <UploadIcon />
                {t('importBackup')}
              </button>
              <p className="field-hint">{t('importBackupHint')}</p>
            </div>
          </div>
          <input
            ref={backupInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importBackup(file)
            }}
          />
        </section>

        <section className="card" aria-labelledby="pdf-title">
          <h2 id="pdf-title" className="card-title">
            <FileIcon />
            {t('pdfSection')}
          </h2>
          <div className="action-list">
            <div className="action-item">
              <button type="button" className="button secondary block" onClick={exportPdf} disabled={busy !== null}>
                <DownloadIcon />
                {busy === 'exportPdf' ? t('creatingPdf') : t('exportPdf')}
              </button>
              <p className="field-hint">{t('exportPdfHint')}</p>
            </div>
            <div className="action-item">
              <button
                type="button"
                className="button secondary block"
                onClick={() => pdfInput.current?.click()}
                disabled={busy !== null}
              >
                <UploadIcon />
                {busy === 'importPdf' ? t('readingFile') : t('importPdf')}
              </button>
              <p className="field-hint">{t('importPdfHint')}</p>
            </div>
          </div>
          <input
            ref={pdfInput}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importPdf(file)
            }}
          />
        </section>

        <p className="privacy-note">
          <LockIcon />
          <span>{t('privacyNote')}</span>
        </p>

        <section className="card danger-zone" aria-labelledby="danger-title">
          <h2 id="danger-title" className="card-title">
            <TrashIcon />
            {t('dangerSection')}
          </h2>
          <p className="field-hint">{t('deleteAllHint')}</p>
          <button type="button" className="button danger-ghost block" onClick={() => setConfirmDeleteAll(true)}>
            {t('deleteAll')}
          </button>
        </section>
      </div>

      {preview && (
        <ImportPreviewDialog preview={preview} onCancel={() => setPreview(null)} onConfirm={confirmImport} />
      )}
      {importError && (
        <AlertDialog title={t('importErrorTitle')} message={importError} onClose={() => setImportError(null)} />
      )}
      {confirmDeleteAll && (
        <DeleteAllDialog
          recordCount={recordCount}
          onCancel={() => setConfirmDeleteAll(false)}
          onConfirm={deleteEverything}
          onExportBackup={exportBackup}
        />
      )}
    </div>
  )
}
