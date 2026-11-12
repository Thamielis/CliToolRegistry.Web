import type { CliTool, CliToolDefinition, ToolPlatform } from '../types/app'
import { validateToolDefinition } from './schemaValidation'

const STORAGE_PREFIX = 'cli-tool-registry.workspace.v2'
const LEGACY_KEY = 'cli-tool-registry.my-tools.v1'
const ACTIVE_KEY = `${STORAGE_PREFIX}.active`
const SLOT_KEYS = [`${STORAGE_PREFIX}.a`, `${STORAGE_PREFIX}.b`] as const
const PLATFORMS: ToolPlatform[] = ['windows', 'linux', 'wsl2', 'macos']

export interface WorkspaceTool {
  key: string
  kind: 'override' | 'custom'
  baseId?: string
  definition: CliToolDefinition
  legacyId?: string
  needsReview?: boolean
}

export interface WorkspaceCollection {
  id: string
  name: string
  description: string
  toolIds: string[]
}

export interface WorkspaceProfile {
  id: string
  definition: import('../types/app').CliToolProfileDefinition
}

export interface WorkspaceState {
  version: 2
  tools: WorkspaceTool[]
  collections: WorkspaceCollection[]
  profiles: WorkspaceProfile[]
}

export interface WorkspaceLoad {
  state: WorkspaceState
  blocked: boolean
  migrated: boolean
  raw: string | null
  error: 'unavailable' | 'corrupt' | null
}

export const EMPTY_WORKSPACE: WorkspaceState = { version: 2, tools: [], collections: [], profiles: [] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isWorkspaceState(value: unknown): value is WorkspaceState {
  return isRecord(value) && value.version === 2 && Array.isArray(value.tools) &&
    value.tools.every((tool) => isRecord(tool) && typeof tool.key === 'string' &&
      (tool.kind === 'custom' || tool.kind === 'override') && isRecord(tool.definition)) &&
    Array.isArray(value.collections) && value.collections.every((collection) => isRecord(collection) &&
      typeof collection.id === 'string' && typeof collection.name === 'string' &&
      typeof collection.description === 'string' && isStringArray(collection.toolIds)) &&
    (value.profiles === undefined || Array.isArray(value.profiles) && value.profiles.every((profile) =>
      isRecord(profile) && typeof profile.id === 'string' && isRecord(profile.definition)))
}

function slug(value: string, fallback: string): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function definitionFromLegacy(value: Record<string, unknown>, id: string): CliToolDefinition {
  const { catalogFile: _catalogFile, catalogUrl: _catalogUrl, personalSource: _personalSource, ...source } = value
  return { ...source, id } as CliToolDefinition
}

function migrateLegacy(value: unknown, catalogTools: readonly CliTool[]): WorkspaceState | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tools) || !Array.isArray(value.packages)) return null
  const catalogIds = new Set(catalogTools.map((tool) => tool.id))
  const usedIds = new Set<string>(catalogIds)
  const idMap = new Map<string, string>()
  const tools: WorkspaceTool[] = []

  for (const item of value.tools) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue
    const originalId = item.id
    const isCatalog = item.personalSource === 'catalog' || item.personalSource === undefined && catalogIds.has(originalId)
    if (isCatalog) {
      const definition = definitionFromLegacy(item, originalId)
      tools.push({ key: `override:${originalId}`, kind: 'override', baseId: originalId, definition })
      idMap.set(originalId, originalId)
      continue
    }
    let id = slug(originalId, slug(item.name, 'custom-tool'))
    let suffix = 2
    while (usedIds.has(id)) id = `${slug(originalId, 'custom-tool')}-${suffix++}`
    usedIds.add(id)
    idMap.set(originalId, id)
    const definition = definitionFromLegacy(item, id)
    tools.push({ key: `custom:${id}`, kind: 'custom', definition, legacyId: originalId })
  }

  const collections: WorkspaceCollection[] = value.packages.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.name !== 'string' || !isStringArray(item.toolIds)) return []
    return [{
      id: typeof item.id === 'string' ? item.id : `collection-${index + 1}`,
      name: item.name,
      description: typeof item.description === 'string' ? item.description : '',
      toolIds: [...new Set(item.toolIds.map((id) => idMap.get(id) ?? id))],
    }]
  })
  return { version: 2, tools, collections, profiles: [] }
}

function parseSlot(raw: string | null): WorkspaceState | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!isWorkspaceState(value)) return null
    return { ...value, profiles: value.profiles ?? [] }
  } catch { return null }
}

export function loadWorkspace(catalogTools: readonly CliTool[]): WorkspaceLoad {
  if (typeof localStorage === 'undefined') return { state: EMPTY_WORKSPACE, blocked: true, migrated: false, raw: null, error: 'unavailable' }
  try {
    const active = localStorage.getItem(ACTIVE_KEY)
    const first = active === 'b' ? 1 : 0
    const slotA = localStorage.getItem(SLOT_KEYS[0])
    const slotB = localStorage.getItem(SLOT_KEYS[1])
    const preferred = parseSlot(first === 0 ? slotA : slotB)
    const fallback = parseSlot(first === 0 ? slotB : slotA)
    if (preferred || fallback) return { state: preferred ?? fallback!, blocked: false, migrated: false, raw: null, error: null }
    if (slotA !== null || slotB !== null) return { state: EMPTY_WORKSPACE, blocked: true, migrated: false, raw: slotA ?? slotB, error: 'corrupt' }

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy === null) return { state: EMPTY_WORKSPACE, blocked: false, migrated: false, raw: null, error: null }
    try {
      const migrated = migrateLegacy(JSON.parse(legacy), catalogTools)
      return migrated
        ? { state: migrated, blocked: false, migrated: true, raw: legacy, error: null }
        : { state: EMPTY_WORKSPACE, blocked: true, migrated: false, raw: legacy, error: 'corrupt' }
    } catch {
      return { state: EMPTY_WORKSPACE, blocked: true, migrated: false, raw: legacy, error: 'corrupt' }
    }
  } catch {
    return { state: EMPTY_WORKSPACE, blocked: true, migrated: false, raw: null, error: 'unavailable' }
  }
}

export function saveWorkspace(state: WorkspaceState): boolean {
  try {
    const active = localStorage.getItem(ACTIVE_KEY)
    const next = active === 'a' ? 'b' : 'a'
    const key = SLOT_KEYS[next === 'a' ? 0 : 1]
    const serialized = JSON.stringify(state)
    localStorage.setItem(key, serialized)
    if (!parseSlot(localStorage.getItem(key))) return false
    localStorage.setItem(ACTIVE_KEY, next)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('cli-tool-registry:workspace-updated'))
    return true
  } catch { return false }
}

export function definitionForTool(tool: CliTool): CliToolDefinition {
  const { catalogFile: _catalogFile, catalogUrl: _catalogUrl, ...definition } = tool
  return JSON.parse(JSON.stringify(definition)) as CliToolDefinition
}

export function combineWorkspaceTools(catalogTools: readonly CliTool[], localTools: readonly WorkspaceTool[]): CliTool[] {
  const readyTools = localTools.filter((tool) => validateToolDefinition(tool.definition).state === 'valid')
  const overrides = new Map(readyTools.filter((tool) => tool.kind === 'override' && tool.baseId)
    .map((tool) => [tool.baseId!, tool.definition]))
  const custom = readyTools.filter((tool) => tool.kind === 'custom')
  const merged = catalogTools.map((tool) => {
    const override = overrides.get(tool.id)
    return override ? { ...tool, ...override, catalogFile: tool.catalogFile, catalogUrl: tool.catalogUrl } as CliTool : tool
  })
  for (const tool of custom) {
    merged.push({ ...tool.definition, catalogFile: 'local', catalogUrl: '' } as CliTool)
  }
  return merged
}

export function supportedPlatformValues(value: unknown): ToolPlatform[] {
  return Array.isArray(value) ? value.filter((item): item is ToolPlatform =>
    typeof item === 'string' && PLATFORMS.includes(item as ToolPlatform)) : []
}
