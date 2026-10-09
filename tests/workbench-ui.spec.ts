import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

const tools = [
  { id: 'git', name: 'Git', description: 'Version control', category: 'foundation', tier: 'required', command: 'git', platforms: ['linux', 'windows'],
    catalogFile: 'tools.yml', catalogUrl: 'https://example.test/tools.yml', tags: ['scm'], install: { linux: 'sudo apt install git', windows: 'winget install Git.Git' },
    dependencies: { required: ['rg', 'rg'], recommended: ['git-lfs'] } },
  { id: 'rg', name: 'ripgrep', description: 'Search files', category: 'terminal', tier: 'optional', command: 'rg', platforms: ['linux'],
    catalogFile: 'tools.yml', catalogUrl: 'https://example.test/tools.yml', dependencies: { required: ['git'] } },
  { id: 'jq', name: 'jq', description: 'JSON processor', category: 'terminal', tier: 'optional', command: 'jq', platforms: ['linux'],
    catalogFile: 'tools.yml', catalogUrl: 'https://example.test/tools.yml' },
]
const snapshot = { tools, fileCount: 1, loadedAt: '2026-10-09T00:00:00Z', sourceRef: 'main' }

async function open(page: Page, query = '') {
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: snapshot }))
  await page.goto('./' + query)
  await expect(page.locator('#screen-heading')).toBeVisible()
}

test('overview terminal uses real commands and category launchers enter filtered catalog', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await expect(page.locator('.hero-copy h1')).toContainText('Dein Terminal.')
  await page.getByLabel('Werkzeug in der Vorschau').selectOption('git')
  await expect(page.locator('.terminal-preview')).toContainText('sudo apt install git')
  await page.getByLabel('Plattform in der Vorschau').selectOption('windows')
  await expect(page.locator('.terminal-preview')).toContainText('winget install Git.Git')
  await page.locator('.terminal-preview').getByRole('button', { name: 'Befehl kopieren' }).first().click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('git')
  await page.locator('.category-launchers').getByRole('button', { name: /Terminal/ }).click()
  await expect(page).toHaveURL(/section=catalog/)
  await expect(page.locator('.tool-card')).toHaveCount(2)
})

test('URL state, selected detail, back/forward and reload preserve context', async ({ page }) => {
  await open(page, '?section=catalog&q=scm&platform=linux&view=list&campaign=docs')
  await expect(page.locator('.tool-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Git, Details', exact: true }).click()
  await expect(page).toHaveURL(/tool=git/)
  await page.reload()
  await expect(page.locator('#tool-details-heading-git')).toBeFocused()
  await page.locator('.top-nav').getByRole('link', { name: 'Anleitung' }).click()
  await expect(page).toHaveURL(/section=guide/)
  await expect(page.locator('#screen-heading')).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('scm')
  await expect(page.locator('#tool-details-git')).toBeVisible()
  await page.getByRole('button', { name: 'Details schließen', exact: true }).click()
  await expect(page).not.toHaveURL(/tool=/)
  await expect(page).toHaveURL(/campaign=docs/)
  await page.goForward()
  await expect(page.locator('#screen-heading')).toHaveText('Dein nächster Schritt ist ein Befehl.')
})

test('palette keyboard, no results, IME, Escape and tool revelation', async ({ page }) => {
  await open(page, '?section=catalog&q=no-match&platform=windows')
  const trigger = page.getByRole('button', { name: 'Befehlspalette öffnen' })
  await trigger.focus()
  await page.keyboard.press('Control+k')
  const search = page.getByRole('combobox', { name: 'Werkzeuge und Bereiche suchen' })
  await expect(search).toBeFocused()
  await search.fill('nothing-matches')
  await expect(page.getByText('Keine Treffer. Suche nach einem Namen oder Befehl.')).toBeVisible()
  await page.getByRole('button', { name: 'Suche leeren' }).last().click()
  await expect(search).toBeFocused()
  await search.fill('ripgrep')
  await search.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
  await expect(page.getByRole('dialog')).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Home')
  await search.press('Enter')
  await expect(page.locator('#tool-details-heading-rg')).toBeFocused()
  await expect(page).toHaveURL(/tool=rg/)
  await expect(page).not.toHaveURL(/platform=windows/)
  await page.keyboard.press('Escape')
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.dispatchEvent('keydown', { key: 'k', ctrlKey: true, isComposing: true })
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('dependency explorer distinguishes exact edges, external references and incoming dependents', async ({ page }) => {
  await open(page, '?section=dependencies&tool=git')
  await expect(page.locator('[data-edge="git->rg"][data-kind="required"]')).toHaveCount(1)
  await expect(page.locator('[data-edge="rg->git"]')).toHaveCount(1)
  await expect(page.locator('[data-node="git-lfs"]')).toHaveClass(/external/)
  await expect(page.locator('.external-reference')).toContainText('Externe Referenz')
  await page.getByRole('button', { name: 'Details schließen', exact: true }).click()
  const graphTrigger = page.locator('.dependency-diagram').getByRole('button', { name: 'ripgrep, Details', exact: true })
  await graphTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#tool-details-heading-rg')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(graphTrigger).toBeFocused()
  const relation = page.locator('.relationship-group').filter({ has: page.getByRole('heading', { name: /^Erforderlich / }) }).first()
  await relation.getByRole('button', { name: /ripgrep/ }).click()
  await expect(page.locator('#tool-details-heading-rg')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(relation.getByRole('button', { name: /ripgrep/ })).toBeFocused()
  await page.getByLabel('Werkzeug im Graphen').selectOption('jq')
  await expect(page.locator('.graph-node')).toHaveCount(1)
  await expect(page.locator('.graph-focus')).toContainText('Keine Beziehungen hinterlegt.')
  await page.getByRole('button', { name: 'Graph vergrößern' }).click()
  await page.getByRole('button', { name: 'Graph nach rechts verschieben' }).click()
  await expect(page.locator('.dependency-diagram')).not.toHaveAttribute('viewBox', '0 0 800 540')
  await page.getByRole('button', { name: 'Graph zurücksetzen' }).click()
  await expect(page.locator('.dependency-diagram')).toHaveAttribute('viewBox', '0 0 800 540')
})

test('lab first visit, successful diffs, failed refresh and exported comparison are truthful', async ({ page }) => {
  let version = 0
  await page.route('**/registry-catalog.json?*', (route) => {
    if (version === 2) return route.fulfill({ status: 503 })
    return route.fulfill({ json: version === 0 ? snapshot : { ...snapshot, loadedAt: '2026-10-10T00:00:00Z', tools: [
      { ...tools[0], command: 'git --version' }, tools[2], { ...tools[1], id: 'new-tool', name: 'New tool', dependencies: undefined },
    ] } })
  })
  await page.goto('./?section=lab')
  await expect(page.getByRole('heading', { name: 'Noch keine Vergleichsbasis vorhanden.' })).toBeVisible()
  await page.getByRole('button', { name: 'Aktuellen Stand als Basis setzen' }).click()
  await expect(page.getByText('Keine Werkzeugänderungen zwischen diesen Datenständen.')).toBeVisible()
  version = 1
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.locator('.change-list button')).toHaveCount(3)
  await page.locator('.change-list').getByRole('button', { name: /Geändert Git/ }).click()
  await expect(page.locator('.changed-fields')).toContainText('command')
  await expect(page.locator('.diff-pair')).toContainText('git --version')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Vergleich herunterladen' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('cli-tool-registry-comparison.json')
  const data = JSON.parse(readFileSync((await file.path())!, 'utf8'))
  expect(data.changes.map((change: { kind: string }) => change.kind).sort()).toEqual(['added', 'modified', 'removed'])
  version = 2
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.getByText(/Die Live-Aktualisierung ist fehlgeschlagen/)).toBeVisible()
  await expect(page.locator('.change-list button')).toHaveCount(3)
  version = 1
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.getByText('Keine Werkzeugänderungen zwischen diesen Datenständen.')).toBeVisible()
})

test('invalid startup cache and invalid refresh never replace a successful snapshot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cli-tool-registry.catalog.v2', JSON.stringify({ tools: [{}], loadedAt: 'bad', fileCount: 1 })))
  await open(page, '?section=catalog')
  await expect(page.locator('.tool-card')).toHaveCount(3)
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: { ...snapshot, tools: [{}] } }))
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.getByText(/Die Live-Aktualisierung ist fehlgeschlagen/)).toBeVisible()
  await expect(page.locator('.tool-card')).toHaveCount(3)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cli-tool-registry.catalog.v2')!).tools[0].id)).toBe('git')
})

test('1000 tools render bounded catalog, palette and graph with complete dependency lists', async ({ page }) => {
  const many = Array.from({ length: 1000 }, (_, i) => ({ ...tools[2], id: 't-' + i, name: 'Tool ' + String(i).padStart(4, '0'), dependencies: { required: i ? ['t-0'] : [] } }))
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: { ...snapshot, tools: many } }))
  await page.goto('./?section=catalog')
  await expect(page.locator('.tool-card')).toHaveCount(48)
  await page.getByRole('button', { name: 'Weitere Werkzeuge laden' }).click()
  await expect(page.locator('.tool-card')).toHaveCount(96)
  await page.getByRole('searchbox').fill('0999')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Befehlspalette öffnen' }).click()
  await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(20)
  await page.keyboard.press('Escape')
  await page.goto('./?section=dependencies&tool=t-0')
  await expect(page.locator('.graph-node')).toHaveCount(49)
  await expect(page.locator('.relationship-group button')).toHaveCount(999)
})

for (const theme of ['Dunkel', 'Hell']) {
  test(`all screens: ${theme}, English, accessibility, narrow layout and screenshots`, async ({ page }, testInfo) => {
    await open(page)
    await page.getByRole('button', { name: 'Farbschema', exact: true }).click()
    await page.getByRole('button', { name: theme, exact: true }).click()
    await page.getByRole('button', { name: 'Sprache', exact: true }).click()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    for (const name of ['Overview', 'Catalog', 'Dependencies', 'Catalog lab', 'Guide']) {
      await page.locator('.top-nav').getByRole('link', { name, exact: true }).click()
      await expect(page.locator('#screen-heading')).toBeVisible()
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
      if (name === 'Overview') await page.locator('.terminal-preview').evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)))
      await page.screenshot({ path: testInfo.outputPath(name.replaceAll(' ', '-') + '-desktop.png') })
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      }
      await page.screenshot({ path: testInfo.outputPath(name.replaceAll(' ', '-') + '-mobile.png') })
      await page.setViewportSize({ width: 1440, height: 1000 })
    }
    await page.getByRole('button', { name: 'Open command palette' }).click()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.keyboard.press('Escape')
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
    await page.locator('.top-nav').getByRole('link', { name: 'Overview', exact: true }).click()
    expect(await page.locator('.terminal-preview').evaluate((node) => getComputedStyle(node).animationName)).toBe('none')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor)).toBe('auto')
  })
}

test('real catalog loads with subpath assets and deep query links reload', async ({ page }, testInfo) => {
  await page.goto('./?section=dependencies&tool=apr')
  await expect(page.locator('.graph-focus h2')).toBeVisible()
  await expect(page.locator('[data-edge="apr->oracle"]')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.graph-focus h2')).toBeVisible()
  await page.locator('.top-nav').getByRole('link', { name: 'Übersicht', exact: true }).click()
  await page.locator('.terminal-preview').evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)))
  await page.screenshot({ path: testInfo.outputPath('real-overview-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('real-overview-mobile.png'), fullPage: true })
  await expect(page.locator('.terminal-preview img').first()).toHaveAttribute('src', /\/CliToolRegistry.Web\/tool-logos\//)
})

test('lazy screen failure has accessible reload recovery that preserves its URL', async ({ page }) => {
  let fail = true
  await page.route(/\/(?:src\/components\/DependencyExplorer\.tsx|assets\/DependencyExplorer-[^/]+\.js)(?:\?.*)?$/, (route) => fail ? route.abort() : route.continue())
  await open(page)
  await page.locator('.top-nav').getByRole('link', { name: 'Abhängigkeiten', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dieser Bereich konnte nicht geladen werden.' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Seite neu laden' }).click()
  await expect(page).toHaveURL(/section=dependencies/)
  await expect(page.locator('.graph-focus h2')).toBeVisible()
})

test('good startup cache is a comparison baseline and write failures keep live data usable', async ({ page }) => {
  await page.addInitScript((cached) => localStorage.setItem('cli-tool-registry.catalog.v2', JSON.stringify(cached)), snapshot)
  await page.route('**/registry-catalog.json?*', (route) => route.fulfill({ json: { ...snapshot, tools: [{ ...tools[0], command: 'git --help' }] } }))
  await page.goto('./?section=lab')
  await expect(page.locator('.change-list button')).toHaveCount(3)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage full') } })
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click()
  await expect(page.getByText('Der aktuelle Katalog ist verfügbar, konnte aber nicht im Browser gespeichert werden.')).toBeVisible()
  await expect(page.getByText('Keine Werkzeugänderungen zwischen diesen Datenständen.')).toBeVisible()
  await page.locator('.top-nav').getByRole('link', { name: 'Katalog', exact: true }).click()
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await expect(page.locator('.tool-card code').first()).toHaveText('git')
  await expect(page.locator('.tool-card .command-block code').first()).toHaveText('git --help')
})
