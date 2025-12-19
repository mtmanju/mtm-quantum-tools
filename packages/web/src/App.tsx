import {
  ArrowLeft,
  Binary,
  Brackets,
  Calculator as CalculatorIcon,
  CalendarClock,
  Clock,
  Code,
  CodeXml,
  CreditCard,
  Database as DatabaseIcon,
  DollarSign,
  FileCheck,
  FileCode,
  FileCode2 as FileCodeIcon,
  FileJson,
  FileStack,
  FileText,
  FileType,
  FileX,
  GitBranch,
  Hash,
  KeyRound,
  Layers,
  Link2,
  LockKeyhole,
  Mail,
  Network,
  Palette,
  Percent,
  Scissors,
  Shield,
  Sparkle,
  Table2,
  TrendingUp,
  TrendingDown,
  Type,
  Wand2,
  Zap,
  FileSpreadsheet,
  AlignLeft,
  BarChart3,
  Globe
} from 'lucide-react'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Footer from './components/Footer'
import Header from './components/Header'
import { getToolId, getViewType, ROUTES } from './constants/routes'
import { useTheme } from './context/ThemeContext'
import { useScrollPosition } from './hooks/useScrollPosition'
import About from './pages/About'
import ApiTester from './tools/ApiTester'
import Base64Converter from './tools/Base64Converter'
import Calculator from './tools/Calculator'
import ColorConverter from './tools/ColorConverter'
import CssFormatter from './tools/CssFormatter'
import CsvToJsonConverter from './tools/CsvToJsonConverter'
import DiffChecker from './tools/DiffChecker'
import DmnEvaluator from './tools/DmnEvaluator'
import EmailValidator from './tools/EmailValidator'
import HashGenerator from './tools/HashGenerator'
import HtmlEntityEncoder from './tools/HtmlEntityEncoder'
import HtmlFormatter from './tools/HtmlFormatter'
import JavaScriptFormatter from './tools/JavaScriptFormatter'
import JsonFormatter from './tools/JsonFormatter'
import JsonXmlConverter from './tools/JsonXmlConverter'
import JwtDecoder from './tools/JwtDecoder'
import LoremIpsumGenerator from './tools/LoremIpsumGenerator'
import MarkdownConverter from './tools/MarkdownConverter'
import NumberBaseConverter from './tools/NumberBaseConverter'
import PasswordGenerator from './tools/PasswordGenerator'
import PdfMerger from './tools/PdfMerger'
import PdfSplitter from './tools/PdfSplitter'
import RegexTester from './tools/RegexTester'
import SlugConverter from './tools/SlugConverter'
import SqlFormatter from './tools/SqlFormatter'
import TextCaseConverter from './tools/TextCaseConverter'
import TextSummarizer from './tools/TextSummarizer'
import TimestampConverter from './tools/TimestampConverter'
import UrlEncoder from './tools/UrlEncoder'
import UuidGenerator from './tools/UuidGenerator'
import WordCounter from './tools/WordCounter'
import WorkflowValidator from './tools/WorkflowValidator'
import XmlFormatter from './tools/XmlFormatter'
import YamlFormatter from './tools/YamlFormatter'
import LoanEmiCalculator from './tools/LoanEmiCalculator'
import SipCalculator from './tools/SipCalculator'
import CompoundInterestCalculator from './tools/CompoundInterestCalculator'
import LoanRepaymentCalculator from './tools/LoanRepaymentCalculator'
import InvestmentReturnCalculator from './tools/InvestmentReturnCalculator'

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
  // Essential Tools (Featured)
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Beautify & validate JSON instantly',
    icon: <FileJson size={48} strokeWidth={1.5} />,
    iconColor: '#F39C12', // Orange
    category: 'Essential',
    status: 'active',
    component: JsonFormatter,
    featured: true
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder',
    description: 'Encode & decode URLs quickly',
    icon: <Globe size={48} strokeWidth={1.5} />,
    iconColor: '#8B5CF6', // Purple
    category: 'Essential',
    status: 'active',
    component: UrlEncoder,
    featured: true
  },
  {
    id: 'base64-converter',
    name: 'Base64 Converter',
    description: 'Convert files & text to Base64',
    icon: <FileCode size={48} strokeWidth={1.5} />,
    iconColor: '#2980B9', // Blue
    category: 'Essential',
    status: 'active',
    component: Base64Converter,
    featured: true
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-512',
    icon: <KeyRound size={48} strokeWidth={1.5} />,
    iconColor: '#EC4899', // Pink
    category: 'Essential',
    status: 'active',
    component: HashGenerator,
    featured: true
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Create unique identifiers',
    icon: <Hash size={48} strokeWidth={1.5} />,
    iconColor: '#06B6D4', // Cyan
    category: 'Essential',
    status: 'active',
    component: UuidGenerator,
    featured: true
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Create strong, secure passwords',
    icon: <LockKeyhole size={48} strokeWidth={1.5} />,
    iconColor: '#F59E0B', // Amber
    category: 'Essential',
    status: 'active',
    component: PasswordGenerator,
    featured: true
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode & inspect JWT tokens',
    icon: <Shield size={48} strokeWidth={1.5} />,
    iconColor: '#27AE60', // Green
    category: 'Essential',
    status: 'active',
    component: JwtDecoder,
    featured: true
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    description: 'Convert timestamps to dates',
    icon: <CalendarClock size={48} strokeWidth={1.5} />,
    iconColor: '#34495E', // Dark Blue
    category: 'Essential',
    status: 'active',
    component: TimestampConverter,
    featured: true
  },

  // Code Formatters
  {
    id: 'yaml-formatter',
    name: 'YAML Formatter',
    description: 'Format & validate YAML configs',
    icon: <FileSpreadsheet size={48} strokeWidth={1.5} />,
    iconColor: '#6366F1', // Indigo
    category: 'Code Formatters',
    status: 'active',
    component: YamlFormatter
  },
  {
    id: 'html-formatter',
    name: 'HTML Formatter',
    description: 'Beautify & minify HTML',
    icon: <CodeXml size={48} strokeWidth={1.5} />,
    iconColor: '#EF4444', // Red
    category: 'Code Formatters',
    status: 'active',
    component: HtmlFormatter
  },
  {
    id: 'xml-formatter',
    name: 'XML Formatter',
    description: 'Format & validate XML docs',
    icon: <FileX size={48} strokeWidth={1.5} />,
    iconColor: '#F97316', // Orange
    category: 'Code Formatters',
    status: 'active',
    component: XmlFormatter
  },
  {
    id: 'sql-formatter',
    name: 'SQL Formatter',
    description: 'Format SQL queries beautifully',
    icon: <DatabaseIcon size={48} strokeWidth={1.5} />,
    iconColor: '#3498DB', // Blue
    category: 'Code Formatters',
    status: 'active',
    component: SqlFormatter
  },
  {
    id: 'csv-to-json',
    name: 'CSV ↔ JSON',
    description: 'Convert between CSV & JSON',
    icon: <Table2 size={48} strokeWidth={1.5} />,
    iconColor: '#22C55E', // Green
    category: 'Code Formatters',
    status: 'active',
    component: CsvToJsonConverter
  },
  {
    id: 'json-xml-converter',
    name: 'JSON ↔ XML',
    description: 'Convert between JSON & XML',
    icon: <FileType size={48} strokeWidth={1.5} />,
    iconColor: '#F97316', // Orange
    category: 'Code Formatters',
    status: 'active',
    component: JsonXmlConverter
  },
  {
    id: 'css-formatter',
    name: 'CSS Formatter',
    description: 'Format & minify CSS',
    icon: <Code size={48} strokeWidth={1.5} />,
    iconColor: '#3B82F6', // Blue
    category: 'Code Formatters',
    status: 'active',
    component: CssFormatter
  },
  {
    id: 'javascript-formatter',
    name: 'JS Formatter',
    description: 'Format & minify JavaScript',
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />,
    iconColor: '#F59E0B', // Amber
    category: 'Code Formatters',
    status: 'active',
    component: JavaScriptFormatter
  },

  // Code Tools
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test regex patterns live',
    icon: <Brackets size={48} strokeWidth={1.5} />,
    iconColor: '#E67E22', // Orange
    category: 'Code Tools',
    status: 'active',
    component: RegexTester
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare code & text side-by-side',
    icon: <GitBranch size={48} strokeWidth={1.5} />,
    iconColor: '#16A085', // Green
    category: 'Code Tools',
    status: 'active',
    component: DiffChecker
  },
  {
    id: 'text-case-converter',
    name: 'Case Converter',
    description: 'Transform text case instantly',
    icon: <Type size={48} strokeWidth={1.5} />,
    iconColor: '#10B981', // Green
    category: 'Code Tools',
    status: 'active',
    component: TextCaseConverter
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert HEX, RGB, HSL',
    icon: <Palette size={48} strokeWidth={1.5} />,
    iconColor: '#EC4899', // Pink
    category: 'Code Tools',
    status: 'active',
    component: ColorConverter
  },
  {
    id: 'number-base-converter',
    name: 'Base Converter',
    description: 'Convert binary, hex, decimal, octal',
    icon: <Binary size={48} strokeWidth={1.5} />,
    iconColor: '#8B5CF6', // Purple
    category: 'Code Tools',
    status: 'active',
    component: NumberBaseConverter
  },
  {
    id: 'lorem-ipsum-generator',
    name: 'Lorem Generator',
    description: 'Generate placeholder text',
    icon: <Sparkle size={48} strokeWidth={1.5} />,
    iconColor: '#64748B', // Slate
    category: 'Code Tools',
    status: 'active',
    component: LoremIpsumGenerator
  },
  {
    id: 'html-entity-encoder',
    name: 'HTML Entity',
    description: 'Encode & decode HTML entities',
    icon: <Brackets size={48} strokeWidth={1.5} />,
    iconColor: '#EF4444', // Red
    category: 'Code Tools',
    status: 'active',
    component: HtmlEntityEncoder
  },
  {
    id: 'slug-converter',
    name: 'Slug Converter',
    description: 'Convert text to URL-friendly slugs',
    icon: <Link2 size={48} strokeWidth={1.5} />,
    iconColor: '#8B5CF6', // Purple
    category: 'Code Tools',
    status: 'active',
    component: SlugConverter
  },
  {
    id: 'email-validator',
    name: 'Email Validator',
    description: 'Validate email addresses',
    icon: <Mail size={48} strokeWidth={1.5} />,
    iconColor: '#06B6D4', // Cyan
    category: 'Code Tools',
    status: 'active',
    component: EmailValidator
  },

  // Documents
  {
    id: 'md-converter',
    name: 'MD → DOCX',
    description: 'Convert Markdown to Word docs',
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />,
    iconColor: '#875A7B', // Purple - Odoo style
    category: 'Documents',
    status: 'active',
    component: MarkdownConverter
  },
  {
    id: 'pdf-merger',
    name: 'PDF Merger',
    description: 'Merge PDFs into one file',
    icon: <FileStack size={48} strokeWidth={1.5} />,
    iconColor: '#E74C3C', // Red
    category: 'Documents',
    status: 'active',
    component: PdfMerger
  },
  {
    id: 'pdf-splitter',
    name: 'PDF Splitter',
    description: 'Split PDF into individual pages',
    icon: <Scissors size={48} strokeWidth={1.5} />,
    iconColor: '#F59E0B', // Amber
    category: 'Documents',
    status: 'active',
    component: PdfSplitter
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters & more',
    icon: <BarChart3 size={48} strokeWidth={1.5} />,
    iconColor: '#3B82F6', // Blue
    category: 'Documents',
    status: 'active',
    component: WordCounter
  },
  {
    id: 'text-summarizer',
    name: 'Text Summarizer',
    description: 'Summarize long text quickly',
    icon: <AlignLeft size={48} strokeWidth={1.5} />,
    iconColor: '#10B981', // Green
    category: 'Documents',
    status: 'active',
    component: TextSummarizer
  },

  // API & Testing
  {
    id: 'api-tester',
    name: 'API Tester',
    description: 'Test REST APIs with ease',
    icon: <Network size={48} strokeWidth={1.5} />,
    iconColor: '#F1C40F', // Yellow
    category: 'API & Testing',
    status: 'active',
    component: ApiTester
  },

  // Business Logic
  {
    id: 'dmn-evaluator',
    name: 'DMN Evaluator',
    description: 'Evaluate decision tables',
    icon: <Layers size={48} strokeWidth={1.5} />,
    iconColor: '#9B59B6', // Purple
    category: 'Business Logic',
    status: 'active',
    component: DmnEvaluator
  },
  {
    id: 'workflow-validator',
    name: 'Workflow Validator',
    description: 'Validate BPMN workflows',
    icon: <Wand2 size={48} strokeWidth={1.5} />,
    iconColor: '#1ABC9C', // Teal
    category: 'Business Logic',
    status: 'active',
    component: WorkflowValidator
  },

  // Utilities
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Scientific calculations',
    icon: <CalculatorIcon size={48} strokeWidth={1.5} />,
    iconColor: '#8E44AD', // Purple
    category: 'Utilities',
    status: 'active',
    component: Calculator
  },

  // Finance
  {
    id: 'loan-emi-calculator',
    name: 'Loan EMI Calculator',
    description: 'Calculate loan EMI & interest',
    icon: <CreditCard size={48} strokeWidth={1.5} />,
    iconColor: '#3B82F6', // Blue
    category: 'Finance',
    status: 'active',
    component: LoanEmiCalculator
  },
  {
    id: 'sip-calculator',
    name: 'SIP Calculator',
    description: 'Calculate SIP returns',
    icon: <TrendingUp size={48} strokeWidth={1.5} />,
    iconColor: '#10B981', // Green
    category: 'Finance',
    status: 'active',
    component: SipCalculator
  },
  {
    id: 'compound-interest-calculator',
    name: 'Compound Interest',
    description: 'Calculate compound interest',
    icon: <Percent size={48} strokeWidth={1.5} />,
    iconColor: '#8B5CF6', // Purple
    category: 'Finance',
    status: 'active',
    component: CompoundInterestCalculator
  },
  {
    id: 'loan-repayment-calculator',
    name: 'Loan Repayment',
    description: 'Plan loan repayment strategy',
    icon: <DollarSign size={48} strokeWidth={1.5} />,
    iconColor: '#F59E0B', // Amber
    category: 'Finance',
    status: 'active',
    component: LoanRepaymentCalculator
  },
  {
    id: 'investment-return-calculator',
    name: 'Investment Return',
    description: 'Calculate investment returns & CAGR',
    icon: <TrendingDown size={48} strokeWidth={1.5} />,
    iconColor: '#EC4899', // Pink
    category: 'Finance',
    status: 'active',
    component: InvestmentReturnCalculator
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

  // Determine current view from pathname
  const currentView = useMemo(() => getViewType(location.pathname), [location.pathname])

  // Memoize selected tool
  const selectedTool = useMemo((): Tool | null => {
    const toolId = getToolId(location.pathname)
    if (!toolId) return null
    return tools.find(t => t.id === toolId) || null
  }, [location.pathname])

  // Memoize categories - tools is a constant, so empty deps is fine
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
      const categoryTools = tools.filter(t => t.category === category)
      if (categoryTools.length === 0) continue

      sections.push(
        <section key={category} className="category-section">
          <h2 className="section-title">{category}</h2>
          <div className="tools-grid">
            {categoryTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} onClick={handleToolClick} />
            ))}
          </div>
        </section>
      )
    }
    
    return sections
  }, [categories, handleToolClick])

  return (
    <div className="app">
      <Header
        scrolled={scrolled}
        isDarkMode={isDarkMode}
        currentView={currentView}
        onNavigate={navigate}
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
