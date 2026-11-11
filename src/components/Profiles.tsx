import { useMemo, useRef, useState, useEffect, type FormEvent } from 'react'
import { stringify as stringifyYaml } from 'yaml'
import { BUILT_IN_PROFILES, missingToolIds, resolveProfile } from '../data/profiles'
import { TOOL_PLATFORMS, validateProfileCatalog, validateProfileReferences } from '../data/schemaValidation'
import { combineWorkspaceTools, loadWorkspace, saveWorkspace, type WorkspaceProfile, type WorkspaceState } from '../data/workspace'
import type { CliTool, CliToolProfileDefinition, Locale } from '../types/app'

const COPY = {
  de: {
    title: 'Profile', subtitle: 'Stelle ein eigenes Paket aus Registry-Werkzeugen und lokalen Ergänzungen zusammen.',
    create: 'Profil erstellen', clone: 'Als Vorlage übernehmen', edit: 'Bearbeiten', remove: 'Entfernen', builtIn: 'Registry-Profil', local: 'Eigenes Profil',
    noProfiles: 'Es gibt noch keine eigenen Profile.', select: 'Profil auswählen', description: 'Beschreibung', inherits: 'Baut auf Profilen auf',
    tools: 'Werkzeuge', required: 'Erforderlich', recommended: 'Empfohlen', platforms: 'Plattformen', management: 'Verwaltung', individual: 'Einzeln', acfs: 'ACFS',
    searchTools: 'Werkzeuge suchen', choose: 'Nicht enthalten', id: 'Profil-ID', save: 'Profil speichern', cancel: 'Abbrechen',
    preview: 'Konfigurationsvorschau', previewHint: 'Vorschau aus Schema und Katalogdaten. Es werden keine Befehle ausgeführt.',
    inherited: 'Enthaltene Werkzeuge', missingTools: 'Nicht im Katalog', missingProfiles: 'Fehlende Profile', cycle: 'Zyklische Vererbung',
    invalid: 'Profil ist ungültig', valid: 'Schema gültig', export: 'Profile herunterladen', exportError: 'Das Profilpaket enthält ungültige Profile oder Referenzen.',
    noDescription: 'Keine Beschreibung hinterlegt.', inheritHelp: 'Übernimmt erforderliche und empfohlene Werkzeuge der gewählten Profile.',
    schemaErrors: 'Schema- oder Referenzfehler', duplicateId: 'Diese Profil-ID existiert bereits.', platformAny: 'Keine Plattformgrenze', copySuffix: 'eigene',
    storageUnavailable: 'Lokaler Browserspeicher ist nicht verfügbar.', corrupt: 'Gespeicherte lokale Daten sind beschädigt.', saveFailed: 'Der Browser konnte nicht speichern.',
  },
  en: {
    title: 'Profiles', subtitle: 'Assemble a package from registry tools and local additions.',
    create: 'Create profile', clone: 'Use as a template', edit: 'Edit', remove: 'Remove', builtIn: 'Registry profile', local: 'Custom profile',
    noProfiles: 'There are no custom profiles yet.', select: 'Choose a profile', description: 'Description', inherits: 'Inherits from',
    tools: 'Tools', required: 'Required', recommended: 'Recommended', platforms: 'Platforms', management: 'Management', individual: 'Individual', acfs: 'ACFS',
    searchTools: 'Search tools', choose: 'Not included', id: 'Profile ID', save: 'Save profile', cancel: 'Cancel',
    preview: 'Configuration preview', previewHint: 'Preview from schema and catalog data. No commands are executed.',
    inherited: 'Included tools', missingTools: 'Not in catalog', missingProfiles: 'Missing profiles', cycle: 'Inheritance cycle',
    invalid: 'Invalid profile', valid: 'Schema valid', export: 'Download profiles', exportError: 'The profile bundle has schema or reference errors.',
    noDescription: 'No description provided.', inheritHelp: 'Includes required and recommended tools from selected profiles.',
    schemaErrors: 'Schema or reference errors', duplicateId: 'This profile ID is already in use.', platformAny: 'No platform limit', copySuffix: 'custom',
    storageUnavailable: 'Browser storage is unavailable.', corrupt: 'Saved local data is damaged.', saveFailed: 'The browser could not save.',
  },
} as const

function download(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/yaml;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
}

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function ProfileEditor({ initial, locale, profiles, tools, onClose, onSave }: {
  initial: WorkspaceProfile | null
  locale: Locale
  profiles: Record<string, CliToolProfileDefinition>
  tools: readonly CliTool[]
  onClose: () => void
  onSave: (profile: WorkspaceProfile) => void
}) {
  const copy = COPY[locale]
  const dialog = useRef<HTMLDialogElement>(null)
  const [id, setId] = useState(initial?.id ?? '')
  const [description, setDescription] = useState(initial?.definition.description ?? '')
  const [inherits, setInherits] = useState(initial?.definition.inherits ?? [])
  const [platforms, setPlatforms] = useState(initial?.definition.platforms ?? [])
  const [managementMode, setManagementMode] = useState(initial?.definition.managementMode ?? '')
  const [roles, setRoles] = useState<Record<string, 'required' | 'recommended'>>(() => {
    const result: Record<string, 'required' | 'recommended'> = {}
    for (const toolId of initial?.definition.tools?.required ?? []) result[toolId] = 'required'
    for (const toolId of initial?.definition.tools?.recommended ?? []) if (!result[toolId]) result[toolId] = 'recommended'
    return result
  })
  const [toolQuery, setToolQuery] = useState('')
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<string[]>([])
  const editableProfiles = Object.keys(profiles).filter((profileId) => profileId !== initial?.id).sort()
  const visibleTools = tools.filter((tool) => `${tool.name} ${tool.id} ${tool.description}`.toLocaleLowerCase(locale)
    .includes(toolQuery.trim().toLocaleLowerCase(locale))).slice(0, 40)

  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal() }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const profileId = initial ? initial.id : slug(id)
    if (!initial && profiles[profileId]) { setError(copy.duplicateId); setIssues([]); return }
    const definition: CliToolProfileDefinition = {
      ...(initial?.definition ?? {}), description: description.trim(),
      ...(inherits.length ? { inherits: [...new Set(inherits)] } : { inherits: undefined }),
      ...(platforms.length ? { platforms: [...new Set(platforms)] } : { platforms: undefined }),
      ...(managementMode ? { managementMode: managementMode as 'individual' | 'acfs' } : { managementMode: undefined }),
      tools: {
        required: Object.entries(roles).filter(([, role]) => role === 'required').map(([toolId]) => toolId),
        recommended: Object.entries(roles).filter(([, role]) => role === 'recommended').map(([toolId]) => toolId),
      },
    }
    const profileCatalog = { schemaVersion: '1.1', profiles: { ...profiles, [profileId]: definition } }
    const schema = validateProfileCatalog(profileCatalog)
    const references = validateProfileReferences(definition, profileCatalog, tools)
    if (schema.state !== 'valid' || references.length) {
      setError(copy.schemaErrors)
      setIssues([...schema.errors.map(({ path, message }) => `${path} ${message}`), ...references.map(({ path, message }) => `${path} ${message}`)])
      return
    }
    onSave({ id: profileId, definition })
  }

  const chooseRole = (toolId: string, value: string) => setRoles((current) => {
    const next = { ...current }
    if (value === 'required' || value === 'recommended') next[toolId] = value
    else delete next[toolId]
    return next
  })

  return <dialog className="workspace-dialog profile-dialog" ref={dialog} aria-labelledby="profile-editor-title"
    onCancel={(event) => { event.preventDefault(); onClose() }} onClose={onClose}>
    <form className="workspace-editor" onSubmit={submit}>
      <header className="workspace-dialog-header"><h2 id="profile-editor-title">{initial ? copy.edit : copy.create}</h2>
        <button type="button" className="icon-control" aria-label={copy.cancel} onClick={() => dialog.current?.close()}>×</button></header>
      {error && <p className="workspace-error" role="alert">{error}</p>}{issues.length > 0 && <ul className="workspace-issue-list">{issues.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      <label className="workspace-field"><span>{copy.id}</span><input required pattern="[a-z0-9]+(?:[-_][a-z0-9]+)*" readOnly={Boolean(initial)} value={id} onChange={(event) => setId(slug(event.target.value))} /></label>
      <label className="workspace-field"><span>{copy.description}</span><textarea required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <fieldset className="workspace-profile-fieldset"><legend>{copy.inherits}</legend><p>{copy.inheritHelp}</p>{editableProfiles.map((profileId) => <label key={profileId}><input type="checkbox" checked={inherits.includes(profileId)} onChange={(event) => setInherits((current) => event.target.checked ? [...current, profileId] : current.filter((item) => item !== profileId))} /> {profileId}</label>)}</fieldset>
      <fieldset className="workspace-profile-fieldset"><legend>{copy.platforms}</legend>{TOOL_PLATFORMS.map((platform) => <label key={platform}><input type="checkbox" checked={platforms.includes(platform)} onChange={(event) => setPlatforms((current) => event.target.checked ? [...current, platform] : current.filter((item) => item !== platform))} /> {platform}</label>)}</fieldset>
      <label className="workspace-field"><span>{copy.management}</span><select value={managementMode} onChange={(event) => setManagementMode(event.target.value)}><option value="">—</option><option value="individual">{copy.individual}</option><option value="acfs">{copy.acfs}</option></select></label>
      <section className="workspace-profile-tool-picker"><label className="workspace-field"><span>{copy.searchTools}</span><input type="search" value={toolQuery} onChange={(event) => setToolQuery(event.target.value)} /></label>
        <ul>{visibleTools.map((tool) => <li key={tool.id}><span><strong>{tool.name}</strong><code>{tool.id}</code></span><select aria-label={`${tool.name}: ${copy.tools}`} value={roles[tool.id] ?? ''} onChange={(event) => chooseRole(tool.id, event.target.value)}>
          <option value="">{copy.choose}</option><option value="required">{copy.required}</option><option value="recommended">{copy.recommended}</option></select></li>)}</ul></section>
      <footer className="workspace-dialog-actions"><button type="button" className="quiet-button" onClick={() => dialog.current?.close()}>{copy.cancel}</button><button type="submit" className="workbench-button primary">{copy.save}</button></footer>
    </form>
  </dialog>
}

export function Profiles({ catalogTools, locale }: { catalogTools: readonly CliTool[]; locale: Locale }) {
  const copy = COPY[locale]
  const [loaded] = useState(() => loadWorkspace(catalogTools))
  const [workspace, setWorkspace] = useState<WorkspaceState>(loaded.state)
  const [saveError, setSaveError] = useState(false)
  const [selectedId, setSelectedId] = useState(Object.keys(BUILT_IN_PROFILES.profiles)[0] ?? '')
  const [editor, setEditor] = useState<WorkspaceProfile | null | undefined>(undefined)
  const localProfiles = useMemo(() => Object.fromEntries(workspace.profiles.map(({ id, definition }) => [id, definition])), [workspace.profiles])
  const profiles = useMemo(() => ({ ...BUILT_IN_PROFILES.profiles, ...localProfiles }), [localProfiles])
  const effectiveTools = useMemo(() => combineWorkspaceTools(catalogTools, workspace.tools), [catalogTools, workspace.tools])
  const selected = profiles[selectedId]
  const resolved = selected ? resolveProfile(selectedId, profiles) : null
  const missing = resolved ? missingToolIds(resolved, effectiveTools) : []
  const selectedIsLocal = workspace.profiles.some((profile) => profile.id === selectedId)
  const selectedSchema = selected ? validateProfileCatalog({ schemaVersion: '1.1', profiles: { [selectedId]: selected } }) : null
  const selectedReferences = selected ? validateProfileReferences(selected, { schemaVersion: '1.1', profiles }, effectiveTools) : []
  const profileCatalogValidation = validateProfileCatalog({ schemaVersion: '1.1', profiles })
  const allReferences = Object.entries(profiles).flatMap(([id, definition]) => validateProfileReferences(definition, { schemaVersion: '1.1', profiles }, effectiveTools).map((item) => `${id}: ${item.path} ${item.message}`))
  const hasCycles = Object.keys(profiles).some((id) => resolveProfile(id, profiles).hasCycle)
  const canExport = profileCatalogValidation.state === 'valid' && allReferences.length === 0 && !hasCycles && Object.values(profiles).length > 0

  const commit = (next: WorkspaceState) => {
    if (loaded.blocked) return
    if (!saveWorkspace(next)) { setSaveError(true); return }
    setWorkspace(next); setSaveError(false)
  }
  const saveProfile = (profile: WorkspaceProfile) => {
    const next = [...workspace.profiles.filter((item) => item.id !== profile.id), profile]
    commit({ ...workspace, profiles: next }); setSelectedId(profile.id); setEditor(undefined)
  }
  const cloneProfile = (profileId: string) => {
    const original = profiles[profileId]
    if (!original) return
    let id = `${profileId}-${copy.copySuffix}`
    let suffix = 2
    while (profiles[id]) id = `${profileId}-${copy.copySuffix}-${suffix++}`
    setEditor({ id, definition: JSON.parse(JSON.stringify(original)) as CliToolProfileDefinition })
  }
  const deleteProfile = (profileId: string) => {
    const nextProfiles = workspace.profiles.filter((item) => item.id !== profileId)
      .map((item) => ({ ...item, definition: { ...item.definition, inherits: item.definition.inherits?.filter((parent) => parent !== profileId) } }))
    commit({ ...workspace, profiles: nextProfiles })
    setSelectedId(Object.keys(BUILT_IN_PROFILES.profiles)[0] ?? '')
  }

  return <section className="profiles-screen">
    <header className="workspace-page-heading"><div><span className="catalog-eyebrow">{copy.tools}</span><h1 id="screen-heading" tabIndex={-1}>{copy.title}</h1><p>{copy.subtitle}</p></div>
      <div className="workspace-page-actions"><button type="button" className="quiet-button" disabled={!canExport} title={canExport ? undefined : copy.exportError}
        onClick={() => download('cli-tool-registry-profiles.yml', stringifyYaml({ schemaVersion: '1.1', profiles }))}>{copy.export}</button>
        <button type="button" className="workbench-button primary" onClick={() => setEditor(null)}>＋ {copy.create}</button></div></header>
    {loaded.blocked && <p className="workspace-error" role="alert">{loaded.error === 'unavailable' ? COPY[locale].storageUnavailable : COPY[locale].corrupt}</p>}
    {saveError && <p className="workspace-error" role="alert">{COPY[locale].saveFailed}</p>}
    <p className="workspace-schema-hint">{copy.previewHint}</p>
    <div className="profiles-layout"><nav className="profile-list" aria-label={copy.select}>
      {Object.keys(profiles).map((id) => <button type="button" key={id} className={id === selectedId ? 'is-selected' : ''} aria-current={id === selectedId ? 'true' : undefined} onClick={() => setSelectedId(id)}>
        <strong>{id}</strong><span>{workspace.profiles.some((item) => item.id === id) ? copy.local : copy.builtIn}</span></button>)}
      {workspace.profiles.length === 0 && <p className="workspace-empty">{copy.noProfiles}</p>}
    </nav>
    {selected && resolved ? <article className="profile-preview"><header><div><span className="profile-badge">{selectedIsLocal ? copy.local : copy.builtIn}</span><h2>{selectedId}</h2><p>{selected.description || copy.noDescription}</p></div>
      <div className="profile-preview-actions">{!selectedIsLocal && <button type="button" className="quiet-button" onClick={() => cloneProfile(selectedId)}>{copy.clone}</button>}
        {selectedIsLocal && <><button type="button" className="quiet-button" onClick={() => setEditor(workspace.profiles.find((item) => item.id === selectedId) ?? null)}>{copy.edit}</button><button type="button" className="quiet-button danger" onClick={() => deleteProfile(selectedId)}>{copy.remove}</button></>}</div></header>
      {selectedSchema?.state !== 'valid' || selectedReferences.length > 0 ? <p className="workspace-error" role="alert">{copy.invalid}</p> : <p className="workspace-validity is-valid">{copy.valid}</p>}
      <section className="profile-facts"><div><strong>{copy.platforms}</strong><span>{resolved.platforms?.join(', ') ?? copy.platformAny}</span></div><div><strong>{copy.management}</strong><span>{resolved.managementMode === 'acfs' ? copy.acfs : resolved.managementMode === 'individual' ? copy.individual : '—'}</span></div></section>
      {(resolved.hasCycle || resolved.missingProfiles.length > 0 || missing.length > 0 || selectedSchema?.state !== 'valid' || selectedReferences.length > 0) && <div role="status">
        <ul className="profile-warnings">
          {resolved.hasCycle && <li>{copy.cycle}</li>}{resolved.missingProfiles.length > 0 && <li>{copy.missingProfiles}: {resolved.missingProfiles.join(', ')}</li>}{missing.length > 0 && <li>{copy.missingTools}: {missing.join(', ')}</li>}
          {selectedSchema?.errors.map((error, index) => <li key={`schema-${index}`}>{error.path} {error.message}</li>)}{selectedReferences.map((error, index) => <li key={`ref-${index}`}>{error.path} {error.message}</li>)}
        </ul>
      </div>}
      <div className="profile-tool-groups"><section><h3>{copy.required}<span>{resolved.required.length}</span></h3><ul>{resolved.required.map((id) => <li key={id}><span>{effectiveTools.find((tool) => tool.id === id)?.name ?? id}</span><code>{id}</code></li>)}</ul></section>
        <section><h3>{copy.recommended}<span>{resolved.recommended.length}</span></h3><ul>{resolved.recommended.map((id) => <li key={id}><span>{effectiveTools.find((tool) => tool.id === id)?.name ?? id}</span><code>{id}</code></li>)}</ul></section></div>
    </article> : <p className="workspace-empty">{copy.noProfiles}</p>}</div>
    {editor !== undefined && <ProfileEditor initial={editor} locale={locale} profiles={profiles} tools={effectiveTools} onClose={() => setEditor(undefined)} onSave={saveProfile} />}
  </section>
}
