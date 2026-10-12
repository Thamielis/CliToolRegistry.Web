import type {
  DatasetRef,
  ExplorerDataset,
  ExplorerManifest,
  ExplorerRegistry,
  JsonValue,
  ManifestEntry,
} from '../types/explorer'
import rawRegistry from './explorerRegistry.json' with { type: 'json' }
import { adaptExplorerDataset } from './explorerAdapters.ts'
import { isSafeExplorerFilename, validateExplorerRegistry } from './explorerRegistryValidation.mjs'

const registryDiagnostics = validateExplorerRegistry(rawRegistry)
if (registryDiagnostics.length > 0) {
  throw new Error('The explorer registry is invalid.')
}
const explorerRegistry = rawRegistry as ExplorerRegistry

export type ExplorerLoadErrorKind = 'transport' | 'integrity' | 'decode' | 'parse' | 'manifest'

export type ExplorerLoadError = {
  kind: ExplorerLoadErrorKind
  code: string
  message: string
  retryable: boolean
}

type RequestIdentity = { manifestEpoch: number; requestId: number }

export type ManifestLoadResult =
  | ({ status: 'ready'; manifest: ExplorerManifest } & RequestIdentity)
  | ({ status: 'error'; error: ExplorerLoadError } & RequestIdentity)
  | ({ status: 'cancelled' | 'stale' } & RequestIdentity)

export type DatasetLoadResult =
  | ({
      status: 'ready'
      manifestEntry: ManifestEntry
      sourceValue: JsonValue
      sourceBytes: Uint8Array
      dataset: ExplorerDataset
    } & RequestIdentity)
  | ({ status: 'error'; error: ExplorerLoadError } & RequestIdentity)
  | ({ status: 'unknown-dataset'; ref: DatasetRef } & RequestIdentity)
  | ({ status: 'cancelled' | 'stale' } & RequestIdentity)

export type ExplorerLoaderOptions = {
  baseUrl: string
  registry?: ExplorerRegistry
  fetcher?: typeof fetch
  crypto?: Pick<Crypto, 'subtle'> | null
}

export type LoadOptions = { signal?: AbortSignal }

type ValidatedManifest = { manifest: ExplorerManifest } | { error: ExplorerLoadError }

type CachedRawSource = { bytes: Uint8Array; sourceValue: JsonValue }

const JSON_MIME = 'application/json;charset=utf-8'
const SHA256_PATTERN = /^[0-9a-f]{64}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string'
}

function isSourcePointer(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || value.startsWith('/'))
}

function isSourcedPresence(value: unknown): boolean {
  if (!isRecord(value) || typeof value.state !== 'string') return false
  if (value.state === 'missing') return true
  if (value.state === 'null') return isSourcePointer(value.pointer)
  return value.state === 'value' && typeof value.value === 'string' && isSourcePointer(value.pointer)
}

function datasetIdentity(ref: DatasetRef): string {
  return JSON.stringify([ref.toolId, ref.datasetId])
}

function rawCacheIdentity(entry: ManifestEntry): string {
  return `${entry.filename}\u0000${entry.sha256}`
}

function viewModelCacheIdentity(entry: ManifestEntry): string {
  return JSON.stringify([
    entry.toolId,
    entry.datasetId,
    entry.adapter,
    entry.filename,
    entry.sha256,
  ])
}

function makeError(
  kind: ExplorerLoadErrorKind,
  code: string,
  message: string,
  retryable = false,
): ExplorerLoadError {
  return { kind, code, message, retryable }
}

function manifestMismatch(message: string): ValidatedManifest {
  return { error: makeError('manifest', 'ManifestRegistryMismatch', message) }
}

function validateManifest(value: unknown, registry: ExplorerRegistry): ValidatedManifest {
  if (!isRecord(value) || value.schema !== 'cli-tool-explorer.manifest.v1' || !Array.isArray(value.datasets)) {
    return {
      error: makeError('manifest', 'InvalidManifest', 'The explorer manifest has an unsupported shape.'),
    }
  }

  const registrations = new Map(registry.datasets.map((entry) => [datasetIdentity(entry), entry]))
  const identities = new Set<string>()
  const filenames = new Set<string>()
  const datasets: ManifestEntry[] = []

  for (const candidate of value.datasets) {
    if (!isRecord(candidate) || !hasString(candidate, 'toolId') || !hasString(candidate, 'datasetId')) {
      return manifestMismatch('The explorer manifest contains an entry without a dataset identity.')
    }

    const ref: DatasetRef = {
      toolId: candidate.toolId as string,
      datasetId: candidate.datasetId as string,
    }
    const identity = datasetIdentity(ref)
    const registration = registrations.get(identity)
    if (!registration) return manifestMismatch(`The manifest contains an unregistered dataset (${identity}).`)
    if (identities.has(identity)) return manifestMismatch(`The manifest repeats dataset ${identity}.`)
    identities.add(identity)

    if (
      candidate.filename !== registration.filename ||
      candidate.format !== 'json' ||
      candidate.adapter !== registration.adapter ||
      !isRecord(candidate.title) ||
      candidate.title.de !== registration.title.de ||
      candidate.title.en !== registration.title.en
    ) {
      return manifestMismatch(`The manifest binding for ${identity} differs from the static registry.`)
    }
    if (!isSafeExplorerFilename(candidate.filename)) {
      return manifestMismatch(`The manifest filename for ${identity} is not a safe basename.`)
    }
    if (filenames.has(candidate.filename)) return manifestMismatch(`The manifest repeats filename ${candidate.filename}.`)
    filenames.add(candidate.filename)

    if (!Number.isSafeInteger(candidate.bytes) || (candidate.bytes as number) < 0 ||
        typeof candidate.sha256 !== 'string' || !SHA256_PATTERN.test(candidate.sha256)) {
      return manifestMismatch(`The manifest integrity metadata for ${identity} is invalid.`)
    }
    if (!isRecord(candidate.snapshot) || !isSourcedPresence(candidate.snapshot.version) ||
        !isSourcedPresence(candidate.snapshot.contract) || !isSourcedPresence(candidate.snapshot.generatedAt)) {
      return manifestMismatch(`The manifest snapshot metadata for ${identity} is invalid.`)
    }

    datasets.push(candidate as unknown as ManifestEntry)
  }

  return {
    manifest: {
      schema: 'cli-tool-explorer.manifest.v1',
      datasets,
    },
  }
}

function sourceUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  if (base.includes('?') || base.includes('#')) {
    throw new TypeError('The asset base URL must not contain a query or fragment.')
  }
  return `${base}${path}`
}

function datasetUrl(baseUrl: string, entry: ManifestEntry): string {
  return `${sourceUrl(baseUrl, `robot-docs/${entry.filename}`)}?v=${entry.sha256}`
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError'
}

function bindExternalSignal(controller: AbortController, signal?: AbortSignal): () => void {
  if (!signal) return () => undefined
  if (signal.aborted) {
    controller.abort(signal.reason)
    return () => undefined
  }
  const abort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abort, { once: true })
  return () => signal.removeEventListener('abort', abort)
}

export class ExplorerLoader {
  private readonly baseUrl: string
  private readonly registry: ExplorerRegistry
  private readonly fetcher: typeof fetch
  private readonly subtle: Pick<Crypto, 'subtle'>['subtle'] | undefined
  private manifestRequestId = 0
  private datasetRequestId = 0
  private epoch = 0
  private currentManifest: ExplorerManifest | undefined
  private activeManifestController: AbortController | undefined
  private activeDatasetController: AbortController | undefined
  private readonly rawCache = new Map<string, CachedRawSource>()
  private readonly viewModelCache = new Map<string, ExplorerDataset>()

  constructor(options: ExplorerLoaderOptions) {
    this.baseUrl = options.baseUrl
    this.registry = options.registry ?? explorerRegistry
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis)
    const cryptoOptionWasSupplied = Object.prototype.hasOwnProperty.call(options, 'crypto')
    const cryptoProvider = cryptoOptionWasSupplied ? options.crypto : globalThis.crypto
    this.subtle = cryptoProvider?.subtle
  }

  get manifestEpoch(): number {
    return this.epoch
  }

  get manifest(): ExplorerManifest | undefined {
    return this.currentManifest
  }

  /** Fetch and bind the shared manifest. Dataset bytes are never fetched here. */
  async loadManifest(options: LoadOptions & { refresh?: boolean } = {}): Promise<ManifestLoadResult> {
    this.cancelDatasetLoad()
    this.activeManifestController?.abort()
    const controller = new AbortController()
    const unbindSignal = bindExternalSignal(controller, options.signal)
    this.activeManifestController = controller
    const requestId = ++this.manifestRequestId
    const manifestEpoch = ++this.epoch
    this.currentManifest = undefined

    try {
      if (controller.signal.aborted) return { status: 'cancelled', requestId, manifestEpoch }
      const response = await this.fetcher(sourceUrl(this.baseUrl, 'robot-docs.manifest.json'), {
        method: 'GET',
        cache: options.refresh ? 'no-cache' : 'default',
        signal: controller.signal,
      })
      if (controller.signal.aborted && this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'cancelled', requestId, manifestEpoch }
      }
      if (!this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'stale', requestId, manifestEpoch }
      }
      if (!response.ok) {
        return {
          status: 'error', requestId, manifestEpoch,
          error: makeError('transport', 'ManifestHttpError', `Manifest request returned HTTP ${response.status}.`, true),
        }
      }

      const bytes = new Uint8Array(await response.arrayBuffer())
      if (controller.signal.aborted && this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'cancelled', requestId, manifestEpoch }
      }
      if (!this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'stale', requestId, manifestEpoch }
      }

      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        return {
          status: 'error', requestId, manifestEpoch,
          error: makeError('decode', 'ManifestInvalidUtf8', 'The explorer manifest is not valid UTF-8.'),
        }
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return {
          status: 'error', requestId, manifestEpoch,
          error: makeError('parse', 'ManifestInvalidJson', 'The explorer manifest is not valid JSON.'),
        }
      }

      const validation = validateManifest(parsed, this.registry)
      if ('error' in validation) return { status: 'error', requestId, manifestEpoch, error: validation.error }
      if (!this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'stale', requestId, manifestEpoch }
      }
      this.currentManifest = validation.manifest
      return { status: 'ready', manifest: validation.manifest, requestId, manifestEpoch }
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return { status: 'cancelled', requestId, manifestEpoch }
      }
      if (!this.isCurrentManifestRequest(requestId, manifestEpoch)) {
        return { status: 'stale', requestId, manifestEpoch }
      }
      return {
        status: 'error', requestId, manifestEpoch,
        error: makeError('transport', 'ManifestTransportError', 'The explorer manifest could not be loaded.', true),
      }
    } finally {
      unbindSignal()
      if (this.activeManifestController === controller) this.activeManifestController = undefined
    }
  }

  /** Load only the manifest-bound source selected by the caller. */
  async loadDataset(ref: DatasetRef, options: LoadOptions = {}): Promise<DatasetLoadResult> {
    this.activeDatasetController?.abort()
    const controller = new AbortController()
    const unbindSignal = bindExternalSignal(controller, options.signal)
    this.activeDatasetController = controller
    const requestId = ++this.datasetRequestId
    const manifestEpoch = this.epoch
    const manifest = this.currentManifest
    const identity = { requestId, manifestEpoch }

    if (controller.signal.aborted) {
      this.finishDatasetController(controller, unbindSignal)
      return { status: 'cancelled', ...identity }
    }

    if (!manifest) {
      this.finishDatasetController(controller, unbindSignal)
      return {
        status: 'error', ...identity,
        error: makeError('manifest', 'ManifestUnavailable', 'Load a valid explorer manifest before requesting a dataset.'),
      }
    }

    const entry = manifest.datasets.find((candidate) => candidate.toolId === ref.toolId && candidate.datasetId === ref.datasetId)
    if (!entry) {
      this.finishDatasetController(controller, unbindSignal)
      return { status: 'unknown-dataset', ref, ...identity }
    }

    try {
      if (controller.signal.aborted) return { status: 'cancelled', ...identity }
      const viewKey = viewModelCacheIdentity(entry)
      const cachedModel = this.viewModelCache.get(viewKey)
      const cachedRaw = this.rawCache.get(rawCacheIdentity(entry))
      if (cachedModel && cachedRaw) {
        if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
        const dataset = { ...cachedModel, snapshot: entry.snapshot }
        this.viewModelCache.set(viewKey, dataset)
        return {
          status: 'ready', ...identity, manifestEntry: entry,
          sourceValue: cachedRaw.sourceValue,
          sourceBytes: cachedRaw.bytes.slice(),
          dataset,
        }
      }

      const response = await this.fetcher(datasetUrl(this.baseUrl, entry), {
        method: 'GET',
        cache: 'default',
        signal: controller.signal,
      })
      if (controller.signal.aborted && this.isCurrentDatasetRequest(requestId, manifestEpoch)) {
        return { status: 'cancelled', ...identity }
      }
      if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
      if (!response.ok) {
        return {
          status: 'error', ...identity,
          error: makeError('transport', 'DatasetHttpError', `Dataset request returned HTTP ${response.status}.`, true),
        }
      }

      let bytes: Uint8Array
      try {
        bytes = new Uint8Array(await response.arrayBuffer())
      } catch {
        if (controller.signal.aborted && this.isCurrentDatasetRequest(requestId, manifestEpoch)) {
          return { status: 'cancelled', ...identity }
        }
        return {
          status: 'error', ...identity,
          error: makeError('transport', 'DatasetBodyError', 'The dataset response body could not be read.', true),
        }
      }
      if (controller.signal.aborted && this.isCurrentDatasetRequest(requestId, manifestEpoch)) {
        return { status: 'cancelled', ...identity }
      }
      if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
      if (bytes.byteLength !== entry.bytes) {
        return {
          status: 'error', ...identity,
          error: makeError('integrity', 'ByteLengthMismatch', 'The dataset byte length differs from the manifest.'),
        }
      }

      if (!this.subtle) {
        return {
          status: 'error', ...identity,
          error: makeError('integrity', 'DigestUnavailable', 'SHA-256 integrity checks are unavailable in this browser.'),
        }
      }

      let digest: string
      try {
        const digestBuffer = bytes.slice().buffer as ArrayBuffer
        const digestBytes = await this.subtle.digest('SHA-256', digestBuffer)
        digest = [...new Uint8Array(digestBytes)].map((part) => part.toString(16).padStart(2, '0')).join('')
      } catch {
        if (controller.signal.aborted && this.isCurrentDatasetRequest(requestId, manifestEpoch)) {
          return { status: 'cancelled', ...identity }
        }
        if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
        return {
          status: 'error', ...identity,
          error: makeError('integrity', 'DigestFailed', 'The dataset SHA-256 digest could not be computed.'),
        }
      }
      if (controller.signal.aborted && this.isCurrentDatasetRequest(requestId, manifestEpoch)) {
        return { status: 'cancelled', ...identity }
      }
      if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
      if (digest !== entry.sha256) {
        return {
          status: 'error', ...identity,
          error: makeError('integrity', 'DigestMismatch', 'The dataset SHA-256 digest differs from the manifest.'),
        }
      }

      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        return {
          status: 'error', ...identity,
          error: makeError('decode', 'DatasetInvalidUtf8', 'The dataset is not valid UTF-8.'),
        }
      }

      let sourceValue: JsonValue
      try {
        sourceValue = JSON.parse(text) as JsonValue
      } catch {
        return {
          status: 'error', ...identity,
          error: makeError('parse', 'DatasetInvalidJson', 'The dataset is not valid JSON.'),
        }
      }
      if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }

      const dataset = adaptExplorerDataset(entry, sourceValue)
      const rawSource = { bytes: bytes.slice(), sourceValue }
      this.rawCache.set(rawCacheIdentity(entry), rawSource)
      this.viewModelCache.set(viewKey, dataset)

      return {
        status: 'ready', ...identity, manifestEntry: entry,
        sourceValue,
        sourceBytes: rawSource.bytes.slice(),
        dataset,
      }
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return { status: 'cancelled', ...identity }
      }
      if (!this.isCurrentDatasetRequest(requestId, manifestEpoch)) return { status: 'stale', ...identity }
      return {
        status: 'error', ...identity,
        error: makeError('transport', 'DatasetTransportError', 'The dataset could not be loaded.', true),
      }
    } finally {
      this.finishDatasetController(controller, unbindSignal)
    }
  }

  /** Refresh the manifest without using the browser cache, then resolve the same identity again. */
  async retryDataset(ref: DatasetRef, options: LoadOptions = {}): Promise<DatasetLoadResult> {
    const refreshed = await this.loadManifest({ refresh: true, signal: options.signal })
    if (refreshed.status === 'error') {
      return {
        status: 'error', requestId: refreshed.requestId,
        manifestEpoch: refreshed.manifestEpoch, error: refreshed.error,
      }
    }
    if (refreshed.status !== 'ready') {
      return { status: refreshed.status, requestId: refreshed.requestId, manifestEpoch: refreshed.manifestEpoch }
    }
    return this.loadDataset(ref, options)
  }

  cancelManifestLoad(): void {
    this.activeManifestController?.abort()
    this.activeManifestController = undefined
    this.manifestRequestId += 1
    this.epoch += 1
    this.currentManifest = undefined
    this.cancelDatasetLoad()
  }

  cancelDatasetLoad(): void {
    this.activeDatasetController?.abort()
    this.activeDatasetController = undefined
    this.datasetRequestId += 1
  }

  private isCurrentManifestRequest(requestId: number, manifestEpoch: number): boolean {
    return requestId === this.manifestRequestId && manifestEpoch === this.epoch
  }

  private isCurrentDatasetRequest(requestId: number, manifestEpoch: number): boolean {
    return requestId === this.datasetRequestId && manifestEpoch === this.epoch && this.currentManifest !== undefined
  }

  private finishDatasetController(controller: AbortController, unbindSignal: () => void): void {
    unbindSignal()
    if (this.activeDatasetController === controller) this.activeDatasetController = undefined
  }
}

export function createExplorerLoader(options: ExplorerLoaderOptions): ExplorerLoader {
  return new ExplorerLoader(options)
}

export type JsonDownloadRuntime = {
  document: Pick<Document, 'createElement' | 'body'>
  urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
  schedule: (callback: () => void) => unknown
}

/** Download the original verified bytes, retaining the source file's JSON representation. */
export function downloadOriginalJson(
  bytes: Uint8Array,
  filename: string,
  runtime: JsonDownloadRuntime = {
    document,
    urls: URL,
    schedule: (callback) => globalThis.setTimeout(callback, 0),
  },
): void {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: JSON_MIME })
  const objectUrl = runtime.urls.createObjectURL(blob)
  const anchor = runtime.document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename

  try {
    runtime.document.body.appendChild(anchor)
    anchor.click()
  } finally {
    try {
      anchor.remove()
    } finally {
      runtime.schedule(() => runtime.urls.revokeObjectURL(objectUrl))
    }
  }
}
