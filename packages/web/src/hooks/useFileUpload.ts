import { useCallback } from 'react'
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
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        onFileRead(text)
      }
      reader.onerror = () => {
        onError?.('Failed to read file')
      }
      reader.readAsText(file)
    }
  }, [onFileRead, onError])

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
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const text = event.target?.result as string
          onFileRead(text)
        }
        reader.onerror = () => {
          onError?.('Failed to read file')
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [accept, onFileRead, onError])

  return {
    ...dropzone,
    handleUploadClick
  }
}

