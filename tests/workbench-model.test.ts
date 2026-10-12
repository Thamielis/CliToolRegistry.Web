import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyNavigationPatch,
  compareCatalogs,
  createNavigationTicket,
  dependencyEdges,
  isWorkbenchHistoryData,
  navigationUrl,
  parseNavigation,
  readWorkbenchHistoryData,
  transitionExplorerNavigation,
  withWorkbenchHistoryData,
  WORKBENCH_HISTORY_KEY,
} from '../src/data/workbench.ts'
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

test('explorer URLs keep catalog state separate, normalize docCount, and order repeated needs', () => {
  const state = parseNavigation('?section=explore&q=git&tool=git&category=terminal&platform=linux&sort=category&view=list&count=96&exploreTool=br&dataset=robot-docs&docSection=commands&entry=cmd%3Alist&docQ=write&docCount=120&operation=read&needs=git&needs=issues&needs=git&needs=custom')
  assert.equal(state.section, 'explore')
  assert.equal(state.query, 'git')
  assert.equal(state.tool, 'git')
  assert.equal(state.category, 'terminal')
  assert.equal(state.platform, 'linux')
  assert.equal(state.sort, 'category')
  assert.equal(state.view, 'list')
  assert.equal(state.count, 96)
  assert.equal(state.exploreTool, 'br')
  assert.equal(state.dataset, 'robot-docs')
  assert.equal(state.docSection, 'commands')
  assert.equal(state.entry, 'cmd:list')
  assert.equal(state.docQ, 'write')
  assert.equal(state.docCount, 120)
  assert.equal(state.operation, 'read')
  assert.deepEqual(state.needs, ['issues', 'git', 'custom'])

  const url = navigationUrl(state, 'https://example.test/CliToolRegistry.Web/?campaign=docs#old')
  const parsedUrl = new URL(url, 'https://example.test')
  assert.equal(parsedUrl.searchParams.get('q'), 'git')
  assert.equal(parsedUrl.searchParams.get('tool'), 'git')
  assert.equal(parsedUrl.searchParams.get('category'), 'terminal')
  assert.equal(parsedUrl.searchParams.get('platform'), 'linux')
  assert.equal(parsedUrl.searchParams.get('sort'), 'category')
  assert.equal(parsedUrl.searchParams.get('view'), 'list')
  assert.equal(parsedUrl.searchParams.get('count'), '96')
  assert.deepEqual(parsedUrl.searchParams.getAll('needs'), ['issues', 'git', 'custom'])
  assert.equal(parsedUrl.searchParams.get('campaign'), 'docs')
  assert.equal(parsedUrl.hash, '')
})

test('explorer parser keeps unknown IDs for resolution and rejects overlong IDs without truncating them', () => {
  const unknown = parseNavigation('?section=explore&exploreTool=future-tool&dataset=future-data&docSection=future-section&entry=cmd%3Afuture')
  assert.equal(unknown.routeError, null)
  assert.equal(unknown.exploreTool, 'future-tool')
  assert.equal(unknown.dataset, 'future-data')
  assert.equal(unknown.docSection, 'future-section')
  assert.equal(unknown.entry, 'cmd:future')

  const overlongTool = parseNavigation(`?section=explore&exploreTool=${'x'.repeat(65)}`)
  assert.equal(overlongTool.routeError, 'invalid-route')
  assert.equal(overlongTool.exploreTool, null)
  const overlongEntry = parseNavigation(`?section=explore&exploreTool=br&entry=${'x'.repeat(2049)}`)
  assert.equal(overlongEntry.routeError, 'invalid-route')
  assert.equal(overlongEntry.entry, null)
  assert.equal(parseNavigation('?section=explore&dataset=robot-docs').routeError, 'invalid-route')
})

test('docQ truncates by Unicode codepoint and invalid filter domains remain raw for the async resolver', () => {
  const longQuery = '😀'.repeat(501)
  const state = parseNavigation(`?section=explore&exploreTool=br&dataset=capabilities&docQ=${encodeURIComponent(longQuery)}&operation=unknown&available=maybe&needs=bogus&docCount=10001`)
  assert.equal(Array.from(state.docQ).length, 500)
  assert.equal(state.docQ.endsWith('😀'), true)
  assert.equal(state.docQTruncated, true)
  assert.equal(state.operation, 'unknown')
  assert.equal(state.available, 'maybe')
  assert.deepEqual(state.needs, ['bogus'])
  assert.equal(state.docCount, 10000)
  assert.equal(parseNavigation('?section=explore&docCount=0').docCount, 48)
  assert.equal(parseNavigation('?section=explore&docCount=1').docCount, 1)
})

test('leaving explore removes only explorer-owned query parameters', () => {
  const explorer = parseNavigation('?section=explore&q=keep&category=terminal&campaign=a&exploreTool=br&dataset=robot-docs&docQ=copy&needs=git&available=yes')
  const next = applyNavigationPatch(explorer, { section: 'catalog' })
  const url = new URL(navigationUrl(next, 'https://example.test/?q=keep&category=terminal&campaign=a&exploreTool=br&dataset=robot-docs&docQ=copy&needs=git&available=yes'), 'https://example.test')
  assert.equal(url.searchParams.get('q'), 'keep')
  assert.equal(url.searchParams.get('category'), 'terminal')
  assert.equal(url.searchParams.get('campaign'), 'a')
  for (const key of ['exploreTool', 'dataset', 'docQ', 'needs', 'available']) assert.equal(url.searchParams.has(key), false)
  assert.equal(next.tool, null)
  assert.equal(next.exploreTool, null)
  assert.equal(next.docQ, '')
})

test('explorer transition rules reset only the context required by each action', () => {
  const state = parseNavigation('?section=explore&exploreTool=br&dataset=capabilities&docSection=commands&entry=cmd%3Alist&docQ=issues&docCount=96&operation=read&needs=issues')
  const toolChange = transitionExplorerNavigation(state, { type: 'tool', toolId: 'cass' })
  assert.equal(toolChange.cause, 'push')
  assert.equal(toolChange.focusTarget, 'heading')
  assert.equal(toolChange.state.exploreTool, 'cass')
  assert.equal(toolChange.state.dataset, null)
  assert.equal(toolChange.state.docSection, null)
  assert.equal(toolChange.state.docQ, '')
  assert.equal(toolChange.state.docCount, 48)
  assert.equal(toolChange.state.operation, 'all')

  const datasetChange = transitionExplorerNavigation(state, { type: 'dataset', ref: { toolId: 'br', datasetId: 'robot-docs' } })
  assert.equal(datasetChange.state.exploreTool, 'br')
  assert.equal(datasetChange.state.dataset, 'robot-docs')
  assert.equal(datasetChange.state.docQ, '')
  assert.equal(datasetChange.state.entry, null)

  const sectionChange = transitionExplorerNavigation(state, { type: 'section', sectionId: 'features' })
  assert.equal(sectionChange.cause, 'push')
  assert.equal(sectionChange.state.docSection, 'features')
  assert.equal(sectionChange.state.docQ, 'issues')
  assert.equal(sectionChange.state.entry, null)

  const search = transitionExplorerNavigation(state, { type: 'search', value: 'new query' })
  assert.equal(search.cause, 'replace')
  assert.equal(search.state.docQ, 'new query')
  assert.equal(search.state.docCount, 48)
  assert.equal(search.state.entry, null)
  assert.equal(search.state.operation, 'read')

  const entry = transitionExplorerNavigation(state, { type: 'entry', entryId: 'cmd:show' })
  assert.equal(entry.cause, 'push')
  assert.equal(entry.focusTarget, 'entry')
  assert.equal(entry.state.docQ, 'issues')
  assert.equal(entry.state.operation, 'read')
  const close = transitionExplorerNavigation(entry.state, { type: 'close-entry' })
  assert.equal(close.cause, 'replace')
  assert.equal(close.focusTarget, 'trigger')
  assert.equal(close.state.entry, null)

  const more = transitionExplorerNavigation(state, { type: 'more', docCount: 144 })
  assert.equal(more.cause, 'replace')
  assert.equal(more.focusTarget, 'more')
  assert.equal(more.state.docCount, 144)
})

test('history payload helpers preserve foreign fields and validate only stable scroll/focus data', () => {
  const data = { historyId: 'entry-1', scrollY: 140.5, focusKey: 'screen:catalog' }
  const objectState = withWorkbenchHistoryData({ foreign: 'kept' }, data)
  assert.equal(objectState.foreign, 'kept')
  assert.deepEqual(objectState[WORKBENCH_HISTORY_KEY], data)
  assert.deepEqual(readWorkbenchHistoryData(objectState), data)
  assert.equal(isWorkbenchHistoryData({ ...data, scrollY: Number.POSITIVE_INFINITY }), false)
  assert.equal(isWorkbenchHistoryData({ ...data, scrollY: -1 }), false)
  assert.equal(isWorkbenchHistoryData({ ...data, focusKey: 4 }), false)

  const primitiveState = withWorkbenchHistoryData('external-state', data)
  assert.equal(primitiveState.foreignState, 'external-state')
  assert.deepEqual(readWorkbenchHistoryData(primitiveState), data)
  assert.equal(createNavigationTicket('entry-1', 3), 'entry-1:3')
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
