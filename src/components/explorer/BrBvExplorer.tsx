import type { ReactNode } from 'react'
import { CommandBlock } from '../CommandBlock'
import { downloadOriginalJson } from '../../data/loadExplorer'
import { resolveJsonPointer } from '../../data/explorerAdapters'
import { navigationUrl, transitionExplorerNavigation } from '../../data/workbench'
import type { BrCommandDetail, BvCommandDetail, ExplorerEntry, JsonValue, Presence } from '../../types/explorer'
import type { DatasetViewProps } from '../ExplorerDetails'

const COPY = {
  de: {
    relatedSources: 'Weitere Quellen dieses Werkzeugs', brGuide: 'Agentenleitfaden', brCapabilities: 'Fähigkeiten und Aufrufe',
    bvGuide: 'Robot-Referenz', bvCapabilities: 'Aufruf- und Fähigkeitsvertrag', select: 'Eintrag öffnen',
    count: '{shown} von {total} Einträgen', read: 'Lesend', write: 'Schreibend', mixed: 'Gemischt',
    required: 'Erforderlich', optional: 'Optional', none: 'Kein Arbeitsbereich', operation: 'Operation',
    workspace: 'Arbeitsbereich', machineOutput: 'Maschinenausgabe', examples: 'Beispiele aus dem Snapshot',
    noExamples: 'Für diesen Befehl sind im Snapshot keine Beispiele dokumentiert.',
    noFormats: 'Für diesen Befehl sind keine maschinenlesbaren Formate dokumentiert.',
    needs: 'Voraussetzungen', issues: 'Issues', git: 'Git', sprint: 'Sprint', baseline: 'Baseline',
    mutates: 'Ändert den Zustand', yes: 'Ja', no: 'Nein', flag: 'Robot-Flag', description: 'Beschreibung',
    preferred: 'Bevorzugter Aufruf', accepted: 'Akzeptierte Aufrufe', originalAlias: 'Agent-Intent-Alias',
    canonicalAlias: 'Kanonischer Alias', params: 'Dokumentierte Parameter', outputFields: 'Dokumentierte Ausgabefelder',
    noInvocations: 'Im Snapshot sind keine Aufrufe dokumentiert.', noParameters: 'Im Snapshot nicht vorhanden.',
    guideLines: 'Guidezeilen', sourcePointer: 'Quellpointer', guide: 'Originaltext aus dem Snapshot',
    sourceJson: 'Originales JSON aus dem Snapshot', download: 'Originaldatei herunterladen',
    limited: 'Die Vorschau endet nach 20.000 Zeichen. Der Download enthält die vollständige Originaldatei.',
    noSection: 'Dieser Bereich enthält keine Einträge.', noResults: 'Keine Einträge passen zu Suche und Filtern.',
    noSource: 'Diese Quelle enthält keine lesbaren Einträge.', loadMore: 'Weitere Einträge laden',
    valueMissing: 'Im Snapshot nicht vorhanden', valueNull: 'Im Snapshot explizit null',
    guideOriginal: 'Originaler Guideabschnitt', command: 'Befehl', summary: 'Kurzbeschreibung',
  },
  en: {
    relatedSources: 'Other sources for this tool', brGuide: 'Agent guide', brCapabilities: 'Capabilities and commands',
    bvGuide: 'Robot reference', bvCapabilities: 'Command and capability contract', select: 'Open entry',
    count: '{shown} of {total} entries', read: 'Read', write: 'Write', mixed: 'Mixed',
    required: 'Required', optional: 'Optional', none: 'No workspace', operation: 'Operation',
    workspace: 'Workspace', machineOutput: 'Machine output', examples: 'Examples in this snapshot',
    noExamples: 'This snapshot does not document examples for this command.',
    noFormats: 'This command has no documented machine-readable formats.',
    needs: 'Prerequisites', issues: 'Issues', git: 'Git', sprint: 'Sprint', baseline: 'Baseline',
    mutates: 'Changes state', yes: 'Yes', no: 'No', flag: 'Robot flag', description: 'Description',
    preferred: 'Preferred invocation', accepted: 'Accepted invocations', originalAlias: 'Agent intent alias',
    canonicalAlias: 'Canonical alias', params: 'Documented parameters', outputFields: 'Documented output fields',
    noInvocations: 'This snapshot does not document invocations.', noParameters: 'Not present in this snapshot.',
    guideLines: 'Guide lines', sourcePointer: 'Source pointer', guide: 'Original text from the snapshot',
    sourceJson: 'Original JSON from the snapshot', download: 'Download original file',
    limited: 'The preview ends after 20,000 characters. The download contains the complete original file.',
    noSection: 'This section contains no entries.', noResults: 'No entries match this search and filter selection.',
    noSource: 'This source contains no readable entries.', loadMore: 'Load more entries',
    valueMissing: 'Not present in this snapshot', valueNull: 'Explicitly null in this snapshot',
    guideOriginal: 'Original guide section', command: 'Command', summary: 'Summary',
  },
} as const

type Copy = { [Key in keyof typeof COPY.de]: string }

function textValue(value: JsonValue): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2) ?? 'null'
}

function presentValue<T>(presence: Presence<T>): presence is Extract<Presence<T>, { state: 'value' }> {
  return presence.state === 'value'
}

function highlighted(text: string, query: string, locale: DatasetViewProps['locale']): ReactNode {
  const needle = query.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  if (!needle) return text
  const lower = text.toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  const children: ReactNode[] = []
  let cursor = 0
  let match = lower.indexOf(needle)
  while (match >= 0) {
    if (match > cursor) children.push(text.slice(cursor, match))
    children.push(<mark key={`${match}:${children.length}`}>{text.slice(match, match + needle.length)}</mark>)
    cursor = match + needle.length
    match = lower.indexOf(needle, cursor)
  }
  if (cursor < text.length) children.push(text.slice(cursor))
  return children
}

function entrySummary(entry: ExplorerEntry, copy: Copy): string {
  const detail = entry.detail
  if (detail.kind === 'guide') return detail.text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? copy.guideOriginal
  if (detail.kind === 'br-command') return detail.summary
  if (detail.kind === 'bv-command') return detail.description
  if (detail.kind === 'example') return presentValue(detail.description) ? detail.description.value : detail.commands[0] ?? ''
  if (detail.kind === 'structured') {
    const first = detail.rows.find((row) => row.value.state === 'value')
    return first?.value.state === 'value' ? `${first.label}: ${textValue(first.value.value)}` : ''
  }
  return entry.searchText
}

function operationLabel(operation: BrCommandDetail['operation'], copy: Copy): string {
  return operation === 'read' ? copy.read : operation === 'write' ? copy.write : copy.mixed
}

function workspaceLabel(workspace: BrCommandDetail['workspace'], copy: Copy): string {
  return workspace === 'required' ? copy.required : workspace === 'optional' ? copy.optional : copy.none
}

function prerequisites(detail: BvCommandDetail, copy: Copy): string[] {
  return [
    detail.needsIssues ? copy.issues : null,
    detail.needsGit ? copy.git : null,
    detail.needsSprint ? copy.sprint : null,
    detail.needsBaseline ? copy.baseline : null,
  ].filter((value): value is string => value !== null)
}

function sourcePointer(entry: ExplorerEntry): ReactNode {
  return <code>{entry.origin.filename}{entry.origin.pointer || '/'}</code>
}

function entryBadges(entry: ExplorerEntry, copy: Copy): string[] {
  if (entry.detail.kind === 'br-command') return [
    operationLabel(entry.detail.operation, copy), workspaceLabel(entry.detail.workspace, copy),
  ]
  if (entry.detail.kind === 'bv-command') return [
    ...prerequisites(entry.detail, copy),
    `${copy.mutates}: ${entry.detail.mutatesState ? copy.yes : copy.no}`,
  ]
  return []
}

function DetailsList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <dl className="explorer-provenance">
    {rows.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
  </dl>
}

function invocationList(presence: Presence<string[]>, missingLabel: string): string[] | null {
  if (presence.state !== 'value') return null
  return presence.value.length > 0 ? presence.value : [missingLabel]
}

function StructuredRows({ entry, copy, locale }: {
  entry: ExplorerEntry
  copy: Copy
  locale: DatasetViewProps['locale']
}) {
  if (entry.detail.kind !== 'structured') return null
  const isAlias = entry.sectionId === 'aliases'
  const rows = entry.detail.rows.map(({ label, value }) => {
    const localizedLabel = isAlias
      ? label === 'agent_instinct' ? copy.originalAlias : label === 'canonical' ? copy.canonicalAlias : label
      : label
    const rendered = value.state === 'missing' ? copy.valueMissing
      : value.state === 'null' ? copy.valueNull
        : <code>{textValue(value.value)}</code>
    return { label: localizedLabel, value: rendered }
  })
  const quickstart = entry.origin.pointer === '/guide'
    ? entry.detail.rows.find((row) => row.label === 'quickstart')?.value
    : undefined
  return <>
    {rows.length > 0 && <DetailsList rows={rows} />}
    {Array.isArray(quickstart?.state === 'value' ? quickstart.value : null) && <section>
      <h3>{copy.examples}</h3>
      {(quickstart as { state: 'value'; value: JsonValue[] }).value.map((item, index) => typeof item === 'string'
        ? <CommandBlock key={`${index}:${item}`} command={item} />
        : <pre key={index} className="explorer-raw-preview">{textValue(item)}</pre>)}
    </section>}
    {isAlias && entry.detail.copyCommands.length > 0 && <section>
      <h3>{copy.canonicalAlias}</h3>
      {entry.detail.copyCommands.map((command, index) => <CommandBlock key={`${index}:${command}`} command={command} />)}
    </section>}
    {entry.detail.sourceValue !== null && <details className="explorer-json-preview">
      <summary>{copy.sourceJson}</summary>
      <pre className="explorer-raw-preview">{textValue(entry.detail.sourceValue)}</pre>
    </details>}
    <span className="sr-only">{locale === 'de' ? 'Strukturierte Snapshotdaten' : 'Structured snapshot data'}</span>
  </>
}

function EntryList({ props, copy }: { props: DatasetViewProps; copy: Copy }) {
  const { entries, dataset, section, matchingCount, navigation, selectedEntry, onAction, locale, labels } = props
  const entryList = section ? dataset.entries.filter((entry) => entry.sectionId === section.id) : []
  const brMatrix = props.manifestEntry.adapter === 'br-capabilities' && section?.id === 'commands'

  if (entryList.length === 0) return <div className="empty-state"><p>{copy.noSection}</p></div>
  if (matchingCount === 0) return <div className="empty-state"><p>{copy.noResults}</p></div>

  if (brMatrix) return <div className="table-scroll">
    <table className="tool-table explorer-br-operations">
      <thead><tr>
        <th scope="col">{copy.command}</th><th scope="col">{copy.summary}</th>
        <th scope="col">{copy.operation}</th><th scope="col">{copy.workspace}</th>
        <th scope="col">{copy.machineOutput}</th>
      </tr></thead>
      <tbody>{entries.map((entry) => {
        if (entry.detail.kind !== 'br-command') return null
        const detail = entry.detail
        return <tr key={entry.id} className={selectedEntry?.id === entry.id ? 'tool-row selected' : 'tool-row'}>
          <td data-label={copy.command} className="tool-name-cell">
            <button type="button" className="explorer-entry-button" aria-current={selectedEntry?.id === entry.id ? 'true' : undefined}
              data-history-focus-key={`explorer-entry:${entry.id}`} aria-label={`${entry.title}, ${labels.selectEntry}`}
              onClick={() => onAction({ type: 'entry', entryId: entry.id })}>
              <span className="explorer-entry-title">{highlighted(entry.title, navigation.docQ, locale)}</span>
              <span className="explorer-entry-summary">{highlighted(detail.summary, navigation.docQ, locale)}</span>
            </button>
          </td>
          <td data-label={copy.summary}>{highlighted(detail.summary, navigation.docQ, locale)}</td>
          <td data-label={copy.operation}><span className="category-label">{operationLabel(detail.operation, copy)}</span></td>
          <td data-label={copy.workspace}><span className="category-label">{workspaceLabel(detail.workspace, copy)}</span></td>
          <td data-label={copy.machineOutput}><ul className="tag-list" aria-label={copy.machineOutput}>
            {detail.machineOutput.map((format) => <li key={format}>{format}</li>)}
          </ul></td>
        </tr>
      })}</tbody>
    </table>
  </div>

  return <ol className="explorer-entry-list">
    {entries.map((entry) => <li key={entry.id}>
      <button type="button" className="explorer-entry-button" aria-current={selectedEntry?.id === entry.id ? 'true' : undefined}
        data-history-focus-key={`explorer-entry:${entry.id}`} aria-label={`${entry.title}, ${labels.selectEntry}`}
        onClick={() => onAction({ type: 'entry', entryId: entry.id })}>
        <span className="explorer-entry-title">{highlighted(entry.title, navigation.docQ, locale)}</span>
        {sourcePointer(entry)}
        <span className="explorer-entry-summary">{highlighted(entrySummary(entry, copy), navigation.docQ, locale)}</span>
        {entry.origin.guideLines && <span className="explorer-entry-summary">{copy.guideLines} {entry.origin.guideLines.start}–{entry.origin.guideLines.end}</span>}
      </button>
      {entryBadges(entry, copy).length > 0 && <ul className="tag-list" aria-label={copy.needs}>
        {entryBadges(entry, copy).map((badge) => <li key={badge}>{badge}</li>)}
      </ul>}
    </li>)}</ol>
}

function BrBvEntryDetails({ props, copy }: { props: DatasetViewProps; copy: Copy }) {
  const { selectedEntry, manifestEntry, sourceValue, sourceBytes, locale, labels, onAction } = props
  const detail = selectedEntry?.detail
  const pointerValue = selectedEntry ? resolveJsonPointer(sourceValue, selectedEntry.origin.pointer) : null
  const rawValue = pointerValue?.state === 'value' ? pointerValue.value : sourceValue
  const rawText = JSON.stringify(rawValue, null, 2) ?? 'null'
  const sourcedMeta = [
    manifestEntry.snapshot.version.state === 'value' ? [labels.version, manifestEntry.snapshot.version.value] : null,
    manifestEntry.snapshot.contract.state === 'value' ? [labels.contract, manifestEntry.snapshot.contract.value] : null,
    manifestEntry.snapshot.generatedAt.state === 'value' ? [labels.generatedAt, manifestEntry.snapshot.generatedAt.value] : null,
  ].filter((item): item is [string, string] => item !== null)

  const metadataRows = [
    { label: labels.filename, value: <code>{manifestEntry.filename}</code> },
    { label: labels.digest, value: <code>{manifestEntry.sha256}</code> },
    { label: labels.bytes, value: manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US') },
    ...sourcedMeta.map(([label, value]) => ({ label, value: <code>{value}</code> })),
    ...(selectedEntry ? [{ label: copy.sourcePointer, value: sourcePointer(selectedEntry) }] : []),
    ...(selectedEntry?.origin.guideLines ? [{ label: copy.guideLines,
      value: `${selectedEntry.origin.guideLines.start}–${selectedEntry.origin.guideLines.end}` }] : []),
  ]

  let content: ReactNode = null
  if (detail?.kind === 'guide') {
    content = <section className="explorer-json-preview"><h3>{copy.guide}</h3>
      <pre className="explorer-raw-preview">{detail.text}</pre></section>
  } else if (detail?.kind === 'br-command') {
    content = <>
      <DetailsList rows={[
        { label: copy.description, value: detail.summary },
        { label: copy.operation, value: <span className="category-label">{operationLabel(detail.operation, copy)}</span> },
        { label: copy.workspace, value: <span className="category-label">{workspaceLabel(detail.workspace, copy)}</span> },
        { label: copy.machineOutput, value: detail.machineOutput.length
          ? <ul className="tag-list">{detail.machineOutput.map((format) => <li key={format}>{format}</li>)}</ul>
          : copy.noFormats },
      ]} />
      <section><h3>{copy.examples}</h3>
        {detail.examples.length > 0 ? detail.examples.map((command, index) => <CommandBlock key={`${index}:${command}`} command={command} />)
          : <p>{copy.noExamples}</p>}
      </section>
    </>
  } else if (detail?.kind === 'bv-command') {
    const needs = prerequisites(detail, copy)
    const params = invocationList(detail.params, copy.noParameters)
    const keyFields = invocationList(detail.keyFields, copy.noParameters)
    const preferred = detail.preferredInvocation.state === 'value' ? [detail.preferredInvocation.value] : null
    const accepted = invocationList(detail.acceptedInvocations, copy.noInvocations)
    content = <>
      <DetailsList rows={[
        { label: copy.description, value: detail.description },
        { label: copy.flag, value: <code>{detail.flag}</code> },
        { label: copy.needs, value: needs.length ? <ul className="tag-list">{needs.map((need) => <li key={need}>{need}</li>)}</ul> : '—' },
        { label: copy.mutates, value: detail.mutatesState ? copy.yes : copy.no },
      ]} />
      {params && <section><h3>{copy.params}</h3>{detail.params.state === 'value' && detail.params.value.length > 0
        ? <ul>{detail.params.value.map((param, index) => <li key={`${index}:${param}`}><code>{param}</code></li>)}</ul>
        : <p>{copy.noParameters}</p>}</section>}
      {preferred && <section><h3>{copy.preferred}</h3><CommandBlock command={preferred[0]} /></section>}
      {accepted && <section><h3>{copy.accepted}</h3>{detail.acceptedInvocations.state === 'value' && detail.acceptedInvocations.value.length > 0
        ? detail.acceptedInvocations.value.map((command, index) => <CommandBlock key={`${index}:${command}`} command={command} />)
        : <p>{copy.noInvocations}</p>}</section>}
      {keyFields && <section><h3>{copy.outputFields}</h3>{detail.keyFields.state === 'value' && detail.keyFields.value.length > 0
        ? <ul>{detail.keyFields.value.map((field, index) => <li key={`${index}:${field}`}><code>{field}</code></li>)}</ul>
        : <p>{copy.noParameters}</p>}</section>}
    </>
  } else if (detail?.kind === 'example') {
    content = <>
      {presentValue(detail.description) && <p>{detail.description.value}</p>}
      <section><h3>{copy.examples}</h3>{detail.commands.map((command, index) => <CommandBlock key={`${index}:${command}`} command={command} />)}</section>
    </>
  } else if (detail?.kind === 'structured') {
    content = <StructuredRows entry={selectedEntry!} copy={copy} locale={locale} />
  } else if (selectedEntry) {
    content = <section className="explorer-json-preview"><h3>{labels.rawPreview}</h3>
      <pre className="explorer-raw-preview">{rawText.slice(0, 20_000)}</pre></section>
  } else {
    content = <p className="empty-state">{locale === 'de' ? 'Wähle einen Eintrag aus der Liste.' : 'Choose an entry from the list.'}</p>
  }

  return <aside className="explorer-details" aria-label={selectedEntry?.title ?? manifestEntry.filename}>
    <header className="explorer-details-header"><div>
      <span className="section-eyebrow">{selectedEntry ? copy.sourcePointer : labels.filename}</span>
      <h2 tabIndex={-1} data-navigation-entry-heading
        data-history-focus-key={selectedEntry ? `explorer-entry:${selectedEntry.id}` : 'explorer-source'}>
        {selectedEntry?.title ?? labels.rawPreview}
      </h2>
    </div>
      {selectedEntry && <button type="button" className="quiet-button" onClick={() => onAction({ type: 'close-entry' })}>{labels.closeEntry}</button>}
    </header>
    {selectedEntry && <p className="explorer-entry-origin">{sourcePointer(selectedEntry)}
      {selectedEntry.origin.guideLines && <> · {copy.guideLines} {selectedEntry.origin.guideLines.start}–{selectedEntry.origin.guideLines.end}</>}
    </p>}
    <DetailsList rows={metadataRows} />
    <div className="explorer-detail-actions">
      <button type="button" className="workbench-button" onClick={() => downloadOriginalJson(sourceBytes, manifestEntry.filename, {
        document, urls: URL, schedule: (callback) => globalThis.setTimeout(callback, 0),
      })}>{copy.download}</button>
    </div>
    {content}
    <section className="explorer-json-preview"><h3>{labels.rawPreview}</h3>
      {rawText.length > 20_000 && <p className="notice notice-warning">{copy.limited}</p>}
      <pre className="explorer-raw-preview">{rawText.slice(0, 20_000)}</pre>
    </section>
  </aside>
}

function datasetLink(props: DatasetViewProps, datasetId: string, title: string, current: boolean) {
  const action = { type: 'dataset' as const, ref: { toolId: props.manifestEntry.toolId, datasetId } }
  const next = transitionExplorerNavigation(props.navigation, action).state
  const href = navigationUrl(next, window.location.href)
  return <a key={datasetId} aria-current={current ? 'page' : undefined} href={href} onClick={(event) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    props.onAction(action)
  }}>{title}</a>
}

export function BrBvExplorer(props: DatasetViewProps) {
  const copy = COPY[props.locale]
  const { labels, section, entries, matchingCount, navigation, dataset, manifestEntry } = props
  const hasEntries = dataset.entries.length > 0
  const count = copy.count.replace('{shown}', String(entries.length)).replace('{total}', String(matchingCount))
  const isBr = manifestEntry.toolId === 'br'
  const currentDatasetId = manifestEntry.datasetId
  const relatedLinks = isBr
    ? [datasetLink(props, 'robot-docs', copy.brGuide, currentDatasetId === 'robot-docs'),
      datasetLink(props, 'capabilities', copy.brCapabilities, currentDatasetId === 'capabilities')]
    : [datasetLink(props, 'robot-docs', copy.bvGuide, currentDatasetId === 'robot-docs'),
      datasetLink(props, 'capabilities', copy.bvCapabilities, currentDatasetId === 'capabilities')]

  return <>
    <nav aria-label={copy.relatedSources} className="explorer-section-tabs">{relatedLinks}</nav>
    {!hasEntries ? <div className="empty-state"><p>{copy.noSource}</p></div> : <div className="explorer-dataset-layout">
      <section className="explorer-reader" aria-label={section?.label[props.locale] ?? labels.rawPreview}>
        <div className="explorer-reader-heading"><div>
          <span className="section-eyebrow">{labels.sections}</span>
          <h2>{section?.label[props.locale] ?? labels.rawPreview}</h2>
        </div><span className="explorer-entry-count" role="status">{count}</span></div>
        <EntryList props={props} copy={copy} />
        {entries.length < matchingCount && <button type="button" className="workbench-button explorer-more"
          data-history-focus-key="explorer-more"
          onClick={() => props.onAction({ type: 'more', docCount: Math.min(navigation.docCount + 48, 10_000) })}>
          {copy.loadMore}
        </button>}
      </section>
      <BrBvEntryDetails props={props} copy={copy} />
    </div>}
  </>
}
