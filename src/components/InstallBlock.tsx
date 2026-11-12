import type { InstallAction } from '../data/loadApps'
import { useLocale } from '../i18n/LocaleContext'
import { CommandBlock } from './CommandBlock'

export function InstallBlock({ action, compact = false }: { action: InstallAction; compact?: boolean }) {
  const { t } = useLocale()

  if (action.kind === 'command') return <CommandBlock command={action.command} compact={compact} />
  if (action.kind === 'note') {
    return <p className="install-note"><strong>{t('installNote')}</strong> {action.note}</p>
  }
  if (compact) {
    return <p className="install-recipe-summary"><strong>{t('installRecipe')}</strong> {t('installRecipeDetails')}</p>
  }

  return (
    <div className="install-recipe">
      <strong>{t('installRecipe')}</strong>
      {action.method && <span className="install-recipe-method">{action.method}</span>}
      <dl>
        <dt>{t('recipeExecutable')}</dt>
        <dd><code>{action.commandName}</code></dd>
        <dt>{t('recipeArguments')}</dt>
        <dd><ol>{action.arguments.map((argument, index) => (
          <li key={`${index}:${argument}`}><pre><code>{argument}</code></pre></li>
        ))}</ol></dd>
      </dl>
      {action.note && <p className="install-note"><strong>{t('installNote')}</strong> {action.note}</p>}
    </div>
  )
}
