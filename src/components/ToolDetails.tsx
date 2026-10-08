import type { CliTool, ToolPlatform } from '../types/app'
import { useLocale } from '../i18n/LocaleContext'
import { categoryLabel, platformLabel, tierLabel } from '../i18n/catalogLabels'
import { getPlatformCommand } from '../data/loadApps'
import { CommandBlock } from './CommandBlock'

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

export function ToolDetails({ tool, onClose }: { tool: CliTool; onClose: () => void }) {
  const { locale, t } = useLocale()
  const installCommands = commandEntries(tool.install, tool.platforms, t('allPlatforms'))
  const updateCommands = commandEntries(tool.update, tool.platforms, t('allPlatforms'))

  return (
    <section className="tool-details" aria-labelledby="tool-details-heading">
      <header className="detail-header">
        <div>
          <span className="detail-kicker">{t('details')}</span>
          <h2 id="tool-details-heading">{tool.name}</h2>
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
