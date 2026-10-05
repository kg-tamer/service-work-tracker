import { useEffect, useState } from 'react'
import { todayIso } from '../lib/dates'

/** Today's local date (YYYY-MM-DD). Updates after midnight and when the app comes back to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(todayIso)
  useEffect(() => {
    const update = () => setToday(todayIso())
    const timer = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return today
}
