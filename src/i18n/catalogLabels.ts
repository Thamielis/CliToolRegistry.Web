import type { Locale, ToolPlatform } from '../types/app'

const CATEGORIES: Record<Locale, Record<string, string>> = {
  de: {
    agentic: 'Agentic',
    ai: 'KI & Agenten',
    ci: 'CI/CD',
    cli: 'Kommandozeile',
    containers: 'Container',
    database: 'Datenbanken',
    deployment: 'Bereitstellung',
    development: 'Entwicklung',
    documentation: 'Dokumentation',
    foundation: 'Grundlagen',
    frankensuite: 'FrankenSuite',
    runtime: 'Laufzeiten',
    scm: 'Versionsverwaltung',
    terminal: 'Terminal',
    workflow: 'Arbeitsabläufe',
    other: 'Weitere',
  },
  en: {
    agentic: 'Agentic',
    ai: 'AI & agents',
    ci: 'CI/CD',
    cli: 'Command line',
    containers: 'Containers',
    database: 'Databases',
    deployment: 'Deployment',
    development: 'Development',
    documentation: 'Documentation',
    foundation: 'Foundations',
    frankensuite: 'FrankenSuite',
    runtime: 'Runtimes',
    scm: 'Version control',
    terminal: 'Terminal',
    workflow: 'Workflow',
    other: 'Other',
  },
}

const PLATFORMS: Record<ToolPlatform, string> = {
  windows: 'Windows',
  linux: 'Linux',
  wsl2: 'WSL 2',
  macos: 'macOS',
}

const TIERS: Record<Locale, Record<string, string>> = {
  de: {
    application: 'Anwendung',
    library: 'Bibliothek',
    optional: 'Optional',
    'optional-windows': 'Optional für Windows',
    recommended: 'Empfohlen',
    'recommended-agent': 'Empfohlener Agent',
    required: 'Erforderlich',
    'required-acfs-on-windows': 'Für ACFS unter Windows erforderlich',
    'required-for-npm-tools': 'Für npm-Werkzeuge erforderlich',
    'required-linux': 'Für Linux erforderlich',
    'required-windows': 'Für Windows erforderlich',
    'source-cli': 'CLI aus Quellcode',
  },
  en: {
    application: 'Application',
    library: 'Library',
    optional: 'Optional',
    'optional-windows': 'Optional on Windows',
    recommended: 'Recommended',
    'recommended-agent': 'Recommended agent',
    required: 'Required',
    'required-acfs-on-windows': 'Required by ACFS on Windows',
    'required-for-npm-tools': 'Required by npm tools',
    'required-linux': 'Required on Linux',
    'required-windows': 'Required on Windows',
    'source-cli': 'Source-built CLI',
  },
}

export function categoryLabel(category: string, locale: Locale): string {
  return (
    CATEGORIES[locale][category] ??
    category.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())
  )
}

export function platformLabel(platform: ToolPlatform): string {
  return PLATFORMS[platform]
}

export function tierLabel(tier: string, locale: Locale): string {
  return TIERS[locale][tier] ?? tier.replaceAll('-', ' ')
}
