import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scroll to the element named by the URL hash.
 *
 * The browser does this for you on a normal document load, but not for a
 * client-side route change: React Router updates `location.hash` without
 * touching the scroll position, so `/about#privacy` would land at the top of
 * the About page with the hash sitting uselessly in the address bar.
 *
 * The target's own `scroll-margin-top` keeps it clear of the sticky header,
 * so the offset lives in CSS next to the header height rather than as a
 * magic number here.
 */
export function useHashScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return

    // After paint: on a fresh navigation the target's route has only just
    // rendered, so querying synchronously would find nothing.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(hash.slice(1))
      if (!el) return
      el.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    })

    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])
}
