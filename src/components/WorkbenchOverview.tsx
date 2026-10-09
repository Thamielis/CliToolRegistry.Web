import { useState } from 'react'
import type { CliTool, ToolPlatform } from '../types/app'
import type { Section } from '../data/workbench'
import { getPlatformCommand } from '../data/loadApps'
import { useLocale } from '../i18n/LocaleContext'
import { categoryLabel, platformLabel } from '../i18n/catalogLabels'
import { CommandBlock } from './CommandBlock'
import { AppIcon } from './AppIcon'

export function WorkbenchOverview({ tools, onNavigate, onCategory, onTool }: {
  tools: CliTool[]
  onNavigate: (section: Section) => void
  onCategory: (category: string) => void
  onTool: (id: string, trigger: HTMLButtonElement) => void
}) {
  const { locale, t } = useLocale()
  const [toolId, setToolId] = useState('git')
  const [chosenPlatform, setChosenPlatform] = useState<ToolPlatform>('linux')
  const tool = tools.find((item) => item.id === toolId) ?? tools[0]
  const platform = tool?.platforms.includes(chosenPlatform) ? chosenPlatform : tool?.platforms[0]
  const install = tool && platform ? getPlatformCommand(tool.install, platform) : null
  const categories = [...new Set(tools.map((item) => item.category))]
    .sort((a, b) => categoryLabel(a, locale).localeCompare(categoryLabel(b, locale), locale))
  const platforms = new Set(tools.flatMap((item) => item.platforms))
  return (
    <div className="overview-screen">
      <section className="workbench-hero">
        <div className="hero-copy">
          <span className="section-eyebrow"><span className="eyebrow-line" />{t('heroEyebrow')}</span>
          <h1 id="screen-heading" tabIndex={-1}>{t('heroHeading').split('\n').map((line, i) => <span key={line} className={i ? 'hero-accent' : ''}>{line}</span>)}</h1>
          <p className="hero-description">{t('heroBody')}</p>
          <div className="hero-actions">
            <button className="workbench-button primary" onClick={() => onNavigate('catalog')}>{t('browseCatalog')} <span aria-hidden="true">↗</span></button>
            <button className="workbench-button" onClick={() => onNavigate('dependencies')}>{t('exploreGraph')} <span aria-hidden="true">→</span></button>
          </div>
          <div className="hero-facts">
            {[[tools.length, t('catalogTools')], [categories.length, t('catalogCategories')], [platforms.size, t('catalogPlatforms')]].map(([count, label]) =>
              <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
          </div>
        </div>
        <div className="terminal-stage">
          <div className="terminal-orbit" aria-hidden="true" />
          <section className="terminal-preview" aria-label={t('previewLabel')}>
            <header className="terminal-chrome"><span className="terminal-dots" aria-hidden="true">● ● ●</span><span>registry / {tool?.id ?? '…'}</span><span aria-hidden="true">⌘</span></header>
            <div className="terminal-content">
              <div className="terminal-caption"><span aria-hidden="true">&gt;_</span><strong>{t('previewLabel')}</strong></div>
              {tool ? <>
                <label className="preview-select"><span>{t('previewTool')}</span><select value={tool.id} onChange={(event) => setToolId(event.target.value)}>
                  {tools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
                <div className="preview-identity"><AppIcon app={tool} /><div><strong>{tool.name}</strong><span>{categoryLabel(tool.category, locale)}</span></div><code>{tool.id}</code></div>
                <p className="preview-description">{tool.description}</p>
                <div className="terminal-command-label"><span>{t('commandColumn')}</span><span aria-hidden="true">$</span></div>
                <CommandBlock command={tool.command} />
                <div className="terminal-command-label"><span>{t('installColumn')}</span>{platform && <label><span className="sr-only">{t('previewPlatform')}</span><select value={platform} onChange={(event) => setChosenPlatform(event.target.value as ToolPlatform)}>
                  {tool.platforms.map((item) => <option key={item} value={item}>{platformLabel(item)}</option>)}
                </select></label>}</div>
                {install ? <CommandBlock command={install} /> : <p className="muted-value">{t('installNotListed')}</p>}
                <button className="preview-open" onClick={(event) => onTool(tool.id, event.currentTarget)}>{tool.name} · {t('details')} <span aria-hidden="true">↗</span></button>
              </> : <p>{t('noTools')}</p>}
            </div>
            <footer className="terminal-footer"><span className="status-dot" aria-hidden="true" />{t('previewHint')}</footer>
          </section>
          <span className="terminal-stage-caption" aria-hidden="true">CLI TOOL REGISTRY / COMMAND WORKBENCH</span>
        </div>
      </section>

      <section className="overview-categories">
        <div className="section-heading"><div><span className="section-eyebrow">{t('navCatalog')}</span><h2>{t('categoryHeading')}</h2></div><p>{t('categoryBody')}</p></div>
        <div className="category-launchers">{categories.map((category) => <button key={category} onClick={() => onCategory(category)}>
          <span>{categoryLabel(category, locale)}</span><span className="category-count">{tools.filter((tool) => tool.category === category).length}</span><span aria-hidden="true">↗</span>
        </button>)}</div>
      </section>

      <section className="overview-features">
        <div className="section-heading"><div><span className="section-eyebrow">CLI TOOL REGISTRY</span><h2>{t('featuresHeading')}</h2></div><p>{t('featuresBody')}</p></div>
        <div className="feature-grid">{([
          ['catalog', '>_', 'catalogFeature', 'catalogFeatureBody'],
          ['dependencies', '↗↘', 'graphFeature', 'graphFeatureBody'],
          ['lab', '− +', 'labFeature', 'labFeatureBody'],
          ['guide', '↳', 'guideFeature', 'guideFeatureBody'],
        ] as const).map(([section, icon, title, body]) => <button className={'feature-link feature-' + section} key={section} onClick={() => onNavigate(section)}>
          <span className="feature-icon" aria-hidden="true">{icon}</span><h3>{t(title)}</h3><p>{t(body)}</p><span className="feature-destination">{t(section === 'catalog' ? 'navCatalog' : section === 'dependencies' ? 'navDependencies' : section === 'lab' ? 'navLab' : 'navGuide')} <span aria-hidden="true">↗</span></span>
        </button>)}</div>
      </section>
    </div>
  )
}

export function WorkbenchGuide({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { t } = useLocale()
  return <section className="guide-screen">
    <header className="screen-intro"><span className="section-eyebrow">{t('navGuide')}</span><h1 id="screen-heading" tabIndex={-1}>{t('guideHeading')}</h1><p>{t('guideBody')}</p></header>
    <div className="guide-grid">{([
      ['guideChooseTitle', 'guideChooseBody', 'catalog', '>_'],
      ['guideInstallTitle', 'guideInstallBody', 'catalog', '$'],
      ['guideDependenciesTitle', 'guideDependenciesBody', 'dependencies', '↗↘'],
      ['guideRobotTitle', 'guideRobotBody', 'catalog', '{ }'],
      ['guideDataTitle', 'guideDataBody', 'lab', '− +'],
      ['guideShortcutsTitle', 'guideShortcutsBody', 'catalog', '⌘ K'],
    ] as const).map(([title, body, section, icon]) => <article className="workbench-panel guide-card" key={title}>
      <span className="feature-icon" aria-hidden="true">{icon}</span><h2>{t(title)}</h2><p>{t(body)}</p><button className="workbench-button" onClick={() => onNavigate(section)}>{t(section === 'dependencies' ? 'navDependencies' : section === 'lab' ? 'navLab' : 'navCatalog')} <span aria-hidden="true">↗</span></button>
    </article>)}</div>
  </section>
}
