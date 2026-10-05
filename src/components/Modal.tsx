import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  labelledBy: string
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  /** Called for Escape, the close button, and (if enabled) a tap on the backdrop. Never confirms anything. */
  onClose: () => void
  /** Allow closing by tapping outside the dialog. Off for forms, so typed text isn't lost by accident. */
  closeOnBackdrop?: boolean
  children: ReactNode
}

/**
 * A native modal <dialog>: the browser traps focus and Escape closes it.
 * On phones it is shown as a bottom sheet that stays above the on-screen keyboard.
 * Initial focus goes to the element marked `data-autofocus`, otherwise to the dialog itself.
 */
export function Modal({ labelledBy, describedBy, role, onClose, closeOnBackdrop = true, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const mounted = useRef(false)
  const pressStartedOnBackdrop = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    mounted.current = true
    if (!dialog.open) dialog.showModal()
    const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? dialog).focus()

    // Keep the sheet inside the visible area when the on-screen keyboard opens.
    const viewport = window.visualViewport
    const fitToViewport = () => {
      if (!viewport) return
      const keyboardInset = document.documentElement.clientHeight - viewport.height - viewport.offsetTop
      dialog.style.setProperty('--keyboard-inset', `${Math.max(0, Math.round(keyboardInset))}px`)
      dialog.style.setProperty('--viewport-height', `${Math.round(viewport.height)}px`)
    }
    // When the keyboard opens the sheet shrinks; bring the field being typed in back into view.
    const onResize = () => {
      fitToViewport()
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== dialog && dialog.contains(active)) {
        active.scrollIntoView({ block: 'nearest' })
      }
    }
    fitToViewport()
    viewport?.addEventListener('resize', onResize)
    viewport?.addEventListener('scroll', fitToViewport)
    return () => {
      mounted.current = false
      viewport?.removeEventListener('resize', onResize)
      viewport?.removeEventListener('scroll', fitToViewport)
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      // Escape closes the native dialog; keep React's state in sync with it. A late
      // "close" event from an earlier mount (the dialog is open again) is ignored.
      onClose={(event) => {
        if (mounted.current && !event.currentTarget.open) onCloseRef.current()
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        // Only a tap that both starts and ends on the backdrop closes the dialog.
        const onBackdrop = event.target === event.currentTarget && pressStartedOnBackdrop.current
        pressStartedOnBackdrop.current = false
        if (closeOnBackdrop && onBackdrop) onCloseRef.current()
      }}
    >
      <div className="modal-panel">{children}</div>
    </dialog>
  )
}
