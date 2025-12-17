import { useState, useEffect } from 'react'

/**
 * Custom hook to track scroll position
 * Returns true when scrolled past threshold
 */
export const useScrollPosition = (threshold = 10): boolean => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > threshold)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}

