import { useState } from 'react'
import type { CliTool, ToolPlatform } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { categoryLabel, platformLabel, tierLabel } from '../i18n/catalogLabels'
import { getPlatformCommand } from '../data/loadApps'
import { CommandBlock } from './CommandBlock'
import { ToolDetails } from './ToolDetails'
import { AppIcon } from './AppIcon'

interface ToolCardsProps {
  tools: CliTool[]
  enhanced: boolean
  activePlatform: ToolPlatform | 'all'
  selectedToolId: string | null
  onSelect: (tool: CliTool, trigger: HTMLButtonElement) => void
  onClose: () => void
}

function ToolCard({ tool, enhanced, activePlatform, selected, onSelect, onClose }: {
  tool: CliTool
  enhanced: boolean
  activePlatform: ToolPlatform | 'all'
  selected: boolean
  onSelect: ToolCardsProps['onSelect']
  onClose: () => void
}) {
  const { locale, t } = useLocale()
  const [installPlatform, setInstallPlatform] = useState<ToolPlatform>(tool.platforms[0] ?? 'windows')
  const platform = activePlatform === 'all' ? installPlatform : activePlatform
  const installCommand = getPlatformCommand(tool.install, platform)
  const headingId = 'tool-card-heading-' + tool.id
  const detailsId = 'tool-details-' + tool.id

  return (
    <article className={'tool-card' + (enhanced ? ' tool-card-enhanced' : '') + (selected ? ' is-expanded' : '')} aria-labelledby={headingId}>
      <div className="tool-card-overview">
        <header className="tool-card-header">
          <AppIcon app={tool} className="tool-card-symbol" />
          <div className="tool-card-title">
            <span className="category-label">{categoryLabel(tool.category, locale)}</span>
            <h3 id={headingId}>{tool.name}</h3>
          </div>
          {enhanced && tool.tier && <span className="tool-tier">{tierLabel(tool.tier, locale)}</span>}
        </header>
        <p className="tool-card-description">{tool.description}</p>
        <ul className="platform-list" aria-label={t('platformColumn')}>
          {tool.platforms.map((item) => <li key={item}>{platformLabel(item)}</li>)}
        </ul>
        {tool.tags && tool.tags.length > 0 && (
          <ul className="tag-list" aria-label={t('tags')}>
            {tool.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
        {enhanced && (
          <div className="tool-card-commands">
            <div className="card-command-heading"><span>{t('commandColumn')}</span><code>{tool.id}</code></div>
            <CommandBlock command={tool.command} />
            <div className="card-command-heading">
              <span>{t('installColumn')}</span>
              {activePlatform === 'all' && tool.platforms.length > 0 ? (
                <select
                  className="card-platform-select"
                  aria-label={t('installPlatform') + ': ' + tool.name}
                  value={platform}
                  onChange={(event) => setInstallPlatform(event.target.value as ToolPlatform)}
                >
                  {tool.platforms.map((item) => <option key={item} value={item}>{platformLabel(item)}</option>)}
                </select>
              ) : tool.platforms.length > 0 ? <span>{platformLabel(platform)}</span> : null}
            </div>
            {installCommand ? <CommandBlock command={installCommand} /> : <p className="card-install-missing">{t('installNotListed')}</p>}
            {tool.robotMode?.supported && (
              <span className="automation-badge"><span aria-hidden="true">↳</span> {t('robotMode')}: {t('robotSupported')}</span>
            )}
          </div>
        )}
        <footer className="tool-card-actions">
          <button
            type="button"
            className="card-details-button"
            aria-expanded={selected}
            aria-controls={selected ? detailsId : undefined}
            aria-label={tool.name + ', ' + (selected ? t('closeDetails') : t('details'))}
            onClick={(event) => onSelect(tool, event.currentTarget)}
          >
            {t(selected ? 'closeDetails' : 'details')} <span aria-hidden="true">{selected ? '−' : '↗'}</span>
          </button>
          <div className="tool-card-links">
            {tool.website && <a href={tool.website} target="_blank" rel="noreferrer">{t('toolWebsite')} <span aria-hidden="true">↗</span></a>}
            {tool.repository && <a href={tool.repository} target="_blank" rel="noreferrer">{t('toolRepository')} <span aria-hidden="true">↗</span></a>}
          </div>
        </footer>
      </div>
      {selected && <ToolDetails tool={tool} onClose={onClose} />}
    </article>
  )
}

export function ToolCards({ tools, enhanced, activePlatform, selectedToolId, onSelect, onClose }: ToolCardsProps) {
  return (
    <div className={'tool-card-grid' + (enhanced ? ' tool-card-grid-enhanced' : '')}>
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} enhanced={enhanced} activePlatform={activePlatform}
          selected={tool.id === selectedToolId} onSelect={onSelect} onClose={onClose} />
      ))}
    </div>
  )
}
