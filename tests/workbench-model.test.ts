import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareCatalogs, dependencyEdges, navigationUrl, parseNavigation } from '../src/data/workbench.ts'
import { isCatalogSnapshot } from '../src/data/loadApps.ts'
import type { CatalogSnapshot, CliTool } from '../src/types/app.ts'

const tool = (id: string, changes: Partial<CliTool> = {}): CliTool => ({ id, name: id, description: 'A tool', command: id,
  category: 'terminal', tier: 'optional', platforms: ['linux'], catalogFile: 'tools.yml', catalogUrl: 'https://example.com/tools.yml', ...changes })
const snapshot = (tools: CliTool[]): CatalogSnapshot => ({ tools, fileCount: 1, loadedAt: '2026-10-09T00:00:00Z' })

test('URL state round-trips, preserves unrelated parameters and bounds malformed input', () => {
  const state = parseNavigation('?section=dependencies&tool=git&q=a%26b&category=terminal&platform=linux&sort=category&view=list&count=96')
  const url = navigationUrl(state, 'https://example.com/CliToolRegistry.Web/?campaign=docs#old')
  assert.equal(url.startsWith('/CliToolRegistry.Web/?'), true)
  assert.equal(new URL(url, 'https://example.com').searchParams.get('campaign'), 'docs')
  assert.deepEqual(parseNavigation(new URL(url, 'https://example.com').search), state)
  assert.deepEqual(parseNavigation('?section=bad&platform=bad&view=bad&count=Infinity'), parseNavigation(''))
  assert.equal(parseNavigation('?count=999999').count, 10000)
  assert.equal(parseNavigation('?count=-1').count, 48)
  assert.equal(parseNavigation('?tool=git').section, 'catalog')
})

test('graph retains direction, dual kinds, self/cyclic edges, exact IDs and unresolved references', () => {
  const edges = dependencyEdges([tool('a', { dependencies: { required: ['b', 'b', 'a', 'Git'], recommended: ['b', 'missing'] } }),
    tool('b', { dependencies: { required: ['a'] } }), tool('git')])
  assert.equal(edges.length, 6)
  assert.ok(edges.some((edge) => edge.from === 'b' && edge.to === 'a' && edge.resolved))
  assert.ok(edges.some((edge) => edge.from === 'a' && edge.to === 'a'))
  assert.equal(edges.find((edge) => edge.to === 'Git')?.resolved, false)
  assert.equal(edges.filter((edge) => edge.from === 'a' && edge.to === 'b').length, 2)
  assert.equal(edges.find((edge) => edge.to === 'missing')?.resolved, false)
})

test('lab canonicalizes set fields and keys while preserving ordered notes and actual field changes', () => {
  const a = tool('a', { tags: ['one', 'two'], platforms: ['linux', 'macos'], dependencies: { required: ['b', 'c'] }, install: { linux: { apt: 'install a', name: 'a' } }, notes: ['first', 'second'] })
  const b = { ...a, tags: ['two', 'one', 'one'], platforms: ['macos', 'linux'] as CliTool['platforms'], dependencies: { required: ['c', 'b'] }, install: { linux: { name: 'a', apt: 'install a' } } }
  assert.deepEqual(compareCatalogs(snapshot([a]), { ...snapshot([b]), loadedAt: '2026-10-10T00:00:00Z' }), [])
  const changes = compareCatalogs(snapshot([a, tool('removed')]), snapshot([{ ...b, notes: ['second', 'first'], description: 'Changed' }, tool('added')]))
  assert.deepEqual(changes.map((change) => [change.id, change.kind]), [['a', 'modified'], ['added', 'added'], ['removed', 'removed']])
  assert.deepEqual(changes[0].fields, ['description', 'notes'])
  assert.equal(changes[1].before, null)
  assert.equal(changes[2].after, null)
  assert.deepEqual(a.notes, ['first', 'second'])
})

test('validation rejects corrupt cached/live data and unsafe resource links', () => {
  assert.equal(isCatalogSnapshot(snapshot([tool('git')])), true)
  const invalidSnapshots = [null, {}, { ...snapshot([]), loadedAt: 'not-a-date' }, { ...snapshot([]), fileCount: -1 },
    snapshot([tool('git'), tool('git')]), snapshot([tool('x', { website: 'javascript:alert(1)' })]),
    snapshot([tool('x', { platforms: ['unknown'] as unknown as CliTool['platforms'] })]),
    snapshot([tool('x', { dependencies: { required: [42] as unknown as string[] } })])]
  // Isolate each invalid case; UBS's intermodule taint analysis does not converge on a loop here.
  invalidSnapshots.forEach((value) => {
    assert.equal(isCatalogSnapshot(value), false)
  })
})

test('1000-tool comparison and graph stay exact without mutating their input', () => {
  const before = snapshot(Array.from({ length: 1000 }, (_, i) => tool('tool-' + i, { dependencies: { required: i ? ['tool-0'] : [] } })))
  const after = snapshot([...before.tools.slice(1).map((item) => item.id === 'tool-5' ? { ...item, command: 'new-command' } : item), tool('new')])
  assert.equal(dependencyEdges(before.tools).length, 999)
  assert.deepEqual(compareCatalogs(before, after).map((change) => [change.id, change.kind]), [['new', 'added'], ['tool-0', 'removed'], ['tool-5', 'modified']])
  assert.equal(before.tools[5].command, 'tool-5')
})
