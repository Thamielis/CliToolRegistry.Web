import { useLocale } from '../i18n/LocaleContext'
import type { Locale } from '../types/app'

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
]

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="locale-switcher" role="group" aria-label={locale === 'de' ? 'Sprache' : 'Language'}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={locale === opt.value ? 'active' : ''}
          onClick={() => setLocale(opt.value)}
          aria-pressed={locale === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
