import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Check, Scissors } from 'lucide-react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, splitPdfByPages, type PdfFile } from '../utils/pdf'
import { saveAs } from 'file-saver'
import './PdfSplitter.css'

const PdfSplitter = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null)
  const [error, setError] = useState('')
  const [isSplitting, setIsSplitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

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

  const handleSplit = useCallback(async () => {
    if (!pdfFile) return

    setIsSplitting(true)
    setError('')

    try {
      const results = await splitPdfByPages(pdfFile.file)
      
      for (const result of results) {
        const buffer = new ArrayBuffer(result.data.length)
        const view = new Uint8Array(buffer)
        view.set(result.data)
        const blob = new Blob([buffer as ArrayBuffer], { type: 'application/pdf' })
        saveAs(blob, result.name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF')
    } finally {
      setIsSplitting(false)
    }
  }, [pdfFile])

  const handleRemove = useCallback(() => {
    setPdfFile(null)
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Upload',
      onClick: handleUploadClick,
      title: 'Upload PDF'
    },
    {
      icon: <Scissors size={16} />,
      label: 'Split',
      onClick: handleSplit,
      disabled: !pdfFile || isSplitting,
      title: 'Split PDF into pages'
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

      <div className="pdf-splitter-container" {...getRootProps()}>
        <input {...getInputProps()} />

        {!pdfFile ? (
          <div className={`pdf-splitter-dropzone ${isDragActive ? 'active' : ''}`}>
            <div className="pdf-splitter-dropzone-content">
              <Upload size={48} />
              <h3>{isDragActive ? 'Drop PDF here' : 'Upload PDF to Split'}</h3>
              <p>Drag & drop a PDF file or click "Upload" to select</p>
              <button
                type="button"
                className="pdf-splitter-upload-btn"
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
          <div className="pdf-splitter-preview">
            <div className="pdf-splitter-file-card">
              <div className="pdf-splitter-file-thumbnail">
                {pdfFile.thumbnail ? (
                  <img src={pdfFile.thumbnail} alt={pdfFile.name} />
                ) : (
                  <div className="pdf-splitter-thumbnail-placeholder">
                    <FileText size={32} />
                  </div>
                )}
              </div>
              <div className="pdf-splitter-file-info">
                <h3>{pdfFile.name}</h3>
                <p>{pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}</p>
              </div>
              <button
                type="button"
                className="pdf-splitter-remove-btn"
                onClick={handleRemove}
                title="Remove file"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pdf-splitter-info">
              <Check size={16} />
              <span>Ready to split into {pdfFile.pages || 0} individual PDF files</span>
            </div>
          </div>
        )}

        {isValidating && (
          <div className="pdf-splitter-loading">
            <p>Validating PDF...</p>
          </div>
        )}

        {isSplitting && (
          <div className="pdf-splitter-loading">
            <p>Splitting PDF into pages...</p>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfSplitter

