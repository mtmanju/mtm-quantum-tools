import {
  ArrowLeft,
  Binary,
  Brackets,
  Cake,
  CalendarClock,
  Clock,
  Code,
  CodeXml,
  CreditCard,
  Database as DatabaseIcon,
  DollarSign,
  Droplet,
  FileCode,
  FileCode2 as FileCodeIcon,
  FileJson,
  FileOutput,
  FileStack,
  FileType,
  FileX,
  GitBranch,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LockKeyhole,
  Mail,
  Network,
  Palette,
  Percent,
  RotateCw,
  Scissors,
  Shield,
  Sparkle,
  Table2,
  TrendingUp,
  TrendingDown,
  Type,
  Zap,
  FileSpreadsheet,
  BarChart3,
  Globe,
  Search,
  Terminal,
  X,
} from 'lucide-react'
import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Footer from './components/Footer'
import Header from './components/Header'
import { getToolId, getViewType, ROUTES } from './constants/routes'
import { useTheme } from './context/ThemeContext'
import { useScrollPosition } from './hooks/useScrollPosition'
import About from './pages/About'

// Lazy-load all tool components — each tool loads only when first navigated to
const ApiTester = lazy(() => import('./tools/ApiTester'))
const Base64Converter = lazy(() => import('./tools/Base64Converter'))
const ColorConverter = lazy(() => import('./tools/ColorConverter'))
const CssFormatter = lazy(() => import('./tools/CssFormatter'))
const CsvToJsonConverter = lazy(() => import('./tools/CsvToJsonConverter'))
const DiffChecker = lazy(() => import('./tools/DiffChecker'))
const EmailValidator = lazy(() => import('./tools/EmailValidator'))
const HashGenerator = lazy(() => import('./tools/HashGenerator'))
const HtmlEntityEncoder = lazy(() => import('./tools/HtmlEntityEncoder'))
const HtmlFormatter = lazy(() => import('./tools/HtmlFormatter'))
const JavaScriptFormatter = lazy(() => import('./tools/JavaScriptFormatter'))
const JsonFormatter = lazy(() => import('./tools/JsonFormatter'))
const JsonXmlConverter = lazy(() => import('./tools/JsonXmlConverter'))
const JwtDecoder = lazy(() => import('./tools/JwtDecoder'))
const JwtGenerator = lazy(() => import('./tools/JwtGenerator'))
const IpCidrCalculator = lazy(() => import('./tools/IpCidrCalculator'))
const LoremIpsumGenerator = lazy(() => import('./tools/LoremIpsumGenerator'))
const MarkdownConverter = lazy(() => import('./tools/MarkdownConverter'))
const NumberBaseConverter = lazy(() => import('./tools/NumberBaseConverter'))
const PasswordGenerator = lazy(() => import('./tools/PasswordGenerator'))
const PdfMerger = lazy(() => import('./tools/PdfMerger'))
const PdfPageExtractor = lazy(() => import('./tools/PdfPageExtractor'))
const PdfRotator = lazy(() => import('./tools/PdfRotator'))
const PdfSplitter = lazy(() => import('./tools/PdfSplitter'))
const PdfToImage = lazy(() => import('./tools/PdfToImage'))
const PdfWatermark = lazy(() => import('./tools/PdfWatermark'))
const RegexTester = lazy(() => import('./tools/RegexTester'))
const SlugConverter = lazy(() => import('./tools/SlugConverter'))
const SqlFormatter = lazy(() => import('./tools/SqlFormatter'))
const TextCaseConverter = lazy(() => import('./tools/TextCaseConverter'))
const TimestampConverter = lazy(() => import('./tools/TimestampConverter'))
const UrlEncoder = lazy(() => import('./tools/UrlEncoder'))
const UuidGenerator = lazy(() => import('./tools/UuidGenerator'))
const WordCounter = lazy(() => import('./tools/WordCounter'))
const XmlFormatter = lazy(() => import('./tools/XmlFormatter'))
const YamlFormatter = lazy(() => import('./tools/YamlFormatter'))
const LoanEmiCalculator = lazy(() => import('./tools/LoanEmiCalculator'))
const SipCalculator = lazy(() => import('./tools/SipCalculator'))
const CompoundInterestCalculator = lazy(() => import('./tools/CompoundInterestCalculator'))
const LoanRepaymentCalculator = lazy(() => import('./tools/LoanRepaymentCalculator'))
const InvestmentReturnCalculator = lazy(() => import('./tools/InvestmentReturnCalculator'))
const CronParser = lazy(() => import('./tools/CronParser'))
const ChmodCalculator = lazy(() => import('./tools/ChmodCalculator'))
const StringInspector = lazy(() => import('./tools/StringInspector'))
const AgeCalculator = lazy(() => import('./tools/AgeCalculator'))

interface Tool {
  id: string
  name: string
  description: string
  icon: ReactElement
  iconColor?: string
  category: string
  status: 'active' | 'coming-soon'
  component?: React.ElementType
  featured?: boolean
}


const tools: Tool[] = [
  // ─── Essential — the daily-driver tools ─────────────────────────
  { id: 'json-formatter', name: 'JSON Formatter', description: 'Beautify & validate JSON instantly',
    icon: <FileJson size={48} strokeWidth={1.5} />, iconColor: '#F39C12',
    category: 'Essential', status: 'active', component: JsonFormatter, featured: true },
  { id: 'base64-converter', name: 'Base64 Converter', description: 'Convert files & text to Base64',
    icon: <FileCode size={48} strokeWidth={1.5} />, iconColor: '#2980B9',
    category: 'Essential', status: 'active', component: Base64Converter, featured: true },
  { id: 'url-encoder', name: 'URL Encoder', description: 'Encode & decode URLs quickly',
    icon: <Globe size={48} strokeWidth={1.5} />, iconColor: '#8B5CF6',
    category: 'Essential', status: 'active', component: UrlEncoder, featured: true },
  { id: 'hash-generator', name: 'Hash Generator', description: 'Generate MD5, SHA-1, SHA-256, SHA-512',
    icon: <KeyRound size={48} strokeWidth={1.5} />, iconColor: '#EC4899',
    category: 'Essential', status: 'active', component: HashGenerator, featured: true },
  { id: 'uuid-generator', name: 'UUID Generator', description: 'Create unique identifiers',
    icon: <Hash size={48} strokeWidth={1.5} />, iconColor: '#06B6D4',
    category: 'Essential', status: 'active', component: UuidGenerator, featured: true },
  { id: 'password-generator', name: 'Password Generator', description: 'Create strong, secure passwords',
    icon: <LockKeyhole size={48} strokeWidth={1.5} />, iconColor: '#F59E0B',
    category: 'Essential', status: 'active', component: PasswordGenerator, featured: true },
  { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode & inspect JWT tokens',
    icon: <Shield size={48} strokeWidth={1.5} />, iconColor: '#27AE60',
    category: 'Essential', status: 'active', component: JwtDecoder, featured: true },
  { id: 'jwt-generator', name: 'JWT Generator', description: 'Sign & generate HS256 JWT tokens',
    icon: <KeyRound size={48} strokeWidth={1.5} />, iconColor: '#0EA5E9',
    category: 'Essential', status: 'active', component: JwtGenerator, featured: true },
  { id: 'timestamp-converter', name: 'Timestamp Converter', description: 'Convert timestamps to dates',
    icon: <CalendarClock size={48} strokeWidth={1.5} />, iconColor: '#34495E',
    category: 'Essential', status: 'active', component: TimestampConverter, featured: true },

  // ─── Code Tools — text & code manipulation ──────────────────────
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regex patterns with live highlights',
    icon: <Brackets size={48} strokeWidth={1.5} />, iconColor: '#E67E22',
    category: 'Code Tools', status: 'active', component: RegexTester },
  { id: 'diff-checker', name: 'Diff Checker', description: 'Compare code & text side-by-side',
    icon: <GitBranch size={48} strokeWidth={1.5} />, iconColor: '#16A085',
    category: 'Code Tools', status: 'active', component: DiffChecker },
  { id: 'color-converter', name: 'Color Converter', description: 'Convert HEX, RGB, HSL with contrast',
    icon: <Palette size={48} strokeWidth={1.5} />, iconColor: '#EC4899',
    category: 'Code Tools', status: 'active', component: ColorConverter },
  { id: 'text-case-converter', name: 'Case Converter', description: 'Transform text case instantly',
    icon: <Type size={48} strokeWidth={1.5} />, iconColor: '#10B981',
    category: 'Code Tools', status: 'active', component: TextCaseConverter },
  { id: 'number-base-converter', name: 'Base Converter', description: 'Convert binary, hex, decimal, octal',
    icon: <Binary size={48} strokeWidth={1.5} />, iconColor: '#8B5CF6',
    category: 'Code Tools', status: 'active', component: NumberBaseConverter },
  { id: 'slug-converter', name: 'Slug Converter', description: 'Convert text to URL-friendly slugs',
    icon: <Link2 size={48} strokeWidth={1.5} />, iconColor: '#8B5CF6',
    category: 'Code Tools', status: 'active', component: SlugConverter },
  { id: 'lorem-ipsum-generator', name: 'Lorem Generator', description: 'Generate placeholder text',
    icon: <Sparkle size={48} strokeWidth={1.5} />, iconColor: '#64748B',
    category: 'Code Tools', status: 'active', component: LoremIpsumGenerator },
  { id: 'html-entity-encoder', name: 'HTML Entity', description: 'Encode & decode HTML entities',
    icon: <Brackets size={48} strokeWidth={1.5} />, iconColor: '#EF4444',
    category: 'Code Tools', status: 'active', component: HtmlEntityEncoder },
  { id: 'email-validator', name: 'Email Validator', description: 'Validate email addresses',
    icon: <Mail size={48} strokeWidth={1.5} />, iconColor: '#06B6D4',
    category: 'Code Tools', status: 'active', component: EmailValidator },

  // ─── Formatters — code beautification & conversion ──────────────
  { id: 'javascript-formatter', name: 'JS Formatter', description: 'Format & minify JavaScript',
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />, iconColor: '#F59E0B',
    category: 'Formatters', status: 'active', component: JavaScriptFormatter },
  { id: 'html-formatter', name: 'HTML Formatter', description: 'Beautify & minify HTML',
    icon: <CodeXml size={48} strokeWidth={1.5} />, iconColor: '#EF4444',
    category: 'Formatters', status: 'active', component: HtmlFormatter },
  { id: 'css-formatter', name: 'CSS Formatter', description: 'Format & minify CSS',
    icon: <Code size={48} strokeWidth={1.5} />, iconColor: '#3B82F6',
    category: 'Formatters', status: 'active', component: CssFormatter },
  { id: 'sql-formatter', name: 'SQL Formatter', description: 'Format SQL queries beautifully',
    icon: <DatabaseIcon size={48} strokeWidth={1.5} />, iconColor: '#3498DB',
    category: 'Formatters', status: 'active', component: SqlFormatter },
  { id: 'yaml-formatter', name: 'YAML Formatter', description: 'Format & validate YAML configs',
    icon: <FileSpreadsheet size={48} strokeWidth={1.5} />, iconColor: '#6366F1',
    category: 'Formatters', status: 'active', component: YamlFormatter },
  { id: 'xml-formatter', name: 'XML Formatter', description: 'Format & validate XML docs',
    icon: <FileX size={48} strokeWidth={1.5} />, iconColor: '#F97316',
    category: 'Formatters', status: 'active', component: XmlFormatter },
  { id: 'csv-to-json', name: 'CSV ↔ JSON', description: 'Convert between CSV & JSON',
    icon: <Table2 size={48} strokeWidth={1.5} />, iconColor: '#22C55E',
    category: 'Formatters', status: 'active', component: CsvToJsonConverter },
  { id: 'json-xml-converter', name: 'JSON ↔ XML', description: 'Convert between JSON & XML',
    icon: <FileType size={48} strokeWidth={1.5} />, iconColor: '#F97316',
    category: 'Formatters', status: 'active', component: JsonXmlConverter },

  // ─── DevOps & System ────────────────────────────────────────────
  { id: 'cron-parser', name: 'Cron Parser', description: 'Parse cron & preview next 10 runs',
    icon: <Clock size={48} strokeWidth={1.5} />, iconColor: '#0891B2',
    category: 'DevOps', status: 'active', component: CronParser },
  { id: 'ip-cidr-calculator', name: 'IP / CIDR Calc', description: 'Subnet calculator for IP networks',
    icon: <Network size={48} strokeWidth={1.5} />, iconColor: '#10B981',
    category: 'DevOps', status: 'active', component: IpCidrCalculator },
  { id: 'chmod-calculator', name: 'Chmod Calculator', description: 'Visual Unix file permission calculator',
    icon: <Terminal size={48} strokeWidth={1.5} />, iconColor: '#16A34A',
    category: 'DevOps', status: 'active', component: ChmodCalculator },
  { id: 'api-tester', name: 'API Tester', description: 'Send HTTP requests & inspect responses',
    icon: <Zap size={48} strokeWidth={1.5} />, iconColor: '#F1C40F',
    category: 'DevOps', status: 'active', component: ApiTester },

  // ─── Documents & PDF ────────────────────────────────────────────
  { id: 'md-converter', name: 'MD Converter', description: 'Export Markdown to DOCX, PDF, or HTML',
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />, iconColor: '#875A7B',
    category: 'Documents', status: 'active', component: MarkdownConverter },
  { id: 'pdf-merger', name: 'PDF Merger', description: 'Merge PDFs into one file',
    icon: <FileStack size={48} strokeWidth={1.5} />, iconColor: '#E74C3C',
    category: 'Documents', status: 'active', component: PdfMerger },
  { id: 'pdf-splitter', name: 'PDF Splitter', description: 'Split PDF into individual pages',
    icon: <Scissors size={48} strokeWidth={1.5} />, iconColor: '#F59E0B',
    category: 'Documents', status: 'active', component: PdfSplitter },
  { id: 'pdf-page-extractor', name: 'PDF Extractor', description: 'Extract specific pages to new PDF',
    icon: <FileOutput size={48} strokeWidth={1.5} />, iconColor: '#8B5CF6',
    category: 'Documents', status: 'active', component: PdfPageExtractor },
  { id: 'pdf-rotator', name: 'PDF Rotator', description: 'Rotate all pages of a PDF',
    icon: <RotateCw size={48} strokeWidth={1.5} />, iconColor: '#06B6D4',
    category: 'Documents', status: 'active', component: PdfRotator },
  { id: 'pdf-to-image', name: 'PDF to Image', description: 'Convert PDF pages to PNG or JPG',
    icon: <ImageIcon size={48} strokeWidth={1.5} />, iconColor: '#10B981',
    category: 'Documents', status: 'active', component: PdfToImage },
  { id: 'pdf-watermark', name: 'PDF Watermark', description: 'Add text watermark to PDF pages',
    icon: <Droplet size={48} strokeWidth={1.5} />, iconColor: '#0EA5E9',
    category: 'Documents', status: 'active', component: PdfWatermark },
  { id: 'word-counter', name: 'Word Counter', description: 'Count words, characters & more',
    icon: <BarChart3 size={48} strokeWidth={1.5} />, iconColor: '#3B82F6',
    category: 'Documents', status: 'active', component: WordCounter },
  { id: 'string-inspector', name: 'String Inspector', description: 'Analyze Unicode, encodings & character frequency',
    icon: <Type size={48} strokeWidth={1.5} />, iconColor: '#6366F1',
    category: 'Documents', status: 'active', component: StringInspector },

  // ─── Everyday ───────────────────────────────────────────────────
  { id: 'age-calculator', name: 'Age Calculator', description: 'Calculate exact age, zodiac, next birthday',
    icon: <Cake size={48} strokeWidth={1.5} />, iconColor: '#F472B6',
    category: 'Everyday', status: 'active', component: AgeCalculator },

  // ─── Finance ────────────────────────────────────────────────────
  { id: 'loan-emi-calculator', name: 'Loan EMI Calculator', description: 'Calculate loan EMI & interest',
    icon: <CreditCard size={48} strokeWidth={1.5} />, iconColor: '#3B82F6',
    category: 'Finance', status: 'active', component: LoanEmiCalculator },
  { id: 'loan-repayment-calculator', name: 'Loan Repayment', description: 'Plan loan repayment strategy',
    icon: <DollarSign size={48} strokeWidth={1.5} />, iconColor: '#F59E0B',
    category: 'Finance', status: 'active', component: LoanRepaymentCalculator },
  { id: 'sip-calculator', name: 'SIP Calculator', description: 'Calculate SIP returns',
    icon: <TrendingUp size={48} strokeWidth={1.5} />, iconColor: '#10B981',
    category: 'Finance', status: 'active', component: SipCalculator },
  { id: 'compound-interest-calculator', name: 'Compound Interest', description: 'Calculate compound interest',
    icon: <Percent size={48} strokeWidth={1.5} />, iconColor: '#8B5CF6',
    category: 'Finance', status: 'active', component: CompoundInterestCalculator },
  { id: 'investment-return-calculator', name: 'Investment Return', description: 'Calculate investment returns & CAGR',
    icon: <TrendingDown size={48} strokeWidth={1.5} />, iconColor: '#EC4899',
    category: 'Finance', status: 'active', component: InvestmentReturnCalculator },
]

const ToolCard = memo(({ tool, onClick, showDescription }: {
  tool: Tool
  onClick: (tool: Tool) => void
  showDescription?: boolean
}) => (
  <div
    className={`tool-card ${tool.status}`}
    onClick={() => onClick(tool)}
  >
    <div className="tool-icon-wrapper" style={{ color: tool.iconColor }}>
      {tool.icon}
    </div>
    <div className="tool-info">
      <h3>{tool.name}</h3>
      {showDescription && <p className="tool-description">{tool.description}</p>}
    </div>
    {tool.status === 'coming-soon' && (
      <div className="tool-badge">
        <span>Soon</span>
      </div>
    )}
  </div>
))

ToolCard.displayName = 'ToolCard'

const ToolLoadingFallback = () => (
  <div className="tool-loading-fallback">
    <div className="tool-loading-spinner" aria-label="Loading tool..." />
  </div>
)

// Component renderer — wraps each lazy tool in Suspense
const ToolRenderer = memo(({ component: ToolComponent }: { component: React.ElementType }) => {
  if (!ToolComponent) return null
  return (
    <Suspense fallback={<ToolLoadingFallback />}>
      <ToolComponent />
    </Suspense>
  )
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

  const [searchQuery, setSearchQuery] = useState('')

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const handleToolClick = useCallback((tool: Tool) => {
    if (tool.status === 'active') {
      setSearchQuery('')
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
          <div className="page-header tools-page-header">
            <h1 className="page-title">Tools</h1>
            <div className="tools-search-bar">
              <Search size={14} className="tools-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="tools-search-input"
                placeholder={`Search ${activeCount} tools…`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search tools"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="tools-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {filteredTools !== null ? (
            filteredTools.length > 0 ? (
              <section className="category-section">
                <h2 className="section-title">
                  {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} found
                </h2>
                <div className="tools-grid">
                  {filteredTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} onClick={handleToolClick} showDescription />
                  ))}
                </div>
              </section>
            ) : (
              <div className="tools-search-empty">
                <p>No tools match <strong>"{searchQuery}"</strong></p>
              </div>
            )
          ) : categorySections}
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

            {selectedTool && selectedTool.component ? (
              <div className="tool-workspace">
                <ToolRenderer component={selectedTool.component} />
              </div>
            ) : !selectedTool && (
              <div className="tool-not-found">
                <h2>Tool not found</h2>
                <p>The requested tool doesn't exist or has been moved.</p>
                <button className="back-button" onClick={() => navigate(ROUTES.TOOLS)}>
                  <ArrowLeft size={18} />
                  <span>Browse All Tools</span>
                </button>
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
