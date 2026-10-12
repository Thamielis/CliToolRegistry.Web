import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import './explorer.css'
import {
  CATALOG_REPOSITORY_URL,
  CATALOG_SOURCE_URL,
  loadToolCatalog,
  readCatalogCache,
  writeCatalogCache,
} from './data/loadApps'
import { useLocale } from './i18n/LocaleContext'
import { LocaleSwitcher } from './components/LocaleSwitcher'
import { ToolTable } from './components/ToolTable'
import { ToolDetails } from './components/ToolDetails'
import { ToolCards } from './components/ToolCards'
import { ThemeToggle } from './components/ThemeToggle'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { categoryLabel, platformLabel } from './i18n/catalogLabels'
import type { CatalogSnapshot, CliTool, ToolPlatform } from './types/app'
import {
  applyNavigationPatch,
  createNavigationTicket,
  navigationUrl,
  parseNavigation,
  readWorkbenchHistoryData,
  SECTIONS,
  withWorkbenchHistoryData,
  type NavigationState,
  type Section,
  type WorkbenchHistoryData,
} from './data/workbench'
import { CommandPalette } from './components/CommandPalette'
import { sectionLabels as SECTION_LABELS } from './i18n/translations'
import { WorkbenchOverview, WorkbenchGuide } from './components/WorkbenchOverview'
import { ScreenBoundary } from './components/ScreenBoundary'
import { createExplorerLoader, type ExplorerLoadError, type ExplorerLoader } from './data/loadExplorer'
import type { ExplorerManifest } from './types/explorer'
import { transitionExplorerNavigation, type ExplorerNavigationAction } from './data/workbench'
import { explorerRegistry } from './data/explorerRegistry'

const DependencyExplorer = lazy(() => import('./components/DependencyExplorer'))
const CatalogLab = lazy(() => import('./components/CatalogLab'))
const ToolExplorer = lazy(() => import('./components/ToolExplorer'))

const PLATFORMS: ToolPlatform[] = ['windows', 'linux', 'wsl2', 'macos']
const EMPTY_TOOLS: CatalogSnapshot['tools'] = []
const VIEW_STORAGE_KEY = 'cli-tool-registry.view'

type FocusTarget = 'heading' | 'entry' | 'trigger' | 'more' | null
type HistoryMemory = Pick<WorkbenchHistoryData, 'scrollY' | 'focusKey'>
type NavigationRuntime = {
  cause: 'initial' | 'push' | 'replace' | 'pop'
  historyId: string
  ticket: string
  focusTarget: FocusTarget
  restorePoint: HistoryMemory | null
  consumed: boolean
}

type ManifestState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: ExplorerManifest }
  | { status: 'error'; error: ExplorerLoadError }

function newHistoryId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function currentFocusKey(section: Section): string | null {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!active) return null
  const owner = active.closest<HTMLElement>('[data-history-focus-key]')
  if (owner?.dataset.historyFocusKey) return owner.dataset.historyFocusKey
  if (active.id === 'screen-heading') {
    const key = `screen:${section}`
    active.dataset.historyFocusKey = key
    return key
  }
  if (active.id.startsWith('tool-details-heading-')) {
    const key = `tool-details:${active.id.slice('tool-details-heading-'.length)}`
    active.dataset.historyFocusKey = key
    return key
  }
  return null
}

function locateFocusKey(key: string | null): HTMLElement | null {
  if (!key) return null
  return Array.from(document.querySelectorAll<HTMLElement>('[data-history-focus-key]'))
    .find((element) => element.dataset.historyFocusKey === key) ?? null
}

function NavigationReadySignal({ ticket, onReady }: { ticket: string; onReady: (ticket: string) => void }) {
  const callback = useRef(onReady)
  callback.current = onReady
  useLayoutEffect(() => callback.current(ticket), [ticket])
  return null
}

function initialView(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return saved === 'card' || saved === 'list' || saved === 'enhanced' ? saved : 'enhanced'
  } catch {
    return 'enhanced'
  }
}

function App() {
  const { locale, t } = useLocale()
  const [catalog, setCatalog] = useState(() => { const cached = readCatalogCache(); return { snapshot: cached, baseline: cached } })
  const { snapshot, baseline } = catalog
  const [cacheWriteFailed, setCacheWriteFailed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [navigation, setNavigation] = useState(() => parseNavigation(window.location.search, initialView()))
  const { query, platform, category, view, tool: selectedToolId, section, sort, count } = navigation
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigationRef = useRef(navigation)
  const searchRef = useRef<HTMLInputElement>(null)
  const detailsTrigger = useRef<HTMLButtonElement | null>(null)
  const [initialHistory] = useState<WorkbenchHistoryData>(() => readWorkbenchHistoryData(window.history.state) ?? {
    historyId: newHistoryId(), scrollY: Math.max(0, window.scrollY), focusKey: null,
  })
  const historyIdRef = useRef(initialHistory.historyId)
  const navigationSequenceRef = useRef(0)
  const historyMemoryRef = useRef(new Map<string, HistoryMemory>([[initialHistory.historyId, {
    scrollY: initialHistory.scrollY, focusKey: initialHistory.focusKey,
  }]]))
  const transitionRef = useRef<NavigationRuntime>({
    cause: 'initial', historyId: initialHistory.historyId,
    ticket: createNavigationTicket(initialHistory.historyId, 0), focusTarget: null, restorePoint: null, consumed: false,
  })
  const previousScrollRestoration = useRef<ScrollRestoration>('auto')
  const captureTimer = useRef<number | undefined>(undefined)
  const lastCanonicalizedUrl = useRef<string | null>(null)
  const explorerLoader = useMemo<ExplorerLoader>(() => createExplorerLoader({ baseUrl: import.meta.env.BASE_URL }), [])
  const [explorerManifest, setExplorerManifest] = useState<ManifestState>({ status: 'loading' })
  const manifestRequestRef = useRef(0)

  const runManifestLoad = useCallback(async (refresh = false) => {
    const requestId = ++manifestRequestRef.current
    setExplorerManifest({ status: 'loading' })
    const result = await explorerLoader.loadManifest({ refresh })
    if (requestId !== manifestRequestRef.current) return
    if (result.status === 'ready') setExplorerManifest({ status: 'ready', manifest: result.manifest })
    else if (result.status === 'error') setExplorerManifest({ status: 'error', error: result.error })
  }, [explorerLoader])

  const retryExplorerManifest = useCallback(() => { void runManifestLoad(true) }, [runManifestLoad])

  const captureHistoryMemory = (historyId = historyIdRef.current): HistoryMemory => {
    const memory = {
      scrollY: Number.isFinite(window.scrollY) ? Math.max(0, window.scrollY) : 0,
      focusKey: currentFocusKey(navigationRef.current.section),
    }
    historyMemoryRef.current.set(historyId, memory)
    return memory
  }

  const persistCurrentHistoryMemory = (url = window.location.href) => {
    const data: WorkbenchHistoryData = {
      historyId: historyIdRef.current,
      ...captureHistoryMemory(historyIdRef.current),
    }
    window.history.replaceState(withWorkbenchHistoryData(window.history.state, data), '', url)
  }

  const scheduleHistoryCapture = () => {
    const scheduledForId = historyIdRef.current
    if (captureTimer.current !== undefined) window.clearTimeout(captureTimer.current)
    captureTimer.current = window.setTimeout(() => {
      captureTimer.current = undefined
      if (historyIdRef.current === scheduledForId) captureHistoryMemory(scheduledForId)
    }, 80)
  }

  const commitNavigation = (next: NavigationState, cause: 'push' | 'replace', focusTarget: FocusTarget) => {
    const committedNavigation = { ...next, needsReplace: false }
    const url = navigationUrl(committedNavigation, window.location.href)
    let targetHistoryId = historyIdRef.current

    if (cause === 'push') {
      const currentData: WorkbenchHistoryData = {
        historyId: historyIdRef.current,
        ...captureHistoryMemory(historyIdRef.current),
      }
      window.history.replaceState(withWorkbenchHistoryData(window.history.state, currentData), '', window.location.href)
      targetHistoryId = newHistoryId()
      historyIdRef.current = targetHistoryId
      const targetData: WorkbenchHistoryData = { historyId: targetHistoryId, scrollY: 0, focusKey: null }
      window.history.pushState(withWorkbenchHistoryData(window.history.state, targetData), '', url)
      historyMemoryRef.current.set(targetHistoryId, { scrollY: 0, focusKey: null })
    } else {
      const currentData: WorkbenchHistoryData = {
        historyId: historyIdRef.current,
        ...captureHistoryMemory(historyIdRef.current),
      }
      window.history.replaceState(withWorkbenchHistoryData(window.history.state, currentData), '', url)
    }

    const ticket = createNavigationTicket(targetHistoryId, ++navigationSequenceRef.current)
    transitionRef.current = {
      cause, historyId: targetHistoryId, ticket,
      focusTarget: focusTarget ?? (committedNavigation.section !== navigationRef.current.section && cause === 'push' ? 'heading' : null),
      restorePoint: null,
      consumed: false,
    }
    navigationRef.current = committedNavigation
    setNavigation(committedNavigation)
  }

  const updateNavigation = (patch: Partial<NavigationState>, push = false, focusTarget: FocusTarget = null) => {
    const previous = navigationRef.current
    const next = applyNavigationPatch(previous, patch)
    const requestedFocus = focusTarget ?? (push && next.section !== previous.section ? 'heading' : null)
    commitNavigation(next, push ? 'push' : 'replace', requestedFocus)
  }

  const navigationReady = (ticket: string) => {
    const runtime = transitionRef.current
    if (runtime.ticket !== ticket || runtime.consumed) return

    const heading = document.getElementById('screen-heading') as HTMLElement | null
    if (heading) heading.dataset.historyFocusKey = `screen:${navigationRef.current.section}`
    const detailsHeading = document.querySelector<HTMLElement>('.tool-details h2')
    if (detailsHeading) detailsHeading.dataset.historyFocusKey = `tool-details:${selectedToolId ?? 'unknown'}`

    if (runtime.cause === 'push') {
      const target = runtime.focusTarget === 'entry'
        ? document.querySelector<HTMLElement>('[data-navigation-entry-heading]') ?? detailsHeading
        : runtime.focusTarget === 'heading' ? heading : null
      if (target) {
        target.focus({ preventScroll: true })
        if (runtime.focusTarget === 'heading') window.scrollTo({ top: 0, behavior: 'instant' })
        else target.scrollIntoView({ block: 'nearest' })
      }
    } else if (runtime.cause === 'pop') {
      const point = runtime.restorePoint ?? historyMemoryRef.current.get(runtime.historyId) ?? { scrollY: 0, focusKey: null }
      const target = locateFocusKey(point.focusKey) ?? document.getElementById('main-content') as HTMLElement | null ?? heading
      target?.focus({ preventScroll: true })
      window.scrollTo({ top: point.scrollY, behavior: 'instant' })
    }

    runtime.consumed = true
  }

  const setQuery = (next: string) => updateNavigation({ query: next, count: 48, tool: null })
  const setCategory = (next: string) => updateNavigation({ category: next, count: 48, tool: null })
  const setPlatform = (next: ToolPlatform | 'all') => updateNavigation({ platform: next, count: 48, tool: null })
  const navigate = (next: Section) => { updateNavigation({ section: next, tool: null }, true, 'heading') }
  const navHref = (next: Section) => navigationUrl(applyNavigationPatch(navigation, { section: next, tool: null }), window.location.href)
  const navClick = (event: MouseEvent<HTMLAnchorElement>, next: Section) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(next)
  }

  const explorerAction = (action: ExplorerNavigationAction) => {
    const transition = transitionExplorerNavigation(navigationRef.current, action)
    commitNavigation(transition.state, transition.cause, transition.focusTarget)
  }

  const patchExplorerNavigation = (patch: Partial<NavigationState>, cause: 'push' | 'replace' = 'replace') => {
    const next = applyNavigationPatch(navigationRef.current, patch)
    commitNavigation(next, cause, null)
  }

  const closeDetails = () => {
    updateNavigation({ tool: null })
    const trigger = detailsTrigger.current?.isConnected
      ? detailsTrigger.current
      : locateFocusKey(selectedToolId ? `tool-trigger:${selectedToolId}` : null)
    if (trigger) trigger.focus({ preventScroll: true })
    else document.getElementById('palette-trigger')?.focus({ preventScroll: true })
    persistCurrentHistoryMemory()
  }
  const selectTool = (tool: CliTool, trigger: HTMLButtonElement) => {
    detailsTrigger.current = trigger
    trigger.dataset.historyFocusKey = `tool-trigger:${tool.id}`
    const selecting = selectedToolId !== tool.id
    updateNavigation({ tool: selecting ? tool.id : null }, true, selecting ? 'entry' : 'trigger')
  }
  const changeView = (next: ViewMode) => {
    updateNavigation({ view: next, tool: null })
    try { localStorage.setItem(VIEW_STORAGE_KEY, next) } catch { /* View remains usable without storage. */ }
  }

  const revealTool = (id: string, trigger?: HTMLButtonElement) => {
    detailsTrigger.current = trigger ?? document.getElementById('palette-trigger') as HTMLButtonElement
    if (detailsTrigger.current) detailsTrigger.current.dataset.historyFocusKey = `tool-trigger:${id}`
    updateNavigation({ section: 'catalog', tool: id, query: id, category: 'all', platform: 'all', view: 'list', count: 48 }, true, 'entry')
  }

  useEffect(() => {
    const previous = window.history.scrollRestoration
    previousScrollRestoration.current = previous
    window.history.scrollRestoration = 'manual'
    const existingData = readWorkbenchHistoryData(window.history.state)
    const initialData = existingData ?? initialHistory
    historyIdRef.current = initialData.historyId
    historyMemoryRef.current.set(initialData.historyId, {
      scrollY: initialData.scrollY, focusKey: initialData.focusKey,
    })
    if (!existingData) {
      window.history.replaceState(withWorkbenchHistoryData(window.history.state, initialData), '', window.location.href)
    }

    const onPop = () => {
      const departedId = historyIdRef.current
      captureHistoryMemory(departedId)
      const next = parseNavigation(window.location.search, initialView())
      const saved = readWorkbenchHistoryData(window.history.state)
      const historyId = saved?.historyId ?? newHistoryId()
      const point = historyMemoryRef.current.get(historyId) ?? (saved
        ? { scrollY: saved.scrollY, focusKey: saved.focusKey }
        : { scrollY: Math.max(0, window.scrollY), focusKey: null })
      historyIdRef.current = historyId
      historyMemoryRef.current.set(historyId, point)
      const ticket = createNavigationTicket(historyId, ++navigationSequenceRef.current)
      transitionRef.current = {
        cause: 'pop', historyId, ticket, focusTarget: null,
        restorePoint: point, consumed: false,
      }
      navigationRef.current = next
      setNavigation(next)
    }
    const onKey = (event: KeyboardEvent) => {
      if (!event.isComposing && !event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
    }
    const onScrollOrFocus = () => scheduleHistoryCapture()
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrFocus, { passive: true })
    window.addEventListener('focusin', onScrollOrFocus)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrFocus)
      window.removeEventListener('focusin', onScrollOrFocus)
      if (captureTimer.current !== undefined) window.clearTimeout(captureTimer.current)
      window.history.scrollRestoration = previousScrollRestoration.current
    }
  }, [initialHistory])

  useEffect(() => {
    let screenTitle = t(SECTION_LABELS[section])
    if (section === 'explore') {
      const manifest = explorerManifest.status === 'ready' ? explorerManifest.manifest : null
      const toolId = navigation.exploreTool
      const datasets = manifest?.datasets.filter((dataset) => dataset.toolId === toolId) ?? []
      if (toolId && datasets.length > 0) {
        const toolName = catalog.snapshot?.tools.find((tool) => tool.id === toolId)?.name
          ?? explorerRegistry.tools.find((tool) => tool.toolId === toolId)?.fallbackName
          ?? toolId
        const selectedDataset = datasets.find((dataset) => dataset.datasetId === navigation.dataset)
        screenTitle = selectedDataset ? `${selectedDataset.title[locale]} · ${toolName}` : `${toolName} · ${t('navExplore')}`
      } else {
        screenTitle = t('exploreHeading')
      }
    }
    document.title = screenTitle + ' · CLI Tool Registry'
  }, [section, navigation.exploreTool, navigation.dataset, explorerManifest, catalog.snapshot, locale, t])

  useEffect(() => {
    if (section !== 'explore' || transitionRef.current.cause === 'pop' || !navigation.needsReplace || navigation.routeError) return
    const rawUrl = window.location.pathname + window.location.search
    if (lastCanonicalizedUrl.current === rawUrl) return
    lastCanonicalizedUrl.current = rawUrl
    const canonicalUrl = navigationUrl(navigationRef.current, window.location.href)
    const saved = readWorkbenchHistoryData(window.history.state) ?? initialHistory
    window.history.replaceState(withWorkbenchHistoryData(window.history.state, saved), '', canonicalUrl)
    const next = { ...navigationRef.current, needsReplace: false }
    navigationRef.current = next
    setNavigation(next)
  }, [initialHistory, navigation, section])

  useEffect(() => {
    void runManifestLoad(false)
    return () => {
      manifestRequestRef.current += 1
      explorerLoader.cancelManifestLoad()
    }
  }, [explorerLoader, runManifestLoad])

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

  const tools = snapshot?.tools ?? EMPTY_TOOLS
  const validatedExplorerManifest = explorerManifest.status === 'ready' ? explorerManifest.manifest : null

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tool of tools) seen.set(tool.category, categoryLabel(tool.category, locale))
    return Array.from(seen, ([key, label]) => ({ key, label })).sort((left, right) =>
      left.label.localeCompare(right.label, locale === 'de' ? 'de-DE' : 'en'),
    )
  }, [tools, locale])

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en')
    return tools.filter((tool) => {
      if (category !== 'all' && tool.category !== category) return false
      if (platform !== 'all' && !tool.platforms.includes(platform)) return false
      if (!normalizedQuery) return true

      const searchable = [
        tool.name,
        tool.id,
        tool.description,
        tool.command,
        tool.category,
        categoryLabel(tool.category, locale),
        tool.tier,
        ...(tool.tags ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en')
      return searchable.includes(normalizedQuery)
    }).sort((a, b) => (sort === 'category' ? categoryLabel(a.category, locale).localeCompare(categoryLabel(b.category, locale), locale) : 0) ||
      a.name.localeCompare(b.name, locale) || a.id.localeCompare(b.id))
  }, [tools, query, category, platform, locale, sort])

  const visibleTools = filteredTools.slice(0, count)

  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? null
  const sourceStatus = isLoading
    ? 'loading'
    : loadError
      ? snapshot
        ? 'cached'
        : 'error'
      : snapshot
        ? 'live'
        : 'error'
  const updatedAt = snapshot
    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(snapshot.loadedAt))
    : t('notUpdated')
  const countLabel = t('toolCount')
    .replace('{shown}', String(filteredTools.length))
    .replace('{total}', String(tools.length))

  const refreshCatalog = () => {
    if (isLoading) return
    setLoadError(null)
    setAttempt((current) => current + 1)
  }

  const resetFilters = () => {
    updateNavigation({ query: '', category: 'all', platform: 'all', tool: null, count: 48 })
  }

  return (
    <div className="registry-app" id="top">
      <a className="skip-link" href="#main-content" data-history-focus-key="skip-link">{t(SECTION_LABELS[section])}</a>
      <header className="topbar">
        <a className="brand" href={navHref('overview')} onClick={(event) => navClick(event, 'overview')} aria-label={t('siteTitle')}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m8 7 5 5-5 5M14 17h4" />
            </svg>
          </span>
          <span>{t('siteTitle')}</span>
        </a>

        <nav className="top-nav" aria-label={locale === 'de' ? 'Hauptnavigation' : 'Main navigation'}>
          {SECTIONS.map((item) => <a key={item} className={section === item ? 'top-nav-active' : ''}
            href={navHref(item)} data-history-focus-key={'nav:' + item}
            aria-current={section === item ? 'page' : undefined} onClick={(event) => navClick(event, item)}>{t(SECTION_LABELS[item])}</a>)}
        </nav>

        <div className="topbar-actions">
          <button className="palette-trigger" id="palette-trigger" data-history-focus-key="palette-trigger"
            aria-label={t('paletteLabel')} title={t('paletteLabel') + ' · Ctrl / ⌘ K'} onClick={() => setPaletteOpen(true)}><span aria-hidden="true">⌕</span><kbd>⌘ K</kbd></button>
          <a className={'source-status status-' + sourceStatus} href={CATALOG_SOURCE_URL}>
            <span className="status-dot" />
            <span>
              {t(
                sourceStatus === 'live'
                  ? 'sourceLive'
                  : sourceStatus === 'cached'
                    ? 'sourceCached'
                    : sourceStatus === 'error'
                      ? 'sourceError'
                      : 'sourceLoading',
              )}
            </span>
          </a>
          <span className="updated-label">{t('lastUpdated').replace('{time}', updatedAt)}</span>
          <button
            type="button"
            className="refresh-button header-icon-button"
            onClick={refreshCatalog}
            disabled={isLoading}
            aria-label={t(isLoading ? 'refreshing' : 'refresh')}
            title={t(isLoading ? 'refreshing' : 'refresh')}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className={isLoading ? 'spin' : ''}>
              <path d="M16.2 7.3A6.5 6.5 0 0 0 5 4.7L3.4 6.3M3.8 3.8v2.7h2.7M3.8 12.7A6.5 6.5 0 0 0 15 15.3l1.6-1.6m-.4 2.5v-2.7h-2.7" />
            </svg>
          </button>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="page-shell" id="main-content" tabIndex={-1} data-history-focus-key="main-content">
        {loadError && snapshot && (
          <div className="notice notice-warning" role="status"><span>{t('cachedWarning')}</span><button type="button" onClick={refreshCatalog} disabled={isLoading}>{t('retry')}</button></div>
        )}
        {cacheWriteFailed && <p className="notice notice-warning" role="status">{t('cacheWriteWarning')}</p>}
        {!snapshot && section !== 'explore' ? <div className="empty-state" aria-busy={isLoading}>{isLoading ? <><span className="loading-indicator" /><p>{t('loadingTools')}</p></> :
          <><h1 id="screen-heading" tabIndex={-1}>{t('loadErrorTitle')}</h1><p>{t('loadErrorHint')}</p><button className="workbench-button" onClick={refreshCatalog}>{t('retry')}</button></>}</div> : <>
        {section === 'overview' && <>
          <WorkbenchOverview tools={tools} onNavigate={navigate} onTool={revealTool}
            onCategory={(next) => updateNavigation({ section: 'catalog', category: next, query: '', platform: 'all', count: 48, tool: null }, true, 'heading')} />
          <NavigationReadySignal ticket={transitionRef.current.ticket} onReady={navigationReady} />
        </>}
        {section === 'guide' && <>
          <WorkbenchGuide onNavigate={navigate} />
          <NavigationReadySignal ticket={transitionRef.current.ticket} onReady={navigationReady} />
        </>}
        {(section === 'dependencies' || section === 'lab' && snapshot !== null) && <ScreenBoundary key={section} message={t('screenLoadError')} reloadLabel={t('reloadScreen')}>
          <Suspense fallback={<div className="empty-state" role="status"><span className="loading-indicator" /><p>{t('loadingTools')}</p></div>}>
            {section === 'dependencies' ? <>
              <DependencyExplorer tools={tools} selectedId={selectedToolId} onFocusChange={() => updateNavigation({ tool: null })} onSelect={(id, trigger) => {
              detailsTrigger.current = trigger
              trigger.dataset.historyFocusKey = `tool-trigger:${id}`
              updateNavigation({ tool: id }, true, 'entry')
              }} />
              <NavigationReadySignal ticket={transitionRef.current.ticket} onReady={navigationReady} />
            </> : <>
              {snapshot && <>
                <CatalogLab current={snapshot} baseline={baseline} onSetBaseline={() => setCatalog((current) => ({ ...current, baseline: current.snapshot }))} />
                <NavigationReadySignal ticket={transitionRef.current.ticket} onReady={navigationReady} />
              </>}
            </>}
          </Suspense>
        </ScreenBoundary>}
        {section === 'catalog' && <>
        <section className="catalog-intro screen-intro">
          <div>
            <span className="catalog-eyebrow">{t('catalogEyebrow')}</span>
            <h1 id="screen-heading" tabIndex={-1}>{t('catalogHeading')}</h1>
            <p>{t('catalogSubtitle')}</p>
          </div>
          <div className="catalog-source-summary">
            <span className="source-summary-mark" aria-hidden="true">↗</span>
            <div>
              <strong>In-Pro-Org/CliToolRegistry</strong>
              <span>
                {snapshot
                  ? t('sourceBranch').replace('{branch}', snapshot.sourceRef ?? 'main')
                  : t('sourceLoading')}
              </span>
            </div>
          </div>
        </section>

        <section className="filter-toolbar" id="filters" aria-label={t('searchLabel')}>
          <label className="search-field" htmlFor="tool-search">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.8" cy="8.8" r="5.8" />
              <path d="m13.2 13.2 4 4" />
            </svg>
            <input
              id="tool-search"
              ref={searchRef}
              data-history-focus-key="catalog-search"
              aria-label={t('searchLabel')}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
            />
            {query && <button type="button" className="search-clear" aria-label={t('clearSearch')}
              onClick={() => { setQuery(''); searchRef.current?.focus() }}>×</button>}
          </label>

          <label className="select-field">
            <span>{t('categoryFilter')}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">{t('allCategories')}</option>
              {categoryOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
          </label>

          <label className="select-field">
            <span>{t('platformFilter')}</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as ToolPlatform | 'all')}
            >
              <option value="all">{t('allPlatforms')}</option>
              {PLATFORMS.map((item) => (
                <option key={item} value={item}>{platformLabel(item)}</option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
          </label>

          <button type="button" className="reset-button" onClick={resetFilters}>
            {t('resetFilters')}
          </button>
        </section>

        <section className="results-section" id="tools" aria-busy={isLoading}>
          <div className="results-heading">
            <div>
              <h2>{t('navCatalog')}</h2>
              <p role="status">{countLabel}</p>
            </div>
            <div className="results-controls">
              <label className="sort-select"><span>{t('sortLabel')}</span><select value={sort} onChange={(event) => updateNavigation({ sort: event.target.value as NavigationState['sort'], count: 48, tool: null })}>
                <option value="name">{t('sortName')}</option><option value="category">{t('sortCategory')}</option></select></label>
            {snapshot && (
              <span className="catalog-file-count">
                {t('catalogFiles').replace('{count}', String(snapshot.fileCount))}
              </span>
            )}
              <ViewToggle mode={view} onChange={changeView} />
            </div>
          </div>
          <p className="view-description">{t(view === 'enhanced' ? 'enhancedHint' : view === 'card' ? 'cardHint' : 'tableHint')}</p>

          {filteredTools.length === 0 ? (
            <div className="empty-state">
              <p>{tools.length === 0 ? t('noTools') : t('noMatches')}</p>
              {tools.length > 0 && <button type="button" className="refresh-button" onClick={resetFilters}>{t('resetFilters')}</button>}
            </div>
          ) : view === 'list' ? (
            <ToolTable
              tools={visibleTools}
              selectedToolId={selectedToolId}
              activePlatform={platform}
              explorerManifest={validatedExplorerManifest}
              onExplore={explorerAction}
              onSelect={selectTool}
              locale={locale}
            />
          ) : (
            <ToolCards tools={visibleTools} enhanced={view === 'enhanced'} activePlatform={platform}
              selectedToolId={selectedToolId} explorerManifest={validatedExplorerManifest} onExplore={explorerAction}
              onSelect={selectTool} onClose={closeDetails} />
          )}
          {filteredTools.length > 0 && <div className="load-more-region"><p role="status">{t('visibleCount').replace('{shown}', String(visibleTools.length)).replace('{total}', String(filteredTools.length))}</p>
            {visibleTools.length < filteredTools.length && <button className="workbench-button" data-history-focus-key="catalog-more" onClick={() => updateNavigation({ count: Math.min(count + 48, 10000) })}>{t('loadMore')} <span aria-hidden="true">↓</span></button>}</div>}
        </section>
        <NavigationReadySignal ticket={transitionRef.current.ticket} onReady={navigationReady} />
        </>}
        {section === 'explore' && <ScreenBoundary message={t('screenLoadError')} reloadLabel={t('reloadScreen')}>
          <Suspense fallback={<div className="empty-state" role="status"><span className="loading-indicator" /><p>{t('loadingTools')}</p></div>}>
            <ToolExplorer navigation={navigation} manifestState={explorerManifest} loader={explorerLoader}
              catalogTools={tools} locale={locale} navigationTicket={transitionRef.current.ticket}
              navigationCause={transitionRef.current.cause} onReady={navigationReady} onAction={explorerAction}
              onPatch={patchExplorerNavigation} onRetryManifest={retryExplorerManifest} />
          </Suspense>
        </ScreenBoundary>}
        {selectedTool && (section !== 'catalog' || view === 'list' || !visibleTools.some((tool) => tool.id === selectedToolId)) && (
          <ToolDetails tool={selectedTool} onClose={closeDetails} manifest={validatedExplorerManifest} onExplore={explorerAction} />
        )}
        {section === 'catalog' && selectedToolId && !selectedTool && <p className="notice notice-warning" role="status">{t('unknownTool')}</p>}
        </>}
      </main>

      <footer className="site-footer">
        <p>{t('footerCopyright').replace('{year}', String(new Date().getFullYear()))}</p>
        <span>{t('catalogFiles').replace('{count}', String(snapshot?.fileCount ?? 0))}</span>
        <a href={CATALOG_REPOSITORY_URL} target="_blank" rel="noreferrer">{t('footerSource')}</a>
        <a href="https://github.com/Dicklesworthstone/frankentui_website" target="_blank" rel="noreferrer">{t('referenceInspiration')}</a>
        <p className="footer-trademark-note">{t('pythonTrademark')}</p>
      </footer>
      <CommandPalette open={paletteOpen} tools={tools} explorerManifest={validatedExplorerManifest}
        onClose={() => setPaletteOpen(false)} onNavigate={navigate} onTool={revealTool} onExplore={explorerAction} />
    </div>
  )
}

export default App
