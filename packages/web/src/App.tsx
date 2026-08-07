import {
  ArrowLeft,
  Binary,
  Brackets,
  Cake,
  Check,
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
  ShieldCheck,
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
import { SmartPaste } from './components/SmartPaste'
import { CommandPalette } from './components/ui/CommandPalette'
import { Toaster } from './components/ui/Toaster'
import { getToolId, getViewType, ROUTES } from './constants/routes'
import { useTheme } from './context/useTheme'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { useScrollPosition } from './hooks/useScrollPosition'
import { recordRecentTool } from './utils/recentTools'
import { searchTools } from './utils/search'
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

const isMacPlatform =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

/** Verifiable claims, not adjectives — each one is checkable from the page. */
const HERO_TRUST = [
  'Works offline',
  'Nothing is stored',
  'No sign-up',
  'Free forever',
] as const

export interface Tool {
  id: string
  name: string
  description: string
  /** Synonyms and abbreviations users actually type — see utils/search.ts. */
  keywords?: string[]
  icon: ReactElement
  category: string
  status: 'active' | 'coming-soon'
  component?: React.ElementType
  featured?: boolean
}


const tools: Tool[] = [
  // ─── Essential — the daily-driver tools ─────────────────────────
  { id: 'json-formatter', name: 'JSON Formatter', description: 'Beautify & validate JSON instantly',
    keywords: ['beautify', 'prettify', 'pretty print', 'minify', 'validate', 'lint', 'parse'],
    icon: <FileJson size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: JsonFormatter, featured: true },
  { id: 'base64-converter', name: 'Base64 Converter', description: 'Convert files & text to Base64',
    keywords: ['b64', 'encode', 'decode', 'atob', 'btoa', 'data uri'],
    icon: <FileCode size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: Base64Converter, featured: true },
  { id: 'url-encoder', name: 'URL Encoder', description: 'Encode & decode URLs quickly',
    keywords: ['percent encoding', 'urlencode', 'urldecode', 'escape', 'query string', 'uri'],
    icon: <Globe size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: UrlEncoder, featured: true },
  { id: 'hash-generator', name: 'Hash Generator', description: 'Generate MD5, SHA-1, SHA-256, SHA-512',
    keywords: ['sha256', 'sha1', 'sha512', 'md5', 'checksum', 'digest', 'fingerprint'],
    icon: <KeyRound size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: HashGenerator, featured: true },
  { id: 'uuid-generator', name: 'UUID Generator', description: 'Create unique identifiers',
    keywords: ['guid', 'unique id', 'v4', 'v1', 'random id'],
    icon: <Hash size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: UuidGenerator, featured: true },
  { id: 'password-generator', name: 'Password Generator', description: 'Create strong, secure passwords',
    keywords: ['passphrase', 'random', 'secure', 'credentials', 'entropy'],
    icon: <LockKeyhole size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: PasswordGenerator, featured: true },
  { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode & inspect JWT tokens',
    keywords: ['json web token', 'bearer', 'claims', 'payload', 'auth', 'token'],
    icon: <Shield size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: JwtDecoder, featured: true },
  { id: 'jwt-generator', name: 'JWT Generator', description: 'Sign & generate HS256 JWT tokens',
    keywords: ['json web token', 'sign', 'hs256', 'issue token', 'auth'],
    icon: <KeyRound size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: JwtGenerator, featured: true },
  { id: 'timestamp-converter', name: 'Timestamp Converter', description: 'Convert timestamps to dates',
    keywords: ['epoch', 'unix time', 'unix timestamp', 'date', 'iso 8601', 'utc', 'millis'],
    icon: <CalendarClock size={48} strokeWidth={1.5} />,
    category: 'Essential', status: 'active', component: TimestampConverter, featured: true },

  // ─── Code Tools — text & code manipulation ──────────────────────
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regex patterns with live highlights',
    keywords: ['regexp', 'regular expression', 'pattern', 'match', 'capture group', 'replace'],
    icon: <Brackets size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: RegexTester },
  { id: 'diff-checker', name: 'Diff Checker', description: 'Compare code & text side-by-side',
    keywords: ['compare', 'difference', 'patch', 'merge', 'side by side', 'changes'],
    icon: <GitBranch size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: DiffChecker },
  { id: 'color-converter', name: 'Color Converter', description: 'Convert HEX, RGB, HSL with contrast',
    keywords: ['colour', 'hex', 'rgb', 'hsl', 'contrast', 'wcag', 'palette'],
    icon: <Palette size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: ColorConverter },
  { id: 'text-case-converter', name: 'Case Converter', description: 'Transform text case instantly',
    keywords: ['camelcase', 'snake case', 'kebab case', 'pascal case', 'uppercase', 'lowercase', 'title case'],
    icon: <Type size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: TextCaseConverter },
  { id: 'number-base-converter', name: 'Base Converter', description: 'Convert binary, hex, decimal, octal',
    keywords: ['binary', 'hexadecimal', 'octal', 'decimal', 'radix', 'bitwise'],
    icon: <Binary size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: NumberBaseConverter },
  { id: 'slug-converter', name: 'Slug Converter', description: 'Convert text to URL-friendly slugs',
    keywords: ['slugify', 'url friendly', 'permalink', 'seo'],
    icon: <Link2 size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: SlugConverter },
  { id: 'lorem-ipsum-generator', name: 'Lorem Generator', description: 'Generate placeholder text',
    keywords: ['placeholder text', 'dummy text', 'filler', 'sample text'],
    icon: <Sparkle size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: LoremIpsumGenerator },
  { id: 'html-entity-encoder', name: 'HTML Entity', description: 'Encode & decode HTML entities',
    keywords: ['escape html', 'unescape', 'ampersand', 'special characters', 'htmlspecialchars'],
    icon: <Brackets size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: HtmlEntityEncoder },
  { id: 'email-validator', name: 'Email Validator', description: 'Validate email addresses',
    keywords: ['verify email', 'check email', 'mx', 'address'],
    icon: <Mail size={48} strokeWidth={1.5} />,
    category: 'Code Tools', status: 'active', component: EmailValidator },

  // ─── Formatters — code beautification & conversion ──────────────
  { id: 'javascript-formatter', name: 'JS Formatter', description: 'Format & minify JavaScript',
    keywords: ['beautify', 'prettify', 'minify', 'js', 'uglify', 'ecmascript'],
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: JavaScriptFormatter },
  { id: 'html-formatter', name: 'HTML Formatter', description: 'Beautify & minify HTML',
    keywords: ['beautify', 'prettify', 'minify', 'markup', 'indent'],
    icon: <CodeXml size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: HtmlFormatter },
  { id: 'css-formatter', name: 'CSS Formatter', description: 'Format & minify CSS',
    keywords: ['beautify', 'prettify', 'minify', 'stylesheet', 'styles'],
    icon: <Code size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: CssFormatter },
  { id: 'sql-formatter', name: 'SQL Formatter', description: 'Format SQL queries beautifully',
    keywords: ['beautify', 'prettify', 'query', 'select', 'database', 'indent'],
    icon: <DatabaseIcon size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: SqlFormatter },
  { id: 'yaml-formatter', name: 'YAML Formatter', description: 'Format & validate YAML configs',
    keywords: ['beautify', 'prettify', 'yml', 'validate', 'config'],
    icon: <FileSpreadsheet size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: YamlFormatter },
  { id: 'xml-formatter', name: 'XML Formatter', description: 'Format & validate XML docs',
    keywords: ['beautify', 'prettify', 'validate', 'indent', 'markup'],
    icon: <FileX size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: XmlFormatter },
  { id: 'csv-to-json', name: 'CSV ↔ JSON', description: 'Convert between CSV & JSON',
    keywords: ['spreadsheet', 'tabular', 'excel', 'delimiter', 'convert'],
    icon: <Table2 size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: CsvToJsonConverter },
  { id: 'json-xml-converter', name: 'JSON ↔ XML', description: 'Convert between JSON & XML',
    keywords: ['convert', 'transform', 'serialize'],
    icon: <FileType size={48} strokeWidth={1.5} />,
    category: 'Formatters', status: 'active', component: JsonXmlConverter },

  // ─── DevOps & System ────────────────────────────────────────────
  { id: 'cron-parser', name: 'Cron Parser', description: 'Parse cron & preview next 10 runs',
    keywords: ['crontab', 'cronjob', 'schedule', 'scheduler', 'next run', 'expression'],
    icon: <Clock size={48} strokeWidth={1.5} />,
    category: 'DevOps', status: 'active', component: CronParser },
  { id: 'ip-cidr-calculator', name: 'IP / CIDR Calc', description: 'Subnet calculator for IP networks',
    keywords: ['subnet', 'netmask', 'network', 'vlsm', 'ipv4', 'range', 'broadcast'],
    icon: <Network size={48} strokeWidth={1.5} />,
    category: 'DevOps', status: 'active', component: IpCidrCalculator },
  { id: 'chmod-calculator', name: 'Chmod Calculator', description: 'Visual Unix file permission calculator',
    keywords: ['permissions', 'octal', 'unix', 'file mode', 'chown', '755', '644'],
    icon: <Terminal size={48} strokeWidth={1.5} />,
    category: 'DevOps', status: 'active', component: ChmodCalculator },
  { id: 'api-tester', name: 'API Tester', description: 'Send HTTP requests & inspect responses',
    keywords: ['http client', 'rest', 'postman', 'curl', 'request', 'endpoint', 'fetch'],
    icon: <Zap size={48} strokeWidth={1.5} />,
    category: 'DevOps', status: 'active', component: ApiTester },

  // ─── Documents & PDF ────────────────────────────────────────────
  { id: 'md-converter', name: 'MD Converter', description: 'Export Markdown to DOCX, PDF, or HTML',
    keywords: ['markdown', 'docx', 'word', 'pdf', 'html', 'export', 'mermaid'],
    icon: <FileCodeIcon size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: MarkdownConverter },
  { id: 'pdf-merger', name: 'PDF Merger', description: 'Merge PDFs into one file',
    keywords: ['combine pdf', 'join pdf', 'concat', 'merge documents'],
    icon: <FileStack size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfMerger },
  { id: 'pdf-splitter', name: 'PDF Splitter', description: 'Split PDF into individual pages',
    keywords: ['split pdf', 'separate pages', 'divide', 'burst'],
    icon: <Scissors size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfSplitter },
  { id: 'pdf-page-extractor', name: 'PDF Extractor', description: 'Extract specific pages to new PDF',
    keywords: ['extract pages', 'select pages', 'pick pages', 'subset'],
    icon: <FileOutput size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfPageExtractor },
  { id: 'pdf-rotator', name: 'PDF Rotator', description: 'Rotate all pages of a PDF',
    keywords: ['rotate pdf', 'turn pages', 'orientation', 'landscape', 'portrait'],
    icon: <RotateCw size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfRotator },
  { id: 'pdf-to-image', name: 'PDF to Image', description: 'Convert PDF pages to PNG or JPG',
    keywords: ['pdf to png', 'pdf to jpg', 'convert pdf', 'render pages', 'screenshot'],
    icon: <ImageIcon size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfToImage },
  { id: 'pdf-watermark', name: 'PDF Watermark', description: 'Add text watermark to PDF pages',
    keywords: ['stamp', 'overlay', 'brand pdf', 'confidential'],
    icon: <Droplet size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: PdfWatermark },
  { id: 'word-counter', name: 'Word Counter', description: 'Count words, characters & more',
    keywords: ['character count', 'reading time', 'text statistics', 'letters', 'paragraphs'],
    icon: <BarChart3 size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: WordCounter },
  { id: 'string-inspector', name: 'String Inspector', description: 'Analyze Unicode, encodings & character frequency',
    keywords: ['unicode', 'code points', 'encoding', 'utf8', 'character frequency', 'bytes'],
    icon: <Type size={48} strokeWidth={1.5} />,
    category: 'Documents', status: 'active', component: StringInspector },

  // ─── Everyday ───────────────────────────────────────────────────
  { id: 'age-calculator', name: 'Age Calculator', description: 'Calculate exact age, zodiac, next birthday',
    keywords: ['birthday', 'date of birth', 'dob', 'how old', 'zodiac', 'days between'],
    icon: <Cake size={48} strokeWidth={1.5} />,
    category: 'Everyday', status: 'active', component: AgeCalculator },

  // ─── Finance ────────────────────────────────────────────────────
  { id: 'loan-emi-calculator', name: 'Loan EMI Calculator', description: 'Calculate loan EMI & interest',
    keywords: ['mortgage', 'monthly payment', 'installment', 'interest', 'borrow'],
    icon: <CreditCard size={48} strokeWidth={1.5} />,
    category: 'Finance', status: 'active', component: LoanEmiCalculator },
  { id: 'loan-repayment-calculator', name: 'Loan Repayment', description: 'Plan loan repayment strategy',
    keywords: ['amortization', 'schedule', 'payoff', 'prepayment', 'extra payment'],
    icon: <DollarSign size={48} strokeWidth={1.5} />,
    category: 'Finance', status: 'active', component: LoanRepaymentCalculator },
  { id: 'sip-calculator', name: 'SIP Calculator', description: 'Calculate SIP returns',
    keywords: ['systematic investment', 'mutual fund', 'monthly investment', 'returns'],
    icon: <TrendingUp size={48} strokeWidth={1.5} />,
    category: 'Finance', status: 'active', component: SipCalculator },
  { id: 'compound-interest-calculator', name: 'Compound Interest', description: 'Calculate compound interest',
    keywords: ['compounding', 'growth', 'savings', 'future value'],
    icon: <Percent size={48} strokeWidth={1.5} />,
    category: 'Finance', status: 'active', component: CompoundInterestCalculator },
  { id: 'investment-return-calculator', name: 'Investment Return', description: 'Calculate investment returns & CAGR',
    keywords: ['cagr', 'roi', 'annualized return', 'profit', 'gains'],
    icon: <TrendingDown size={48} strokeWidth={1.5} />,
    category: 'Finance', status: 'active', component: InvestmentReturnCalculator },
]

const ToolCard = memo(({ tool, onClick, showDescription }: {
  tool: Tool
  onClick: (tool: Tool) => void
  showDescription?: boolean
}) => (
  // A real <button>, not a click-handling <div> — otherwise search results are
  // completely unreachable by keyboard (WCAG 2.1.1).
  <button
    type="button"
    className={`tool-card ${tool.status}`}
    onClick={() => onClick(tool)}
    disabled={tool.status !== 'active'}
    aria-label={`${tool.name}: ${tool.description}`}
  >
    <span className="tool-icon-wrapper" aria-hidden="true">
      {tool.icon}
    </span>
    <span className="tool-info">
      <span className="tool-card-name">{tool.name}</span>
      {showDescription && <span className="tool-description">{tool.description}</span>}
    </span>
    {tool.status === 'coming-soon' && (
      <span className="tool-badge">
        <span>Soon</span>
      </span>
    )}
  </button>
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

  /**
   * Largest category first. The browse grid is a plain CSS grid, so its
   * bottom edge is only as ragged as the ordering makes it: declaration order
   * put a 4-tool card next to a 9-tool card in row one and stranded the two
   * smallest categories on a row of their own. Sorted by size, row one is
   * four cards of near-equal height and the only gap is the trailing slot.
   */
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tool of tools) counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1)
    return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!)
  }, [])

  // Memoize active count
  const activeCount = useMemo(() => 
    tools.filter(t => t.status === 'active').length, 
    []
  )

  const [searchQuery, setSearchQuery] = useState('')

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return null
    return searchTools(tools, searchQuery)
  }, [searchQuery])

  const openTool = useCallback((toolId: string) => {
    recordRecentTool(toolId)
    setSearchQuery('')
    navigate(ROUTES.TOOL(toolId))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  const handleToolClick = useCallback((tool: Tool) => {
    if (tool.status === 'active') openTool(tool.id)
  }, [openTool])

  /**
   * Hand a pasted value to a tool. sessionStorage rather than the URL: the
   * value can be large and is frequently sensitive, and putting it in the
   * address bar would leak it into history and any future referrer.
   */
  const openToolWithValue = useCallback((toolId: string, value: string) => {
    try {
      sessionStorage.setItem(`qt-handoff:${toolId}`, value)
    } catch {
      /* private mode — the tool simply opens empty */
    }
    openTool(toolId)
  }, [openTool])

  // All categories rendered side-by-side as glass cards with compact tool rows
  const categoryCards = useMemo(() => {
    const cards: ReactNode[] = []

    for (const category of categories) {
      const categoryTools = tools.filter(t => t.category === category)
      if (categoryTools.length === 0) continue

      cards.push(
        <div key={category} className="category-card">
          <div className="category-card-header">
            {/* A real <h2> so screen-reader users can navigate the 45 tools by
                heading instead of tabbing through every row. */}
            <h3 className="category-card-title">{category}</h3>
            <span className="category-card-count">
              <span className="visually-hidden">{categoryTools.length} tools</span>
              <span aria-hidden="true">{categoryTools.length}</span>
            </span>
          </div>
          <div className="category-card-tools">
            {categoryTools.map(tool => (
              <button
                key={tool.id}
                type="button"
                className="tool-row"
                onClick={() => handleToolClick(tool)}
                disabled={tool.status !== 'active'}
                title={tool.description}
              >
                <span className="tool-row-icon">
                  {tool.icon}
                </span>
                <span className="tool-row-name">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }

    return <div className="categories-grid">{cards}</div>
  }, [categories, handleToolClick])

  // Per-route title/description/canonical/OG.
  useDocumentMeta(
    currentView === 'tool' && selectedTool
      ? { title: selectedTool.name, description: `${selectedTool.description}. Free, instant, and runs entirely in your browser. Nothing is uploaded.` }
      : currentView === 'about'
        ? { title: 'About' }
        : {}
  )

  return (
    <div className="app">
      {/* Keyboard users would otherwise traverse ~48 controls before reaching
          content on the tools index (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Header
        scrolled={scrolled}
        isDarkMode={isDarkMode}
        currentView={currentView}
        onNavigate={navigate}
        onToggleTheme={toggleTheme}
      />

      {currentView === 'about' ? (
        <main id="main-content" className="main-content">
          {/* No "About" page-header here: the About hero already carries the
              page's <h1>, and two <h1>s on one page is both a heading-order
              defect and a redundant title stacked on a headline. */}
          <About
            totalTools={tools.length}
            activeTools={activeCount}
            totalCategories={categories.length}
          />
        </main>
      ) : currentView === 'tools' ? (
        <main id="main-content" className="main-content tools-page">
          {/* The claim first, then the thing that acts on it. A grid of 45
              icons makes the visitor do the classification work; this states
              what the product is for and lets them use it immediately. */}
          <section className="home-hero">
            <p className="home-hero-eyebrow">
              <ShieldCheck aria-hidden="true" />
              No upload · No account · No server
            </p>
            <h1 className="home-hero-title">
              Developer tools that never see your data
            </h1>
            <p className="home-hero-sub">
              {activeCount} utilities that run entirely in your browser. Safe for the
              tokens and payloads you are not allowed to paste into a website.
            </p>

            <SmartPaste onOpenTool={openToolWithValue} />

            {/* Four facts a sceptical reader can check in about ten seconds,
                which persuades where a row of adjectives would not. */}
            <ul className="home-hero-trust">
              {HERO_TRUST.map(claim => (
                <li key={claim}>
                  <Check aria-hidden="true" />
                  {claim}
                </li>
              ))}
            </ul>
          </section>

          <div className="home-browse-header">
            <div className="home-browse-heading">
              <span className="home-browse-eyebrow">{categories.length} categories</span>
              <h2 className="home-browse-title">All {activeCount} tools</h2>
            </div>
            <div className="tools-search-bar">
              <Search size={14} className="tools-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="tools-search-input"
                placeholder="Search tools…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search tools"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="tools-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="tools-search-kbd" aria-hidden="true">
                  {isMacPlatform ? '⌘' : 'Ctrl'} K
                </kbd>
              )}
            </div>
          </div>

          {/* Announces result counts as the user types. */}
          <div role="status" aria-live="polite" className="visually-hidden">
            {filteredTools !== null
              ? `${filteredTools.length} tool${filteredTools.length !== 1 ? 's' : ''} found for ${searchQuery}`
              : ''}
          </div>

          {filteredTools !== null ? (
            filteredTools.length > 0 ? (
              <section className="category-section">
                <h3 className="section-title">
                  {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} found
                </h3>
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
          ) : categoryCards}
        </main>
      ) : (
        <main id="main-content" className="main-content tool-view">
          <div className="tool-view-wrapper">
            {/* One row, not three. A tool page is a workspace: the title is
                orientation, not the message, and the stacked back-row +
                display-size title + description block was spending 124px of
                a 900px viewport before the tool got a single pixel. */}
            <div className="tool-header">
              <button
                className="back-button"
                onClick={() => navigate(ROUTES.TOOLS)}
                aria-label="Back to all tools"
              >
                <ArrowLeft size={16} />
                <span>All tools</span>
              </button>

              {selectedTool && (
                <>
                  <span className="tool-header-divider" aria-hidden="true" />
                  <span className="tool-header-icon" aria-hidden="true">
                    {selectedTool.icon}
                  </span>
                  <h1 className="page-title">{selectedTool.name}</h1>
                  <p className="tool-header-desc">{selectedTool.description}</p>
                  <span className="tool-header-category">{selectedTool.category}</span>
                </>
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

      <CommandPalette tools={tools} onSelect={openTool} />
      <Toaster />
    </div>
  )
}

export default App
