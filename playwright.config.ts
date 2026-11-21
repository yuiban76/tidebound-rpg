import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 70_000,
  workers: 1,
  use: {
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.TIDE_CHROMIUM },
    trace: 'retain-on-failure',
  },
})
