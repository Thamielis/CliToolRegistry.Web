import type { AppEntry } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { AppIcon } from './AppIcon'

export function AppRow({ app }: { app: AppEntry }) {
  const { locale, t } = useLocale()

  return (
    <a className="app-row" href={app.url} target="_blank" rel="noreferrer">
      <AppIcon app={app} className="app-row-icon" />
      <div className="app-row-main">
        <div className="app-row-heading">
          <h3 className="app-row-name">{app.name}</h3>
          <span className="app-row-category">{app.category[locale]}</span>
        </div>
        <p className="app-row-description">{app.description[locale]}</p>
      </div>
      <span className="app-row-visit">{t('visit')} →</span>
    </a>
  )
}
