import type { CatalogSnapshot, CliTool, ToolPlatform } from '../types/app'

export const SECTIONS = ['overview', 'catalog', 'dependencies', 'lab', 'guide'] as const
export type Section = typeof SECTIONS[number]
export type CatalogView = 'card' | 'enhanced' | 'list'
export interface NavigationState {
  section: Section
  query: string
  category: string
  platform: ToolPlatform | 'all'
  sort: 'name' | 'category'
  view: CatalogView
  tool: string | null
  count: number
}

export function parseNavigation(search: string, preferredView: CatalogView = 'enhanced'): NavigationState {
  const params = new URLSearchParams(search)
  const section = params.get('section')
  const platform = params.get('platform')
  const view = params.get('view')
  const count = Number(params.get('count') ?? 48)
  return {
    section: SECTIONS.includes(section as Section) ? section as Section : params.get('tool') ? 'catalog' : 'overview',
    query: params.get('q') ?? '',
    category: params.get('category') || 'all',
    platform: ['windows', 'linux', 'wsl2', 'macos'].includes(platform ?? '') ? platform as ToolPlatform : 'all',
    sort: params.get('sort') === 'category' ? 'category' : 'name',
    view: ['card', 'enhanced', 'list'].includes(view ?? '') ? view as CatalogView : preferredView,
    tool: params.get('tool') || null,
    count: Number.isSafeInteger(count) && count >= 48 ? Math.min(count, 10000) : 48,
  }
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
  url.hash = ''
  return url.pathname + url.search
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
