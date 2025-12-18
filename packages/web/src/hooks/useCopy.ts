import { useState, useCallback } from 'react'

export const useCopy = () => {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string, onError?: (error: string) => void) => {
    if (!text) return false

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch (error) {
      onError?.('Failed to copy to clipboard')
      return false
    }
  }, [])

  return { copied, copy }
}

