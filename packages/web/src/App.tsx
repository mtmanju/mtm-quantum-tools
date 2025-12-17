import { useState, useMemo, useCallback, lazy, Suspense, memo } from 'react'
import { 
  FileText, Zap, Code, Calculator, FileJson, GitCompare, 
  Table, Workflow, Database, FileCode, Shield, Clock, ArrowLeft 
} from 'lucide-react'
import { useTheme } from './context/ThemeContext'
import { useHashLocation } from './hooks/useHashLocation'
import { useScrollPosition } from './hooks/useScrollPosition'
import { getViewType } from './constants/routes'
import Header from './components/Header'
import Footer from './components/Footer'
import './App.css'
import type { ReactElement, ComponentType } from 'react'

// Lazy load tool components and pages for code splitting
const MarkdownConverter = lazy(() => import('./tools/MarkdownConverter'))
const About = lazy(() => import('./pages/About'))

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
  // Use custom hooks for routing, theme, and scroll detection
  const { hash, navigate } = useHashLocation()
  const { isDarkMode, toggleTheme } = useTheme()
  const scrolled = useScrollPosition()
  const [searchQuery, setSearchQuery] = useState('')

  // Determine current view using utility function
  const currentView = useMemo(() => getViewType(hash), [hash])

  // Memoize selected tool
  const selectedTool = useMemo((): Tool | null => {
    if (!hash.startsWith('#tool/')) return null
    const toolId = hash.replace('#tool/', '')
    return tools.find(t => t.id === toolId) || null
  }, [hash])

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
      navigate(`tool/${tool.id}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [navigate])

  // Memoize category sections
  const categorySections = useMemo(() => 
    categories.map(category => {
      const categoryTools = filteredTools.filter(t => t.category === category)
      if (categoryTools.length === 0) return null

      return (
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
    }), 
    [categories, filteredTools, handleToolClick]
  )

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
          <Suspense fallback={
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          }>
            <About 
              totalTools={tools.length}
              activeTools={activeCount}
              totalCategories={categories.length}
            />
          </Suspense>
        </main>
      ) : currentView === 'home' ? (
        <main className="main-content">
          <section className="home-intro">
            <h1 className="intro-title">Essential Developer Tools</h1>
            <p className="intro-subtitle">
              Choose from our collection of professional utilities designed to streamline your workflow.
            </p>
          </section>

          {categorySections}
        </main>
      ) : (
        <main className="main-content tool-view">
          <div className="tool-view-wrapper">
            <button
              className="back-button"
              onClick={() => navigate('')}
              aria-label="Back to tools"
            >
              <ArrowLeft size={20} />
              <span>Back to Tools</span>
            </button>

            {selectedTool && (
              <div className="tool-workspace">
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{selectedTool.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{selectedTool.description}</p>
                </div>
                {selectedTool.component && (
                  <Suspense fallback={
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Loading tool...</p>
                    </div>
                  }>
                    <ToolRenderer component={selectedTool.component} />
                  </Suspense>
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
