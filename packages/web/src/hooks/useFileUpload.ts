import { useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

interface UseFileUploadOptions {
  onFileRead: (content: string) => void
  onError?: (error: string) => void
  accept?: Record<string, string[]>
  multiple?: boolean
}

export const useFileUpload = ({
  onFileRead,
  onError,
  accept,
  multiple = false
}: UseFileUploadOptions) => {
  /**
   * Which read is current.
   *
   * `FileReader` results arrive in completion order, not request order, so two
   * reads in flight race: drop a 40 MB file and then a 2 KB one before the
   * first finishes, and the small file resolves first, then the large one
   * overwrites it. The editor ends up showing the file the user *abandoned*,
   * with nothing to indicate it happened — and every subsequent action operates
   * on the wrong document. Around twenty tools use this hook.
   *
   * Each read claims a token; a result is only delivered if its token is still
   * the current one. The same counter is bumped on unmount, so a read that
   * lands after the component is gone cannot call setState either.
   */
  const readToken = useRef(0)
  const activeReader = useRef<FileReader | null>(null)

  useEffect(
    () => () => {
      readToken.current++
      activeReader.current?.abort()
    },
    []
  )

  const readFile = useCallback(
    (file: File) => {
      const token = ++readToken.current
      // Stop the previous read rather than leaving it to finish and be discarded.
      activeReader.current?.abort()

      const reader = new FileReader()
      activeReader.current = reader

      reader.onload = e => {
        if (token !== readToken.current) return
        onFileRead(e.target?.result as string)
      }
      reader.onerror = () => {
        if (token !== readToken.current) return
        onError?.('Failed to read file')
      }
      reader.readAsText(file)
    },
    [onFileRead, onError]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) readFile(file)
    },
    [readFile]
  )

  const dropzone = useDropzone({
    onDrop,
    accept,
    multiple,
    noClick: true
  })

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'

    if (accept) {
      const extensions = Object.values(accept).flat().join(',')
      input.accept = extensions
    }

    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) readFile(file)
    }
    input.click()
  }, [accept, readFile])

  return {
    ...dropzone,
    handleUploadClick
  }
}
