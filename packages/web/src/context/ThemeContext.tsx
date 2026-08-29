import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Theme } from '../constants/theme'
import { COLORS } from '../constants/theme'
import { ThemeContext, type ThemeContextType } from './theme-context'
import { readStorage, writeStorage } from '../utils/safeStorage'

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from localStorage or system preference.
    //
    // This runs during render of a provider that wraps the entire tree, so an
    // unguarded read here is the worst possible place for one: with the browser
    // set to block site data, `localStorage` throws `SecurityError`, the root
    // error boundary catches it, and its "Reload Page" button re-runs this
    // exact line — a permanently dead app rather than a one-time failure.
    //
    // The stored value is also validated rather than asserted: `as Theme` would
    // let any string a previous version (or a hand edit) left behind become the
    // theme, and `data-theme="purple"` matches no stylesheet.
    const savedTheme = readStorage('theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  const isDarkMode = theme === 'dark'
  const colors = isDarkMode ? COLORS.dark : COLORS.light

  // Update theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    writeStorage('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [])

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [theme, setTheme])

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!readStorage('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [setTheme])

  const value: ThemeContextType = {
    theme,
    isDarkMode,
    colors,
    toggleTheme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}


