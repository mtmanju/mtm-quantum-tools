/**
 * File download utilities
 * Reusable functions for downloading files across all tools
 */

/**
 * Downloads text content as a file
 */
export const downloadTextFile = (
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void => {
  if (!content || !filename) return

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Downloads binary content as a file
 */
export const downloadBinaryFile = (
  content: Uint8Array | Blob,
  filename: string,
  mimeType?: string
): void => {
  if (!content || !filename) return

  let blob: Blob
  if (content instanceof Blob) {
    blob = content
  } else {
    // Create a new Uint8Array to ensure proper type compatibility
    const bytes = new Uint8Array(content.length)
    bytes.set(content)
    blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' })
  }
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

