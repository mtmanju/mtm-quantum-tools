import { useState, useCallback, useMemo } from 'react'

interface UsePaginationOptions {
  initialPageSize?: number
  maxPageSize?: number
}

interface UsePaginationReturn<T> {
  currentItems: T[]
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasMore: boolean
  hasPrevious: boolean
  showAll: boolean
  loadMore: () => void
  loadAll: () => void
  reset: () => void
  setPageSize: (size: number) => void
}

export const usePagination = <T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> => {
  const { initialPageSize = 12, maxPageSize = 1000 } = options

  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [showAll, setShowAll] = useState(false)

  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const currentItems = useMemo(() => {
    if (showAll) {
      return items
    }
    return items.slice(0, pageSize)
  }, [items, pageSize, showAll])

  const hasMore = !showAll && pageSize < totalItems
  const hasPrevious = false // For now, we only support "load more" style pagination

  const loadMore = useCallback(() => {
    setPageSizeState(prev => Math.min(prev + initialPageSize, totalItems))
  }, [initialPageSize, totalItems])

  const loadAll = useCallback(() => {
    setShowAll(true)
    setPageSizeState(totalItems)
  }, [totalItems])

  const reset = useCallback(() => {
    setPageSizeState(initialPageSize)
    setShowAll(false)
  }, [initialPageSize])

  const setPageSize = useCallback((size: number) => {
    const clampedSize = Math.min(Math.max(size, 1), maxPageSize)
    setPageSizeState(clampedSize)
    setShowAll(false)
  }, [maxPageSize])

  return {
    currentItems,
    currentPage: 1,
    pageSize,
    totalPages,
    totalItems,
    hasMore,
    hasPrevious,
    showAll,
    loadMore,
    loadAll,
    reset,
    setPageSize
  }
}

