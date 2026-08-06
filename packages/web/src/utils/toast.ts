/**
 * Transient-notification bus.
 *
 * Lives in utils/ rather than beside the <Toaster> component so that other
 * utilities (utils/file.ts) and hooks (useCopy) can raise a toast without a
 * util importing from components/ — and so the component file exports only a
 * component, which keeps React Fast Refresh working.
 *
 * A module-level emitter rather than React context: useCopy is called from 33
 * tools, and threading a provider through every one of them is exactly the
 * boilerplate this codebase already has too much of.
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

type Listener = (toast: Toast) => void

const listeners = new Set<Listener>()
let nextId = 0

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function toast(message: string, kind: ToastKind = 'success') {
  const t: Toast = { id: nextId++, kind, message }
  listeners.forEach(l => l(t))
}
