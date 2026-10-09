import { useEffect, useMemo, useRef, useState } from 'react'
import type { CliTool } from '../types/app'
import { SECTIONS, type Section } from '../data/workbench'
import { useLocale } from '../i18n/LocaleContext'
import { sectionLabels } from '../i18n/translations'

export function CommandPalette({ open, tools, onClose, onNavigate, onTool }: {
  open: boolean
  tools: CliTool[]
  onClose: () => void
  onNavigate: (section: Section) => void
  onTool: (id: string) => void
}) {
  const { locale, t } = useLocale()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const activating = useRef(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale)
    const sections = SECTIONS.filter((section) => t(sectionLabels[section]).toLocaleLowerCase(locale).includes(q))
      .map((section) => ({ id: section, kind: 'section' as const, label: t(sectionLabels[section]), hint: t('paletteSections') }))
    const matches = tools.filter((tool) => [tool.name, tool.command, tool.id, ...(tool.tags ?? [])].join(' ').toLocaleLowerCase(locale).includes(q))
      .slice(0, 20).map((tool) => ({ id: tool.id, kind: 'tool' as const, label: tool.name, hint: tool.command }))
    return [...sections, ...matches].slice(0, 20)
  }, [query, tools, locale, t])
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

  const activate = (result: typeof results[number]) => {
    activating.current = true
    dialog.current?.close()
    if (result.kind === 'section') onNavigate(result.id as Section)
    else onTool(result.id)
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
