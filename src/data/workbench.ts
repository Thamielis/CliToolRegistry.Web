import type { CatalogSnapshot, CliTool, ToolPlatform } from '../types/app'
import type { DatasetRef, ManifestEntry } from '../types/explorer'

export const SECTIONS = ['overview', 'catalog', 'dependencies', 'lab', 'guide', 'explore'] as const
export type Section = typeof SECTIONS[number]
export type CatalogView = 'card' | 'enhanced' | 'list'

export type ExplorerFilters = {
  operation: 'all' | 'read' | 'write' | 'mixed'
  workspace: 'all' | 'required' | 'optional' | 'none'
  machineOutput: string
  needs: ('issues' | 'git' | 'sprint' | 'baseline')[]
  mutates: 'all' | 'yes' | 'no'
  jsonOutput: 'all' | 'yes' | 'no'
  available: 'all' | 'yes' | 'no'
  envCategory: string
  featureStatus: string
  argType: 'all' | 'option' | 'flag' | 'positional'
  argRequired: 'all' | 'yes' | 'no'
}

export type ParsedExplorerFilters = {
  operation: string
  workspace: string
  machineOutput: string
  needs: string[]
  mutates: string
  jsonOutput: string
  available: string
  envCategory: string
  featureStatus: string
  argType: string
  argRequired: string
}

export type FilterDiagnostic = {
  code: 'invalid-filter'
  parameter: keyof ParsedExplorerFilters
  reason: 'syntax' | 'domain' | 'not-applicable'
}

export type ResolvedExplorerNavigation = {
  ref: DatasetRef
  sectionId: string | null
  entryId: string | null
  docQ: string
  docCount: number
  filters: ExplorerFilters
  navigationTicket: string
}

export type ExplorerResolution =
  | { kind: 'index' }
  | { kind: 'tool'; toolId: string; datasets: ManifestEntry[] }
  | { kind: 'dataset'; navigation: ResolvedExplorerNavigation; diagnostics: FilterDiagnostic[]; needsReplace: boolean }
  | { kind: 'error'; code: 'invalid-route' | 'unknown-tool' | 'unknown-dataset' | 'unknown-section' | 'unknown-entry' }

export type NavigationCause = 'initial' | 'push' | 'replace' | 'pop'

export type ExplorerNavigationAction =
  | { type: 'tool'; toolId: string }
  | { type: 'dataset'; ref: DatasetRef }
  | { type: 'section'; sectionId: string }
  | { type: 'entry'; entryId: string }
  | { type: 'close-entry' }
  | { type: 'search'; value: string }
  | { type: 'filters'; value: ExplorerFilters }
  | { type: 'more'; docCount: number }

export type NavigationTransition = {
  state: NavigationState
  cause: 'push' | 'replace'
  focusTarget: 'heading' | 'entry' | 'trigger' | 'more' | null
}

export type WorkbenchHistoryData = {
  historyId: string
  scrollY: number
  focusKey: string | null
}

export const WORKBENCH_HISTORY_KEY = 'cliToolRegistryWorkbenchV1'
export const DEFAULT_DOC_COUNT = 48
export const MAX_DOC_COUNT = 10000
export const MAX_DOC_QUERY_CODEPOINTS = 500

export const DEFAULT_EXPLORER_FILTERS: ExplorerFilters = {
  operation: 'all',
  workspace: 'all',
  machineOutput: 'all',
  needs: [],
  mutates: 'all',
  jsonOutput: 'all',
  available: 'all',
  envCategory: 'all',
  featureStatus: 'all',
  argType: 'all',
  argRequired: 'all',
}

export const EXPLORER_OWNED_QUERY_PARAMS = [
  'exploreTool', 'dataset', 'docSection', 'entry', 'docQ', 'docCount',
  'operation', 'workspace', 'machineOutput', 'needs', 'mutates', 'jsonOutput',
  'available', 'envCategory', 'featureStatus', 'argType', 'argRequired',
] as const

export interface NavigationState {
  section: Section
  query: string
  category: string
  platform: ToolPlatform | 'all'
  sort: 'name' | 'category'
  view: CatalogView
  tool: string | null
  count: number
  exploreTool: string | null
  dataset: string | null
  docSection: string | null
  entry: string | null
  docQ: string
  docQTruncated: boolean
  docCount: number
  operation: string
  workspace: string
  machineOutput: string
  needs: string[]
  mutates: string
  jsonOutput: string
  available: string
  envCategory: string
  featureStatus: string
  argType: string
  argRequired: string
  routeError: 'invalid-route' | null
  needsReplace: boolean
}

export function parseNavigation(search: string, preferredView: CatalogView = 'enhanced'): NavigationState {
  const params = new URLSearchParams(search)
  const section = params.get('section')
  const platform = params.get('platform')
  const view = params.get('view')
  const count = Number(params.get('count') ?? 48)
  const resolvedSection: Section = SECTIONS.includes(section as Section) ? section as Section : params.get('tool') ? 'catalog' : 'overview'
  const exploreEnabled = resolvedSection === 'explore'
  let routeError: NavigationState['routeError'] = null
  const boundedId = (key: string, limit: number): string | null => {
    const value = params.get(key)
    if (value === null || value === '') return null
    if (Array.from(value).length > limit) {
      routeError = 'invalid-route'
      return null
    }
    return value
  }
  const docQValue = exploreEnabled ? params.get('docQ') ?? '' : ''
  const docQParts = Array.from(docQValue)
  const docQTruncated = docQParts.length > MAX_DOC_QUERY_CODEPOINTS
  const orderedNeeds = (): string[] => {
    const knownOrder = ['issues', 'git', 'sprint', 'baseline']
    const values = [...new Set(params.getAll('needs'))]
    const known = knownOrder.filter((value) => values.includes(value))
    const unknown = values.filter((value) => !knownOrder.includes(value))
    return [...known, ...unknown]
  }
  const normalizedDocCount = Number(params.get('docCount') ?? DEFAULT_DOC_COUNT)
  const state: NavigationState = {
    section: resolvedSection,
    query: params.get('q') ?? '',
    category: params.get('category') || 'all',
    platform: ['windows', 'linux', 'wsl2', 'macos'].includes(platform ?? '') ? platform as ToolPlatform : 'all',
    sort: params.get('sort') === 'category' ? 'category' : 'name',
    view: ['card', 'enhanced', 'list'].includes(view ?? '') ? view as CatalogView : preferredView,
    tool: params.get('tool') || null,
    count: Number.isSafeInteger(count) && count >= 48 ? Math.min(count, 10000) : 48,
    exploreTool: exploreEnabled ? boundedId('exploreTool', 64) : null,
    dataset: exploreEnabled ? boundedId('dataset', 64) : null,
    docSection: exploreEnabled ? boundedId('docSection', 64) : null,
    entry: exploreEnabled ? boundedId('entry', 2048) : null,
    docQ: docQTruncated ? docQParts.slice(0, MAX_DOC_QUERY_CODEPOINTS).join('') : docQValue,
    docQTruncated,
    docCount: Number.isSafeInteger(normalizedDocCount) && normalizedDocCount > 0
      ? Math.min(normalizedDocCount, MAX_DOC_COUNT)
      : DEFAULT_DOC_COUNT,
    operation: exploreEnabled ? params.get('operation') ?? 'all' : 'all',
    workspace: exploreEnabled ? params.get('workspace') ?? 'all' : 'all',
    machineOutput: exploreEnabled ? params.get('machineOutput') ?? 'all' : 'all',
    needs: exploreEnabled ? orderedNeeds() : [],
    mutates: exploreEnabled ? params.get('mutates') ?? 'all' : 'all',
    jsonOutput: exploreEnabled ? params.get('jsonOutput') ?? 'all' : 'all',
    available: exploreEnabled ? params.get('available') ?? 'all' : 'all',
    envCategory: exploreEnabled ? params.get('envCategory') ?? 'all' : 'all',
    featureStatus: exploreEnabled ? params.get('featureStatus') ?? 'all' : 'all',
    argType: exploreEnabled ? params.get('argType') ?? 'all' : 'all',
    argRequired: exploreEnabled ? params.get('argRequired') ?? 'all' : 'all',
    routeError,
    needsReplace: false,
  }
  if (exploreEnabled && state.dataset && !state.exploreTool) state.routeError = 'invalid-route'

  const compareHref = `https://workbench.invalid/${search.startsWith('?') ? search : `?${search}`}`
  const canonical = navigationUrl(state, compareHref)
  const normalizedSearch = new URL(canonical, compareHref).searchParams.toString()
  state.needsReplace = normalizedSearch !== new URLSearchParams(search).toString()
  return state
}

export function navigationUrl(state: NavigationState, href: string): string {
  const url = new URL(href)
  const values = { section: state.section, q: state.query, category: state.category === 'all' ? '' : state.category,
    platform: state.platform === 'all' ? '' : state.platform, sort: state.sort, view: state.view,
    tool: state.tool ?? '', count: state.count === 48 ? '' : String(state.count) }
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  if (state.section === 'explore') {
    const explorerValues: [string, string][] = [
      ['exploreTool', state.exploreTool ?? ''], ['dataset', state.dataset ?? ''],
      ['docSection', state.docSection ?? ''], ['entry', state.entry ?? ''],
      ['docQ', state.docQ], ['docCount', state.docCount === DEFAULT_DOC_COUNT ? '' : String(state.docCount)],
      ['needs', ''],
      ['operation', state.operation === 'all' ? '' : state.operation],
      ['workspace', state.workspace === 'all' ? '' : state.workspace],
      ['machineOutput', state.machineOutput === 'all' ? '' : state.machineOutput],
      ['mutates', state.mutates === 'all' ? '' : state.mutates],
      ['jsonOutput', state.jsonOutput === 'all' ? '' : state.jsonOutput],
      ['available', state.available === 'all' ? '' : state.available],
      ['envCategory', state.envCategory === 'all' ? '' : state.envCategory],
      ['featureStatus', state.featureStatus === 'all' ? '' : state.featureStatus],
      ['argType', state.argType === 'all' ? '' : state.argType],
      ['argRequired', state.argRequired === 'all' ? '' : state.argRequired],
    ]
    for (const [key] of explorerValues) url.searchParams.delete(key)
    for (const [key, value] of explorerValues) if (value) url.searchParams.append(key, value)
    const knownOrder = ['issues', 'git', 'sprint', 'baseline']
    const needs = [...knownOrder.filter((value) => state.needs.includes(value)),
      ...state.needs.filter((value) => !knownOrder.includes(value))]
    for (const value of [...new Set(needs)]) url.searchParams.append('needs', value)
  } else {
    for (const key of EXPLORER_OWNED_QUERY_PARAMS) url.searchParams.delete(key)
  }
  url.hash = ''
  return url.pathname + url.search
}

function resetExplorerRoute(state: NavigationState): void {
  state.exploreTool = null
  state.dataset = null
  state.docSection = null
  state.entry = null
  state.docQ = ''
  state.docQTruncated = false
  state.docCount = DEFAULT_DOC_COUNT
  state.operation = 'all'
  state.workspace = 'all'
  state.machineOutput = 'all'
  state.needs = []
  state.mutates = 'all'
  state.jsonOutput = 'all'
  state.available = 'all'
  state.envCategory = 'all'
  state.featureStatus = 'all'
  state.argType = 'all'
  state.argRequired = 'all'
}

/** Apply a central state patch and enforce the reset rules shared by every screen. */
export function applyNavigationPatch(state: NavigationState, patch: Partial<NavigationState>): NavigationState {
  const next = { ...state, ...patch }
  if (patch.section !== undefined && patch.section !== state.section) {
    next.tool = null
    next.routeError = null
    if (patch.section !== 'explore') resetExplorerRoute(next)
  }

  if (Object.hasOwn(patch, 'exploreTool') && patch.exploreTool !== state.exploreTool) {
    resetExplorerRoute(next)
    next.exploreTool = patch.exploreTool ?? null
    next.routeError = null
  } else if (Object.hasOwn(patch, 'dataset') && patch.dataset !== state.dataset) {
    next.docSection = null
    next.entry = null
    next.docQ = ''
    next.docQTruncated = false
    next.docCount = DEFAULT_DOC_COUNT
    next.operation = 'all'
    next.workspace = 'all'
    next.machineOutput = 'all'
    next.needs = []
    next.mutates = 'all'
    next.jsonOutput = 'all'
    next.available = 'all'
    next.envCategory = 'all'
    next.featureStatus = 'all'
    next.argType = 'all'
    next.argRequired = 'all'
    next.routeError = null
  } else if (Object.hasOwn(patch, 'docSection') && patch.docSection !== state.docSection) {
    next.entry = null
  }

  const searchChanged = Object.hasOwn(patch, 'docQ') && patch.docQ !== state.docQ
  const filterChanged = ['operation', 'workspace', 'machineOutput', 'needs', 'mutates', 'jsonOutput', 'available',
    'envCategory', 'featureStatus', 'argType', 'argRequired'].some((key) =>
    Object.hasOwn(patch, key) && JSON.stringify(patch[key as keyof NavigationState]) !== JSON.stringify(state[key as keyof NavigationState]))
  if (searchChanged || filterChanged) {
    next.entry = null
    next.docCount = DEFAULT_DOC_COUNT
  }
  return next
}

function normalizedDocQuery(value: string): { value: string; truncated: boolean } {
  const codepoints = Array.from(value)
  return {
    value: codepoints.slice(0, MAX_DOC_QUERY_CODEPOINTS).join(''),
    truncated: codepoints.length > MAX_DOC_QUERY_CODEPOINTS,
  }
}

export function transitionExplorerNavigation(state: NavigationState, action: ExplorerNavigationAction): NavigationTransition {
  if (action.type === 'tool') {
    const next = applyNavigationPatch(state, { section: 'explore', exploreTool: action.toolId })
    return { state: next, cause: 'push', focusTarget: 'heading' }
  }
  if (action.type === 'dataset') {
    let next = applyNavigationPatch(state, { section: 'explore', exploreTool: action.ref.toolId })
    next = applyNavigationPatch(next, { dataset: action.ref.datasetId })
    return { state: next, cause: 'push', focusTarget: 'heading' }
  }
  if (action.type === 'section') {
    return { state: applyNavigationPatch(state, { docSection: action.sectionId }), cause: 'push', focusTarget: 'heading' }
  }
  if (action.type === 'entry') {
    return { state: applyNavigationPatch(state, { entry: action.entryId }), cause: 'push', focusTarget: 'entry' }
  }
  if (action.type === 'close-entry') {
    return { state: applyNavigationPatch(state, { entry: null }), cause: 'replace', focusTarget: 'trigger' }
  }
  if (action.type === 'search') {
    const docQ = normalizedDocQuery(action.value)
    return {
      state: applyNavigationPatch(state, { docQ: docQ.value, docQTruncated: docQ.truncated }),
      cause: 'replace', focusTarget: null,
    }
  }
  if (action.type === 'filters') {
    return {
      state: applyNavigationPatch(state, { ...action.value, entry: null, docCount: DEFAULT_DOC_COUNT }),
      cause: 'replace', focusTarget: null,
    }
  }
  return {
    state: applyNavigationPatch(state, {
      docCount: Number.isSafeInteger(action.docCount) && action.docCount > 0
        ? Math.min(action.docCount, MAX_DOC_COUNT)
        : DEFAULT_DOC_COUNT,
    }),
    cause: 'replace', focusTarget: 'more',
  }
}

export function isWorkbenchHistoryData(value: unknown): value is WorkbenchHistoryData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.historyId === 'string' && candidate.historyId.length > 0 &&
    typeof candidate.scrollY === 'number' && Number.isFinite(candidate.scrollY) && candidate.scrollY >= 0 &&
    (candidate.focusKey === null || typeof candidate.focusKey === 'string')
}

export function readWorkbenchHistoryData(state: unknown): WorkbenchHistoryData | null {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return null
  const value = (state as Record<string, unknown>)[WORKBENCH_HISTORY_KEY]
  return isWorkbenchHistoryData(value) ? value : null
}

/** Preserve foreign history fields and wrap primitive state under foreignState. */
export function withWorkbenchHistoryData(state: unknown, data: WorkbenchHistoryData): Record<string, unknown> {
  const merged: Record<string, unknown> = typeof state === 'object' && state !== null && !Array.isArray(state)
    ? { ...state as Record<string, unknown> }
    : { foreignState: state }
  merged[WORKBENCH_HISTORY_KEY] = data
  return merged
}

export function createNavigationTicket(historyId: string, sequence: number): string {
  return `${historyId}:${sequence}`
}

export interface DependencyEdge {
  from: string
  to: string
  kind: 'required' | 'recommended'
  resolved: boolean
}

export function dependencyEdges(tools: CliTool[]): DependencyEdge[] {
  const ids = new Set(tools.map((tool) => tool.id))
  const edges: DependencyEdge[] = []
  for (const tool of tools) {
    for (const kind of ['required', 'recommended'] as const) {
      for (const to of new Set(tool.dependencies?.[kind] ?? [])) {
        edges.push({ from: tool.id, to, kind, resolved: ids.has(to) })
      }
    }
  }
  return edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind))
}

function canonical(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    if (['tags', 'platforms', 'required', 'recommended'].includes(key) && value.every((item) => typeof item === 'string')) {
      return [...new Set(value)].sort()
    }
    return value.map((item) => canonical(item))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([name, nested]) => [name, canonical(nested, name)]))
  }
  return value
}

export interface CatalogChange {
  id: string
  kind: 'added' | 'removed' | 'modified'
  before: CliTool | null
  after: CliTool | null
  fields: string[]
}

export function compareCatalogs(before: CatalogSnapshot, after: CatalogSnapshot): CatalogChange[] {
  const oldTools = new Map(before.tools.map((tool) => [tool.id, tool]))
  const newTools = new Map(after.tools.map((tool) => [tool.id, tool]))
  const changes: CatalogChange[] = []
  for (const id of [...new Set([...oldTools.keys(), ...newTools.keys()])].sort()) {
    const oldTool = oldTools.get(id) ?? null
    const newTool = newTools.get(id) ?? null
    const fields = oldTool && newTool
      ? [...new Set([...Object.keys(oldTool), ...Object.keys(newTool)])].sort().filter((key) =>
        JSON.stringify(canonical((oldTool as unknown as Record<string, unknown>)[key], key)) !==
        JSON.stringify(canonical((newTool as unknown as Record<string, unknown>)[key], key)))
      : []
    if (!oldTool || !newTool || fields.length) {
      changes.push({ id, kind: !oldTool ? 'added' : !newTool ? 'removed' : 'modified', before: oldTool, after: newTool, fields })
    }
  }
  return changes
}

export function downloadJson(value: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
