import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
// Bundle the worker locally. It used to be fetched from unpkg.com, which
// disclosed every PDF user's IP to a third party — directly contradicting the
// site's "your data never leaves your browser" promise — and hard-failed all
// six PDF tools whenever unpkg was blocked (corporate proxies) or unreachable.
// Vite rewrites this to a hashed asset in the build output.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url'

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker
}

export interface PdfFile {
  file: File
  name: string
  size: number
  pages?: number
  thumbnail?: string
}

/**
 * Merges multiple PDF files into a single PDF document
 */
export const mergePdfs = async (files: PdfFile[]): Promise<Uint8Array> => {
  if (files.length === 0) {
    throw new Error('No PDF files provided')
  }

  const mergedPdf = await PDFDocument.create()

  for (const pdfFile of files) {
    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      
      pages.forEach((page) => {
        mergedPdf.addPage(page)
      })
    } catch (error) {
      throw new Error(`Failed to process ${pdfFile.name}: ${error instanceof Error ? error.message : "Unknown error"}`, { cause: error })
    }
  }

  return await mergedPdf.save()
}

/**
 * Validates if a file is a valid PDF
 */
export const validatePdf = async (file: File): Promise<boolean> => {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return false
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    return pdf.getPageCount() > 0
  } catch {
    return false
  }
}

/**
 * Gets the number of pages in a PDF file
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    return pdf.getPageCount()
  } catch {
    return 0
  }
}

/**
 * Generates a thumbnail from the first page of a PDF
 */
export const generatePdfThumbnail = async (file: File, width: number = 200): Promise<string> => {
  try {
    // Ensure worker is configured before any operations
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker
    }

    const arrayBuffer = await file.arrayBuffer()
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0, // Suppress warnings
      useSystemFonts: true
    })
    
    const pdf = await loadingTask.promise
    
    if (pdf.numPages === 0) {
      console.warn('PDF has no pages:', file.name)
      return ''
    }
    
    // Get first page
    const page = await pdf.getPage(1)

    // Calculate scale to fit width
    const viewport = page.getViewport({ scale: 1.0 })
    const scale = Math.min(width / viewport.width, 2.0) // Max 2x scale
    const scaledViewport = page.getViewport({ scale })

    // Create canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      throw new Error('Could not get canvas context')
    }

    canvas.height = Math.ceil(scaledViewport.height)
    canvas.width = Math.ceil(scaledViewport.width)

    // Fill white background
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Render PDF page
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
      canvas: canvas
    }
    
    await page.render(renderContext).promise

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png', 0.95)
    
    // Clean up.
    //
    // pdf.js 6 removed PDFDocumentProxy.destroy(); teardown lives on the
    // loading task, which is the stronger call anyway — it aborts any
    // outstanding requests *and* terminates the worker, where the old method
    // only released the document. Left undestroyed, each thumbnail leaks a
    // worker, and the PDF tools generate one per file.
    await loadingTask.destroy()

    return dataUrl
  } catch (error) {
    console.error('Error generating PDF thumbnail for', file.name, ':', error)
    // Return empty string on error - component will show placeholder
    return ''
  }
}

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Splits a PDF into multiple PDFs based on page ranges
 */
export const splitPdf = async (file: File, pageRanges: Array<{ start: number; end: number; name: string }>): Promise<Array<{ name: string; data: Uint8Array }>> => {
  if (pageRanges.length === 0) {
    throw new Error('No page ranges provided')
  }

  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer)
  const totalPages = sourcePdf.getPageCount()

  const results: Array<{ name: string; data: Uint8Array }> = []

  for (const range of pageRanges) {
    if (range.start < 1 || range.end > totalPages || range.start > range.end) {
      throw new Error(`Invalid page range: ${range.start}-${range.end} (PDF has ${totalPages} pages)`)
    }

    const newPdf = await PDFDocument.create()
    const pageIndices = Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start - 1 + i)
    const pages = await newPdf.copyPages(sourcePdf, pageIndices)
    
    pages.forEach((page) => {
      newPdf.addPage(page)
    })

    const pdfBytes = await newPdf.save()
    results.push({
      name: range.name,
      data: pdfBytes
    })
  }

  return results
}

/**
 * Splits a PDF into individual pages
 */
export const splitPdfByPages = async (file: File): Promise<Array<{ name: string; data: Uint8Array }>> => {
  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer)
  const totalPages = sourcePdf.getPageCount()

  const results: Array<{ name: string; data: Uint8Array }> = []
  const baseName = file.name.replace(/\.pdf$/i, '')

  for (let i = 1; i <= totalPages; i++) {
    const newPdf = await PDFDocument.create()
    const [page] = await newPdf.copyPages(sourcePdf, [i - 1])
    newPdf.addPage(page)

    const pdfBytes = await newPdf.save()
    results.push({
      name: `${baseName}_page_${i}.pdf`,
      data: pdfBytes
    })
  }

  return results
}

