import { Info, Layout, Moon, Sun } from 'lucide-react'
import { memo } from 'react'
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
            aria-label="Quantum Tools — go to all tools"
          >
            <Layout size={28} strokeWidth={1.5} aria-hidden="true" />
            <span className="logo-text">
              <span className="logo-title">Quantum</span>
              <span className="logo-subtitle">Tools</span>
            </span>
          </button>
        </div>

        <div className="header-right">
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

