import { useContext } from 'react'
import { ThemeContext } from './theme-context'

/**
 * Lives apart from ThemeProvider because a module that exports both a
 * component and a non-component breaks React Fast Refresh.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
