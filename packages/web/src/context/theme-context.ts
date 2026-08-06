import { createContext } from 'react'
import type { Theme } from '../constants/theme'
import type { COLORS } from '../constants/theme'

export interface ThemeContextType {
  theme: Theme
  isDarkMode: boolean
  colors: typeof COLORS.light | typeof COLORS.dark
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

/**
 * The context object lives here, apart from the provider component, so that
 * ThemeContext.tsx exports only a component — a module exporting both breaks
 * React Fast Refresh.
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
