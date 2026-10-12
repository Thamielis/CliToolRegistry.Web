import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isSafeExplorerFilename, validateExplorerRegistry } from '../src/data/explorerRegistryValidation.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = resolve(projectRoot, 'public/robot-docs')
const registryPath = resolve(projectRoot, 'src/data/explorerRegistry.json')
const manifestPath = resolve(projectRoot, 'public/robot-docs.manifest.json')

const SNAPSHOT_POINTERS = Object.freeze({
  'br-guide': { version: '/version', contract: '/contract_version', generatedAt: null },
  'br-capabilities': { version: '/version', contract: '/contract_version', generatedAt: null },
  'bv-docs': { version: '/version', contract: null, generatedAt: '/generated_at' },
  'bv-capabilities': { version: '/version', contract: '/contract_version', generatedAt: '/generated_at' },
  'cass-capabilities': { version: '/version', contract: '/contract_version', generatedAt: null },
  'ee-capabilities': { version: '/data/version', contract: '/schema', generatedAt: null },
  'fmd-capabilities': { version: '/version', contract: '/contract_version', generatedAt: null },
  'ubs-docs': { version: '/ubs_version', contract: '/schema_version', generatedAt: null },
})

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function presenceAt(value, pointer) {
  if (!pointer) return { state: 'missing' }
  let current = value
  for (const encodedPart of pointer.slice(1).split('/')) {
    const part = encodedPart.replaceAll('~1', '/').replaceAll('~0', '~')
    if (!isRecord(current) || !Object.hasOwn(current, part)) return { state: 'missing' }
    current = current[part]
  }
  if (current === null) return { state: 'null', pointer }
  if (typeof current !== 'string') return { state: 'missing' }
  return { state: 'value', value: current, pointer }
}

function snapshotFor(adapter, value) {
  const pointers = SNAPSHOT_POINTERS[adapter]
  if (!pointers) return {
    version: { state: 'missing' },
    contract: { state: 'missing' },
    generatedAt: { state: 'missing' },
  }
  return {
    version: presenceAt(value, pointers.version),
    contract: presenceAt(value, pointers.contract),
    generatedAt: presenceAt(value, pointers.generatedAt),
  }
}

function diagnostic(code, source, message) {
  return { code, source, message }
}

function sortDiagnostics(diagnostics) {
  return diagnostics.sort((left, right) =>
    compareText(left.code, right.code) || compareText(left.source, right.source) || compareText(left.message, right.message))
}

/** Build a manifest from one registry and a flat directory of raw JSON files. */
export async function buildExplorerManifest({
  registry,
  sourceDirectory: inputDirectory,
  readDirectory = (directory) => readdir(directory, { withFileTypes: true }),
}) {
  const diagnostics = validateExplorerRegistry(registry)
  if (diagnostics.length > 0) return { manifest: null, diagnostics: sortDiagnostics([...diagnostics]) }

  const entries = await readDirectory(inputDirectory)
  const files = [...entries].sort((left, right) => compareText(left.name, right.name))
  const byFilename = new Map(registry.datasets.map((dataset) => [dataset.filename, dataset]))
  const presentNames = new Set()
  const manifestEntries = []

  for (const entry of files) {
    if (!entry.name.endsWith('.json')) continue
    const source = `robot-docs/${entry.name}`
    if (!isSafeExplorerFilename(entry.name)) {
      diagnostics.push(diagnostic('UnsafeFilename', source, 'JSON candidate has an unsafe basename.'))
      continue
    }
    if (entry.isSymbolicLink() || !entry.isFile()) {
      diagnostics.push(diagnostic('UnsafeFilename', source, 'JSON candidates must be regular files, not links or directories.'))
      continue
    }
    presentNames.add(entry.name)

    let bytes
    let parsed
    try {
      bytes = await readFile(resolve(inputDirectory, entry.name))
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      parsed = JSON.parse(text)
    } catch (error) {
      diagnostics.push(diagnostic('IgnoredNonJson', source,
        error instanceof TypeError ? 'File is not valid UTF-8 JSON and was excluded.' : 'File is not a complete JSON document and was excluded.'))
      continue
    }

    const registration = byFilename.get(entry.name)
    if (!registration) {
      diagnostics.push(diagnostic('UnexpectedInventoryFile', source, 'Valid JSON is not declared in the explorer registry.'))
      continue
    }

    const digest = createHash('sha256').update(bytes).digest('hex')
    manifestEntries.push({
      toolId: registration.toolId,
      datasetId: registration.datasetId,
      filename: registration.filename,
      format: 'json',
      adapter: registration.adapter,
      title: registration.title,
      bytes: bytes.byteLength,
      sha256: digest,
      snapshot: snapshotFor(registration.adapter, parsed),
    })
  }

  for (const registration of registry.datasets) {
    if (!presentNames.has(registration.filename)) {
      diagnostics.push(diagnostic('MissingRegisteredFile', `robot-docs/${registration.filename}`,
        'A registered JSON source file is missing.'))
    }
  }

  sortDiagnostics(diagnostics)
  const hasErrors = diagnostics.some(({ code }) => code !== 'IgnoredNonJson')
  if (hasErrors) return { manifest: null, diagnostics }

  manifestEntries.sort((left, right) =>
    compareText(left.toolId, right.toolId) || compareText(left.datasetId, right.datasetId))
  return {
    manifest: { schema: 'cli-tool-explorer.manifest.v1', datasets: manifestEntries },
    diagnostics,
  }
}

export function serializeExplorerManifest(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n'
}

export async function writeExplorerManifest(outputPath, contents) {
  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, contents, 'utf8')
    await rename(temporaryPath, outputPath)
  } catch (error) {
    const { unlink } = await import('node:fs/promises')
    await unlink(temporaryPath).catch(() => {})
    throw error
  }
}

async function main(args) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'))
  const result = await buildExplorerManifest({ registry, sourceDirectory })
  for (const item of result.diagnostics) {
    const prefix = item.code === 'IgnoredNonJson' ? 'info' : 'error'
    console[prefix](`${item.code}: ${item.source}: ${item.message}`)
  }
  if (!result.manifest) process.exitCode = 1
  else {
    const contents = serializeExplorerManifest(result.manifest)
    if (args.includes('--check')) {
      let current
      try { current = await readFile(manifestPath, 'utf8') } catch { current = null }
      if (current !== contents) {
        console.error('StaleExplorerManifest: public/robot-docs.manifest.json is missing or does not match current sources.')
        process.exitCode = 1
      } else {
        console.info('Explorer manifest is current.')
      }
    } else {
      await writeExplorerManifest(manifestPath, contents)
      console.info(`Explorer manifest updated: ${result.manifest.datasets.length} JSON sources.`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
