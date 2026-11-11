import registryProfiles from './registryProfiles.json' with { type: 'json' }
import type { CliTool, CliToolProfileCatalog, CliToolProfileDefinition } from '../types/app'

export const BUILT_IN_PROFILES = registryProfiles as CliToolProfileCatalog

export interface ResolvedProfile {
  required: string[]
  recommended: string[]
  platforms: string[] | null
  managementMode: string | null
  missingProfiles: string[]
  hasCycle: boolean
}

export function resolveProfile(
  profileId: string,
  profiles: Record<string, CliToolProfileDefinition>,
): ResolvedProfile {
  const required = new Set<string>()
  const recommended = new Set<string>()
  const visited = new Set<string>()
  const active = new Set<string>()
  const missingProfiles = new Set<string>()
  let hasCycle = false
  let platforms: string[] | null = null
  let managementMode: string | null = null

  const visit = (id: string) => {
    if (active.has(id)) { hasCycle = true; return }
    if (visited.has(id)) return
    const profile = profiles[id]
    if (!profile) { missingProfiles.add(id); return }
    active.add(id)
    for (const parent of profile.inherits ?? []) visit(parent)
    active.delete(id)
    visited.add(id)
    for (const id of profile.tools?.required ?? []) { required.add(id); recommended.delete(id) }
    for (const id of profile.tools?.recommended ?? []) if (!required.has(id)) recommended.add(id)
    if (profile.platforms?.length) platforms = profile.platforms
    if (profile.managementMode) managementMode = profile.managementMode
  }

  visit(profileId)
  return { required: [...required], recommended: [...recommended], platforms, managementMode,
    missingProfiles: [...missingProfiles], hasCycle }
}

export function missingToolIds(profile: ResolvedProfile, tools: readonly Pick<CliTool, 'id'>[]): string[] {
  const ids = new Set(tools.map((tool) => tool.id))
  return [...profile.required, ...profile.recommended].filter((id) => !ids.has(id))
}
