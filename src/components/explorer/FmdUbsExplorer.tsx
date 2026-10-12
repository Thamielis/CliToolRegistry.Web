import type { ReactNode } from 'react'
import { CommandBlock } from '../CommandBlock'
import { GenericDatasetView, type DatasetViewProps } from '../ExplorerDetails'
import { downloadOriginalJson } from '../../data/loadExplorer'
import { resolveJsonPointer } from '../../data/explorerAdapters'
import type { ExplorerEntry, JsonValue, Presence, StructuredDetail } from '../../types/explorer'

const COPY = {
  de: {
    select: 'Eintrag öffnen', count: '{shown} von {total} Einträgen', commands: 'Aufrufformen', outputs: 'Ausgabearten',
    features: 'Fähigkeiten', theme: 'Theme-Modell', pdf: 'PDF-Kopf- und Fußzeilen', exit: 'Exitcodes', guide: 'Einstieg und Workflow',
    flags: 'Flags', examples: 'Beispiele', formats: 'Ausgabeformate', configuration: 'Konfiguration', sourceJson: 'Quellen-JSON',
    noSection: 'Dieser Bereich enthält keine Einträge.', noResults: 'Keine Einträge passen zu Suche und Filtern.',
    noSource: 'Diese Quelle enthält keine lesbaren Einträge.', choose: 'Wähle einen Eintrag aus der Liste.',
    sourcePointer: 'Quellpointer', file: 'Datei', digest: 'SHA-256', bytes: 'Bytes', version: 'Version', contract: 'Vertrag',
    description: 'Beschreibung', snapshotValue: 'Snapshotwert', examplesFromSnapshot: 'Originalbeispiele aus dem Snapshot',
    invocations: 'Dokumentierte Aufrufformen', schema: 'Dokumentierter Schema-Aufruf', noExamples: 'Im Snapshot sind keine Beispiele vorhanden.',
    rawPreview: 'JSON-Vorschau', download: 'Originaldatei herunterladen',
    limited: 'Die Vorschau endet nach 20.000 Zeichen. Der Download enthält die vollständige Originaldatei.',
    missing: 'Im Snapshot nicht vorhanden', explicitNull: 'Im Snapshot explizit null',
    flagNull: 'args ist im Snapshot null. Dieses Flag besitzt kein Wertargument; null bleibt als Quellwert erhalten.',
    docsOnly: 'Dokumentierte Scanverträge und Beispiele. Diese Seite führt keinen Scan aus.',
    exitSemantics: 'Exitcode 3 bedeutet: nichts gescannt; das ist kein bestandener Scan. Teilweise Läufe gehören laut Quelle zu Exitcode 2, sofern UBS_ALLOW_PARTIAL nicht gesetzt ist.',
    noAvailableText: 'Dieser Klartextdatensatz wird nicht als JSON-Quelle aufgenommen.',
  },
  en: {
    select: 'Open entry', count: '{shown} of {total} entries', commands: 'Invocations', outputs: 'Output formats',
    features: 'Features', theme: 'Theme model', pdf: 'PDF running content', exit: 'Exit codes', guide: 'Entry and workflow',
    flags: 'Flags', examples: 'Examples', formats: 'Output formats', configuration: 'Configuration', sourceJson: 'Source JSON',
    noSection: 'This section contains no entries.', noResults: 'No entries match this search and filter selection.',
    noSource: 'This source contains no readable entries.', choose: 'Choose an entry from the list.',
    sourcePointer: 'Source pointer', file: 'File', digest: 'SHA-256', bytes: 'Bytes', version: 'Version', contract: 'Contract',
    description: 'Description', snapshotValue: 'Snapshot value', examplesFromSnapshot: 'Original examples from the snapshot',
    invocations: 'Documented invocations', schema: 'Documented schema invocation', noExamples: 'The snapshot contains no examples.',
    rawPreview: 'JSON preview', download: 'Download original file',
    limited: 'The preview ends after 20,000 characters. The download contains the complete original file.',
    missing: 'Not present in this snapshot', explicitNull: 'Explicitly null in this snapshot',
    flagNull: 'args is null in the snapshot. This flag has no value argument; null remains visible as the source value.',
    docsOnly: 'Documented scan contracts and examples. This page does not run a scan.',
    exitSemantics: 'Exit code 3 means nothing was scanned; it is not a passed scan. The source assigns partial runs to exit code 2 unless UBS_ALLOW_PARTIAL is set.',
    noAvailableText: 'This plain-text dataset is not included as a JSON source.',
  },
} as const

type Copy = { [Key in keyof typeof COPY.de]: string }

function jsonText(value: JsonValue): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayValue(value: JsonValue): ReactNode {
  if (typeof value === 'string') return <code>{value}</code>
  if (value !== null && typeof value === 'object') return <pre className="explorer-raw-preview">{jsonText(value)}</pre>
  return <code>{String(value)}</code>
}

function presenceValue<T extends JsonValue>(presence: Presence<T>, copy: Copy): ReactNode {
  if (presence.state === 'missing') return copy.missing
  if (presence.state === 'null') return copy.explicitNull
  return displayValue(presence.value)
}

function sourcePointer(entry: ExplorerEntry): ReactNode {
  return <code>{entry.origin.filename}{entry.origin.pointer || '/'}</code>
}

function sectionHeading(id: string | undefined, copy: Copy, fallback: string): string {
  const mapping: Record<string, keyof typeof COPY.de> = {
    commands: 'commands', outputs: 'outputs', features: 'features', theme: 'theme', 'pdf-running-content': 'pdf',
    'exit-codes': 'exit', guide: 'guide', flags: 'flags', examples: 'examples', formats: 'formats', env: 'configuration', json: 'sourceJson',
  }
  const key = id ? mapping[id] : undefined
  return key ? copy[key] : fallback
}

function summary(entry: ExplorerEntry, copy: Copy): string {
  const detail = entry.detail
  if (detail.kind === 'example') return `${detail.commands.length} ${copy.examplesFromSnapshot.toLocaleLowerCase()}`
  if (detail.kind === 'structured') {
    const first = detail.rows.find((row) => row.value.state === 'value')
    if (first?.value.state === 'value') return `${first.label}: ${typeof first.value.value === 'string' ? first.value.value : jsonText(first.value.value)}`
    if (typeof detail.sourceValue === 'string') return detail.sourceValue
    return jsonText(detail.sourceValue)
  }
  return entry.searchText
}

function entryButton(entry: ExplorerEntry, selected: boolean, props: DatasetViewProps, copy: Copy): ReactNode {
  return <li key={entry.id}>
    <button type="button" className="explorer-entry-button" aria-current={selected ? 'true' : undefined}
      aria-label={`${entry.title}, ${copy.select}`} data-history-focus-key={`explorer-entry:${entry.id}`}
      onClick={() => props.onAction({ type: 'entry', entryId: entry.id })}>
      <span className="explorer-entry-title">{entry.title}</span>
      {sourcePointer(entry)}
      <span className="explorer-entry-summary">{summary(entry, copy)}</span>
    </button>
  </li>
}

function rowsFor(entry: ExplorerEntry, detail: StructuredDetail, copy: Copy): { label: string; value: ReactNode }[] {
  const rows = detail.rows.map(({ label, value }) => ({ label, value: presenceValue(value, copy) }))
  if (rows.length === 0) rows.push({ label: copy.snapshotValue, value: displayValue(detail.sourceValue) })
  if (entry.sectionId === 'flags' && isRecord(detail.sourceValue) && detail.sourceValue.args === null &&
    !rows.some((row) => row.label === 'args')) {
    rows.push({ label: 'args', value: <code>null</code> })
  }
  return rows
}

function DetailsList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <dl className="explorer-provenance">
    {rows.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
  </dl>
}

function EntryFields({ entry, copy }: { entry: ExplorerEntry; copy: Copy }): ReactNode {
  if (entry.detail.kind === 'example') {
    return <>
      {entry.detail.description.state === 'value' && <DetailsList rows={[{ label: copy.description, value: entry.detail.description.value }]} />}
      {entry.detail.commands.length > 0 ? <section>
        <h3>{entry.sectionId === 'commands' ? copy.examplesFromSnapshot : copy.invocations}</h3>
        {entry.detail.commands.map((command, index) => <CommandBlock key={`${entry.id}:${index}`} command={command} />)}
      </section> : <p>{copy.noExamples}</p>}
    </>
  }
  if (entry.detail.kind !== 'structured') return <p className="explorer-entry-summary">{entry.searchText}</p>

  const rows = rowsFor(entry, entry.detail, copy)
  const schema = entry.sectionId === 'formats'
    ? entry.detail.rows.find((row) => row.label === 'schema' && row.value.state === 'value' && typeof row.value.value === 'string')
    : undefined
  const flagExample = entry.sectionId === 'flags' && isRecord(entry.detail.sourceValue) && typeof entry.detail.sourceValue.example === 'string'
    ? entry.detail.sourceValue.example
    : null
  return <>
    {entry.sectionId === 'flags' && isRecord(entry.detail.sourceValue) && entry.detail.sourceValue.args === null
      && <p className="notice notice-warning">{copy.flagNull}</p>}
    <DetailsList rows={rows} />
    {schema?.value.state === 'value' && typeof schema.value.value === 'string' && <section>
      <h3>{copy.schema}</h3>
      <CommandBlock command={schema.value.value} />
    </section>}
    {flagExample && <section>
      <h3>{copy.examplesFromSnapshot}</h3>
      <CommandBlock command={flagExample} />
    </section>}
    {entry.detail.copyCommands.length > 0 && <section>
      <h3>{copy.invocations}</h3>
      {entry.detail.copyCommands.map((command, index) => <CommandBlock key={`${entry.id}:${index}`} command={command} />)}
    </section>}
    {entry.sectionId === 'exit-codes' && <p className="notice notice-warning">{copy.exitSemantics}</p>}
  </>
}

function DetailsPanel({ props, copy }: { props: DatasetViewProps; copy: Copy }) {
  const { selectedEntry, manifestEntry, sourceValue, sourceBytes, locale, labels } = props
  const pointed = selectedEntry ? resolveJsonPointer(sourceValue, selectedEntry.origin.pointer) : { state: 'value' as const, value: sourceValue }
  const rawValue = pointed.state === 'value' ? pointed.value : pointed.state === 'null' ? null : sourceValue
  const rawText = jsonText(rawValue)
  const metadata = manifestEntry.snapshot
  const rows = [
    { label: copy.file, value: <code>{manifestEntry.filename}</code> },
    { label: copy.digest, value: <code>{manifestEntry.sha256}</code> },
    { label: copy.bytes, value: manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US') },
    ...(metadata.version.state === 'value' ? [{ label: copy.version, value: <code>{metadata.version.value}</code> }] : []),
    ...(metadata.contract.state === 'value' ? [{ label: copy.contract, value: <code>{metadata.contract.value}</code> }] : []),
    ...(selectedEntry ? [{ label: copy.sourcePointer, value: sourcePointer(selectedEntry) }] : []),
  ]
  return <aside className="explorer-details" aria-label={selectedEntry?.title ?? manifestEntry.filename}>
    <header className="explorer-details-header"><div>
      <span className="section-eyebrow">{selectedEntry ? copy.sourcePointer : copy.file}</span>
      <h2 tabIndex={-1} data-navigation-entry-heading data-history-focus-key={selectedEntry ? `explorer-entry:${selectedEntry.id}` : 'explorer-source'}>
        {selectedEntry?.title ?? labels.rawPreview}
      </h2>
    </div>
      {selectedEntry && <button type="button" className="quiet-button" onClick={() => props.onAction({ type: 'close-entry' })}>{labels.closeEntry}</button>}
    </header>
    {selectedEntry && <p className="explorer-entry-origin">{sourcePointer(selectedEntry)}</p>}
    <DetailsList rows={rows} />
    <div className="explorer-detail-actions">
      <button type="button" className="workbench-button" onClick={() => downloadOriginalJson(sourceBytes, manifestEntry.filename, {
        document, urls: URL, schedule: (callback) => globalThis.setTimeout(callback, 0),
      })}>{copy.download}</button>
    </div>
    {selectedEntry ? <EntryFields entry={selectedEntry} copy={copy} /> : <p>{copy.choose}</p>}
    <section className="explorer-json-preview">
      <h3>{selectedEntry ? copy.sourceJson : copy.rawPreview}</h3>
      {rawText.length > 20_000 && <p className="notice notice-warning">{copy.limited}</p>}
      <pre className="explorer-raw-preview">{rawText.slice(0, 20_000)}</pre>
    </section>
  </aside>
}

function FmdUbsExplorerView(props: DatasetViewProps, copy: Copy): ReactNode {
  const adapter = props.manifestEntry.adapter
  const ubs = adapter === 'ubs-docs'
  if (props.section?.id === 'json') return <GenericDatasetView props={props} />

  const sectionId = props.section?.id
  const title = sectionHeading(sectionId, copy, props.section?.label[props.locale] ?? props.manifestEntry.filename)
  return <div className="explorer-dataset-layout">
    <section className="explorer-reader" aria-label={title}>
      <div className="explorer-reader-heading"><div>
        <span className="section-eyebrow">{props.labels.sections}</span>
        <h2>{title}</h2>
      </div><span className="explorer-entry-count" role="status">
        {copy.count.replace('{shown}', String(props.entries.length)).replace('{total}', String(props.matchingCount))}
      </span></div>
      {ubs && <p className="explorer-provenance-summary">{copy.docsOnly}</p>}
      {sectionId === 'exit-codes' && ubs && <p className="notice notice-warning">{copy.exitSemantics}</p>}
      {props.entries.length === 0
        ? <div className="empty-state"><p>{props.matchingCount === 0 ? copy.noResults : copy.noSection}</p></div>
        : <ol className="explorer-entry-list">{props.entries.map((entry) => entryButton(entry, props.selectedEntry?.id === entry.id, props, copy))}</ol>}
      {props.entries.length < props.matchingCount && <button type="button" className="workbench-button explorer-more"
        data-history-focus-key="explorer-more" onClick={() => props.onAction({ type: 'more', docCount: props.navigation.docCount + 48 })}>
        {props.labels.loadMore}
      </button>}
    </section>
    <DetailsPanel props={props} copy={copy} />
  </div>
}

export function FmdUbsExplorer(props: DatasetViewProps) {
  return FmdUbsExplorerView(props, COPY[props.locale])
}
