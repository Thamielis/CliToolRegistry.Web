import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
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
import { navigationUrl, parseNavigation, SECTIONS, type NavigationState, type Section } from './data/workbench'
import { CommandPalette } from './components/CommandPalette'
import { sectionLabels as SECTION_LABELS } from './i18n/translations'
import { WorkbenchOverview, WorkbenchGuide } from './components/WorkbenchOverview'
import { ScreenBoundary } from './components/ScreenBoundary'

const DependencyExplorer = lazy(() => import('./components/DependencyExplorer'))
const CatalogLab = lazy(() => import('./components/CatalogLab'))

const PLATFORMS: ToolPlatform[] = ['windows', 'linux', 'wsl2', 'macos']
const EMPTY_TOOLS: CatalogSnapshot['tools'] = []
const VIEW_STORAGE_KEY = 'cli-tool-registry.view'

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

  const updateNavigation = (patch: Partial<NavigationState>, push = false) => {
    const next = { ...navigationRef.current, ...patch }
    navigationRef.current = next
    window.history[push ? 'pushState' : 'replaceState'](null, '', navigationUrl(next, window.location.href))
    setNavigation(next)
  }
  const setQuery = (next: string) => updateNavigation({ query: next, count: 48, tool: null })
  const setCategory = (next: string) => updateNavigation({ category: next, count: 48, tool: null })
  const setPlatform = (next: ToolPlatform | 'all') => updateNavigation({ platform: next, count: 48, tool: null })
  const navigate = (next: Section) => { updateNavigation({ section: next, tool: null }, true) }
  const navHref = (next: Section) => navigationUrl({ ...navigation, section: next, tool: null }, window.location.href)
  const navClick = (event: MouseEvent<HTMLAnchorElement>, next: Section) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(next)
  }

  const closeDetails = () => {
    updateNavigation({ tool: null })
    if (detailsTrigger.current?.isConnected) detailsTrigger.current.focus({ preventScroll: true })
    else document.getElementById('palette-trigger')?.focus({ preventScroll: true })
  }
  const selectTool = (tool: CliTool, trigger: HTMLButtonElement) => {
    detailsTrigger.current = trigger
    updateNavigation({ tool: selectedToolId === tool.id ? null : tool.id }, true)
  }
  const changeView = (next: ViewMode) => {
    updateNavigation({ view: next, tool: null })
    try { localStorage.setItem(VIEW_STORAGE_KEY, next) } catch { /* View remains usable without storage. */ }
  }

  const revealTool = (id: string, trigger?: HTMLButtonElement) => {
    detailsTrigger.current = trigger ?? document.getElementById('palette-trigger') as HTMLButtonElement
    updateNavigation({ section: 'catalog', tool: id, query: id, category: 'all', platform: 'all', view: 'list', count: 48 }, true)
  }

  useEffect(() => {
    const onPop = () => {
      const next = parseNavigation(window.location.search, initialView())
      navigationRef.current = next
      setNavigation(next)
    }
    const onKey = (event: KeyboardEvent) => {
      if (!event.isComposing && !event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey) }
  }, [])

  const previousSection = useRef(section)
  useEffect(() => {
    document.title = t(SECTION_LABELS[section]) + ' · CLI Tool Registry'
    if (previousSection.current !== section) {
      previousSection.current = section
      document.getElementById('screen-heading')?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [section, t, snapshot])

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
      <a className="skip-link" href="#main-content">{t(SECTION_LABELS[section])}</a>
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
            href={navHref(item)} aria-current={section === item ? 'page' : undefined} onClick={(event) => navClick(event, item)}>{t(SECTION_LABELS[item])}</a>)}
        </nav>

        <div className="topbar-actions">
          <button className="palette-trigger" id="palette-trigger" aria-label={t('paletteLabel')} title={t('paletteLabel') + ' · Ctrl / ⌘ K'} onClick={() => setPaletteOpen(true)}><span aria-hidden="true">⌕</span><kbd>⌘ K</kbd></button>
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

      <main className="page-shell" id="main-content" tabIndex={-1}>
        {loadError && snapshot && (
          <div className="notice notice-warning" role="status"><span>{t('cachedWarning')}</span><button type="button" onClick={refreshCatalog} disabled={isLoading}>{t('retry')}</button></div>
        )}
        {cacheWriteFailed && <p className="notice notice-warning" role="status">{t('cacheWriteWarning')}</p>}
        {!snapshot ? <div className="empty-state" aria-busy={isLoading}>{isLoading ? <><span className="loading-indicator" /><p>{t('loadingTools')}</p></> :
          <><h1 id="screen-heading" tabIndex={-1}>{t('loadErrorTitle')}</h1><p>{t('loadErrorHint')}</p><button className="workbench-button" onClick={refreshCatalog}>{t('retry')}</button></>}</div> : <>
        {section === 'overview' && <WorkbenchOverview tools={tools} onNavigate={navigate} onTool={revealTool}
          onCategory={(next) => updateNavigation({ section: 'catalog', category: next, query: '', platform: 'all', count: 48, tool: null }, true)} />}
        {section === 'guide' && <WorkbenchGuide onNavigate={navigate} />}
        {(section === 'dependencies' || section === 'lab') && <ScreenBoundary key={section} message={t('screenLoadError')} reloadLabel={t('reloadScreen')}>
          <Suspense fallback={<div className="empty-state" role="status"><span className="loading-indicator" /><p>{t('loadingTools')}</p></div>}>
            {section === 'dependencies' ? <DependencyExplorer tools={tools} selectedId={selectedToolId} onFocusChange={() => updateNavigation({ tool: null })} onSelect={(id, trigger) => {
              detailsTrigger.current = trigger
              updateNavigation({ tool: id }, true)
            }} /> : <CatalogLab current={snapshot} baseline={baseline} onSetBaseline={() => setCatalog((current) => ({ ...current, baseline: current.snapshot }))} />}
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
              onSelect={selectTool}
              locale={locale}
            />
          ) : (
            <ToolCards tools={visibleTools} enhanced={view === 'enhanced'} activePlatform={platform}
              selectedToolId={selectedToolId} onSelect={selectTool} onClose={closeDetails} />
          )}
          {filteredTools.length > 0 && <div className="load-more-region"><p role="status">{t('visibleCount').replace('{shown}', String(visibleTools.length)).replace('{total}', String(filteredTools.length))}</p>
            {visibleTools.length < filteredTools.length && <button className="workbench-button" onClick={() => updateNavigation({ count: Math.min(count + 48, 10000) })}>{t('loadMore')} <span aria-hidden="true">↓</span></button>}</div>}
        </section>
        </>}
        {selectedTool && (section !== 'catalog' || view === 'list' || !visibleTools.some((tool) => tool.id === selectedToolId)) && (
          <ToolDetails tool={selectedTool} onClose={closeDetails} />
        )}
        {selectedToolId && !selectedTool && <p className="notice notice-warning" role="status">{t('unknownTool')}</p>}
        </>}
      </main>

      <footer className="site-footer">
        <p>{t('footerCopyright').replace('{year}', String(new Date().getFullYear()))}</p>
        <span>{t('catalogFiles').replace('{count}', String(snapshot?.fileCount ?? 0))}</span>
        <a href={CATALOG_REPOSITORY_URL} target="_blank" rel="noreferrer">{t('footerSource')}</a>
        <a href="https://github.com/Dicklesworthstone/frankentui_website" target="_blank" rel="noreferrer">{t('referenceInspiration')}</a>
        <p className="footer-trademark-note">{t('pythonTrademark')}</p>
      </footer>
      <CommandPalette open={paletteOpen} tools={tools} onClose={() => setPaletteOpen(false)} onNavigate={navigate} onTool={revealTool} />
    </div>
  )
}

export default App
