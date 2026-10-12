import { test, expect } from '@playwright/test'

test('br capabilities shows mixed operations, applies exact machine output filters, and labels missing examples', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=br&dataset=capabilities&docSection=commands&operation=mixed&workspace=required')

  const auditRow = page.getByRole('row', { name: /^audit,/ })
  await expect(auditRow).toBeVisible()
  await expect(auditRow).toContainText('Gemischt')
  await expect(auditRow).toContainText('Erforderlich')
  await page.getByRole('region', { name: 'Filter' }).getByLabel('Maschinenausgabe').selectOption('toon')
  await expect(auditRow).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'agents' })).toHaveCount(0)

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
