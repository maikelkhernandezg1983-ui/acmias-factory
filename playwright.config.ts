import { defineConfig, devices } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: 'list',
  use: { baseURL: base, launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'escritorio', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
