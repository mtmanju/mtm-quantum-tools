/**
 * Route constants for the application - Clean URLs (no hash)
 */

export const ROUTES = {
  HOME: '/',
  TOOLS: '/tools',
  ABOUT: '/about',
  TOOL: (toolId: string) => `/tool/${toolId}`,
} as const

export type ViewType = 'home' | 'tools' | 'about' | 'tool'

export const getViewType = (pathname: string): ViewType => {
  if (pathname === '/tools') return 'tools'
  if (pathname === '/about') return 'about'
  if (pathname.startsWith('/tool/')) return 'tool'
  return 'home'
}

export const getToolId = (pathname: string): string | null => {
  if (pathname.startsWith('/tool/')) {
    return pathname.replace('/tool/', '')
  }
  return null
}

