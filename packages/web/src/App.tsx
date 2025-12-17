import { useState, useEffect } from 'react'
import { FileText, Zap, Code, Calculator, Layout, FileJson, GitCompare, Table, Workflow, Database, FileCode, Shield, Clock, Moon, Sun, ArrowLeft } from 'lucide-react'
import MarkdownConverter from './tools/MarkdownConverter'
import './App.css'
import type { ReactElement } from 'react'

interface Tool {
  id: string
  name: string
  description: string
  icon: ReactElement
  category: string
  status: 'active' | 'coming-soon'
  component?: ReactElement
  featured?: boolean
}

const tools: Tool[] = [
  // Document Tools
  {
    id: 'md-converter',
    name: 'Markdown to DOCX',
    description: 'Convert Markdown files to professional Word documents with full Mermaid diagram support',
    icon: <FileText size={24} />,
    category: 'Document Processing',
    status: 'active',
    component: <MarkdownConverter />,
    featured: true
  },
  {
    id: 'pdf-merger',
    name: 'PDF Merger',
    description: 'Merge multiple PDF files into a single document',
    icon: <FileCode size={24} />,
    category: 'Document Processing',
    status: 'coming-soon'
  },

  // Data Tools
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and beautify JSON data with syntax highlighting',
    icon: <FileJson size={24} />,
    category: 'Data & API',
    status: 'coming-soon',
    featured: true
  },
  {
    id: 'api-tester',
    name: 'API Tester',
    description: 'Test REST APIs with custom headers, authentication, and request bodies',
    icon: <Zap size={24} />,
    category: 'Data & API',
    status: 'coming-soon'
  },
  {
    id: 'sql-formatter',
    name: 'SQL Formatter',
    description: 'Format and beautify SQL queries with proper indentation',
    icon: <Database size={24} />,
    category: 'Data & API',
    status: 'coming-soon'
  },

  // Business Tools
  {
    id: 'dmn-evaluator',
    name: 'DMN Evaluator',
    description: 'Evaluate DMN (Decision Model and Notation) decision tables for business rules',
    icon: <Table size={24} />,
    category: 'Business Logic',
    status: 'coming-soon',
    featured: true
  },
  {
    id: 'workflow-validator',
    name: 'Workflow Validator',
    description: 'Validate BPMN workflows and process definitions',
    icon: <Workflow size={24} />,
    category: 'Business Logic',
    status: 'coming-soon'
  },

  // Developer Tools
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare text, code, or JSON with side-by-side view',
    icon: <GitCompare size={24} />,
    category: 'Developer Tools',
    status: 'coming-soon'
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test and debug regular expressions with live matching',
    icon: <Code size={24} />,
    category: 'Developer Tools',
    status: 'coming-soon'
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode and validate JSON Web Tokens',
    icon: <Shield size={24} />,
    category: 'Developer Tools',
    status: 'coming-soon'
  },

  // Utilities
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human-readable dates',
    icon: <Clock size={24} />,
    category: 'Utilities',
    status: 'coming-soon'
  },
  {
    id: 'calculator',
    name: 'Advanced Calculator',
    description: 'Scientific and business calculations with formula support',
    icon: <Calculator size={24} />,
    category: 'Utilities',
    status: 'coming-soon'
  }
]

// Custom hook for hash-based routing
const useHashLocation = () => {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = (newHash: string) => {
    window.location.hash = newHash
  }

  return { hash, navigate }
}

function App() {
  const { hash, navigate } = useHashLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Derive selected tool from hash
  const getSelectedTool = (): Tool | null => {
    if (!hash.startsWith('#tool/')) return null
    const toolId = hash.replace('#tool/', '')
    return tools.find(t => t.id === toolId) || null
  }

  const selectedTool = getSelectedTool()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setIsDarkMode(savedTheme === 'dark')
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark'
    setIsDarkMode(!isDarkMode)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Array.from(new Set(tools.map(t => t.category)))
  const activeCount = tools.filter(t => t.status === 'active').length

  const handleToolClick = (tool: Tool) => {
    if (tool.status === 'active') {
      navigate(`#tool/${tool.id}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="app">
      <header className={`header ${window.scrollY > 10 ? 'scrolled' : ''}`}>
        <div className="header-content">
          <div className="logo" onClick={() => navigate('')}>
            <Layout size={28} strokeWidth={1.5} />
            <div>
              <h1>Quantum</h1>
              <span className="logo-subtitle">Tools</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {isDarkMode ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {!selectedTool ? (
        <main className="main-content">
          <section className="hero-section">
            <h1 className="hero-title">Essential Utilities<br />For Modern Development.</h1>
            <p className="hero-subtitle">A curated collection of developer tools designed for performance and precision.</p>

            <div className="search-container">
              <input
                type="text"
                placeholder="Find a tool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{tools.length}</span>
                <span className="hero-stat-label">Tools Available</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">{activeCount}</span>
                <span className="hero-stat-label">Active Modules</span>
              </div>
            </div>
          </section>

          {categories.map(category => {
            const categoryTools = filteredTools.filter(t => t.category === category)
            if (categoryTools.length === 0) return null

            return (
              <section key={category} className="category-section">
                <div className="section-header">
                  <h2 className="section-title">{category}</h2>
                </div>
                <div className="tools-grid">
                  {categoryTools.map(tool => (
                    <div
                      key={tool.id}
                      className={`tool-card ${tool.status}`}
                      onClick={() => handleToolClick(tool)}
                    >
                      <div className="status-indicator">
                        <div className={`status-dot ${tool.status === 'active' ? 'status-active' : 'status-soon'}`} />
                        {tool.status === 'coming-soon' && <span>Soon</span>}
                      </div>

                      <div className="tool-icon-wrapper">
                        {tool.icon}
                      </div>

                      <div className="tool-info">
                        <h3>{tool.name}</h3>
                        <p>{tool.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </main>
      ) : (
        <main className="main-content">
          <div className="tool-view-wrapper">
            <button
              className="back-button"
              onClick={() => navigate('')}
            >
              <ArrowLeft size={20} />
              <span>Back to Tools</span>
            </button>

            <div className="tool-workspace">
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{selectedTool.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{selectedTool.description}</p>
              </div>
              {selectedTool.component}
            </div>
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="footer-content">
          <p>© 2025 Quantum Tools</p>
          <div className="footer-links">
            <span>Refined Engineering</span>
            <span className="separator">•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
