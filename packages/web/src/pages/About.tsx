import { memo } from 'react'
import { Sparkles, Target, Zap, Shield, Heart, Code2 } from 'lucide-react'
import './About.css'

interface AboutProps {
  totalTools: number;
  activeTools: number;
  totalCategories: number;
}

const About = memo(({ totalTools, activeTools, totalCategories }: AboutProps) => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-badge">About Us</div>
        <h1 className="hero-title">
          Build Faster.<br />
          Work Smarter.
        </h1>
        <p className="hero-subtitle">
          Professional-grade utilities for modern developers. Document conversion, 
          data formatting, and workflow automation—all in one place.
        </p>

        <div className="about-metrics">
          <div className="metric-item">
            <div className="metric-value">{totalTools}</div>
            <div className="metric-label">Tools</div>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <div className="metric-value">{activeTools}</div>
            <div className="metric-label">Active</div>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <div className="metric-value">{totalCategories}</div>
            <div className="metric-label">Categories</div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-section mission-section">
        <div className="section-content">
          <div className="section-header-centered">
            <h2 className="section-title">Our Mission</h2>
            <p className="section-description">
              To empower developers with elegant, efficient tools that streamline workflows 
              and boost productivity.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Sparkles size={24} />
              </div>
              <h3>Intuitive Design</h3>
              <p>Clean, modern interfaces that feel natural to use. No learning curve, just results.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3>Lightning Fast</h3>
              <p>Optimized performance for instant results. Process files and data at incredible speeds.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3>Privacy First</h3>
              <p>All processing happens locally in your browser. Your data never leaves your device.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Target size={24} />
              </div>
              <h3>Purpose-Built</h3>
              <p>Each tool is crafted for a specific task, ensuring precision and reliability.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Code2 size={24} />
              </div>
              <h3>Developer-Focused</h3>
              <p>Built by developers, for developers. We understand your workflow and needs.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Heart size={24} />
              </div>
              <h3>Always Free</h3>
              <p>No subscriptions, no hidden fees. Quality tools accessible to everyone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="about-section tech-section">
        <div className="section-content">
          <div className="section-header-centered">
            <h2 className="section-title">Built with Modern Technology</h2>
            <p className="section-description">
              Leveraging cutting-edge web technologies to deliver exceptional performance 
              and user experience.
            </p>
          </div>

          <div className="tech-stack">
            <div className="tech-item">
              <div className="tech-name">React 19</div>
              <div className="tech-desc">Modern UI framework</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">TypeScript</div>
              <div className="tech-desc">Type-safe development</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">Vite</div>
              <div className="tech-desc">Lightning-fast builds</div>
            </div>
            <div className="tech-item">
              <div className="tech-name">Aptos Font</div>
              <div className="tech-desc">Modern typography</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="about-section vision-section">
        <div className="section-content">
          <div className="vision-content">
            <h2 className="section-title">Our Vision</h2>
            <p className="vision-text">
              We envision a world where developers have instant access to the tools they need, 
              without complexity or compromise. Quantum Tools is our commitment to that future—
              a growing collection of utilities that respect your time, data, and workflow.
            </p>
            <p className="vision-text">
              Every tool we create is designed with three principles: simplicity, performance, 
              and privacy. As we continue to grow, these principles will guide everything we build.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
})

About.displayName = 'About'

export default About

