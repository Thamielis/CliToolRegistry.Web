import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CliTool, ToolPlatform } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { categoryLabel, platformLabel, tierLabel } from '../i18n/catalogLabels'
import { getPlatformCommand } from '../data/loadApps'
import { CommandBlock } from './CommandBlock'
import { AppIcon } from './AppIcon'
import { navigationUrl, parseNavigation, transitionExplorerNavigation, type ExplorerNavigationAction } from '../data/workbench'
import type { ExplorerManifest } from '../types/explorer'

const PLATFORMS: ToolPlatform[] = ['windows', 'linux', 'wsl2', 'macos']

function commandEntries(
  commands: Record<string, unknown> | undefined,
  platforms: ToolPlatform[],
  allPlatformsLabel: string,
) {
  if (!commands) return []
  const supportedPlatforms = platforms.length > 0 ? platforms : PLATFORMS
  const hasPlatformSpecificCommands = supportedPlatforms.some((platform) =>
    Object.prototype.hasOwnProperty.call(commands, platform),
  )

  if (!hasPlatformSpecificCommands) {
    const command = getPlatformCommand(commands, 'windows')
    return command ? [{ key: 'all', label: allPlatformsLabel, command }] : []
  }

  return supportedPlatforms
    .map((platform) => ({
      key: platform,
      label: platformLabel(platform),
      command: getPlatformCommand(commands, platform),
    }))
    .filter((entry): entry is { key: ToolPlatform; label: string; command: string } =>
      Boolean(entry.command),
    )
}

function CommandSection({
  label,
  command,
}: {
  label: string
  command: string | null
}) {
  if (!command) return null
  return (
    <div className="detail-command">
      <span>{label}</span>
      <CommandBlock command={command} />
    </div>
  )
}

function currentExplorerHref(): string {
  return typeof window === 'undefined' ? 'https://registry.invalid/' : window.location.href
}

function explorerToolHref(toolId: string, href = currentExplorerHref()): string {
  const state = parseNavigation(new URL(href).search)
  return navigationUrl(transitionExplorerNavigation(state, { type: 'tool', toolId }).state, href)
}

function getExplorerToolTarget(tool: Pick<CliTool, 'id' | 'name'>, manifest: ExplorerManifest | null) {
  if (!manifest) return null
  const datasetCount = manifest.datasets.reduce((count, dataset) => count + Number(dataset.toolId === tool.id), 0)
  return datasetCount > 0 ? { toolId: tool.id, toolName: tool.name, datasetCount, href: explorerToolHref(tool.id) } : null
}

export function ExplorerToolLink({ tool, manifest, onExplore }: {
  tool: Pick<CliTool, 'id' | 'name'>
  manifest: ExplorerManifest | null
  onExplore?: (action: ExplorerNavigationAction) => void
}) {
  const { t } = useLocale()
  const target = getExplorerToolTarget(tool, manifest)
  if (!target) return null

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!onExplore || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onExplore({ type: 'tool', toolId: target.toolId })
  }

  return <a className="tool-explorer-link" href={target.href} onClick={handleClick}>
    {t('exploreToolLink').replace('{count}', String(target.datasetCount))}<span aria-hidden="true">↗</span>
  </a>
}

export function ToolDetails({ tool, onClose, manifest = null, onExplore }: {
  tool: CliTool
  onClose: () => void
  manifest?: ExplorerManifest | null
  onExplore?: (action: ExplorerNavigationAction) => void
}) {
  const { locale, t } = useLocale()
  const headingId = 'tool-details-heading-' + tool.id
  const installCommands = commandEntries(tool.install, tool.platforms, t('allPlatforms'))
  const updateCommands = commandEntries(tool.update, tool.platforms, t('allPlatforms'))

  return (
    <section className="tool-details" id={'tool-details-' + tool.id} aria-labelledby={headingId}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
      <header className="detail-header">
        <div className="detail-title-group">
          <AppIcon app={tool} className="detail-logo" />
          <div className="detail-title-copy">
            <span className="detail-kicker">{t('details')}</span>
            <h2 id={headingId} data-history-focus-key={'tool-details:' + tool.id} tabIndex={-1}>{tool.name}</h2>
          </div>
        </div>
        <button type="button" className="quiet-button" onClick={onClose}>
          {t('closeDetails')}
        </button>
      </header>

      {tool.description && <p className="detail-description">{tool.description}</p>}

      <div className="detail-identity">
        <span className="detail-identity-item">
          <strong>{t('identifier')}</strong>
          <code>{tool.id}</code>
        </span>
        <span className="detail-identity-item">
          <strong>{t('categoryColumn')}</strong>
          <span>{categoryLabel(tool.category, locale)}</span>
        </span>
        {tool.tier && (
          <span className="detail-identity-item">
            <strong>{t('tier')}</strong>
            <span>{tierLabel(tool.tier, locale)}</span>
          </span>
        )}
      </div>

      <div className="detail-grid">
        <section className="detail-section">
          <h3>{t('installCommands')}</h3>
          {installCommands.length ? (
            installCommands.map(({ key, label, command }) => (
              <CommandSection key={key} label={label} command={command} />
            ))
          ) : (
            <p className="muted-value">{t('installNotListed')}</p>
          )}
        </section>

        <section className="detail-section">
          <h3>{t('updateCommands')}</h3>
          {updateCommands.length ? (
            updateCommands.map(({ key, label, command }) => (
              <CommandSection key={key} label={label} command={command} />
            ))
          ) : (
            <p className="muted-value">{t('installNotListed')}</p>
          )}
        </section>

        <section className="detail-section">
          <h3>{t('dependencies')}</h3>
          <div className="dependency-group">
            <strong>{t('requiredDependencies')}</strong>
            <p>{tool.dependencies?.required?.join(', ') || '—'}</p>
          </div>
          <div className="dependency-group">
            <strong>{t('recommendedDependencies')}</strong>
            <p>{tool.dependencies?.recommended?.join(', ') || '—'}</p>
          </div>
        </section>

        <section className="detail-section">
          <h3>{t('checks')}</h3>
          <CommandSection label={t('healthCheck')} command={tool.healthCheck ?? null} />
          <CommandSection label={t('versionCommand')} command={tool.versionCommand ?? null} />
          <CommandSection
            label={t('capabilitiesCommand')}
            command={tool.capabilitiesCommand ?? null}
          />
          {!tool.healthCheck && !tool.versionCommand && !tool.capabilitiesCommand && (
            <p className="muted-value">—</p>
          )}
        </section>
      </div>

      {tool.tags && tool.tags.length > 0 && (
        <div className="detail-extra">
          <strong>{t('tags')}</strong>
          <ul className="tag-list">
            {tool.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        </div>
      )}

      {tool.notes && tool.notes.length > 0 && (
        <div className="detail-extra">
          <strong>{t('notes')}</strong>
          <ul className="note-list">
            {tool.notes.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </div>
      )}

      <footer className="detail-links">
        <ExplorerToolLink tool={tool} manifest={manifest} onExplore={onExplore} />
        {tool.website && (
          <a href={tool.website} target="_blank" rel="noreferrer">
            {t('openWebsite')}
          </a>
        )}
        {tool.repository && (
          <a href={tool.repository} target="_blank" rel="noreferrer">
            {t('openRepository')}
          </a>
        )}
        <a href={tool.catalogUrl} target="_blank" rel="noreferrer">
          {t('openCatalogSource')}: {tool.catalogFile}
        </a>
      </footer>
    </section>
  )
}
