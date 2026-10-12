import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { buildExplorerManifest } from '../scripts/build-explorer-manifest.mjs'
import { createExplorerLoader } from '../src/data/loadExplorer.ts'
import type { ExplorerRegistry } from '../src/types/explorer.ts'

const manifestFixture = JSON.parse(readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url), 'utf8')) as {
  datasets: { toolId: string; datasetId: string; filename: string; bytes: number; sha256: string; [key: string]: unknown }[]
}
const registryFixture = JSON.parse(readFileSync(new URL('../src/data/explorerRegistry.json', import.meta.url), 'utf8')) as ExplorerRegistry

async function withTemporaryDirectory<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'cli-tool-registry-explorer-'))
  try {
    return await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function copyManifest() {
  return JSON.parse(JSON.stringify(manifestFixture)) as typeof manifestFixture
}

const catalogFixture = {
  tools: [
    { id: 'br', name: 'br', description: 'Beads task tracker', category: 'terminal', tier: 'required', command: 'br', platforms: ['linux'], catalogFile: 'br.yml', catalogUrl: 'https://example.test/br.yml' },
    { id: 'fmd', name: 'fmd', description: 'Markdown renderer', category: 'terminal', tier: 'optional', command: 'fmd', platforms: ['linux'], catalogFile: 'fmd.yml', catalogUrl: 'https://example.test/fmd.yml' },
    { id: 'catalog-only', name: 'catalog-only-with-a-very-long-name-without-spaces-to-check-wrapping', description: 'A catalog entry without a registered JSON source', category: 'terminal', tier: 'optional', command: 'catalog-only', platforms: ['linux'], catalogFile: 'other.yml', catalogUrl: 'https://example.test/other.yml' },
  ],
  fileCount: 3,
  loadedAt: '2026-10-11T00:00:00.000Z',
  sourceRef: 'main',
}

async function routeCatalogAndManifest(page: import('@playwright/test').Page) {
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: catalogFixture }))
  await page.route('**/robot-docs.manifest.json', (route) => route.fulfill({ json: copyManifest() }))
}

test('Explorer index loads from the manifest while the catalog is unavailable and does not fetch dataset bytes', async ({ page }) => {
  let datasetRequests = 0
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ status: 404, body: 'offline' }))
  await page.route('**/robot-docs/*.json', (route) => {
    datasetRequests += 1
    return route.continue()
  })
  await page.goto('./?section=explore')

  await expect(page.getByRole('heading', { name: 'Werkzeuge erkunden' })).toBeVisible()
  await expect(page.locator('.explorer-tool-card')).toHaveCount(6)
  const counts = await page.locator('.explorer-tool-count').allTextContents()
  expect(counts.reduce((total, text) => total + Number(text.match(/\d+/)?.[0] ?? 0), 0)).toBe(8)
  expect(datasetRequests).toBe(0)
  await expect(page.getByText('GitHub nicht erreichbar')).toBeVisible()
})
test('Manifest retry is separate and recovers the independent explorer index', async ({ page }) => {
  let attempts = 0
  let recover = false
  await page.route('**/robot-docs.manifest.json', async (route) => {
    attempts += 1
    if (!recover) await route.fulfill({ status: 404, body: 'temporarily missing' })
    else await route.continue()
  })
  await page.goto('./?section=explore')
  await expect(page.getByRole('alert').getByText('Die Quellenliste konnte nicht geladen werden.')).toBeVisible()
  recover = true
  await page.getByRole('button', { name: 'Quellenliste erneut laden' }).click()
  await expect(page.locator('.explorer-tool-card')).toHaveCount(6)
  expect(attempts).toBeGreaterThanOrEqual(2)
})

test('unknown Explorer IDs and sections show the matching return route', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=missing')
  await expect(page.getByRole('alert').getByText('Dieses Werkzeug ist nicht in der Quellenregistrierung enthalten.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Werkzeugübersicht' })).toHaveAttribute('href', /section=explore/)

  await page.goto('./?section=explore&exploreTool=br&dataset=missing')
  await expect(page.getByRole('alert').getByText('Dieser Datensatz ist für das Werkzeug nicht registriert.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Werkzeugseite' })).toBeVisible()

  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=missing')
  await expect(page.getByRole('alert').getByText('Dieser Bereich gehört nicht zu diesem Datensatz.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Quelle' })).toBeVisible()

  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&entry=missing')
  await expect(page.getByRole('alert').getByText('Dieser Eintrag gehört nicht zu diesem Datensatz.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Quelle' })).toBeVisible()
})

test('shape-mismatched snapshots use the safe generic reader and keep original HTML as text', async ({ page }) => {
  const manifest = copyManifest()
  const source = Buffer.from(JSON.stringify({
    label: '<img src=x onerror=alert(1)>',
    nested: { value: 'safe text' },
  }))
  const entry = manifest.datasets.find((item) => item.toolId === 'br' && item.datasetId === 'capabilities')!
  entry.bytes = source.byteLength
  entry.sha256 = createHash('sha256').update(source).digest('hex')
  await page.route('**/robot-docs.manifest.json', (route) => route.fulfill({ json: manifest }))
  await page.route(/\/robot-docs\/br\.capabilities\.json(?:\?.*)?$/, (route) => route.fulfill({ body: source }))
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities')

  await expect(page.locator('.explorer-entry-list')).toBeVisible()
  await page.getByRole('button', { name: /label, Eintrag öffnen/ }).click()
  await expect(page.locator('.explorer-details .explorer-raw-preview').first()).toContainText('<img src=x onerror=alert(1)>')
  await expect(page.locator('.explorer-json-preview img')).toHaveCount(0)
  await expect(page.getByRole('status').getByText('Das Identitätsfeld tool fehlt oder hat einen falschen Typ.', { exact: false })).toBeVisible()
})

test('dataset retry recovers a temporary transport failure without using chunk reload', async ({ page }) => {
  let attempts = 0
  let recover = false
  await page.route(/\/robot-docs\/ee\.capabilities\.json(?:\?.*)?$/, async (route) => {
    attempts += 1
    if (!recover) await route.fulfill({ status: 503, body: 'temporarily unavailable' })
    else await route.continue()
  })
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities')
  await expect(page.getByRole('alert').getByText('Der Datensatz konnte nicht geladen werden.')).toBeVisible()
  await expect(page.locator('.explorer-load-error')).toHaveAttribute('data-error-kind', 'transport')
  const failedAttempts = attempts
  expect(failedAttempts).toBeGreaterThanOrEqual(1)
  recover = true
  await page.getByRole('button', { name: 'Datensatz erneut laden' }).click()
  await expect(page.locator('.explorer-dataset-layout')).toBeVisible()
  expect(attempts).toBeGreaterThan(failedAttempts)
})

test('a CDN digest conflict blocks source rendering until a refreshed manifest matches the bytes', async ({ page }) => {
  const validManifest = copyManifest()
  const conflictingManifest = copyManifest()
  const source = readFileSync(new URL('../public/robot-docs/br.capabilities.json', import.meta.url))
  const entry = conflictingManifest.datasets.find((item) => item.toolId === 'br' && item.datasetId === 'capabilities')!
  entry.sha256 = '0'.repeat(64)
  let conflict = true
  let manifestAttempts = 0
  await page.route('**/robot-docs.manifest.json', (route) => {
    manifestAttempts += 1
    return route.fulfill({ json: conflict ? conflictingManifest : validManifest })
  })
  await page.route(/\/robot-docs\/br\.capabilities\.json(?:\?.*)?$/, (route) => route.fulfill({ body: source }))
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities')

  await expect(page.getByRole('alert').getByText('Der Datensatz konnte nicht geladen werden.')).toBeVisible()
  await expect(page.locator('.explorer-load-error')).toHaveAttribute('data-error-kind', 'integrity')
  await expect(page.locator('.explorer-entry-list')).toHaveCount(0)
  conflict = false
  await page.getByRole('button', { name: 'Datensatz erneut laden' }).click()
  await expect(page.locator('.explorer-dataset-layout')).toBeVisible()
  expect(manifestAttempts).toBeGreaterThanOrEqual(2)
})

test('a registered generic JSON fixture loads through the shared adapter without a new family adapter', async () => {
  await withTemporaryDirectory(async (directory) => {
    const source = Buffer.from(JSON.stringify({ command: 'future-cli inspect', nested: { enabled: true } }))
    const registry: ExplorerRegistry = {
      schema: 'cli-tool-explorer.registry.v1',
      tools: [{ toolId: 'future-cli', fallbackName: 'Future CLI' }],
      datasets: [{
        toolId: 'future-cli', datasetId: 'custom', filename: 'future-cli.custom.json',
        format: 'json', adapter: 'generic-json', title: { de: 'Beispielquelle', en: 'Sample source' },
      }],
    }
    await writeFile(join(directory, 'future-cli.custom.json'), source)
    const built = await buildExplorerManifest({ registry, sourceDirectory: directory })
    expect(built.diagnostics).toEqual([])
    expect(built.manifest?.datasets[0].adapter).toBe('generic-json')

    const fetcher: typeof fetch = async (input) => {
      const responseBody = String(input).endsWith('robot-docs.manifest.json')
        ? JSON.stringify(built.manifest)
        : source
      return new Response(responseBody, { status: 200 })
    }
    const loader = createExplorerLoader({ baseUrl: 'https://registry.test/CliToolRegistry.Web/', registry, fetcher })
    expect((await loader.loadManifest()).status).toBe('ready')
    const loaded = await loader.loadDataset({ toolId: 'future-cli', datasetId: 'custom' })
    expect(loaded.status).toBe('ready')
    if (loaded.status === 'ready') {
      expect(loaded.dataset.sections.map(({ id }) => id)).toEqual(['json'])
      expect(loaded.dataset.entries.some(({ searchText }) => searchText.includes('future-cli inspect'))).toBe(true)
    }
  })
})

test('adding a plain-text inventory file leaves the generated manifest and checked-in snapshot unchanged', async () => {
  const checkedInManifest = readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url))
  await withTemporaryDirectory(async (directory) => {
    for (const dataset of registryFixture.datasets) {
      const bytes = readFileSync(new URL('../public/robot-docs/' + dataset.filename, import.meta.url))
      await writeFile(join(directory, dataset.filename), bytes)
    }
    const baseline = await buildExplorerManifest({ registry: registryFixture, sourceDirectory: directory })
    await writeFile(join(directory, 'unregistered-notes.txt'), 'plain text must not become a source or search result')
    const withPlainText = await buildExplorerManifest({ registry: registryFixture, sourceDirectory: directory })

    expect(withPlainText.manifest).toEqual(baseline.manifest)
    expect(withPlainText.diagnostics).toEqual(baseline.diagnostics)
    expect(withPlainText.manifest?.datasets).toHaveLength(8)
  })
  expect(readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url))).toEqual(checkedInManifest)
})

test('an unregistered plain-text source cannot change Explorer counts or palette search results', async ({ page }) => {
  let plainTextRequests = 0
  await routeCatalogAndManifest(page)
  await page.route('**/robot-docs/unregistered-notes.txt', (route) => {
    plainTextRequests += 1
    return route.fulfill({ body: 'plain text must not become a source or search result' })
  })
  await page.goto('./?section=explore')
  await expect(page.locator('.explorer-tool-card')).toHaveCount(6)
  const counts = await page.locator('.explorer-tool-count').allTextContents()
  expect(counts.reduce((total, text) => total + Number(text.match(/\d+/)?.[0] ?? 0), 0)).toBe(8)
  await page.getByRole('button', { name: 'Befehlspalette öffnen' }).click()
  const search = page.getByRole('combobox', { name: 'Werkzeuge und Bereiche suchen' })
  await search.fill('unregistered-notes.txt')
  await expect(page.getByRole('option')).toHaveCount(0)
  expect(plainTextRequests).toBe(0)
})

test('a production deep Explorer route reloads and restores through Back and Forward under the Pages base', async ({ page }) => {
  const sourcePaths: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.includes('/robot-docs/')) sourcePaths.push(path)
  })
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=commands')
  await expect(page.locator('.explorer-dataset-layout')).toBeVisible()
  await page.reload()
  await expect(page.locator('.explorer-dataset-layout')).toBeVisible()
  expect(sourcePaths.some((path) => path.startsWith('/CliToolRegistry.Web/robot-docs/'))).toBe(true)

  await page.locator('.top-nav').getByRole('link', { name: 'Katalog', exact: true }).click()
  await expect(page).toHaveURL(/section=catalog/)
  await page.goBack()
  await expect(page).toHaveURL(/section=explore.*exploreTool=br.*dataset=capabilities/)
  await expect(page.locator('.explorer-dataset-layout')).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/section=catalog/)
})

test('featureStatus filters exact scalar snapshot strings and combines with search', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities&docSection=features&featureStatus=available&docQ=html')

  await expect(page.getByRole('combobox', { name: 'Funktionsstatus' })).toHaveValue('available')
  await expect(page.locator('.explorer-entry-list .explorer-entry-button')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'html, Eintrag öffnen' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'html_stdout_dash, Eintrag öffnen' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Dateiinhalte durchsuchen' }).fill('interactive_html')
  await expect(page.getByText('Keine Einträge passen zu Suche und Filtern.')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Funktionsstatus' })).toHaveValue('available')
})

test('catalog cards, enhanced cards, table, and details share manifest-backed Explorer links', async ({ page, context }) => {
  await routeCatalogAndManifest(page)

  await page.goto('./?section=catalog&view=card')
  const card = page.locator('.tool-card').filter({ has: page.locator('#tool-card-heading-br') })
  const cardLink = card.getByRole('link', { name: 'JSON-Referenzen: 2' })
  await expect(cardLink).toBeVisible()
  const expectedHref = await cardLink.getAttribute('href')
  expect(new URL(expectedHref!, page.url()).searchParams.get('section')).toBe('explore')
  expect(new URL(expectedHref!, page.url()).searchParams.get('exploreTool')).toBe('br')
  await expect(page.locator('#tool-card-heading-catalog-only')).toBeVisible()
  await expect(page.locator('.tool-card').filter({ has: page.locator('#tool-card-heading-catalog-only') }).locator('.tool-explorer-link')).toHaveCount(0)

  await card.getByRole('button', { name: 'br, Details' }).click()
  const detailsLink = card.locator('.tool-details').getByRole('link', { name: 'JSON-Referenzen: 2' })
  await expect(detailsLink).toHaveAttribute('href', expectedHref!)

  await page.goto('./?section=catalog&view=enhanced')
  const enhancedLink = page.locator('.tool-card').filter({ has: page.locator('#tool-card-heading-br') }).getByRole('link', { name: 'JSON-Referenzen: 2' })
  const enhancedUrl = new URL((await enhancedLink.getAttribute('href'))!, page.url())
  expect(enhancedUrl.searchParams.get('section')).toBe('explore')
  expect(enhancedUrl.searchParams.get('exploreTool')).toBe('br')

  await page.goto('./?section=catalog&view=list')
  const tableLink = page.locator('.tool-table').getByRole('link', { name: 'JSON-Referenzen: 2' })
  const tableUrl = new URL((await tableLink.getAttribute('href'))!, page.url())
  expect(tableUrl.searchParams.get('section')).toBe('explore')
  expect(tableUrl.searchParams.get('exploreTool')).toBe('br')
  const catalogOnlyRow = page.locator('.tool-row').filter({ has: page.locator('[aria-label^="catalog-only-with-a-very-long-name"]') })
  await expect(catalogOnlyRow.locator('.tool-explorer-link')).toHaveCount(0)

  const popupPromise = context.waitForEvent('page')
  await tableLink.click({ modifiers: ['Control'] })
  const popup = await popupPromise
  await expect(popup).toHaveURL(/section=explore.*exploreTool=br/)
  await expect(page).toHaveURL(/section=catalog/)
})

test('palette keeps Explore available before manifest validation and adds only validated targets afterward', async ({ page }) => {
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: catalogFixture }))
  let releaseManifest!: () => void
  const manifestGate = new Promise<void>((resolve) => { releaseManifest = resolve })
  await page.route('**/robot-docs.manifest.json', async (route) => {
    await manifestGate
    await route.fulfill({ status: 404, body: 'temporarily missing' })
  })
  await page.goto('./?section=catalog')
  await page.getByRole('button', { name: 'Befehlspalette öffnen' }).click()
  const search = page.getByRole('combobox', { name: 'Werkzeuge und Bereiche suchen' })
  await search.fill('Erkunden')
  const exploreOption = page.getByRole('option', { name: /Erkunden/ })
  await expect(exploreOption).toBeVisible()
  await expect(page.getByRole('option', { name: /JSON-Quellen/ })).toHaveCount(0)
  await search.press('Enter')
  await expect(page).toHaveURL(/section=explore/)
  releaseManifest()
  await expect(page.getByRole('alert').getByText('Die Quellenliste konnte nicht geladen werden.')).toBeVisible()

  await page.route('**/robot-docs.manifest.json', (route) => route.fulfill({ json: copyManifest() }))
  await page.reload()
  await page.getByRole('button', { name: 'Befehlspalette öffnen' }).click()
  await expect(page.getByRole('option')).toHaveCount(20)
  const loadedSearch = page.getByRole('combobox', { name: 'Werkzeuge und Bereiche suchen' })
  await loadedSearch.fill('Fähigkeiten und Aufrufe')
  const datasetOption = page.getByRole('option', { name: /Fähigkeiten und Aufrufe/ })
  await expect(datasetOption).toBeVisible()
  await loadedSearch.press('Enter')
  await expect(page).toHaveURL(/exploreTool=br/)
  await expect(page).toHaveURL(/dataset=capabilities/)
})

test('Explorer document title follows the validated tool, localized dataset, and locale; German layouts fit mobile widths', async ({ page }) => {
  await routeCatalogAndManifest(page)
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities')
  await expect(page).toHaveTitle('Rendering-Referenz · fmd · CLI Tool Registry')
  await page.getByRole('button', { name: 'Sprache' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page).toHaveTitle('Rendering reference · fmd · CLI Tool Registry')

  await page.getByRole('button', { name: 'Language' }).click()
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('./?section=catalog&view=card')
  await expect(page.locator('#tool-card-heading-catalog-only')).toBeVisible()
  const widthAt320 = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(widthAt320).toBeLessThanOrEqual(320)
  await page.setViewportSize({ width: 360, height: 900 })
  const widthAt360 = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(widthAt360).toBeLessThanOrEqual(360)
})
