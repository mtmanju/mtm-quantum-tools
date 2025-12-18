import { useState, useMemo, useCallback, memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Zap, Clock, Shield, Calculator as CalculatorIcon,
  FileStack, Link2, 
  Brackets, 
  FileJson, FileCode, KeyRound, Hash, LockKeyhole, CalendarClock, 
  FileCode2 as FileCodeIcon, CodeXml, Database as DatabaseIcon, 
  GitBranch, CaseLower, FileText, Network, Search, Cog
} from 'lucide-react'
import { useTheme } from './context/ThemeContext'
import { useScrollPosition } from './hooks/useScrollPosition'
import { getViewType, getToolId, ROUTES } from './constants/routes'
import Header from './components/Header'
import Footer from './components/Footer'
import MarkdownConverter from './tools/MarkdownConverter'
import JsonFormatter from './tools/JsonFormatter'
import JwtDecoder from './tools/JwtDecoder'
import PdfMerger from './tools/PdfMerger'
import Base64Converter from './tools/Base64Converter'
import RegexTester from './tools/RegexTester'
import DiffChecker from './tools/DiffChecker'
import TimestampConverter from './tools/TimestampConverter'
import SqlFormatter from './tools/SqlFormatter'
import ApiTester from './tools/ApiTester'
import Calculator from './tools/Calculator'
import DmnEvaluator from './tools/DmnEvaluator'
import WorkflowValidator from './tools/WorkflowValidator'
import UrlEncoder from './tools/UrlEncoder'
import HashGenerator from './tools/HashGenerator'
import UuidGenerator from './tools/UuidGenerator'
import TextCaseConverter from './tools/TextCaseConverter'
import PasswordGenerator from './tools/PasswordGenerator'
import HtmlFormatter from './tools/HtmlFormatter'
import YamlFormatter from './tools/YamlFormatter'
import About from './pages/About'
import './App.css'
import type { ComponentType, ReactElement, ReactNode } from 'react'

interface Tool {
  id: string
  name: string
  description: string
  icon: ReactElement
  iconColor?: string
  category: string
  status: 'active' | 'coming-soon'
  component?: ComponentType
  featured?: boolean
}


const tools: Tool[] = [
  // Most Popular Tools (Featured)
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and beautify JSON data with syntax highlighting',
    icon: <FileJson size={64} strokeWidth={1.5} />,
    iconColor: '#F39C12', // Orange
    category: 'Most Popular',
    status: 'active',
    component: JsonFormatter,
    featured: true
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder',
    description: 'Encode and decode URL-encoded strings',
    icon: <Link2 size={64} strokeWidth={1.5} />,
    iconColor: '#8B5CF6', // Purple
    category: 'Most Popular',
    status: 'active',
    component: UrlEncoder,
    featured: true
  },
  {
    id: 'base64-converter',
    name: 'Base64 Converter',
    description: 'Encode and decode Base64 strings, images, and files',
    icon: <FileCode size={64} strokeWidth={1.5} />,
    iconColor: '#2980B9', // Blue
    category: 'Most Popular',
    status: 'active',
    component: Base64Converter,
    featured: true
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes',
    icon: <KeyRound size={64} strokeWidth={1.5} />,
    iconColor: '#EC4899', // Pink
    category: 'Most Popular',
    status: 'active',
    component: HashGenerator,
    featured: true
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate UUIDs (Universally Unique Identifiers)',
    icon: <Hash size={64} strokeWidth={1.5} />,
    iconColor: '#06B6D4', // Cyan
    category: 'Most Popular',
    status: 'active',
    component: UuidGenerator,
    featured: true
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate secure passwords with customizable options',
    icon: <LockKeyhole size={64} strokeWidth={1.5} />,
    iconColor: '#F59E0B', // Amber
    category: 'Most Popular',
    status: 'active',
    component: PasswordGenerator,
    featured: true
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode and validate JSON Web Tokens',
    icon: <Shield size={64} strokeWidth={1.5} />,
    iconColor: '#27AE60', // Green
    category: 'Most Popular',
    status: 'active',
    component: JwtDecoder,
    featured: true
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert between Unix timestamps and human-readable dates',
    icon: <CalendarClock size={64} strokeWidth={1.5} />,
    iconColor: '#34495E', // Dark Blue
    category: 'Most Popular',
    status: 'active',
    component: TimestampConverter,
    featured: true
  },

  // Data & Formatting
  {
    id: 'yaml-formatter',
    name: 'YAML Formatter',
    description: 'Format and validate YAML configuration files',
    icon: <FileText size={64} strokeWidth={1.5} />,
    iconColor: '#6366F1', // Indigo
    category: 'Data & Formatting',
    status: 'active',
    component: YamlFormatter
  },
  {
    id: 'html-formatter',
    name: 'HTML Formatter',
    description: 'Format and minify HTML code',
    icon: <CodeXml size={64} strokeWidth={1.5} />,
    iconColor: '#EF4444', // Red
    category: 'Data & Formatting',
    status: 'active',
    component: HtmlFormatter
  },
  {
    id: 'sql-formatter',
    name: 'SQL Formatter',
    description: 'Format and beautify SQL queries with proper indentation',
    icon: <DatabaseIcon size={64} strokeWidth={1.5} />,
    iconColor: '#3498DB', // Blue
    category: 'Data & Formatting',
    status: 'active',
    component: SqlFormatter
  },

  // Developer Utilities
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test and debug regular expressions with live matching',
    icon: <Brackets size={64} strokeWidth={1.5} />,
    iconColor: '#E67E22', // Orange
    category: 'Developer Utilities',
    status: 'active',
    component: RegexTester
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare text, code, or JSON with side-by-side view',
    icon: <GitBranch size={64} strokeWidth={1.5} />,
    iconColor: '#16A085', // Green
    category: 'Developer Utilities',
    status: 'active',
    component: DiffChecker
  },
  {
    id: 'text-case-converter',
    name: 'Text Case Converter',
    description: 'Convert text between different case formats',
    icon: <CaseLower size={64} strokeWidth={1.5} />,
    iconColor: '#10B981', // Green
    category: 'Developer Utilities',
    status: 'active',
    component: TextCaseConverter
  },

  // Document Processing
  {
    id: 'md-converter',
    name: 'MD to DOCX',
    description: 'Convert Markdown files to professional Word documents with full Mermaid diagram support',
    icon: <FileCodeIcon size={64} strokeWidth={1.5} />,
    iconColor: '#875A7B', // Purple - Odoo style
    category: 'Document Processing',
    status: 'active',
    component: MarkdownConverter
  },
  {
    id: 'pdf-merger',
    name: 'PDF Merger',
    description: 'Merge multiple PDF files into a single document',
    icon: <FileStack size={64} strokeWidth={1.5} />,
    iconColor: '#E74C3C', // Red
    category: 'Document Processing',
    status: 'active',
    component: PdfMerger
  },

  // API & Testing
  {
    id: 'api-tester',
    name: 'API Tester',
    description: 'Test REST APIs with custom headers, authentication, and request bodies',
    icon: <Network size={64} strokeWidth={1.5} />,
    iconColor: '#F1C40F', // Yellow
    category: 'API & Testing',
    status: 'active',
    component: ApiTester
  },

  // Business Logic
  {
    id: 'dmn-evaluator',
    name: 'DMN Evaluator',
    description: 'Evaluate DMN (Decision Model and Notation) decision tables for business rules',
    icon: <Search size={64} strokeWidth={1.5} />,
    iconColor: '#9B59B6', // Purple
    category: 'Business Logic',
    status: 'active',
    component: DmnEvaluator
  },
  {
    id: 'workflow-validator',
    name: 'Workflow Validator',
    description: 'Validate BPMN workflows and process definitions',
    icon: <Cog size={64} strokeWidth={1.5} />,
    iconColor: '#1ABC9C', // Teal
    category: 'Business Logic',
    status: 'active',
    component: WorkflowValidator
  },

  // Utilities
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Scientific and business calculations with formula support',
    icon: <CalculatorIcon size={64} strokeWidth={1.5} />,
    iconColor: '#8E44AD', // Purple
    category: 'Utilities',
    status: 'active',
    component: Calculator
  }
]

// Memoized tool card component - Odoo style
const ToolCard = memo(({ tool, onClick }: { tool: Tool; onClick: (tool: Tool) => void }) => (
  <div
    className={`tool-card ${tool.status}`}
    onClick={() => onClick(tool)}
  >
    <div className="tool-icon-wrapper" style={{ color: tool.iconColor }}>
      {tool.icon}
    </div>
    <div className="tool-info">
      <h3>{tool.name}</h3>
    </div>
    {tool.status === 'coming-soon' && (
      <div className="tool-badge">
        <span>Soon</span>
      </div>
    )}
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
          <div className="page-header">
            <h1 className="page-title">About</h1>
          </div>
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
          <div className="page-header">
            <h1 className="page-title">Tools</h1>
          </div>
          {categorySections}
        </main>
      ) : (
        <main className="main-content tool-view">
          <div className="tool-view-wrapper">
            <div className="page-header-with-back">
            <button
              className="back-button"
                onClick={() => navigate(ROUTES.TOOLS)}
                aria-label="Back to tools"
            >
                <ArrowLeft size={18} />
                <span>Back</span>
            </button>
              {selectedTool && (
                <h1 className="page-title">{selectedTool.name}</h1>
              )}
            </div>

            {selectedTool && selectedTool.component && (
            <div className="tool-workspace">
                <ToolRenderer component={selectedTool.component} />
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
