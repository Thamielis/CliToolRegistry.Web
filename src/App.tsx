import { useMemo, useState } from 'react'
import { apps } from './data/loadApps'
import { useLocale } from './i18n/LocaleContext'
import { LocaleSwitcher } from './components/LocaleSwitcher'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { ThemeToggle } from './components/ThemeToggle'
import { PlatformTabs } from './components/PlatformTabs'
import { CategoryFilter } from './components/CategoryFilter'
import { AppCard } from './components/AppCard'
import { AppRow } from './components/AppRow'
import { FeedbackButton } from './components/FeedbackButton'
import { Footer } from './components/Footer'
import type { Platform } from './types/app'

const VIEW_STORAGE_KEY = 'app-list.view'
const PLATFORMS: Platform[] = ['windows', 'kubuntu']

function detectInitialView(): ViewMode {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY)
  return stored === 'list' ? 'list' : 'card'
}

function App() {
  const { locale, t } = useLocale()
  const [view, setView] = useState<ViewMode>(detectInitialView)
  const [platform, setPlatform] = useState<Platform | 'all'>('all')
  const [category, setCategory] = useState('all')

  const handleViewChange = (mode: ViewMode) => {
    setView(mode)
    localStorage.setItem(VIEW_STORAGE_KEY, mode)
  }

  const handlePlatformChange = (next: Platform | 'all') => {
    setPlatform(next)
    setCategory('all')
  }

  const platformApps =
    platform === 'all' ? apps : apps.filter((app) => app.platforms.includes(platform))

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const app of platformApps) {
      seen.set(app.category['en-us'], app.category[locale])
    }
    return Array.from(seen, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [platformApps, locale])

  const filteredApps =
    category === 'all'
      ? platformApps
      : platformApps.filter((app) => app.category['en-us'] === category)

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-heading">
          <h1>{t('siteTitle')}</h1>
          <p>{t('siteSubtitle')}</p>
        </div>
        <div className="site-controls">
          <ViewToggle mode={view} onChange={handleViewChange} />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>

      <PlatformTabs platforms={PLATFORMS} selected={platform} onChange={handlePlatformChange} />
      <CategoryFilter options={categoryOptions} selected={category} onChange={setCategory} />

      <main>
        {apps.length === 0 ? (
          <p className="empty-state">{t('noApps')}</p>
        ) : filteredApps.length === 0 ? (
          <p className="empty-state">{t('noMatches')}</p>
        ) : view === 'card' ? (
          <div className="app-grid">
            {filteredApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <div className="app-list">
            {filteredApps.map((app) => (
              <AppRow key={app.id} app={app} />
            ))}
          </div>
        )}
      </main>

      <Footer />
      <FeedbackButton />
    </div>
  )
}

export default App
