import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { AppEntry } from '../../src/types/app'
import { ThemeProvider, useTheme, type Theme } from '../../src/theme/ThemeContext'
import { LocaleProvider } from '../../src/i18n/LocaleContext'
import { AppIcon } from '../../src/components/AppIcon'
import { AppCard } from '../../src/components/AppCard'
import { AppRow } from '../../src/components/AppRow'
import '../../src/index.css'
import '../../src/registry.css'
import '../../src/catalog-visuals.css'

const identities = {
  git: { id: 'git', name: 'Git' },
  dotnet: { id: 'dotnet', name: '.NET SDK 10' },
  bun: { id: 'bun', name: 'Bun' },
  pandoc: { id: 'pandoc', name: 'Pandoc' },
  python: { id: 'python3', name: 'Python 3' },
  docker: { id: 'docker-cli', name: 'Docker CLI' },
  vercel: { id: 'vercel-cli', name: 'Vercel CLI' },
  unknown: { id: 'not-in-catalog', name: 'Unknown Tool' },
} as const

function legacyApp(id: string, name: string, icon: string): AppEntry {
  return {
    id,
    name,
    icon,
    url: `https://example.test/${id}`,
    tags: [],
    platforms: [],
    description: { de: 'Fixture Beschreibung', en: 'Fixture description' },
    category: { de: 'Fixture', en: 'Fixture' },
  }
}

export function Harness() {
  const [activeId, setActiveId] = useState<keyof typeof identities>('git')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const identity = identities[activeId]
  const activeApp = { ...identity }
  const emojiApp = legacyApp('legacy-emoji', 'Legacy Emoji', '📦')
  const urlApp = legacyApp('legacy-url', 'Legacy URL', 'https://static.example/icon.svg')

  return (
    <main className="page-shell logo-harness">
      <h1>Tool logo renderer</h1>
      <p data-testid="resolved-theme" data-resolved-theme={resolvedTheme}>Resolved: {resolvedTheme}</p>
      <div className="logo-harness-controls" aria-label="Logo controls">
        {Object.entries(identities).map(([key, item]) => (
          <button key={key} type="button" data-testid={`select-${key}`} onClick={() => setActiveId(key as keyof typeof identities)}>
            Use {item.name}
          </button>
        ))}
        {(['dark', 'light', 'system'] as Theme[]).map((nextTheme) => (
          <button key={nextTheme} type="button" data-testid={`theme-${nextTheme}`} aria-pressed={theme === nextTheme} onClick={() => setTheme(nextTheme)}>
            Theme {nextTheme}
          </button>
        ))}
      </div>
      <section aria-labelledby="active-heading">
        <h2 id="active-heading">Active identity</h2>
        <div data-testid="active-logo"><AppIcon app={activeApp} className="harness-icon" /></div>
        <p>{identity.name}</p>
      </section>
      <section aria-labelledby="legacy-heading">
        <h2 id="legacy-heading">Legacy callers</h2>
        <div className="app-grid">
          <AppCard app={emojiApp} />
        </div>
        <div className="app-list">
          <AppRow app={urlApp} />
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LocaleProvider>
      <Harness />
    </LocaleProvider>
  </ThemeProvider>,
)
