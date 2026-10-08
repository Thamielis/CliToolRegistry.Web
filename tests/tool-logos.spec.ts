import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const snapshot = {
  fileCount: 1,
  loadedAt: '2026-10-08T00:00:00Z',
  sourceRef: 'test-fixture',
  tools: [
    {
      id: 'git', name: 'Git', description: 'Distributed version control', category: 'foundation',
      tier: 'required', command: 'git', platforms: ['linux', 'windows'], catalogFile: 'foundation.yml',
      catalogUrl: 'https://example.test/foundation.yml', website: 'https://git-scm.com/',
      repository: 'https://github.com/git/git', install: { linux: 'sudo apt install git', windows: 'winget install Git.Git' },
    },
    {
      id: 'dotnet', name: '.NET SDK 10', description: 'Build and run .NET applications', category: 'foundation',
      tier: 'recommended', command: 'dotnet', platforms: ['linux', 'windows'], catalogFile: 'dotnet.yml',
      catalogUrl: 'https://example.test/dotnet.yml', website: 'https://dotnet.microsoft.com/',
      install: { linux: 'install dotnet', windows: 'winget install Microsoft.DotNet.SDK.10' },
    },
    {
      id: 'vercel-cli', name: 'Vercel CLI', description: 'Deploy and manage Vercel projects', category: 'cloud',
      tier: 'recommended', command: 'vercel', platforms: ['linux', 'windows'], catalogFile: 'cloud.yml',
      catalogUrl: 'https://example.test/cloud.yml', website: 'https://vercel.com/docs/cli',
      install: { linux: 'npm install -g vercel', windows: 'npm install -g vercel' },
    },
  ],
}

const APP_ORIGIN = 'http://127.0.0.1:4179'

async function blockExternalImages(page: Page) {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() !== 'image') return
    if (new URL(request.url()).origin !== APP_ORIGIN) requests.push(request.url())
  })
  await page.route((url) => url.protocol === 'https:', async (route) => {
    if (route.request().resourceType() === 'image') await route.abort()
    else await route.continue()
  })
  return requests
}

async function openLogoHarness(page: Page) {
  await page.goto('tests/fixtures/tool-logo-harness.html')
  await expect(page.getByRole('heading', { name: 'Tool logo renderer' })).toBeVisible()
}

async function expectLoadedImage(page: Page, selector: string, expectedSource: string) {
  const image = page.locator(selector)
  await expect(image).toHaveAttribute('src', expectedSource)
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
}

test('local marks use the subpath, unknown IDs and legacy values use safe text fallbacks', async ({ page }) => {
  const externalImages = await blockExternalImages(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await openLogoHarness(page)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByTestId('active-logo')).toHaveAttribute('data-testid', 'active-logo')
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/git.svg')
  await expect(page.locator('[data-logo-id="git"]')).toHaveAttribute('data-logo-kind', 'project-logo')
  await expect(page.locator('.app-card-icon .app-icon-fallback')).toHaveText('📦')
  await expect(page.locator('.app-row-icon .app-icon-fallback')).toHaveText('LU')

  for (const [selection, asset] of [
    ['dotnet', 'dotnet.svg'], ['bun', 'bun.svg'], ['pandoc', 'pandoc.svg'],
    ['python', 'python.svg'], ['docker', 'docker.svg'],
  ]) {
    await page.getByTestId(`select-${selection}`).click()
    await expectLoadedImage(page, '[data-testid="active-logo"] img', `/CliToolRegistry.Web/tool-logos/${asset}`)
  }

  await page.getByTestId('select-unknown').click()
  await expect(page.locator('[data-testid="active-logo"] .app-icon-fallback')).toHaveText('UT')
  expect(externalImages).toEqual([])
})

test('failed sources stay source-keyed and a valid replacement recovers', async ({ page }) => {
  const externalImages = await blockExternalImages(page)
  await page.route((url) => url.pathname.endsWith('/tool-logos/bun.svg'), (route) => route.abort())
  await openLogoHarness(page)
  await page.getByTestId('select-bun').click()
  await expect(page.locator('[data-testid="active-logo"] .app-icon-fallback')).toHaveText('BU')

  await page.getByTestId('select-git').click()
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/git.svg')

  let releaseFailedRequest!: () => void
  let markRequestStarted!: () => void
  const requestStarted = new Promise<void>((resolve) => { markRequestStarted = resolve })
  const requestGate = new Promise<void>((resolve) => { releaseFailedRequest = resolve })
  await page.route((url) => url.pathname.endsWith('/tool-logos/dotnet.svg'), async (route) => {
    markRequestStarted()
    await requestGate
    await route.abort()
  })
  await page.getByTestId('select-dotnet').click()
  await requestStarted
  await page.getByTestId('select-git').click()
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/git.svg')
  releaseFailedRequest()
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/git.svg')
  expect(externalImages).toEqual([])
})

test('resolved theme switches Vercel variants and follows live system preference', async ({ page }) => {
  const externalImages = await blockExternalImages(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await openLogoHarness(page)
  await page.getByTestId('select-vercel').click()
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/vercel-dark.svg')

  await page.getByTestId('theme-light').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f7fa')
  await expect(page.getByTestId('resolved-theme')).toHaveAttribute('data-resolved-theme', 'light')
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/vercel-light.svg')

  await page.getByTestId('theme-system').click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByTestId('resolved-theme')).toHaveAttribute('data-resolved-theme', 'dark')
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/vercel-dark.svg')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/vercel-light.svg')
  expect(externalImages).toEqual([])
})

test('broken dark artwork recovers when the light theme selects its separate file', async ({ page }) => {
  const externalImages = await blockExternalImages(page)
  await page.route((url) => url.pathname.endsWith('/tool-logos/vercel-dark.svg'), (route) => route.abort())
  await page.emulateMedia({ colorScheme: 'dark' })
  await openLogoHarness(page)
  await page.getByTestId('select-vercel').click()
  await expect(page.locator('[data-testid="active-logo"] .app-icon-fallback')).toHaveText('VC')

  await page.getByTestId('theme-light').click()
  await expectLoadedImage(page, '[data-testid="active-logo"] img', '/CliToolRegistry.Web/tool-logos/vercel-light.svg')
  expect(externalImages).toEqual([])
})

test('theme selection remains usable when local storage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem() { throw new Error('storage blocked') },
        setItem() { throw new Error('storage blocked') },
      },
    })
  })
  await openLogoHarness(page)
  await page.getByTestId('theme-light').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByTestId('resolved-theme')).toHaveAttribute('data-resolved-theme', 'light')
})

test('catalog views and details keep the same marks across desktop and mobile', async ({ page }, testInfo) => {
  const externalImages = await blockExternalImages(page)
  await page.route((url) => url.pathname.endsWith('/registry-catalog.json'), (route) => route.fulfill({ json: snapshot }))
  await page.goto('./')
  await expect(page.locator('.tool-card')).toHaveCount(3)
  await expectLoadedImage(page, '.tool-card .app-icon-frame[data-logo-id="git"] img', '/CliToolRegistry.Web/tool-logos/git.svg')
  await page.screenshot({ path: testInfo.outputPath('cards-dark-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Hell', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.screenshot({ path: testInfo.outputPath('cards-light-desktop.png'), fullPage: true })

  await page.getByRole('button', { name: 'Tabelle', exact: true }).click()
  await expect(page.locator('.tool-table .tool-table-logo')).toHaveCount(3)
  await page.screenshot({ path: testInfo.outputPath('table-light-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Git, Details' }).click()
  await expect(page.locator('.detail-header .detail-logo')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('details-light-desktop.png'), fullPage: true })

  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])
  await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('details-dark-desktop.png'), fullPage: true })

  await page.setViewportSize({ width: 320, height: 900 })
  await page.getByRole('button', { name: 'Karten+', exact: true }).click()
  await expect(page.locator('.tool-card')).toHaveCount(3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('cards-dark-mobile-320.png'), fullPage: true })
  await page.getByRole('button', { name: 'Git, Details' }).click()
  await expect(page.locator('.tool-details')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('details-dark-mobile-320.png'), fullPage: true })
  await page.getByRole('button', { name: 'Tabelle', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('table-dark-mobile-320.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Karten', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('cards-compact-dark-mobile-390.png'), fullPage: true })
  expect(externalImages).toEqual([])
})
