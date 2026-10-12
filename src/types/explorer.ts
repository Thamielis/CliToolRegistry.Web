export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type LocalizedLabel = { de: string; en: string }
export type DatasetRef = { toolId: string; datasetId: string }
export type AdapterId =
  | 'br-guide'
  | 'br-capabilities'
  | 'bv-docs'
  | 'bv-capabilities'
  | 'cass-capabilities'
  | 'ee-capabilities'
  | 'fmd-capabilities'
  | 'ubs-docs'
  | 'generic-json'

export type SourcedPresence<T> =
  | { state: 'missing' }
  | { state: 'null'; pointer: string }
  | { state: 'value'; value: Exclude<T, null | undefined>; pointer: string }

export type Presence<T> =
  | { state: 'missing' }
  | { state: 'null' }
  | { state: 'value'; value: Exclude<T, null | undefined> }

export type SnapshotMeta = {
  version: SourcedPresence<string>
  contract: SourcedPresence<string>
  generatedAt: SourcedPresence<string>
}

export type DatasetRegistration = DatasetRef & {
  filename: string
  format: 'json'
  adapter: AdapterId
  title: LocalizedLabel
}

export type ExplorerRegistry = {
  schema: 'cli-tool-explorer.registry.v1'
  tools: { toolId: string; fallbackName: string }[]
  datasets: DatasetRegistration[]
}

export type ManifestEntry = DatasetRef & {
  filename: string
  format: 'json'
  adapter: AdapterId
  title: LocalizedLabel
  bytes: number
  sha256: string
  snapshot: SnapshotMeta
}

export type ExplorerManifest = {
  schema: 'cli-tool-explorer.manifest.v1'
  datasets: ManifestEntry[]
}

export type ExplorerRegistryDiagnostic = {
  code: 'InvalidRegistry' | 'DuplicateDataset' | 'DuplicateFilename' | 'UnsafeFilename'
  source: string
  message: string
}

export type ExplorerBuildDiagnostic = ExplorerRegistryDiagnostic | {
  code: 'MissingRegisteredFile' | 'UnexpectedInventoryFile' | 'IgnoredNonJson'
  source: string
  message: string
}

export type Origin = {
  filename: string
  pointer: string
  guideLines?: { start: number; end: number }
}

export type ExplorerSection = {
  id: string
  label: LocalizedLabel
  entryIds: string[]
}

export type AdapterDiagnosticCode =
  | 'UnsupportedContract'
  | 'ContractShapeMismatch'
  | 'DuplicateEntryName'
  | 'InvalidSnapshotDate'

export type AdapterDiagnostic = {
  code: AdapterDiagnosticCode
  pointer: string
  explanation: LocalizedLabel
}

export type GuideDetail = {
  kind: 'guide'
  text: string
  copyCommands: string[]
}

export type BrCommandDetail = {
  kind: 'br-command'
  summary: string
  operation: 'read' | 'write' | 'mixed'
  workspace: 'required' | 'optional' | 'none'
  machineOutput: string[]
  examples: string[]
}

export type BvCommandDetail = {
  kind: 'bv-command'
  description: string
  flag: string
  needsIssues: boolean
  needsGit: boolean
  needsSprint: boolean
  needsBaseline: boolean
  mutatesState: boolean
  params: Presence<string[]>
  keyFields: Presence<string[]>
  preferredInvocation: Presence<string>
  acceptedInvocations: Presence<string[]>
}

export type CassCommandDetail = {
  kind: 'cass-command'
  description: string
  hasJsonOutput: boolean
  argumentEntryIds: string[]
}

export type CassArgumentDetail = {
  kind: 'cass-argument'
  description: string
  argType: 'option' | 'flag' | 'positional'
  required: boolean
  valueType: Presence<string>
  defaultValue: Presence<JsonValue>
  enumValues: Presence<JsonValue[]>
  repeatable: Presence<boolean>
  short: Presence<string>
}

export type EeCommandDetail = {
  kind: 'ee-command'
  availableInSnapshot: boolean
  pathParts: string[]
}

export type ExampleDetail = {
  kind: 'example'
  description: Presence<string>
  commands: string[]
}

export type StructuredDetail = {
  kind: 'structured'
  sourceValue: JsonValue
  rows: { label: string; value: Presence<JsonValue> }[]
  copyCommands: string[]
}

export type GenericDetail = {
  kind: 'generic'
  rootPointer: string
}

export type EntryDetail =
  | GuideDetail
  | BrCommandDetail
  | BvCommandDetail
  | CassCommandDetail
  | CassArgumentDetail
  | EeCommandDetail
  | ExampleDetail
  | StructuredDetail
  | GenericDetail

export type ExplorerEntry = {
  id: string
  sectionId: string
  parentEntryId?: string
  title: string
  searchText: string
  origin: Origin
  detail: EntryDetail
}

export type ExplorerDataset = {
  ref: DatasetRef
  snapshot: SnapshotMeta
  sections: ExplorerSection[]
  entries: ExplorerEntry[]
  diagnostics: AdapterDiagnostic[]
}

export type GenericProjectionOptions = {
  rootPointer?: string
  offset?: number
  limit?: number
}

export type GenericProjection = {
  entries: ExplorerEntry[]
  totalEntries: number
  hasMore: boolean
}

export type EntryIdentity = {
  id: string
  duplicateName: boolean
}
