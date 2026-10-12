import { test, expect } from '@playwright/test'

test('fmd exposes only its capabilities page and localized source sections', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities&docSection=commands')

  await expect(page.locator('.explorer-section-tabs a')).toHaveCount(7)
  await expect(page.locator('.explorer-reader-heading h2')).toHaveText('Aufrufformen')
  await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText('11 von 11 Einträgen')
  await expect(page.locator('.explorer-section-tabs')).not.toContainText('Robot-Referenz')
})

test('fmd plain-text robot-docs route stays unknown and is never fetched', async ({ page }) => {
  let plainTextRequested = false
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/fmd.robot-docs.json')) plainTextRequested = true
  })

  await page.goto('./?section=explore&exploreTool=fmd&dataset=robot-docs')
  await expect(page.getByRole('alert')).toContainText('Dieser Datensatz ist für das Werkzeug nicht registriert.')
  expect(plainTextRequested).toBe(false)
})

test('fmd filters an exact scalar feature status together with its query', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities&docSection=features&featureStatus=available_self_hosting_single_file&docQ=interactive_html')

  await expect(page.getByRole('combobox', { name: 'Funktionsstatus' })).toHaveValue('available_self_hosting_single_file')
  await expect(page.locator('.explorer-entry-list .explorer-entry-button')).toHaveCount(1)
  await page.getByRole('button', { name: 'interactive_html, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details')).toContainText('available_self_hosting_single_file')
})

test('fmd copies the original rendering examples without running a renderer', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities&docSection=commands&docQ=render')
  await page.getByRole('button', { name: 'render, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details.locator('.command-block')).toHaveCount(18)
  await expect(details.locator('.command-block code').first()).toHaveText('fmd README.md')
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
})

test('fmd theme model remains snapshot text and does not change the site theme', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=fmd&dataset=capabilities&docSection=theme')
  const themeBefore = await page.locator('html').getAttribute('data-theme')
  await page.getByRole('button', { name: 'Theme model, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('/theme_model')
  await expect(details).toContainText('default')
  await expect(details).toContainText('colors')
  await expect(page.locator('input[type="color"]')).toHaveCount(0)
  expect(await page.locator('html').getAttribute('data-theme')).toBe(themeBefore)
})

test('ubs exposes all documented entry counts without a scan action', async ({ page }) => {
  const counts = [
    ['commands', '6 von 6 Einträgen'],
    ['flags', '45 von 45 Einträgen'],
    ['examples', '9 von 9 Einträgen'],
    ['formats', '5 von 5 Einträgen'],
    ['exit-codes', '4 von 4 Einträgen'],
    ['env', '19 von 19 Einträgen'],
  ]
  for (const [section, expected] of counts) {
    await page.goto(`./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=${section}`)
    await expect(page.locator('.explorer-reader-heading [role=status]')).toContainText(expected)
  }
  await expect(page.getByRole('button', { name: /Scan starten|Start scan/i })).toHaveCount(0)
})

test('ubs usage and examples remain exact source strings', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=commands&docQ=scan')
  await page.getByRole('button', { name: 'scan, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details .command-block code').first()).toHaveText('ubs [options] [PATH ...]')

  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=examples&docQ=two%20changed%20files')
  await page.getByRole('button', { name: 'Scan two changed files, machine-readable, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details .command-block code').first()).toHaveText('ubs src/a.ts src/b.py --ci --format=json')
})

test('ubs null flag arguments stay null and never gain a value parameter', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=flags&docQ=--ci')
  await page.getByRole('button', { name: '--ci, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('args ist im Snapshot null')
  await expect(details).toContainText(/kein Wertargument/i)
  await expect(details).toContainText('"args": null')
  await expect(details.locator('.command-block code')).toHaveText('--ci')
  await expect(details.locator('.command-block code')).not.toContainText('ubs --ci')
})

test('ubs exit code 3 and partial runs never appear as a successful scan', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=exit-codes&docQ=3')
  await page.getByRole('button', { name: '3, Eintrag öffnen' }).click()
  let details = page.locator('.explorer-details')
  await expect(details).toContainText('Nothing was scanned')
  await expect(details).toContainText('kein bestandener Scan')
  await expect(details).not.toContainText('Erfolgreich bestanden')

  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=exit-codes&docQ=partial')
  await page.getByRole('button', { name: '2, Eintrag öffnen' }).click()
  details = page.locator('.explorer-details')
  await expect(details).toContainText('partial run')
  await expect(details).toContainText('Exitcode 2')
})

test('ubs output formats keep documented schema invocations and stream wording', async ({ page }) => {
  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=formats&docQ=schema=json')
  await page.getByRole('button', { name: 'json, Eintrag öffnen' }).click()

  const details = page.locator('.explorer-details')
  await expect(details).toContainText('ubs --schema=json')
  await expect(details.locator('.command-block code')).toHaveText('ubs --schema=json')

  await page.goto('./?section=explore&exploreTool=ubs&dataset=robot-docs&docSection=guide&docQ=JSONL')
  await page.getByRole('button', { name: 'Scan workflow, Eintrag öffnen' }).click()
  await expect(page.locator('.explorer-details')).toContainText('one JSONL stream')
})
