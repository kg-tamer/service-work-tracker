import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { CalendarScreen } from './components/CalendarScreen'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { HistoryScreen } from './components/HistoryScreen'
import { HomeScreen } from './components/HomeScreen'
import { CheckIcon } from './components/icons'
import { Onboarding } from './components/Onboarding'
import { RecordDialog, type EditorState } from './components/RecordDialog'
import { SettingsScreen } from './components/SettingsScreen'
import { Toast, type ToastMessage, type ToastTone } from './components/Toast'
import { useAppData } from './hooks/useAppData'
import { useHashView } from './hooks/useHashView'
import { useToday } from './hooks/useToday'
import { createI18n, detectLanguage } from './i18n/createI18n'
import { I18nProvider } from './i18n/I18nContext'
import { NEW_WORK_DAY_PROBLEM_MESSAGES } from './i18n/translations'
import { createSettings } from './lib/settings'
import type { Language } from './types'

export default function App() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const notify = useCallback((text: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now(), text, tone })
  }, [])
  const clearToast = useCallback(() => setToast(null), [])

  const saveErrorText = useRef('')
  const { data, actions } = useAppData(() => notify(saveErrorText.current, 'error'))
  const { settings, records } = data

  const [firstLaunchLanguage, setFirstLaunchLanguage] = useState<Language>(detectLanguage)
  const language = settings?.language ?? firstLaunchLanguage
  const i18n = useMemo(() => createI18n(language), [language])
  const { t } = i18n

  const today = useToday()
  const view = useHashView()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  // The language drives the text direction of the whole page.
  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = i18n.dir
    document.title = t('appName')
    saveErrorText.current = t('errorSaveFailed')
  }, [language, i18n, t])

  // On a new screen: start at the top and move focus to its heading.
  const previousView = useRef(view)
  useEffect(() => {
    if (previousView.current === view) return
    previousView.current = view
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [view])

  function registerToday(note: string): boolean {
    const result = actions.addRecord(today, note)
    if (result === 'added') {
      notify(t('todaySaved'))
      return true
    }
    if (result === 'duplicate') setEditor({ mode: 'edit', date: today, notice: 'alreadyRegistered' })
    else if (result !== 'failed') notify(t(NEW_WORK_DAY_PROBLEM_MESSAGES[result]), 'info')
    return false
  }

  function addWorkDay(date: string, note: string) {
    const result = actions.addRecord(date, note)
    if (result === 'added') {
      setEditor(null)
      notify(t('recordAdded'))
    } else if (result === 'duplicate') {
      setEditor({ mode: 'edit', date })
    } else if (result !== 'failed') {
      notify(t(NEW_WORK_DAY_PROBLEM_MESSAGES[result]), 'error')
    }
  }

  function saveNote(date: string, note: string) {
    if (actions.updateNote(date, note)) {
      setEditor(null)
      notify(t('recordUpdated'))
    }
  }

  // Runs only from the confirmation dialog's final "Delete day" button.
  function deleteConfirmed() {
    if (!pendingDelete) return
    const date = pendingDelete
    setPendingDelete(null)
    if (actions.deleteRecord(date)) {
      setEditor((current) => (current?.date === date ? null : current))
      notify(t('recordDeleted'))
    }
  }

  if (!settings) {
    return (
      <I18nProvider value={i18n}>
        <Onboarding
          language={language}
          onLanguageChange={setFirstLaunchLanguage}
          onComplete={(name) => actions.saveSettings(createSettings(name, language))}
        />
        <Toast toast={toast} onDone={clearToast} />
      </I18nProvider>
    )
  }

  return (
    <I18nProvider value={i18n}>
      <div className="app">
        <header className="app-header">
          <span className="brand-mark" aria-hidden="true">
            <CheckIcon />
          </span>
          <span className="brand-name">{t('appName')}</span>
        </header>
        <BottomNav current={view} />
        <main className="app-main">
          {view === 'home' && (
            <HomeScreen
              settings={settings}
              records={records}
              today={today}
              onRegisterToday={registerToday}
              onOpenEditor={setEditor}
            />
          )}
          {view === 'history' && (
            <HistoryScreen records={records} onOpenEditor={setEditor} onRequestDelete={setPendingDelete} />
          )}
          {view === 'calendar' && (
            <CalendarScreen
              records={records}
              weeklyDaysOff={settings.weeklyDaysOff}
              today={today}
              onOpenEditor={setEditor}
              onDayOffTapped={() => notify(t('errorDayOff'), 'info')}
            />
          )}
          {view === 'settings' && (
            <SettingsScreen settings={settings} records={records} today={today} actions={actions} notify={notify} />
          )}
        </main>
      </div>

      {editor && (
        <RecordDialog
          key={`${editor.mode}:${editor.date ?? ''}`}
          state={editor}
          records={records}
          weeklyDaysOff={settings.weeklyDaysOff}
          today={today}
          onClose={() => setEditor(null)}
          onAdd={addWorkDay}
          onSave={saveNote}
          onRequestDelete={setPendingDelete}
          onEditExisting={(date) => setEditor({ mode: 'edit', date })}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteDialog date={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={deleteConfirmed} />
      )}
      <Toast toast={toast} onDone={clearToast} />
    </I18nProvider>
  )
}
