import { defineConfig, devices } from '@playwright/test';

/**
 * RePage PDF E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL from environment variable or default */
    baseURL: process.env.E2E_BASE_URL || 'https://repagepdf.path-finder.jp',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude image-table test from main parallel run
      testIgnore: ['**/image-table.spec.ts'],
    },
    {
      // Run image-table test AFTER all other tests complete
      // This test needs exclusive backend access for conversion
      name: 'image-table',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/image-table.spec.ts',
      dependencies: ['chromium'],
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results/',
});
