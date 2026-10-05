import { useCallback, useEffect, useRef } from 'react'

/**
 * Wraps a destructive action so it is ignored for a short moment after the
 * dialog appears. A quick double-tap on a trash icon can then never land on
 * the confirm button that opened underneath the finger.
 */
export function useArmedAction(action: () => void, delayMs = 600): () => void {
  const openedAt = useRef(Number.POSITIVE_INFINITY)
  useEffect(() => {
    openedAt.current = performance.now()
  }, [])
  return useCallback(() => {
    if (performance.now() - openedAt.current >= delayMs) action()
  }, [action, delayMs])
}
