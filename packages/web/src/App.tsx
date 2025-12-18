import { useState, useMemo, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Zap, Clock, Shield, FileText, FileCode, FileJson, 
  Database, Table, Workflow, GitCompare, Code, Calculator 
} from 'lucide-react'
import { useTheme } from './context/ThemeContext'
import { useScrollPosition } from './hooks/useScrollPosition'
import { getViewType, getToolId, ROUTES } from './constants/routes'
import Header from './components/Header'
import Footer from './components/Footer'
import MarkdownConverter from './tools/MarkdownConverter'
import About from './pages/About'
import './App.css'
import type { ComponentType, ReactElement, ReactNode } from 'react'

interface Tool {
  id: string
  name: string
  description: string
  icon: ReactElement
  category: string
  status: 'active' | 'coming-soon'
  component?: ComponentType
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
    component: MarkdownConverter,
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

// Memoized tool card component
const ToolCard = memo(({ tool, onClick }: { tool: Tool; onClick: (tool: Tool) => void }) => (
  <div
    className={`tool-card ${tool.status}`}
    onClick={() => onClick(tool)}
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
))

ToolCard.displayName = 'ToolCard'

// Component renderer for lazy-loaded tools
const ToolRenderer = memo(({ component: ToolComponent }: { component: ComponentType }) => {
  if (!ToolComponent) return null
  return <ToolComponent />
})

ToolRenderer.displayName = 'ToolRenderer'

function App() {
  // Use React Router hooks for clean URLs
  const location = useLocation()
  const navigate = useNavigate()
  const { isDarkMode, toggleTheme } = useTheme()
  const scrolled = useScrollPosition()
  const [searchQuery, setSearchQuery] = useState('')

  // Determine current view from pathname
  const currentView = useMemo(() => getViewType(location.pathname), [location.pathname])

  // Memoize selected tool
  const selectedTool = useMemo((): Tool | null => {
    const toolId = getToolId(location.pathname)
    if (!toolId) return null
    return tools.find(t => t.id === toolId) || null
  }, [location.pathname])

  // Memoize filtered tools with debounced search
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools
    const query = searchQuery.toLowerCase()
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Memoize categories
  const categories = useMemo(() => 
    Array.from(new Set(tools.map(t => t.category))), 
    []
  )

  // Memoize active count
  const activeCount = useMemo(() => 
    tools.filter(t => t.status === 'active').length, 
    []
  )

  // Memoize tool click handler
  const handleToolClick = useCallback((tool: Tool) => {
    if (tool.status === 'active') {
      navigate(ROUTES.TOOL(tool.id))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [navigate])

  // Memoize category sections - optimized for instant rendering
  const categorySections = useMemo(() => {
    const sections: ReactNode[] = []
    
    for (const category of categories) {
      const categoryTools = filteredTools.filter(t => t.category === category)
      if (categoryTools.length === 0) continue

      sections.push(
        <section key={category} className="category-section">
          <div className="section-header">
            <h2 className="section-title">{category}</h2>
          </div>
          <div className="tools-grid">
            {categoryTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} onClick={handleToolClick} />
            ))}
          </div>
        </section>
      )
    }
    
    return sections
  }, [categories, filteredTools, handleToolClick])

  return (
    <div className="app">
      <Header
        scrolled={scrolled}
        isDarkMode={isDarkMode}
        searchQuery={searchQuery}
        currentView={currentView}
        onNavigate={navigate}
        onSearchChange={setSearchQuery}
        onToggleTheme={toggleTheme}
      />

      {currentView === 'about' ? (
        <main className="main-content">
          <About 
            totalTools={tools.length}
            activeTools={activeCount}
            totalCategories={categories.length}
          />
        </main>
      ) : currentView === 'home' ? (
        <main className="main-content">
          <section className="landing-hero">
            <div className="hero-badge">
              <span>Professional Grade</span>
            </div>
            <h1 className="hero-title">Developer Tools<br />Simplified</h1>
            <p className="hero-subtitle">
              Trusted by developers worldwide. Professional utilities designed to streamline your workflow and boost productivity.
            </p>
            <div className="hero-cta">
              <button className="cta-primary" onClick={() => navigate(ROUTES.TOOLS)}>
                <span>Explore Tools</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button className="cta-secondary" onClick={() => navigate(ROUTES.ABOUT)}>
                <span>Learn More</span>
              </button>
            </div>
          </section>

          <section className="landing-features">
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3>Lightning Fast</h3>
              <p>Optimized for performance with instant results</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={24} />
              </div>
              <h3>24/7 Available</h3>
              <p>Access your tools anytime, anywhere</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3>Secure & Private</h3>
              <p>Your data never leaves your browser</p>
            </div>
          </section>
        </main>
      ) : currentView === 'tools' ? (
        <main className="main-content tools-page">
          {categorySections}
        </main>
      ) : (
        <main className="main-content tool-view">
          <div className="tool-view-wrapper">
            <button
              className="back-button"
              onClick={() => navigate(ROUTES.TOOLS)}
              aria-label="Back to tools"
            >
              <ArrowLeft size={20} />
              <span>Back to Tools</span>
            </button>

            {selectedTool && (
            <div className="tool-workspace">
              <div className="tool-header">
                <h2 className="tool-title">{selectedTool.name}</h2>
                <p className="tool-description">{selectedTool.description}</p>
              </div>
              {selectedTool.component && (
                <div className="tool-content">
                  <ToolRenderer component={selectedTool.component} />
                </div>
              )}
            </div>
            )}
          </div>
        </main>
      )}

      <Footer
        toolsCount={tools.length}
        activeCount={activeCount}
        categoriesCount={categories.length}
      />
    </div>
  )
}

export default App
