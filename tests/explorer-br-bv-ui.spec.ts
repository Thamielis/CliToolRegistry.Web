import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { test, expect } from '@playwright/test'

test('br capabilities shows mixed operations, applies exact machine output filters, and labels missing examples', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=commands&operation=mixed&workspace=required')

  const auditRow = page.getByRole('row', { name: /^audit,/ })
  await expect(auditRow).toBeVisible()
  await expect(auditRow).toContainText('Gemischt')
  await expect(auditRow).toContainText('Erforderlich')
  const configRow = page.getByRole('row').filter({ has: page.getByRole('button', { name: /^config,/ }) })
  await expect(configRow).toBeVisible()
  await page.getByRole('region', { name: 'Filter' }).getByLabel('Maschinenausgabe').selectOption('toon')
  await expect(auditRow).toBeVisible()
  await expect(configRow).toHaveCount(0)

  await page.getByRole('button', { name: 'audit, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details')).toContainText('Für diesen Befehl sind im Snapshot keine Beispiele dokumentiert.')
  await expect(page.locator('.explorer-details')).toContainText('/commands/1')
})

test('br guide keeps original section text and line provenance, and source links clear the selected entry', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=br&dataset=robot-docs&docSection=guide&entry=guide:purpose')

  await expect(page.getByRole('heading', { name: 'Purpose', exact: true })).toBeVisible()
  await expect(page.locator('.explorer-details')).toContainText('/guide')
  await expect(page.locator('.explorer-details')).toContainText('Guidezeilen')
  await expect(page.locator('.explorer-details .explorer-raw-preview').first()).toContainText('Purpose:')

  const capabilities = page.getByRole('link', { name: 'Fähigkeiten und Aufrufe' })
  const target = new URL(await capabilities.getAttribute('href')!, page.url())
  expect(target.searchParams.get('dataset')).toBe('capabilities')
  expect(target.searchParams.has('entry')).toBe(false)
  await capabilities.click()
  await expect(page).toHaveURL(/dataset=capabilities/)
  await expect(page.locator('.explorer-provenance')).toContainText('br.capabilities.json')
  expect(new URL(page.url()).searchParams.has('entry')).toBe(false)
})

test('related BR dataset links only use datasets published in the validated manifest', async ({ page }) => {
  const manifest = JSON.parse(readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url), 'utf8')) as {
    datasets: { toolId: string; datasetId: string }[]
  }
  manifest.datasets = manifest.datasets.filter((entry) => !(entry.toolId === 'br' && entry.datasetId === 'capabilities'))
  await page.route('**/robot-docs.manifest.json*', (route) => route.fulfill({ json: manifest }))
  await page.goto('./?section=explore&exploreTool=br&dataset=robot-docs')

  const relatedLinks = page.getByRole('navigation', { name: 'Weitere Quellen dieses Werkzeugs' }).locator('a')
  await expect(relatedLinks).toHaveCount(1)
  await expect(relatedLinks.first()).toHaveAttribute('aria-current', 'page')
})

test('closing an Explorer entry restores focus to its matching list control', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=commands')
  await page.getByRole('button', { name: 'audit, Eintrag öffnen' }).click()
  await page.getByRole('button', { name: 'Eintrag schließen' }).click()
  await expect(page.locator('[data-history-focus-key="explorer-entry:cmd:audit"]')).toBeFocused()
})

test('a selected null leaf in BR raw JSON previews null', async ({ page }) => {
  const manifest = JSON.parse(readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url), 'utf8')) as {
    datasets: { toolId: string; datasetId: string; filename: string; bytes: number; sha256: string; [key: string]: unknown }[]
  }
  const source = JSON.parse(readFileSync(new URL('../public/robot-docs/br.capabilities.json', import.meta.url), 'utf8')) as Record<string, unknown>
  source.null_leaf = null
  const sourceBytes = Buffer.from(JSON.stringify(source))
  const entry = manifest.datasets.find((dataset) => dataset.toolId === 'br' && dataset.datasetId === 'capabilities')!
  entry.bytes = sourceBytes.byteLength
  entry.sha256 = createHash('sha256').update(sourceBytes).digest('hex')
  await page.route('**/robot-docs.manifest.json*', (route) => route.fulfill({ json: manifest }))
  await page.route(/\/robot-docs\/br\.capabilities\.json(?:\?.*)?$/, (route) => route.fulfill({
    status: 200, headers: { 'content-type': 'application/json' }, body: sourceBytes,
  }))

  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=json&entry=raw%3A%2Fnull_leaf')
  await expect(page.locator('.explorer-details .explorer-raw-preview').first()).toHaveText('null')
})

test('br canonical commands copy the exact source command', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=br&dataset=robot-docs&docSection=canonical-commands')
  await page.getByRole('button', { name: /discover capabilities, Eintrag öffnen/ }).click()

  const command = page.locator('.explorer-details .command-block code')
  await expect(command).toHaveText('br capabilities --format json')
})

test('bv needs filters combine prerequisites and detail keeps preferred and accepted invocations distinct', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=bv&dataset=capabilities&docSection=commands')
  await page.getByRole('checkbox', { name: 'Issues' }).check()
  await page.getByRole('checkbox', { name: 'Git' }).check()

  const causal = page.getByRole('button', { name: 'robot-causality, Eintrag öffnen' })
  const causalEntry = page.locator('.explorer-entry-list li').filter({ has: causal })
  await expect(causal).toBeVisible()
  await expect(causalEntry).toContainText('Git')
  await expect(page.getByRole('button', { name: 'robot-blocker-chain, Eintrag öffnen' })).toHaveCount(0)
  await causal.click()

  const details = page.locator('.explorer-details')
  await expect(details.getByRole('heading', { name: 'Bevorzugter Aufruf' })).toBeVisible()
  await expect(details.getByRole('heading', { name: 'Akzeptierte Aufrufe' })).toBeVisible()
  await expect(details.locator('.command-block code').first()).toHaveText('bv robot-causality ISSUE_ID --json')
  await expect(details).toContainText('bv --robot-causality ISSUE_ID --format json')
  await expect(details.getByRole('heading', { name: 'Dokumentierte Ausgabefelder' })).toBeVisible()
})

test('bv aliases label the original and canonical form separately and link to a clean source URL', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=bv&dataset=capabilities&docSection=aliases')
  await page.getByRole('button', { name: 'bv --json, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details.getByText('Agent-Intent-Alias', { exact: true })).toBeVisible()
  await expect(details.getByRole('heading', { name: 'Kanonischer Alias' })).toBeVisible()
  await expect(details.locator('.command-block code')).toHaveText('bv --robot-triage --format json')

  const robotReference = page.getByRole('link', { name: 'Robot-Referenz' })
  const target = new URL(await robotReference.getAttribute('href')!, page.url())
  expect(target.searchParams.get('dataset')).toBe('robot-docs')
  expect(target.searchParams.has('entry')).toBe(false)
  await robotReference.click()
  await expect(page).toHaveURL(/dataset=robot-docs/)
  expect(new URL(page.url()).searchParams.has('entry')).toBe(false)
})

test('bv documentation preserves pipeline examples and reports clipboard rejection', async ({ page }) => {
  await page.addInitScript(() => {
    const clipboardState = window as Window & { __clipboardWrites: string[]; __denyClipboard: boolean }
    clipboardState.__clipboardWrites = []
    clipboardState.__denyClipboard = false
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => {
        if (clipboardState.__denyClipboard) throw new Error('clipboard denied')
        clipboardState.__clipboardWrites.push(text)
      } },
    })
  })
  await page.goto('./?section=explore&exploreTool=bv&dataset=robot-docs&docSection=examples')
  await page.getByRole('button', { name: 'Get top 3 picks for immediate work, Eintrag öffnen' }).click()

  const originalPipeline = "bv robot-triage --json | jq '.triage.quick_ref.top_picks[:3]'"
  const command = page.locator('.explorer-details .command-block code')
  await expect(command).toHaveText(originalPipeline)
  await page.locator('.explorer-details .command-block .copy-button').click()
  await expect(page.locator('.explorer-details .command-block [role=status]')).toHaveText('Kopiert')
  expect(await page.evaluate(() => (window as Window & { __clipboardWrites: string[] }).__clipboardWrites)).toEqual([originalPipeline])

  await page.evaluate(() => { (window as Window & { __denyClipboard: boolean }).__denyClipboard = true })
  await page.locator('.explorer-details .command-block .copy-button').click()
  await expect(page.locator('.explorer-details').getByRole('alert')).toHaveText('Kopieren nicht möglich')
})

test('mobile selection focuses the entry detail without returning focus to search', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=commands')
  const search = page.getByRole('searchbox', { name: 'Dateiinhalte durchsuchen' })
  await search.focus()
  await search.fill('agents')
  await page.getByRole('button', { name: 'agents, Eintrag öffnen' }).click()

  const heading = page.locator('.explorer-details [data-navigation-entry-heading]')
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  await expect(search).not.toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
