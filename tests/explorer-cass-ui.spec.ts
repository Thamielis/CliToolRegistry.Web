import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

test('Cass paginates non-command sections and focuses the final visible entry', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=env&docCount=48')
  await expect(page.locator('.explorer-entry-button')).toHaveCount(48)
  await page.getByRole('button', { name: 'Weitere Einträge laden' }).click()
  await expect(page.locator('.explorer-entry-button')).toHaveCount(67)
  await expect(page.getByRole('button', { name: 'Weitere Einträge laden' })).toHaveCount(0)
  await expect(page.locator('.explorer-entry-button').last()).toBeFocused()
})

test('a selected null leaf in Cass raw JSON previews null', async ({ page }) => {
  const manifest = JSON.parse(readFileSync(new URL('../public/robot-docs.manifest.json', import.meta.url), 'utf8')) as {
    datasets: { toolId: string; datasetId: string; filename: string; bytes: number; sha256: string; [key: string]: unknown }[]
  }
  const source = JSON.parse(readFileSync(new URL('../public/robot-docs/cass.capabilities.json', import.meta.url), 'utf8')) as Record<string, unknown>
  source.null_leaf = null
  const sourceBytes = Buffer.from(JSON.stringify(source))
  const entry = manifest.datasets.find((dataset) => dataset.toolId === 'cass' && dataset.datasetId === 'capabilities')!
  entry.bytes = sourceBytes.byteLength
  entry.sha256 = createHash('sha256').update(sourceBytes).digest('hex')
  await page.route('**/robot-docs.manifest.json*', (route) => route.fulfill({ json: manifest }))
  await page.route(/\/robot-docs\/cass\.capabilities\.json(?:\?.*)?$/, (route) => route.fulfill({
    status: 200, headers: { 'content-type': 'application/json' }, body: sourceBytes,
  }))

  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=json&entry=raw%3A%2Fnull_leaf')
  await expect(page.locator('.explorer-details .explorer-raw-preview').first()).toHaveText('null')
})

test('Cass keeps 47 commands visible while argument type and required filters apply to their child entries', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=commands&argType=flag&argRequired=no')

  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('47 Befehle')
  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('314 Argumente')
  const tui = page.getByRole('button', { name: 'tui, Eintrag öffnen' })
  await expect(tui).toBeVisible()
  await tui.click()

  const once = page.getByRole('button', { name: 'once, Eintrag öffnen' })
  await expect(once).toBeVisible()
  await expect(page.getByRole('button', { name: 'asciicast, Eintrag öffnen' })).toHaveCount(0)
  await once.click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Flag')
  await expect(details).toContainText('Dokumentierte Enumwerte')
  await expect(details).toContainText(/"true"[\s\S]*"false"/)
  await expect(details).toContainText('Enumwerte bleiben Quellmetadaten und erzeugen keinen Befehlsparameter.')
  await expect(details).toContainText('Werttyp')
  await expect(details).toContainText('Im Snapshot nicht vorhanden')
  await expect(details).toContainText(/cass\.capabilities\.json\/commands\/\d+\/arguments\/\d+/)
  await expect(details).not.toContainText(/once\s+<true>/)
})

test('Cass search finds an argument description and opens it with its owning command context', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=commands&docQ=tui_state.json')

  await page.getByRole('button', { name: 'tui, Eintrag öffnen' }).click()
  const resetState = page.getByRole('button', { name: 'reset-state, Eintrag öffnen' })
  await expect(resetState).toBeVisible()
  await expect(page.getByRole('button', { name: 'once, Eintrag öffnen' })).toHaveCount(0)
  await resetState.click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Argument gehört zu')
  await expect(details.getByRole('button', { name: 'tui' })).toBeVisible()
  await expect(details).toContainText('/commands/')
  await expect(details).toContainText('/arguments/')
  await expect(details).toContainText('Delete persisted UI state')
})

test('Cass limit zero stays a snapshot value with no inferred meaning', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=limits')
  await page.getByRole('button', { name: 'max_limit, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details.locator('.explorer-provenance > div').filter({ hasText: 'Snapshotwert' })).toContainText('0')
  await expect(details).not.toContainText(/unlimited|unbegrenzt/i)
  await expect(details).toContainText('/limits/max_limit')
})

test('Cass workflow commands remain source-exact and recovery search finds canonical guidance', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=workflows')
  await page.getByRole('button', { name: 'cold-start, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details .command-block code').first()).toHaveText('cass triage --json')
  await expect(page.locator('.explorer-details')).toContainText('/workflows/0')

  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=recoveries&docQ=Levenshtein')
  const recovery = page.locator('.explorer-entry-list .explorer-entry-button').first()
  await expect(recovery).toBeVisible()
  await recovery.click()
  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Levenshtein command recovery')
  await expect(details).toContainText('cass searh "query" --robot --limit 10')
  await expect(details).toContainText('cass search "query" --robot --limit 10')
})

test('Cass keeps output claims tied to the command snapshot and exposes the contracted sections', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=commands&jsonOutput=yes&entry=cmd:search')

  await expect(page.locator('.explorer-details')).toContainText('JSON-Ausgabe im Snapshot')
  await expect(page.locator('.explorer-details')).toContainText('Ja')
  const sectionIds = await page.locator('.explorer-section-tabs a').evaluateAll((links) => links.map((link) => {
    const url = new URL((link as HTMLAnchorElement).href)
    return url.searchParams.get('docSection')
  }))
  expect(sectionIds).toContain('json')
  expect(new Set(sectionIds)).toEqual(new Set(['commands', 'flags', 'features', 'connectors', 'env', 'exit-codes', 'workflows', 'recoveries', 'limits', 'json']))

  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=json&docQ=max_limit')
  await page.getByRole('button', { name: 'max_limit, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details')).toContainText('/limits/max_limit')
  await expect(page.locator('.explorer-details')).toContainText('0')
})

test('Cass reset and section navigation use central URL transitions', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=cass&dataset=capabilities&docSection=commands&argType=flag&argRequired=no&entry=cmd:tui')
  await page.getByRole('button', { name: 'Suche und Filter zurücksetzen' }).click()

  const resetUrl = new URL(page.url())
  expect(resetUrl.searchParams.has('argType')).toBe(false)
  expect(resetUrl.searchParams.has('argRequired')).toBe(false)
  expect(resetUrl.searchParams.has('entry')).toBe(false)
  await expect(page.getByRole('searchbox', { name: 'Dateiinhalte durchsuchen' })).toBeFocused()

  await page.locator('.explorer-section-tabs a[href*="docSection=limits"]').click()
  await expect(page).toHaveURL(/docSection=limits/)
  expect(new URL(page.url()).searchParams.has('entry')).toBe(false)
})
