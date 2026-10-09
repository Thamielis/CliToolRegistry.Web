import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const snapshot = {
  fileCount: 2, loadedAt: '2026-10-08T09:00:00Z', sourceRef: 'develop',
  tools: [
    {
      id: 'git', name: 'Git', description: 'Verteilte Versionsverwaltung', category: 'foundation',
      tier: 'required', command: 'git', platforms: ['windows', 'linux', 'macos'], tags: ['scm'],
      install: { windows: { winget: { command: 'winget install --id Git.Git' } }, linux: { apt: 'sudo apt-get install git' } },
      healthCheck: 'git --version', dependencies: { recommended: ['git-lfs'] },
      website: 'https://git-scm.com/', catalogFile: 'foundation.yml', catalogUrl: 'https://example.com/foundation.yml',
    },
    {
      id: 'rg', name: 'ripgrep', description: 'Fast recursive search', category: 'terminal',
      tier: 'recommended', command: 'rg', platforms: ['linux', 'macos'], tags: ['search'],
      install: { linux: 'sudo apt-get install ripgrep' }, robotMode: { supported: true },
      catalogFile: 'terminal.yml', catalogUrl: 'https://example.com/terminal.yml',
    },
    {
      id: 'jq', name: 'jq', description: 'JSON processor', category: 'terminal', tier: 'recommended',
      command: 'jq', platforms: ['linux'], catalogFile: 'terminal.yml', catalogUrl: 'https://example.com/terminal.yml',
    },
  ],
}

async function openCatalog(page: Page) {
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: snapshot }))
  await page.goto('./?section=catalog')
  await expect(page.locator('.tool-card')).toHaveCount(3)
}

test('first visit is dark even with a light OS; preferences survive reload and follow system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openCatalog(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Karten+', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const themeTrigger = page.getByRole('button', { name: 'Farbschema', exact: true })
  await themeTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Hell', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(themeTrigger).toBeFocused()
  await expect(page.getByRole('button', { name: 'Hell', exact: true })).toBeHidden()
  await themeTrigger.click()
  await page.getByRole('button', { name: 'Hell', exact: true }).click()
  await page.getByRole('button', { name: 'Karten', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Karten', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Farbschema', exact: true }).click()
  await page.getByRole('button', { name: 'System', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('all views share filters, no-results recovery, and a clear action that returns focus', async ({ page }) => {
  await openCatalog(page)
  const search = page.getByRole('searchbox')
  await search.fill('scm')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Karten', exact: true }).click()
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await expect(page.locator('.tool-card-commands')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tabelle', exact: true }).click()
  await expect(page.locator('.tool-table tbody tr')).toHaveCount(1)
  await expect(search).toHaveValue('scm')
  await search.fill('no-such-tool')
  await expect(page.getByText('Keine Werkzeuge passen zu diesen Filtern.')).toBeVisible()
  await page.getByRole('button', { name: 'Suche leeren' }).click()
  await expect(search).toBeFocused()
  await expect(page.locator('.tool-table tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: 'Karten+', exact: true }).click()
  await page.locator('.filter-toolbar select').last().selectOption('windows')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await expect(page.locator('.tool-card code').filter({ hasText: 'winget install' })).toBeVisible()
})

test('platform choice changes commands and never borrows an unsupported OS command', async ({ page }) => {
  await openCatalog(page)
  const git = page.getByRole('article', { name: 'Git', exact: true })
  await git.getByRole('combobox').selectOption('linux')
  await expect(git.getByText('sudo apt-get install git', { exact: true })).toBeVisible()
  await git.getByRole('combobox').selectOption('macos')
  await expect(git.getByText('Kein Installationsbefehl hinterlegt')).toBeVisible()
  await expect(git.getByText('sudo apt-get install git', { exact: true })).toHaveCount(0)
})

test('card details are keyboard-accessible and Escape restores focus', async ({ page }) => {
  await openCatalog(page)
  const trigger = page.getByRole('button', { name: 'Git, Details', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#tool-details-heading-git')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Git, Details schließen', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#tool-details-git').getByText('git-lfs')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.locator('#tool-details-git')).toHaveCount(0)
  await trigger.click()
  await page.locator('#tool-details-git').getByRole('button', { name: 'Details schließen' }).click()
  await expect(trigger).toBeFocused()
})

test('table details share the same disclosure and return focus', async ({ page }) => {
  await openCatalog(page)
  await page.getByRole('button', { name: 'Tabelle', exact: true }).click()
  const trigger = page.getByRole('button', { name: 'Git, Details', exact: true })
  await trigger.click()
  await expect(page.locator('#tool-details-heading-git')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('copy succeeds and clipboard rejection has accessible feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCatalog(page)
  const git = page.getByRole('article', { name: 'Git', exact: true })
  await git.getByRole('button', { name: 'Befehl kopieren' }).first().click()
  await expect(git.getByRole('button', { name: 'Kopiert' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('git')
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('Denied')) })
  await git.getByRole('button', { name: 'Befehl kopieren' }).last().click()
  await expect(git.getByRole('alert')).toHaveText('Kopieren nicht möglich')
})

test('loading and initial failure recover on retry; cached refresh preserves cards', async ({ page }) => {
  let fail = true
  await page.route('**/registry-catalog.json?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150))
    await route.fulfill(fail ? { status: 503, body: 'Unavailable' } : { json: snapshot })
  })
  await page.goto('./?section=catalog')
  await expect(page.getByText('Werkzeuge werden geladen …')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Katalog konnte nicht geladen werden', exact: true })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(page.locator('.tool-card')).toHaveCount(3)
  fail = true
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.getByText(/Die Live-Aktualisierung ist fehlgeschlagen/)).toBeVisible()
  await expect(page.locator('.tool-card')).toHaveCount(3)
  await page.reload()
  await expect(page.locator('.tool-card')).toHaveCount(3)
  await expect(page.getByText(/Die Live-Aktualisierung ist fehlgeschlagen/)).toBeVisible()
})

test('empty catalog has a truthful empty state', async ({ page }) => {
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: { ...snapshot, tools: [] } }))
  await page.goto('./?section=catalog')
  await expect(page.getByText('Der Katalog enthält keine Werkzeuge.')).toBeVisible()
})

test('blocked preference storage does not break theme or view changes', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Blocked') }
    Storage.prototype.setItem = () => { throw new Error('Blocked') }
  })
  await openCatalog(page)
  await page.getByRole('button', { name: 'Farbschema', exact: true }).click()
  await page.getByRole('button', { name: 'Hell', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Tabelle', exact: true }).click()
  await expect(page.locator('.tool-table tbody tr')).toHaveCount(3)
})

for (const theme of ['Dunkel', 'Hell']) {
  test(`accessibility in ${theme}: each view and expanded detail in English`, async ({ page }) => {
    await openCatalog(page)
    await page.getByRole('button', { name: 'Farbschema', exact: true }).click()
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('button', { name: 'Sprache', exact: true }).click()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Color theme', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toBeFocused()
    for (const view of ['Cards', 'Cards+', 'Table']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      await expect(page.getByRole('button', { name: view, exact: true })).toHaveAttribute('aria-pressed', 'true')
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
      expect(result.violations).toEqual([])
    }
    await page.getByRole('button', { name: 'Cards+', exact: true }).click()
    await page.getByRole('button', { name: 'Git, Details', exact: true }).click()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  })
}

test('mobile reflow, reduced motion, forced colors, and desktop screenshot of real catalog', async ({ page }, testInfo) => {
  const catalog = JSON.parse(readFileSync(new URL('../public/registry-catalog.json', import.meta.url), 'utf8'))
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: catalog }))
  await page.goto('./?section=catalog')
  await expect(page.locator('.tool-card')).toHaveCount(Math.min(48, catalog.tools.length))
  await page.screenshot({ path: testInfo.outputPath('catalog-desktop-dark.png') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    for (const name of ['Farbschema', 'Sprache']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('group', { name, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('group', { name, exact: true })).toBeHidden()
    }
    for (const view of ['Karten', 'Karten+', 'Tabelle']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Karten+', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('catalog-mobile-dark.png') })
  await page.getByRole('button', { name: 'Farbschema', exact: true }).click()
  await page.getByRole('button', { name: 'Hell', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('catalog-mobile-light.png') })
  await page.emulateMedia({ forcedColors: 'active' })
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor)).toBe('auto')
})
