import type { CatalogSnapshot, CliTool, ToolPlatform } from '../types/app'

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
    if (!isRecord(tool) || !['id', 'name', 'description', 'category', 'tier', 'command', 'catalogFile', 'catalogUrl']
      .every((key) => typeof tool[key] === 'string') || !tool.id || ids.has(tool.id as string) ||
      !Array.isArray(tool.platforms) || !tool.platforms.every((p) => ['windows', 'linux', 'wsl2', 'macos'].includes(p)) ||
      !strings(tool.tags) || !strings(tool.notes) || !safeLink(tool.website) || !safeLink(tool.repository) ||
      !safeLink(tool.catalogUrl)) return false
    if (tool.dependencies != null && (!isRecord(tool.dependencies) ||
      !strings(tool.dependencies.required) || !strings(tool.dependencies.recommended))) return false
    for (const key of ['install', 'update', 'robotMode']) {
      if (tool[key] != null && !isRecord(tool[key])) return false
    }
    for (const key of ['healthCheck', 'versionCommand', 'capabilitiesCommand']) {
      if (tool[key] != null && typeof tool[key] !== 'string') return false
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

function extractCommand(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return null
  if (typeof value.command === 'string') return value.command
  if (typeof value.note === 'string') return value.note

  for (const [key, nested] of Object.entries(value)) {
    if (['id', 'method', 'url', 'description', 'supported', 'format'].includes(key)) continue
    const command = extractCommand(nested)
    if (command) return command
  }
  return null
}

export function getPlatformCommand(
  commands: Record<string, unknown> | undefined,
  platform: ToolPlatform,
): string | null {
  if (!commands) return null
  return extractCommand(commands[platform]) ?? extractCommand(commands.all)
}

export function getInstallCommand(tool: CliTool, platform: ToolPlatform | 'all'): string | null {
  if (platform !== 'all') {
    return getPlatformCommand(tool.install, platform)
  }

  for (const supportedPlatform of tool.platforms) {
    const command = getPlatformCommand(tool.install, supportedPlatform)
    if (command) return command
  }
  return getPlatformCommand(tool.install, 'windows')
}
