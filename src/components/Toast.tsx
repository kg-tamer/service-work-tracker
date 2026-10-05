import { useEffect } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
}

export function Toast({ toast, onDone }: { toast: ToastMessage | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onDone, toast.tone === 'error' ? 6000 : 3500)
    return () => window.clearTimeout(timer)
  }, [toast, onDone])

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast is-${toast.tone}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
