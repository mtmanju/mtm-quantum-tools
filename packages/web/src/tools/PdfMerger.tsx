import { useState, useCallback, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Download, AlertCircle, FileText, Check, GripVertical } from 'lucide-react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { mergePdfs, validatePdf, getPdfPageCount, formatFileSize, generatePdfThumbnail, type PdfFile } from '../utils/pdf'
import { saveAs } from 'file-saver'
import './PdfMerger.css'

const PdfMerger = () => {
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([])
  const [error, setError] = useState('')
  const [isMerging, setIsMerging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return

    setIsValidating(true)
    setError('')

    const newFiles: PdfFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError(`${file.name} is not a PDF file`)
        setIsValidating(false)
        return
      }

      const isValid = await validatePdf(file)
      if (!isValid) {
        setError(`${file.name} is not a valid PDF file`)
        setIsValidating(false)
        return
      }

      const pageCount = await getPdfPageCount(file)
      
      // Generate thumbnail immediately - wait for it
      let thumbnail = ''
      try {
        thumbnail = await generatePdfThumbnail(file, 200)
      } catch (err) {
        console.error('Failed to generate thumbnail for', file.name, err)
      }
      
      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        pages: pageCount,
        thumbnail
      })
    }

    setPdfFiles(prev => [...prev, ...newFiles])
    setIsValidating(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    noClick: true
  })

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,application/pdf'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        await handleFileSelect(files)
      }
    }
    input.click()
  }, [handleFileSelect])

  const handleRemove = useCallback((index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index))
    setError('')
  }, [])

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
    setDraggedIndex(index)
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    if (dragItemRef.current === null || dragItemRef.current === index) return
    setDragOverIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragItemRef.current === null || dragItemRef.current === index) return
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (dragItemRef.current === null || dragItemRef.current === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      dragItemRef.current = null
      return
    }

    setPdfFiles(prev => {
      const newFiles = [...prev]
      const draggedItem = newFiles[dragItemRef.current!]
      newFiles.splice(dragItemRef.current!, 1)
      newFiles.splice(dropIndex, 0, draggedItem)
      return newFiles
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
    dragItemRef.current = null
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    dragItemRef.current = null
  }, [])

  const handleMerge = useCallback(async () => {
    if (pdfFiles.length === 0) {
      setError('Please add at least one PDF file')
      return
    }

    if (pdfFiles.length === 1) {
      setError('Please add at least two PDF files to merge')
      return
    }

    setIsMerging(true)
    setError('')

    try {
      const mergedPdfBytes = await mergePdfs(pdfFiles)
      // Convert Uint8Array to Blob - create a new ArrayBuffer view
      const buffer = new ArrayBuffer(mergedPdfBytes.length)
      const view = new Uint8Array(buffer)
      view.set(mergedPdfBytes)
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/pdf' })
      saveAs(blob, 'merged.pdf')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs')
    } finally {
      setIsMerging(false)
    }
  }, [pdfFiles])

  const handleClear = useCallback(() => {
    setPdfFiles([])
    setError('')
  }, [])

  const totalPages = useMemo(() => {
    return pdfFiles.reduce((sum, file) => sum + (file.pages || 0), 0)
  }, [pdfFiles])

  const totalSize = useMemo(() => {
    return pdfFiles.reduce((sum, file) => sum + file.size, 0)
  }, [pdfFiles])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Add PDFs',
      onClick: handleUploadClick,
      title: 'Add PDF files'
    },
    {
      icon: <Download size={16} />,
      label: isMerging ? 'Merging...' : 'Merge & Download',
      onClick: handleMerge,
      disabled: pdfFiles.length < 2 || isMerging || isValidating,
      title: 'Merge PDFs',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: pdfFiles.length === 0,
      title: 'Clear all files',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer dropzoneProps={{ getRootProps, getInputProps }}>
      <Toolbar left={toolbarButtons} />
      
      {error && <ErrorBar message={error} />}

      {isValidating && (
        <div className="pdf-validating-bar">
          <AlertCircle size={16} />
          <span>Validating PDF files...</span>
        </div>
      )}

      <div className="pdf-merger-content">
        {pdfFiles.length === 0 ? (
          <div className={`pdf-dropzone-area ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="pdf-dropzone-icon">
              <FileText size={48} strokeWidth={1.5} />
            </div>
            <p className="pdf-dropzone-text">
              {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files or click to browse'}
            </p>
            <p className="pdf-dropzone-hint">Select multiple PDF files to merge</p>
            <button
              type="button"
              className="pdf-dropzone-button"
              onClick={handleUploadClick}
            >
              <Upload size={16} />
              <span>Browse Files</span>
            </button>
          </div>
        ) : (
          <div className="pdf-files-list">
            <div className="pdf-files-header">
              <h3 className="pdf-files-title">
                PDF Files ({pdfFiles.length})
              </h3>
              <div className="pdf-files-stats">
                <span>{totalPages} pages</span>
                <span>•</span>
                <span>{formatFileSize(totalSize)}</span>
              </div>
            </div>

            <div className="pdf-files-grid">
              {/* Add More Button Card */}
              <button
                type="button"
                className="pdf-add-more-card"
                onClick={handleUploadClick}
                title="Add more PDF files"
              >
                <div className="pdf-add-more-icon">
                  <Upload size={32} strokeWidth={1.5} />
                </div>
                <span className="pdf-add-more-text">Add More Files</span>
                <span className="pdf-add-more-hint">Click or drag & drop</span>
              </button>
              {pdfFiles.map((pdfFile, index) => (
                <div
                  key={`${pdfFile.name}-${index}`}
                  className={`pdf-file-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="pdf-file-card-header">
                    <div className="pdf-file-drag-handle">
                      <GripVertical size={16} />
                    </div>
                    <button
                      type="button"
                      className="pdf-file-remove-btn"
                      onClick={() => handleRemove(index)}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="pdf-file-thumbnail">
                    {pdfFile.thumbnail ? (
                      <img 
                        src={pdfFile.thumbnail} 
                        alt={pdfFile.name}
                        onError={(e) => {
                          // If image fails to load, show placeholder
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const placeholder = target.parentElement?.querySelector('.pdf-file-thumbnail-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.display = 'flex'
                        }}
                      />
                    ) : (
                      <div className="pdf-file-thumbnail-placeholder">
                        <FileText size={32} />
                        <span className="pdf-thumbnail-loading">Generating...</span>
                      </div>
                    )}
                  </div>
                  <div className="pdf-file-card-info">
                    <span className="pdf-file-card-name" title={pdfFile.name}>
                      {pdfFile.name}
                    </span>
                    <span className="pdf-file-card-meta">
                      {pdfFile.pages || 0} pages • {formatFileSize(pdfFile.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pdf-merge-info">
              <Check size={16} />
              <span>Ready to merge {pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''} into one document</span>
            </div>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default PdfMerger

