import { defineConfig, devices } from '@playwright/test'

const frontend = 'http://127.0.0.1:15173'
const backend = process.env.E2E_API_URL
if (!backend || !/^http:\/\/127\.0\.0\.1:\d+$/.test(backend)) {
  throw new Error('Start the isolated stack with npm run test:e2e')
}

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: process.env.E2E_BROWSER_CHANNEL,
    baseURL: frontend,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15173 --strictPort',
    url: frontend,
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: backend,
      VITE_WS_URL: backend.replace(/^http:/, 'ws:') + '/ws',
    },
  },
})
