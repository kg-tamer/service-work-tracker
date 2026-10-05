import { useId } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGE_NAMES } from '../i18n/translations'
import type { Language } from '../types'

const LANGUAGES: readonly Language[] = ['ar', 'he', 'en']

export function LanguagePicker({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  const { t } = useI18n()
  const groupName = useId()
  return (
    <fieldset className="language-picker">
      <legend className="field-label">{t('languageLabel')}</legend>
      <div className="segmented">
        {LANGUAGES.map((code) => (
          <label key={code} className="segment">
            <input
              type="radio"
              name={groupName}
              value={code}
              checked={value === code}
              onChange={() => onChange(code)}
            />
            <span lang={code} dir={code === 'en' ? 'ltr' : 'rtl'}>
              {LANGUAGE_NAMES[code]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
