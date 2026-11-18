import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 420, height: 900 },
    locale: 'fa-IR',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'], locale: 'fa-IR' },
    },
  ],
  webServer: [
    {
      command: 'npm --workspace @segmentpay/api run dev',
      port: 4000,
      cwd: '..',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm --workspace @segmentpay/web run dev',
      port: 5173,
      cwd: '..',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
