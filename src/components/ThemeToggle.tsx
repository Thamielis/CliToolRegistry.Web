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

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={theme === opt.value ? 'active' : ''}
          onClick={() => setTheme(opt.value)}
          aria-pressed={theme === opt.value}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  )
}
