import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image as ImageIcon, Check } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, type PdfFile } from '../utils/pdf'
import { downloadBinaryFile } from '../utils/file'
import './PdfToImage.css'

// The worker is configured once, locally, in utils/pdf.ts — which this module
// already imports. Nothing to do here.

type ImageFormat = 'png' | 'jpg'

async function pdfPageToBlob(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number,
  format: ImageFormat
): Promise<Blob> {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not get canvas context')
  }

  // Fill white background for JPG (PDFs can have transparent backgrounds)
  if (format === 'jpg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  await page.render({ canvasContext: context, viewport, canvas }).promise

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = format === 'jpg' ? 0.92 : undefined

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      mime,
      quality
    )
  })
}

const PdfToImage = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [scale, setScale] = useState<number>(2)
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | null>(null)

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

  const handleConvert = useCallback(async () => {
    if (!pdfFile) return

    setIsConverting(true)
    setError('')
    setConversionProgress(null)

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer()
      // Keep the loading task: pdf.js 6 moved teardown onto it (see utils/pdf.ts).
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 })
      const pdf = await loadingTask.promise
      const totalPages = pdf.numPages
      const baseName = pdfFile.name.replace(/\.pdf$/i, '')
      const ext = format === 'png' ? 'png' : 'jpg'
      const mime = format === 'png' ? 'image/png' : 'image/jpeg'

      for (let i = 1; i <= totalPages; i++) {
        setConversionProgress({ current: i, total: totalPages })
        const blob = await pdfPageToBlob(pdf, i, scale, format)
        const padded = String(i).padStart(3, '0')
        downloadBinaryFile(blob, `${baseName}-page-${padded}.${ext}`, mime)
      }

      await loadingTask.destroy()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF')
    } finally {
      setIsConverting(false)
      setConversionProgress(null)
    }
  }, [pdfFile, scale, format])

  const handleRemove = useCallback(() => {
    setPdfFile(null)
    setError('')
    setConversionProgress(null)
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: handleUploadClick,
      title: 'Open PDF'
    },
    {
      icon: <ImageIcon size={16} />,
      label: 'Convert & Download',
      onClick: handleConvert,
      disabled: !pdfFile || isConverting,
      title: 'Convert pages to images and download'
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

      <div className="pdf-to-image-container" {...getRootProps()}>
        <input aria-label="Upload a file" {...getInputProps()} />

        {!pdfFile ? (
          <div className={`pdf-to-image-dropzone ${isDragActive ? 'active' : ''}`}>
            <div className="pdf-to-image-dropzone-content">
              <Upload size={48} />
              <h3>{isDragActive ? 'Drop PDF here' : 'Upload PDF to Convert'}</h3>
              <p>Drag &amp; drop a PDF file or click "Open" to select</p>
              <button
                type="button"
                className="pdf-to-image-upload-btn"
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
          <div className="pdf-to-image-preview">
            <div className="pdf-to-image-file-card">
              <div className="pdf-to-image-file-thumbnail">
                {pdfFile.thumbnail ? (
                  <img src={pdfFile.thumbnail} alt={pdfFile.name} />
                ) : (
                  <div className="pdf-to-image-thumbnail-placeholder">
                    <FileText size={32} />
                  </div>
                )}
              </div>
              <div className="pdf-to-image-file-info">
                <h3>{pdfFile.name}</h3>
                <p>{pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}</p>
              </div>
              <button
                type="button"
                className="pdf-to-image-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pdf-to-image-controls">
              <div className="pdf-to-image-control-row">
                <label className="pdf-to-image-label">Output format</label>
                <div className="pdf-to-image-format-toggle">
                  <button
                    type="button"
                    className={`pdf-to-image-format-btn ${format === 'png' ? 'active' : ''}`}
                    onClick={() => setFormat('png')}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    className={`pdf-to-image-format-btn ${format === 'jpg' ? 'active' : ''}`}
                    onClick={() => setFormat('jpg')}
                  >
                    JPG
                  </button>
                </div>
              </div>

              <div className="pdf-to-image-control-row">
                <label className="pdf-to-image-label" htmlFor="pdf-to-image-scale">
                  Resolution
                </label>
                <div className="pdf-to-image-scale-row">
                  <input
                    id="pdf-to-image-scale"
                    type="range"
                    min={1}
                    max={4}
                    step={1}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="pdf-to-image-scale-slider"
                  />
                  <span className="pdf-to-image-scale-value">{scale}x</span>
                </div>
              </div>
            </div>

            {!isConverting && (
              <div className="pdf-to-image-info">
                <Check size={16} />
                <span>
                  Ready to export {pdfFile.pages || 0} {format.toUpperCase()} image{(pdfFile.pages || 0) === 1 ? '' : 's'} at {scale}x resolution
                </span>
              </div>
            )}
          </div>
        )}

        {isValidating && (
          <div className="pdf-to-image-loading">
            <p>Validating PDF...</p>
          </div>
        )}

        {isConverting && (
          <div className="pdf-to-image-loading">
            <p className="pdf-to-image-progress">
              {conversionProgress
                ? `Converting page ${conversionProgress.current} of ${conversionProgress.total}...`
                : 'Preparing conversion...'}
            </p>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfToImage
