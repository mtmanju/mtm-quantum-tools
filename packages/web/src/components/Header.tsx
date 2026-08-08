import { Info, Layout, Moon, Search, Sun } from 'lucide-react'
import { memo } from 'react'
import { MOD_KEY, openCommandPalette } from '../utils/commandPalette'
import './Header.css'

const prefetchAbout = () => {
  import('./../pages/About').catch(() => {})
}

interface HeaderProps {
  scrolled: boolean
  isDarkMode: boolean
  currentView: 'tools' | 'about' | 'tool'
  onNavigate: (path: string) => void
  onToggleTheme: () => void
}

const Header = memo(({
  scrolled,
  isDarkMode,
  currentView,
  onNavigate,
  onToggleTheme
}: HeaderProps) => {
  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          {/* A button, not a click-handling div — and not an <h1>: the site
              name is not the heading of any given page, and having it here
              gave every page two <h1>s (three on /about). */}
          <button
            type="button"
            className="logo"
            onClick={() => onNavigate('/')}
            aria-label="Quantum Tools, go to all tools"
          >
            <span className="logo-mark" aria-hidden="true">
              <Layout size={17} strokeWidth={2} />
            </span>
            <span className="logo-text">
              <span className="logo-title">Quantum</span>
              <span className="logo-subtitle">Tools</span>
            </span>
          </button>
        </div>

        <div className="header-right">
          {/* The palette was ⌘K-only. On a tool page that shortcut was the
              single way to reach another one of the 45 tools, which makes a
              hidden keybinding load-bearing. This is the same palette with a
              visible door. Suppressed on the tools index, where the page's own
              search field is already on screen and two search affordances a
              few hundred pixels apart just raise the question of which one
              searches what. */}
          {currentView !== 'tools' && (
            <button
              type="button"
              className="header-search"
              onClick={openCommandPalette}
              aria-label="Search tools"
            >
              <Search size={15} strokeWidth={2} aria-hidden="true" />
              <span className="header-search-label">Search tools</span>
              <kbd className="header-search-kbd" aria-hidden="true">{MOD_KEY} K</kbd>
            </button>
          )}
          <button
            className={`header-nav-btn ${currentView === 'about' ? 'active' : ''}`}
            onClick={() => onNavigate('/about')}
            onMouseEnter={prefetchAbout}
            aria-label="About"
          >
            <Info size={20} strokeWidth={1.5} />
            <span>About</span>
          </button>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {isDarkMode ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </header>
  )
})

Header.displayName = 'Header'

export default Header

