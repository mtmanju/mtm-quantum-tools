/**
 * Route constants for the application
 */

export const ROUTES = {
  HOME: '',
  ABOUT: '#about',
  TOOL: (toolId: string) => `#tool/${toolId}`,
} as const

export type ViewType = 'home' | 'about' | 'tool'

export const getViewType = (hash: string): ViewType => {
  if (hash === '#about') return 'about'
  if (hash.startsWith('#tool/')) return 'tool'
  return 'home'
}

export const getToolId = (hash: string): string | null => {
  if (hash.startsWith('#tool/')) {
    return hash.replace('#tool/', '')
  }
  return null
}

