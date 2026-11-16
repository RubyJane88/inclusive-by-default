import { defineConfig } from '@playwright/test';

// The three pages in ../app are shared with the Python
// version. Each one is a project, so the same test file
// can run against any of them:
//   npx playwright test tests/a11y --project=broken
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const VARIANTS = ['broken', 'fixed', 'hollow'];
const OWN_PAGES = /tests\/(meta|starter)\//;

export default defineConfig({
  testDir: './tests',
  workers: 1,
  // Fail fast rather than hang.
  timeout: 15_000,
  expect: { timeout: 2_000 },
  reporter: [['./framework/reporter.ts']],
  use: {
    actionTimeout: 2_000,
    navigationTimeout: 5_000,
    channel: 'chromium',
  },
  projects: [
    ...VARIANTS.map((variant) => ({
      name: variant,
      testIgnore: OWN_PAGES,
      use: { baseURL: `${BASE}/${variant}/` },
    })),
    // These tests choose their own pages.
    {
      name: 'meta',
      testMatch: OWN_PAGES,
      use: { baseURL: `${BASE}/` },
    },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `${BASE}/fixed/`,
    reuseExistingServer: true,
  },
});
