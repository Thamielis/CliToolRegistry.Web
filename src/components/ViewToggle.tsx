import { useLocale } from '../i18n/LocaleContext'

export type ViewMode = 'card' | 'enhanced' | 'list'

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const { t } = useLocale()

  return (
    <div className="view-toggle" role="group" aria-label={t('viewLabel')}>
      <button
        type="button"
        className={mode === 'card' ? 'active' : ''}
        onClick={() => onChange('card')}
        aria-pressed={mode === 'card'}
      >
        {t('viewCard')}
      </button>
      <button
        type="button"
        className={mode === 'enhanced' ? 'active' : ''}
        onClick={() => onChange('enhanced')}
        aria-pressed={mode === 'enhanced'}
        title={t('viewEnhancedHint')}
      >
        {t('viewEnhanced')}
      </button>
      <button
        type="button"
        className={mode === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        aria-pressed={mode === 'list'}
      >
        {t('viewTable')}
      </button>
    </div>
  )
}
