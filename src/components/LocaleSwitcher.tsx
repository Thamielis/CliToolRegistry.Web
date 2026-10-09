import { useRef } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { Locale } from '../types/app'

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
]

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()
  const menu = useRef<HTMLDetailsElement>(null)
  const label = locale === 'de' ? 'Sprache' : 'Language'
  const closeMenu = () => {
    if (!menu.current) return
    menu.current.open = false
    menu.current.querySelector('summary')?.focus()
  }

  return (
    <details ref={menu} className="header-menu"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeMenu() } }}>
      <summary className="header-icon-button" role="button" aria-label={label} title={`${label}: ${locale.toUpperCase()}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6h14M5 18h14" />
        </svg>
      </summary>
      <div className="header-menu-panel" role="group" aria-label={label}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={locale === opt.value ? 'active' : ''}
          onClick={() => { setLocale(opt.value); closeMenu() }}
          aria-pressed={locale === opt.value}
        >
          {opt.value === 'de' ? 'Deutsch' : 'English'}
        </button>
      ))}
      </div>
    </details>
  )
}
