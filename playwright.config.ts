import { defineConfig } from '@playwright/test'

const preview = process.env.PLAYWRIGHT_PREVIEW === '1'
const port = preview ? 4180 : 4179

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/CliToolRegistry.Web/`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${preview ? 'preview' : ''} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/CliToolRegistry.Web/`,
    reuseExistingServer: !process.env.CI,
  },
})
