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

export interface CliTool {
  id: string
  name: string
  description: string
  category: string
  tier: string
  command?: string | null
  platforms: ToolPlatform[]
  website?: string
  repository?: string
  install?: Record<string, unknown>
  update?: Record<string, unknown>
  dependencies?: {
    required?: string[]
    recommended?: string[]
  }
  tags?: string[]
  healthCheck?: ToolCheck
  versionCommand?: ToolCheck
  capabilitiesCommand?: ToolCheck
  robotMode?: {
    supported?: boolean
    command?: string | null
    format?: string | null
  }
  notes?: string[]
  catalogFile: string
  catalogUrl: string
}

export interface CatalogSnapshot {
  tools: CliTool[]
  fileCount: number
  loadedAt: string
  sourceRepository?: string
  sourceRef?: string
}
