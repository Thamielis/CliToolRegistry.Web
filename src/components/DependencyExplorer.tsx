import { useMemo, useState } from 'react'
import type { CliTool } from '../types/app'
import { dependencyEdges } from '../data/workbench'
import { useLocale } from '../i18n/LocaleContext'
import { AppIcon } from './AppIcon'

export default function DependencyExplorer({ tools, selectedId, onSelect, onFocusChange }: {
  tools: CliTool[]
  selectedId: string | null
  onSelect: (id: string, trigger: HTMLButtonElement) => void
  onFocusChange: () => void
}) {
  const { locale, t } = useLocale()
  const edges = useMemo(() => dependencyEdges(tools), [tools])
  const index = useMemo(() => new Map(tools.map((tool) => [tool.id, tool])), [tools])
  const [focusId, setFocusId] = useState(selectedId ?? (tools.some((tool) => tool.id === 'apr') ? 'apr' : tools[0]?.id ?? ''))
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const focus = index.get(focusId) ?? tools[0]
  if (!focus) return <div className="empty-state">{t('noTools')}</div>
  const outgoing = edges.filter((edge) => edge.from === focus.id)
  const incoming = edges.filter((edge) => edge.to === focus.id)
  const related = edges.filter((edge) => edge.from === focus.id || edge.to === focus.id)
  const neighborIds = [...new Set(related.flatMap((edge) => [edge.from, edge.to]))].filter((id) => id !== focus.id).sort()
  const visibleIds = neighborIds.slice(0, 48)
  const positions = new Map([[focus.id, { x: 400, y: 270 }], ...visibleIds.map((id, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / visibleIds.length
    return [id, { x: 400 + 285 * Math.cos(angle), y: 270 + 180 * Math.sin(angle) }] as const
  })])
  const groups = [
    { label: t('requiredDependencies'), edges: outgoing.filter((edge) => edge.kind === 'required'), incoming: false },
    { label: t('recommendedDependencies'), edges: outgoing.filter((edge) => edge.kind === 'recommended'), incoming: false },
    { label: t('graphRequiredBy'), edges: incoming.filter((edge) => edge.kind === 'required'), incoming: true },
    { label: t('graphRecommendedBy'), edges: incoming.filter((edge) => edge.kind === 'recommended'), incoming: true },
  ]
  return <section className="dependency-screen">
    <header className="screen-intro"><span className="section-eyebrow">{t('navDependencies')}</span><h1 id="screen-heading" tabIndex={-1}>{t('graphHeading')}</h1><p>{t('graphBody')}</p></header>
    <div className="graph-toolbar workbench-panel"><label className="inline-select"><span>{t('graphChoose')}</span><select value={focus.id} onChange={(event) => { setFocusId(event.target.value); setZoom(1); setPan({ x: 0, y: 0 }); onFocusChange() }}>
      {[...tools].sort((a, b) => a.name.localeCompare(b.name, locale)).map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
    </select></label><div className="graph-legend"><span className="legend-line required" />{t('requiredDependencies')}<span className="legend-line recommended" />{t('recommendedDependencies')}</div></div>
    <div className="graph-layout">
      <div className="workbench-panel graph-panel">
        <header className="panel-heading"><span>{t('graphLegend')}</span><div className="graph-controls">
          <button className="icon-control" aria-label={t('graphZoomOut')} disabled={zoom <= 0.7} onClick={() => setZoom((n) => Math.max(0.7, n - 0.15))}>−</button>
          <button className="icon-control" aria-label={t('graphReset')} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>↺</button>
          <button className="icon-control" aria-label={t('graphZoomIn')} disabled={zoom >= 1.6} onClick={() => setZoom((n) => Math.min(1.6, n + 0.15))}>+</button>
          <button className="icon-control" aria-label={t('graphPanLeft')} onClick={() => setPan((p) => ({ ...p, x: Math.max(-300, p.x - 60) }))} disabled={pan.x <= -300}>←</button>
          <button className="icon-control" aria-label={t('graphPanRight')} onClick={() => setPan((p) => ({ ...p, x: Math.min(300, p.x + 60) }))} disabled={pan.x >= 300}>→</button>
          <button className="icon-control" aria-label={t('graphPanUp')} onClick={() => setPan((p) => ({ ...p, y: Math.max(-200, p.y - 40) }))} disabled={pan.y <= -200}>↑</button>
          <button className="icon-control" aria-label={t('graphPanDown')} onClick={() => setPan((p) => ({ ...p, y: Math.min(200, p.y + 40) }))} disabled={pan.y >= 200}>↓</button>
        </div></header>
        <div className="graph-viewport">
          <svg className="dependency-diagram" viewBox={`${400 + pan.x - 400 / zoom} ${270 + pan.y - 270 / zoom} ${800 / zoom} ${540 / zoom}`} role="group" aria-labelledby="graph-title" aria-describedby="graph-description">
            <title id="graph-title">{t('graphDiagram')}: {focus.name}</title><desc id="graph-description">{t('graphLegend')}. {t('graphCap')}</desc>
            <defs><marker id="dependency-arrow-required" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" className="arrow-required" /></marker>
              <marker id="dependency-arrow-recommended" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" className="arrow-recommended" /></marker></defs>
            <circle cx="400" cy="270" r="200" className="graph-ring" /><circle cx="400" cy="270" r="90" className="graph-ring" />
            {related.filter((edge) => positions.has(edge.from) && positions.has(edge.to)).map((edge) => {
              const from = positions.get(edge.from)!
              const to = positions.get(edge.to)!
              const angle = Math.atan2(to.y - from.y, to.x - from.x)
              const startX = from.x + 35 * Math.cos(angle), startY = from.y + 35 * Math.sin(angle)
              const endX = to.x - 40 * Math.cos(angle), endY = to.y - 40 * Math.sin(angle)
              const self = edge.from === edge.to
              return <path key={edge.from + ':' + edge.to + ':' + edge.kind} data-edge={`${edge.from}->${edge.to}`} data-kind={edge.kind}
                d={self ? `M${from.x - 20},${from.y - 35} C${from.x - 100},${from.y - 140} ${from.x + 100},${from.y - 140} ${from.x + 20},${from.y - 35}` :
                  `M${startX},${startY} Q400,${edge.kind === 'recommended' ? 205 : 270} ${endX},${endY}`}
                className={'graph-edge ' + edge.kind} markerEnd={`url(#dependency-arrow-${edge.kind})`} />
            })}
            {[focus.id, ...visibleIds].map((id) => {
              const point = positions.get(id)!
              const tool = index.get(id)
              return <g key={id} className={'graph-node ' + (id === focus.id ? 'focused' : '') + (!tool ? ' external' : '')} data-node={id}>
                <circle cx={point.x} cy={point.y} r={id === focus.id ? 37 : 27} />
                {tool ? <foreignObject x={point.x - 27} y={point.y - 27} width="54" height="54">
                  <button className="graph-node-button" aria-label={tool.name + ', ' + t('details')} onClick={(event) => onSelect(id, event.currentTarget)}><span aria-hidden="true">&gt;_</span></button>
                </foreignObject> : <text x={point.x} y={point.y + 4} textAnchor="middle" className="graph-node-glyph">?</text>}
                <text x={point.x} y={point.y + 54} textAnchor="middle">{id.length > 22 ? id.slice(0, 20) + '…' : id}</text>
              </g>
            })}
          </svg>
        </div>
        <footer className="graph-caption"><span>{t('graphCap')}</span><span>{related.length} {t('navDependencies')}</span></footer>
      </div>
      <aside className="workbench-panel graph-focus"><AppIcon app={focus} className="graph-focus-logo" /><span className="section-eyebrow">{t('graphChoose')}</span><h2>{focus.name}</h2><code>{focus.command}</code><p>{focus.description}</p>
        <button className="workbench-button primary" onClick={(event) => onSelect(focus.id, event.currentTarget)}>{t('details')} <span aria-hidden="true">↗</span></button>
        {!related.length && <p>{t('graphEmpty')}</p>}
      </aside>
    </div>
    <div className="relationship-grid">{groups.map((group) => <section className="workbench-panel relationship-group" key={group.label}><h2>{group.label} <span>{group.edges.length}</span></h2>
      {group.edges.length ? <ul>{group.edges.map((edge) => {
        const id = group.incoming ? edge.from : edge.to
        const tool = index.get(id)
        return <li key={edge.from + edge.to + edge.kind}>{tool ? <button onClick={(event) => onSelect(id, event.currentTarget)}><span>{tool.name}</span><code>{id}</code><span aria-hidden="true">↗</span></button> :
          <span className="external-reference"><code>{id}</code><small>{t('graphExternal')}</small></span>}</li>
      })}</ul> : <p className="muted-value">{t('graphEmpty')}</p>}
    </section>)}</div>
  </section>
}
