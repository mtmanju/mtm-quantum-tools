import { memo } from 'react'
import { Layout } from 'lucide-react'
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
        <div className="footer-left">
          <div className="footer-logo">
            <Layout size={24} strokeWidth={1.5} />
            <div>
              <div className="footer-brand">Quantum Tools</div>
              <div className="footer-tagline">Professional developer utilities</div>
            </div>
          </div>
        </div>
        
        <div className="footer-center">
          <p className="footer-note">
            {toolsCount} tools across {categoriesCount} categories. Everything runs
            in your browser — nothing you paste is uploaded.
          </p>
        </div>

        <div className="footer-right">
          <div className="footer-meta">
            <span>v1.0.0</span>
            <span className="footer-separator">•</span>
            <span>© 2025</span>
          </div>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer

