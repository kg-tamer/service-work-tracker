import { useId, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { MAX_NAME_LENGTH } from '../lib/settings'
import type { Language } from '../types'
import { CheckIcon, LockIcon } from './icons'
import { LanguagePicker } from './LanguagePicker'

interface Props {
  language: Language
  onLanguageChange: (language: Language) => void
  onComplete: (name: string) => void
}

/** First launch only: asks for a name and the preferred language. */
export function Onboarding({ language, onLanguageChange, onComplete }: Props) {
  const { t } = useI18n()
  const nameId = useId()
  const errorId = useId()
  const [name, setName] = useState('')
  const [showError, setShowError] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setShowError(true)
      return
    }
    onComplete(trimmed)
  }

  return (
    <main className="onboarding">
      <span className="brand-mark large" aria-hidden="true">
        <CheckIcon />
      </span>
      <div className="onboarding-intro">
        <h1 className="onboarding-title">{t('welcomeTitle')}</h1>
        <p className="onboarding-text">{t('welcomeText')}</p>
      </div>
      <form className="card stack" onSubmit={handleSubmit} noValidate>
        <LanguagePicker value={language} onChange={onLanguageChange} />
        <div className="field">
          <label htmlFor={nameId}>{t('nameLabel')}</label>
          <input
            id={nameId}
            className="input"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setShowError(false)
            }}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="name"
            enterKeyHint="go"
            dir="auto"
            required
            aria-invalid={showError || undefined}
            aria-describedby={showError ? errorId : undefined}
          />
          {showError && (
            <p id={errorId} className="field-error" role="alert">
              {t('errorNameRequired')}
            </p>
          )}
        </div>
        <button type="submit" className="button primary block large">
          {t('getStarted')}
        </button>
      </form>
      <p className="privacy-note">
        <LockIcon />
        <span>{t('privacyNote')}</span>
      </p>
    </main>
  )
}
