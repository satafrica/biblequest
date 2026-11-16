import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/live', timeout: 120_000, workers: 1,
  use: { baseURL: 'http://localhost:4174/', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: { command: 'npx vite preview --outDir dist-online --port 4174 --strictPort', port: 4174, reuseExistingServer: true },
})
