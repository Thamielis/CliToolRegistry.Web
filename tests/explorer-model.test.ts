import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  buildExplorerManifest,
  serializeExplorerManifest,
} from '../scripts/build-explorer-manifest.mjs'
import {
  createEntryIdentity,
  createGenericExplorerDataset,
  escapeJsonPointerSegment,
  presenceFromObject,
  projectGenericJson,
  resolveJsonPointer,
} from '../src/data/explorerAdapters.ts'
import { validateExplorerRegistry } from '../src/data/explorerRegistryValidation.mjs'
import type { ExplorerManifest, ExplorerRegistry, JsonValue } from '../src/types/explorer.ts'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const registryPath = join(projectRoot, 'src/data/explorerRegistry.json')
const registry = JSON.parse(await readFile(registryPath, 'utf8')) as ExplorerRegistry

function fixtureRegistry(filename = 'sample.json'): ExplorerRegistry {
  return {
    schema: 'cli-tool-explorer.registry.v1',
    tools: [{ toolId: 'sample', fallbackName: 'Sample' }],
    datasets: [{
      toolId: 'sample',
      datasetId: 'source',
      filename,
      format: 'json',
      adapter: 'generic-json',
      title: { de: 'Beispiel', en: 'Sample' },
    }],
  }
}

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'cli-tool-explorer-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function addJson(directory: string, filename: string, value: unknown) {
  await writeFile(join(directory, filename), JSON.stringify(value), 'utf8')
}

test('registry declares eight JSON datasets for six tools and excludes the text export', () => {
  assert.deepEqual(validateExplorerRegistry(registry), [])
  assert.equal(registry.tools.length, 6)
  assert.equal(registry.datasets.length, 8)
  assert.equal(registry.datasets.some(({ filename }) => filename === 'fmd.robot-docs.json'), false)
  assert.equal(registry.datasets.some(({ filename }) => filename === 'br.robot-docs.json'), true)
  assert.equal(registry.datasets.some(({ filename }) => filename === 'bv.capabilities.json'), true)
})

test('registry validation rejects duplicate identities, filenames, unsafe names, and unknown tools', () => {
  const duplicateDataset = fixtureRegistry()
  duplicateDataset.datasets.push({ ...duplicateDataset.datasets[0] })
  assert.ok(validateExplorerRegistry(duplicateDataset).some(({ code }) => code === 'DuplicateDataset'))
  assert.ok(validateExplorerRegistry(duplicateDataset).some(({ code }) => code === 'DuplicateFilename'))

  const unsafe = fixtureRegistry('../outside.json')
  assert.ok(validateExplorerRegistry(unsafe).some(({ code }) => code === 'UnsafeFilename'))

  const unknownTool = fixtureRegistry()
  unknownTool.datasets[0].toolId = 'missing'
  assert.ok(validateExplorerRegistry(unknownTool).some(({ code }) => code === 'InvalidRegistry'))
})

test('manifest uses raw byte size and SHA-256, source pointers, sorted rows, and one final LF', async () => {
  const sources = join(projectRoot, 'public/robot-docs')
  const fmdTextPath = join(sources, 'fmd.robot-docs.json')
  const beforeTextExport = await readFile(fmdTextPath)
  const first = await buildExplorerManifest({ registry, sourceDirectory: sources })
  const second = await buildExplorerManifest({ registry, sourceDirectory: sources })
  assert.ok(first.manifest)
  assert.deepEqual(first.diagnostics.map(({ code, source }) => [code, source]), [
    ['IgnoredNonJson', 'robot-docs/fmd.robot-docs.json'],
  ])
  assert.equal(first.manifest.datasets.length, 8)

  const sorted = [...first.manifest.datasets].sort((left, right) =>
    left.toolId < right.toolId ? -1 : left.toolId > right.toolId ? 1 :
      left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1 : 0)
  assert.deepEqual(first.manifest.datasets, sorted)
  for (const entry of first.manifest.datasets) {
    const raw = await readFile(join(sources, entry.filename))
    assert.equal(entry.bytes, raw.byteLength)
    assert.equal(entry.sha256, createHash('sha256').update(raw).digest('hex'))
    assert.equal(entry.sha256, entry.sha256.toLowerCase())
  }

  const bvDocs = first.manifest.datasets.find(({ toolId, datasetId }) => toolId === 'bv' && datasetId === 'robot-docs')
  const bvSource = JSON.parse(await readFile(join(sources, 'bv.robot-docs.json'), 'utf8')) as Record<string, unknown>
  assert.deepEqual(bvDocs?.snapshot.generatedAt, {
    state: 'value',
    value: bvSource.generated_at,
    pointer: '/generated_at',
  })
  const ee = first.manifest.datasets.find(({ toolId }) => toolId === 'ee')
  const eeSource = JSON.parse(await readFile(join(sources, 'ee.capabilities.json'), 'utf8')) as { data?: { version?: unknown } }
  assert.deepEqual(ee?.snapshot.version, {
    state: 'value',
    value: eeSource.data?.version,
    pointer: '/data/version',
  })

  const contents = serializeExplorerManifest(first.manifest as ExplorerManifest)
  assert.equal(contents.endsWith('\n'), true)
  assert.equal(contents.endsWith('\n\n'), false)
  assert.equal(contents, serializeExplorerManifest(second.manifest as ExplorerManifest))
  assert.deepEqual(await readFile(fmdTextPath), beforeTextExport)
})

test('directory enumeration order does not change generated manifest bytes', async () => {
  const sourceDirectory = join(projectRoot, 'public/robot-docs')
  const normal = await buildExplorerManifest({ registry, sourceDirectory })
  const reversed = await buildExplorerManifest({
    registry,
    sourceDirectory,
    readDirectory: async (directory: string) => (await readdir(directory, { withFileTypes: true })).reverse(),
  })
  assert.ok(normal.manifest)
  assert.ok(reversed.manifest)
  assert.equal(serializeExplorerManifest(normal.manifest as ExplorerManifest),
    serializeExplorerManifest(reversed.manifest as ExplorerManifest))
})

test('valid scalar JSON roots remain valid generic sources, including null', async () => {
  await withDirectory(async (directory) => {
    await addJson(directory, 'sample.json', null)
    const result = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.ok(result.manifest)
    assert.equal(result.manifest.datasets.length, 1)
    assert.deepEqual(result.manifest.datasets[0].snapshot.version, { state: 'missing' })
  })
})

test('adding an ignored text file leaves manifest bytes unchanged', async () => {
  await withDirectory(async (directory) => {
    await addJson(directory, 'sample.json', { version: '1' })
    const baseline = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.ok(baseline.manifest)
    const baselineBytes = serializeExplorerManifest(baseline.manifest as ExplorerManifest)
    await writeFile(join(directory, 'plain-text.json'), 'This is not a JSON document.', 'utf8')
    const withText = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.ok(withText.manifest)
    assert.equal(serializeExplorerManifest(withText.manifest as ExplorerManifest), baselineBytes)
    assert.ok(withText.diagnostics.some(({ code }) => code === 'IgnoredNonJson'))
  })
})

test('invalid UTF-8 and malformed JSON are ignored and never produce public entries', async () => {
  await withDirectory(async (directory) => {
    await writeFile(join(directory, 'sample.json'), Buffer.from([0xff, 0xfe]))
    await writeFile(join(directory, 'notes.json'), '{broken', 'utf8')
    const result = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.ok(result.manifest)
    assert.deepEqual(result.manifest.datasets, [])
    assert.deepEqual(result.diagnostics.map(({ code, source }) => [code, source]), [
      ['IgnoredNonJson', 'robot-docs/notes.json'],
      ['IgnoredNonJson', 'robot-docs/sample.json'],
    ])
  })
})

test('missing registered files and valid unregistered JSON fail generation', async () => {
  await withDirectory(async (directory) => {
    await addJson(directory, 'extra.json', { visible: false })
    const result = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.equal(result.manifest, null)
    assert.deepEqual(result.diagnostics.map(({ code }) => code), ['MissingRegisteredFile', 'UnexpectedInventoryFile'])
  })
})

test('symlink JSON candidates are rejected without reading their targets', async () => {
  await withDirectory(async (directory) => {
    const target = join(directory, 'target.json')
    await writeFile(target, '{"private":true}', 'utf8')
    await symlink(target, join(directory, 'sample.json'))
    const result = await buildExplorerManifest({ registry: fixtureRegistry(), sourceDirectory: directory })
    assert.equal(result.manifest, null)
    assert.ok(result.diagnostics.some(({ code }) => code === 'UnsafeFilename'))
  })
})

test('registry failure is returned before touching source files', async () => {
  await withDirectory(async (directory) => {
    const invalid = fixtureRegistry('..\\secret.json')
    const result = await buildExplorerManifest({ registry: invalid, sourceDirectory: directory })
    assert.equal(result.manifest, null)
    assert.ok(result.diagnostics.some(({ code }) => code === 'UnsafeFilename'))
  })
})

test('RFC 6901 escaping and resolution preserve special keys and distinguish null from missing', () => {
  const source = JSON.parse('{"a~/b":{"":"empty-key","__proto__":{"safe":false}},"arr":[null,0]}') as JsonValue
  const encoded = escapeJsonPointerSegment('a~/b')
  assert.equal(encoded, 'a~0~1b')
  assert.deepEqual(resolveJsonPointer(source, '/a~0~1b/'), { state: 'value', value: 'empty-key' })
  assert.deepEqual(resolveJsonPointer(source, '/a~0~1b/__proto__/safe'), { state: 'value', value: false })
  assert.deepEqual(resolveJsonPointer(source, '/arr/0'), { state: 'null' })
  assert.deepEqual(resolveJsonPointer(source, '/arr/1'), { state: 'value', value: 0 })
  assert.deepEqual(resolveJsonPointer(source, '/arr/00'), { state: 'missing' })
  assert.deepEqual(resolveJsonPointer(source, '/a~2b'), { state: 'missing' })
  assert.deepEqual(resolveJsonPointer(source, '/constructor'), { state: 'missing' })
})

test('presence retains false, null, zero, and empty strings without truthiness checks', () => {
  const source = JSON.parse('{"flag":false,"nothing":null,"count":0,"text":""}') as Record<string, JsonValue>
  assert.deepEqual(presenceFromObject<boolean>(source, 'flag'), { state: 'value', value: false })
  assert.deepEqual(presenceFromObject<JsonValue>(source, 'nothing'), { state: 'null' })
  assert.deepEqual(presenceFromObject<number>(source, 'count'), { state: 'value', value: 0 })
  assert.deepEqual(presenceFromObject<string>(source, 'text'), { state: 'value', value: '' })
  assert.deepEqual(presenceFromObject<string>(source, 'missing'), { state: 'missing' })
})

test('generic JSON indexes scalar leaves in source order with pointer and scalar search text', () => {
  const source = JSON.parse('{"first":true,"nested":{"a/b":null,"~key":0},"last":""}') as JsonValue
  const projection = projectGenericJson(source, 'sample.json')
  assert.equal(projection.totalEntries, 4)
  assert.equal(projection.hasMore, false)
  assert.deepEqual(projection.entries.map(({ origin }) => origin.pointer), [
    '/first', '/nested/a~1b', '/nested/~0key', '/last',
  ])
  assert.deepEqual(projection.entries.map(({ id }) => id), [
    'ptr:/first', 'ptr:/nested/a~1b', 'ptr:/nested/~0key', 'ptr:/last',
  ])
  assert.ok(projection.entries[0].searchText.includes('true'))
  assert.ok(projection.entries[1].searchText.includes('null'))
  assert.ok(projection.entries[2].searchText.includes('0'))
  assert.ok(projection.entries[3].searchText.includes('/last'))
  assert.deepEqual(projection.entries[2].detail, { kind: 'generic', rootPointer: '/nested/~0key' })
})

test('generic reader supports scalar roots, bounded result pages, and subtrees', () => {
  const roots: JsonValue[] = [null, false, 0, '', 'root text']
  for (const value of roots) {
    const projection = projectGenericJson(value, 'scalar.json')
    assert.equal(projection.totalEntries, 1)
    assert.equal(projection.entries[0].origin.pointer, '')
    assert.equal(projection.entries[0].id, 'ptr:')
    assert.ok(projection.entries[0].searchText.includes(value === null ? 'null' : String(value)))
  }

  const source = JSON.parse('{"first":1,"nested":{"a":2,"b":3},"last":4}') as JsonValue
  const page = projectGenericJson(source, 'sample.json', { offset: 1, limit: 2 })
  assert.deepEqual(page.entries.map(({ origin }) => origin.pointer), ['/nested/a', '/nested/b'])
  assert.equal(page.totalEntries, 4)
  assert.equal(page.hasMore, true)

  const subtree = projectGenericJson(source, 'sample.json', { rootPointer: '/nested', limit: 1 })
  assert.deepEqual(subtree.entries.map(({ origin }) => origin.pointer), ['/nested/a'])
  assert.equal(subtree.totalEntries, 2)
  assert.equal(subtree.hasMore, true)
  assert.equal(projectGenericJson(source, 'sample.json', { rootPointer: '/missing' }).totalEntries, 0)
})

test('generic traversal handles deep input iteratively and keeps long pointers in provenance', () => {
  let source: JsonValue = 'deep value'
  for (let index = 0; index < 12_000; index += 1) source = [source]
  const projection = projectGenericJson(source, 'deep.json')
  assert.equal(projection.totalEntries, 1)
  assert.equal(projection.entries[0].id, 'node:0')
  assert.equal(projection.entries[0].origin.pointer, '/0'.repeat(12_000))
  assert.ok(projection.entries[0].searchText.endsWith('deep value'))
})

test('duplicate natural names use stable pointer identities and diagnose ambiguity', () => {
  const ids = new Set<string>()
  const first = createEntryIdentity('cmd', 'show', '/commands/0', ids, 0)
  const duplicate = createEntryIdentity('cmd', 'show', '/commands/1', ids, 1)
  const separator = createEntryIdentity('cmd', 'show:all', '/commands/2', ids, 2)
  const malformedUnicode = createEntryIdentity('cmd', '\ud800', '/commands/3', ids, 3)
  assert.deepEqual(first, { id: 'cmd:show', duplicateName: false })
  assert.deepEqual(duplicate, { id: 'ptr:/commands/1', duplicateName: true })
  assert.deepEqual(separator, { id: 'ptr:/commands/2', duplicateName: false })
  assert.deepEqual(malformedUnicode, { id: 'node:3', duplicateName: false })
})

test('generic datasets keep source identity scoped to the dataset reference', () => {
  const snapshot = {
    version: { state: 'missing' },
    contract: { state: 'missing' },
    generatedAt: { state: 'missing' },
  } as const
  const sourceValue = JSON.parse('{"commands":[{"name":"same"}]}') as JsonValue
  const left = createGenericExplorerDataset({
    ref: { toolId: 'br', datasetId: 'capabilities' }, snapshot, filename: 'br.json', sourceValue,
  })
  const right = createGenericExplorerDataset({
    ref: { toolId: 'bv', datasetId: 'capabilities' }, snapshot, filename: 'bv.json', sourceValue,
  })
  assert.deepEqual(left.entries.map(({ id }) => id), right.entries.map(({ id }) => id))
  assert.notDeepEqual(left.ref, right.ref)
  assert.equal(left.sections[0].entryIds.length, left.entries.length)
})
