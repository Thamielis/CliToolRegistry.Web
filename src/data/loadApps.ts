import type { AppEntry } from '../types/app'

const modules = import.meta.glob<{ default: AppEntry }>('./apps/*.json', {
  eager: true,
})

export const apps: AppEntry[] = Object.values(modules)
  .map((mod) => mod.default)
  .sort((a, b) => a.name.localeCompare(b.name))
