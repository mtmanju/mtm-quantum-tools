import {
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  AlertCircle,
  Check,
  Code,
  Copy,
  Download,
  Eye,
  FileCode,
  FileText,
  Printer,
  Save,
  Upload,
  WrapText,
  X,
} from 'lucide-react'
import MarkdownIt from 'markdown-it'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { downloadBinaryFile, downloadTextFile } from '../utils/file'
import { useCopy } from '../hooks/useCopy'
import { useHandoff } from '../hooks/useHandoff'
import './MarkdownConverter.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const AUTO_SAVE_KEY = 'mtm-md-converter-draft'
const AUTO_SAVE_DELAY_MS = 2000
const CONVERSION_TIMEOUT_MS = 120_000

// ─── Markdown Parser (html: false prevents XSS from raw HTML in .md files) ────

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true })

// ─── Mermaid Singleton ─────────────────────────────────────────────────────────

/**
 * The slice of mermaid's API this file uses.
 *
 * mermaid is loaded through a dynamic import and ships no types we can rely
 * on here, so rather than `any` we describe exactly what we call — which is
 * all of two methods.
 */
interface MermaidApi {
  initialize(config: Record<string, unknown>): void
  render(id: string, code: string): Promise<{ svg: string }>
}

let _mermaidInstance: MermaidApi | null = null
let _mermaidInitPromise: Promise<MermaidApi> | null = null
let _previewDiagramCounter = 0

async function getMermaid(): Promise<MermaidApi> {
  if (_mermaidInstance) return _mermaidInstance
  if (_mermaidInitPromise) return _mermaidInitPromise
  _mermaidInitPromise = import('mermaid').then(m => {
    _mermaidInstance = m.default as unknown as MermaidApi
    _mermaidInstance.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict', fontFamily: 'Arial', logLevel: 'error' })
    _mermaidInitPromise = null
    return _mermaidInstance
  }).catch(e => {
    _mermaidInitPromise = null
    throw e
  })
  return _mermaidInitPromise
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = 'source' | 'split' | 'preview'
type AutoSaveStatus = 'idle' | 'saving' | 'saved'

type ContentItem =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'codeBlock'; language: string; code: string }
  | { type: 'mermaid'; code: string; index: number }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'listItem'; text: string; ordered: boolean }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'empty' }

// ─── Inline Text Parser ────────────────────────────────────────────────────────

// Matches: **bold**, *italic*, `code`, ~~strike~~, [link](url), plain text
const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|~~([^~]+)~~|\[([^\]]+)\]\([^)]+\)|([^*`~[\]]+)/g

function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  let match: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match[1] !== undefined) runs.push(new TextRun({ text: match[1], bold: true }))
    else if (match[2] !== undefined) runs.push(new TextRun({ text: match[2], italics: true }))
    else if (match[3] !== undefined) runs.push(new TextRun({ text: match[3], font: 'Courier New', size: 20 }))
    else if (match[4] !== undefined) runs.push(new TextRun({ text: match[4], strike: true }))
    else if (match[5] !== undefined) runs.push(new TextRun({ text: match[5] })) // link text only
    else if (match[6]) runs.push(new TextRun({ text: match[6] }))
  }
  return runs.length ? runs : [new TextRun({ text })]
}

// ─── Markdown → Content Plan Parser ───────────────────────────────────────────

const TABLE_SEPARATOR_RE = /^\|[\s\-:|]+\|$/

function parseMarkdownContent(markdown: string): ContentItem[] {
  const lines = markdown.split('\n')
  const items: ContentItem[] = []
  let i = 0
  let mermaidIndex = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── Fenced code / mermaid blocks ────────────────────────────────────────
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim().toLowerCase()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      const code = codeLines.join('\n')
      items.push(lang === 'mermaid'
        ? { type: 'mermaid', code, index: mermaidIndex++ }
        : { type: 'codeBlock', language: lang, code })
      continue
    }

    // ── Tables ───────────────────────────────────────────────────────────────
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const headers = trimmed.split('|').map(c => c.trim()).filter(Boolean)
      const rows: string[][] = []
      i++
      if (i < lines.length && TABLE_SEPARATOR_RE.test(lines[i].trim())) i++ // skip separator
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t.startsWith('|') || !t.endsWith('|')) break
        if (!TABLE_SEPARATOR_RE.test(t)) rows.push(t.split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      items.push({ type: 'table', headers, rows })
      continue
    }

    // ── Headings ─────────────────────────────────────────────────────────────
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      items.push({ type: 'heading', level: Math.min(4, headingMatch[1].length) as 1 | 2 | 3 | 4, text: headingMatch[2] })
      i++; continue
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { items.push({ type: 'hr' }); i++; continue }

    // ── Blockquote ───────────────────────────────────────────────────────────
    if (trimmed.startsWith('> ')) { items.push({ type: 'blockquote', text: trimmed.slice(2) }); i++; continue }

    // ── Unordered list ───────────────────────────────────────────────────────
    if (/^[-*+]\s/.test(trimmed)) {
      items.push({ type: 'listItem', text: trimmed.replace(/^[-*+]\s+/, ''), ordered: false })
      i++; continue
    }

    // ── Ordered list ─────────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(trimmed)) {
      items.push({ type: 'listItem', text: trimmed.replace(/^\d+\.\s+/, ''), ordered: true })
      i++; continue
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (!trimmed) { items.push({ type: 'empty' }); i++; continue }

    // ── Paragraph ────────────────────────────────────────────────────────────
    items.push({ type: 'paragraph', text: trimmed })
    i++
  }

  return items
}

// ─── Mermaid → PNG ─────────────────────────────────────────────────────────────

async function renderMermaidToImage(
  code: string,
  index: number
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const m = await getMermaid()
    const id = `mermaid-export-${index}-${Date.now()}`
    const { svg } = await m.render(id, code)

    const svgDoc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const svgEl = svgDoc.documentElement

    let w = 800, h = 600
    const vb = svgEl.getAttribute('viewBox')
    if (vb) {
      const parts = vb.split(/[\s,]+/)
      w = Math.ceil(parseFloat(parts[2])) || 800
      h = Math.ceil(parseFloat(parts[3])) || 600
    }

    // Scale: ensure minimum size, cap maximum
    if (w < 400 || h < 300) {
      const scale = Math.max(400 / w, 300 / h, 2)
      w = Math.ceil(w * scale); h = Math.ceil(h * scale)
    }
    if (w > 1200 || h > 1000) {
      const scale = Math.min(1200 / w, 1000 / h)
      w = Math.ceil(w * scale); h = Math.ceil(h * scale)
    }

    const svgString = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return null

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        canvas.toBlob(pngBlob => {
          if (!pngBlob) { reject(new Error('Canvas blob failed')); return }
          const reader = new FileReader()
          reader.onload = () => resolve({ data: new Uint8Array(reader.result as ArrayBuffer), width: w, height: h })
          reader.onerror = () => reject(new Error('FileReader failed'))
          reader.readAsArrayBuffer(pngBlob)
        }, 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
      img.src = url
    })
  } catch {
    return null
  }
}

// ─── Markdown → DOCX ──────────────────────────────────────────────────────────

const HEADING_LEVELS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
} as const

async function buildDocxBlob(
  markdown: string,
  onProgress: (msg: string) => void
): Promise<Blob> {
  onProgress('Parsing markdown...')
  const items = parseMarkdownContent(markdown)

  // Pre-render all mermaid diagrams in parallel
  const mermaidItems = items.filter((it): it is Extract<ContentItem, { type: 'mermaid' }> => it.type === 'mermaid')
  const mermaidImages = new Map<number, { data: Uint8Array; width: number; height: number } | null>()

  if (mermaidItems.length > 0) {
    onProgress(`Rendering ${mermaidItems.length} diagram(s)...`)
    const results = await Promise.all(mermaidItems.map(it => renderMermaidToImage(it.code, it.index).catch(() => null)))
    results.forEach((r, i) => mermaidImages.set(mermaidItems[i].index, r))
  }

  onProgress('Building document...')
  const children: (Paragraph | Table)[] = []

  for (const item of items) {
    switch (item.type) {
      case 'heading':
        children.push(new Paragraph({ text: item.text, heading: HEADING_LEVELS[item.level], spacing: { before: 240, after: 120 } }))
        break

      case 'paragraph':
        children.push(new Paragraph({ children: parseInlineRuns(item.text), spacing: { after: 120 } }))
        break

      case 'codeBlock': {
        const codeLines = item.code.split('\n')
        codeLines.forEach(codeLine => {
          children.push(new Paragraph({
            children: [new TextRun({ text: codeLine || '\u200B', font: 'Courier New', size: 18 })],
            spacing: { after: 0 },
          }))
        })
        children.push(new Paragraph({ spacing: { after: 160 } }))
        break
      }

      case 'mermaid': {
        const img = mermaidImages.get(item.index)
        if (img) {
          const targetW = Math.min(img.width * 0.75, 600)
          const targetH = img.height * (targetW / img.width)
          children.push(new Paragraph({
            children: [new ImageRun({
              data: img.data,
              transformation: { width: targetW, height: targetH },
              // `type` is required at runtime but missing from docx's typings.
              type: 'png',
            } as ConstructorParameters<typeof ImageRun>[0])],
            spacing: { before: 120, after: 120 },
          }))
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: '[Mermaid diagram could not be rendered]', italics: true })],
            spacing: { after: 120 },
          }))
        }
        break
      }

      case 'table': {
        if (!item.headers.length) break
        const colW = Math.floor(100 / item.headers.length)
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: item.headers.map(h =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], width: { size: colW, type: WidthType.PERCENTAGE } })
              ),
            }),
            ...item.rows.map(row =>
              new TableRow({
                children: row.map(cell =>
                  new TableCell({ children: [new Paragraph({ children: parseInlineRuns(cell) })], width: { size: colW, type: WidthType.PERCENTAGE } })
                ),
              })
            ),
          ],
        }))
        children.push(new Paragraph({ spacing: { after: 120 } }))
        break
      }

      case 'listItem':
        children.push(new Paragraph({ children: parseInlineRuns(item.text), bullet: { level: 0 }, spacing: { after: 60 } }))
        break

      case 'blockquote':
        children.push(new Paragraph({
          children: [new TextRun({ text: item.text, italics: true })],
          indent: { left: 720 },
          border: { left: { color: '6366F1', size: 16, style: BorderStyle.SINGLE } },
          spacing: { after: 120 },
        }))
        break

      case 'hr':
        children.push(new Paragraph({
          border: { bottom: { color: 'CCCCCC', size: 6, style: BorderStyle.SINGLE } },
          spacing: { before: 120, after: 120 },
        }))
        break

      case 'empty':
        break // Natural spacing from surrounding elements
    }
  }

  onProgress('Generating DOCX...')
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
  })

  const blobPromise = Packer.toBlob(doc)
  const timeoutPromise = new Promise<Blob>((_, reject) =>
    setTimeout(() => reject(new Error('Conversion timed out. Try splitting the file.')), CONVERSION_TIMEOUT_MS)
  )
  return Promise.race([blobPromise, timeoutPromise])
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function computeStats(markdown: string) {
  const text = markdown.trim()
  if (!text) return null
  const words = text.split(/\s+/).filter(Boolean).length
  return { words, chars: text.length, lines: markdown.split('\n').length, readTime: Math.max(1, Math.ceil(words / 200)) }
}

// Strip event handlers and script elements from mermaid SVG output before DOM injection
function sanitizeSvg(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.querySelector('parsererror')) return ''
  doc.querySelectorAll('script').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
    })
    const href = el.getAttribute('href') ?? el.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
    if (href?.trim().toLowerCase().startsWith('javascript:')) {
      el.removeAttribute('href')
      el.removeAttributeNS('http://www.w3.org/1999/xlink', 'href')
    }
  })
  return new XMLSerializer().serializeToString(doc.documentElement)
}

/**
 * Cache of rendered diagrams, keyed by the diagram source.
 *
 * Diagrams are rendered once and then substituted into the preview HTML
 * string, so React owns the resulting DOM. An earlier implementation rendered
 * asynchronously and then mutated the placeholder node directly — but React
 * re-creates the preview subtree on unrelated state changes (autosave status,
 * for one), so by the time mermaid resolved the captured node was detached and
 * the SVG was written to an orphan. The diagram silently never appeared.
 */
const _diagramCache = new Map<string, { ok: true; svg: string } | { ok: false; error: string }>()

/** Render every uncached diagram in `codes`. Resolves once the cache is populated. */
async function renderDiagramsToCache(codes: string[]): Promise<void> {
  const pending = codes.filter(c => !_diagramCache.has(c))
  if (!pending.length) return

  let m: { render: (id: string, code: string) => Promise<{ svg: string }> }
  try {
    m = await getMermaid()
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to load the diagram renderer'
    pending.forEach(c => _diagramCache.set(c, { ok: false, error }))
    return
  }

  await Promise.all(
    pending.map(async code => {
      try {
        const id = `mermaid-preview-${_previewDiagramCounter++}`
        const { svg } = await m.render(id, code)
        const safe = sanitizeSvg(svg)
        _diagramCache.set(
          code,
          safe
            ? { ok: true, svg: safe }
            : { ok: false, error: 'Diagram output could not be safely displayed' }
        )
      } catch (err) {
        _diagramCache.set(code, {
          ok: false,
          error: err instanceof Error ? err.message : 'Invalid diagram syntax',
        })
      }
    })
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const MarkdownConverter = () => {
  const [markdownContent, setMarkdownContent] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('md-converter', setMarkdownContent)
  const [fileName, setFileName] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState('')
  const [error, setError] = useState('')
  const { copy: copyToolbar } = useCopy()
  const { copied: copiedPanel, copy: copyPanel } = useCopy()
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [wordWrap, setWordWrap] = useState(true)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [splitRatio, setSplitRatio] = useState(50) // left panel % in split mode

  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorLayoutRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived state ────────────────────────────────────────────────────────────

  /**
   * Diagrams that have finished rendering, as state rather than a version
   * counter — so the memo below has a real dependency instead of one the
   * linter can see through. The module-level cache still dedupes the async
   * work across mounts; this is the render-visible view of it.
   */
  const [renderedDiagrams, setRenderedDiagrams] = useState<typeof _diagramCache>(new Map())

  /** Diagram sources found in the current document, in order. */
  const diagramCodes = useMemo(() => {
    if (!markdownContent.trim()) return [] as string[]
    const codes: string[] = []
    const fence = /^[ \t]*```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm
    let match: RegExpExecArray | null
    while ((match = fence.exec(markdownContent)) !== null) {
      const code = match[1].trim()
      if (code) codes.push(code)
    }
    return codes
  }, [markdownContent])

  const htmlPreview = useMemo(() => {
    if (!markdownContent.trim()) return ''
    try {
      const html = md.render(markdownContent)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      let idx = 0
      doc.querySelectorAll('pre code.language-mermaid').forEach(block => {
        const code = block.textContent?.trim()
        if (!code) return
        const pre = block.parentElement
        if (!pre) return

        const div = doc.createElement('div')
        div.className = 'mermaid-diagram'
        div.setAttribute('data-mermaid-code', encodeURIComponent(code))
        div.setAttribute('data-mermaid-index', String(idx++))

        // Substitute the rendered diagram inline so React owns it. Anything
        // still uncached keeps the placeholder and its "rendering" affordance
        // until the effect below populates the cache.
        const cached = renderedDiagrams.get(code) ?? _diagramCache.get(code)
        if (cached?.ok) {
          div.classList.add('is-rendered')
          div.innerHTML = `<div class="mermaid-preview">${cached.svg}</div>`
        } else if (cached && !cached.ok) {
          div.classList.add('is-error')
          const errDiv = doc.createElement('div')
          errDiv.className = 'mermaid-error'
          errDiv.textContent = `Diagram error: ${cached.error}`
          div.replaceChildren(errDiv)
        }
        pre.replaceWith(div)
      })
      return doc.body.innerHTML
    } catch {
      return '<p>Error rendering preview</p>'
    }
  }, [markdownContent, renderedDiagrams])

  const documentStats = useMemo(() => computeStats(markdownContent), [markdownContent])

  const leftPanelStyle = useMemo((): React.CSSProperties =>
    viewMode === 'split' ? { flexBasis: `${splitRatio}%`, flexGrow: 0, flexShrink: 0 } : {}
    , [viewMode, splitRatio])

  // ── Load draft on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY)
      if (saved) {
        const { content, name } = JSON.parse(saved)
        if (content) { setMarkdownContent(content); if (name) setFileName(name) }
      }
    } catch { /* ignore malformed draft */ }
  }, [])

  // ── Auto-save ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!markdownContent) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saving')
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ content: markdownContent, name: fileName }))
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch { setAutoSaveStatus('idle') }
    }, AUTO_SAVE_DELAY_MS)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [markdownContent, fileName])

  // ── Mermaid preview rendering ────────────────────────────────────────────────

  useEffect(() => {
    const uncached = diagramCodes.filter(c => !_diagramCache.has(c))
    if (!uncached.length) return
    let cancelled = false
    renderDiagramsToCache(uncached).then(() => {
      // Publish the cache so the memo above re-runs and paints the diagrams.
      if (!cancelled) setRenderedDiagrams(new Map(_diagramCache))
    })
    return () => { cancelled = true }
  }, [diagramCodes])

  // ── File loading ─────────────────────────────────────────────────────────────

  const loadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large — max ${MAX_FILE_SIZE / 1024 / 1024}MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      return
    }
    try {
      const text = await readFileAsText(file)
      setMarkdownContent(text)
      setFileName(file.name.replace(/\.(md|markdown)$/i, ''))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }, [])

  const onDrop = useCallback((files: File[]) => { if (files[0]) loadFile(files[0]) }, [loadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/markdown': ['.md', '.markdown'] }, multiple: false, noClick: true,
  })

  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }, [loadFile])

  // ── Clear ─────────────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setMarkdownContent(''); setFileName(''); setError('')
    try { localStorage.removeItem(AUTO_SAVE_KEY) } catch { /* ignore */ }
  }, [])

  // ── Export DOCX ──────────────────────────────────────────────────────────────

  const handleExportDocx = useCallback(async () => {
    if (!markdownContent.trim() || isConverting) return
    setIsConverting(true); setError('')
    try {
      const blob = await buildDocxBlob(markdownContent, setConversionProgress)
      setConversionProgress('Downloading...')
      downloadBinaryFile(blob, `${fileName || 'document'}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      setConversionProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setConversionProgress('')
    } finally {
      setIsConverting(false)
    }
  }, [markdownContent, fileName, isConverting])

  // ── Export HTML ───────────────────────────────────────────────────────────────

  const handleExportHtml = useCallback(() => {
    if (!htmlPreview) return
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName || 'document'}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.7}
    h1,h2,h3,h4{font-weight:600;margin-top:2rem;margin-bottom:.75rem}
    h1{font-size:2rem;border-bottom:2px solid #e5e7eb;padding-bottom:.5rem}h2{font-size:1.5rem}h3{font-size:1.25rem}
    code{background:#f4f4f5;padding:.2em .4em;border-radius:4px;font-family:monospace;font-size:.9em}
    pre{background:#f4f4f5;padding:1rem;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}
    blockquote{border-left:4px solid #C9A063;padding-left:1rem;margin-left:0;color:#6b7280;font-style:italic}
    table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:.75rem;border:1px solid #e5e7eb;text-align:left}
    th{background:#f9fafb;font-weight:600}img{max-width:100%;height:auto}a{color:#C9A063}
  </style>
</head>
<body>${htmlPreview}</body>
</html>`
    downloadTextFile(fullHtml, `${fileName || 'document'}.html`, 'text/html')
  }, [htmlPreview, fileName])

  // ── Download raw Markdown ─────────────────────────────────────────────────────

  const handleDownloadMd = useCallback(() => {
    if (!markdownContent) return
    downloadTextFile(markdownContent, `${fileName || 'document'}.md`, 'text/markdown')
  }, [markdownContent, fileName])

  // ── Export PDF ────────────────────────────────────────────────────────────────
  // Uses the browser's native print-to-PDF — avoids CSP issues that plague
  // canvas-based capture libs, and produces vector text (selectable, searchable).

  const handleExportPdf = useCallback(() => {
    if (!htmlPreview) return

    // window.open() called synchronously from a click handler — not blocked by pop-up blockers
    const win = window.open('', '_blank')
    if (!win) {
      setError('PDF blocked — please allow pop-ups for this site and try again.')
      return
    }

    const safeTitle = (fileName || 'document').replace(/&/g, '&amp;').replace(/</g, '&lt;')

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>
@page{margin:1in;size:A4}
*,*::before,*::after{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;margin:0}
h1,h2,h3,h4{font-weight:600;margin:1.5em 0 .5em;page-break-after:avoid}
h1{font-size:1.8em;border-bottom:2px solid #e5e7eb;padding-bottom:.4em}
h2{font-size:1.4em}h3{font-size:1.2em}
p{margin:.75em 0}
ul,ol{padding-left:1.5em;margin:.5em 0}li{margin:.2em 0}
code{background:#f4f4f5;padding:.15em .4em;border-radius:3px;font-family:'Courier New',Courier,monospace;font-size:.875em}
pre{background:#f4f4f5;padding:1em;border-radius:6px;page-break-inside:avoid;margin:1em 0}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #C9A063;padding:.5em 1em;margin:1em 0;color:#6b7280;font-style:italic}
table{width:100%;border-collapse:collapse;margin:1em 0;page-break-inside:avoid;font-size:.9em}
th,td{padding:.5em .75em;border:1px solid #e5e7eb;text-align:left}
th{background:#f9fafb;font-weight:600}
img{max-width:100%;height:auto}
a{color:#C9A063;text-decoration:none}
hr{border:none;border-top:1px solid #e5e7eb;margin:1.5em 0}
</style>
</head>
<body>${htmlPreview}</body>
</html>`)

    win.document.close()
    win.focus()
    // Small delay ensures the document is fully painted before the print dialog opens
    setTimeout(() => win.print(), 250)
  }, [htmlPreview, fileName])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 's' && markdownContent.trim() && !isConverting) {
        e.preventDefault(); handleExportDocx()
      } else if (e.key === 'o') {
        e.preventDefault(); fileInputRef.current?.click()
      } else if (e.shiftKey && e.key === 'C' && markdownContent.trim()) {
        e.preventDefault(); copyToolbar(markdownContent, setError)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [markdownContent, isConverting, handleExportDocx, copyToolbar])

  // ── Resize handle ─────────────────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const layout = editorLayoutRef.current
    if (!layout) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (e: MouseEvent) => {
      const rect = layout.getBoundingClientRect()
      setSplitRatio(Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100)))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────

  const hasContent = !!markdownContent.trim()

  // Pick only DOM-valid event handlers — react-dropzone v14 spreads internal
  // state props (isFileDialogActive, isDragAccept, open, rootRef, …) which
  // React 19 rejects as invalid DOM attributes.
  const { ref: dzRef, onDragEnter, onDragOver, onDragLeave, onDrop: dzOnDrop,
    onFocus: dzOnFocus, onBlur: dzOnBlur, onKeyDown: dzOnKeyDown, tabIndex: dzTabIndex } = getRootProps()

  return (
    <div
      className="converter-container"
      ref={dzRef as React.RefObject<HTMLDivElement>}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={dzOnDrop}
      onFocus={dzOnFocus}
      onBlur={dzOnBlur}
      onKeyDown={dzOnKeyDown}
      tabIndex={dzTabIndex}
    >
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        className="converter-file-input-hidden"
        onChange={handleFileInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="converter-toolbar">
        <div className="converter-toolbar-left">
          <button type="button" className="converter-toolbar-btn" onClick={handleUploadClick} title="Open file (Ctrl+O)">
            <Upload size={15} /><span>Open</span>
          </button>

          <div className="converter-toolbar-divider" />

          <button
            type="button"
            className={`converter-toolbar-btn converter-toolbar-btn--icon ${wordWrap ? 'active' : ''}`}
            onClick={() => setWordWrap(w => !w)}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText size={15} />
          </button>

          <div className="converter-toolbar-divider" />

          <div className="converter-view-toggle" role="group" aria-label="View mode">
            <button type="button" className={`converter-view-btn ${viewMode === 'source' ? 'active' : ''}`} onClick={() => setViewMode('source')} title="Source only">
              <Code size={13} /><span>Source</span>
            </button>
            <button type="button" className={`converter-view-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="Split view">
              <span>Split</span>
            </button>
            <button type="button" className={`converter-view-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={() => setViewMode('preview')} title="Preview only">
              <Eye size={13} /><span>Preview</span>
            </button>
          </div>

          <div className="converter-toolbar-divider" />

          <button type="button" className="converter-toolbar-btn converter-toolbar-btn--danger" onClick={handleClear} disabled={!hasContent} title="Clear document">
            <X size={15} /><span>Clear</span>
          </button>
        </div>

        <div className="converter-toolbar-right">
          {autoSaveStatus !== 'idle' && (
            <span className={`converter-autosave ${autoSaveStatus}`}>
              {autoSaveStatus === 'saving' ? <Save size={12} /> : <Check size={12} />}
              {autoSaveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
          {fileName && <span className="converter-filename" title={`${fileName}.md`}>{fileName}.md</span>}
        </div>
      </div>

      {/* ── Status bars ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="converter-error-bar" role="alert" aria-live="polite">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button type="button" className="converter-dismiss-btn" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={13} />
          </button>
        </div>
      )}
      {conversionProgress && (
        <div className="converter-progress-bar" role="status" aria-live="polite">
          <span className="converter-spinner" aria-hidden="true" />
          <span>{conversionProgress}</span>
        </div>
      )}

      {/* ── Editor layout ─────────────────────────────────────────────────────── */}
      <div ref={editorLayoutRef} className="converter-editor-layout">

        {/* Source panel */}
        {viewMode !== 'preview' && (
          <div className="converter-panel" style={leftPanelStyle}>
            <div className="converter-panel-header">
              <span className="converter-panel-title">Markdown</span>
              <div className="converter-panel-actions">
                <button type="button" className="converter-panel-icon-btn" onClick={() => copyPanel(markdownContent, setError)} disabled={!hasContent} title="Copy Markdown (Ctrl+Shift+C)">
                  {copiedPanel ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <button type="button" className="converter-panel-icon-btn" onClick={handleDownloadMd} disabled={!hasContent} title="Download .md file">
                  <Download size={13} />
                </button>
              </div>
            </div>
            <div className="converter-dropzone-wrapper">
              {isDragActive && (
                <div className="converter-dropzone-overlay" aria-live="assertive">
                  <div className="converter-dropzone-icon"><Upload size={28} /></div>
                  <p className="converter-dropzone-text">Drop Markdown file here</p>
                  <p className="converter-dropzone-hint">.md or .markdown</p>
                </div>
              )}
              <textarea
                className="converter-editor"
                style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', overflowWrap: wordWrap ? 'break-word' : 'normal' }}
                value={markdownContent}
                onChange={e => { setMarkdownContent(e.target.value); setError('') }}
                placeholder="Paste Markdown content here, or drag & drop a .md file…"
                spellCheck={false}
                aria-label="Markdown source editor"
              />
            </div>
          </div>
        )}

        {/* Resize handle */}
        {viewMode === 'split' && (
          <div
            className="converter-resize-handle"
            onMouseDown={handleResizeMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize panels"
            title="Drag to resize"
          />
        )}

        {/* Preview panel */}
        {viewMode !== 'source' && (
          <div className="converter-panel converter-panel--preview">
            <div className="converter-panel-header">
              <span className="converter-panel-title">Preview</span>
              <div className="converter-panel-downloads">
                <button type="button" className="converter-panel-download-btn" onClick={handleExportDocx} disabled={!hasContent || isConverting} title="Download as Word document (Ctrl+S)">
                  <FileText size={12} /><span>{isConverting ? 'Converting…' : 'DOCX'}</span>
                </button>
                <button type="button" className="converter-panel-download-btn" onClick={handleExportHtml} disabled={!hasContent} title="Download as HTML file">
                  <FileCode size={12} /><span>HTML</span>
                </button>
                <button type="button" className="converter-panel-download-btn" onClick={handleExportPdf} disabled={!hasContent} title="Download as PDF via print dialog">
                  <Printer size={12} /><span>PDF</span>
                </button>
              </div>
            </div>
            <div className="converter-preview" ref={previewRef}>
              {htmlPreview ? (
                <div className="converter-preview-content" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              ) : (
                <div className="converter-preview-empty">
                  <Eye size={36} strokeWidth={1.5} />
                  <p>Preview will appear here</p>
                  <p>Start typing or open a .md file</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────────── */}
      {documentStats && (
        <div className="converter-stats-bar" aria-label="Document statistics">
          <span>{documentStats.words.toLocaleString()} words</span>
          <span className="converter-stats-sep" aria-hidden="true">·</span>
          <span>{documentStats.chars.toLocaleString()} chars</span>
          <span className="converter-stats-sep" aria-hidden="true">·</span>
          <span>{documentStats.lines.toLocaleString()} lines</span>
          <span className="converter-stats-sep" aria-hidden="true">·</span>
          <span>~{documentStats.readTime} min read</span>
          <div className="converter-stats-spacer" />
          <kbd className="converter-kbd">Ctrl+S</kbd><span> export DOCX</span>
          <span className="converter-stats-sep" aria-hidden="true">·</span>
          <kbd className="converter-kbd">Ctrl+O</kbd><span> open</span>
        </div>
      )}
    </div>
  )
}

export default MarkdownConverter
