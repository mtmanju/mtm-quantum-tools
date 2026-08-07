import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Lucide icon, already sized by the caller. */
  icon?: ReactNode
  /** What the tool is waiting for, as a statement — not "No data". */
  title: string
  /** One line on how to get a result. Optional. */
  hint?: string
}

/**
 * The "nothing yet" panel every tool shows before it has input.
 *
 * Eighteen tools rendered nothing at all in this state, so the workspace was a
 * strip of controls above several hundred pixels of blank panel — five of the
 * calculators were 83% empty. A page that shows nothing reads as broken rather
 * than as ready, and there was nowhere to say what the tool needs.
 *
 * Layout comes from `.empty-state` in patterns.css, shared with the per-tool
 * variants that already existed.
 */
export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <p>{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
    </div>
  )
}
