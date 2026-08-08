import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Droplet, Stamp, Check } from 'lucide-react'
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, type PdfFile } from '../utils/pdf'
import { downloadBinaryFile } from '../utils/file'
import './PdfWatermark.css'

type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: { r: number; g: number; b: number }
  position: Position
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16) / 255
  const g = parseInt(cleaned.substring(2, 4), 16) / 255
  const b = parseInt(cleaned.substring(4, 6), 16) / 255
  return { r, g, b }
}

async function addWatermark(file: File, opts: WatermarkOptions): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize)
    const textHeight = opts.fontSize

    let x: number
    let y: number
    const margin = 50

    switch (opts.position) {
      case 'top-left':
        x = margin
        y = height - margin - textHeight
        break
      case 'top-right':
        x = width - textWidth - margin
        y = height - margin - textHeight
        break
      case 'bottom-left':
        x = margin
        y = margin
        break
      case 'bottom-right':
        x = width - textWidth - margin
        y = margin
        break
      case 'center':
      default:
        x = (width - textWidth) / 2
        y = (height - textHeight) / 2
        break
    }

    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(opts.color.r, opts.color.g, opts.color.b),
      opacity: opts.opacity,
      rotate: degrees(opts.rotation)
    })
  }

  return await pdfDoc.save()
}

interface PositionOption {
  value: Position
  label: string
  // SVG marker coords (in a 24x24 viewBox)
  cx: number
  cy: number
}

const POSITION_OPTIONS: PositionOption[] = [
  { value: 'top-left', label: 'Top Left', cx: 6, cy: 6 },
  { value: 'top-right', label: 'Top Right', cx: 18, cy: 6 },
  { value: 'center', label: 'Center', cx: 12, cy: 12 },
  { value: 'bottom-left', label: 'Bottom Left', cx: 6, cy: 18 },
  { value: 'bottom-right', label: 'Bottom Right', cx: 18, cy: 18 }
]

const PdfWatermark = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState(50)
  const [opacity, setOpacity] = useState(0.3)
  const [rotation, setRotation] = useState(-45)
  const [color, setColor] = useState('#C92929')
  const [position, setPosition] = useState<Position>('center')
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError(`${file.name} is not a PDF file`)
      return
    }

    setIsValidating(true)
    setError('')

    const isValid = await validatePdf(file)
    if (!isValid) {
      setError(`${file.name} is not a valid PDF file`)
      setIsValidating(false)
      return
    }

    const pageCount = await getPdfPageCount(file)
    let thumbnail = ''
    try {
      thumbnail = await generatePdfThumbnail(file, 200)
    } catch (err) {
      console.error('Failed to generate thumbnail', err)
    }

    setPdfFile({
      file,
      name: file.name,
      size: file.size,
      pages: pageCount,
      thumbnail
    })
    setIsValidating(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    noClick: true
  })

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,application/pdf'
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        await handleFileSelect(files)
      }
    }
    input.click()
  }, [handleFileSelect])

  const handleApply = useCallback(async () => {
    if (!pdfFile) return
    if (!text.trim()) {
      setError('Watermark text cannot be empty')
      return
    }

    setIsApplying(true)
    setError('')

    try {
      const bytes = await addWatermark(pdfFile.file, {
        text,
        fontSize,
        opacity,
        rotation,
        color: hexToRgb01(color),
        position
      })

      const baseName = pdfFile.name.replace(/\.pdf$/i, '')
      downloadBinaryFile(bytes, `${baseName}-watermarked.pdf`, 'application/pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply watermark')
    } finally {
      setIsApplying(false)
    }
  }, [pdfFile, text, fontSize, opacity, rotation, color, position])

  const handleRemove = useCallback(() => {
    setPdfFile(null)
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: handleUploadClick,
      title: 'Open PDF'
    },
    {
      icon: <Stamp size={16} />,
      label: 'Apply & Download',
      onClick: handleApply,
      disabled: !pdfFile || isApplying,
      title: 'Apply watermark and download'
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleRemove,
      disabled: !pdfFile,
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="pdf-watermark-container" {...getRootProps()}>
        <input aria-label="Upload a file" {...getInputProps()} />

        {!pdfFile ? (
          <div className={`pdf-watermark-dropzone ${isDragActive ? 'active' : ''}`}>
            <div className="pdf-watermark-dropzone-content">
              <Upload size={48} />
              <h3>{isDragActive ? 'Drop PDF here' : 'Upload PDF to Watermark'}</h3>
              <p>Drag &amp; drop a PDF file or click "Open" to select</p>
              <button
                type="button"
                className="pdf-watermark-upload-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUploadClick()
                }}
              >
                <Upload size={18} />
                <span>Select PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pdf-watermark-preview">
            <div className="pdf-watermark-file-card">
              <div className="pdf-watermark-file-thumbnail">
                {pdfFile.thumbnail ? (
                  <img src={pdfFile.thumbnail} alt={pdfFile.name} />
                ) : (
                  <div className="pdf-watermark-thumbnail-placeholder">
                    <FileText size={32} />
                  </div>
                )}
              </div>
              <div className="pdf-watermark-file-info">
                <h3>{pdfFile.name}</h3>
                <p>{pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}</p>
              </div>
              <button
                type="button"
                className="pdf-watermark-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pdf-watermark-controls">
              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label" htmlFor="pdf-watermark-text">
                  Watermark text
                </label>
                <input
                  id="pdf-watermark-text"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="pdf-watermark-text-input"
                  placeholder="e.g. CONFIDENTIAL"
                />
              </div>

              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label">Position</label>
                <div className="pdf-watermark-position-grid">
                  {POSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pdf-watermark-position-btn ${position === opt.value ? 'active' : ''}`}
                      onClick={() => setPosition(opt.value)}
                      title={opt.label}
                      aria-label={opt.label}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle cx={opt.cx} cy={opt.cy} r="2.5" fill="currentColor" />
                      </svg>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label" htmlFor="pdf-watermark-fontsize">
                  Font size
                </label>
                <div className="pdf-watermark-slider-row">
                  <input
                    id="pdf-watermark-fontsize"
                    type="range"
                    min={12}
                    max={100}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="pdf-watermark-slider"
                  />
                  <span className="pdf-watermark-slider-value">{fontSize}px</span>
                </div>
              </div>

              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label" htmlFor="pdf-watermark-opacity">
                  Opacity
                </label>
                <div className="pdf-watermark-slider-row">
                  <input
                    id="pdf-watermark-opacity"
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="pdf-watermark-slider"
                  />
                  <span className="pdf-watermark-slider-value">{Math.round(opacity * 100)}%</span>
                </div>
              </div>

              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label" htmlFor="pdf-watermark-rotation">
                  Rotation
                </label>
                <div className="pdf-watermark-slider-row">
                  <input
                    id="pdf-watermark-rotation"
                    type="range"
                    min={-90}
                    max={90}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="pdf-watermark-slider"
                  />
                  <span className="pdf-watermark-slider-value">{rotation}°</span>
                </div>
              </div>

              <div className="pdf-watermark-control-row">
                <label className="pdf-watermark-label" htmlFor="pdf-watermark-color">
                  Color
                </label>
                <div className="pdf-watermark-color-row">
                  <input
                    id="pdf-watermark-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="pdf-watermark-color-input"
                  />
                  <span className="pdf-watermark-color-value">{color.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {!isApplying && (
              <div className="pdf-watermark-info">
                <Check size={16} />
                <span>
                  Ready to watermark {pdfFile.pages || 0} page{(pdfFile.pages || 0) === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>
        )}

        {isValidating && (
          <div className="pdf-watermark-loading">
            <p>Validating PDF...</p>
          </div>
        )}

        {isApplying && (
          <div className="pdf-watermark-loading">
            <p>
              <Droplet size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              Applying watermark...
            </p>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfWatermark
