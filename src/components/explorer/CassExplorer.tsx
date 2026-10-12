import type { ReactNode } from 'react'
import { CommandBlock } from '../CommandBlock'
import { downloadOriginalJson } from '../../data/loadExplorer'
import { resolveJsonPointer } from '../../data/explorerAdapters'
import type {
  CassArgumentDetail,
  CassCommandDetail,
  ExplorerEntry,
  JsonValue,
  Presence,
} from '../../types/explorer'
import type { DatasetViewProps } from '../ExplorerDetails'

const COPY = {
  de: {
    select: 'Eintrag öffnen', commandCount: '{shown} von {total} Befehlen', argumentCount: '{count} Argumente',
    totalCounts: '{commands} Befehle · {arguments} Argumente', argumentMatches: '{count} Argumente passen zu Suche und Filtern',
    command: 'Befehl', description: 'Beschreibung', hasJson: 'JSON-Ausgabe im Snapshot', yes: 'Ja', no: 'Nein',
    arguments: 'Argumente dieses Befehls', noArguments: 'Für diesen Befehl sind keine Argumente dokumentiert.',
    noArgumentMatches: 'Keine Argumente passen zu Suche und Filtern.', argumentType: 'Argumenttyp',
    required: 'Pflichtargument', optional: 'Optional', option: 'Option', flag: 'Flag', positional: 'Positionales Argument',
    valueType: 'Werttyp', defaultValue: 'Standardwert', enumValues: 'Dokumentierte Enumwerte',
    repeatable: 'Wiederholbar', short: 'Kurzform', missing: 'Im Snapshot nicht vorhanden',
    explicitNull: 'Im Snapshot explizit null', notDocumented: 'Nicht dokumentiert',
    parentCommand: 'Argument gehört zu', backToCommand: 'Zum Befehl', commandArguments: '{count} Argumente',
    entryCount: '{shown} von {total} Einträgen', matches: '{shown} von {total} Treffern',
    noSection: 'Dieser Bereich enthält keine Einträge.', noResults: 'Keine Einträge passen zu Suche und Filtern.',
    noSource: 'Diese Quelle enthält keine lesbaren Einträge.', chooseEntry: 'Wähle einen Eintrag aus der Liste.',
    more: 'Weitere Einträge laden', moreArguments: 'Weitere Argumente laden',
    filename: 'Datei', pointer: 'Quellpointer', snapshotValue: 'Snapshotwert',
    rawPreview: 'JSON-Vorschau', sourceJson: 'Originales JSON aus dem Snapshot', download: 'Originaldatei herunterladen',
    limited: 'Die Vorschau endet nach 20.000 Zeichen. Der Download enthält die vollständige Originaldatei.',
    version: 'Version', contract: 'Vertrag', generatedAt: 'Erstellt', digest: 'SHA-256', bytes: 'Bytes',
    workflowCommands: 'Im Workflow dokumentierte Aufrufe', workflow: 'Workflow',
    enumDoesNotCreateValue: 'Enumwerte bleiben Quellmetadaten und erzeugen keinen Befehlsparameter.',
  },
  en: {
    select: 'Open entry', commandCount: '{shown} of {total} commands', argumentCount: '{count} arguments',
    totalCounts: '{commands} commands · {arguments} arguments', argumentMatches: '{count} arguments match search and filters',
    command: 'Command', description: 'Description', hasJson: 'JSON output in snapshot', yes: 'Yes', no: 'No',
    arguments: 'Arguments for this command', noArguments: 'This command has no documented arguments.',
    noArgumentMatches: 'No arguments match this search and filter selection.', argumentType: 'Argument type',
    required: 'Required argument', optional: 'Optional', option: 'Option', flag: 'Flag', positional: 'Positional argument',
    valueType: 'Value type', defaultValue: 'Default value', enumValues: 'Documented enum values',
    repeatable: 'Repeatable', short: 'Short form', missing: 'Not present in this snapshot',
    explicitNull: 'Explicitly null in this snapshot', notDocumented: 'Not documented',
    parentCommand: 'Argument belongs to', backToCommand: 'Open command', commandArguments: '{count} arguments',
    entryCount: '{shown} of {total} entries', matches: '{shown} of {total} matches',
    noSection: 'This section contains no entries.', noResults: 'No entries match this search and filter selection.',
    noSource: 'This source contains no readable entries.', chooseEntry: 'Choose an entry from the list.',
    more: 'Load more entries', moreArguments: 'Load more arguments',
    filename: 'File', pointer: 'Source pointer', snapshotValue: 'Snapshot value',
    rawPreview: 'JSON preview', sourceJson: 'Original JSON from the snapshot', download: 'Download original file',
    limited: 'The preview ends after 20,000 characters. The download contains the complete original file.',
    version: 'Version', contract: 'Contract', generatedAt: 'Generated', digest: 'SHA-256', bytes: 'Bytes',
    workflowCommands: 'Invocations documented by this workflow', workflow: 'Workflow',
    enumDoesNotCreateValue: 'Enum values remain source metadata and do not create a command parameter.',
  },
} as const

type Copy = { [Key in keyof typeof COPY.de]: string }
type Locale = DatasetViewProps['locale']

function jsonText(value: JsonValue): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

function presenceValue<T>(presence: Presence<T>, copy: Copy, render: (value: T) => ReactNode): ReactNode {
  if (presence.state === 'missing') return copy.missing
  if (presence.state === 'null') return copy.explicitNull
  return render(presence.value)
}

function jsonPresence<T extends JsonValue>(presence: Presence<T>, copy: Copy): ReactNode {
  return presenceValue(presence, copy, (value) => <code>{jsonText(value)}</code>)
}

function localizedType(type: CassArgumentDetail['argType'], copy: Copy): string {
  if (type === 'flag') return copy.flag
  if (type === 'option') return copy.option
  return copy.positional
}

function matchesQuery(entry: ExplorerEntry, query: string, locale: Locale): boolean {
  const needle = query.trim().toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US')
  if (!needle) return true
  return `${entry.title} ${entry.searchText} ${entry.origin.pointer}`
    .toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-US').includes(needle)
}

function argumentMatches(entry: ExplorerEntry, props: DatasetViewProps): boolean {
  if (entry.detail.kind !== 'cass-argument') return false
  const { detail } = entry
  const type = props.navigation.argType
  if (['option', 'flag', 'positional'].includes(type) && detail.argType !== type) return false
  const required = props.navigation.argRequired
  if (required === 'yes' && !detail.required) return false
  if (required === 'no' && detail.required) return false
  return matchesQuery(entry, props.navigation.docQ, props.locale)
}

function commandMatches(entry: ExplorerEntry, props: DatasetViewProps): boolean {
  if (entry.detail.kind !== 'cass-command') return false
  const jsonFilter = props.navigation.jsonOutput
  if (jsonFilter === 'yes' && !entry.detail.hasJsonOutput) return false
  if (jsonFilter === 'no' && entry.detail.hasJsonOutput) return false
  return matchesQuery(entry, props.navigation.docQ, props.locale)
}

function sourcePointer(entry: ExplorerEntry): ReactNode {
  return <code>{entry.origin.filename}{entry.origin.pointer || '/'}</code>
}

function summary(entry: ExplorerEntry): string {
  const detail = entry.detail
  if (detail.kind === 'cass-command' || detail.kind === 'cass-argument') return detail.description
  if (detail.kind === 'structured') {
    for (const key of ['intent', 'description', 'behavior', 'wrong', 'name', 'code']) {
      const row = detail.rows.find((candidate) => candidate.label === key)
      if (row?.value.state === 'value' && typeof row.value.value === 'string') return row.value.value
    }
    const first = detail.rows.find((candidate) => candidate.value.state === 'value')
    if (first?.value.state === 'value') return `${first.label}: ${jsonText(first.value.value)}`
  }
  return entry.searchText
}

function DetailsList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <dl className="explorer-provenance">
    {rows.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
  </dl>
}

function EntryButton({ entry, selected, props, copy, badges = [] }: {
  entry: ExplorerEntry
  selected: boolean
  props: DatasetViewProps
  copy: Copy
  badges?: string[]
}) {
  return <li>
    <button type="button" className="explorer-entry-button" aria-current={selected ? 'true' : undefined}
      aria-label={`${entry.title}, ${copy.select}`} data-history-focus-key={`explorer-entry:${entry.id}`}
      onClick={() => props.onAction({ type: 'entry', entryId: entry.id })}>
      <span className="explorer-entry-title">{entry.title}</span>
      {sourcePointer(entry)}
      <span className="explorer-entry-summary">{summary(entry)}</span>
    </button>
    {badges.length > 0 && <ul className="tag-list" aria-label={copy.argumentType}>{badges.map((badge) => <li key={badge}>{badge}</li>)}</ul>}
  </li>
}

function commandEntry(entry: ExplorerEntry): entry is ExplorerEntry & { detail: CassCommandDetail } {
  return entry.detail.kind === 'cass-command'
}

function argumentEntry(entry: ExplorerEntry | undefined): entry is ExplorerEntry & { detail: CassArgumentDetail } {
  return entry?.detail.kind === 'cass-argument'
}

function argumentBadges(detail: CassArgumentDetail, copy: Copy): string[] {
  return [localizedType(detail.argType, copy), detail.required ? copy.required : copy.optional]
}

function ArgumentFields({ detail, copy }: { detail: CassArgumentDetail; copy: Copy }) {
  return <>
    <DetailsList rows={[
      { label: copy.description, value: detail.description },
      { label: copy.argumentType, value: <span className="category-label">{localizedType(detail.argType, copy)}</span> },
      { label: copy.required, value: detail.required ? copy.yes : copy.no },
      { label: copy.short, value: presenceValue(detail.short, copy, (value) => <code>{value}</code>) },
      { label: copy.valueType, value: presenceValue(detail.valueType, copy, (value) => <code>{value}</code>) },
      { label: copy.defaultValue, value: jsonPresence(detail.defaultValue, copy) },
      { label: copy.enumValues, value: jsonPresence(detail.enumValues, copy) },
      { label: copy.repeatable, value: presenceValue(detail.repeatable, copy, (value) => value ? copy.yes : copy.no) },
    ]} />
    {detail.argType === 'flag' && detail.enumValues.state === 'value' && detail.enumValues.value.some((value) => value === 'true' || value === true)
      && <p className="notice notice-warning">{copy.enumDoesNotCreateValue}</p>}
  </>
}

function StructuredFields({ entry, copy }: { entry: ExplorerEntry; copy: Copy }) {
  if (entry.detail.kind !== 'structured') return null
  const rows = entry.detail.rows.map(({ label, value }) => ({
    label,
    value: presenceValue(value, copy, (item) => <code>{typeof item === 'string' ? item : jsonText(item)}</code>),
  }))
  return <>
    {rows.length > 0 && <DetailsList rows={rows} />}
    {entry.detail.copyCommands.length > 0 && <section>
      <h3>{copy.workflowCommands}</h3>
      {entry.detail.copyCommands.map((command, index) => <CommandBlock key={`${index}:${command}`} command={command} />)}
    </section>}
    <details className="explorer-json-preview">
      <summary>{copy.sourceJson}</summary>
      <pre className="explorer-raw-preview">{jsonText(entry.detail.sourceValue)}</pre>
    </details>
  </>
}

function CassDetails({ props, copy, selectedCommand, selectedArgument }: {
  props: DatasetViewProps
  copy: Copy
  selectedCommand: ExplorerEntry | null
  selectedArgument: ExplorerEntry | null
}) {
  const { selectedEntry, manifestEntry, sourceValue, sourceBytes, locale, labels, dataset, onAction } = props
  const shownEntry = selectedEntry
  const parentCommand = selectedCommand
  const commandDetail = parentCommand?.detail.kind === 'cass-command' ? parentCommand.detail : null
  const argumentDetail = selectedArgument?.detail.kind === 'cass-argument' ? selectedArgument.detail : null
  const pointed = shownEntry ? resolveJsonPointer(sourceValue, shownEntry.origin.pointer) : null
  const rawValue = pointed?.state === 'value' ? pointed.value : sourceValue
  const rawText = jsonText(rawValue)
  const metadata = manifestEntry.snapshot
  const snapshotRows = [
    { label: labels.filename, value: <code>{manifestEntry.filename}</code> },
    { label: copy.digest, value: <code>{manifestEntry.sha256}</code> },
    { label: copy.bytes, value: manifestEntry.bytes.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US') },
    ...(metadata.version.state === 'value' ? [{ label: copy.version, value: <code>{metadata.version.value}</code> }] : []),
    ...(metadata.contract.state === 'value' ? [{ label: copy.contract, value: <code>{metadata.contract.value}</code> }] : []),
    ...(metadata.generatedAt.state === 'value' ? [{ label: copy.generatedAt, value: <code>{metadata.generatedAt.value}</code> }] : []),
    ...(shownEntry ? [{ label: copy.pointer, value: sourcePointer(shownEntry) }] : []),
    ...(shownEntry && (rawValue === null || typeof rawValue !== 'object')
      ? [{ label: copy.snapshotValue, value: <code>{jsonText(rawValue)}</code> }]
      : []),
  ]
  const allArguments = commandDetail?.argumentEntryIds.map((id) => dataset.entries.find((entry) => entry.id === id))
    .filter(argumentEntry) ?? []
  const shownArguments = allArguments.filter((entry) => argumentMatches(entry, props)).slice(0, props.navigation.docCount)
  const argumentFilterActive = props.navigation.argType !== 'all' || props.navigation.argRequired !== 'all'
  const argumentMatchesCount = dataset.entries.filter((entry) => entry.detail.kind === 'cass-argument' && argumentMatches(entry, props)).length

  let detailContent: ReactNode
  if (argumentDetail) {
    detailContent = <ArgumentFields detail={argumentDetail} copy={copy} />
  } else if (commandDetail && parentCommand) {
    detailContent = <>
      <DetailsList rows={[
        { label: copy.description, value: commandDetail.description },
        { label: copy.hasJson, value: commandDetail.hasJsonOutput ? copy.yes : copy.no },
        { label: copy.arguments, value: copy.commandArguments.replace('{count}', String(commandDetail.argumentEntryIds.length)) },
      ]} />
      <section aria-label={copy.arguments}>
        <div className="explorer-reader-heading"><h3>{copy.arguments}</h3>
          <span className="explorer-entry-count" role="status">{copy.argumentCount.replace('{count}', String(allArguments.length))}</span>
        </div>
        {allArguments.length === 0 ? <p>{copy.noArguments}</p>
          : shownArguments.length === 0 ? <p>{copy.noArgumentMatches}</p>
            : <ol className="explorer-entry-list">
              {shownArguments.map((entry) => <EntryButton key={entry.id} entry={entry} selected={selectedEntry?.id === entry.id}
                props={props} copy={copy} badges={argumentBadges(entry.detail, copy)} />)}
            </ol>}
        {shownArguments.length < allArguments.filter((entry) => argumentMatches(entry, props)).length && <button type="button"
          className="workbench-button explorer-more" onClick={() => props.onAction({ type: 'more', docCount: props.navigation.docCount + 48 })}>
          {copy.moreArguments}
        </button>}
      </section>
    </>
  } else if (shownEntry?.detail.kind === 'structured') {
    detailContent = <StructuredFields entry={shownEntry} copy={copy} />
  } else if (shownEntry?.detail.kind === 'cass-argument') {
    detailContent = <ArgumentFields detail={shownEntry.detail} copy={copy} />
  } else if (shownEntry?.detail.kind === 'cass-command') {
    detailContent = <DetailsList rows={[
      { label: copy.description, value: shownEntry.detail.description },
      { label: copy.hasJson, value: shownEntry.detail.hasJsonOutput ? copy.yes : copy.no },
    ]} />
  } else if (shownEntry?.detail.kind === 'generic') {
    detailContent = <p>{shownEntry.searchText}</p>
  } else {
    detailContent = <p className="empty-state">{copy.chooseEntry}</p>
  }

  return <aside className="explorer-details" aria-label={shownEntry?.title ?? manifestEntry.filename}>
    <header className="explorer-details-header"><div>
      <span className="section-eyebrow">{shownEntry ? copy.pointer : labels.filename}</span>
      <h2 tabIndex={-1} data-navigation-entry-heading
        data-history-focus-key={shownEntry ? `explorer-entry:${shownEntry.id}` : 'explorer-source'}>
        {shownEntry?.title ?? labels.rawPreview}
      </h2>
    </div>
      {shownEntry && <button type="button" className="quiet-button" onClick={() => onAction({ type: 'close-entry' })}>{labels.closeEntry}</button>}
    </header>
    {argumentDetail && parentCommand && <p className="explorer-entry-origin">
      {copy.parentCommand}: <button type="button" className="quiet-button" onClick={() => onAction({ type: 'entry', entryId: parentCommand.id })}>
        {parentCommand.title}
      </button>
    </p>}
    {shownEntry && <p className="explorer-entry-origin">{sourcePointer(shownEntry)}</p>}
    <DetailsList rows={snapshotRows} />
    <div className="explorer-detail-actions">
      <button type="button" className="workbench-button" onClick={() => downloadOriginalJson(sourceBytes, manifestEntry.filename, {
        document, urls: URL, schedule: (callback) => globalThis.setTimeout(callback, 0),
      })}>{copy.download}</button>
    </div>
    {detailContent}
    {!argumentDetail && commandDetail && argumentFilterActive && <p className="explorer-entry-count" role="status">
      {copy.argumentMatches.replace('{count}', String(argumentMatchesCount))}
    </p>}
    <section className="explorer-json-preview"><h3>{labels.rawPreview}</h3>
      {rawText.length > 20_000 && <p className="notice notice-warning">{copy.limited}</p>}
      <pre className="explorer-raw-preview">{rawText.slice(0, 20_000)}</pre>
    </section>
  </aside>
}

function CassExplorerView(props: DatasetViewProps, copy: Copy) {
  const { dataset, section, labels, locale, navigation, selectedEntry } = props
  const isCommandSection = section?.id === 'commands'
  const commandEntries = dataset.entries.filter(commandEntry)
  const argumentsAll = dataset.entries.filter((entry) => entry.detail.kind === 'cass-argument' && entry.parentEntryId)
  const matches = isCommandSection
    ? commandEntries.filter((entry) => commandMatches(entry, props))
    : props.entries
  const visible = isCommandSection ? matches.slice(0, navigation.docCount) : matches
  const selectedCommand = selectedEntry?.detail.kind === 'cass-command' ? selectedEntry
    : selectedEntry?.detail.kind === 'cass-argument' && selectedEntry.parentEntryId
      ? dataset.entries.find((entry) => entry.id === selectedEntry.parentEntryId) ?? null
      : null
  const selectedArgument = selectedEntry?.detail.kind === 'cass-argument' && selectedEntry.parentEntryId ? selectedEntry : null
  const totalLabel = isCommandSection
    ? copy.totalCounts.replace('{commands}', String(commandEntries.length)).replace('{arguments}', String(argumentsAll.length))
    : copy.matches.replace('{shown}', String(visible.length)).replace('{total}', String(props.matchingCount))

  return <>
    {!dataset.entries.length ? <div className="empty-state"><p>{copy.noSource}</p></div> : <div className="explorer-dataset-layout">
      <section className="explorer-reader" aria-label={section?.label[locale] ?? labels.rawPreview}>
        <div className="explorer-reader-heading"><div>
          <span className="section-eyebrow">{labels.sections}</span>
          <h2>{section?.label[locale] ?? labels.rawPreview}</h2>
        </div><span className="explorer-entry-count" role="status">{totalLabel}</span></div>
        {isCommandSection
          ? matches.length === 0 ? <div className="empty-state"><p>{copy.noResults}</p></div>
            : <>
              <p className="explorer-provenance-summary">{copy.commandCount.replace('{shown}', String(visible.length)).replace('{total}', String(matches.length))}</p>
              <ol className="explorer-entry-list">
                {visible.map((entry) => {
                  const detail = entry.detail
                  if (detail.kind !== 'cass-command') return null
                  const active = selectedCommand?.id === entry.id
                  return <EntryButton key={entry.id} entry={entry} selected={active} props={props} copy={copy}
                    badges={[`${copy.commandArguments.replace('{count}', String(detail.argumentEntryIds.length))}`,
                      `${copy.hasJson}: ${detail.hasJsonOutput ? copy.yes : copy.no}`]} />
                })}
              </ol>
              {visible.length < matches.length && <button type="button" className="workbench-button explorer-more"
                data-history-focus-key="explorer-more"
                onClick={() => props.onAction({ type: 'more', docCount: navigation.docCount + 48 })}>{copy.more}</button>}
            </>
          : props.entries.length === 0 ? <div className="empty-state"><p>{dataset.entries.some((entry) => entry.sectionId === section?.id)
            ? copy.noResults : copy.noSection}</p></div>
            : <ol className="explorer-entry-list">
              {visible.map((entry) => <EntryButton key={entry.id} entry={entry} selected={selectedEntry?.id === entry.id}
                props={props} copy={copy} badges={entry.detail.kind === 'cass-argument' ? argumentBadges(entry.detail, copy) : []} />)}
            </ol>}
      </section>
      <CassDetails props={props} copy={copy} selectedCommand={selectedCommand} selectedArgument={selectedArgument} />
    </div>}
  </>
}

export function CassExplorer(props: DatasetViewProps) {
  return CassExplorerView(props, COPY[props.locale])
}
