import { defineConfig } from '@playwright/test';

// A stand-in for someone else's test suite. It uses the
// starter file and nothing else from the framework.
// tests/starter/starter.spec.ts runs it and checks each result.
const BASE = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: '.',
  workers: 1,
  timeout: 15_000,
  use: { baseURL: `${BASE}/`, channel: 'chromium', actionTimeout: 2_000 },
  webServer: {
    command: 'node scripts/serve.mjs',
    cwd: '..',
    url: `${BASE}/fixed/`,
    reuseExistingServer: true,
  },
});
