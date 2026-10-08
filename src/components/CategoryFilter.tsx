import { useLocale } from '../i18n/LocaleContext'

export interface CategoryOption {
  key: string
  label: string
}

export function CategoryFilter({
  options,
  selected,
  onChange,
}: {
  options: CategoryOption[]
  selected: string
  onChange: (key: string) => void
}) {
  const { t } = useLocale()

  return (
    <div className="category-filter" role="group" aria-label="Category">
      <button
        type="button"
        className={selected === 'all' ? 'active' : ''}
        onClick={() => onChange('all')}
        aria-pressed={selected === 'all'}
      >
        {t('allCategories')}
      </button>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={selected === opt.key ? 'active' : ''}
          onClick={() => onChange(opt.key)}
          aria-pressed={selected === opt.key}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
