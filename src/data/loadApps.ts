import type { CatalogSnapshot, CliTool, ToolPlatform } from '../types/app'

export type InstallAction =
  | { kind: 'command'; command: string; method?: string }
  | { kind: 'recipe'; commandName: string; arguments: string[]; method?: string; note?: string }
  | { kind: 'note'; note: string; method?: string }

export interface InstallEntry {
  platform: ToolPlatform | 'all'
  action: InstallAction
}

export const CATALOG_DIRECTORY = 'src/CliToolRegistry/Data/Tools'
export const CATALOG_REPOSITORY_URL = 'https://github.com/In-Pro-Org/CliToolRegistry'
export const CATALOG_SOURCE_URL = CATALOG_REPOSITORY_URL
const CACHE_KEY = 'cli-tool-registry.catalog.v2'

let activeRequest: Promise<CatalogSnapshot> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCatalogSnapshot(value: unknown): value is CatalogSnapshot {
  if (!isRecord(value) || !Array.isArray(value.tools) || typeof value.loadedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.loadedAt)) || typeof value.fileCount !== 'number' ||
    !Number.isSafeInteger(value.fileCount) || value.fileCount < 0) return false
  if (['sourceRef', 'sourceRepository'].some((key) => value[key] != null && typeof value[key] !== 'string')) return false
  const ids = new Set<string>()
  const strings = (items: unknown) => items === undefined ||
    Array.isArray(items) && items.every((item) => typeof item === 'string')
  const safeLink = (link: unknown) => {
    if (link == null) return true
    if (typeof link !== 'string') return false
    try { return ['http:', 'https:'].includes(new URL(link).protocol) } catch { return false }
  }
  return value.tools.every((tool) => {
    if (!isRecord(tool) || !['id', 'name', 'description', 'category', 'tier', 'catalogFile', 'catalogUrl']
      .every((key) => typeof tool[key] === 'string') || !tool.id || ids.has(tool.id as string) ||
      (tool.command !== undefined && tool.command !== null && typeof tool.command !== 'string') ||
      !Array.isArray(tool.platforms) || !tool.platforms.every((p) => ['windows', 'linux', 'wsl2', 'macos'].includes(p)) ||
      !strings(tool.tags) || !strings(tool.notes) || !safeLink(tool.website) || !safeLink(tool.repository) ||
      !safeLink(tool.catalogUrl)) return false
    if (tool.dependencies != null && (!isRecord(tool.dependencies) ||
      !strings(tool.dependencies.required) || !strings(tool.dependencies.recommended))) return false
    for (const key of ['install', 'update', 'robotMode']) {
      if (tool[key] != null && !isRecord(tool[key])) return false
    }
    for (const key of ['healthCheck', 'versionCommand', 'capabilitiesCommand']) {
      if (tool[key] != null && typeof tool[key] !== 'string' && !isRecord(tool[key])) return false
    }
    ids.add(tool.id as string)
    return true
  })
}

async function fetchCatalog(): Promise<CatalogSnapshot> {
  const catalogUrl = import.meta.env.BASE_URL + 'registry-catalog.json?refresh=' + Date.now()
  const response = await fetch(catalogUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('Der veröffentlichte Registry-Katalog konnte nicht geladen werden.')

  const snapshot: unknown = await response.json()
  if (!isCatalogSnapshot(snapshot)) {
    throw new Error('Der veröffentlichte Registry-Katalog hat ein ungültiges Format.')
  }
  return snapshot
}

export function loadToolCatalog(): Promise<CatalogSnapshot> {
  if (!activeRequest) {
    activeRequest = fetchCatalog().finally(() => {
      activeRequest = null
    })
  }
  return activeRequest
}

export function readCatalogCache(): CatalogSnapshot | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (!stored) return null
    const snapshot: unknown = JSON.parse(stored)
    if (!isCatalogSnapshot(snapshot)) {
      return null
    }
    return snapshot
  } catch {
    return null
  }
}

export function writeCatalogCache(snapshot: CatalogSnapshot): boolean {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

const INSTALL_METADATA_KEYS = new Set([
  'id', 'method', 'url', 'description', 'supported', 'format', 'commandName', 'arguments', 'note',
])

function classifyCommand(command: string, method?: string): InstallAction | null {
  const value = command.trim()
  if (!value) return null

  const informationalEcho = value.match(/^echo\s+(?:"(Install .+? through ACFS)"|'(Install .+? through ACFS)'|(Install .+? through ACFS))$/i)
  if (informationalEcho) {
    return {
      kind: 'note',
      note: informationalEcho[1] ?? informationalEcho[2] ?? informationalEcho[3],
      ...(method !== undefined ? { method } : {}),
    }
  }

  return { kind: 'command', command, ...(method !== undefined ? { method } : {}) }
}

export function resolveInstallAction(value: unknown, method?: string): InstallAction | null {
  if (typeof value === 'string') return classifyCommand(value, method)
  if (!isRecord(value)) return null

  const declaredMethod = typeof value.method === 'string' ? value.method : method
  if (typeof value.command === 'string') return classifyCommand(value.command, declaredMethod)

  if (typeof value.commandName === 'string' && Array.isArray(value.arguments) &&
    value.arguments.every((argument) => typeof argument === 'string')) {
    return {
      kind: 'recipe',
      commandName: value.commandName,
      arguments: value.arguments as string[],
      ...(declaredMethod !== undefined ? { method: declaredMethod } : {}),
      ...(typeof value.note === 'string' ? { note: value.note } : {}),
    }
  }

  if (typeof value.note === 'string') {
    return { kind: 'note', note: value.note, ...(declaredMethod !== undefined ? { method: declaredMethod } : {}) }
  }

  for (const [key, nested] of Object.entries(value)) {
    if (INSTALL_METADATA_KEYS.has(key)) continue
    if (typeof nested === 'string') {
      const action = classifyCommand(nested, key)
      if (action) return action
      continue
    }
    if (isRecord(nested)) {
      const action = resolveInstallAction(nested, key)
      if (action) return action
    }
  }
  return null
}

export function getPlatformInstallAction(
  commands: Record<string, unknown> | undefined,
  platform: ToolPlatform,
): InstallAction | null {
  if (!commands) return null
  const direct = resolveInstallAction(commands[platform])
  if (direct && direct.kind !== 'note') return direct

  const universal = resolveInstallAction(commands.all, 'all')
  if (universal && universal.kind !== 'note') return universal
  return direct ?? universal
}

export function getInstallEntries(tool: CliTool): InstallEntry[] {
  const supportedPlatforms = tool.platforms
  const universal = resolveInstallAction(tool.install?.all, 'all')
  if (supportedPlatforms.length === 0) {
    return universal ? [{ platform: 'all', action: universal }] : []
  }

  const direct = supportedPlatforms.map((platform) => ({
    platform,
    action: resolveInstallAction(tool.install?.[platform]),
  }))
  if (!direct.some((entry) => entry.action) && universal) {
    return [{ platform: 'all', action: universal }]
  }

  return direct.flatMap((entry): InstallEntry[] => {
    const action = entry.action ?? universal
    return action ? [{ platform: entry.platform, action }] : []
  })
}

export function getInstallAction(tool: CliTool, platform: ToolPlatform | 'all'): InstallEntry | null {
  if (platform !== 'all') {
    const action = getPlatformInstallAction(tool.install, platform)
    return action ? { platform, action } : null
  }

  const entries = getInstallEntries(tool)
  return entries.find((entry) => entry.action.kind !== 'note') ?? entries[0] ?? null
}

export function getPlatformCommand(
  commands: Record<string, unknown> | undefined,
  platform: ToolPlatform,
): string | null {
  const action = getPlatformInstallAction(commands, platform)
  return action?.kind === 'command' ? action.command : null
}
