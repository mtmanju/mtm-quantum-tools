# Architecture & Design Patterns

## Overview

This application follows modern React best practices with a focus on maintainability, scalability, and performance.

## Project Structure

```
packages/web/src/
├── components/          # Reusable UI components
│   ├── Header.tsx       # Main navigation header
│   ├── Header.css       # Header-specific styles
│   ├── Footer.tsx       # Application footer
│   └── Footer.css       # Footer-specific styles
├── constants/           # Application constants
│   ├── theme.ts         # Design tokens and theme values
│   └── routes.ts        # Route constants and utilities
├── context/             # React Context providers
│   └── ThemeContext.tsx # Theme management context
├── hooks/               # Custom React hooks
│   ├── useHashLocation.ts  # Hash-based routing
│   └── useScrollPosition.ts # Scroll position tracking
├── pages/               # Page components
│   ├── About.tsx        # About page
│   └── About.css        # About page styles
├── tools/               # Tool components (lazy loaded)
│   └── MarkdownConverter.tsx
├── App.tsx              # Main application component
├── App.css              # Global application styles
└── main.tsx             # Application entry point
```

## Design Patterns

### 1. **Component Architecture**

#### Container/Presentational Pattern
- **Container components** handle logic and state (e.g., `App.tsx`)
- **Presentational components** focus on UI (e.g., `Header`, `Footer`)

#### Composition Pattern
- Components are composed together rather than deeply nested
- Promotes reusability and testability

### 2. **State Management**

#### Context API
- `ThemeContext` provides global theme state
- Avoids prop drilling
- Centralized theme logic

```typescript
const { theme, isDarkMode, toggleTheme } = useTheme()
```

#### Local State
- Component-specific state uses `useState`
- Keeps state close to where it's used

### 3. **Performance Optimizations**

#### Code Splitting & Lazy Loading
```typescript
const MarkdownConverter = lazy(() => import('./tools/MarkdownConverter'))
const About = lazy(() => import('./pages/About'))
```

#### Memoization
- `useMemo` for expensive computations
- `useCallback` for stable function references
- `memo` for component memoization

```typescript
const filteredTools = useMemo(() => {
  // Expensive filtering operation
}, [searchQuery, tools])
```

#### Request Animation Frame
- Scroll handlers use RAF for better performance
- Debounces scroll events

### 4. **Custom Hooks**

Custom hooks encapsulate reusable logic:

- **`useTheme()`** - Theme management
- **`useHashLocation()`** - Hash-based routing
- **`useScrollPosition()`** - Scroll detection

### 5. **Constants & Design Tokens**

#### Centralized Theme Values
```typescript
// constants/theme.ts
export const COLORS = {
  light: {
    background: { primary: '#FFFFFF', ... },
    text: { primary: '#000000', ... },
    accent: { primary: '#000000', onAccent: '#FFFFFF' },
  },
  dark: { ... }
}
```

Benefits:
- Single source of truth
- Type safety with TypeScript
- Easy theme maintenance
- Consistent design system

### 6. **Routing Pattern**

#### Hash-Based Routing
- Uses browser hash for client-side routing
- No server configuration needed
- `ROUTES` constant for route management

```typescript
export const ROUTES = {
  HOME: '',
  ABOUT: '#about',
  TOOL: (toolId: string) => `#tool/${toolId}`,
}
```

### 7. **CSS Architecture**

#### Component-Scoped Styles
- Each component has its own CSS file
- Prevents style leakage
- Easier to maintain

#### CSS Variables
- Theme colors use CSS custom properties
- Enables dynamic theming
- Fallback support

```css
color: var(--text-primary);
background: var(--bg-secondary);
```

### 8. **Type Safety**

#### TypeScript Throughout
```typescript
interface Tool {
  id: string
  name: string
  description: string
  icon: ReactElement
  category: string
  status: 'active' | 'coming-soon'
  component?: ComponentType
  featured?: boolean
}
```

## Best Practices Implemented

### 1. **Separation of Concerns**
- Logic separated from presentation
- Hooks encapsulate reusable logic
- Components have single responsibilities

### 2. **DRY (Don't Repeat Yourself)**
- Constants file eliminates magic strings/values
- Reusable components and hooks
- Utility functions for common operations

### 3. **Accessibility**
- Semantic HTML
- ARIA labels on interactive elements
- Theme-aware color contrast
- Reduced motion support

### 4. **Responsive Design**
- Mobile-first approach
- Breakpoints in constants
- Flexible layouts with CSS Grid/Flexbox

### 5. **Error Boundaries**
- Suspense fallbacks for lazy-loaded components
- Loading states for async operations

## Theme System

### How It Works

1. **Provider Setup** (`main.tsx`)
```typescript
<ThemeProvider>
  <App />
</ThemeProvider>
```

2. **Context Hook** (Any component)
```typescript
const { isDarkMode, toggleTheme, colors } = useTheme()
```

3. **Automatic Persistence**
- Saves to localStorage
- Respects system preferences
- Applies on mount

### Color Philosophy

- **Light theme**: Black accent (#000000) with white text on accent
- **Dark theme**: White accent (#FFFFFF) with black text on accent
- Ensures consistent contrast ratios (WCAG AA compliant)

## Performance Metrics

### Optimizations Applied

1. **Bundle Splitting**
   - Tools lazy-loaded on demand
   - Reduces initial bundle size

2. **Memoization**
   - Prevents unnecessary re-renders
   - Optimizes expensive calculations

3. **Event Throttling**
   - RAF for scroll handlers
   - Passive event listeners

4. **CSS Optimization**
   - `will-change` for animated elements
   - Hardware acceleration hints

## Adding New Features

### Adding a New Tool

1. Create tool component in `tools/`
2. Add lazy import in `App.tsx`
3. Add tool definition to `tools` array
4. Component automatically appears in grid

### Adding a New Theme

1. Add colors to `constants/theme.ts`
2. Add CSS variables in `App.css`
3. Theme system handles the rest

### Adding a New Route

1. Add route constant to `constants/routes.ts`
2. Update `getViewType` function
3. Add route handling in `App.tsx`

## Testing Strategy (Future)

- Unit tests for utilities and hooks
- Component tests with React Testing Library
- E2E tests with Playwright
- Visual regression tests

## Future Improvements

- [ ] Move to CSS-in-JS or CSS Modules
- [ ] Add animation library (Framer Motion)
- [ ] Implement proper routing (React Router)
- [ ] Add state management (Zustand/Jotai)
- [ ] PWA support
- [ ] Internationalization (i18n)

