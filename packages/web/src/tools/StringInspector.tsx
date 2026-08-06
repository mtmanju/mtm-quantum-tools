import { AlignLeft, Check, Copy, FileText, Hash, Type, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { downloadTextFile } from '../utils/file'
import { useHandoff } from '../hooks/useHandoff'
import './StringInspector.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUtf8Bytes = (str: string) => new TextEncoder().encode(str).length
const getUtf16Bytes = (str: string) => str.length * 2

function getUnicodeCategory(cp: number): string {
  if (cp < 32 || (cp >= 127 && cp < 160)) return 'Control'
  if (cp >= 0x0041 && cp <= 0x005a) return 'Uppercase Letter'
  if (cp >= 0x0061 && cp <= 0x007a) return 'Lowercase Letter'
  if (cp >= 0x0030 && cp <= 0x0039) return 'Decimal Digit'
  if (cp === 0x0020) return 'Space'
  if (cp >= 0x0021 && cp <= 0x002f) return 'Punctuation'
  if (cp >= 0x003a && cp <= 0x0040) return 'Punctuation'
  if (cp >= 0x005b && cp <= 0x0060) return 'Punctuation'
  if (cp >= 0x007b && cp <= 0x007e) return 'Punctuation'
  if (cp > 0x007e) return 'Extended Unicode'
  return 'Other'
}

interface CodePoint {
  char: string
  displayChar: string
  cp: number
  hex: string
  escape: string
  category: string
}

function buildCodePoints(str: string): CodePoint[] {
  return [...str].map((char) => {
    const cp = char.codePointAt(0)!
    const hex = cp.toString(16).toUpperCase().padStart(4, '0')
    const escape =
      cp > 0xffff
        ? `\\u{${cp.toString(16).toUpperCase()}}`
        : `\\u${hex}`
    const displayChar = cp < 32 || (cp >= 127 && cp < 160) ? '␣' : char
    return { char, displayChar, cp, hex, escape, category: getUnicodeCategory(cp) }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

type ActiveSection = 'codepoints' | 'frequency' | 'encodings'

const MAX_CODE_POINTS = 200

const StringInspector = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('string-inspector', setInput)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<ActiveSection>('codepoints')

  const copyHook = useCopy()

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const chars = [...input]
    const charCount = chars.length
    const uniqueChars = new Set(chars).size
    const words = input.trim() ? input.trim().split(/\s+/).length : 0
    const lines = input ? input.split('\n').length : 0
    return {
      charCount,
      utf8Bytes: getUtf8Bytes(input),
      utf16Bytes: getUtf16Bytes(input),
      words,
      lines,
      uniqueChars,
    }
  }, [input])

  // ── Code points ──────────────────────────────────────────────────────────
  const allCodePoints = useMemo(() => (input ? buildCodePoints(input) : []), [input])
  const codePoints = useMemo(() => allCodePoints.slice(0, MAX_CODE_POINTS), [allCodePoints])
  const truncated = allCodePoints.length > MAX_CODE_POINTS

  // ── Frequency ────────────────────────────────────────────────────────────
  const frequency = useMemo(() => {
    if (!input) return []
    const freq: Record<string, number> = {}
    for (const char of [...input]) {
      freq[char] = (freq[char] || 0) + 1
    }
    const total = [...input].length
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([char, count]) => ({
        char,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
  }, [input])

  // ── Encodings ────────────────────────────────────────────────────────────
  const encodings = useMemo(() => {
    if (!input) return { base64: '', urlEncoded: '', htmlEncoded: '' }
    let base64 = ''
    try {
      base64 = btoa(unescape(encodeURIComponent(input)))
    } catch {
      base64 = '(unable to encode)'
    }
    const urlEncoded = encodeURIComponent(input)
    const htmlEncoded = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    return { base64, urlEncoded, htmlEncoded }
  }, [input])

  // ── File upload ──────────────────────────────────────────────────────────
  const fileUpload = useFileUpload({
    onFileRead: (content) => {
      setInput(content)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html', '.htm'],
      'application/json': ['.json'],
    },
  })

  // ── Download report ──────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!input.trim()) return

    const cpLines = codePoints
      .map(
        (p) =>
          `  ${p.displayChar.padEnd(3)} U+${p.hex.padEnd(6)} ${p.category.padEnd(20)} Dec:${p.cp.toString().padEnd(8)} ${p.escape}`
      )
      .join('\n')

    const report = `String Inspector Report
Generated: ${new Date().toLocaleString()}
=======================
Length (chars):   ${stats.charCount.toLocaleString()}
UTF-8 bytes:      ${stats.utf8Bytes.toLocaleString()}
UTF-16 bytes:     ${stats.utf16Bytes.toLocaleString()}
Words:            ${stats.words.toLocaleString()}
Lines:            ${stats.lines.toLocaleString()}
Unique chars:     ${stats.uniqueChars.toLocaleString()}

Code Points (first ${Math.min(MAX_CODE_POINTS, allCodePoints.length)} of ${allCodePoints.length}):
  Chr U+Hex   Category             Decimal  Escape
${cpLines}
`
    downloadTextFile(report, 'string-inspector-report.txt')
  }, [input, stats, codePoints, allCodePoints.length])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload text file',
    },
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(input, (err) => setError(err)),
      disabled: !input.trim(),
      title: 'Copy input text',
      showDividerBefore: true,
    },
    {
      icon: <FileText size={16} />,
      label: 'Export',
      onClick: handleDownload,
      disabled: !input.trim(),
      title: 'Download analysis report',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !input.trim(),
      title: 'Clear input',
      showDividerBefore: true,
    },
  ]

  const maxFreqCount = frequency[0]?.count ?? 1

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="string-inspector-container">
        {/* Input */}
        <EditorPanel
          title="String Input"
          onCopy={() => copyHook.copy(input, (err) => setError(err))}
          copied={copyHook.copied}
        >
          <DropzoneTextarea
            {...fileUpload}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError('')
            }}
            placeholder="Paste or type any string to analyze Unicode code points, encodings & character frequency…"
            spellCheck={false}
            dropzoneText="Drag & drop file or paste"
            dropzoneHint="Supports .txt, .md, .html, .json files"
            dropzoneActiveText="Drop file here"
          />
        </EditorPanel>

        {/* Stats bar */}
        {input && (
          <div className="string-stats-bar">
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.charCount.toLocaleString()}</div>
              <div className="string-stat-label">
                <Type size={12} /> Characters
              </div>
            </div>
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.utf8Bytes.toLocaleString()}</div>
              <div className="string-stat-label">
                <Hash size={12} /> UTF-8 Bytes
              </div>
            </div>
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.utf16Bytes.toLocaleString()}</div>
              <div className="string-stat-label">
                <Hash size={12} /> UTF-16 Bytes
              </div>
            </div>
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.words.toLocaleString()}</div>
              <div className="string-stat-label">
                <AlignLeft size={12} /> Words
              </div>
            </div>
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.lines.toLocaleString()}</div>
              <div className="string-stat-label">
                <AlignLeft size={12} /> Lines
              </div>
            </div>
            <div className="string-stat-tile">
              <div className="string-stat-value">{stats.uniqueChars.toLocaleString()}</div>
              <div className="string-stat-label">
                <Type size={12} /> Unique Chars
              </div>
            </div>
          </div>
        )}

        {/* Section tabs */}
        {input && (
          <div className="string-sections">
            {/* Tab bar */}
            <div className="string-tab-bar">
              {(
                [
                  { key: 'codepoints', label: 'Code Points' },
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'encodings', label: 'Encodings' },
                ] as { key: ActiveSection; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`string-tab${activeSection === key ? ' active' : ''}`}
                  onClick={() => setActiveSection(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Code points table */}
            {activeSection === 'codepoints' && (
              <div className="string-section-content">
                {truncated && (
                  <p className="string-truncation-note">
                    Showing first {MAX_CODE_POINTS} of {allCodePoints.length.toLocaleString()} characters.
                  </p>
                )}
                <div className="string-code-table-wrapper">
                  <table className="string-code-table">
                    <thead>
                      <tr>
                        <th>Char</th>
                        <th>Unicode</th>
                        <th>Category</th>
                        <th>Hex</th>
                        <th>Decimal</th>
                        <th>Escape</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codePoints.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <span
                              className={`char-display${p.category === 'Control' ? ' char-control' : ''}`}
                            >
                              {p.displayChar}
                            </span>
                          </td>
                          <td>U+{p.hex}</td>
                          <td>
                            <span className={`char-category char-category-${p.category.replace(/\s+/g, '-').toLowerCase()}`}>
                              {p.category}
                            </span>
                          </td>
                          <td>0x{p.hex}</td>
                          <td>{p.cp}</td>
                          <td>
                            <code className="char-escape">{p.escape}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Frequency table */}
            {activeSection === 'frequency' && (
              <div className="string-section-content">
                <p className="string-section-hint">Top 20 most frequent characters</p>
                <div className="string-freq-list">
                  {frequency.map(({ char, count, pct }, i) => {
                    const cp = char.codePointAt(0)!
                    const isControl = cp < 32 || (cp >= 127 && cp < 160)
                    const displayChar = isControl ? '␣' : char
                    const barPct = (count / maxFreqCount) * 100
                    return (
                      <div key={i} className="string-freq-bar">
                        <span className={`char-display freq-char${isControl ? ' char-control' : ''}`}>
                          {displayChar}
                        </span>
                        <span className="freq-label">
                          U+{cp.toString(16).toUpperCase().padStart(4, '0')}
                        </span>
                        <div className="string-freq-track">
                          <div
                            className="string-freq-fill"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="freq-count">{count}</span>
                        <span className="freq-pct">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Encodings */}
            {activeSection === 'encodings' && (
              <div className="string-section-content string-encodings">
                <div className="string-encoding-group">
                  <div className="string-encoding-label">Base64</div>
                  <pre className="string-encoding-box">{encodings.base64}</pre>
                </div>
                <div className="string-encoding-group">
                  <div className="string-encoding-label">URL Encoded</div>
                  <pre className="string-encoding-box">{encodings.urlEncoded}</pre>
                </div>
                <div className="string-encoding-group">
                  <div className="string-encoding-label">HTML Encoded</div>
                  <pre className="string-encoding-box">{encodings.htmlEncoded}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default StringInspector
