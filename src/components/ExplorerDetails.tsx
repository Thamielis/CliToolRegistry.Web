import type { ReactNode } from 'react'
import { downloadOriginalJson } from '../data/loadExplorer'
import { resolveJsonPointer } from '../data/explorerAdapters'
import type {
  ExplorerDataset,
  ExplorerEntry,
  ExplorerSection,
  JsonValue,
  ManifestEntry,
} from '../types/explorer'
import type { Locale } from '../types/app'
import type { ExplorerLabelKey } from '../i18n/explorerLabels'
import type { ExplorerNavigationAction, NavigationState } from '../data/workbench'

export type DatasetViewProps = {
  dataset: ExplorerDataset
  manifestEntry: ManifestEntry
  sourceValue: JsonValue
  sourceBytes: Uint8Array
  navigation: NavigationState
  section: ExplorerSection | null
  entries: ExplorerEntry[]
  matchingCount: number
  selectedEntry: ExplorerEntry | null
  locale: Locale
  labels: Record<ExplorerLabelKey, string>
  onAction: (action: ExplorerNavigationAction) => void
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function highlighted(text: string, query: string, locale: Locale): ReactNode {
  const needle = query.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  if (!needle) return text
  const lower = text.toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  const children: ReactNode[] = []
  let cursor = 0
  let match = lower.indexOf(needle, cursor)
  while (match >= 0) {
    if (match > cursor) children.push(text.slice(cursor, match))
    children.push(<mark key={`${match}:${children.length}`}>{text.slice(match, match + needle.length)}</mark>)
    cursor = match + needle.length
    match = lower.indexOf(needle, cursor)
  }
  if (cursor < text.length) children.push(text.slice(cursor))
  return children
}

function valueText(value: JsonValue): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function JsonTree({
  value,
  pointer,
  depth,
  query,
  locale,
  labels,
  onOpenSubtree,
  budget,
}: {
  value: JsonValue
  pointer: string
  depth: number
  query: string
  locale: Locale
  labels: Record<ExplorerLabelKey, string>
  onOpenSubtree: (pointer: string) => void
  budget: { remaining: number }
}) {
  const children: [string, JsonValue][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : isRecord(value) ? Object.entries(value) : []
  if (children.length === 0) {
    return <code className="explorer-json-scalar">{highlighted(valueText(value), query, locale)}</code>
  }
  if (budget.remaining <= 0) return <span className="explorer-json-scalar" aria-label={labels.treeLimited}>…</span>
  if (depth >= 6) {
    return <button type="button" className="quiet-button explorer-subtree-button" onClick={() => onOpenSubtree(pointer)}>
      {labels.openSubtree} <code>{pointer || '/'}</code>
    </button>
  }
  budget.remaining -= 1
  const shownChildren = children.slice(0, Math.max(1, budget.remaining))
  return <details className="explorer-json-node" open={depth < 2}>
    <summary><code>{Array.isArray(value) ? `[${children.length}]` : `{${children.length}}`}</code></summary>
    <ul>
      {shownChildren.map(([key, child]) => {
        const childPointer = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
        return <li key={childPointer}>
          <span className="explorer-json-key">{highlighted(key, query, locale)}</span>
          <JsonTree value={child} pointer={childPointer} depth={depth + 1} query={query}
            locale={locale} labels={labels} onOpenSubtree={onOpenSubtree} budget={budget} />
        </li>
      })}
      {shownChildren.length < children.length && <li className="explorer-tree-limit">{labels.treeLimited}</li>}
    </ul>
  </details>
}

export function ExplorerDetails({ props }: { props: DatasetViewProps }) {
  const { labels, locale, manifestEntry, sourceValue, sourceBytes, selectedEntry, navigation, onAction } = props
  const pointer = selectedEntry?.detail.kind === 'generic' ? selectedEntry.detail.rootPointer : ''
  const resolved = pointer ? resolveJsonPointer(sourceValue, pointer) : { state: 'value' as const, value: sourceValue }
  const previewValue = resolved.state === 'value' ? resolved.value : sourceValue
  const previewText = JSON.stringify(previewValue, null, 2) ?? 'null'
  const limitedPreview = previewText.length > 20_000
  const metadata = manifestEntry.snapshot
  const sourced = [
    metadata.version.state === 'value' ? [labels.version, metadata.version.value] : null,
    metadata.contract.state === 'value' ? [labels.contract, metadata.contract.value] : null,
    metadata.generatedAt.state === 'value' ? [labels.generatedAt, metadata.generatedAt.value] : null,
  ].filter((value): value is [string, string] => value !== null)

  return <aside className="explorer-details" aria-label={selectedEntry?.title ?? manifestEntry.filename}>
    <header className="explorer-details-header">
      <div>
        <span className="section-eyebrow">{labels.filename}</span>
        <h2 data-navigation-entry-heading tabIndex={-1} data-history-focus-key={selectedEntry ? `explorer-entry:${selectedEntry.id}` : 'explorer-source'}>
          {selectedEntry?.title ?? labels.rawPreview}
        </h2>
      </div>
      {selectedEntry && <button type="button" className="quiet-button" onClick={() => onAction({ type: 'close-entry' })}>
        {labels.closeEntry}
      </button>}
    </header>

    {selectedEntry && <p className="explorer-entry-origin"><code>{selectedEntry.origin.filename}{selectedEntry.origin.pointer || '/'}</code></p>}

    <dl className="explorer-provenance">
      <div><dt>{labels.filename}</dt><dd><code>{manifestEntry.filename}</code></dd></div>
      <div><dt>{labels.digest}</dt><dd><code>{manifestEntry.sha256}</code></dd></div>
      <div><dt>{labels.bytes}</dt><dd>{manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')}</dd></div>
      {sourced.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><code>{value}</code></dd></div>)}
    </dl>

    <div className="explorer-detail-actions">
      <button type="button" className="workbench-button" onClick={() => downloadOriginalJson(sourceBytes, manifestEntry.filename, {
        document,
        urls: URL,
        schedule: (callback) => globalThis.setTimeout(callback, 0),
      })}>{labels.downloadOriginal}</button>
    </div>

    <section className="explorer-json-preview" aria-label={labels.rawPreview}>
      <h3>{selectedEntry?.detail.kind === 'generic' ? labels.jsonRoot : labels.rawPreview}</h3>
      {(selectedEntry?.detail.kind === 'generic' || props.manifestEntry.adapter === 'generic-json' ||
        props.dataset.entries.every((entry) => entry.detail.kind === 'generic')) && <JsonTree value={previewValue} pointer={pointer} depth={0} query={navigation.docQ}
        locale={locale} labels={labels} budget={{ remaining: 500 }}
        onOpenSubtree={(rootPointer) => onAction({ type: 'entry', entryId: `ptr:${rootPointer}` })} />}
      {limitedPreview && <p className="notice notice-warning">{labels.previewLimited}</p>}
      <pre className="explorer-raw-preview">{previewText.slice(0, 20_000)}</pre>
    </section>
  </aside>
}

export function GenericDatasetView({ props }: { props: DatasetViewProps }) {
  const { dataset, section, entries, matchingCount, selectedEntry, navigation, labels, locale, onAction } = props
  const sourceEntryIds = new Set(section?.entryIds ?? [])
  const sectionEntries = dataset.entries.filter((entry) => sourceEntryIds.has(entry.id))
  const shown = entries.length

  return <div className="explorer-dataset-layout">
    <section className="explorer-reader" aria-label={section?.label[locale] ?? labels.rawPreview}>
      <div className="explorer-reader-heading">
        <div>
          <span className="section-eyebrow">{labels.sections}</span>
          <h2>{section?.label[locale] ?? labels.rawPreview}</h2>
        </div>
        <span className="explorer-entry-count" role="status">
          {labels.matches.replace('{shown}', String(shown)).replace('{total}', String(matchingCount))}
        </span>
      </div>

      {sectionEntries.length === 0 ? <div className="empty-state"><p>{labels.emptySection}</p></div>
        : matchingCount === 0 ? <div className="empty-state"><p>{labels.noMatches}</p></div>
          : <ol className="explorer-entry-list">
            {entries.map((entry) => <li key={entry.id}>
              <button type="button" className="explorer-entry-button"
                aria-label={`${entry.title}, ${labels.selectEntry}`}
                aria-current={selectedEntry?.id === entry.id ? 'true' : undefined}
                data-history-focus-key={`explorer-entry:${entry.id}`}
                onClick={() => onAction({ type: 'entry', entryId: entry.id })}>
                <span className="explorer-entry-title">{highlighted(entry.title, navigation.docQ, locale)}</span>
                <code>{highlighted(entry.origin.pointer || '/', navigation.docQ, locale)}</code>
                <span className="explorer-entry-summary">{highlighted(entry.searchText, navigation.docQ, locale)}</span>
              </button>
            </li>)}
          </ol>}

      {shown < matchingCount && <button type="button" className="workbench-button explorer-more"
        data-history-focus-key="explorer-more"
        onClick={() => onAction({ type: 'more', docCount: Math.min(navigation.docCount + 48, 10_000) })}>
        {labels.loadMore} <span aria-hidden="true">↓</span>
      </button>}
    </section>

    <ExplorerDetails props={props} />
  </div>
}
