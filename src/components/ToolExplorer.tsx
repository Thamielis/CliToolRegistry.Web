import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent } from 'react'
import { AppIcon } from './AppIcon'
import { GenericDatasetView, type DatasetViewProps } from './ExplorerDetails'
import { BrBvExplorer } from './explorer/BrBvExplorer'
import { CassExplorer } from './explorer/CassExplorer'
import { EeExplorer } from './explorer/EeExplorer'
import { FmdUbsExplorer } from './explorer/FmdUbsExplorer'
import type { ExplorerLoader, DatasetLoadResult, ExplorerLoadError } from '../data/loadExplorer'
import { resolveJsonPointer } from '../data/explorerAdapters'
import {
  applyNavigationPatch,
  navigationUrl,
  transitionExplorerNavigation,
  type ExplorerFilters,
  type ExplorerNavigationAction,
  type FilterDiagnostic,
  type NavigationState,
} from '../data/workbench'
import type { CliTool, Locale } from '../types/app'
import type {
  AdapterId,
  ExplorerEntry,
  ExplorerManifest,
  ExplorerRegistry,
  JsonValue,
  ManifestEntry,
} from '../types/explorer'
import registrySource from '../data/explorerRegistry.json' with { type: 'json' }
import { explorerLabel, type ExplorerLabelKey } from '../i18n/explorerLabels'

type ManifestState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: ExplorerManifest }
  | { status: 'error'; error: ExplorerLoadError }

type DatasetState =
  | { status: 'idle'; key: string }
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; result: Extract<DatasetLoadResult, { status: 'ready' }> }
  | { status: 'error'; key: string; error: ExplorerLoadError }

type ToolRecord = { toolId: string; fallbackName: string }
type FilterKey = keyof ExplorerFilters
type FilterControl = { key: Exclude<FilterKey, 'needs'>; label: ExplorerLabelKey; values: string[] }
const EMPTY_DATASETS: ManifestEntry[] = []
const EMPTY_ENTRIES: ExplorerEntry[] = []

const registry = registrySource as ExplorerRegistry
const registryTools = new Map(registry.tools.map((item: ToolRecord) => [item.toolId, item.fallbackName]))
const familyViews: Partial<Record<AdapterId, ComponentType<DatasetViewProps>>> = {
  'br-guide': BrBvExplorer,
  'br-capabilities': BrBvExplorer,
  'bv-docs': BrBvExplorer,
  'bv-capabilities': BrBvExplorer,
  'cass-capabilities': CassExplorer,
  'ee-capabilities': EeExplorer,
  'fmd-capabilities': FmdUbsExplorer,
  'ubs-docs': FmdUbsExplorer,
}

function GenericExplorerView(props: DatasetViewProps) {
  return <GenericDatasetView props={props} />
}

const filterLabels: Record<Exclude<FilterKey, 'needs'>, ExplorerLabelKey> = {
  operation: 'operation',
  workspace: 'workspace',
  machineOutput: 'machineOutput',
  mutates: 'mutates',
  jsonOutput: 'jsonOutput',
  available: 'available',
  envCategory: 'envCategory',
  featureStatus: 'featureStatus',
  argType: 'argType',
  argRequired: 'argRequired',
}

const filterDomains: Partial<Record<Exclude<FilterKey, 'needs'>, string[]>> = {
  operation: ['read', 'write', 'mixed'],
  workspace: ['required', 'optional', 'none'],
  mutates: ['yes', 'no'],
  jsonOutput: ['yes', 'no'],
  available: ['yes', 'no'],
  argType: ['option', 'flag', 'positional'],
  argRequired: ['yes', 'no'],
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textValue(value: JsonValue | undefined): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function isSafeFilterSyntax(value: string): boolean {
  return Array.from(value).length <= 128 && Array.from(value).every((character) => {
    const codepoint = character.codePointAt(0) ?? 0
    return codepoint >= 32 && codepoint !== 127
  })
}

function sourceField(entry: ExplorerEntry, fields: string[]): string | null {
  if (entry.detail.kind !== 'structured' || !isRecord(entry.detail.sourceValue)) return null
  for (const field of fields) {
    const value = textValue(entry.detail.sourceValue[field])
    if (value !== null) return value
  }
  return null
}

function filterValue(entry: ExplorerEntry, key: Exclude<FilterKey, 'needs'>): string | null {
  switch (key) {
    case 'operation':
      return entry.detail.kind === 'br-command' ? entry.detail.operation : null
    case 'workspace':
      return entry.detail.kind === 'br-command' ? entry.detail.workspace : null
    case 'machineOutput':
      return entry.detail.kind === 'br-command' ? entry.detail.machineOutput.join(',') : null
    case 'mutates':
      return entry.detail.kind === 'bv-command' ? entry.detail.mutatesState ? 'yes' : 'no' : null
    case 'jsonOutput':
      return entry.detail.kind === 'cass-command' ? entry.detail.hasJsonOutput ? 'yes' : 'no' : null
    case 'available':
      return entry.detail.kind === 'ee-command' ? entry.detail.availableInSnapshot ? 'yes' : 'no' : null
    case 'argType':
      return entry.detail.kind === 'cass-argument' ? entry.detail.argType : null
    case 'argRequired':
      return entry.detail.kind === 'cass-argument' ? entry.detail.required ? 'yes' : 'no' : null
    case 'envCategory':
      return sourceField(entry, ['environment_category', 'env_category', 'category'])
    case 'featureStatus':
      if (entry.sectionId === 'features' && entry.detail.kind === 'structured' && typeof entry.detail.sourceValue === 'string') {
        return entry.detail.sourceValue
      }
      return sourceField(entry, ['feature_status', 'status'])
  }
}

function needsValue(entry: ExplorerEntry, key: string): boolean | null {
  if (entry.detail.kind !== 'bv-command') return null
  if (key === 'issues') return entry.detail.needsIssues
  if (key === 'git') return entry.detail.needsGit
  if (key === 'sprint') return entry.detail.needsSprint
  if (key === 'baseline') return entry.detail.needsBaseline
  return false
}

function resolveFilters(navigation: NavigationState, entries: ExplorerEntry[]): {
  filters: ExplorerFilters
  diagnostics: FilterDiagnostic[]
  controls: FilterControl[]
  hasNeeds: boolean
} {
  const filters: ExplorerFilters = {
    operation: 'all', workspace: 'all', machineOutput: 'all', needs: [], mutates: 'all',
    jsonOutput: 'all', available: 'all', envCategory: 'all', featureStatus: 'all',
    argType: 'all', argRequired: 'all',
  }
  const diagnostics: FilterDiagnostic[] = []
  const controls: FilterControl[] = []

  for (const key of Object.keys(filterLabels) as Exclude<FilterKey, 'needs'>[]) {
    const raw = navigation[key]
    const values = [...new Set(entries.map((entry) => filterValue(entry, key)).filter((value): value is string => value !== null))]
    const hasApplicableEntries = entries.some((entry) => filterValue(entry, key) !== null)
    const domain = filterDomains[key] ?? values
    if (hasApplicableEntries) controls.push({
      key,
      label: filterLabels[key],
      values: key === 'machineOutput'
        ? [...new Set(entries.flatMap((entry) => entry.detail.kind === 'br-command' ? entry.detail.machineOutput : []))]
        : domain,
    })
    if (raw === 'all' || raw === '') continue
    if (!isSafeFilterSyntax(raw)) {
      diagnostics.push({ code: 'invalid-filter', parameter: key, reason: 'syntax' })
      continue
    }
    if (!hasApplicableEntries) {
      diagnostics.push({ code: 'invalid-filter', parameter: key, reason: 'not-applicable' })
      continue
    }
    const inDomain = key === 'machineOutput'
      ? entries.some((entry) => entry.detail.kind === 'br-command' && entry.detail.machineOutput.includes(raw))
      : domain.includes(raw)
    if (!inDomain) {
      diagnostics.push({ code: 'invalid-filter', parameter: key, reason: 'domain' })
      continue
    }
    ;(filters as unknown as Record<string, string>)[key] = raw
  }

  const rawNeeds = navigation.needs
  if (rawNeeds.length > 0) {
    const supported = ['issues', 'git', 'sprint', 'baseline']
    const hasNeeds = entries.some((entry) => entry.detail.kind === 'bv-command')
    const syntaxInvalid = rawNeeds.some((value) => !isSafeFilterSyntax(value))
    const invalidNeeds = rawNeeds.some((value) => !supported.includes(value))
    if (!hasNeeds) {
      diagnostics.push({ code: 'invalid-filter', parameter: 'needs', reason: 'not-applicable' })
    } else if (syntaxInvalid) {
      diagnostics.push({ code: 'invalid-filter', parameter: 'needs', reason: 'syntax' })
    } else if (invalidNeeds) {
      diagnostics.push({ code: 'invalid-filter', parameter: 'needs', reason: 'domain' })
    } else {
      filters.needs = [...new Set(rawNeeds)] as ExplorerFilters['needs']
    }
  }
  return {
    filters,
    diagnostics,
    controls,
    hasNeeds: entries.some((entry) => entry.detail.kind === 'bv-command'),
  }
}

function matchesFilters(entry: ExplorerEntry, filters: ExplorerFilters): boolean {
  for (const key of Object.keys(filterLabels) as Exclude<FilterKey, 'needs'>[]) {
    const filter = filters[key]
    if (filter !== 'all') {
      if (key === 'machineOutput') {
        if (entry.detail.kind !== 'br-command' || !entry.detail.machineOutput.includes(filter)) return false
      } else if (filterValue(entry, key) !== filter) return false
    }
  }
  return filters.needs.every((need) => needsValue(entry, need) === true)
}

function createPointerEntry(
  entryId: string,
  sectionId: string,
  pointer: string,
  value: JsonValue,
  filename: string,
): ExplorerEntry {
  const finalSegment = pointer.split('/').pop()?.replaceAll('~1', '/').replaceAll('~0', '~') ?? '$'
  return {
    id: entryId,
    sectionId,
    title: finalSegment || '$',
    searchText: `${pointer} ${JSON.stringify(value)}`.trim(),
    origin: { filename, pointer },
    detail: { kind: 'generic', rootPointer: pointer },
  }
}

function routeLabel(code: 'invalid-route' | 'unknown-tool' | 'unknown-dataset' | 'unknown-section' | 'unknown-entry', labels: Record<ExplorerLabelKey, string>): string {
  const keys: Record<typeof code, ExplorerLabelKey> = {
    'invalid-route': 'invalidRoute',
    'unknown-tool': 'unknownTool',
    'unknown-dataset': 'unknownDataset',
    'unknown-section': 'unknownSection',
    'unknown-entry': 'unknownEntry',
  }
  return labels[keys[code]]
}

export default function ToolExplorer({
  navigation,
  manifestState,
  loader,
  catalogTools,
  locale,
  navigationTicket,
  navigationCause,
  onReady,
  onAction,
  onPatch,
  onRetryManifest,
}: {
  navigation: NavigationState
  manifestState: ManifestState
  loader: ExplorerLoader
  catalogTools: readonly CliTool[]
  locale: Locale
  navigationTicket: string
  navigationCause: 'initial' | 'push' | 'replace' | 'pop'
  onReady: (ticket: string) => void
  onAction: (action: ExplorerNavigationAction) => void
  onPatch: (patch: Partial<NavigationState>, cause?: 'push' | 'replace') => void
  onRetryManifest: () => void
}) {
  const labels = useMemo(() => Object.fromEntries(
    Object.keys(explorerLabelKeys).map((key) => [key, explorerLabel(locale, key as ExplorerLabelKey)]),
  ) as Record<ExplorerLabelKey, string>, [locale])
  const [datasetState, setDatasetState] = useState<DatasetState>({ status: 'idle', key: '' })
  const catalogToolsById = useMemo(() => new Map(catalogTools.map((tool) => [tool.id, tool])), [catalogTools])
  const searchRef = useRef<HTMLInputElement>(null)
  const canonicalizedUrlRef = useRef<string | null>(null)

  const manifest = manifestState.status === 'ready' ? manifestState.manifest : null
  const datasetsByTool = useMemo(() => {
    const grouped = new Map<string, ManifestEntry[]>()
    for (const entry of manifest?.datasets ?? []) grouped.set(entry.toolId, [...(grouped.get(entry.toolId) ?? []), entry])
    return grouped
  }, [manifest])
  const toolId = navigation.exploreTool
  const toolDatasets = (toolId ? datasetsByTool.get(toolId) : undefined) ?? EMPTY_DATASETS
  const manifestEntry = navigation.dataset && toolId
    ? toolDatasets.find((entry) => entry.datasetId === navigation.dataset) ?? null
    : null
  const datasetKey = manifestEntry ? `${manifestEntry.toolId}/${manifestEntry.datasetId}` : ''

  useEffect(() => {
    if (!manifestEntry) {
      setDatasetState({ status: 'idle', key: '' })
      return
    }
    const controller = new AbortController()
    const key = `${manifestEntry.toolId}/${manifestEntry.datasetId}`
    setDatasetState({ status: 'loading', key })
    loader.loadDataset({ toolId: manifestEntry.toolId, datasetId: manifestEntry.datasetId }, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.status === 'ready') setDatasetState({ status: 'ready', key, result })
        else if (result.status === 'error') setDatasetState({ status: 'error', key, error: result.error })
        else if (result.status === 'unknown-dataset') setDatasetState({ status: 'error', key, error: {
          kind: 'manifest', code: 'UnknownDataset', message: 'The selected dataset is not in the validated manifest.', retryable: false,
        } })
      })
      .catch(() => {
        if (!controller.signal.aborted) setDatasetState({ status: 'error', key, error: {
          kind: 'transport', code: 'DatasetTransportError', message: 'The dataset could not be loaded.', retryable: true,
        } })
      })
    return () => controller.abort()
  }, [loader, manifestEntry, manifestEntry?.toolId, manifestEntry?.datasetId])

  const manifestReady = manifestState.status !== 'loading'
  const knownTool = toolId ? registryTools.has(toolId) : false
  const resolutionKind = navigation.routeError
    ? 'error'
    : manifestState.status === 'ready' && !toolId ? 'index'
      : manifestState.status === 'ready' && toolId && !knownTool ? 'error'
        : manifestState.status === 'ready' && toolId && navigation.dataset && !manifestEntry ? 'error'
          : manifestState.status === 'ready' && toolId && !navigation.dataset ? 'tool'
            : manifestEntry ? 'dataset' : 'pending'
  const routeErrorCode = navigation.routeError ? 'invalid-route'
    : manifestState.status === 'ready' && toolId && !knownTool ? 'unknown-tool'
      : manifestState.status === 'ready' && toolId && navigation.dataset && !manifestEntry ? 'unknown-dataset'
        : null

  const readyDataset = datasetState.status === 'ready' && datasetState.key === datasetKey ? datasetState.result : null
  const datasetLoading = Boolean(manifestEntry && (!readyDataset && (datasetState.status === 'loading' || datasetState.key !== datasetKey)))

  const allEntries = readyDataset?.dataset.entries ?? EMPTY_ENTRIES
  const resolvedFilters = useMemo(() => readyDataset
    ? resolveFilters(navigation, allEntries)
    : { filters: null, diagnostics: [] as FilterDiagnostic[], controls: [] as FilterControl[], hasNeeds: false },
  [readyDataset, navigation, allEntries])
  const activeDiagnostics = resolvedFilters.diagnostics

  const selectedEntry = useMemo(() => {
    if (!readyDataset || !navigation.entry) return null
    const exact = readyDataset.dataset.entries.find((entry) => entry.id === navigation.entry)
    if (exact) return exact
    if (navigation.entry.startsWith('ptr:') && (readyDataset.manifestEntry.adapter === 'generic-json' ||
      readyDataset.dataset.entries.every((item) => item.detail.kind === 'generic'))) {
      const pointer = navigation.entry.slice(4)
      const value = resolveJsonPointer(readyDataset.sourceValue, pointer)
      if (value.state !== 'missing') return createPointerEntry(navigation.entry, navigation.docSection ?? 'json', pointer,
        value.state === 'value' ? value.value : null, readyDataset.manifestEntry.filename)
    }
    return null
  }, [readyDataset, navigation.entry, navigation.docSection])

  const sectionId = navigation.docSection ?? selectedEntry?.sectionId ?? readyDataset?.dataset.sections[0]?.id ?? null
  const section = readyDataset?.dataset.sections.find((candidate) => candidate.id === sectionId) ?? null
  const entryBelongs = !selectedEntry || selectedEntry.sectionId === section?.id
  const routeDataError = readyDataset && navigation.docSection && !section ? 'unknown-section'
    : navigation.entry && readyDataset && (!selectedEntry || !entryBelongs) ? 'unknown-entry'
      : null

  const sectionIds = new Set(section?.entryIds ?? [])
  const sourceEntries = readyDataset ? readyDataset.dataset.entries.filter((entry) => sectionIds.has(entry.id)) : []
  const filteredEntries = sourceEntries.filter((entry) => {
    const q = navigation.docQ.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
    const text = `${entry.title} ${entry.searchText} ${entry.origin.pointer}`.toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
    return (!q || text.includes(q)) && matchesFilters(entry, resolvedFilters.filters ?? {
      operation: 'all', workspace: 'all', machineOutput: 'all', needs: [], mutates: 'all', jsonOutput: 'all',
      available: 'all', envCategory: 'all', featureStatus: 'all', argType: 'all', argRequired: 'all',
    })
  })
  const visibleEntries = filteredEntries.slice(0, navigation.docCount)
  const activeRouteError = routeDataError ?? routeErrorCode

  useEffect(() => {
    if (resolutionKind !== 'tool' || toolDatasets.length !== 1 || navigation.dataset || navigation.routeError || navigationCause === 'pop') return
    if (manifestState.status === 'ready' && manifestState.manifest.datasets.length) {
      const sourceUrl = window.location.pathname + window.location.search
      if (canonicalizedUrlRef.current === sourceUrl) return
      canonicalizedUrlRef.current = sourceUrl
      onPatch({ dataset: toolDatasets[0].datasetId }, 'replace')
    }
  }, [resolutionKind, toolDatasets, navigation.dataset, navigation.routeError, navigationCause, manifestState, onPatch])

  useEffect(() => {
    if (activeDiagnostics.length === 0 || !readyDataset || navigation.routeError || navigationCause === 'pop') return
    const sourceUrl = window.location.pathname + window.location.search
    if (canonicalizedUrlRef.current === sourceUrl) return
    canonicalizedUrlRef.current = sourceUrl
    const patch: Partial<NavigationState> = {}
    for (const diagnostic of activeDiagnostics) {
      if (diagnostic.parameter === 'needs') patch.needs = []
      else Object.assign(patch, { [diagnostic.parameter]: diagnostic.parameter === 'machineOutput' ? 'all' : 'all' })
    }
    onPatch(patch, 'replace')
  }, [activeDiagnostics, readyDataset, navigation.routeError, navigationCause, onPatch])

  const readyForFocus = manifestReady && (!manifestEntry || datasetState.status !== 'loading' && datasetState.key === datasetKey)
  useLayoutEffect(() => {
    if (readyForFocus) onReady(navigationTicket)
  }, [readyForFocus, navigationTicket, onReady])

  const actionState = (action: ExplorerNavigationAction) => transitionExplorerNavigation(navigation, action).state
  const hrefForAction = (action: ExplorerNavigationAction) => navigationUrl(actionState(action), window.location.href)
  const actOnClick = (event: MouseEvent<HTMLAnchorElement>, action: ExplorerNavigationAction) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onAction(action)
  }
  const indexHref = () => navigationUrl(applyNavigationPatch(navigation, {
    section: 'explore', exploreTool: null, dataset: null, docSection: null, entry: null, routeError: null,
  }), window.location.href)
  const backTarget = activeRouteError === 'unknown-dataset'
    ? { section: 'explore' as const, dataset: null, docSection: null, entry: null }
    : activeRouteError === 'unknown-section' || activeRouteError === 'unknown-entry'
      ? { docSection: null, entry: null }
      : { exploreTool: null, dataset: null, docSection: null, entry: null }
  const backHref = navigationUrl(applyNavigationPatch(navigation, backTarget), window.location.href)
  const toolName = toolId
    ? catalogToolsById.get(toolId)?.name ?? registryTools.get(toolId) ?? toolId
    : null
  const displayName = (id: string) => catalogToolsById.get(id)?.name ?? registryTools.get(id) ?? id

  const renderError = (code: NonNullable<typeof activeRouteError>) => <div className="empty-state error-state explorer-error" role="alert">
    <p>{routeLabel(code, labels)}</p>
    <a className="workbench-button" href={backHref} onClick={(event) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      onPatch(backTarget, 'push')
    }}>{code === 'unknown-dataset' ? labels.backToTool : code === 'unknown-entry' || code === 'unknown-section'
      ? labels.backToSource : labels.backToIndex}</a>
  </div>

  const renderIndex = () => {
    const toolIds = [...datasetsByTool.keys()].sort((a, b) => displayName(a).localeCompare(displayName(b), locale))
    return <section className="explorer-tool-grid" aria-label={labels.toolSources}>
      {toolIds.length === 0 ? <div className="empty-state"><p>{labels.noTools}</p></div> : toolIds.map((id) => {
        const count = datasetsByTool.get(id)?.length ?? 0
        const action: ExplorerNavigationAction = { type: 'tool', toolId: id }
        const catalogTool = catalogToolsById.get(id)
        return <a className="explorer-tool-card" key={id} href={hrefForAction(action)} onClick={(event) => actOnClick(event, action)}>
          <AppIcon app={{ id, name: displayName(id), icon: undefined }} className="explorer-tool-icon" />
          <span className="explorer-tool-copy"><strong>{displayName(id)}</strong><code>{id}</code></span>
          <span className="explorer-tool-count">{labels.sourceCount.replace('{count}', String(count))}</span>
          {catalogTool && <span className="explorer-catalog-identity">{labels.catalogIdentity}: {catalogTool.id}</span>}
        </a>
      })}
    </section>
  }

  const renderTool = () => <section className="explorer-tool-page">
    <a className="explorer-back-link" href={indexHref()} onClick={(event) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      onPatch({ exploreTool: null, dataset: null, docSection: null, entry: null }, 'push')
    }}>← {labels.backToIndex}</a>
    <header className="explorer-tool-heading">
      {toolId && <AppIcon app={{ id: toolId, name: toolName ?? toolId, icon: undefined }} className="explorer-tool-icon" />}
      <div><span className="section-eyebrow">{toolId}</span><h2>{toolName}</h2></div>
      <span className="explorer-tool-count">{labels.sourceCount.replace('{count}', String(toolDatasets.length))}</span>
    </header>
    {toolDatasets.length === 0 ? <div className="empty-state"><p>{labels.noSources}</p></div> : <ul className="explorer-source-list">
      {toolDatasets.map((source) => {
        const action: ExplorerNavigationAction = { type: 'dataset', ref: { toolId: source.toolId, datasetId: source.datasetId } }
        return <li key={source.datasetId}><a href={hrefForAction(action)} onClick={(event) => actOnClick(event, action)}>
          <span><strong>{source.title[locale]}</strong><code>{source.datasetId}</code></span>
          <span className="explorer-source-file"><code>{source.filename}</code><span aria-hidden="true">↗</span></span>
        </a></li>
      })}
    </ul>}
  </section>

  const retryDataset = () => onRetryManifest()
  const renderDataset = () => {
    if (!manifestEntry || !toolId) return null
    if (datasetLoading || datasetState.status === 'idle') return <div className="empty-state" role="status" aria-busy="true">
      <span className="loading-indicator" /><p>{labels.datasetLoading}</p>
    </div>
    if (datasetState.status === 'error' && datasetState.key === datasetKey) return <div className="empty-state error-state" role="alert">
      <h2>{labels.datasetError}</h2>
      <p className="explorer-load-error" data-error-kind={datasetState.error.kind}>{datasetState.error.kind}: {datasetState.error.code}</p>
      <button className="workbench-button" type="button" onClick={retryDataset}>{labels.retryDataset}</button>
    </div>
    if (!readyDataset) return null

    if (activeRouteError) return renderError(activeRouteError)
    const currentSection = section
    if (!currentSection) return <div className="empty-state"><p>{labels.emptySource}</p></div>
    const viewProps: DatasetViewProps = {
      dataset: readyDataset.dataset,
      manifestEntry: readyDataset.manifestEntry,
      sourceValue: readyDataset.sourceValue,
      sourceBytes: readyDataset.sourceBytes,
      navigation,
      section: currentSection,
      entries: visibleEntries,
      matchingCount: filteredEntries.length,
      selectedEntry,
      locale,
      labels,
      onAction,
    }
    const FamilyView = familyViews[readyDataset.manifestEntry.adapter] ?? GenericExplorerView
    return <>
      {activeDiagnostics.length > 0 && <div className="notice notice-warning explorer-filter-notice" role="status">
        {labels.invalidFilter} {activeDiagnostics.map((diagnostic) => labels[
          diagnostic.reason === 'syntax' ? 'diagnosticSyntax'
            : diagnostic.reason === 'domain' ? 'diagnosticDomain' : 'diagnosticNotApplicable'
        ]).join(' ')}
      </div>}
      <div className="explorer-dataset-toolbar">
        <nav aria-label={labels.sections} className="explorer-section-tabs">
          {readyDataset.dataset.sections.map((item) => {
            const action: ExplorerNavigationAction = { type: 'section', sectionId: item.id }
            return <a key={item.id} aria-current={item.id === currentSection.id ? 'page' : undefined}
              href={hrefForAction(action)} onClick={(event) => actOnClick(event, action)}>{item.label[locale]}</a>
          })}
        </nav>
        <button className="quiet-button" type="button" onClick={() => onAction({
          type: 'dataset', ref: { toolId: manifestEntry.toolId, datasetId: manifestEntry.datasetId },
        })}>{labels.backToTool}</button>
      </div>
      <section className="explorer-filter-toolbar" aria-label={labels.filterLabel}>
        <label className="search-field" htmlFor="explorer-search">
          <span className="sr-only">{labels.search}</span>
          <input id="explorer-search" ref={searchRef} type="search" value={navigation.docQ}
            data-history-focus-key="explorer-search" aria-label={labels.search} placeholder={labels.searchPlaceholder}
            onChange={(event) => onAction({ type: 'search', value: event.target.value })} />
        </label>
        {resolvedFilters.controls.map((control) => <label className="explorer-select-field" key={control.key}>
          <span>{labels[control.label]}</span>
          <select value={String(resolvedFilters.filters?.[control.key] ?? 'all')} onChange={(event) => onAction({
            type: 'filters', value: { ...(resolvedFilters.filters as ExplorerFilters), [control.key]: event.target.value },
          })}>
            <option value="all">{labels.all}</option>
            {control.values.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>)}
        {resolvedFilters.hasNeeds && <fieldset className="explorer-needs-filter"><legend>{labels.needs}</legend>
          {(['issues', 'git', 'sprint', 'baseline'] as const).map((need) => <label key={need}>
            <input type="checkbox" checked={resolvedFilters.filters?.needs.includes(need) ?? false}
              onChange={(event) => onAction({ type: 'filters', value: {
                ...(resolvedFilters.filters as ExplorerFilters),
                needs: event.target.checked
                  ? [...(resolvedFilters.filters?.needs ?? []), need]
                  : (resolvedFilters.filters?.needs ?? []).filter((value) => value !== need),
              } })} />{need}
          </label>)}
        </fieldset>}
        <button type="button" className="reset-button" onClick={() => {
          onPatch({ docQ: '', entry: null, docCount: 48, operation: 'all', workspace: 'all', machineOutput: 'all', needs: [], mutates: 'all',
            jsonOutput: 'all', available: 'all', envCategory: 'all', featureStatus: 'all', argType: 'all', argRequired: 'all' }, 'replace')
          searchRef.current?.focus()
        }}>{labels.resetFilters}</button>
      </section>
      <div className="explorer-provenance-summary">
        <span><strong>{labels.filename}</strong> <code>{manifestEntry.filename}</code></span>
        <span><strong>{labels.bytes}</strong> {manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')}</span>
      </div>
      {readyDataset.dataset.diagnostics.map((diagnostic, index) => <p key={`${diagnostic.code}:${diagnostic.pointer}:${index}`}
        className="notice notice-warning" role="status">{diagnostic.explanation[locale]} <code>{diagnostic.pointer || '/'}</code></p>)}
      {readyDataset.dataset.entries.length === 0
        ? <div className="empty-state"><p>{labels.emptySource}</p></div>
        : <FamilyView {...viewProps} />}
    </>
  }

  return <section className="tool-explorer">
    <header className="screen-intro">
      <span className="section-eyebrow">{labels.toolSources}</span>
      <h1 id="screen-heading" tabIndex={-1}>{labels.indexDescription && (locale === 'de' ? 'Werkzeuge erkunden' : 'Explore tools')}</h1>
      <p>{labels.indexDescription}</p>
    </header>
    {navigation.docQTruncated && <p className="notice notice-warning" role="status">
      {labels.queryTruncated}
    </p>}
    {navigation.routeError && renderError('invalid-route')}
    {!navigation.routeError && manifestState.status === 'loading' && <div className="empty-state" role="status" aria-busy="true">
      <span className="loading-indicator" /><p>{labels.manifestLoading}</p>
    </div>}
    {!navigation.routeError && manifestState.status === 'error' && <div className="empty-state error-state" role="alert">
      <h2>{labels.manifestError}</h2><p className="explorer-load-error" data-error-kind={manifestState.error.kind}>{manifestState.error.kind}: {manifestState.error.code}</p>
      <button type="button" className="workbench-button" onClick={onRetryManifest}>{labels.retryManifest}</button>
    </div>}
    {manifestState.status === 'ready' && !navigation.routeError && resolutionKind === 'index' && renderIndex()}
    {manifestState.status === 'ready' && !navigation.routeError && resolutionKind === 'tool' && renderTool()}
    {manifestState.status === 'ready' && !navigation.routeError && resolutionKind === 'error' && routeErrorCode && renderError(routeErrorCode)}
    {manifestState.status === 'ready' && !navigation.routeError && resolutionKind === 'dataset' && renderDataset()}
  </section>
}

const explorerLabelKeys: Record<ExplorerLabelKey, true> = {
  heading: true, queryTruncated: true, indexDescription: true, manifestLoading: true, manifestError: true, retryManifest: true, datasetLoading: true,
  datasetError: true, retryDataset: true, backToIndex: true, backToTool: true, backToSource: true,
  toolSources: true, sourceCount: true, chooseSource: true, sections: true, search: true, searchPlaceholder: true,
  resetFilters: true, loadMore: true,
  matches: true, noTools: true, noSources: true, emptySource: true, emptySection: true, noMatches: true,
  filterLabel: true, filename: true, digest: true, bytes: true, version: true, contract: true, generatedAt: true,
  downloadOriginal: true, closeEntry: true, selectEntry: true, openSubtree: true, treeLimited: true, rawPreview: true,
  previewLimited: true, jsonRoot: true, invalidRoute: true, unknownTool: true, unknownDataset: true,
  unknownSection: true, unknownEntry: true, invalidFilter: true, diagnosticSyntax: true, diagnosticDomain: true,
  diagnosticNotApplicable: true, catalogIdentity: true, operation: true, workspace: true, machineOutput: true,
  needs: true, mutates: true, jsonOutput: true, available: true, envCategory: true, featureStatus: true,
  argType: true, argRequired: true, all: true, yes: true, no: true,
}
