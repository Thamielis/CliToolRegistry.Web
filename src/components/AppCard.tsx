import type { AppEntry } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { AppIcon } from './AppIcon'

export function AppCard({ app }: { app: AppEntry }) {
  const { locale, t } = useLocale()

  return (
    <a className="app-card" href={app.url} target="_blank" rel="noreferrer">
      <AppIcon app={app} className="app-card-icon" />
      <div className="app-card-body">
        <h3 className="app-card-name">{app.name}</h3>
        <span className="app-card-category">{app.category[locale]}</span>
        <p className="app-card-description">{app.description[locale]}</p>
        {app.tags && app.tags.length > 0 && (
          <ul className="app-card-tags">
            {app.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>
      <span className="app-card-visit">{t('visit')} →</span>
    </a>
  )
}
