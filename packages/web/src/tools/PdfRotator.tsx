import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, RotateCw, FileText, Check, RefreshCw } from 'lucide-react'
import { PDFDocument, degrees } from 'pdf-lib'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, type PdfFile } from '../utils/pdf'
import { downloadBinaryFile } from '../utils/file'
import './PdfRotator.css'

const ROTATION_OPTIONS: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270]

async function rotatePdf(file: File, rotationDegrees: number): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const currentRotation = page.getRotation().angle
    page.setRotation(degrees((currentRotation + rotationDegrees) % 360))
  }

  return await pdfDoc.save()
}

const PdfRotator = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [error, setError] = useState('')
  const [isRotating, setIsRotating] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(90)

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

  const handleRotateDownload = useCallback(async () => {
    if (!pdfFile) return

    setIsRotating(true)
    setError('')

    try {
      const rotated = await rotatePdf(pdfFile.file, rotation)
      const buffer = new ArrayBuffer(rotated.length)
      const view = new Uint8Array(buffer)
      view.set(rotated)
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/pdf' })
      const baseName = pdfFile.name.replace(/\.pdf$/i, '')
      downloadBinaryFile(blob, `${baseName}_rotated_${rotation}.pdf`, 'application/pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate PDF')
    } finally {
      setIsRotating(false)
    }
  }, [pdfFile, rotation])

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
      icon: <RotateCw size={16} />,
      label: 'Rotate & Download',
      onClick: handleRotateDownload,
      disabled: !pdfFile || isRotating,
      title: 'Rotate PDF and download'
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

      <div className="pdf-rotator-container" {...getRootProps()}>
        <input {...getInputProps()} />

        {!pdfFile ? (
          <div className={`pdf-rotator-dropzone ${isDragActive ? 'active' : ''}`}>
            <div className="pdf-rotator-dropzone-content">
              <Upload size={48} />
              <h3>{isDragActive ? 'Drop PDF here' : 'Upload PDF to Rotate'}</h3>
              <p>Drag & drop a PDF file or click "Open" to select</p>
              <button
                type="button"
                className="pdf-rotator-upload-btn"
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
          <div className="pdf-rotator-preview">
            <div className="pdf-rotator-file-card">
              <div className="pdf-rotator-file-thumbnail">
                {pdfFile.thumbnail ? (
                  <img src={pdfFile.thumbnail} alt={pdfFile.name} />
                ) : (
                  <div className="pdf-rotator-thumbnail-placeholder">
                    <FileText size={32} />
                  </div>
                )}
              </div>
              <div className="pdf-rotator-file-info">
                <h3>{pdfFile.name}</h3>
                <p>{pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}</p>
              </div>
              <button
                type="button"
                className="pdf-rotator-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pdf-rotator-controls-wrapper">
              <div className="pdf-rotator-controls-label">Apply to all pages</div>
              <div className="pdf-rotator-controls">
                {ROTATION_OPTIONS.map(angle => (
                  <button
                    key={angle}
                    type="button"
                    className={`pdf-rotator-angle-btn ${rotation === angle ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setRotation(angle)
                    }}
                    title={`Rotate ${angle}°`}
                  >
                    <RotateCw
                      size={28}
                      style={{ transform: `rotate(${angle}deg)`, transition: 'transform 0.3s ease' }}
                    />
                    <span className="pdf-rotator-angle-label">{angle}°</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pdf-rotator-info">
              <Check size={16} />
              <span>
                {rotation === 0
                  ? 'No rotation will be applied'
                  : `All ${pdfFile.pages || 0} page${(pdfFile.pages || 0) === 1 ? '' : 's'} will be rotated ${rotation}°`}
              </span>
            </div>
          </div>
        )}

        {isValidating && (
          <div className="pdf-rotator-loading">
            <RefreshCw size={16} className="pdf-rotator-spin" />
            <p>Validating PDF...</p>
          </div>
        )}

        {isRotating && (
          <div className="pdf-rotator-loading">
            <RefreshCw size={16} className="pdf-rotator-spin" />
            <p>Rotating PDF...</p>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfRotator
