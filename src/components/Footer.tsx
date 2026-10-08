import { useLocale } from '../i18n/LocaleContext'

const REPO_URL = 'https://github.com/Thamielis/CliToolRegistry.Web'
const LICENSE_URL = REPO_URL + '/blob/main/LICENSE'

export function Footer() {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <p>
        {t('footerCopyright').replace('{year}', String(year))}
      </p>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
        {t('footerSource')}
      </a>
      <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
        {t('footerLicense')}
      </a>
    </footer>
  )
}
