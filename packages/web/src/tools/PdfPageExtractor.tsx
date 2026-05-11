import { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Check, Scissors, FileOutput, Hash } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, type PdfFile } from '../utils/pdf'
import { downloadBinaryFile } from '../utils/file'
import './PdfPageExtractor.css'

function parsePageRanges(input: string, totalPages: number): number[] {
  const result = new Set<number>()
  const parts = input.split(',').map(s => s.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim())
      const start = parseInt(startStr)
      const end = parseInt(endStr)
      if (isNaN(start) || isNaN(end)) throw new Error(`Invalid range: "${part}"`)
      if (start < 1 || end > totalPages) throw new Error(`Range "${part}" outside PDF bounds (1-${totalPages})`)
      if (start > end) throw new Error(`Range "${part}" — start must be ≤ end`)
      for (let i = start; i <= end; i++) result.add(i)
    } else {
      const n = parseInt(part)
      if (isNaN(n)) throw new Error(`Invalid page number: "${part}"`)
      if (n < 1 || n > totalPages) throw new Error(`Page ${n} outside PDF bounds (1-${totalPages})`)
      result.add(n)
    }
  }

  return [...result].sort((a, b) => a - b)
}

async function extractPages(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer)
  const newPdf = await PDFDocument.create()

  // pdf-lib uses 0-indexed page numbers internally
  const indices = pageNumbers.map(n => n - 1)
  const copiedPages = await newPdf.copyPages(sourcePdf, indices)
  copiedPages.forEach(page => newPdf.addPage(page))

  return await newPdf.save()
}

const PdfPageExtractor = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [error, setError] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [rangeInput, setRangeInput] = useState('')

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
    setRangeInput(pageCount > 0 ? `1-${pageCount}` : '')
    setIsValidating(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      'application/pdf': ['.pdf']
    },
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

  const parsed = useMemo<{ pages: number[]; error: string | null }>(() => {
    if (!pdfFile || !rangeInput.trim()) {
      return { pages: [], error: null }
    }
    try {
      const pages = parsePageRanges(rangeInput, pdfFile.pages || 0)
      if (pages.length === 0) {
        return { pages: [], error: 'No pages selected' }
      }
      return { pages, error: null }
    } catch (err) {
      return { pages: [], error: err instanceof Error ? err.message : 'Invalid range' }
    }
  }, [rangeInput, pdfFile])

  const handleExtract = useCallback(async () => {
    if (!pdfFile || parsed.pages.length === 0) return

    setIsExtracting(true)
    setError('')

    try {
      const extracted = await extractPages(pdfFile.file, parsed.pages)
      const buffer = new ArrayBuffer(extracted.length)
      const view = new Uint8Array(buffer)
      view.set(extracted)
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/pdf' })
      const baseName = pdfFile.name.replace(/\.pdf$/i, '')
      downloadBinaryFile(blob, `${baseName}_extracted.pdf`, 'application/pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract pages')
    } finally {
      setIsExtracting(false)
    }
  }, [pdfFile, parsed.pages])

  const handleRemove = useCallback(() => {
    setPdfFile(null)
    setRangeInput('')
    setError('')
  }, [])

  const canExtract = !!pdfFile && parsed.pages.length > 0 && !parsed.error && !isExtracting

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Upload',
      onClick: handleUploadClick,
      title: 'Upload PDF'
    },
    {
      icon: <Scissors size={16} />,
      label: 'Extract & Download',
      onClick: handleExtract,
      disabled: !canExtract,
      title: 'Extract selected pages'
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

      <div className="pdf-extractor-container" {...getRootProps()}>
        <input {...getInputProps()} />

        {!pdfFile ? (
          <div className={`pdf-extractor-dropzone ${isDragActive ? 'active' : ''}`}>
            <div className="pdf-extractor-dropzone-content">
              <Upload size={48} />
              <h3>{isDragActive ? 'Drop PDF here' : 'Upload PDF to Extract Pages'}</h3>
              <p>Drag & drop a PDF file or click "Upload" to select</p>
              <button
                type="button"
                className="pdf-extractor-upload-btn"
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
          <div className="pdf-extractor-preview">
            <div className="pdf-extractor-file-card">
              <div className="pdf-extractor-file-thumbnail">
                {pdfFile.thumbnail ? (
                  <img src={pdfFile.thumbnail} alt={pdfFile.name} />
                ) : (
                  <div className="pdf-extractor-thumbnail-placeholder">
                    <FileText size={32} />
                  </div>
                )}
              </div>
              <div className="pdf-extractor-file-info">
                <h3>{pdfFile.name}</h3>
                <p>{pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}</p>
              </div>
              <button
                type="button"
                className="pdf-extractor-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pdf-extractor-range-section">
              <label className="pdf-extractor-range-label">
                <FileOutput size={14} />
                <span>Pages to extract</span>
              </label>
              <input
                type="text"
                className={`pdf-extractor-range-input ${parsed.error ? 'has-error' : ''}`}
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="e.g. 1-3,5,7-9"
                spellCheck={false}
                autoComplete="off"
              />
              <div className="pdf-extractor-range-meta">
                <p className="pdf-extractor-range-help">Examples: 1-3,5,7-9 or 1,3,5</p>
                {!parsed.error && parsed.pages.length > 0 && (
                  <span className="pdf-extractor-pages-badge">
                    <Hash size={12} />
                    {parsed.pages.length} page{parsed.pages.length === 1 ? '' : 's'} selected
                  </span>
                )}
              </div>
              {parsed.error && (
                <p className="pdf-extractor-range-error">{parsed.error}</p>
              )}
            </div>

            {!parsed.error && parsed.pages.length > 0 && (
              <div className="pdf-extractor-info">
                <Check size={16} />
                <span>
                  Ready to extract {parsed.pages.length} page{parsed.pages.length === 1 ? '' : 's'} into a new PDF
                </span>
              </div>
            )}
          </div>
        )}

        {isValidating && (
          <div className="pdf-extractor-loading">
            <p>Validating PDF...</p>
          </div>
        )}

        {isExtracting && (
          <div className="pdf-extractor-loading">
            <p>Extracting pages...</p>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfPageExtractor
