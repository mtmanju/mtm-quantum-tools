import { Info, Layout, Moon, Sun } from 'lucide-react'
import { memo } from 'react'
import './Header.css'

// Prefetch route chunks on hover for faster navigation
const prefetchRoute = (path: string) => {
  // Prefetch the route chunk
  if (path === '/about') {
    // Prefetch About page component
    import('./../pages/About').catch(() => {})
  }
  // Tools page is already in main bundle, no need to prefetch
}

interface HeaderProps {
  scrolled: boolean
  isDarkMode: boolean
  searchQuery: string
  currentView: 'home' | 'tools' | 'about' | 'tool'
  onNavigate: (path: string) => void
  onSearchChange: (query: string) => void
  onToggleTheme: () => void
}

const Header = memo(({ 
  scrolled, 
  isDarkMode, 
  searchQuery, 
  currentView,
  onNavigate, 
  onSearchChange, 
  onToggleTheme 
}: HeaderProps) => {
  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          <div className="logo" onClick={() => onNavigate('/')}>
            <Layout size={28} strokeWidth={1.5} />
            <div className="logo-text">
              <h1>Quantum</h1>
              <span className="logo-subtitle">Tools</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="header-search-container">
            <svg className="header-search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="header-search-input"
              aria-label="Search tools"
              onClick={() => {
                if (currentView !== 'home') {
                  onNavigate('/')
                }
              }}
            />
          </div>
        </div>

        <div className="header-right">
          <button 
            className={`header-nav-btn ${currentView === 'tools' ? 'active' : ''}`}
            onClick={() => onNavigate('/tools')}
            onMouseEnter={() => prefetchRoute('/tools')}
            aria-label="Tools"
          >
            <Layout size={20} strokeWidth={1.5} />
            <span>Tools</span>
          </button>
          <button 
            className={`header-nav-btn ${currentView === 'about' ? 'active' : ''}`}
            onClick={() => onNavigate('/about')}
            onMouseEnter={() => prefetchRoute('/about')}
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

