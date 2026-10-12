import type { CliTool, Locale, ToolPlatform } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { categoryLabel, platformLabel } from '../i18n/catalogLabels'
import { getInstallCommand } from '../data/loadApps'
import { CommandBlock } from './CommandBlock'
import { AppIcon } from './AppIcon'
import { ExplorerToolLink } from './ToolDetails'
import type { ExplorerNavigationAction } from '../data/workbench'
import type { ExplorerManifest } from '../types/explorer'

export function ToolTable({
  tools,
  selectedToolId,
  activePlatform,
  explorerManifest,
  onExplore,
  onSelect,
  locale,
}: {
  tools: CliTool[]
  selectedToolId: string | null
  activePlatform: ToolPlatform | 'all'
  explorerManifest: ExplorerManifest | null
  onExplore: (action: ExplorerNavigationAction) => void
  onSelect: (tool: CliTool, trigger: HTMLButtonElement) => void
  locale: Locale
}) {
  const { t } = useLocale()

  return (
    <div className="table-scroll">
      <table className="tool-table">
        <thead>
          <tr>
            <th scope="col">{t('toolColumn')}</th>
            <th scope="col">{t('commandColumn')}</th>
            <th scope="col">{t('categoryColumn')}</th>
            <th scope="col">{t('platformColumn')}</th>
            <th scope="col">{t('installColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => {
            const selected = selectedToolId === tool.id
            const installCommand = getInstallCommand(tool, activePlatform)

            return (
              <tr key={tool.id} className={selected ? 'tool-row selected' : 'tool-row'}>
                <td className="tool-name-cell">
                  <button
                    type="button"
                    className="tool-name-button"
                    data-history-focus-key={'tool-trigger:' + tool.id}
                    onClick={(event) => onSelect(tool, event.currentTarget)}
                    aria-expanded={selected}
                    aria-controls={selected ? 'tool-details-' + tool.id : undefined}
                    aria-label={tool.name + ', ' + (selected ? t('closeDetails') : t('details'))}
                  >
                    <span className="tool-name-line">
                      <AppIcon app={tool} className="tool-table-logo" />
                      <span className="tool-name">{tool.name}</span>
                    </span>
                    <span className="tool-description">{tool.description}</span>
                  </button>
                  <ExplorerToolLink tool={tool} manifest={explorerManifest} onExplore={onExplore} />
                </td>
                <td data-label={t('commandColumn')}>
                  <CommandBlock command={tool.command} compact />
                </td>
                <td data-label={t('categoryColumn')}>
                  <span className={'category-label category-' + tool.category.replaceAll(/[^a-z0-9-]/gi, '-')}>
                    {categoryLabel(tool.category, locale)}
                  </span>
                </td>
                <td data-label={t('platformColumn')}>
                  <ul className="platform-list" aria-label={t('platformColumn')}>
                    {tool.platforms.map((platform: ToolPlatform) => (
                      <li key={platform}>{platformLabel(platform)}</li>
                    ))}
                  </ul>
                </td>
                <td data-label={t('installColumn')}>
                  {installCommand ? (
                    <CommandBlock command={installCommand} compact />
                  ) : (
                    <span className="muted-value">{t('installNotListed')}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
