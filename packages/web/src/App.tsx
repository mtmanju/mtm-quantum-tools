import { useState } from 'react'
import { FileText, Zap, Code, Calculator, Layout, FileJson, GitCompare, Table, Workflow, Database, FileCode, Shield, Clock } from 'lucide-react'
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

function App() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const featuredTools = filteredTools.filter(t => t.featured)
  const categories = Array.from(new Set(tools.map(t => t.category)))
  const activeCount = tools.filter(t => t.status === 'active').length
  const totalCount = tools.length

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Layout size={36} />
            <div className="logo-text">
              <h1>Quantum Tools</h1>
              <p className="subtitle">by MTM</p>
            </div>
          </div>
          <p className="tagline">Enterprise Utility Platform - Accelerate Your Workflow</p>
        </div>
      </header>

      {!selectedTool ? (
        <main className="main-content">
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-value">{totalCount}</span>
              <span className="stat-label">Total Tools</span>
            </div>
            <div className="stat">
              <span className="stat-value">{activeCount}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat">
              <span className="stat-value">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>

          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Search tools by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Featured Tools */}
          {!searchQuery && featuredTools.length > 0 && (
            <section className="featured-section">
              <div className="section-header">
                <h2 className="section-title">Featured Tools</h2>
                <p className="section-description">Most popular and frequently used tools</p>
              </div>
              <div className="tools-grid featured-grid">
                {featuredTools.map(tool => (
                  <div 
                    key={tool.id} 
                    className={`tool-card featured ${tool.status}`}
                    onClick={() => tool.status === 'active' && setSelectedTool(tool)}
                  >
                    <div className="tool-icon">{tool.icon}</div>
                    <h3 className="tool-name">{tool.name}</h3>
                    <p className="tool-description">{tool.description}</p>
                    {tool.status === 'coming-soon' && (
                      <span className="coming-soon-badge">Coming Soon</span>
                    )}
                    {tool.status === 'active' && (
                      <button className="tool-button">Launch Tool →</button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Tools by Category */}
          <section className="all-tools-section">
            {!searchQuery && <div className="section-header">
              <h2 className="section-title">All Tools</h2>
              <p className="section-description">Browse by category</p>
            </div>}
            
            {categories.map(category => {
              const categoryTools = filteredTools.filter(t => t.category === category)
              if (categoryTools.length === 0) return null

              return (
                <div key={category} className="category-group">
                  <h3 className="category-title">{category}</h3>
                  <div className="tools-grid">
                    {categoryTools.map(tool => (
                      <div 
                        key={tool.id} 
                        className={`tool-card ${tool.status}`}
                        onClick={() => tool.status === 'active' && setSelectedTool(tool)}
                      >
                        <div className="tool-icon">{tool.icon}</div>
                        <h3 className="tool-name">{tool.name}</h3>
                        <p className="tool-description">{tool.description}</p>
                        {tool.status === 'coming-soon' && (
                          <span className="coming-soon-badge">Coming Soon</span>
                        )}
                        {tool.status === 'active' && (
                          <button className="tool-button">Launch Tool →</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        </main>
      ) : (
        <main className="tool-view">
          <div className="tool-header">
            <button 
              className="back-button"
              onClick={() => setSelectedTool(null)}
            >
              ← Back to Tools
            </button>
            <h2>{selectedTool.name}</h2>
          </div>
          <div className="tool-content">
            {selectedTool.component}
          </div>
        </main>
      )}

      <footer className="footer">
        <p>© 2025 Quantum Tools by MTM. All rights reserved.</p>
        <p className="footer-note">Enterprise-grade utilities for modern workflows</p>
      </footer>
    </div>
  )
}

export default App
