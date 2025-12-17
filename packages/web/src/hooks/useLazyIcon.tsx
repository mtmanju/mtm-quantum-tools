import type { LucideIcon } from 'lucide-react'
import { memo, useEffect, useState } from 'react'

interface UseLazyIconResult {
  Icon: LucideIcon | null
  loading: boolean
}

// Cache for loaded icons to avoid re-importing
const iconCache = new Map<string, LucideIcon>()
let iconsModulePromise: Promise<any> | null = null

/**
 * Preload the lucide-react module (only once)
 */
const loadIconsModule = async () => {
  if (!iconsModulePromise) {
    iconsModulePromise = import('lucide-react')
  }
  return iconsModulePromise
}

/**
 * Hook to lazy load lucide-react icons
 * Only loads the icon library once, caches individual icons
 */
export const useLazyIcon = (iconName: string): UseLazyIconResult => {
  const [Icon, setIcon] = useState<LucideIcon | null>(iconCache.get(iconName) || null)
  const [loading, setLoading] = useState(!iconCache.has(iconName))

  useEffect(() => {
    // If icon is already cached, skip loading
    if (iconCache.has(iconName)) {
      return
    }

    let cancelled = false

    const loadIcon = async () => {
      try {
        const icons = await loadIconsModule()
        const icon = (icons as any)[iconName] as LucideIcon
        
        if (!cancelled && icon) {
          iconCache.set(iconName, icon)
          setIcon(() => icon)
          setLoading(false)
        }
      } catch (error) {
        console.error(`Failed to load icon: ${iconName}`, error)
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadIcon()

    return () => {
      cancelled = true
    }
  }, [iconName])

  return { Icon, loading }
}

/**
 * Component that renders a lazy-loaded icon
 */
export const LazyIcon = memo(({ name, size = 24 }: { name: string; size?: number }) => {
  const { Icon, loading } = useLazyIcon(name)

  if (loading || !Icon) {
    return <div style={{ width: size, height: size, display: 'inline-block' }} />
  }

  return <Icon size={size} />
})

LazyIcon.displayName = 'LazyIcon'

