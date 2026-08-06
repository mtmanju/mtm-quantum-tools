import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { searchTools } from '../../utils/search'
import { readRecentTools } from '../../utils/recentTools'
import './CommandPalette.css'

export interface PaletteTool {
  id: string
  name: string
  description: string
  keywords?: string[]
  category: string
  iconColor?: string
  icon: React.ReactNode
  status: 'active' | 'coming-soon'
}

interface CommandPaletteProps {
  tools: PaletteTool[]
  onSelect: (id: string) => void
}

const MAX_RESULTS = 8

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

/**
 * ⌘K / Ctrl-K launcher, available on every route.
 *
 * The tools index is the only place search existed before, so from inside a
 * tool the only way to reach another tool was to navigate back. With 45 tools
 * that round trip is the single most repeated interaction in the product.
 */
export function CommandPalette({ tools, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset the highlight when the query changes, during render rather than in
  // an effect — an effect would paint one frame with a stale selection.
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setActiveIndex(0)
  }

  const results = useMemo(() => {
    if (!query.trim()) {
      const recents = readRecentTools()
      const byId = new Map(tools.map(t => [t.id, t]))
      const recentTools = recents.map(id => byId.get(id)).filter((t): t is PaletteTool => !!t)
      // Recents first, then fill with featured tools.
      const rest = tools.filter(t => !recents.includes(t.id))
      return [...recentTools, ...rest].slice(0, MAX_RESULTS)
    }
    return searchTools(tools, query).slice(0, MAX_RESULTS)
  }, [query, tools])

  const hasRecents = !query.trim() && readRecentTools().length > 0

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  // Global hotkey: ⌘K / Ctrl-K, and "/" when not already typing somewhere.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (e.key === '/' && !typing && !open) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      // Focus after paint so the caret lands reliably.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Keep the highlighted row in view during arrow navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const commit = useCallback(
    (index: number) => {
      const tool = results[index]
      if (!tool || tool.status !== 'active') return
      onSelect(tool.id)
      close()
    },
    [results, onSelect, close]
  )

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(activeIndex)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  if (!open) return null

  return (
    <div
      className="cmdk-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search tools">
        <div className="cmdk-input-row">
          <Search size={16} className="cmdk-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search tools…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search tools"
            aria-controls="cmdk-results"
            aria-activedescendant={results[activeIndex] ? `cmdk-opt-${results[activeIndex].id}` : undefined}
            role="combobox"
            aria-expanded="true"
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>

        <div className="cmdk-results" id="cmdk-results" role="listbox" ref={listRef}>
          {hasRecents && <div className="cmdk-section">Recent</div>}
          {results.length === 0 && (
            <div className="cmdk-empty">No tools match “{query}”</div>
          )}
          {results.map((tool, i) => (
            <button
              key={tool.id}
              id={`cmdk-opt-${tool.id}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              data-active={i === activeIndex}
              className="cmdk-item"
              onMouseMove={() => setActiveIndex(i)}
              onClick={() => commit(i)}
            >
              <span className="cmdk-item-icon" style={{ color: tool.iconColor }} aria-hidden="true">
                {tool.icon}
              </span>
              <span className="cmdk-item-text">
                <span className="cmdk-item-name">{tool.name}</span>
                <span className="cmdk-item-desc">{tool.description}</span>
              </span>
              <span className="cmdk-item-category">{tool.category}</span>
            </button>
          ))}
        </div>

        <div className="cmdk-footer">
          <span><kbd><ArrowUp size={10} /></kbd><kbd><ArrowDown size={10} /></kbd> navigate</span>
          <span><kbd><CornerDownLeft size={10} /></kbd> open</span>
          <span><kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}
