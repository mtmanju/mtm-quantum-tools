import { memo } from 'react'
import { Shield, WifiOff, FileCode2, ShieldCheck } from 'lucide-react'
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
const About = memo(({ totalTools, activeTools, totalCategories }: AboutProps) => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <p className="about-eyebrow">
          <ShieldCheck aria-hidden="true" />
          Privacy by architecture
        </p>
        <h1 className="about-title">Nothing you paste leaves your browser</h1>
        <p className="about-lede">
          Quantum Tools is {totalTools} developer utilities across {totalCategories} categories:
          formatters, encoders, converters, and calculators. All of them run as
          JavaScript on your own machine.
        </p>

        {/* Figures, not adjectives. "0 bytes uploaded" is the whole product
            claim expressed as a number, which is why it sits with the counts
            rather than in a sentence somewhere below. */}
        <dl className="about-stats">
          <div className="about-stat">
            <dt>Tools</dt>
            <dd>{activeTools}</dd>
          </div>
          <div className="about-stat">
            <dt>Categories</dt>
            <dd>{totalCategories}</dd>
          </div>
          <div className="about-stat">
            <dt>Bytes uploaded</dt>
            <dd>0</dd>
          </div>
        </dl>
      </section>

      {/* The footer's "Privacy" link lands here — this section *is* the
          privacy policy, stated as a mechanism rather than as a document. */}
      <section className="about-section" id="privacy">
        <header className="about-section-header">
          <span className="about-section-eyebrow">The mechanism</span>
          <h2 className="about-section-title">How that actually works</h2>
          <p className="about-section-desc">
            Most online formatters POST your input to a server to do the work.
            That is fine for sample data and a problem for anything else.
          </p>
        </header>

        <div className="features-grid">
          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              <Shield size={20} strokeWidth={1.75} />
            </span>
            <h3>There is no backend</h3>
            <p>
              No server receives your input, because there is no server to
              receive it. Every tool is a pure function running in the page.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              <WifiOff size={20} strokeWidth={1.75} />
            </span>
            <h3>You can verify it</h3>
            <p>
              Open your browser&rsquo;s Network tab and use any tool. You will see no
              requests. Turn off your Wi-Fi and everything still works.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              <FileCode2 size={20} strokeWidth={1.75} />
            </span>
            <h3>Nothing is stored</h3>
            <p>
              No accounts, no analytics on your input, no history. Reload the
              page and what you pasted is gone.
            </p>
          </article>
        </div>
      </section>

      <section className="about-section">
        <header className="about-section-header">
          <span className="about-section-eyebrow">Under the hood</span>
          <h2 className="about-section-title">What it is built with</h2>
        </header>

        {/* Four centred cards gave a one-word value ("UI") the same visual
            weight as a full sentence. A definition list reads as a spec
            sheet, which is what this is. */}
        <dl className="tech-stack">
          <div className="tech-item">
            <dt className="tech-name">React 19</dt>
            <dd className="tech-desc">UI</dd>
          </div>
          <div className="tech-item">
            <dt className="tech-name">TypeScript</dt>
            <dd className="tech-desc">Every tool is typed end to end</dd>
          </div>
          <div className="tech-item">
            <dt className="tech-name">Vite</dt>
            <dd className="tech-desc">Build and dev server</dd>
          </div>
          <div className="tech-item">
            <dt className="tech-name">No runtime dependencies</dt>
            <dd className="tech-desc">Beyond the framework itself</dd>
          </div>
        </dl>
      </section>
    </div>
  )
})

About.displayName = 'About'

export default About
