import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  createExplorerLoader,
  downloadOriginalJson,
  type ExplorerLoaderOptions,
} from '../src/data/loadExplorer.ts'
import type { DatasetRef, ExplorerManifest } from '../src/types/explorer.ts'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifestPath = join(projectRoot, 'public/robot-docs.manifest.json')
const sourceDirectory = join(projectRoot, 'public/robot-docs')
const manifestFixture = JSON.parse(await readFile(manifestPath, 'utf8')) as ExplorerManifest
const brRef: DatasetRef = { toolId: 'br', datasetId: 'robot-docs' }
const bvRef: DatasetRef = { toolId: 'bv', datasetId: 'robot-docs' }
const brEntry = manifestFixture.datasets.find(({ toolId, datasetId }) => toolId === brRef.toolId && datasetId === brRef.datasetId)
assert.ok(brEntry)

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function manifestWithEntry(patch: Partial<NonNullable<typeof brEntry>>): ExplorerManifest {
  const manifest = structuredClone(manifestFixture)
  const index = manifest.datasets.findIndex(({ toolId, datasetId }) => toolId === brRef.toolId && datasetId === brRef.datasetId)
  manifest.datasets[index] = { ...manifest.datasets[index], ...patch }
  return manifest
}

function asFetcher(run: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => run(String(input), init)) as typeof fetch
}

function loader(fetcher: typeof fetch, extra: Partial<ExplorerLoaderOptions> = {}) {
  return createExplorerLoader({ baseUrl: '/pages/', fetcher, ...extra })
}

test('manifest loading is independent and selected sources use fixed manifest URLs with verified raw-byte caching', async () => {
  const brBytes = await readFile(join(sourceDirectory, brEntry.filename))
  const calls: { url: string; cache: RequestCache | undefined }[] = []
  const fetcher = asFetcher(async (url, init) => {
    calls.push({ url, cache: init?.cache })
    if (url.endsWith('/robot-docs.manifest.json')) return new Response(JSON.stringify(manifestFixture))
    assert.equal(url, `/pages/robot-docs/${brEntry.filename}?v=${brEntry.sha256}`)
    return new Response(brBytes)
  })
  const instance = loader(fetcher)

  const manifestResult = await instance.loadManifest()
  assert.equal(manifestResult.status, 'ready')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/pages/robot-docs.manifest.json')
  assert.equal(manifestResult.status === 'ready' && manifestResult.manifest.datasets.length, 8)

  const unknown = await instance.loadDataset({ toolId: 'unknown', datasetId: 'anything' })
  assert.equal(unknown.status, 'unknown-dataset')
  assert.equal(calls.length, 1)

  const loaded = await instance.loadDataset(brRef)
  assert.equal(loaded.status, 'ready')
  if (loaded.status !== 'ready') return
  assert.deepEqual(loaded.sourceBytes, new Uint8Array(brBytes))
  assert.equal(loaded.manifestEntry.sha256, brEntry.sha256)
  assert.equal(loaded.dataset.ref.toolId, 'br')
  assert.equal(calls[1].url, `/pages/robot-docs/${brEntry.filename}?v=${brEntry.sha256}`)

  const cached = await instance.loadDataset(brRef)
  assert.equal(cached.status, 'ready')
  assert.equal(calls.length, 2)
})

test('default fetch keeps the global receiver when the loader invokes it', async () => {
  const originalFetch = globalThis.fetch
  let fetchReceiverIsGlobal = false
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    fetchReceiverIsGlobal = this === globalThis
    assert.equal(String(input), '/pages/robot-docs.manifest.json')
    assert.equal(init?.method, 'GET')
    return Promise.resolve(new Response(JSON.stringify(manifestFixture)))
  } as typeof fetch

  try {
    const result = await createExplorerLoader({ baseUrl: '/pages/' }).loadManifest()
    assert.equal(result.status, 'ready')
    assert.equal(fetchReceiverIsGlobal, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('manifest bindings are checked against the registry before any source request', async () => {
  const badManifest = manifestWithEntry({ adapter: 'generic-json' as NonNullable<typeof brEntry>['adapter'] })
  const calls: string[] = []
  const instance = loader(asFetcher(async (url) => {
    calls.push(url)
    return new Response(JSON.stringify(badManifest))
  }))

  const result = await instance.loadManifest()
  assert.equal(result.status, 'error')
  assert.equal(result.status === 'error' && result.error.code, 'ManifestRegistryMismatch')
  const dataset = await instance.loadDataset(brRef)
  assert.equal(dataset.status, 'error')
  assert.equal(calls.length, 1)
})

test('a refreshed manifest snapshot cannot reuse an old ViewModel provenance value', async () => {
  const sourceBytes = await readFile(join(sourceDirectory, brEntry.filename))
  let currentManifest = manifestFixture
  let sourceRequests = 0
  const instance = loader(asFetcher(async (url) => {
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(currentManifest))
    sourceRequests += 1
    return new Response(sourceBytes)
  }))

  await instance.loadManifest()
  const initial = await instance.loadDataset(brRef)
  assert.equal(initial.status, 'ready')

  const updatedSnapshot = {
    ...brEntry.snapshot,
    version: { state: 'value' as const, value: 'refreshed-snapshot', pointer: '/version' },
  }
  currentManifest = manifestWithEntry({ snapshot: updatedSnapshot })
  await instance.loadManifest({ refresh: true })
  const refreshed = await instance.loadDataset(brRef)

  assert.equal(refreshed.status, 'ready')
  assert.deepEqual(refreshed.status === 'ready' && refreshed.dataset.snapshot.version, updatedSnapshot.version)
  assert.equal(sourceRequests, 1)
})

test('HTTP failures are transport errors and do not attempt to parse response bodies', async () => {
  let manifestBodyReads = 0
  const manifestFailure = loader(asFetcher(async () => ({
    ok: false,
    status: 503,
    arrayBuffer: async () => { manifestBodyReads += 1; return new ArrayBuffer(0) },
  } as Response)))
  const manifestResult = await manifestFailure.loadManifest()
  assert.equal(manifestResult.status, 'error')
  assert.equal(manifestResult.status === 'error' && manifestResult.error.kind, 'transport')
  assert.equal(manifestBodyReads, 0)

  const dataFailure = loader(asFetcher(async (url) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(manifestFixture))
    : new Response('missing', { status: 404 })))
  assert.equal((await dataFailure.loadManifest()).status, 'ready')
  const datasetResult = await dataFailure.loadDataset(brRef)
  assert.equal(datasetResult.status, 'error')
  assert.equal(datasetResult.status === 'error' && datasetResult.error.kind, 'transport')
})

test('length and SHA-256 mismatches remain integrity errors and missing crypto never skips verification', async () => {
  const sourceBytes = await readFile(join(sourceDirectory, brEntry.filename))
  const wrongLengthManifest = manifestWithEntry({ bytes: brEntry.bytes + 1 })
  const wrongLengthLoader = loader(asFetcher(async (url) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(wrongLengthManifest))
    : new Response(sourceBytes)))
  await wrongLengthLoader.loadManifest()
  const wrongLength = await wrongLengthLoader.loadDataset(brRef)
  assert.equal(wrongLength.status, 'error')
  assert.equal(wrongLength.status === 'error' && wrongLength.error.code, 'ByteLengthMismatch')

  const expectedDifferentDigest = hash(Uint8Array.of(1, 2, 3))
  const wrongDigestManifest = manifestWithEntry({ sha256: expectedDifferentDigest })
  const wrongDigestLoader = loader(asFetcher(async (url) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(wrongDigestManifest))
    : new Response(sourceBytes)))
  await wrongDigestLoader.loadManifest()
  const wrongDigest = await wrongDigestLoader.loadDataset(brRef)
  assert.equal(wrongDigest.status, 'error')
  assert.equal(wrongDigest.status === 'error' && wrongDigest.error.code, 'DigestMismatch')

  const noCryptoLoader = loader(asFetcher(async (url) => url.endsWith('manifest.json')
    ? new Response(JSON.stringify(manifestFixture))
    : new Response(sourceBytes)), { crypto: null })
  await noCryptoLoader.loadManifest()
  const noCrypto = await noCryptoLoader.loadDataset(brRef)
  assert.equal(noCrypto.status, 'error')
  assert.equal(noCrypto.status === 'error' && noCrypto.error.code, 'DigestUnavailable')
})

test('fatal UTF-8 decoding and JSON parsing happen only after valid length and digest checks', async (t) => {
  const cases = [
    { name: 'invalid UTF-8', bytes: Uint8Array.of(0xff, 0xfe), code: 'DatasetInvalidUtf8', kind: 'decode' },
    { name: 'invalid JSON', bytes: new TextEncoder().encode('{'), code: 'DatasetInvalidJson', kind: 'parse' },
  ] as const

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const alteredManifest = manifestWithEntry({ bytes: scenario.bytes.byteLength, sha256: hash(scenario.bytes) })
      const instance = loader(asFetcher(async (url) => url.endsWith('manifest.json')
        ? new Response(JSON.stringify(alteredManifest))
        : new Response(scenario.bytes)))
      await instance.loadManifest()
      const result = await instance.loadDataset(brRef)
      assert.equal(result.status, 'error')
      assert.equal(result.status === 'error' && result.error.code, scenario.code)
      assert.equal(result.status === 'error' && result.error.kind, scenario.kind)
    })
  }
})

test('retry refreshes the manifest with no-cache and keeps a repeated CDN digest conflict visible', async () => {
  const sourceBytes = await readFile(join(sourceDirectory, brEntry.filename))
  const staleDigest = hash(Uint8Array.of(9, 8, 7))
  let currentManifest = manifestWithEntry({ sha256: staleDigest })
  const calls: { url: string; cache: RequestCache | undefined }[] = []
  const instance = loader(asFetcher(async (url, init) => {
    calls.push({ url, cache: init?.cache })
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(currentManifest))
    return new Response(sourceBytes)
  }))

  await instance.loadManifest()
  const initial = await instance.loadDataset(brRef)
  assert.equal(initial.status === 'error' && initial.error.code, 'DigestMismatch')

  const repeated = await instance.retryDataset(brRef)
  assert.equal(repeated.status === 'error' && repeated.error.code, 'DigestMismatch')
  assert.equal(calls[2].cache, 'no-cache')
  assert.ok(calls[3].url.endsWith(`?v=${staleDigest}`))

  currentManifest = manifestFixture
  const refreshed = await instance.retryDataset(brRef)
  assert.equal(refreshed.status, 'ready')
  assert.equal(calls[4].cache, 'no-cache')
  assert.ok(calls[5].url.endsWith(`?v=${brEntry.sha256}`))
})

test('retry re-resolves dataset identity after a manifest change and does not fetch a removed source', async () => {
  let currentManifest = manifestFixture
  const calls: string[] = []
  const instance = loader(asFetcher(async (url) => {
    calls.push(url)
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(currentManifest))
    return new Response('should not be requested')
  }))
  await instance.loadManifest()
  currentManifest = { schema: 'cli-tool-explorer.manifest.v1', datasets: [] }

  const result = await instance.retryDataset(brRef)
  assert.equal(result.status, 'unknown-dataset')
  assert.equal(calls.length, 2)
  assert.ok(calls.every((url) => url.endsWith('robot-docs.manifest.json')))
})

test('selection changes abort the previous request and a late A response cannot replace B', async () => {
  const brBytes = await readFile(join(sourceDirectory, brEntry.filename))
  const bvEntry = manifestFixture.datasets.find(({ toolId, datasetId }) => toolId === bvRef.toolId && datasetId === bvRef.datasetId)
  assert.ok(bvEntry)
  const bvBytes = await readFile(join(sourceDirectory, bvEntry.filename))
  let releaseA!: (response: Response) => void
  const delayedA = new Promise<Response>((resolveResponse) => { releaseA = resolveResponse })
  let signalA: AbortSignal | undefined
  const instance = loader(asFetcher(async (url, init) => {
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(manifestFixture))
    if (url.includes(brEntry.filename)) {
      signalA = init?.signal ?? undefined
      return delayedA
    }
    return new Response(bvBytes)
  }))
  await instance.loadManifest()

  const requestA = instance.loadDataset(brRef)
  const requestB = instance.loadDataset(bvRef)
  const resultB = await requestB
  assert.equal(resultB.status, 'ready')
  assert.equal(resultB.status === 'ready' && resultB.dataset.ref.toolId, 'bv')
  assert.equal(signalA?.aborted, true)

  releaseA(new Response(brBytes))
  const resultA = await requestA
  assert.equal(resultA.status, 'stale')
  assert.equal(instance.manifestEpoch, resultB.manifestEpoch)
})

test('StrictMode cleanup followed by setup ignores the old manifest and dataset responses', async () => {
  const brBytes = await readFile(join(sourceDirectory, brEntry.filename))
  let releaseManifest!: (response: Response) => void
  const delayedManifest = new Promise<Response>((resolveResponse) => { releaseManifest = resolveResponse })
  let manifestCalls = 0
  let releaseDataset!: (response: Response) => void
  const delayedDataset = new Promise<Response>((resolveResponse) => { releaseDataset = resolveResponse })
  let datasetCalls = 0
  const instance = loader(asFetcher(async (url) => {
    if (url.endsWith('manifest.json')) {
      manifestCalls += 1
      return manifestCalls === 1 ? delayedManifest : new Response(JSON.stringify(manifestFixture))
    }
    datasetCalls += 1
    return datasetCalls === 1 ? delayedDataset : new Response(brBytes)
  }))

  const firstManifest = instance.loadManifest()
  instance.cancelManifestLoad()
  const secondManifest = await instance.loadManifest()
  assert.equal(secondManifest.status, 'ready')
  releaseManifest(new Response(JSON.stringify(manifestFixture)))
  assert.equal((await firstManifest).status, 'stale')

  const firstDataset = instance.loadDataset(brRef)
  instance.cancelDatasetLoad()
  const secondDataset = await instance.loadDataset(brRef)
  assert.equal(secondDataset.status, 'ready')
  releaseDataset(new Response(brBytes))
  assert.equal((await firstDataset).status, 'stale')
})

test('original download uses verified bytes, a stable JSON MIME type, and releases its Blob URL', async () => {
  const originalBytes = new TextEncoder().encode('{ "verbatim" : true }\n')
  const events: string[] = []
  let scheduled: (() => void) | undefined
  let downloadedBlob: Blob | undefined
  const anchor = {
    href: '',
    download: '',
    click: () => { events.push('click') },
    remove: () => { events.push('remove') },
  }
  downloadOriginalJson(originalBytes, 'source.json', {
    document: {
      createElement: () => anchor as unknown as HTMLAnchorElement,
      body: { appendChild: () => { events.push('append') } } as unknown as HTMLElement,
    },
    urls: {
      createObjectURL: (blob) => {
        downloadedBlob = blob
        events.push('create')
        return 'blob:source'
      },
      revokeObjectURL: (url) => { events.push(`revoke:${url}`) },
    },
    schedule: (callback) => { scheduled = callback },
  })

  assert.equal(anchor.download, 'source.json')
  assert.equal(anchor.href, 'blob:source')
  assert.equal(downloadedBlob?.type, 'application/json;charset=utf-8')
  assert.deepEqual(new Uint8Array(await downloadedBlob?.arrayBuffer()), originalBytes)
  assert.deepEqual(events, ['create', 'append', 'click', 'remove'])
  assert.ok(scheduled)
  scheduled?.()
  assert.equal(events.at(-1), 'revoke:blob:source')
})
