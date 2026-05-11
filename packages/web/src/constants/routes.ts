/**
 * Route constants for the application - Clean URLs (no hash)
 * The root path serves as the tools landing — there is no separate home page.
 */

export const ROUTES = {
  HOME: '/',
  TOOLS: '/',           // alias for backwards compat
  ABOUT: '/about',
  TOOL: (toolId: string) => `/tool/${toolId}`,
} as const

export type ViewType = 'tools' | 'about' | 'tool'

export const getViewType = (pathname: string): ViewType => {
  if (pathname === '/about') return 'about'
  if (pathname.startsWith('/tool/')) return 'tool'
  return 'tools'        // '/', '/tools', or any other path → tools listing
}

export const getToolId = (pathname: string): string | null => {
  if (pathname.startsWith('/tool/')) {
    return pathname.replace('/tool/', '')
  }
  return null
}

