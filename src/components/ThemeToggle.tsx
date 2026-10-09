import { useRef } from 'react'
import { useTheme, type Theme } from '../theme/ThemeContext'
import { useLocale } from '../i18n/LocaleContext'
import type { TranslationKey } from '../i18n/translations'

const OPTIONS: { value: Theme; labelKey: TranslationKey }[] = [
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
  { value: 'system', labelKey: 'themeSystem' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()
  const menu = useRef<HTMLDetailsElement>(null)
  const selected = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]

  const closeMenu = () => {
    if (!menu.current) return
    menu.current.open = false
    menu.current.querySelector('summary')?.focus()
  }

  return (
    <details ref={menu} className="header-menu"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeMenu() } }}>
      <summary className="header-icon-button" role="button" aria-label={t('themeLabel')}
        title={`${t('themeLabel')}: ${t(selected.labelKey)}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {theme === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
            : theme === 'dark' ? <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
              : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8" /></>}
        </svg>
      </summary>
      <div className="header-menu-panel" role="group" aria-label={t('themeLabel')}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={theme === opt.value ? 'active' : ''}
          onClick={() => { setTheme(opt.value); closeMenu() }}
          aria-pressed={theme === opt.value}
        >
          {t(opt.labelKey)}
        </button>
      ))}
      </div>
    </details>
  )
}
