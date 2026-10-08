import { useLocale } from '../i18n/LocaleContext'
import type { Platform } from '../types/app'

const PLATFORM_LABELS: Record<Platform, string> = {
  windows: 'Windows',
  kubuntu: 'Kubuntu',
}

export function PlatformTabs({
  platforms,
  selected,
  onChange,
}: {
  platforms: Platform[]
  selected: Platform | 'all'
  onChange: (platform: Platform | 'all') => void
}) {
  const { t } = useLocale()

  return (
    <div className="platform-tabs" role="group" aria-label="Platform">
      <button
        type="button"
        className={selected === 'all' ? 'active' : ''}
        onClick={() => onChange('all')}
        aria-pressed={selected === 'all'}
      >
        {t('allPlatforms')}
      </button>
      {platforms.map((platform) => (
        <button
          key={platform}
          type="button"
          className={selected === platform ? 'active' : ''}
          onClick={() => onChange(platform)}
          aria-pressed={selected === platform}
        >
          {PLATFORM_LABELS[platform]}
        </button>
      ))}
    </div>
  )
}
