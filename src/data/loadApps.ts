import type { CatalogSnapshot, CliTool, ToolPlatform } from '../types/app'

export const CATALOG_DIRECTORY = 'src/CliToolRegistry/Data/Tools'
export const CATALOG_REPOSITORY_URL = 'https://github.com/In-Pro-Org/CliToolRegistry'
export const CATALOG_SOURCE_URL = CATALOG_REPOSITORY_URL
const CACHE_KEY = 'cli-tool-registry.catalog.v2'

let activeRequest: Promise<CatalogSnapshot> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function fetchCatalog(): Promise<CatalogSnapshot> {
  const catalogUrl = import.meta.env.BASE_URL + 'registry-catalog.json?refresh=' + Date.now()
  const response = await fetch(catalogUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('Der veröffentlichte Registry-Katalog konnte nicht geladen werden.')

  const snapshot: unknown = await response.json()
  if (
    !isRecord(snapshot) ||
    !Array.isArray(snapshot.tools) ||
    typeof snapshot.loadedAt !== 'string' ||
    typeof snapshot.fileCount !== 'number'
  ) {
    throw new Error('Der veröffentlichte Registry-Katalog hat ein ungültiges Format.')
  }
  return snapshot as unknown as CatalogSnapshot
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
    if (!isRecord(snapshot) || !Array.isArray(snapshot.tools) || typeof snapshot.loadedAt !== 'string') {
      return null
    }
    return snapshot as unknown as CatalogSnapshot
  } catch {
    return null
  }
}

export function writeCatalogCache(snapshot: CatalogSnapshot): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Private browsing and storage limits must not block a live catalog update.
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
