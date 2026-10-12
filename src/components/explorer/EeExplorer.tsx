import type { ReactNode } from 'react'
import { CommandBlock } from '../CommandBlock'
import { GenericDatasetView } from '../ExplorerDetails'
import { downloadOriginalJson } from '../../data/loadExplorer'
import { resolveJsonPointer } from '../../data/explorerAdapters'
import type { EeCommandDetail, ExplorerEntry, JsonValue, Presence, StructuredDetail } from '../../types/explorer'
import type { DatasetViewProps } from '../ExplorerDetails'

const COPY = {
  de: {
    select: 'Pfad öffnen', command: 'Befehlspfad', available: 'Verfügbarkeit im Snapshot', availableYes: 'Verfügbar',
    availableNo: 'Nicht verfügbar', argsUnknown: 'Argumente sind in dieser Datei nicht dokumentiert.',
    pathCount: '{shown} von {total} Pfaden', groupCount: '{count} Gruppen', combinedCount: '{shown} von {total} Pfaden · {groups} Gruppen',
    sectionCount: '{shown} von {total} Einträgen', empty: 'Dieser Bereich enthält keine Einträge.',
    noResults: 'Keine Einträge passen zu Suche und Filtern.', noSource: 'Diese Quelle enthält keine lesbaren Einträge.',
    choose: 'Wähle einen Eintrag aus der Liste.', loadMore: 'Weitere Pfade laden', loadMoreEntries: 'Weitere Einträge laden',
    loadMoreFirst: 'Weitere Pfade laden, um Einträge dieser Gruppe anzuzeigen.', group: 'Pfadgruppe',
    subsystems: 'Subsysteme', features: 'Fähigkeiten', limitations: 'Einschränkungen', configuration: 'Konfiguration',
    output: 'Ausgabe und Cursor', snapshot: 'Lokaler Snapshot', commands: 'Befehlsatlas', sourceJson: 'Originales JSON aus dem Snapshot',
    rawPreview: 'JSON-Vorschau', download: 'Originaldatei herunterladen', limited: 'Die Vorschau endet nach 20.000 Zeichen. Der Download enthält die vollständige Originaldatei.',
    file: 'Datei', pointer: 'Quellpointer', digest: 'SHA-256', bytes: 'Bytes', version: 'Version', contract: 'Vertrag',
    snapshotValue: 'Snapshotwert', description: 'Beschreibung', yes: 'Ja', no: 'Nein', missing: 'Im Snapshot nicht vorhanden',
    explicitNull: 'Im Snapshot explizit null', envelope: 'Envelope im Snapshot', success: 'Erfolg', degraded: 'Degraded', error: 'Fehler',
    envelopeNote: 'Die Envelope-Werte beschreiben ausschließlich diesen gespeicherten Snapshot.',
    exportingValues: 'Werte der exportierenden Installation',
    exportingValuesNote: 'Diese lokalen Werte stammen aus dem Snapshot und werden nicht auf diesem Rechner geprüft.',
    openCommand: 'Basisaufruf aus dem Snapshot kopieren', noEntry: 'Kein Eintrag ausgewählt.',
  },
  en: {
    select: 'Open path', command: 'Command path', available: 'Availability in snapshot', availableYes: 'Available',
    availableNo: 'Unavailable', argsUnknown: 'Arguments are not documented in this file.',
    pathCount: '{shown} of {total} paths', groupCount: '{count} groups', combinedCount: '{shown} of {total} paths · {groups} groups',
    sectionCount: '{shown} of {total} entries', empty: 'This section contains no entries.',
    noResults: 'No entries match this search and filter selection.', noSource: 'This source contains no readable entries.',
    choose: 'Choose an entry from the list.', loadMore: 'Load more paths', loadMoreEntries: 'Load more entries',
    loadMoreFirst: 'Load more paths to show entries in this group.', group: 'Path group',
    subsystems: 'Subsystems', features: 'Features', limitations: 'Limitations', configuration: 'Configuration',
    output: 'Output and cursor', snapshot: 'Local snapshot', commands: 'Command atlas', sourceJson: 'Original JSON from the snapshot',
    rawPreview: 'JSON preview', download: 'Download original file', limited: 'The preview ends after 20,000 characters. The download contains the complete original file.',
    file: 'File', pointer: 'Source pointer', digest: 'SHA-256', bytes: 'Bytes', version: 'Version', contract: 'Contract',
    snapshotValue: 'Snapshot value', description: 'Description', yes: 'Yes', no: 'No', missing: 'Not present in this snapshot',
    explicitNull: 'Explicitly null in this snapshot', envelope: 'Snapshot envelope', success: 'Success', degraded: 'Degraded', error: 'Error',
    envelopeNote: 'Envelope values describe this stored snapshot only.',
    exportingValues: 'Values from the exporting installation',
    exportingValuesNote: 'These local values come from the snapshot and are not checked on this machine.',
    openCommand: 'Copy snapshot base invocation', noEntry: 'No entry selected.',
  },
} as const

type Copy = { [Key in keyof typeof COPY.de]: string }
type Locale = DatasetViewProps['locale']
type EeCommandEntry = ExplorerEntry & { detail: EeCommandDetail }
type TreeNode = { segment: string; children: Map<string, TreeNode>; entry?: EeCommandEntry }
type PathGroup = { count: number; root: TreeNode; directEntries: EeCommandEntry[] }

function jsonText(value: JsonValue): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEeCommand(entry: ExplorerEntry): entry is ExplorerEntry & { detail: EeCommandDetail } {
  return entry.detail.kind === 'ee-command'
}

function displayValue(value: JsonValue): ReactNode {
  if (typeof value === 'string') return <code>{value}</code>
  if (value !== null && typeof value === 'object') return <pre className="explorer-raw-preview">{jsonText(value)}</pre>
  return <code>{String(value)}</code>
}

function presenceValue(presence: Presence<JsonValue>, copy: Copy): ReactNode {
  if (presence.state === 'missing') return copy.missing
  if (presence.state === 'null') return copy.explicitNull
  return displayValue(presence.value)
}

function sourcePointer(entry: ExplorerEntry): ReactNode {
  return <code>{entry.origin.filename}{entry.origin.pointer || '/'}</code>
}

function detailsList(rows: { label: string; value: ReactNode }[]): ReactNode {
  return <dl className="explorer-provenance">
    {rows.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
  </dl>
}

function rowPresence(source: JsonValue, key: string): Presence<JsonValue> {
  if (!isRecord(source) || !Object.hasOwn(source, key)) return { state: 'missing' }
  const value = source[key]
  return value === null ? { state: 'null' } : { state: 'value', value }
}

function structuredRows(entry: ExplorerEntry, detail: StructuredDetail, copy: Copy): { label: string; value: ReactNode }[] {
  const rows = detail.rows.map(({ label, value }) => ({ label, value: presenceValue(value, copy) }))
  if (entry.sectionId === 'env') {
    for (const key of ['defaultValue', 'currentValue']) {
      if (!rows.some((row) => row.label === key)) rows.push({ label: key, value: presenceValue(rowPresence(detail.sourceValue, key), copy) })
    }
  }
  return rows
}

function matchesQuery(entry: ExplorerEntry, query: string, locale: Locale): boolean {
  const needle = query.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  if (!needle) return true
  return `${entry.title} ${entry.searchText} ${entry.origin.pointer}`
    .toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US').includes(needle)
}

function commandMatches(entry: ExplorerEntry, props: DatasetViewProps): boolean {
  if (!isEeCommand(entry) || !matchesQuery(entry, props.navigation.docQ, props.locale)) return false
  const available = props.navigation.available
  if (available === 'yes' && !entry.detail.availableInSnapshot) return false
  if (available === 'no' && entry.detail.availableInSnapshot) return false
  return true
}

function buildGroups(entries: ExplorerEntry[]): Map<string, PathGroup> {
  const groups = new Map<string, PathGroup>()
  for (const entry of entries) {
    if (!isEeCommand(entry)) continue
    const [groupName, ...remaining] = entry.detail.pathParts
    if (!groupName) continue
    let group = groups.get(groupName)
    if (!group) {
      group = { count: 0, root: { segment: groupName, children: new Map() }, directEntries: [] }
      groups.set(groupName, group)
    }
    group.count += 1
    if (remaining.length === 0) {
      group.directEntries.push(entry)
      continue
    }
    let siblings = group.root.children
    let node: TreeNode | undefined
    for (const [index, segment] of remaining.entries()) {
      node = siblings.get(segment)
      if (!node) {
        node = { segment, children: new Map() }
        siblings.set(segment, node)
      }
      if (index === remaining.length - 1) node.entry = entry
      siblings = node.children
    }
  }
  return groups
}

function EntryButton({ entry, selected, props, copy }: {
  entry: EeCommandEntry
  selected: boolean
  props: DatasetViewProps
  copy: Copy
}) {
  return <button type="button" className="explorer-entry-button" aria-current={selected ? 'true' : undefined}
    aria-label={`${entry.title}, ${copy.select}`} data-history-focus-key={`explorer-entry:${entry.id}`}
    onClick={() => props.onAction({ type: 'entry', entryId: entry.id })}>
    <span className="explorer-entry-title">{entry.title}</span>
    {sourcePointer(entry)}
    <span className="explorer-entry-summary">{copy.available}: {entry.detail.availableInSnapshot ? copy.availableYes : copy.availableNo}</span>
  </button>
}

function PathNodeView({ node, props, copy }: { node: TreeNode; props: DatasetViewProps; copy: Copy }): ReactNode {
  const children = [...node.children.values()]
  return <li key={node.segment}>
    {node.entry && <EntryButton entry={node.entry} selected={props.selectedEntry?.id === node.entry.id} props={props} copy={copy} />}
    {children.length > 0 && <details className="explorer-json-node ee-path-node">
      <summary>{node.segment}</summary>
      <ul>{children.map((child) => <PathNodeView key={child.segment} node={child} props={props} copy={copy} />)}</ul>
    </details>}
  </li>
}

function commandList(props: DatasetViewProps, copy: Copy): ReactNode {
  const allCommands = props.dataset.entries.filter((entry) => entry.sectionId === 'commands' && isEeCommand(entry))
  const matching = allCommands.filter((entry) => commandMatches(entry, props))
  const visible = props.entries.filter(isEeCommand)
  const searching = props.navigation.docQ.trim().length > 0
  const groups = buildGroups(matching)
  const pageGroups = buildGroups(visible)

  if (matching.length === 0) return <div className="empty-state"><p>{copy.noResults}</p></div>
  if (searching) return <>
    <ol className="explorer-entry-list ee-search-results">
      {visible.map((entry) => <li key={entry.id}><EntryButton entry={entry} selected={props.selectedEntry?.id === entry.id} props={props} copy={copy} /></li>)}
    </ol>
    {visible.length < props.matchingCount && <button type="button" className="workbench-button explorer-more"
      data-history-focus-key="explorer-more" onClick={() => props.onAction({ type: 'more', docCount: props.navigation.docCount + 48 })}>
      {copy.loadMore}
    </button>}
  </>

  return <>
    <ul className="explorer-entry-list ee-command-groups" aria-label={copy.group}>
      {[...groups.entries()].map(([name, group]) => {
        const pageGroup = pageGroups.get(name)
        const groupEntries = pageGroup?.directEntries ?? []
        const treeChildren = pageGroup ? [...pageGroup.root.children.values()] : []
        return <li key={name}>
          <details className="explorer-json-node ee-command-group">
            <summary>{name} <span className="explorer-entry-count">{group.count}</span></summary>
            {groupEntries.length > 0 || treeChildren.length > 0
              ? <ul>
                {groupEntries.map((entry) => <li key={entry.id}><EntryButton entry={entry} selected={props.selectedEntry?.id === entry.id} props={props} copy={copy} /></li>)}
                {treeChildren.map((node) => <PathNodeView key={node.segment} node={node} props={props} copy={copy} />)}
              </ul>
              : <p className="explorer-entry-summary">{copy.loadMoreFirst}</p>}
          </details>
        </li>
      })}
    </ul>
    {visible.length < props.matchingCount && <button type="button" className="workbench-button explorer-more"
      data-history-focus-key="explorer-more" onClick={() => props.onAction({ type: 'more', docCount: props.navigation.docCount + 48 })}>
      {copy.loadMore}
    </button>}
  </>
}

function sectionHeading(sectionId: string | undefined, locale: Locale, copy: Copy, fallback: string): string {
  switch (sectionId) {
    case 'commands': return copy.commands
    case 'subsystems': return copy.subsystems
    case 'features': return copy.features
    case 'unimplemented': return copy.limitations
    case 'env': return copy.configuration
    case 'output': return copy.output
    case 'snapshot': return copy.snapshot
    case 'json': return locale === 'de' ? 'Quellen-JSON' : 'Source JSON'
    default: return fallback
  }
}

function sourceJsonValue(source: JsonValue, key: string, copy: Copy): ReactNode {
  if (!isRecord(source) || !Object.hasOwn(source, key)) return copy.missing
  const value = source[key]
  return value === null ? copy.explicitNull : displayValue(value)
}

function EnvelopeSummary({ source, copy }: { source: JsonValue; copy: Copy }) {
  return <section className="explorer-provenance-summary ee-envelope-summary" aria-label={copy.envelope}>
    <strong>{copy.envelope}</strong>
    <span><strong>success</strong> {sourceJsonValue(source, 'success', copy)}</span>
    <span><strong>degraded</strong> {sourceJsonValue(source, 'degraded', copy)}</span>
    <span><strong>error</strong> {sourceJsonValue(source, 'error', copy)}</span>
    <span>{copy.envelopeNote}</span>
  </section>
}

function EeDetails({ props, copy }: { props: DatasetViewProps; copy: Copy }) {
  const { selectedEntry, manifestEntry, sourceValue, sourceBytes, locale, labels } = props
  const pointed = selectedEntry ? resolveJsonPointer(sourceValue, selectedEntry.origin.pointer) : { state: 'value' as const, value: sourceValue }
  const rawValue = pointed.state === 'value' ? pointed.value : pointed.state === 'null' ? null : sourceValue
  const rawText = jsonText(rawValue)
  const metadata = manifestEntry.snapshot
  const metadataRows = [
    { label: copy.file, value: <code>{manifestEntry.filename}</code> },
    { label: copy.digest, value: <code>{manifestEntry.sha256}</code> },
    { label: copy.bytes, value: manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US') },
    ...(metadata.version.state === 'value' ? [{ label: copy.version, value: <code>{metadata.version.value}</code> }] : []),
    ...(metadata.contract.state === 'value' ? [{ label: copy.contract, value: <code>{metadata.contract.value}</code> }] : []),
    ...(selectedEntry ? [{ label: copy.pointer, value: sourcePointer(selectedEntry) }] : []),
  ]

  let content: ReactNode
  if (selectedEntry?.detail.kind === 'ee-command') {
    content = <>
      {detailsList([
        { label: copy.command, value: <code>{selectedEntry.title}</code> },
        { label: copy.available, value: selectedEntry.detail.availableInSnapshot ? copy.availableYes : copy.availableNo },
      ])}
      {selectedEntry.detail.availableInSnapshot && <section aria-label={copy.openCommand}>
        <h3>{copy.openCommand}</h3>
        <CommandBlock command={`ee ${selectedEntry.title}`} />
      </section>}
      <p>{copy.argsUnknown}</p>
    </>
  } else if (selectedEntry?.detail.kind === 'structured') {
    content = <>
      {selectedEntry.sectionId === 'env' && <div className="notice notice-warning">
        <strong>{copy.exportingValues}.</strong> {copy.exportingValuesNote}
      </div>}
      {detailsList(structuredRows(selectedEntry, selectedEntry.detail, copy))}
    </>
  } else if (selectedEntry?.detail.kind === 'generic') {
    content = <p className="explorer-entry-summary">{selectedEntry.searchText}</p>
  } else if (selectedEntry) {
    content = <p className="explorer-entry-summary">{selectedEntry.searchText}</p>
  } else {
    content = <p className="empty-state">{copy.choose}</p>
  }

  return <aside className="explorer-details" aria-label={selectedEntry?.title ?? manifestEntry.filename}>
    <header className="explorer-details-header"><div>
      <span className="section-eyebrow">{selectedEntry ? copy.pointer : copy.file}</span>
      <h2 tabIndex={-1} data-navigation-entry-heading data-history-focus-key={selectedEntry ? `explorer-entry:${selectedEntry.id}` : 'explorer-source'}>
        {selectedEntry?.title ?? labels.rawPreview}
      </h2>
    </div>
      {selectedEntry && <button type="button" className="quiet-button" onClick={() => props.onAction({ type: 'close-entry' })}>{labels.closeEntry}</button>}
    </header>
    {selectedEntry && <p className="explorer-entry-origin">{sourcePointer(selectedEntry)}</p>}
    {detailsList(metadataRows)}
    <div className="explorer-detail-actions">
      <button type="button" className="workbench-button" onClick={() => downloadOriginalJson(sourceBytes, manifestEntry.filename, {
        document, urls: URL, schedule: (callback) => globalThis.setTimeout(callback, 0),
      })}>{copy.download}</button>
    </div>
    {content}
    <section className="explorer-json-preview">
      <h3>{selectedEntry ? copy.sourceJson : copy.rawPreview}</h3>
      {rawText.length > 20_000 && <p className="notice notice-warning">{copy.limited}</p>}
      <pre className="explorer-raw-preview">{rawText.slice(0, 20_000)}</pre>
    </section>
  </aside>
}

function EeExplorerView(props: DatasetViewProps, copy: Copy) {
  const sectionId = props.section?.id
  if (sectionId === 'json') return <>
    <EnvelopeSummary source={props.sourceValue} copy={copy} />
    <GenericDatasetView props={props} />
  </>

  const commandSection = sectionId === 'commands'
  const title = sectionHeading(sectionId, props.locale, copy, props.section?.label[props.locale] ?? props.manifestEntry.filename)
  const allCommandEntries = props.dataset.entries.filter((entry) => entry.sectionId === 'commands' && isEeCommand(entry))
  const matchingCommands = allCommandEntries.filter((entry) => commandMatches(entry, props))
  const groupCount = buildGroups(matchingCommands).size
  const titleCount = commandSection
    ? copy.combinedCount.replace('{shown}', String(props.entries.length)).replace('{total}', String(props.matchingCount))
      .replace('{groups}', new Intl.NumberFormat(props.locale === 'de' ? 'de-DE' : 'en-US').format(groupCount))
    : copy.sectionCount.replace('{shown}', String(props.entries.length)).replace('{total}', String(props.matchingCount))

  return <>
    <EnvelopeSummary source={props.sourceValue} copy={copy} />
    <div className="explorer-dataset-layout">
      <section className="explorer-reader" aria-label={title}>
        <div className="explorer-reader-heading"><div>
          <span className="section-eyebrow">{props.labels.sections}</span>
          <h2>{title}</h2>
        </div><span className="explorer-entry-count" role="status">{titleCount}</span></div>
        {sectionId === 'env' && <p className="explorer-provenance-summary">{copy.exportingValues}. {copy.exportingValuesNote}</p>}
        {commandSection
          ? commandList(props, copy)
          : props.entries.length === 0
            ? <div className="empty-state"><p>{props.matchingCount === 0 ? copy.noResults : copy.empty}</p></div>
            : <ol className="explorer-entry-list">
              {props.entries.map((entry) => <li key={entry.id}>
                <button type="button" className="explorer-entry-button" aria-current={props.selectedEntry?.id === entry.id ? 'true' : undefined}
                  aria-label={`${entry.title}, ${props.labels.selectEntry}`} data-history-focus-key={`explorer-entry:${entry.id}`}
                  onClick={() => props.onAction({ type: 'entry', entryId: entry.id })}>
                  <span className="explorer-entry-title">{entry.title}</span>{sourcePointer(entry)}
                  <span className="explorer-entry-summary">{entry.searchText}</span>
                </button>
              </li>)}
            </ol>}
        {!commandSection && props.entries.length < props.matchingCount && <button type="button" className="workbench-button explorer-more"
          data-history-focus-key="explorer-more" onClick={() => props.onAction({ type: 'more', docCount: props.navigation.docCount + 48 })}>
          {copy.loadMoreEntries}
        </button>}
      </section>
      <EeDetails props={props} copy={copy} />
    </div>
  </>
}

export function EeExplorer(props: DatasetViewProps) {
  return EeExplorerView(props, COPY[props.locale])
}
