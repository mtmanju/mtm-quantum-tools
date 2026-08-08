import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { searchTools } from '../../utils/search'
import { readRecentTools } from '../../utils/recentTools'
import { MOD_KEY, onOpenCommandPalette } from '../../utils/commandPalette'
import './CommandPalette.css'

export interface PaletteTool {
  id: string
  name: string
  description: string
  keywords?: string[]
  category: string
  icon: React.ReactNode
  status: 'active' | 'coming-soon'
}

interface CommandPaletteProps {
  tools: PaletteTool[]
  onSelect: (id: string) => void
}

/**
 * The idle list is capped; a search is not.
 *
 * Both used to be cut to eight. The results pane is `overflow-y: auto` inside
 * a 70vh panel, so it was always *able* to scroll — but eight items never
 * filled it, which made scrollHeight equal clientHeight and the scroll a
 * no-op. Searching "convert" matched a dozen tools, showed eight, said
 * nothing about the rest, and ignored the scroll that would have reached
 * them. Silent truncation that looks exactly like a broken scrollbar.
 *
 * A search should return everything it matched — with 45 tools the worst case
 * is 45 rows, which is nothing to render and genuinely scrolls. The idle list
 * keeps a cap because it is a starting point rather than an answer: it exists
 * to show your recents and a few suggestions, not to be the full index.
 */
const MAX_IDLE_RESULTS = 8

const isMac = MOD_KEY === '⌘'

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

  /**
   * The idle list is two groups, and it has to say where one ends.
   *
   * A single "Recent" heading sat above the whole list, but the list is
   * recents *topped up* to eight with everything else — so on a first visit
   * with two recents, six tools the user had never opened were filed under
   * "Recent". `recentCount` is where the real ones stop.
   */
  const { results, recentCount } = useMemo(() => {
    if (query.trim()) {
      return { results: searchTools(tools, query), recentCount: 0 }
    }
    const recents = readRecentTools()
    const byId = new Map(tools.map(t => [t.id, t]))
    const recentTools = recents.map(id => byId.get(id)).filter((t): t is PaletteTool => !!t)
    const rest = tools.filter(t => !recents.includes(t.id))
    return {
      results: [...recentTools, ...rest].slice(0, MAX_IDLE_RESULTS),
      recentCount: Math.min(recentTools.length, MAX_IDLE_RESULTS),
    }
  }, [query, tools])

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

  // Same palette, opened by the header's search control.
  useEffect(() => onOpenCommandPalette(() => setOpen(true)), [])

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
          {results.length === 0 && (
            <div className="cmdk-empty">No tools match “{query}”</div>
          )}
          {results.map((tool, i) => (
            <Fragment key={tool.id}>
              {/* Group headings, emitted at the boundaries rather than once
                  at the top — see recentCount. */}
              {recentCount > 0 && i === 0 && <div className="cmdk-section">Recent</div>}
              {recentCount > 0 && i === recentCount && (
                <div className="cmdk-section">All tools</div>
              )}
            <button
              id={`cmdk-opt-${tool.id}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              data-active={i === activeIndex}
              className="cmdk-item"
              onMouseMove={() => setActiveIndex(i)}
              onClick={() => commit(i)}
            >
              <span className="cmdk-item-icon" aria-hidden="true">
                {tool.icon}
              </span>
              <span className="cmdk-item-text">
                <span className="cmdk-item-name">{tool.name}</span>
                <span className="cmdk-item-desc">{tool.description}</span>
              </span>
              <span className="cmdk-item-category">{tool.category}</span>
            </button>
            </Fragment>
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
