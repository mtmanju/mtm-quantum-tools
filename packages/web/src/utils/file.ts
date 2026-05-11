/**
 * File download utilities
 * Reusable functions for downloading files across all tools
 */

/**
 * Triggers a file download via a temporary anchor element.
 * Delays URL revocation so the browser has time to start the download —
 * calling revokeObjectURL synchronously after click() can silently cancel
 * the download before it begins (especially from async handlers).
 */
function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: false, view: window }))
  document.body.removeChild(a)
  // 60 s grace period — revoking synchronously causes silent download failures
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

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
  triggerDownload(URL.createObjectURL(blob), filename)
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
    // Re-wrap with the explicit MIME type when provided, since Packer.toBlob
    // and similar libraries may omit or set a generic type.
    blob = mimeType ? new Blob([content], { type: mimeType }) : content
  } else {
    const bytes = new Uint8Array(content.length)
    bytes.set(content)
    blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' })
  }

  triggerDownload(URL.createObjectURL(blob), filename)
}

