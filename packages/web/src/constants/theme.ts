/**
 * Design Tokens and Theme Constants
 * Central source of truth for all design values
 */

export const COLORS = {
  light: {
    background: {
      primary: '#FFFFFF',
      secondary: '#FAFAFA',
      elevated: '#FFFFFF',
      hover: '#F5F5F5',
    },
    text: {
      primary: '#000000',
      secondary: '#6B6B6B',
      tertiary: '#9B9B9B',
      muted: '#C0C0C0',
    },
    accent: {
      primary: '#000000',
      hover: '#333333',
      light: 'rgba(0, 0, 0, 0.05)',
      glow: 'rgba(0, 0, 0, 0.1)',
      // Text color on accent backgrounds
      onAccent: '#FFFFFF',
    },
    border: {
      subtle: '#E8E8E8',
      medium: '#D0D0D0',
      focus: '#000000',
    },
    status: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
  },
  dark: {
    background: {
      primary: '#0A0A0A',
      secondary: '#111111',
      elevated: '#1A1A1A',
      hover: '#1F1F1F',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A0A0A0',
      tertiary: '#707070',
      muted: '#505050',
    },
    accent: {
      primary: '#FFFFFF',
      hover: '#E0E0E0',
      light: 'rgba(255, 255, 255, 0.08)',
      glow: 'rgba(255, 255, 255, 0.12)',
      // Text color on accent backgrounds
      onAccent: '#000000',
    },
    border: {
      subtle: '#252525',
      medium: '#333333',
      focus: '#FFFFFF',
    },
    status: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
  },
} as const

export const SHADOWS = {
  light: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.02)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px rgba(0, 0, 0, 0.06)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
    hover: '0 12px 32px -8px rgba(0, 0, 0, 0.12)',
    xl: '0 20px 48px -12px rgba(0, 0, 0, 0.15)',
  },
  dark: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
    hover: '0 12px 32px -8px rgba(0, 0, 0, 0.7)',
    xl: '0 20px 48px -12px rgba(0, 0, 0, 0.8)',
  },
} as const

export const SPACING = {
  containerWidth: '1440px',
  headerHeight: '72px',
  sectionSpacing: '8rem',
} as const

export const TYPOGRAPHY = {
  fontFamily: {
    primary: "'Aptos', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const ANIMATION = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1440px',
} as const

export type Theme = 'light' | 'dark'
export type ThemeColors = typeof COLORS.light | typeof COLORS.dark

