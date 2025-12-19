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
  currentView: 'home' | 'tools' | 'about' | 'tool'
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
          <div className="logo" onClick={() => onNavigate('/')}>
            <Layout size={28} strokeWidth={1.5} />
            <div className="logo-text">
              <h1>Quantum</h1>
              <span className="logo-subtitle">Tools</span>
            </div>
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

