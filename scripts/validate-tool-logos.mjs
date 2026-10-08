import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(root, 'public/registry-catalog.json')
const manifestPath = path.join(root, 'src/data/toolLogos.ts')
const sourcesPath = path.join(root, 'docs/tool-logo-sources.md')
const assetsDir = path.join(root, 'public/tool-logos')

function fail(message) {
  console.error(`Tool-logo validation failed: ${message}`)
  process.exitCode = 1
}

const [catalogText, manifestText, sourcesText] = await Promise.all([
  readFile(catalogPath, 'utf8'),
  readFile(manifestPath, 'utf8'),
  readFile(sourcesPath, 'utf8'),
])
const catalogIds = JSON.parse(catalogText).tools.map(({ id }) => id)
const manifestStart = manifestText.indexOf('export const TOOL_LOGO_MANIFEST = [')
const arrayStart = manifestText.indexOf('[', manifestStart)
const arrayEnd = manifestText.indexOf('] as const satisfies readonly ToolLogoEntry[]', arrayStart)
if (manifestStart < 0 || arrayStart < 0 || arrayEnd < 0) throw new Error('Could not locate the literal logo manifest')
const manifest = JSON.parse(manifestText.slice(arrayStart, arrayEnd + 1))
const manifestIds = manifest.map(({ id }) => id)
const inventoryStart = sourcesText.indexOf('## Vollständige Zuordnung')
const inventoryText = inventoryStart >= 0 ? sourcesText.slice(inventoryStart) : ''
const documentedIds = Array.from(inventoryText.matchAll(/^\|\s*`([^`]+)`\s*\|/gm), ([, id]) => id)

function compareIds(label, actual) {
  const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index)
  const missing = catalogIds.filter((id) => !actual.includes(id))
  const unknown = actual.filter((id) => !catalogIds.includes(id))
  if (duplicates.length || missing.length || unknown.length) {
    fail(`${label}: duplicate=${[...new Set(duplicates)].join(',') || 'none'} missing=${missing.join(',') || 'none'} unknown=${unknown.join(',') || 'none'}`)
  }
}

compareIds('Manifest IDs', manifestIds)
compareIds('Source inventory IDs', documentedIds)

const referencedAssets = new Set()
for (const entry of manifest) {
  if (!['project-logo', 'family-logo', 'fallback'].includes(entry.kind)) fail(`${entry.id} has unknown kind ${entry.kind}`)
  const paths = [entry.asset, entry.darkAsset, entry.lightAsset].filter(Boolean)
  if (entry.kind === 'fallback' && paths.length) fail(`${entry.id} is a fallback with an image asset`)
  if (entry.kind !== 'fallback' && !paths.length) fail(`${entry.id} has no local image asset`)
  for (const asset of paths) {
    if (asset.startsWith('/') || asset.includes('\\') || asset.split('/').includes('..')) {
      fail(`${entry.id} has a non-relative asset path: ${asset}`)
      continue
    }
    referencedAssets.add(asset)
  }
}

const files = await readdir(assetsDir)
const actualAssets = new Set(files)
for (const asset of referencedAssets) {
  if (!actualAssets.has(asset)) {
    fail(`missing asset: ${asset}`)
    continue
  }
  const svg = await readFile(path.join(assetsDir, asset), 'utf8')
  if (!/<svg\b/i.test(svg)) fail(`${asset} is not an SVG`)
  if (/<\s*(?:script|foreignObject|image|iframe|object|embed|animate|set)\b/i.test(svg)) fail(`${asset} contains active or external SVG content`)
  if (/\son[a-z]+\s*=/i.test(svg)) fail(`${asset} contains an event-handler attribute`)
  for (const [, href] of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi)) {
    if (!href.startsWith('#')) fail(`${asset} contains a non-local href: ${href}`)
  }
  for (const [, target] of svg.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) {
    if (!target.startsWith('#')) fail(`${asset} contains a non-local paint/resource reference: ${target}`)
  }
}
for (const asset of actualAssets) {
  if (!referencedAssets.has(asset)) fail(`undocumented/unreferenced asset: ${asset}`)
  if (!sourcesText.includes(`public/tool-logos/${asset}`)) fail(`${asset} has no source documentation`)
}

const counts = Object.fromEntries(['project-logo', 'family-logo', 'fallback'].map((kind) => [
  kind,
  manifest.filter((entry) => entry.kind === kind).length,
]))
console.log(`Catalog IDs: ${catalogIds.length}; manifest IDs: ${manifestIds.length}; source rows: ${documentedIds.length}`)
console.log(`Project logos: ${counts['project-logo']}; family-logo IDs: ${counts['family-logo']}; fallbacks: ${counts.fallback}`)
console.log(`Local files: ${actualAssets.size}; referenced files: ${referencedAssets.size}`)
if (!process.exitCode) console.log('Tool-logo manifest, inventory, and SVG safety checks passed.')
