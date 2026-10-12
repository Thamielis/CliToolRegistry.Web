import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { adaptExplorerDataset, resolveJsonPointer } from '../src/data/explorerAdapters.ts'
import type { ExplorerDataset, ExplorerEntry, ExplorerManifest, ManifestEntry } from '../src/types/explorer.ts'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifest = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs.manifest.json'), 'utf8')) as ExplorerManifest

async function readSource(entry: ManifestEntry): Promise<unknown> {
  return JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', entry.filename), 'utf8')) as unknown
}

function dataset(toolId: string, datasetId: string): ManifestEntry {
  const entry = manifest.datasets.find((item) => item.toolId === toolId && item.datasetId === datasetId)
  assert.ok(entry, `manifest entry ${toolId}/${datasetId} exists`)
  return entry
}

function entriesIn(datasetValue: ExplorerDataset, sectionId: string): ExplorerEntry[] {
  return datasetValue.entries.filter((entry) => entry.sectionId === sectionId)
}

function detail<T extends ExplorerEntry['detail']['kind']>(entry: ExplorerEntry, kind: T): Extract<ExplorerEntry['detail'], { kind: T }> {
  assert.equal(entry.detail.kind, kind)
  return entry.detail as Extract<ExplorerEntry['detail'], { kind: T }>
}

test('all eight real JSON sources use their declared specialized adapter', async () => {
  assert.equal(manifest.datasets.length, 8)
  const adapted = await Promise.all(manifest.datasets.map(async (entry) => {
    const raw = await readSource(entry)
    const result = adaptExplorerDataset(entry, raw as never)
    assert.equal(result.ref.toolId, entry.toolId)
    assert.equal(result.ref.datasetId, entry.datasetId)
    assert.equal(result.diagnostics.some(({ code }) => code === 'UnsupportedContract' || code === 'ContractShapeMismatch'), false,
      `${entry.adapter} accepts its current source`)
    assert.equal(new Set(result.entries.map(({ id }) => id)).size, result.entries.length,
      `${entry.adapter} entry IDs are unique within the dataset`)
    for (const entryValue of result.entries) {
      assert.notEqual(resolveJsonPointer(raw as never, entryValue.origin.pointer).state, 'missing',
        `${entry.adapter} pointer ${entryValue.origin.pointer} resolves`)
    }
    for (const section of result.sections) {
      assert.deepEqual(section.entryIds, result.entries.filter((item) => item.sectionId === section.id && !item.parentEntryId).map(({ id }) => id))
    }
    const rawSection = result.sections.find(({ id }) => id === 'json')
    assert.ok(rawSection, `${entry.adapter} exposes the universal JSON source section`)
    const rawEntries = entriesIn(result, 'json')
    assert.ok(rawEntries.length > 0, `${entry.adapter} indexes scalar values from the complete source`)
    assert.ok(rawEntries.every(({ id, detail: item }) => id.startsWith('raw:') && item.kind === 'generic'),
      `${entry.adapter} keeps raw-source entries separate from specialized identities`)
    return { manifestEntry: entry, source: raw, dataset: result }
  }))

  const brGuide = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'br-guide')?.dataset
  assert.ok(brGuide)
  assert.equal(entriesIn(brGuide, 'guide').length, 8)
  assert.equal(entriesIn(brGuide, 'canonical-commands').length, 8)
  assert.ok(entriesIn(brGuide, 'guide').every(({ origin }) => origin.pointer === '/guide' && origin.guideLines))

  const brCapabilities = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'br-capabilities')?.dataset
  assert.ok(brCapabilities)
  assert.equal(entriesIn(brCapabilities, 'commands').length, 46)
  assert.equal(entriesIn(brCapabilities, 'features').length, 5)

  const bvDocs = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'bv-docs')?.dataset
  assert.ok(bvDocs)
  assert.equal(entriesIn(bvDocs, 'commands').length, 41)
  assert.equal(entriesIn(bvDocs, 'aliases').length, 18)
  assert.equal(entriesIn(bvDocs, 'examples').length, 10)

  const bvCapabilities = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'bv-capabilities')?.dataset
  assert.ok(bvCapabilities)
  assert.equal(entriesIn(bvCapabilities, 'commands').length, 41)
  assert.equal(entriesIn(bvCapabilities, 'aliases').length, 18)
  assert.ok(entriesIn(bvCapabilities, 'commands').every(({ origin }) => origin.pointer.startsWith('/commands/')))

  const cass = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'cass-capabilities')?.dataset
  assert.ok(cass)
  assert.equal(entriesIn(cass, 'commands').filter(({ detail: item }) => item.kind === 'cass-command').length, 47)
  const cassArguments = entriesIn(cass, 'commands').filter(({ detail: item }) => item.kind === 'cass-argument')
  assert.equal(cassArguments.length, 314)
  assert.ok(cassArguments.every(({ parentEntryId }) => cass.entries.some((item) => item.id === parentEntryId && item.detail.kind === 'cass-command')))

  const ee = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'ee-capabilities')?.dataset
  assert.ok(ee)
  const eeCommands = entriesIn(ee, 'commands').map((item) => detail(item, 'ee-command'))
  assert.equal(eeCommands.length, 557)
  assert.equal(new Set(eeCommands.map(({ pathParts }) => pathParts[0])).size, 112)
  assert.equal(eeCommands.filter(({ availableInSnapshot }) => !availableInSnapshot).length, 1)
  assert.equal(entriesIn(ee, 'env').length, 130)

  const fmd = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'fmd-capabilities')?.dataset
  assert.ok(fmd)
  assert.equal(entriesIn(fmd, 'commands').length, 11)
  assert.equal(entriesIn(fmd, 'features').length, 48)
  assert.ok(entriesIn(fmd, 'features').some(({ detail: item }) => item.kind === 'structured' && item.sourceValue === 'available_v0_embedded_subset_fonts'))

  const ubs = adapted.find(({ manifestEntry }) => manifestEntry.adapter === 'ubs-docs')?.dataset
  assert.ok(ubs)
  assert.equal(entriesIn(ubs, 'commands').length, 6)
  assert.equal(entriesIn(ubs, 'flags').length, 45)
})

test('unknown contracts and malformed required fields fall back to searchable generic JSON', async () => {
  const brEntry = dataset('br', 'capabilities')
  const brSource = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', brEntry.filename), 'utf8')) as Record<string, unknown>
  const unknownContract = { ...brSource, contract_version: 'br.capabilities.vNext' }
  const unsupported = adaptExplorerDataset(brEntry, unknownContract as never)
  assert.equal(unsupported.entries.every(({ detail: item }) => item.kind === 'generic'), true)
  assert.equal(unsupported.diagnostics[0].code, 'UnsupportedContract')
  assert.equal(unsupported.diagnostics[0].pointer, '/contract_version')

  const badCommand = { ...brSource, commands: [...brSource.commands as object[]] }
  ;(badCommand.commands[0] as Record<string, unknown>).summary = 42
  const mismatched = adaptExplorerDataset(brEntry, badCommand as never)
  assert.equal(mismatched.entries.every(({ detail: item }) => item.kind === 'generic'), true)
  assert.equal(mismatched.diagnostics[0].code, 'ContractShapeMismatch')
  assert.equal(mismatched.diagnostics[0].pointer, '/commands/0/summary')
  assert.ok(mismatched.entries.some(({ searchText }) => searchText.includes('42')))
})

test('duplicate command names keep separate pointer IDs and produce a localized diagnostic', async () => {
  const entry = dataset('br', 'capabilities')
  const original = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', entry.filename), 'utf8')) as Record<string, unknown>
  const source = structuredClone(original) as Record<string, unknown>
  const commands = source.commands as Record<string, unknown>[]
  commands.push({ ...commands[0] })
  const result = adaptExplorerDataset(entry, source as never)
  const matching = entriesIn(result, 'commands').filter(({ title }) => title === commands[0].name)
  assert.equal(matching.length, 2)
  assert.notEqual(matching[0].id, matching[1].id)
  assert.ok(matching.some(({ id }) => id.startsWith('ptr:/commands/')))
  assert.ok(result.diagnostics.some(({ code, pointer }) => code === 'DuplicateEntryName' && pointer === '/commands/46'))
})

test('guide headings fall back as a complete original when the conservative heading gate fails', async () => {
  const entry = dataset('br', 'robot-docs')
  const source = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', entry.filename), 'utf8')) as Record<string, unknown>
  const guide = source.guide as string
  const changed = { ...source, guide: guide.replace('Purpose:', 'Purpose') }
  const result = adaptExplorerDataset(entry, changed as never)
  assert.equal(entriesIn(result, 'guide').length, 1)
  assert.equal(entriesIn(result, 'guide')[0].id, 'guide:original')
  assert.equal(detail(entriesIn(result, 'guide')[0], 'guide').text, changed.guide)
})

test('Cass arguments and EE envelope values preserve boolean, null, zero, and source-specific command data', async () => {
  const cassEntry = dataset('cass', 'capabilities')
  const cassSource = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', cassEntry.filename), 'utf8')) as Record<string, unknown>
  const cass = adaptExplorerDataset(cassEntry, cassSource as never)
  const flagArgument = entriesIn(cass, 'commands').find(({ detail: item }) =>
    item.kind === 'cass-argument' && item.defaultValue?.state === 'value' && item.defaultValue.value === 'false')
  assert.ok(flagArgument)
  assert.equal(detail(flagArgument, 'cass-argument').defaultValue.state, 'value')

  const limits = entriesIn(cass, 'limits').filter(({ detail: item }) => item.kind === 'structured')
  const zeroLimit = limits.find(({ detail: item }) => item.kind === 'structured' && item.sourceValue === 0)
  assert.ok(zeroLimit)

  const eeEntry = dataset('ee', 'capabilities')
  const eeSource = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', eeEntry.filename), 'utf8')) as Record<string, unknown>
  const ee = adaptExplorerDataset(eeEntry, eeSource as never)
  const firstEnv = entriesIn(ee, 'env').find(({ origin }) => origin.pointer === '/data/envOverrides/0')
  assert.ok(firstEnv?.detail.kind === 'structured')
  assert.deepEqual(firstEnv.detail.rows.find(({ label }) => label === 'defaultValue')?.value, { state: 'null' })
  const unavailable = entriesIn(ee, 'commands').find(({ title }) => title === 'mcp serve-stdio')
  assert.ok(unavailable)
  assert.equal(detail(unavailable, 'ee-command').availableInSnapshot, false)
})

test('additional top-level source fields remain generically searchable', async () => {
  const entry = dataset('br', 'capabilities')
  const original = JSON.parse(await readFile(join(projectRoot, 'public/robot-docs', entry.filename), 'utf8')) as Record<string, unknown>
  const source = { ...original, future_extension: { nested: ['retained'] } }
  const result = adaptExplorerDataset(entry, source as never)
  const extra = result.entries.find(({ origin }) => origin.pointer === '/future_extension/nested/0')
  assert.ok(extra)
  assert.equal(extra.detail.kind, 'generic')
  assert.ok(extra.searchText.includes('retained'))
})
