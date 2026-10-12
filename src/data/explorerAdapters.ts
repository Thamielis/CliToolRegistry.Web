import type {
  AdapterDiagnostic,
  AdapterId,
  DatasetRef,
  EntryIdentity,
  EntryDetail,
  ExplorerDataset,
  ExplorerEntry,
  ExplorerSection,
  GenericProjection,
  GenericProjectionOptions,
  JsonValue,
  LocalizedLabel,
  ManifestEntry,
  Presence,
  SnapshotMeta,
} from '../types/explorer'

const JSON_SECTION: LocalizedLabel = { de: 'JSON-Felder', en: 'JSON fields' }

type JsonObject = { [key: string]: JsonValue }
type PathNode = { parent: PathNode | null; segment: string }
type VisitNode = {
  value: JsonValue
  path: PathNode | null
  depth: number
  targetPrefix: boolean
  insideTarget: boolean
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function escapeJsonPointerSegment(segment: string | number): string {
  return String(segment).replaceAll('~', '~0').replaceAll('/', '~1')
}

export function appendJsonPointer(pointer: string, segment: string | number): string {
  return `${pointer}/${escapeJsonPointerSegment(segment)}`
}

function decodePointerSegment(segment: string): string | null {
  let result = ''
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index]
    if (character !== '~') {
      result += character
      continue
    }
    const escaped = segment[index + 1]
    if (escaped === '0') result += '~'
    else if (escaped === '1') result += '/'
    else return null
    index += 1
  }
  return result
}

function parseJsonPointer(pointer: string): string[] | null {
  if (pointer === '') return []
  if (!pointer.startsWith('/')) return null
  const segments: string[] = []
  for (const raw of pointer.slice(1).split('/')) {
    const decoded = decodePointerSegment(raw)
    if (decoded === null) return null
    segments.push(decoded)
  }
  return segments
}

export function presenceFromObject<T extends JsonValue>(value: JsonObject, key: string): Presence<T> {
  if (!Object.hasOwn(value, key) || value[key] === undefined) return { state: 'missing' }
  const field = value[key]
  if (field === null) return { state: 'null' }
  return { state: 'value', value: field as Exclude<T, null | undefined> }
}

export function resolveJsonPointer(source: JsonValue, pointer: string): Presence<JsonValue> {
  const segments = parseJsonPointer(pointer)
  if (!segments) return { state: 'missing' }
  let current: JsonValue | undefined = source
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return { state: 'missing' }
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || !Object.hasOwn(current, index)) return { state: 'missing' }
      current = current[index]
    } else if (current !== null && typeof current === 'object') {
      if (!Object.hasOwn(current, segment)) return { state: 'missing' }
      current = (current as JsonObject)[segment]
    } else {
      return { state: 'missing' }
    }
  }
  if (current === undefined) return { state: 'missing' }
  if (current === null) return { state: 'null' }
  return { state: 'value', value: current }
}

function pointerFromPath(path: PathNode | null): string {
  const segments: string[] = []
  for (let current = path; current !== null; current = current.parent) {
    segments.push(escapeJsonPointerSegment(current.segment))
  }
  segments.reverse()
  return segments.length === 0 ? '' : `/${segments.join('/')}`
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

export function createEntryIdentity(
  prefix: string,
  name: string | null | undefined,
  pointer: string,
  naturalIds: Set<string>,
  entryOrdinal: number,
): EntryIdentity {
  const validName = typeof name === 'string' && name.length > 0 && !name.includes(':')
  const naturalId = validName ? `${prefix}:${name}` : null
  const duplicateName = naturalId !== null && naturalIds.has(naturalId)
  if (naturalId !== null) naturalIds.add(naturalId)

  const candidate = naturalId !== null && !duplicateName ? naturalId : `ptr:${pointer}`
  const id = candidate.length > 2048 || hasUnpairedSurrogate(candidate)
    ? `node:${entryOrdinal}`
    : candidate
  return { id, duplicateName }
}

function scalarText(value: JsonValue): string {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  return String(value)
}

function safeCount(value: number | undefined, fallback: number, allowInfinity = false): number {
  if (value === undefined) return fallback
  if (allowInfinity && value === Number.POSITIVE_INFINITY) return value
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Generic JSON projection bounds must be non-negative safe integers.')
  }
  return value
}

/**
 * Projects scalar leaves in stable source order without recursive calls.
 * `rootPointer`, `offset`, and `limit` let the UI request a bounded subtree page.
 */
export function projectGenericJson(
  sourceValue: JsonValue,
  filename: string,
  options: GenericProjectionOptions = {},
): GenericProjection {
  const rootPointer = options.rootPointer ?? ''
  const targetSegments = parseJsonPointer(rootPointer)
  if (!targetSegments) return { entries: [], totalEntries: 0, hasMore: false }
  const offset = safeCount(options.offset, 0)
  const limit = safeCount(options.limit, Number.POSITIVE_INFINITY, true)
  const sectionId = 'json'
  const stack: VisitNode[] = [{
    value: sourceValue,
    path: null,
    depth: 0,
    targetPrefix: true,
    insideTarget: targetSegments.length === 0,
  }]
  const entries: ExplorerEntry[] = []
  let sourceOrdinal = 0
  let totalEntries = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        const segment = String(index)
        const depth = current.depth + 1
        const targetPrefix = current.targetPrefix && current.depth < targetSegments.length &&
          segment === targetSegments[current.depth]
        stack.push({
          value: current.value[index],
          path: { parent: current.path, segment },
          depth,
          targetPrefix,
          insideTarget: current.insideTarget || targetPrefix && depth === targetSegments.length,
        })
      }
      continue
    }
    if (isJsonObject(current.value)) {
      const keys = Object.keys(current.value)
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const segment = keys[index]
        const depth = current.depth + 1
        const targetPrefix = current.targetPrefix && current.depth < targetSegments.length &&
          segment === targetSegments[current.depth]
        stack.push({
          value: current.value[segment],
          path: { parent: current.path, segment },
          depth,
          targetPrefix,
          insideTarget: current.insideTarget || targetPrefix && depth === targetSegments.length,
        })
      }
      continue
    }

    const ordinal = sourceOrdinal
    sourceOrdinal += 1
    if (!current.insideTarget) continue
    const localOrdinal = totalEntries
    totalEntries += 1
    if (localOrdinal < offset || entries.length >= limit) continue

    const pointer = pointerFromPath(current.path)
    const entryId = pointer.length + 4 > 2048 || hasUnpairedSurrogate(pointer)
      ? `node:${ordinal}`
      : `ptr:${pointer}`
    entries.push({
      id: entryId,
      sectionId,
      title: current.path?.segment ?? '$',
      searchText: `${pointer} ${scalarText(current.value)}`.trim(),
      origin: { filename, pointer },
      detail: { kind: 'generic', rootPointer: pointer },
    })
  }

  return { entries, totalEntries, hasMore: totalEntries > offset + entries.length }
}

export function createGenericExplorerDataset(input: {
  ref: DatasetRef
  snapshot: SnapshotMeta
  filename: string
  sourceValue: JsonValue
}): ExplorerDataset {
  const projection = projectGenericJson(input.sourceValue, input.filename)
  const section: ExplorerSection = {
    id: 'json',
    label: JSON_SECTION,
    entryIds: projection.entries.map(({ id }) => id),
  }
  const diagnostics: AdapterDiagnostic[] = []
  return {
    ref: input.ref,
    snapshot: input.snapshot,
    sections: [section],
    entries: projection.entries,
    diagnostics,
  }
}

type UnknownRecord = Record<string, unknown>
type Validator = (value: unknown, pointer: string) => string | null
type Shape = {
  required?: Record<string, Validator>
  optional?: Record<string, Validator>
}

const stringValue: Validator = (value, pointer) => typeof value === 'string' ? null : pointer
const booleanValue: Validator = (value, pointer) => typeof value === 'boolean' ? null : pointer
const numberValue: Validator = (value, pointer) => typeof value === 'number' && Number.isFinite(value) ? null : pointer
const anyJsonValue: Validator = (value, pointer) => value === undefined ? pointer : null

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function objectShape(shape: Shape): Validator {
  return (value, pointer) => {
    if (!isUnknownRecord(value)) return pointer
    for (const [key, validator] of Object.entries(shape.required ?? {})) {
      const childPointer = appendJsonPointer(pointer, key)
      if (!Object.hasOwn(value, key)) return childPointer
      const issue = validator(value[key], childPointer)
      if (issue) return issue
    }
    for (const [key, validator] of Object.entries(shape.optional ?? {})) {
      if (!Object.hasOwn(value, key) || value[key] === null) continue
      const issue = validator(value[key], appendJsonPointer(pointer, key))
      if (issue) return issue
    }
    return null
  }
}

function arrayOf(validator: Validator): Validator {
  return (value, pointer) => {
    if (!Array.isArray(value)) return pointer
    for (let index = 0; index < value.length; index += 1) {
      const issue = validator(value[index], appendJsonPointer(pointer, index))
      if (issue) return issue
    }
    return null
  }
}

function stringArray(value: unknown, pointer: string): string | null {
  return arrayOf(stringValue)(value, pointer)
}

function stringRecord(value: unknown, pointer: string): string | null {
  if (!isUnknownRecord(value)) return pointer
  for (const [key, item] of Object.entries(value)) {
    const issue = stringValue(item, appendJsonPointer(pointer, key))
    if (issue) return issue
  }
  return null
}

function booleanRecord(value: unknown, pointer: string): string | null {
  if (!isUnknownRecord(value)) return pointer
  for (const [key, item] of Object.entries(value)) {
    const issue = booleanValue(item, appendJsonPointer(pointer, key))
    if (issue) return issue
  }
  return null
}

function numberRecord(value: unknown, pointer: string): string | null {
  if (!isUnknownRecord(value)) return pointer
  for (const [key, item] of Object.entries(value)) {
    const issue = numberValue(item, appendJsonPointer(pointer, key))
    if (issue) return issue
  }
  return null
}

function enumValue(...values: string[]): Validator {
  return (value, pointer) => typeof value === 'string' && values.includes(value) ? null : pointer
}

const stringList = stringArray
const commandArgumentShape = objectShape({
  required: {
    name: stringValue,
    description: stringValue,
    arg_type: enumValue('option', 'flag', 'positional'),
    required: booleanValue,
  },
  optional: {
    value_type: stringValue,
    default: anyJsonValue,
    enum_values: arrayOf(anyJsonValue),
    repeatable: booleanValue,
    short: stringValue,
  },
})

function optionalFieldError(
  record: UnknownRecord,
  key: string,
  validator: Validator,
  pointer: string,
): string | null {
  if (!Object.hasOwn(record, key) || record[key] === null) return null
  return validator(record[key], appendJsonPointer(pointer, key))
}

function requiredFieldError(record: UnknownRecord, key: string, validator: Validator, pointer: string): string | null {
  const fieldPointer = appendJsonPointer(pointer, key)
  if (!Object.hasOwn(record, key)) return fieldPointer
  return validator(record[key], fieldPointer)
}

function shapeError(value: unknown, pointer: string, shape: Shape): string | null {
  return objectShape(shape)(value, pointer)
}

function firstSourceShapeError(adapter: AdapterId, source: JsonValue): string | null {
  if (!isUnknownRecord(source)) return ''
  const at = (key: string) => appendJsonPointer('', key)
  const check = (key: string, validator: Validator, optional = false) =>
    optional ? optionalFieldError(source, key, validator, '') : requiredFieldError(source, key, validator, '')
  const rowArray = (key: string, shape: Shape, optional = true) =>
    check(key, arrayOf(objectShape(shape)), optional)
  const record = (key: string, validator: Validator, optional = true) => check(key, validator, optional)

  if (adapter === 'br-guide') {
    return check('version', stringValue) || check('title', stringValue) || check('guide', stringValue) ||
      rowArray('canonical_commands', { required: { task: stringValue, command: stringValue } }, false) ||
      check('line_count', numberValue, true)
  }
  if (adapter === 'br-capabilities') {
    const command = {
      required: {
        name: stringValue, summary: stringValue, operation: enumValue('read', 'write', 'mixed'),
        workspace: enumValue('required', 'optional', 'none'), machine_output: stringList, examples: stringList,
      },
    }
    return check('version', stringValue) || rowArray('commands', command, false) ||
      rowArray('features', { required: { name: stringValue, description: stringValue } }) ||
      record('build_features', booleanRecord) ||
      rowArray('global_flags', { required: { flag: stringValue, description: stringValue } }) ||
      record('output_formats', stringList) ||
      rowArray('exit_codes', { required: { code: numberValue, category: stringValue, description: stringValue } }) ||
      rowArray('env_vars', { required: { name: stringValue, description: stringValue } }) ||
      rowArray('safety', { required: { name: stringValue, guarantee: stringValue } }) ||
      record('recommended_entrypoints', stringList)
  }
  if (adapter === 'bv-docs') {
    const command = {
      required: {
        flag: stringValue, description: stringValue,
        needs_issues: booleanValue, needs_git: booleanValue, needs_sprint: booleanValue,
        needs_baseline: booleanValue, mutates_state: booleanValue,
      },
      optional: { key_fields: stringList, params: stringList, preferred_invocation: stringValue,
        accepted_invocations: stringList },
    }
    const guide = objectShape({ optional: {
      agent_intent_aliases: arrayOf(objectShape({ required: { agent_instinct: stringValue, canonical: stringValue } })),
      quickstart: stringList,
      output_modes: stringRecord,
    } })
    return check('version', stringValue) || check('commands', (value, pointer) => {
      if (!isUnknownRecord(value)) return pointer
      for (const [key, item] of Object.entries(value)) {
        const issue = command === null ? null : objectShape(command)(item, appendJsonPointer(pointer, key))
        if (issue) return issue
      }
      return null
    }, false) || check('generated_at', stringValue, true) || check('output_format', stringValue, true) ||
      check('key_fields', stringList, true) || check('params', stringList, true) ||
      rowArray('examples', { required: { command: stringValue, description: stringValue } }) ||
      record('guide', guide) || record('environment_variables', stringRecord) || record('exit_codes', stringRecord)
  }
  if (adapter === 'bv-capabilities') {
    const command = {
      required: {
        name: stringValue, flag: stringValue, description: stringValue, preferred_invocation: stringValue,
        accepted_invocations: stringList, needs_issues: booleanValue, needs_git: booleanValue,
        needs_sprint: booleanValue, needs_baseline: booleanValue, mutates_state: booleanValue,
      },
      optional: { key_fields: stringList, params: stringList },
    }
    return check('version', stringValue) || rowArray('commands', command, false) ||
      check('generated_at', stringValue, true) || record('agent_intent_aliases', arrayOf(objectShape({
        required: { agent_instinct: stringValue, canonical: stringValue },
      }))) || record('docs_topics', stringList) || check('default_robot_command', stringValue, true) ||
      check('schema_command', stringValue, true) || record('output_formats', stringList) ||
      record('stream_contract', objectShape({ required: { stdout: stringValue, stderr: stringValue } })) ||
      record('environment_variables', stringRecord) || record('exit_codes', stringRecord)
  }
  if (adapter === 'cass-capabilities') {
    return check('version', stringValue) || rowArray('commands', { required: { name: stringValue, description: stringValue,
      arguments: arrayOf(commandArgumentShape), has_json_output: booleanValue } }, false) ||
      record('features', stringList) || record('connectors', stringList) || rowArray('global_flags', {
        required: { name: stringValue, description: stringValue, arg_type: enumValue('option', 'flag', 'positional'), required: booleanValue },
        optional: { value_type: stringValue, default: anyJsonValue, enum_values: arrayOf(anyJsonValue), repeatable: booleanValue, short: stringValue },
      }) ||
      rowArray('env_vars', { required: { name: stringValue, description: stringValue }, optional: { default: anyJsonValue } }) ||
      rowArray('exit_codes', { required: { code: stringValue, meaning: stringValue, retryable: stringValue, agent_action: stringValue } }) ||
      rowArray('workflows', { required: { name: stringValue, intent: stringValue, first_command: stringValue,
        parse_contract: stringValue, follow_up_commands: stringList }, optional: { note: stringValue } }) ||
      rowArray('mistake_recoveries', { required: { wrong: stringValue, canonical: stringValue, behavior: stringValue, accepted: booleanValue } }) ||
      record('limits', numberRecord)
  }
  if (adapter === 'ee-capabilities') {
    const data = source.data
    if (!isUnknownRecord(data)) return at('data')
    const dataPointer = at('data')
    return check('success', booleanValue) || check('degraded', arrayOf(anyJsonValue)) || check('fields', stringValue) ||
      shapeError(data, dataPointer, {
        required: { version: stringValue, commands: arrayOf(objectShape({ required: { name: stringValue, available: booleanValue } })) },
        optional: {
          subsystems: arrayOf(objectShape({ required: { name: stringValue, status: stringValue } })),
          features: arrayOf(objectShape({ required: { name: stringValue, enabled: booleanValue } })),
          unimplemented: arrayOf(objectShape({ required: { code: stringValue, featureFlag: stringValue, shipTarget: stringValue, trackingBead: stringValue } })),
          envOverrides: arrayOf(objectShape({
            required: { name: stringValue, category: stringValue, controls: stringValue, source: stringValue, isSet: booleanValue },
            optional: { defaultValue: anyJsonValue, currentValue: anyJsonValue },
          })),
          output: objectShape({ optional: {
            formats: arrayOf(objectShape({ required: { name: stringValue, description: stringValue, available: booleanValue, machineReadable: booleanValue } })),
          } }),
        },
      })
  }
  if (adapter === 'fmd-capabilities') {
    return check('version', stringValue) || rowArray('commands', { required: { name: stringValue, examples: stringList }, optional: { description: stringValue } }, false) ||
      record('features', stringRecord) || record('outputs', stringList) || record('exit_codes', stringRecord)
  }
  if (adapter === 'ubs-docs') {
    const commands = objectShape({
      required: {
        subcommands: arrayOf(objectShape({ required: { name: stringValue, usage: stringValue, description: stringValue } })),
        flags: arrayOf(objectShape({ required: { name: stringValue, description: stringValue, example: stringValue }, optional: { args: stringValue } })),
      },
    })
    return check('ubs_version', stringValue) || check('commands', (value, pointer) => {
      const issue = commands(value, pointer)
      if (issue) return issue
      const object = value as UnknownRecord
      const flags = object.flags as UnknownRecord[]
      for (let index = 0; index < flags.length; index += 1) {
        const args = flags[index].args
        if (args !== null && args !== undefined && typeof args !== 'string') {
          return appendJsonPointer(appendJsonPointer(appendJsonPointer(pointer, 'flags'), index), 'args')
        }
      }
      return null
    }, false) ||
      record('guide', objectShape({ required: { summary: stringValue, golden_rule: stringValue, stdout_contract: stringValue, workflow: stringList } })) ||
      rowArray('examples', { required: { goal: stringValue, command: stringValue } }) ||
      rowArray('exit_codes', { required: { code: numberValue, meaning: stringValue } }) ||
      record('env', arrayOf(objectShape({ required: { name: stringValue, value: stringValue, description: stringValue } }))) ||
      record('formats', (value, pointer) => {
        if (!isUnknownRecord(value)) return pointer
        for (const [key, format] of Object.entries(value)) {
          if (!isUnknownRecord(format)) return appendJsonPointer(pointer, key)
          const shape = objectShape({ optional: { description: stringValue, schema: stringValue } })
          const issue = shape(format, appendJsonPointer(pointer, key))
          if (issue) return issue
        }
        return null
      })
  }
  return ''
}

function localizedDiagnostic(code: AdapterDiagnostic['code'], pointer: string, explanation: { de: string; en: string }): AdapterDiagnostic {
  return { code, pointer, explanation }
}

function sourceStringPresence(source: UnknownRecord, key: string): Presence<string> {
  return presenceFromObject<string>(source as JsonObject, key)
}

function snapshotDateDiagnostic(snapshot: SnapshotMeta): AdapterDiagnostic[] {
  if (snapshot.generatedAt.state !== 'value' || Number.isFinite(Date.parse(snapshot.generatedAt.value))) return []
  return [localizedDiagnostic('InvalidSnapshotDate', snapshot.generatedAt.pointer, {
    de: 'Der Zeitstempel ist im Snapshot als Rohwert erhalten, lässt sich aber nicht als Datum lesen.',
    en: 'The timestamp remains available as a raw snapshot value but cannot be parsed as a date.',
  })]
}

function checkAdapterIdentity(adapter: AdapterId, source: JsonValue): AdapterDiagnostic | null {
  if (!isUnknownRecord(source)) return localizedDiagnostic('ContractShapeMismatch', '', {
    de: 'Für diesen Fachadapter wird ein JSON-Objekt erwartet; die Quelle wird generisch angezeigt.',
    en: 'This adapter requires a JSON object; the source is shown through the generic reader.',
  })
  const identities: Partial<Record<AdapterId, { key: string; expected: string | number; contract?: boolean }>> = {
    'br-guide': { key: 'tool', expected: 'br' },
    'br-capabilities': { key: 'tool', expected: 'br' },
    'bv-docs': { key: 'topic', expected: 'all', contract: true },
    'bv-capabilities': { key: 'tool', expected: 'bv' },
    'cass-capabilities': { key: 'contract_version', expected: '1', contract: true },
    'ee-capabilities': { key: 'schema', expected: 'ee.response.v2', contract: true },
    'fmd-capabilities': { key: 'tool', expected: 'fmd' },
    'ubs-docs': { key: 'schema_version', expected: '1', contract: true },
  }
  const identity = identities[adapter]
  if (!identity) return localizedDiagnostic('UnsupportedContract', '', {
    de: 'Für diesen Adapter ist kein freigegebener Quellvertrag vorhanden.',
    en: 'No supported source contract is registered for this adapter.',
  })
  const actual = source[identity.key]
  if (typeof actual !== typeof identity.expected) return localizedDiagnostic('ContractShapeMismatch', appendJsonPointer('', identity.key), {
    de: `Das Identitätsfeld ${identity.key} fehlt oder hat einen falschen Typ.`,
    en: `Identity field ${identity.key} is missing or has the wrong type.`,
  })
  if (actual !== identity.expected) {
    return localizedDiagnostic(identity.contract ? 'UnsupportedContract' : 'ContractShapeMismatch',
      appendJsonPointer('', identity.key), {
        de: `Der Quellvertrag ${String(actual)} passt nicht zu diesem Adapter.`,
        en: `Source contract ${String(actual)} does not match this adapter.`,
      })
  }

  const secondContract: Partial<Record<AdapterId, { key: string; expected: string | number }>> = {
    'br-guide': { key: 'contract_version', expected: 'br.robot_docs.v1' },
    'br-capabilities': { key: 'contract_version', expected: 'br.capabilities.v1' },
    'bv-capabilities': { key: 'contract_version', expected: '1.0.0' },
    'cass-capabilities': { key: 'api_version', expected: 1 },
    'fmd-capabilities': { key: 'contract_version', expected: '0.1.0' },
  }
  const contract = secondContract[adapter]
  if (contract) {
    const value = source[contract.key]
    if (typeof value !== typeof contract.expected) return localizedDiagnostic('ContractShapeMismatch', appendJsonPointer('', contract.key), {
      de: `Das Vertragsfeld ${contract.key} fehlt oder hat einen falschen Typ.`,
      en: `Contract field ${contract.key} is missing or has the wrong type.`,
    })
    if (value !== contract.expected) return localizedDiagnostic('UnsupportedContract', appendJsonPointer('', contract.key), {
      de: `Die Vertragskennung ${String(value)} wird von diesem Adapter nicht unterstützt.`,
      en: `Contract identifier ${String(value)} is not supported by this adapter.`,
    })
  }
  return null
}

type AdapterBuilder = {
  ref: DatasetRef
  snapshot: SnapshotMeta
  filename: string
  source: JsonValue
  sections: ExplorerSection[]
  sectionMap: Map<string, ExplorerSection>
  entries: ExplorerEntry[]
  diagnostics: AdapterDiagnostic[]
  naturalIds: Set<string>
  usedIds: Set<string>
}

const SECTION_LABELS: Record<string, LocalizedLabel> = {
  guide: { de: 'Leitfaden', en: 'Guide' },
  'canonical-commands': { de: 'Kanonische Befehle', en: 'Canonical commands' },
  commands: { de: 'Befehle', en: 'Commands' },
  features: { de: 'Fähigkeiten', en: 'Features' },
  build: { de: 'Build-Funktionen', en: 'Build features' },
  flags: { de: 'Flags', en: 'Flags' },
  formats: { de: 'Formate', en: 'Formats' },
  'exit-codes': { de: 'Exit-Codes', en: 'Exit codes' },
  env: { de: 'Umgebung', en: 'Environment' },
  safety: { de: 'Sicherheit', en: 'Safety' },
  entrypoints: { de: 'Einstiegspunkte', en: 'Entrypoints' },
  aliases: { de: 'Agentenaliase', en: 'Agent aliases' },
  examples: { de: 'Beispiele', en: 'Examples' },
  topics: { de: 'Dokumentationsthemen', en: 'Documentation topics' },
  streams: { de: 'Datenströme', en: 'Streams' },
  workflows: { de: 'Arbeitsabläufe', en: 'Workflows' },
  connectors: { de: 'Konnektoren', en: 'Connectors' },
  recoveries: { de: 'Fehlerkorrekturen', en: 'Recoveries' },
  limits: { de: 'Grenzwerte', en: 'Limits' },
  subsystems: { de: 'Subsysteme', en: 'Subsystems' },
  unimplemented: { de: 'Noch nicht umgesetzt', en: 'Not implemented' },
  output: { de: 'Ausgabe', en: 'Output' },
  snapshot: { de: 'Snapshot', en: 'Snapshot' },
  outputs: { de: 'Ausgaben', en: 'Outputs' },
  theme: { de: 'Theme-Modell', en: 'Theme model' },
  'pdf-running-content': { de: 'PDF-Kopf- und Fußzeilen', en: 'PDF running content' },
  json: JSON_SECTION,
}

function createAdapterBuilder(entry: ManifestEntry, source: JsonValue): AdapterBuilder {
  return {
    ref: { toolId: entry.toolId, datasetId: entry.datasetId },
    snapshot: entry.snapshot,
    filename: entry.filename,
    source,
    sections: [],
    sectionMap: new Map(),
    entries: [],
    diagnostics: snapshotDateDiagnostic(entry.snapshot),
    naturalIds: new Set(),
    usedIds: new Set(),
  }
}

function ensureSection(builder: AdapterBuilder, sectionId: string): ExplorerSection {
  const existing = builder.sectionMap.get(sectionId)
  if (existing) return existing
  const section: ExplorerSection = {
    id: sectionId,
    label: SECTION_LABELS[sectionId] ?? { de: sectionId, en: sectionId },
    entryIds: [],
  }
  builder.sections.push(section)
  builder.sectionMap.set(sectionId, section)
  return section
}

function searchableText(value: JsonValue): string {
  const output: string[] = []
  const stack: JsonValue[] = [value]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) stack.push(current[index])
    } else if (isJsonObject(current)) {
      const keys = Object.keys(current)
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        output.push(keys[index])
        stack.push(current[keys[index]])
      }
    } else {
      output.push(scalarText(current))
    }
  }
  return output.join(' ')
}

function rowsFromSource(value: JsonValue): { label: string; value: Presence<JsonValue> }[] {
  if (Array.isArray(value)) return value.map((item, index) => ({
    label: `[${index}]`, value: item === null ? { state: 'null' } : { state: 'value', value: item },
  }))
  if (isJsonObject(value)) return Object.entries(value).map(([key, item]) => ({
    label: key, value: item === null ? { state: 'null' } : { state: 'value', value: item },
  }))
  return []
}

function addAdapterEntry(
  builder: AdapterBuilder,
  input: {
    sectionId: string
    pointer: string
    title: string
    detail: EntryDetail
    sourceValue: JsonValue
    idPrefix?: string
    naturalName?: string | null
    parentEntryId?: string
    guideLines?: { start: number; end: number }
  },
): string {
  const section = ensureSection(builder, input.sectionId)
  const identity = createEntryIdentity(input.idPrefix ?? 'ptr', input.naturalName, input.pointer,
    builder.naturalIds, builder.entries.length)
  let id = identity.id
  if (builder.usedIds.has(id)) id = `node:${builder.entries.length}`
  builder.usedIds.add(id)
  if (identity.duplicateName) builder.diagnostics.push(localizedDiagnostic('DuplicateEntryName', input.pointer, {
    de: `Der natürliche Name „${input.naturalName}“ kommt mehrfach vor; die Pointer-ID hält diesen Eintrag getrennt.`,
    en: `Natural name "${input.naturalName}" occurs more than once; the pointer ID keeps this entry distinct.`,
  }))

  const entry: ExplorerEntry = {
    id,
    sectionId: input.sectionId,
    ...(input.parentEntryId ? { parentEntryId: input.parentEntryId } : {}),
    title: input.title,
    searchText: `${input.pointer} ${input.title} ${searchableText(input.sourceValue)}`.trim(),
    origin: {
      filename: builder.filename,
      pointer: input.pointer,
      ...(input.guideLines ? { guideLines: input.guideLines } : {}),
    },
    detail: input.detail,
  }
  builder.entries.push(entry)
  if (!input.parentEntryId) section.entryIds.push(id)
  return id
}

function addStructuredEntry(
  builder: AdapterBuilder,
  sectionId: string,
  pointer: string,
  title: string,
  sourceValue: JsonValue,
  copyCommands: string[] = [],
): string {
  return addAdapterEntry(builder, {
    sectionId, pointer, title, sourceValue,
    detail: { kind: 'structured', sourceValue, rows: rowsFromSource(sourceValue), copyCommands },
  })
}

function genericFallback(entry: ManifestEntry, source: JsonValue, diagnostic: AdapterDiagnostic): ExplorerDataset {
  const dataset = createGenericExplorerDataset({
    ref: { toolId: entry.toolId, datasetId: entry.datasetId },
    snapshot: entry.snapshot,
    filename: entry.filename,
    sourceValue: source,
  })
  return { ...dataset, diagnostics: [diagnostic, ...snapshotDateDiagnostic(entry.snapshot)] }
}

function recordAt(value: JsonValue): JsonObject {
  return isJsonObject(value) ? value : {}
}

function arrayAt(record: JsonObject, key: string): JsonValue[] {
  const value = record[key]
  return Array.isArray(value) ? value : []
}

function pointerAt(pointer: string, key: string | number): string {
  return appendJsonPointer(pointer, key)
}

function addStructuredArray(
  builder: AdapterBuilder,
  sectionId: string,
  pointer: string,
  values: JsonValue[],
  titleOf: (value: JsonValue, index: number) => string,
  identity?: (value: JsonValue, index: number) => { prefix: string; name: string | null },
): void {
  values.forEach((value, index) => {
    const itemPointer = pointerAt(pointer, index)
    const natural = identity?.(value, index)
    addAdapterEntry(builder, {
      sectionId,
      pointer: itemPointer,
      title: titleOf(value, index),
      idPrefix: natural?.prefix ?? 'ptr',
      naturalName: natural?.name ?? null,
      sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value), copyCommands: [] },
    })
  })
}

function addStructuredRecord(
  builder: AdapterBuilder,
  sectionId: string,
  pointer: string,
  value: JsonValue,
  prefix: string,
): void {
  if (!isJsonObject(value)) return
  for (const [key, item] of Object.entries(value)) {
    const itemPointer = pointerAt(pointer, key)
    addStructuredEntry(builder, sectionId, itemPointer, key, item)
    const entry = builder.entries[builder.entries.length - 1]
    const natural = createEntryIdentity(prefix, key, itemPointer, builder.naturalIds, builder.entries.length - 1)
    // A record value uses a field-derived ID when its domain specifies one.
    if (prefix !== 'ptr' && natural.id !== entry.id && !builder.usedIds.has(natural.id)) {
      builder.usedIds.delete(entry.id)
      entry.id = natural.id
      builder.usedIds.add(entry.id)
      const section = builder.sectionMap.get(sectionId)
      if (section) section.entryIds[section.entryIds.length - 1] = entry.id
    }
    if (natural.duplicateName) builder.diagnostics.push(localizedDiagnostic('DuplicateEntryName', itemPointer, {
      de: `Der natürliche Name „${key}“ kommt mehrfach vor; der Eintrag bleibt über seinen Pointer eindeutig.`,
      en: `Natural name "${key}" occurs more than once; the entry remains unique through its pointer.`,
    }))
  }
}

function addStringArray(
  builder: AdapterBuilder,
  sectionId: string,
  pointer: string,
  values: JsonValue[],
  titlePrefix = '',
): void {
  values.forEach((value, index) => {
    if (typeof value !== 'string') return
    const itemPointer = pointerAt(pointer, index)
    addStructuredEntry(builder, sectionId, itemPointer, titlePrefix ? `${titlePrefix} ${index + 1}` : value, value)
  })
}

function addExampleEntry(
  builder: AdapterBuilder,
  input: {
    sectionId: string
    pointer: string
    title: string
    commands: string[]
    description: Presence<string>
    sourceValue: JsonValue
    idPrefix?: string
    naturalName?: string | null
  },
): void {
  addAdapterEntry(builder, {
    ...input,
    detail: { kind: 'example', description: input.description, commands: input.commands },
  })
}

function addGenericExtras(builder: AdapterBuilder, source: JsonValue, knownKeys: string[], parentPointer = ''): void {
  // Every specialized source gets a complete raw-search section, even when it
  // has no unknown top-level fields. Fachansichten keep their own entries and
  // IDs; raw entries use a separate namespace and point to the same snapshot.
  let section = builder.sectionMap.get('json')
  if (!section) {
    section = ensureSection(builder, 'json')
    const projection = projectGenericJson(builder.source, builder.filename)
    for (const [index, entry] of projection.entries.entries()) {
      entry.id = entry.origin.pointer.length + 4 > 2048
        ? `raw:node:${index}`
        : `raw:${entry.origin.pointer}`
      section.entryIds.push(entry.id)
      builder.usedIds.add(entry.id)
      builder.entries.push(entry)
    }
  }

  // Keep otherwise unsearchable empty structures addressable.
  if (isJsonObject(source)) {
    const known = new Set(knownKeys)
    for (const key of Object.keys(source)) {
      if (known.has(key)) continue
      const pointer = pointerAt(parentPointer, key)
      const projectionAtPointer = projectGenericJson(builder.source, builder.filename, { rootPointer: pointer })
      if (projectionAtPointer.totalEntries !== 0) continue
      const id = `raw:${pointer}`
      if (builder.usedIds.has(id)) continue
      section.entryIds.push(id)
      builder.usedIds.add(id)
      builder.entries.push({
        id,
        sectionId: 'json',
        title: key,
        searchText: pointer,
        origin: { filename: builder.filename, pointer },
        detail: { kind: 'generic', rootPointer: pointer },
      })
    }
  }
}

function finishAdapter(builder: AdapterBuilder): ExplorerDataset {
  return {
    ref: builder.ref,
    snapshot: builder.snapshot,
    sections: builder.sections,
    entries: builder.entries,
    diagnostics: builder.diagnostics,
  }
}

function adaptBrGuide(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  const guide = source.guide as string
  const headings = [
    ['Purpose:', 'purpose'],
    ['Machine-output defaults:', 'machine-output-defaults'],
    ['Start of session:', 'start-of-session'],
    ['Finding work:', 'finding-work'],
    ['Claiming work:', 'claiming-work'],
    ['Completing work:', 'completing-work'],
    ['Discovery:', 'discovery'],
    ['Safety:', 'safety'],
  ] as const
  const lines = guide.split('\n')
  const positions = lines.flatMap((line, index) => {
    const heading = headings.find(([title]) => line.replace(/\r$/, '') === title)
    return heading ? [{ index, title: heading[0], sectionId: heading[1] }] : []
  })
  const validHeadings = positions.length === headings.length && positions.every((position, index) =>
    position.title === headings[index][0])

  if (validHeadings) {
    positions.forEach((heading, index) => {
      const start = index === 0 ? 0 : heading.index
      const end = index + 1 < positions.length ? positions[index + 1].index - 1 : lines.length - 1
      const text = lines.slice(start, end + 1).join('\n')
      const pointer = '/guide'
      addAdapterEntry(builder, {
        sectionId: 'guide',
        pointer,
        idPrefix: 'guide',
        naturalName: heading.sectionId,
        title: heading.title.slice(0, -1),
        sourceValue: text,
        guideLines: { start: start + 1, end: end + 1 },
        detail: { kind: 'guide', text, copyCommands: [] },
      })
    })
  } else {
    addAdapterEntry(builder, {
      sectionId: 'guide', pointer: '/guide', idPrefix: 'guide', naturalName: 'original',
      title: 'Original guide', sourceValue: guide,
      guideLines: { start: 1, end: lines.length },
      detail: { kind: 'guide', text: guide, copyCommands: [] },
    })
  }

  arrayAt(source, 'canonical_commands').forEach((value, index) => {
    const row = recordAt(value)
    const task = row.task as string
    const command = row.command as string
    const pointer = pointerAt('/canonical_commands', index)
    addExampleEntry(builder, {
      sectionId: 'canonical-commands', pointer, title: task, commands: [command],
      description: { state: 'missing' }, sourceValue: value,
    })
  })
  addGenericExtras(builder, source, ['tool', 'version', 'contract_version', 'title', 'line_count', 'guide', 'canonical_commands'])
  return finishAdapter(builder)
}

function adaptBrCapabilities(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  arrayAt(source, 'commands').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, {
      sectionId: 'commands', pointer: pointerAt('/commands', index), idPrefix: 'cmd', naturalName: row.name as string,
      title: row.name as string, sourceValue: value,
      detail: {
        kind: 'br-command', summary: row.summary as string, operation: row.operation as 'read' | 'write' | 'mixed',
        workspace: row.workspace as 'required' | 'optional' | 'none', machineOutput: row.machine_output as string[],
        examples: row.examples as string[],
      },
    })
  })
  arrayAt(source, 'features').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, {
      sectionId: 'features', pointer: pointerAt('/features', index), idPrefix: 'feature', naturalName: row.name as string,
      title: row.name as string, sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value), copyCommands: [] },
    })
  })
  addStructuredRecord(builder, 'build', '/build_features', source.build_features as JsonValue, 'ptr')
  addStructuredArray(builder, 'flags', '/global_flags', arrayAt(source, 'global_flags'), (value) =>
    isJsonObject(value) && typeof value.flag === 'string' ? value.flag : 'Flag')
  addStringArray(builder, 'formats', '/output_formats', arrayAt(source, 'output_formats'))
  addStructuredArray(builder, 'exit-codes', '/exit_codes', arrayAt(source, 'exit_codes'), (value) =>
    isJsonObject(value) ? String(value.code ?? 'Exit code') : 'Exit code')
  addStructuredArray(builder, 'env', '/env_vars', arrayAt(source, 'env_vars'), (value) =>
    isJsonObject(value) && typeof value.name === 'string' ? value.name : 'Environment variable',
  (value) => ({ prefix: 'env', name: isJsonObject(value) && typeof value.name === 'string' ? value.name : null }))
  addStructuredArray(builder, 'safety', '/safety', arrayAt(source, 'safety'), (_value, index) => `Safety guarantee ${index + 1}`)
  arrayAt(source, 'recommended_entrypoints').forEach((value, index) => {
    if (typeof value !== 'string') return
    addExampleEntry(builder, { sectionId: 'entrypoints', pointer: pointerAt('/recommended_entrypoints', index),
      title: `Entrypoint ${index + 1}`, commands: [value], description: { state: 'missing' }, sourceValue: value })
  })
  addGenericExtras(builder, source, ['tool', 'version', 'contract_version', 'build_features', 'features', 'commands',
    'global_flags', 'output_formats', 'exit_codes', 'env_vars', 'safety', 'recommended_entrypoints'])
  return finishAdapter(builder)
}

function bvCommandDetail(row: JsonObject): EntryDetail {
  return {
    kind: 'bv-command',
    description: row.description as string,
    flag: row.flag as string,
    needsIssues: row.needs_issues as boolean,
    needsGit: row.needs_git as boolean,
    needsSprint: row.needs_sprint as boolean,
    needsBaseline: row.needs_baseline as boolean,
    mutatesState: row.mutates_state as boolean,
    params: presenceFromObject<string[]>(row, 'params'),
    keyFields: presenceFromObject<string[]>(row, 'key_fields'),
    preferredInvocation: presenceFromObject<string>(row, 'preferred_invocation'),
    acceptedInvocations: presenceFromObject<string[]>(row, 'accepted_invocations'),
  }
}

function addBvAliases(builder: AdapterBuilder, values: JsonValue[], basePointer: string): void {
  values.forEach((value, index) => {
    const row = recordAt(value)
    const canonical = row.canonical as string
    addAdapterEntry(builder, {
      sectionId: 'aliases', pointer: pointerAt(basePointer, index), title: row.agent_instinct as string,
      sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value), copyCommands: [canonical] },
    })
  })
}

function adaptBvDocs(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  const commands = recordAt(source.commands)
  for (const [name, value] of Object.entries(commands)) {
    const row = recordAt(value)
    addAdapterEntry(builder, {
      sectionId: 'commands', pointer: pointerAt('/commands', name), idPrefix: 'cmd', naturalName: name,
      title: name, sourceValue: value, detail: bvCommandDetail(row),
    })
  }
  addBvAliases(builder, arrayAt(recordAt(source.guide), 'agent_intent_aliases'), '/guide/agent_intent_aliases')
  arrayAt(source, 'examples').forEach((value, index) => {
    const row = recordAt(value)
    addExampleEntry(builder, {
      sectionId: 'examples', pointer: pointerAt('/examples', index), title: row.description as string,
      commands: [row.command as string], description: sourceStringPresence(row, 'description'), sourceValue: value,
    })
  })
  if (Object.hasOwn(source, 'guide')) addStructuredEntry(builder, 'guide', '/guide', 'Guide details', source.guide as JsonValue)
  if (Object.hasOwn(source, 'output_format')) addStructuredEntry(builder, 'formats', '/output_format', 'Output format', source.output_format as JsonValue)
  const guide = recordAt(source.guide)
  if (Object.hasOwn(guide, 'output_modes')) addStructuredEntry(builder, 'formats', '/guide/output_modes', 'Output modes', guide.output_modes as JsonValue)
  addStructuredRecord(builder, 'env', '/environment_variables', source.environment_variables as JsonValue, 'env')
  addStructuredRecord(builder, 'exit-codes', '/exit_codes', source.exit_codes as JsonValue, 'ptr')
  addGenericExtras(builder, source, ['commands', 'environment_variables', 'examples', 'exit_codes', 'generated_at', 'guide', 'output_format', 'topic', 'version'])
  return finishAdapter(builder)
}

function adaptBvCapabilities(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  arrayAt(source, 'commands').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, {
      sectionId: 'commands', pointer: pointerAt('/commands', index), idPrefix: 'cmd', naturalName: row.name as string,
      title: row.name as string, sourceValue: value, detail: bvCommandDetail(row),
    })
  })
  addBvAliases(builder, arrayAt(source, 'agent_intent_aliases'), '/agent_intent_aliases')
  addStringArray(builder, 'topics', '/docs_topics', arrayAt(source, 'docs_topics'))
  for (const key of ['default_robot_command', 'schema_command']) {
    if (typeof source[key] !== 'string') continue
    const pointer = pointerAt('', key)
    addExampleEntry(builder, { sectionId: 'entrypoints', pointer, title: key === 'default_robot_command' ? 'Default robot command' : 'Schema command',
      commands: [source[key] as string], description: { state: 'missing' }, sourceValue: source[key] as string })
  }
  addStringArray(builder, 'formats', '/output_formats', arrayAt(source, 'output_formats'))
  if (Object.hasOwn(source, 'stream_contract')) addStructuredEntry(builder, 'streams', '/stream_contract', 'Stream contract', source.stream_contract as JsonValue)
  addStructuredRecord(builder, 'env', '/environment_variables', source.environment_variables as JsonValue, 'env')
  addStructuredRecord(builder, 'exit-codes', '/exit_codes', source.exit_codes as JsonValue, 'ptr')
  addGenericExtras(builder, source, ['agent_intent_aliases', 'commands', 'contract_version', 'default_robot_command', 'docs_topics',
    'environment_variables', 'exit_codes', 'generated_at', 'output_formats', 'schema_command', 'stream_contract', 'tool', 'version'])
  return finishAdapter(builder)
}

function cassArgumentDetail(row: JsonObject): EntryDetail {
  return {
    kind: 'cass-argument',
    description: row.description as string,
    argType: row.arg_type as 'option' | 'flag' | 'positional',
    required: row.required as boolean,
    valueType: presenceFromObject<string>(row, 'value_type'),
    defaultValue: presenceFromObject<JsonValue>(row, 'default'),
    enumValues: presenceFromObject<JsonValue[]>(row, 'enum_values'),
    repeatable: presenceFromObject<boolean>(row, 'repeatable'),
    short: presenceFromObject<string>(row, 'short'),
  }
}

function adaptCassCapabilities(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  arrayAt(source, 'commands').forEach((value, index) => {
    const row = recordAt(value)
    const commandName = row.name as string
    const pointer = pointerAt('/commands', index)
    const commandId = addAdapterEntry(builder, {
      sectionId: 'commands', pointer, idPrefix: 'cmd', naturalName: commandName,
      title: commandName, sourceValue: value,
      detail: { kind: 'cass-command', description: row.description as string,
        hasJsonOutput: row.has_json_output as boolean, argumentEntryIds: [] },
    })
    const argumentIds: string[] = []
    arrayAt(row as JsonObject, 'arguments').forEach((argumentValue, argumentIndex) => {
      const argument = recordAt(argumentValue)
      const argumentName = argument.name as string
      const argumentPointer = pointerAt(pointerAt(pointer, 'arguments'), argumentIndex)
      const identityName = commandName.includes(':') ? null : argumentName
      argumentIds.push(addAdapterEntry(builder, {
        sectionId: 'commands', pointer: argumentPointer, idPrefix: `arg:${commandName}`, naturalName: identityName,
        title: argumentName, sourceValue: argumentValue, parentEntryId: commandId, detail: cassArgumentDetail(argument),
      }))
    })
    const commandEntry = builder.entries.find(({ id }) => id === commandId)
    if (commandEntry?.detail.kind === 'cass-command') commandEntry.detail.argumentEntryIds = argumentIds
  })
  arrayAt(source, 'global_flags').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, { sectionId: 'flags', pointer: pointerAt('/global_flags', index), title: row.name as string,
      sourceValue: value, detail: cassArgumentDetail(row) })
  })
  addStringArray(builder, 'features', '/features', arrayAt(source, 'features'))
  addStringArray(builder, 'connectors', '/connectors', arrayAt(source, 'connectors'))
  addStructuredArray(builder, 'env', '/env_vars', arrayAt(source, 'env_vars'), (value) =>
    isJsonObject(value) ? String(value.name ?? 'Environment variable') : 'Environment variable',
  (value) => ({ prefix: 'env', name: isJsonObject(value) && typeof value.name === 'string' ? value.name : null }))
  addStructuredArray(builder, 'exit-codes', '/exit_codes', arrayAt(source, 'exit_codes'), (value) =>
    isJsonObject(value) ? String(value.code ?? 'Exit code') : 'Exit code')
  arrayAt(source, 'workflows').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, {
      sectionId: 'workflows', pointer: pointerAt('/workflows', index), idPrefix: 'workflow', naturalName: row.name as string,
      title: row.name as string, sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value),
        copyCommands: [row.first_command as string, ...(row.follow_up_commands as string[])].filter(Boolean) },
    })
  })
  addStructuredArray(builder, 'recoveries', '/mistake_recoveries', arrayAt(source, 'mistake_recoveries'), (_value, index) => `Recovery ${index + 1}`)
  addStructuredRecord(builder, 'limits', '/limits', source.limits as JsonValue, 'ptr')
  addGenericExtras(builder, source, ['version', 'crate_version', 'build_commit', 'build_commit_date', 'api_version', 'contract_version',
    'features', 'connectors', 'global_flags', 'commands', 'exit_codes', 'env_vars', 'workflows', 'mistake_recoveries', 'limits'])
  return finishAdapter(builder)
}

function adaptEeCapabilities(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  const data = recordAt(source.data as JsonValue)
  arrayAt(data, 'commands').forEach((value, index) => {
    const row = recordAt(value)
    const name = row.name as string
    addAdapterEntry(builder, {
      sectionId: 'commands', pointer: pointerAt('/data/commands', index), idPrefix: 'cmd', naturalName: name,
      title: name, sourceValue: value,
      detail: { kind: 'ee-command', availableInSnapshot: row.available as boolean, pathParts: name.trim().split(/\s+/).filter(Boolean) },
    })
  })
  addStructuredArray(builder, 'subsystems', '/data/subsystems', arrayAt(data, 'subsystems'), (value) =>
    isJsonObject(value) ? String(value.name ?? 'Subsystem') : 'Subsystem')
  arrayAt(data, 'features').forEach((value, index) => {
    const row = recordAt(value)
    addAdapterEntry(builder, { sectionId: 'features', pointer: pointerAt('/data/features', index), idPrefix: 'feature',
      naturalName: row.name as string, title: row.name as string, sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value), copyCommands: [] } })
  })
  addStructuredArray(builder, 'unimplemented', '/data/unimplemented', arrayAt(data, 'unimplemented'), (_value, index) => `Unimplemented feature ${index + 1}`)
  addStructuredArray(builder, 'env', '/data/envOverrides', arrayAt(data, 'envOverrides'), (value) =>
    isJsonObject(value) ? String(value.name ?? 'Environment override') : 'Environment override',
  (value) => ({ prefix: 'env', name: isJsonObject(value) && typeof value.name === 'string' ? value.name : null }))

  const output = recordAt(data.output as JsonValue)
  addStructuredArray(builder, 'output', '/data/output/formats', arrayAt(output, 'formats'), (value) =>
    isJsonObject(value) ? String(value.name ?? 'Output format') : 'Output format')
  for (const key of ['toon', 'governor', 'sizeDiagnostics']) {
    if (Object.hasOwn(output, key)) addStructuredEntry(builder, 'output', pointerAt('/data/output', key), key, output[key])
  }
  for (const [pointer, title, value] of [
    ['/success', 'Success snapshot', source.success],
    ['/degraded', 'Degraded snapshot', source.degraded],
    ['/fields', 'Envelope fields', source.fields],
    ['/error', 'Envelope error', source.error],
    ['/data/binaries', 'Binary snapshot', data.binaries],
    ['/data/index', 'Index snapshot', data.index],
    ['/data/summary', 'Summary snapshot', data.summary],
  ] as const) {
    const key = pointer.slice(pointer.lastIndexOf('/') + 1)
    const owner = pointer.startsWith('/data/') ? data : source
    if (Object.hasOwn(owner, key)) addStructuredEntry(builder, 'snapshot', pointer, title, value as JsonValue)
  }

  addGenericExtras(builder, source, ['schema', 'success', 'fields', 'data', 'degraded'])
  addGenericExtras(builder, data, ['version', 'commands', 'subsystems', 'features', 'unimplemented', 'envOverrides', 'output', 'binaries', 'index', 'summary'], '/data')
  addGenericExtras(builder, output, ['formats', 'toon', 'governor', 'sizeDiagnostics'], '/data/output')
  return finishAdapter(builder)
}

function adaptFmdCapabilities(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  arrayAt(source, 'commands').forEach((value, index) => {
    const row = recordAt(value)
    const name = row.name as string
    addExampleEntry(builder, {
      sectionId: 'commands', pointer: pointerAt('/commands', index), idPrefix: 'cmd', naturalName: name,
      title: name, commands: row.examples as string[], description: sourceStringPresence(row, 'description'), sourceValue: value,
    })
  })
  if (isJsonObject(source.features)) {
    for (const [name, value] of Object.entries(source.features)) {
      const pointer = pointerAt('/features', name)
      addAdapterEntry(builder, { sectionId: 'features', pointer, idPrefix: 'feature', naturalName: name, title: name,
        sourceValue: value, detail: { kind: 'structured', sourceValue: value, rows: [], copyCommands: [] } })
    }
  }
  addStringArray(builder, 'outputs', '/outputs', arrayAt(source, 'outputs'))
  for (const [field, sectionId, title] of [
    ['theme_model', 'theme', 'Theme model'],
    ['pdf_running_content', 'pdf-running-content', 'PDF running content'],
  ] as const) {
    if (Object.hasOwn(source, field)) addStructuredEntry(builder, sectionId, pointerAt('', field), title, source[field])
  }
  addStructuredRecord(builder, 'exit-codes', '/exit_codes', source.exit_codes as JsonValue, 'ptr')
  addGenericExtras(builder, source, ['tool', 'version', 'contract_version', 'commands', 'outputs', 'theme_model', 'exit_codes', 'features', 'pdf_running_content'])
  return finishAdapter(builder)
}

function adaptUbsDocs(builder: AdapterBuilder, source: JsonObject): ExplorerDataset {
  if (Object.hasOwn(source, 'guide')) addStructuredEntry(builder, 'guide', '/guide', 'Scan workflow', source.guide as JsonValue)
  const commands = recordAt(source.commands as JsonValue)
  arrayAt(commands, 'subcommands').forEach((value, index) => {
    const row = recordAt(value)
    const name = row.name as string
    addAdapterEntry(builder, { sectionId: 'commands', pointer: pointerAt('/commands/subcommands', index), idPrefix: 'cmd',
      naturalName: name, title: name, sourceValue: value,
      detail: { kind: 'structured', sourceValue: value, rows: rowsFromSource(value), copyCommands: [row.usage as string] } })
  })
  arrayAt(commands, 'flags').forEach((value, index) => {
    const row = recordAt(value)
    addStructuredEntry(builder, 'flags', pointerAt('/commands/flags', index), row.name as string, value)
  })
  arrayAt(source, 'examples').forEach((value, index) => {
    const row = recordAt(value)
    addExampleEntry(builder, { sectionId: 'examples', pointer: pointerAt('/examples', index), title: row.goal as string,
      commands: [row.command as string], description: { state: 'missing' }, sourceValue: value })
  })
  addStructuredRecord(builder, 'formats', '/formats', source.formats as JsonValue, 'ptr')
  addStructuredArray(builder, 'exit-codes', '/exit_codes', arrayAt(source, 'exit_codes'), (value) =>
    isJsonObject(value) ? String(value.code ?? 'Exit code') : 'Exit code')
  addStructuredArray(builder, 'env', '/env', arrayAt(source, 'env'), (value) =>
    isJsonObject(value) ? String(value.name ?? 'Environment variable') : 'Environment variable',
  (value) => ({ prefix: 'env', name: isJsonObject(value) && typeof value.name === 'string' ? value.name : null }))
  addGenericExtras(builder, source, ['schema_version', 'ubs_version', 'topic', 'guide', 'commands', 'examples', 'exit_codes', 'formats', 'env'])
  return finishAdapter(builder)
}

/** Normalize one manifest-bound source; unknown contracts stay readable as generic JSON. */
export function adaptExplorerDataset(entry: ManifestEntry, sourceValue: JsonValue): ExplorerDataset {
  if (entry.adapter === 'generic-json') {
    return createGenericExplorerDataset({
      ref: { toolId: entry.toolId, datasetId: entry.datasetId },
      snapshot: entry.snapshot,
      filename: entry.filename,
      sourceValue,
    })
  }
  const identityError = checkAdapterIdentity(entry.adapter, sourceValue)
  if (identityError) return genericFallback(entry, sourceValue, identityError)
  const shapePointer = firstSourceShapeError(entry.adapter, sourceValue)
  if (shapePointer !== null) return genericFallback(entry, sourceValue, localizedDiagnostic('ContractShapeMismatch', shapePointer, {
    de: `Der Snapshot erfüllt die erwartete Feldform an ${shapePointer || 'der Quelle'} nicht; er wird generisch angezeigt.`,
    en: `Snapshot does not satisfy the expected field shape at ${shapePointer || 'the source'}; it is shown generically.`,
  }))

  const builder = createAdapterBuilder(entry, sourceValue)
  const source = sourceValue as JsonObject
  switch (entry.adapter) {
    case 'br-guide': return adaptBrGuide(builder, source)
    case 'br-capabilities': return adaptBrCapabilities(builder, source)
    case 'bv-docs': return adaptBvDocs(builder, source)
    case 'bv-capabilities': return adaptBvCapabilities(builder, source)
    case 'cass-capabilities': return adaptCassCapabilities(builder, source)
    case 'ee-capabilities': return adaptEeCapabilities(builder, source)
    case 'fmd-capabilities': return adaptFmdCapabilities(builder, source)
    case 'ubs-docs': return adaptUbsDocs(builder, source)
  }
}
