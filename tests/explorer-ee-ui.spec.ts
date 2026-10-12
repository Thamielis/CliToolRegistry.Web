import { test, expect } from '@playwright/test'

test('EE shows all 557 paths across 112 groups with a 48-path initial page', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=commands')

  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('48 von 557 Pfaden')
  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('112 Gruppen')
  await expect(page.locator('.ee-command-group')).toHaveCount(112)
  await expect(page.locator('.explorer-entry-button')).toHaveCount(48)
})

test('EE search flattens full command paths and opens the exact source pointer', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=commands&docQ=backup%20keys%20export')

  const command = page.getByRole('button', { name: 'backup keys export, Pfad öffnen' })
  await expect(command).toBeVisible()
  await expect(page.locator('.ee-command-group')).toHaveCount(0)
  await command.click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('/data/commands/29')
  await expect(details).toContainText('Argumente sind in dieser Datei nicht dokumentiert.')
  await expect(details.locator('.command-block code')).toHaveText('ee backup keys export')
})

test('EE retains the final source path and its original array index', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=commands&docQ=workspace%20resolve')
  await page.getByRole('button', { name: 'workspace resolve, Pfad öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('workspace resolve')
  await expect(details).toContainText('/data/commands/556')
})

test('EE unavailable command is a snapshot observation without a copyable invocation', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=commands&available=no&docQ=mcp%20serve-stdio')
  await page.getByRole('button', { name: 'mcp serve-stdio, Pfad öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Verfügbarkeit im Snapshot')
  await expect(details).toContainText('Nicht verfügbar')
  await expect(details.locator('.command-block')).toHaveCount(0)
  await expect(details).toContainText('/data/commands/262')
})

test('EE configuration keeps category, null default, set state, source, and missing current value distinct', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=env&envCategory=output&docQ=EE_AGENT_NAME')
  await page.getByRole('button', { name: 'EE_AGENT_NAME, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Werte der exportierenden Installation')
  await expect(details).toContainText('category')
  await expect(details).toContainText('output')
  await expect(details).toContainText('isSet')
  await expect(details).toContainText('false')
  await expect(details).toContainText('defaultValue')
  await expect(details).toContainText('null')
  await expect(details).toContainText('source')
  await expect(details).toContainText('unset')
  await expect(details).toContainText('currentValue')
  await expect(details).toContainText('Im Snapshot nicht vorhanden')
})

test('EE local current values remain labeled as exported snapshot data', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=env&envCategory=integration&docQ=EE_CASS_BINARY')
  await page.getByRole('button', { name: 'EE_CASS_BINARY, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('Werte der exportierenden Installation')
  await expect(details).toContainText('/home/mario/.local/bin/cass')
  await expect(details).toContainText('process_env')
})

test('EE keeps envelope success, degraded, and missing error as separate snapshot values', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=snapshot')

  const envelope = page.locator('.ee-envelope-summary')
  await expect(envelope).toContainText('success')
  await expect(envelope).toContainText('true')
  await expect(envelope).toContainText('degraded')
  await expect(envelope).toContainText('[]')
  await expect(envelope).toContainText('error')
  await expect(envelope).toContainText('Im Snapshot nicht vorhanden')
  await page.getByRole('button', { name: 'Degraded snapshot, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details')).toContainText('/degraded')
  await expect(page.locator('.explorer-details')).toContainText('[]')
})

test('EE output and cursor details retain their nested source values', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=output&docQ=governor')
  await page.getByRole('button', { name: 'governor, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('/data/output/governor')
  await expect(details).toContainText('ee.cursor.v1')
  await expect(details).toContainText('--max-output-tokens')
  await expect(details).toContainText('truncationPoints')
})

test('EE pagination stays in the URL and a new search returns to the first page', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ee&dataset=capabilities&docSection=commands&docCount=48')
  await page.getByRole('button', { name: 'Weitere Pfade laden' }).click()
  await expect(page).toHaveURL(/docCount=96/)
  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('96 von 557 Pfaden')

  await page.getByRole('searchbox', { name: 'Dateiinhalte durchsuchen' }).fill('backup keys export')
  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('1 von 1 Pfaden')
  const url = new URL(page.url())
  expect(Number(url.searchParams.get('docCount') ?? 48)).toBe(48)
})
