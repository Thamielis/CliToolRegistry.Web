export type Locale = 'de' | 'en'

export type Platform = 'windows' | 'linux' | 'wsl2' | 'macos'

export interface LocalizedText {
  de: string
  en: string
}

export interface AppEntry {
  id: string
  name: string
  url: string
  icon?: string
  tags?: string[]
  platforms: Platform[]
  description: LocalizedText
  category: LocalizedText
}

export type ToolPlatform = 'windows' | 'linux' | 'wsl2' | 'macos'
export type ToolCheck = string | Record<string, unknown>
export type CliToolDefinition = Record<string, unknown> & {
  id: string
  name: string
  displayName?: string
  description: string
  category: string
  tier?: string
  website?: string | null
  repository?: string | null
  wingetId?: string | null
  productKind?: string
  executableName?: string | null
  executableAliases?: string[]
  invocationPrefix?: string[]
  packageSource?: string | null
  packageId?: string | null
  hostToolId?: string | null
  useDefaultCliCommands?: boolean
  command?: string | null
  platforms: ToolPlatform[]
  packageManager?: Record<string, unknown>
  dependencies?: { required?: string[]; recommended?: string[] }
  install?: Record<string, unknown> | null
  update?: Record<string, unknown> | null
  healthCheck?: ToolCheck | null
  versionCommand?: ToolCheck | null
  capabilitiesCommand?: ToolCheck | null
  robotMode?: { supported?: boolean; [key: string]: unknown }
  completions?: Record<string, unknown>
  skill?: string | null
  tags?: string[]
  notes?: string[]
  provenance?: string[]
}

export interface CliTool extends CliToolDefinition {
  id: string
  name: string
  description: string
  category: string
  catalogFile: string
  catalogUrl: string
}

export interface CliToolProfileDefinition {
  description?: string
  inherits?: string[]
  tools?: { required?: string[]; recommended?: string[] }
  managementMode?: 'individual' | 'acfs'
  platforms?: ToolPlatform[]
  [key: string]: unknown
}

export interface CliToolProfileCatalog {
  schemaVersion: string
  profiles: Record<string, CliToolProfileDefinition>
}

export interface CatalogSnapshot {
  tools: CliTool[]
  fileCount: number
  loadedAt: string
  sourceRepository?: string
  sourceRef?: string
  sourceRevision: string
  sourceCommitDate: string
}
