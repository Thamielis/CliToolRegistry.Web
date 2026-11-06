import { useEffect, useMemo, useRef, useState } from 'react'
import type { CliTool } from '../types/app'
import { SECTIONS, type ExplorerNavigationAction, type Section } from '../data/workbench'
import { useLocale } from '../i18n/LocaleContext'
import { sectionLabels } from '../i18n/translations'
import type { ExplorerManifest } from '../types/explorer'
import { explorerRegistry } from '../data/explorerRegistry'

type PaletteResult =
  | { id: string; kind: 'section'; label: string; hint: string; section: Section }
  | { id: string; kind: 'tool'; label: string; hint: string; toolId: string }
  | { id: string; kind: 'explorer-tool'; label: string; hint: string; toolId: string }
  | { id: string; kind: 'explorer-dataset'; label: string; hint: string; toolId: string; datasetId: string }

export function CommandPalette({ open, tools, explorerManifest, onClose, onNavigate, onTool, onExplore }: {
  open: boolean
  tools: CliTool[]
  explorerManifest: ExplorerManifest | null
  onClose: () => void
  onNavigate: (section: Section) => void
  onTool: (id: string) => void
  onExplore: (action: ExplorerNavigationAction) => void
}) {
  const { locale, t } = useLocale()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const activating = useRef(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMemo<PaletteResult[]>(() => {
    const q = query.trim().toLocaleLowerCase(locale)
    const sections = SECTIONS.filter((section) => t(sectionLabels[section]).toLocaleLowerCase(locale).includes(q))
      .map((section) => ({ id: section, kind: 'section' as const, label: t(sectionLabels[section]), hint: t('paletteSections'), section }))
    const catalogNames = new Map(tools.map((tool) => [tool.id, tool.name]))
    const fallbackNames = new Map(explorerRegistry.tools.map((tool) => [tool.toolId, tool.fallbackName]))
    const explorerTargets: Extract<PaletteResult, { kind: 'explorer-tool' | 'explorer-dataset' }>[] = []
    if (explorerManifest) {
      const byTool = new Map<string, typeof explorerManifest.datasets>()
      for (const dataset of explorerManifest.datasets) {
        const entries = byTool.get(dataset.toolId) ?? []
        entries.push(dataset)
        byTool.set(dataset.toolId, entries)
      }
      for (const [toolId, datasets] of byTool) {
        const toolName = catalogNames.get(toolId) ?? fallbackNames.get(toolId) ?? toolId
        explorerTargets.push({
          id: 'explorer-tool:' + toolId,
          kind: 'explorer-tool',
          label: toolName,
          hint: t('paletteExplorerCount').replace('{count}', String(datasets.length)),
          toolId,
        })
        for (const dataset of datasets) {
          explorerTargets.push({
            id: 'explorer-dataset:' + toolId + ':' + dataset.datasetId,
            kind: 'explorer-dataset',
            label: dataset.title[locale],
            hint: toolName + ' · ' + t('paletteExplorerDataset'),
            toolId,
            datasetId: dataset.datasetId,
          })
        }
      }
    }
    const explorerMatches = explorerTargets.filter((target) => {
      return [target.label, target.hint, target.toolId, target.id].join(' ').toLocaleLowerCase(locale).includes(q)
    })
    const matches = tools.filter((tool) => [tool.name, tool.command, tool.id, ...(tool.tags ?? [])].join(' ').toLocaleLowerCase(locale).includes(q))
      .map((tool) => ({ id: tool.id, kind: 'tool' as const, label: tool.name, hint: tool.command, toolId: tool.id }))
    return [...sections, ...explorerMatches, ...matches].slice(0, 20)
  }, [query, tools, explorerManifest, locale, t])
  const index = results.length ? Math.min(active, results.length - 1) : -1

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      opener.current = document.activeElement as HTMLElement
      activating.current = false
      setQuery('')
      setActive(0)
      node.showModal()
      input.current?.focus()
    } else if (!open && node.open) node.close()
  }, [open])

  useEffect(() => {
    if (open && index >= 0) document.getElementById('palette-option-' + index)?.scrollIntoView({ block: 'nearest' })
  }, [index, open])

  const activate = (result: PaletteResult) => {
    activating.current = true
    dialog.current?.close()
    if (result.kind === 'section') onNavigate(result.section)
    else if (result.kind === 'tool') onTool(result.toolId)
    else if (result.kind === 'explorer-tool') onExplore({ type: 'tool', toolId: result.toolId })
    else onExplore({ type: 'dataset', ref: { toolId: result.toolId, datasetId: result.datasetId } })
  }

  return <dialog ref={dialog} className="command-palette" aria-labelledby="palette-title" onCancel={() => onClose()}
    onClose={() => {
      onClose()
      if (!activating.current) {
        if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
        else document.getElementById('palette-trigger')?.focus({ preventScroll: true })
      }
    }}>
    <header><h2 id="palette-title">{t('paletteTitle')}</h2><button className="icon-control" aria-label={t('paletteClose')} onClick={() => dialog.current?.close()}>×</button></header>
    <div className="palette-search"><span aria-hidden="true">⌕</span><input ref={input} type="text" role="combobox" aria-label={t('paletteSearch')}
      aria-autocomplete="list" aria-expanded={open} aria-controls="palette-results" aria-activedescendant={index >= 0 ? 'palette-option-' + index : undefined}
      value={query} placeholder={t('paletteSearch')} onChange={(event) => { setQuery(event.target.value); setActive(0) }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && results.length) {
          event.preventDefault()
          setActive(event.key === 'Home' ? 0 : event.key === 'End' ? results.length - 1 :
            (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
        }
        if (event.key === 'Enter' && index >= 0) { event.preventDefault(); activate(results[index]) }
      }} />
      {query && <button className="icon-control" aria-label={t('clearSearch')} onClick={() => { setQuery(''); setActive(0); input.current?.focus() }}>×</button>}
    </div>
    <div className="palette-results" id="palette-results" role="listbox" aria-label={t('paletteSearch')}>
      {results.map((result, i) => <button type="button" role="option" aria-selected={i === index} tabIndex={-1} id={'palette-option-' + i}
        className={i === index ? 'active' : ''} key={result.kind + result.id} onClick={() => activate(result)}>
        <span><strong>{result.label}</strong><small>{result.hint}</small></span><span aria-hidden="true">↵</span>
      </button>)}
    </div>
    {!results.length && <p className="palette-empty" role="status">{t('paletteEmpty')}</p>}
    <footer>{t('paletteHint')}<kbd>Ctrl / ⌘ K</kbd></footer>
  </dialog>
}
