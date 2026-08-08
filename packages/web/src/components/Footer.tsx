import { memo } from 'react'
import { Layout, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Footer.css'

interface FooterProps {
  toolsCount: number
  activeCount: number
  categoriesCount: number
}

const Footer = memo(({ toolsCount, categoriesCount }: FooterProps) => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand-block">
          <span className="footer-mark" aria-hidden="true">
            <Layout size={15} strokeWidth={2} />
          </span>
          <span className="footer-brand-text">
            <span className="footer-brand">Quantum Tools</span>
            {/* The count and the privacy claim were two separate blocks on
                two rows. They are one sentence. */}
            <span className="footer-tagline">
              <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
              {toolsCount} tools across {categoriesCount} categories. Nothing you paste is uploaded.
            </span>
          </span>
        </div>

        <div className="footer-end">
          {/* Real anchors, not buttons: this is navigation, so it should be
              copyable, openable in a new tab, and crawlable. */}
          {/* "About" and "Privacy" both pointed at /about, so the Privacy
              link promised a privacy page and delivered the About page from
              the top. It now lands on the section that actually answers the
              question — see useHashScroll for the scrolling. */}
          <nav className="footer-nav" aria-label="Footer">
            <Link to="/">All tools</Link>
            <Link to="/about">About</Link>
            <Link to="/about#privacy">Privacy</Link>
          </nav>
          <span className="footer-divider" aria-hidden="true" />
          <p className="footer-meta">v1.0.0 &middot; &copy; 2025</p>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer
