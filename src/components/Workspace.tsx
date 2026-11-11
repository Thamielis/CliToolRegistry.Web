import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { TOOL_CATEGORIES, TOOL_PLATFORMS, validateProfileCatalog, validateToolDefinition, validateToolReferences } from '../data/schemaValidation'
import {
  combineWorkspaceTools, definitionForTool, loadWorkspace, saveWorkspace,
  type WorkspaceCollection, type WorkspaceState, type WorkspaceTool,
} from '../data/workspace'
import type { CliTool, CliToolDefinition, CliToolProfileCatalog, CliToolProfileDefinition, Locale } from '../types/app'

const COPY = {
  de: {
    title: 'Arbeitsbereich', subtitle: 'Lokale Ergänzungen, Korrekturen und Sammlungen. Sie bleiben in diesem Browser, bis du sie herunterlädst.',
    local: 'Lokal', addExisting: 'Katalogwerkzeug ergänzen', chooseTool: 'Werkzeug auswählen', addExistingButton: 'Kopie bearbeiten', newTool: 'Neues Werkzeug',
    import: 'Datei importieren', export: 'Arbeitsbereich herunterladen', downloadTool: 'Definition laden', edit: 'Bearbeiten', remove: 'Entfernen',
    localEdits: 'Werkzeuge im Arbeitsbereich', noEdits: 'Noch keine lokalen Ergänzungen.', base: 'Ergänzung', custom: 'Neu', invalid: 'Prüfen', valid: 'Schema gültig', issueDetails: 'Prüfhinweise anzeigen',
    collections: 'Sammlungen', collectionName: 'Name', collectionDescription: 'Beschreibung', createCollection: 'Sammlung erstellen', noCollections: 'Erstelle eine Sammlung für häufig gemeinsam verwendete Werkzeuge.', downloadProfile: 'Als Registry-Profil laden',
    addToCollection: 'Werkzeug hinzufügen', emptyCollection: 'Noch keine Werkzeuge ausgewählt.', removeTool: 'Werkzeug entfernen',
    editorNew: 'Werkzeug anlegen', editorEdit: 'Werkzeug bearbeiten', id: 'Registry-ID', name: 'Name', description: 'Beschreibung', category: 'Schema-Kategorie', tier: 'Stufe', command: 'Aufruf', platforms: 'Plattformen', advanced: 'Weitere Schemafelder (JSON)', advancedHint: 'Installationsrezepte, Prüfungen, Abhängigkeiten und weitere Registry-Felder kannst du hier ergänzen oder ändern.',
    save: 'Änderungen speichern', cancel: 'Abbrechen', schemaIssues: 'Schema-Hinweise', invalidJson: 'Die JSON-Definition ist ungültig.', duplicateId: 'Diese ID ist bereits vorhanden.', required: 'Bitte fülle Name, Beschreibung, ID, Kategorie und mindestens eine Plattform aus.',
    importPreview: 'Importvorschau', importTools: 'Werkzeugdefinitionen', importProfiles: 'Profile', confirmImport: 'Import übernehmen', discard: 'Verwerfen',
    restoreImport: 'Wiederherstellen und übernehmen',
    importError: 'Die Datei enthält keinen gültigen Tool-Katalog, kein Profilpaket und keine einzelne gültige Werkzeugdefinition.', importUnsupported: 'Dateityp wird nicht unterstützt.',
    saved: 'Lokal gespeichert', saveFailed: 'Der Browser konnte nicht speichern. Lade zuerst eine Sicherung herunter oder gib Speicherplatz frei.',
    corrupt: 'Gespeicherte lokale Daten sind beschädigt. Bestehende Daten wurden nicht überschrieben.', storageUnavailable: 'Lokaler Browserspeicher ist nicht verfügbar. Änderungen können nicht gespeichert werden.',
    recover: 'Beschädigte Daten herunterladen', noStorageData: 'Keine Sicherung vorhanden.', customKind: 'Eigenes Werkzeug', overrideKind: 'Katalog-Ergänzung',
    selectCollectionTool: 'Werkzeug für die Sammlung', migrateNote: 'Ein älterer lokaler Arbeitsbereich wurde erkannt. Er wird beim nächsten Speichern ergänzt; die ursprünglichen Daten bleiben als Sicherung erhalten.',
    schemaValidHint: 'Die Definition entspricht dem CliToolRegistry-Schema.',
  },
  en: {
    title: 'Workspace', subtitle: 'Local additions, corrections, and collections. They stay in this browser until you download them.',
    local: 'Local', addExisting: 'Extend a catalog tool', chooseTool: 'Choose a tool', addExistingButton: 'Edit a local copy', newTool: 'New tool',
    import: 'Import file', export: 'Download workspace', downloadTool: 'Download definition', edit: 'Edit', remove: 'Remove',
    localEdits: 'Workspace tools', noEdits: 'No local additions yet.', base: 'Correction', custom: 'New', invalid: 'Review', valid: 'Schema valid', issueDetails: 'Show validation details',
    collections: 'Collections', collectionName: 'Name', collectionDescription: 'Description', createCollection: 'Create collection', noCollections: 'Create a collection for tools you use together.', downloadProfile: 'Download as registry profile',
    addToCollection: 'Add tool', emptyCollection: 'No tools selected yet.', removeTool: 'Remove tool',
    editorNew: 'Create tool', editorEdit: 'Edit tool', id: 'Registry ID', name: 'Name', description: 'Description', category: 'Schema category', tier: 'Tier', command: 'Invocation', platforms: 'Platforms', advanced: 'Additional schema fields (JSON)', advancedHint: 'Add or edit install recipes, checks, dependencies, and other Registry fields here.',
    save: 'Save changes', cancel: 'Cancel', schemaIssues: 'Schema issues', invalidJson: 'The JSON definition is invalid.', duplicateId: 'This ID is already in use.', required: 'Enter an ID, name, description, category, and at least one platform.',
    importPreview: 'Import preview', importTools: 'Tool definitions', importProfiles: 'Profiles', confirmImport: 'Apply import', discard: 'Discard',
    restoreImport: 'Restore and apply',
    importError: 'The file is not a valid tool catalog, profile bundle, or single tool definition.', importUnsupported: 'This file type is not supported.',
    saved: 'Saved in this browser', saveFailed: 'The browser could not save. Download a backup or free browser storage first.',
    corrupt: 'Saved local data is damaged. Existing data was not overwritten.', storageUnavailable: 'Browser storage is unavailable. Changes cannot be saved.',
    recover: 'Download damaged data', noStorageData: 'No backup is available.', customKind: 'Custom tool', overrideKind: 'Catalog correction',
    selectCollectionTool: 'Tool to add', migrateNote: 'An older local workspace was found. It will be migrated on the next save; the original data stays as a backup.',
    schemaValidHint: 'The definition matches the CliToolRegistry schema.',
  },
} as const

const COMMON_TOOL_FIELDS = new Set(['id', 'name', 'description', 'category', 'tier', 'command', 'platforms'])

function advancedFields(definition: CliToolDefinition): Record<string, unknown> {
  return Object.fromEntries(Object.entries(definition).filter(([key]) => !COMMON_TOOL_FIELDS.has(key)))
}

type ImportStage = { kind: 'tools'; value: CliToolDefinition[]; name: string } |
  { kind: 'profiles'; value: CliToolProfileCatalog; name: string } | { kind: 'workspace'; value: WorkspaceState; name: string }

function download(name: string, contents: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mime};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function stageImport(value: unknown, name: string): ImportStage | null {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'version' in value && value.version === 2 &&
    Array.isArray((value as WorkspaceState).tools) && Array.isArray((value as WorkspaceState).collections)) {
    const bundle = value as WorkspaceState
    if (bundle.tools.every((tool) => tool && typeof tool.key === 'string' && typeof tool.definition === 'object') &&
      bundle.collections.every((collection) => collection && typeof collection.id === 'string' && Array.isArray(collection.toolIds)) &&
      (bundle.profiles === undefined || Array.isArray(bundle.profiles))) return {
      kind: 'workspace', value: { ...bundle, profiles: bundle.profiles ?? [] }, name,
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'profiles' in value) {
    if (validateProfileCatalog(value).state === 'valid') return { kind: 'profiles', value: value as CliToolProfileCatalog, name }
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'tools' in value) {
    const catalog = value as { category?: unknown; tools?: unknown }
    const structurallyReadable = Array.isArray(catalog.tools) && catalog.tools.every((tool) =>
      tool && typeof tool === 'object' && !Array.isArray(tool) &&
      ['id', 'name', 'description', 'category'].every((key) =>
        typeof (tool as Record<string, unknown>)[key] === 'string' && (tool as Record<string, string>)[key].length > 0) &&
      Array.isArray((tool as Record<string, unknown>).platforms))
    if (structurallyReadable) {
      return { kind: 'tools', value: catalog.tools as CliToolDefinition[], name }
    }
  }
  if (validateToolDefinition(value).state === 'valid') return { kind: 'tools', value: [value as CliToolDefinition], name }
  return null
}

function ToolEditor({ initial, catalogTools, allTools, locale, onClose, onSave }: {
  initial: WorkspaceTool | null
  catalogTools: readonly CliTool[]
  allTools: readonly CliTool[]
  locale: Locale
  onClose: () => void
  onSave: (tool: WorkspaceTool) => void
}) {
  const copy = COPY[locale]
  const dialog = useRef<HTMLDialogElement>(null)
  const base = initial?.definition ?? ({} as CliToolDefinition)
  const [id, setId] = useState(base.id ?? 'new-tool')
  const [name, setName] = useState(base.name ?? '')
  const [description, setDescription] = useState(base.description ?? '')
  const [category, setCategory] = useState(base.category ?? 'cli')
  const [tier, setTier] = useState(base.tier ?? '')
  const [command, setCommand] = useState(typeof base.command === 'string' ? base.command : '')
  const [platforms, setPlatforms] = useState<string[]>(base.platforms ?? ['windows'])
  const [json, setJson] = useState(() => JSON.stringify(advancedFields(base), null, 2))
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])
  const [showRaw, setShowRaw] = useState(false)
  const isEditing = initial !== null

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let parsed: unknown
    try { parsed = JSON.parse(json) } catch { setError(copy.invalidJson); setIssues([]); return }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { setError(copy.invalidJson); return }
    const definition = {
      ...(parsed as Record<string, unknown>),
      id: initial?.kind === 'override' ? initial.baseId : id.trim(),
      name: name.trim(), description: description.trim(), category,
      ...(tier.trim() ? { tier: tier.trim() } : { tier: undefined }),
      command: command.trim() || null,
      platforms: [...new Set(platforms)],
    } as CliToolDefinition
    const schema = validateToolDefinition(definition)
    const refs = validateToolReferences(definition as CliTool, [...catalogTools, ...allTools])
    const reviewIssues = [...schema.errors.map(({ path, message }) => ({ path, message })), ...refs]
    if (reviewIssues.length > 0) { setError('schema'); setIssues(reviewIssues) }
    const duplicate = allTools.some((tool) => tool.id === definition.id) &&
      !(initial?.kind === 'override' && initial.baseId === definition.id) &&
      !(initial?.kind === 'custom' && initial.definition.id === definition.id)
    if (duplicate) { setError(copy.duplicateId); setIssues([]); return }
    const kind = initial?.kind ?? (catalogTools.some((tool) => tool.id === definition.id) ? 'override' : 'custom')
    const baseId = initial?.baseId ?? (kind === 'override' ? definition.id : undefined)
    onSave({ key: initial?.key ?? `${kind}:${definition.id}`, kind, ...(baseId ? { baseId } : {}), definition,
      needsReview: schema.state !== 'valid' || refs.length > 0 })
  }

  const togglePlatform = (value: string) => setPlatforms((current) => current.includes(value)
    ? current.filter((item) => item !== value) : [...current, value])

  return <dialog className="workspace-dialog" ref={dialog} aria-labelledby="workspace-tool-editor-title"
    onCancel={(event) => { event.preventDefault(); onClose() }} onClose={onClose}>
    <form className="workspace-editor" onSubmit={submit}>
      <header className="workspace-dialog-header"><h2 id="workspace-tool-editor-title">{isEditing ? copy.editorEdit : copy.editorNew}</h2>
        <button type="button" className="icon-control" aria-label={copy.cancel} onClick={() => dialog.current?.close()}>×</button></header>
      {error && <p className="workspace-error" role="alert">{error === 'schema' ? copy.schemaIssues : error}</p>}
      {error === 'schema' && issues.length > 0 && <ul className="workspace-issue-list">{issues.map((issue, index) =>
        <li key={`${issue.path}:${index}`}><code>{issue.path}</code> {issue.message}</li>)}</ul>}
      <div className="workspace-form-grid">
        <label className="workspace-field"><span>{copy.id}</span><input required pattern="[a-z0-9]+(?:[-_][a-z0-9]+)*" value={id}
          readOnly={isEditing} onChange={(event) => setId(slug(event.target.value))} /></label>
        <label className="workspace-field"><span>{copy.name}</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="workspace-field workspace-field-wide"><span>{copy.description}</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="workspace-field"><span>{copy.category}</span><select value={category} onChange={(event) => setCategory(event.target.value)}>
          {TOOL_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="workspace-field"><span>{copy.tier}</span><input value={tier ?? ''} onChange={(event) => setTier(event.target.value)} /></label>
        <label className="workspace-field workspace-field-wide"><span>{copy.command}</span><input value={command} onChange={(event) => setCommand(event.target.value)} /></label>
        <fieldset className="workspace-platforms workspace-field-wide"><legend>{copy.platforms}</legend>
          {TOOL_PLATFORMS.map((platform) => <label key={platform}><input type="checkbox" checked={platforms.includes(platform)} onChange={() => togglePlatform(platform)} /> {platform}</label>)}</fieldset>
      </div>
      <details className="workspace-advanced" open={showRaw} onToggle={(event) => setShowRaw(event.currentTarget.open)}>
        <summary>{copy.advanced}</summary><p>{copy.advancedHint}</p>
        <textarea aria-label={copy.advanced} spellCheck={false} rows={14} value={json} onChange={(event) => setJson(event.target.value)} />
      </details>
      <footer className="workspace-dialog-actions"><button type="button" className="quiet-button" onClick={() => dialog.current?.close()}>{copy.cancel}</button>
        <button type="submit" className="workbench-button primary">{copy.save}</button></footer>
    </form>
  </dialog>
}

export function Workspace({ catalogTools, locale }: { catalogTools: readonly CliTool[]; locale: Locale }) {
  const copy = COPY[locale]
  const [loaded] = useState(() => loadWorkspace(catalogTools))
  const [workspace, setWorkspace] = useState<WorkspaceState>(loaded.state)
  const [blocked, setBlocked] = useState(loaded.blocked)
  const [saveError, setSaveError] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [selectedForCollection, setSelectedForCollection] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [editor, setEditor] = useState<WorkspaceTool | null | undefined>(undefined)
  const [stage, setStage] = useState<ImportStage | null>(null)
  const [importError, setImportError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const effectiveTools = useMemo(() => combineWorkspaceTools(catalogTools, workspace.tools), [catalogTools, workspace.tools])
  const copyById = useMemo(() => new Map(catalogTools.map((tool) => [tool.id, tool])), [catalogTools])
  const copyName = (id: string) => effectiveTools.find((tool) => tool.id === id)?.name ?? id

  const commit = (next: WorkspaceState, allowRecovery = false): boolean => {
    if (blocked && !allowRecovery) return false
    if (!saveWorkspace(next)) { setSaveError(true); return false }
    setWorkspace(next)
    setBlocked(false)
    setSaveError(false)
    return true
  }
  const saveTool = (tool: WorkspaceTool) => {
    const tools = [...workspace.tools.filter((item) => item.key !== tool.key &&
      !(tool.kind === 'override' && item.baseId === tool.baseId)), tool]
    if (commit({ ...workspace, tools })) setEditor(undefined)
  }
  const addCatalogCopy = () => {
    const tool = copyById.get(selectedCatalogId)
    if (!tool || workspace.tools.some((item) => item.kind === 'override' && item.baseId === tool.id)) return
    setEditor({ key: `override:${tool.id}`, kind: 'override', baseId: tool.id, definition: definitionForTool(tool) })
  }
  const addCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newCollectionName.trim()
    if (!name) return
    const id = `${slug(name) || 'collection'}-${Date.now().toString(36)}`
    commit({ ...workspace, collections: [...workspace.collections, { id, name, description: newCollectionDescription.trim(), toolIds: [] }] })
    setNewCollectionName(''); setNewCollectionDescription('')
  }
  const addToolToCollection = (collection: WorkspaceCollection) => {
    if (!selectedForCollection || collection.toolIds.includes(selectedForCollection)) return
    commit({ ...workspace, collections: workspace.collections.map((item) => item.id === collection.id
      ? { ...item, toolIds: [...item.toolIds, selectedForCollection] } : item) })
  }
  const removeTool = (tool: WorkspaceTool) => {
    const id = tool.kind === 'override' ? tool.baseId : tool.definition.id
    if (!id) return
    commit({ ...workspace, tools: workspace.tools.filter((item) => item.key !== tool.key),
      collections: workspace.collections.map((item) => ({ ...item, toolIds: item.toolIds.filter((toolId) => toolId !== id) })) })
  }
  const downloadCollectionProfile = (collection: WorkspaceCollection) => {
    const profileId = slug(collection.id) || 'custom-profile'
    const profile: CliToolProfileDefinition = {
      description: collection.description || collection.name,
      tools: { required: collection.toolIds, recommended: [] },
    }
    const value: CliToolProfileCatalog = { schemaVersion: '1.1', profiles: { [profileId]: profile } }
    if (validateProfileCatalog(value).state === 'valid') download(`${profileId}.profile.yml`, stringifyYaml(value), 'application/yaml')
  }
  const handleFile = async (file: File | undefined) => {
    setStage(null); setImportError('')
    if (!file) return
    if (!/\.(json|ya?ml)$/i.test(file.name)) { setImportError(copy.importUnsupported); return }
    try {
      const stageValue = stageImport(parseYaml(await file.text()), file.name)
      if (!stageValue) setImportError(copy.importError)
      else setStage(stageValue)
    } catch { setImportError(copy.importError) }
  }
  const applyImport = () => {
    if (!stage) return
    let committed = false
    if (stage.kind === 'tools') {
      const current = new Map(workspace.tools.map((tool) => [tool.definition.id, tool]))
      for (const definition of stage.value) {
        const baseId = catalogTools.some((tool) => tool.id === definition.id) ? definition.id : undefined
        const kind = baseId ? 'override' : 'custom'
        const key = baseId ? `override:${baseId}` : `custom:${definition.id}`
        current.set(definition.id, { key, kind, ...(baseId ? { baseId } : {}), definition })
      }
      committed = commit({ ...workspace, tools: [...current.values()] }, blocked)
    } else if (stage.kind === 'profiles') {
      const current = new Map(workspace.profiles.map((profile) => [profile.id, profile]))
      for (const [id, definition] of Object.entries(stage.value.profiles)) current.set(id, { id, definition })
      committed = commit({ ...workspace, profiles: [...current.values()] }, blocked)
    } else {
      const tools = new Map(workspace.tools.map((tool) => [tool.key, tool]))
      for (const tool of stage.value.tools) tools.set(tool.key, tool)
      const collections = new Map(workspace.collections.map((collection) => [collection.id, collection]))
      for (const collection of stage.value.collections) collections.set(collection.id, collection)
      const profiles = new Map(workspace.profiles.map((profile) => [profile.id, profile]))
      for (const profile of stage.value.profiles ?? []) profiles.set(profile.id, profile)
      committed = commit({ version: 2, tools: [...tools.values()], collections: [...collections.values()], profiles: [...profiles.values()] }, blocked)
    }
    if (!committed) return
    setStage(null); if (fileInput.current) fileInput.current.value = ''
  }

  return <section className="workspace-screen">
    <header className="workspace-page-heading"><div><span className="catalog-eyebrow">{copy.local}</span><h1 id="screen-heading" tabIndex={-1}>{copy.title}</h1><p>{copy.subtitle}</p></div>
      <button type="button" className="workbench-button primary" disabled={blocked} onClick={() => setEditor(null)}>＋ {copy.newTool}</button></header>
    {loaded.migrated && <p className="workspace-notice">{copy.migrateNote}</p>}
    {blocked && <div className="workspace-notice workspace-error" role="alert"><p>{loaded.error === 'unavailable' ? copy.storageUnavailable : copy.corrupt}</p>
      {loaded.raw && <button type="button" className="quiet-button" onClick={() => download('cli-tool-registry-recovery.json', loaded.raw!)}>{copy.recover}</button>}</div>}
    {saveError && <p className="workspace-error" role="alert">{copy.saveFailed}</p>}
    <div className="workspace-action-row">
      <label className="workspace-field workspace-existing-picker"><span>{copy.addExisting}</span><select value={selectedCatalogId} onChange={(event) => setSelectedCatalogId(event.target.value)}>
        <option value="">{copy.chooseTool}</option>{catalogTools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select></label>
      <button type="button" className="quiet-button" disabled={blocked || !selectedCatalogId || workspace.tools.some((item) => item.baseId === selectedCatalogId)} onClick={addCatalogCopy}>{copy.addExistingButton}</button>
      <input ref={fileInput} className="sr-only" type="file" accept=".json,.yaml,.yml,application/json,text/yaml" onChange={(event) => { void handleFile(event.target.files?.[0]) }} />
      <button type="button" className="quiet-button" onClick={() => fileInput.current?.click()}>{copy.import}</button>
      <button type="button" className="quiet-button" disabled={blocked} onClick={() => download('cli-tool-registry-workspace.json', JSON.stringify(workspace, null, 2))}>{copy.export}</button>
    </div>
    {importError && <p className="workspace-error" role="alert">{importError}</p>}
    {stage && <section className="workspace-import-stage" aria-label={copy.importPreview}><div><strong>{copy.importPreview}</strong><span>{stage.name} · {stage.kind === 'tools' ? `${stage.value.length} ${copy.importTools}` : stage.kind === 'profiles' ? `${Object.keys(stage.value.profiles).length} ${copy.importProfiles}` : `${stage.value.tools.length} ${copy.importTools} · ${stage.value.profiles?.length ?? 0} ${copy.importProfiles}`}</span></div>
      <button type="button" className="quiet-button" onClick={() => setStage(null)}>{copy.discard}</button><button type="button" className="workbench-button primary" onClick={applyImport}>{blocked ? copy.restoreImport : copy.confirmImport}</button></section>}

    <section className="workspace-section" aria-labelledby="workspace-tools-heading"><div className="workspace-section-heading"><h2 id="workspace-tools-heading">{copy.localEdits}</h2><span>{workspace.tools.length}</span></div>
      {workspace.tools.length === 0 ? <p className="workspace-empty">{copy.noEdits}</p> : <ul className="workspace-tool-list">{workspace.tools.map((tool) => {
        const id = tool.kind === 'override' ? tool.baseId ?? tool.definition.id : tool.definition.id
        const schema = validateToolDefinition(tool.definition)
        const references = validateToolReferences(tool.definition as CliTool, effectiveTools)
        const isValid = schema.state === 'valid' && references.length === 0
        const name = tool.kind === 'override' ? copyName(id) : tool.definition.displayName ?? tool.definition.name ?? id
        return <li key={tool.key}><div className="workspace-tool-copy"><strong>{name}</strong><code>{id}</code><span>{tool.kind === 'override' ? copy.overrideKind : copy.customKind}</span>
          {!isValid && <details className="workspace-item-issues"><summary>{copy.issueDetails}</summary><ul className="workspace-issue-list">
            {schema.errors.map((issue, index) => <li key={`schema-${index}`}><code>{issue.path}</code> {issue.message}</li>)}
            {references.map((issue, index) => <li key={`reference-${index}`}><code>{issue.path}</code> {issue.message}</li>)}
          </ul></details>}
        </div>
          <span className={'workspace-validity ' + (isValid ? 'is-valid' : 'is-invalid')}>{isValid ? copy.valid : copy.invalid}</span>
          <button type="button" className="quiet-button" disabled={blocked} onClick={() => setEditor(tool)}>{copy.edit}</button>
          <button type="button" className="quiet-button" disabled={schema.state !== 'valid'} onClick={() => download(`${tool.definition.id}.tool.yml`, stringifyYaml({ category: 'cli', tools: [tool.definition] }), 'application/yaml')}>{copy.downloadTool}</button>
          <button type="button" className="quiet-button danger" disabled={blocked} onClick={() => removeTool(tool)}>{copy.remove}</button></li>
      })}</ul>}
      <p className="workspace-schema-hint">{copy.schemaValidHint}</p>
    </section>

    <section className="workspace-section" aria-labelledby="workspace-collections-heading"><div className="workspace-section-heading"><h2 id="workspace-collections-heading">{copy.collections}</h2><span>{workspace.collections.length}</span></div>
      <form className="workspace-collection-create" onSubmit={addCollection}><label className="workspace-field"><span>{copy.collectionName}</span><input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} required /></label>
        <label className="workspace-field"><span>{copy.collectionDescription}</span><input value={newCollectionDescription} onChange={(event) => setNewCollectionDescription(event.target.value)} /></label>
        <button className="workbench-button" type="submit" disabled={blocked}>{copy.createCollection}</button></form>
      {workspace.collections.length === 0 ? <p className="workspace-empty">{copy.noCollections}</p> : <div className="workspace-collection-list">{workspace.collections.map((collection) => <article className="workspace-collection" key={collection.id}>
        <header><div><h3>{collection.name}</h3>{collection.description && <p>{collection.description}</p>}</div><div className="workspace-collection-actions"><button type="button" className="quiet-button" disabled={!collection.toolIds.length || collection.toolIds.some((id) => !effectiveTools.some((tool) => tool.id === id))} onClick={() => downloadCollectionProfile(collection)}>{copy.downloadProfile}</button><button type="button" className="quiet-button danger" onClick={() => commit({ ...workspace, collections: workspace.collections.filter((item) => item.id !== collection.id) })}>{copy.remove}</button></div></header>
        <div className="workspace-collection-add"><label className="workspace-field"><span>{copy.selectCollectionTool}</span><select value={selectedForCollection} onChange={(event) => setSelectedForCollection(event.target.value)}><option value="">{copy.chooseTool}</option>{effectiveTools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select></label>
          <button type="button" className="quiet-button" disabled={!selectedForCollection || collection.toolIds.includes(selectedForCollection)} onClick={() => addToolToCollection(collection)}>{copy.addToCollection}</button></div>
        {collection.toolIds.length ? <ul>{collection.toolIds.map((id) => <li key={id}><span>{copyName(id)}</span><code>{id}</code><button type="button" className="quiet-button" aria-label={`${copy.removeTool}: ${id}`} onClick={() => commit({ ...workspace, collections: workspace.collections.map((item) => item.id === collection.id ? { ...item, toolIds: item.toolIds.filter((toolId) => toolId !== id) } : item) })}>×</button></li>)}</ul> : <p className="workspace-empty">{copy.emptyCollection}</p>}
      </article>)}</div>}
    </section>
    {editor !== undefined && <ToolEditor initial={editor} catalogTools={catalogTools} allTools={effectiveTools} locale={locale} onClose={() => setEditor(undefined)} onSave={saveTool} />}
  </section>
}
