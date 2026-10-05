import { viewHref } from '../hooks/useHashView'
import { useI18n } from '../i18n/I18nContext'
import type { View } from '../types'
import { CalendarIcon, HomeIcon, ListIcon, SettingsIcon } from './icons'

const ITEMS = [
  { view: 'home', label: 'navHome', Icon: HomeIcon },
  { view: 'history', label: 'navHistory', Icon: ListIcon },
  { view: 'calendar', label: 'navCalendar', Icon: CalendarIcon },
  { view: 'settings', label: 'navSettings', Icon: SettingsIcon },
] as const

/** Fixed bottom bar on phones; a tab bar at the top on wide screens. */
export function BottomNav({ current }: { current: View }) {
  const { t } = useI18n()
  return (
    <nav className="bottom-nav" aria-label={t('navLabel')}>
      <ul>
        {ITEMS.map(({ view, label, Icon }) => (
          <li key={view}>
            <a className="nav-link" href={viewHref(view)} aria-current={current === view ? 'page' : undefined}>
              <Icon />
              <span>{t(label)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
