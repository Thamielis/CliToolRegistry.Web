import type { Locale, ToolPlatform } from '../types/app'

const CATEGORIES: Record<Locale, Record<string, string>> = {
  de: {
    acfs: 'ACFS',
    agentic: 'Agentic',
    ai: 'KI & Agenten',
    agents: 'Agenten',
    base: 'Grundlagen',
    ci: 'CI/CD',
    cli: 'Kommandozeile',
    cloud: 'Cloud-Dienste',
    containers: 'Container',
    database: 'Datenbanken',
    db: 'Datenbanken',
    deployment: 'Bereitstellung',
    development: 'Entwicklung',
    documentation: 'Dokumentation',
    filesystem: 'Dateisysteme',
    foundation: 'Grundlagen',
    frankensuite: 'FrankenSuite',
    lang: 'Programmiersprachen',
    network: 'Netzwerkwerkzeuge',
    runtime: 'Laufzeiten',
    scm: 'Versionsverwaltung',
    shell: 'Shell-Werkzeuge',
    stack: 'Technologie-Stacks',
    terminal: 'Terminal',
    tools: 'Entwicklungswerkzeuge',
    workflow: 'Arbeitsabläufe',
    other: 'Weitere',
  },
  en: {
    acfs: 'ACFS',
    agentic: 'Agentic',
    ai: 'AI & agents',
    agents: 'Agents',
    base: 'Foundations',
    ci: 'CI/CD',
    cli: 'Command line',
    cloud: 'Cloud services',
    containers: 'Containers',
    database: 'Databases',
    db: 'Databases',
    deployment: 'Deployment',
    development: 'Development',
    documentation: 'Documentation',
    filesystem: 'Filesystems',
    foundation: 'Foundations',
    frankensuite: 'FrankenSuite',
    lang: 'Programming languages',
    network: 'Network tools',
    runtime: 'Runtimes',
    scm: 'Version control',
    shell: 'Shell tools',
    stack: 'Technology stacks',
    terminal: 'Terminal',
    tools: 'Development tools',
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
