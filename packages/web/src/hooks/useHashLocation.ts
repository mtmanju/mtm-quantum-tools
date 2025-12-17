import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for hash-based routing
 * Provides current hash and navigation function
 */
export const useHashLocation = () => {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((newHash: string) => {
    const hashValue = newHash.startsWith('#') ? newHash : `#${newHash}`
    window.location.hash = hashValue === '#' ? '' : hashValue
  }, [])

  return { hash, navigate }
}

