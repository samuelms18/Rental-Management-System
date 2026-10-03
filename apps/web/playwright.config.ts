import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a running app (`pnpm build && pnpm start`) and local Supabase with seed data.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    ...devices['Pixel 7'],
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    screenshot: 'only-on-failure',
  },
  outputDir: './e2e/.results',
});
