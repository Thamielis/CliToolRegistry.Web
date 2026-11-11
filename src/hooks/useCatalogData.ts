import { useEffect, useState } from 'react'
import {
  loadToolCatalog,
  readCatalogCache,
  writeCatalogCache,
} from '../data/loadApps'
import type { CatalogSnapshot } from '../types/app'

interface CatalogState {
  snapshot: CatalogSnapshot | null
  baseline: CatalogSnapshot | null
}

export function useCatalogData() {
  const [catalog, setCatalog] = useState<CatalogState>(() => {
    const cached = readCatalogCache()
    return { snapshot: cached, baseline: cached }
  })
  const [cacheWriteFailed, setCacheWriteFailed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let mounted = true
    setIsLoading(true)

    loadToolCatalog()
      .then((nextSnapshot) => {
        if (!mounted) return
        setCacheWriteFailed(!writeCatalogCache(nextSnapshot))
        setCatalog((current) => ({ snapshot: nextSnapshot, baseline: current.snapshot ?? current.baseline }))
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!mounted) return
        setLoadError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [attempt])

  const refresh = () => {
    if (isLoading) return
    setLoadError(null)
    setAttempt((current) => current + 1)
  }

  const setBaseline = () => setCatalog((current) => ({ ...current, baseline: current.snapshot }))

  return {
    snapshot: catalog.snapshot,
    baseline: catalog.baseline,
    cacheWriteFailed,
    isLoading,
    loadError,
    refresh,
    setBaseline,
  }
}
