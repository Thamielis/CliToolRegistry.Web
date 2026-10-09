import { useMemo, useState } from 'react'
import type { CatalogSnapshot } from '../types/app'
import { compareCatalogs, downloadJson, type CatalogChange } from '../data/workbench'
import { useLocale } from '../i18n/LocaleContext'

export default function CatalogLab({ current, baseline, onSetBaseline }: {
  current: CatalogSnapshot
  baseline: CatalogSnapshot | null
  onSetBaseline: () => void
}) {
  const { locale, t } = useLocale()
  const [kind, setKind] = useState<CatalogChange['kind'] | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const changes = useMemo(() => baseline ? compareCatalogs(baseline, current) : [], [baseline, current])
  const filtered = changes.filter((change) => kind === 'all' || change.kind === kind)
  const selected = filtered.find((change) => change.id === selectedId) ?? filtered[0]
  const date = (snapshot: CatalogSnapshot) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.loadedAt))
  const label = (value: CatalogChange['kind']) => t(value === 'added' ? 'labAdded' : value === 'removed' ? 'labRemoved' : 'labModified')
  const contextChanged = baseline && (baseline.sourceRef !== current.sourceRef || baseline.sourceRepository !== current.sourceRepository)
  return <section className="lab-screen">
    <header className="screen-intro"><span className="section-eyebrow">{t('navLab')}</span><h1 id="screen-heading" tabIndex={-1}>{t('labHeading')}</h1><p>{t('labBody')}</p></header>
    <div className="snapshot-pair">
      {[{ snapshot: baseline, label: t('labBaseline') }, { snapshot: current, label: t('labCurrent') }].map(({ snapshot, label }) => <div className="workbench-panel snapshot-card" key={label}>
        <span className="section-eyebrow">{label}</span><strong>{snapshot ? date(snapshot) : '—'}</strong><span>{snapshot ? `${snapshot.tools.length} ${t('catalogTools')} · ${snapshot.sourceRef ?? '—'}` : t('labNoBaseline')}</span>
      </div>)}
    </div>
    <div className="lab-actions"><button className="workbench-button" onClick={onSetBaseline}>{t('labSetBaseline')}</button>
      <button className="workbench-button" onClick={() => downloadJson(current, 'cli-tool-registry-current.json')}>{t('labDownload')} <span aria-hidden="true">↓</span></button>
      <button className="workbench-button" disabled={!baseline} onClick={() => {
        if (baseline) downloadJson({ schema: 'cli-tool-registry.comparison.v1', baseline: { loadedAt: baseline.loadedAt, sourceRef: baseline.sourceRef, sourceRepository: baseline.sourceRepository },
          current: { loadedAt: current.loadedAt, sourceRef: current.sourceRef, sourceRepository: current.sourceRepository }, changes }, 'cli-tool-registry-comparison.json')
      }}>{t('labDownloadReport')} <span aria-hidden="true">↓</span></button></div>
    <p className="lab-truth">{t('labTruth')}</p>
    {contextChanged && <p className="notice notice-warning" role="status">{t('labSourceWarning')}</p>}
    {!baseline ? <div className="empty-state"><h2>{t('labNoBaseline')}</h2><p>{t('labBaselineHint')}</p></div> : <>
      <div className="change-filters" role="group" aria-label={t('labAll')}>{(['all', 'added', 'removed', 'modified'] as const).map((value) => <button key={value} className={'workbench-button ' + (kind === value ? 'selected' : '')}
        aria-pressed={kind === value} onClick={() => { setKind(value); setSelectedId(null) }}>{value === 'all' ? t('labAll') : label(value)} <span>{value === 'all' ? changes.length : changes.filter((change) => change.kind === value).length}</span></button>)}</div>
      {!filtered.length ? <div className="empty-state" role="status">{t(changes.length ? 'labNoMatches' : 'labNoChanges')}</div> : <div className="lab-layout">
        <div className="workbench-panel change-list" role="group" aria-label={t('labAll')}>{filtered.map((change) => <button key={change.id} className={selected?.id === change.id ? 'selected' : ''}
          aria-pressed={selected?.id === change.id} onClick={() => setSelectedId(change.id)}><span className={'change-kind kind-' + change.kind}>{label(change.kind)}</span><strong>{change.after?.name ?? change.before?.name}</strong><code>{change.id}</code></button>)}</div>
        {selected && <article className="workbench-panel change-detail"><header><div><span className={'change-kind kind-' + selected.kind}>{label(selected.kind)}</span><h2>{selected.after?.name ?? selected.before?.name}</h2></div><code>{selected.id}</code></header>
          {selected.fields.length > 0 && <p className="changed-fields"><strong>{t('labFields')}:</strong> {selected.fields.join(', ')}</p>}
          <div className="diff-pair">{([{ value: selected.before, label: t('labBefore') }, { value: selected.after, label: t('labAfter') }]).map(({ value, label }) => <section key={label}><h3>{label}</h3>{value ? <pre tabIndex={0}><code>{JSON.stringify(value, null, 2)}</code></pre> : <p>{t('labAbsent')}</p>}</section>)}</div>
        </article>}
      </div>}
    </>}
  </section>
}
