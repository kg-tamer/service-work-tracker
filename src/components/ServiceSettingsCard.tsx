import { useId, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { MAX_REQUIRED_DAYS, normalizeDaysOff, parseWholeNumber, WEEKDAYS } from '../lib/settings'
import type { Settings, Weekday } from '../types'
import { CheckIcon, TargetIcon } from './icons'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => boolean
  onSaved: () => void
}

function NumbersForm({ settings, onSave, onSaved }: Props) {
  const { t } = useI18n()
  const requiredId = useId()
  const shorteningId = useId()
  const requiredErrorId = useId()
  const shorteningErrorId = useId()
  const [required, setRequired] = useState(settings.requiredNetDays > 0 ? String(settings.requiredNetDays) : '')
  const [shortening, setShortening] = useState(settings.shorteningDays > 0 ? String(settings.shorteningDays) : '')
  const [errors, setErrors] = useState({ required: false, shortening: false })

  const requiredValue = parseWholeNumber(required)
  const shorteningValue = parseWholeNumber(shortening)
  const changed = requiredValue !== settings.requiredNetDays || shorteningValue !== settings.shorteningDays

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Empty = not configured (0). Otherwise a whole number from 1 to 9999.
    const requiredOk =
      requiredValue !== null && requiredValue <= MAX_REQUIRED_DAYS && (required.trim() === '' || requiredValue >= 1)
    // 0 ≤ shortening ≤ required work days
    const shorteningOk = requiredOk && shorteningValue !== null && shorteningValue <= (requiredValue ?? 0)
    setErrors({ required: !requiredOk, shortening: requiredOk && !shorteningOk })
    if (!requiredOk || !shorteningOk || requiredValue === null || shorteningValue === null) return
    if (onSave({ ...settings, requiredNetDays: requiredValue, shorteningDays: shorteningValue })) onSaved()
  }

  return (
    <form className="stack-sm" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={requiredId}>{t('requiredDaysLabel')}</label>
        <input
          id={requiredId}
          className="input number-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          value={required}
          onChange={(event) => setRequired(event.target.value)}
          aria-invalid={errors.required || undefined}
          aria-describedby={errors.required ? requiredErrorId : undefined}
        />
        <p className="field-hint">{t('requiredDaysHint')}</p>
        {errors.required && (
          <p id={requiredErrorId} className="field-error" role="alert">
            {t('errorRequiredDays')}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={shorteningId}>{t('shorteningLabel')}</label>
        <input
          id={shorteningId}
          className="input number-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          value={shortening}
          onChange={(event) => setShortening(event.target.value)}
          aria-invalid={errors.shortening || undefined}
          aria-describedby={errors.shortening ? shorteningErrorId : undefined}
        />
        <p className="field-hint">{t('shorteningHint')}</p>
        {errors.shortening && (
          <p id={shorteningErrorId} className="field-error" role="alert">
            {t('errorShortening')}
          </p>
        )}
      </div>
      <button type="submit" className="button primary block" disabled={!changed}>
        {t('save')}
      </button>
    </form>
  )
}

export function ServiceSettingsCard({ settings, onSave, onSaved }: Props) {
  const i18n = useI18n()
  const { t } = i18n
  const [allDaysError, setAllDaysError] = useState(false)

  function toggleDay(day: Weekday, off: boolean) {
    const next = off ? [...settings.weeklyDaysOff, day] : settings.weeklyDaysOff.filter((value) => value !== day)
    if (next.length >= WEEKDAYS.length) {
      setAllDaysError(true)
      return
    }
    setAllDaysError(false)
    // Only the setting changes; existing work records are never touched.
    onSave({ ...settings, weeklyDaysOff: normalizeDaysOff(next) })
  }

  return (
    <section className="card" aria-labelledby="service-settings-title">
      <h2 id="service-settings-title" className="card-title">
        <TargetIcon />
        {t('serviceSection')}
      </h2>
      <div className="stack">
        <NumbersForm
          // Start fresh when the saved values change (e.g. restored from a backup).
          key={`${settings.requiredNetDays}:${settings.shorteningDays}`}
          settings={settings}
          onSave={onSave}
          onSaved={onSaved}
        />
        <fieldset className="days-off">
          <legend className="field-label">{t('daysOffLabel')}</legend>
          <p className="field-hint">{t('daysOffHint')}</p>
          <div className="day-toggles">
            {WEEKDAYS.map((day) => (
              <label key={day} className="toggle-chip">
                <input
                  type="checkbox"
                  checked={settings.weeklyDaysOff.includes(day)}
                  onChange={(event) => toggleDay(day, event.target.checked)}
                />
                <span className="check-box" aria-hidden="true">
                  <CheckIcon />
                </span>
                <span>{i18n.weekdayName(day)}</span>
              </label>
            ))}
          </div>
          {allDaysError && (
            <p className="field-error" role="alert">
              {t('errorAllDaysOff')}
            </p>
          )}
        </fieldset>
      </div>
    </section>
  )
}
