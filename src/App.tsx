import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(readCatalogCache)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState<ToolPlatform | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>(initialView)
  const searchRef = useRef<HTMLInputElement>(null)
  const detailsTrigger = useRef<HTMLButtonElement | null>(null)

  const closeDetails = () => {
    setSelectedToolId(null)
    detailsTrigger.current?.focus({ preventScroll: true })
  }
  const selectTool = (tool: CliTool, trigger: HTMLButtonElement) => {
    detailsTrigger.current = trigger
    setSelectedToolId((current) => current === tool.id ? null : tool.id)
  }
  const changeView = (next: ViewMode) => {
    setView(next)
    setSelectedToolId(null)
    try { localStorage.setItem(VIEW_STORAGE_KEY, next) } catch { /* View remains usable without storage. */ }
  }

  useEffect(() => {
    let mounted = true
    setIsLoading(true)

    loadToolCatalog()
      .then((nextSnapshot) => {
        if (!mounted) return
        writeCatalogCache(nextSnapshot)
        setSnapshot(nextSnapshot)
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
    })
  }, [tools, query, category, platform, locale])

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
    setLoadError(null)
    setAttempt((current) => current + 1)
  }

  const resetFilters = () => {
    setQuery('')
    setCategory('all')
    setPlatform('all')
  }

  return (
    <div className="registry-app" id="top">
      <a className="skip-link" href="#tools">{t('navCatalog')}</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label={t('siteTitle')}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m8 7 5 5-5 5M14 17h4" />
            </svg>
          </span>
          <span>{t('siteTitle')}</span>
        </a>

        <nav className="top-nav" aria-label={locale === 'de' ? 'Hauptnavigation' : 'Main navigation'}>
          <a className="top-nav-active" href="#tools">{t('navCatalog')}</a>
          <a href="#filters">{t('navCategories')}</a>
          <a href={CATALOG_REPOSITORY_URL} target="_blank" rel="noreferrer">
            {t('navRepository')}
          </a>
        </nav>

        <div className="topbar-actions">
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

      <main className="page-shell">
        <section className="catalog-intro">
          <div>
            <span className="catalog-eyebrow">{t('catalogEyebrow')}</span>
            <h1>{t('catalogHeading')}</h1>
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

        {loadError && snapshot && (
          <div className="notice notice-warning" role="status">
            <span>{t('cachedWarning')}</span>
            <button type="button" onClick={refreshCatalog}>{t('retry')}</button>
          </div>
        )}

        <section className="results-section" id="tools" aria-busy={isLoading}>
          <div className="results-heading">
            <div>
              <h2>{t('navCatalog')}</h2>
              <p role="status">{countLabel}</p>
            </div>
            <div className="results-controls">
            {snapshot && (
              <span className="catalog-file-count">
                {t('catalogFiles').replace('{count}', String(snapshot.fileCount))}
              </span>
            )}
              <ViewToggle mode={view} onChange={changeView} />
            </div>
          </div>
          <p className="view-description">{t(view === 'enhanced' ? 'enhancedHint' : view === 'card' ? 'cardHint' : 'tableHint')}</p>

          {!snapshot && isLoading ? (
            <div className="empty-state">
              <span className="loading-indicator" />
              <p>{t('loadingTools')}</p>
            </div>
          ) : !snapshot ? (
            <div className="empty-state error-state">
              <h2>{t('loadErrorTitle')}</h2>
              <p>{t('loadErrorHint')}</p>
              {loadError && <code>{loadError}</code>}
              <button type="button" className="refresh-button" onClick={refreshCatalog}>
                {t('retry')}
              </button>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="empty-state">
              <p>{tools.length === 0 ? t('noTools') : t('noMatches')}</p>
              {tools.length > 0 && <button type="button" className="refresh-button" onClick={resetFilters}>{t('resetFilters')}</button>}
            </div>
          ) : view === 'list' ? (
            <ToolTable
              tools={filteredTools}
              selectedToolId={selectedToolId}
              activePlatform={platform}
              onSelect={selectTool}
              locale={locale}
            />
          ) : (
            <ToolCards tools={filteredTools} enhanced={view === 'enhanced'} activePlatform={platform}
              selectedToolId={selectedToolId} onSelect={selectTool} onClose={closeDetails} />
          )}
        </section>

        {selectedTool && view === 'list' && filteredTools.some((tool) => tool.id === selectedToolId) && (
          <ToolDetails tool={selectedTool} onClose={closeDetails} />
        )}
      </main>

      <footer className="site-footer">
        <p>{t('footerCopyright').replace('{year}', String(new Date().getFullYear()))}</p>
        <span>{t('catalogFiles').replace('{count}', String(snapshot?.fileCount ?? 0))}</span>
        <a href={CATALOG_REPOSITORY_URL} target="_blank" rel="noreferrer">{t('footerSource')}</a>
        <p className="footer-trademark-note">{t('pythonTrademark')}</p>
      </footer>
    </div>
  )
}

export default App
