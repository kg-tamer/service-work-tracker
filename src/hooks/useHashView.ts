import { useEffect, useState } from 'react'
import type { View } from '../types'

// Hash-based routes (#/history …) work on GitHub Pages without server rewrites.
const VIEWS: readonly View[] = ['home', 'history', 'calendar', 'settings']

function readView(): View {
  const name = window.location.hash.replace(/^#\/?/, '')
  return VIEWS.find((view) => view === name) ?? 'home'
}

export function viewHref(view: View): string {
  return `#/${view}`
}

export function useHashView(): View {
  const [view, setView] = useState(readView)
  useEffect(() => {
    const onChange = () => setView(readView())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return view
}
