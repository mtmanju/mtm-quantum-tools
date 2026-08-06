import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

// Ensure root element exists
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// Drop the pre-hydration skeleton from index.html before React takes over the
// root, so it can't flash alongside real content.
document.getElementById('boot-skeleton')?.remove()

/**
 * After a redeploy, an open tab still holds the old index.html and will request
 * hashed chunks that no longer exist. Vite raises `vite:preloadError`; without
 * this handler the lazy import rejects and the root ErrorBoundary replaces the
 * entire app — header, nav and all — with a dead "Something went wrong" screen.
 * Reloading once picks up the new manifest.
 */
window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  if (sessionStorage.getItem('chunk-reloaded') === '1') return // don't loop
  sessionStorage.setItem('chunk-reloaded', '1')
  window.location.reload()
})
window.addEventListener('load', () => sessionStorage.removeItem('chunk-reloaded'))

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
