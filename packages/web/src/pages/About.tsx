import { memo } from 'react'
import { Shield, WifiOff, FileCode2 } from 'lucide-react'
import './About.css'

interface AboutProps {
  totalTools: number;
  activeTools: number;
  totalCategories: number;
}

/**
 * This page used to run five sections — Mission, Tech Stack, Three Core
 * Pillars, Vision, plus six feature cards — that between them made the same
 * three claims (fast, private, simple) four times over, in copy that would fit
 * any product at all ("empower developers", "boost productivity").
 *
 * What is actually distinctive here is the privacy claim, and unusually it is
 * one a reader can check for themselves. So the page now leads with it and
 * then explains the mechanism, which is far more persuasive than repeating the
 * adjective.
 */
const About = memo(({ totalTools, totalCategories }: AboutProps) => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1 className="hero-title">Nothing you paste leaves your browser</h1>
        <p className="hero-subtitle">
          Quantum Tools is {totalTools} developer utilities across {totalCategories} categories —
          formatters, encoders, converters, and calculators. All of them run as
          JavaScript on your own machine.
        </p>
      </section>

      <section className="about-section">
        <div className="section-content">
          <div className="section-header-centered">
            <h2 className="section-title">How that actually works</h2>
            <p className="section-description">
              Most online formatters POST your input to a server to do the work.
              That is fine for sample data and a problem for anything else.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={24} aria-hidden="true" />
              </div>
              <h3>There is no backend</h3>
              <p>
                No server receives your input, because there is no server to
                receive it. Every tool is a pure function running in the page.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <WifiOff size={24} aria-hidden="true" />
              </div>
              <h3>You can verify it</h3>
              <p>
                Open your browser&rsquo;s Network tab and use any tool. You will see no
                requests. Turn off your Wi-Fi — everything still works.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FileCode2 size={24} aria-hidden="true" />
              </div>
              <h3>Nothing is stored</h3>
              <p>
                No accounts, no analytics on your input, no history. Reload the
                page and what you pasted is gone.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="section-content">
          <div className="section-header-centered">
            <h2 className="section-title">What it is built with</h2>
          </div>

          <div className="tech-stack">
            <div className="tech-item">
              <div className="tech-name">React 19</div>
              <div className="tech-desc">UI</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">TypeScript</div>
              <div className="tech-desc">Every tool is typed end to end</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">Vite</div>
              <div className="tech-desc">Build and dev server</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">No dependencies at runtime</div>
              <div className="tech-desc">Beyond the framework itself</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
})

About.displayName = 'About'

export default About
