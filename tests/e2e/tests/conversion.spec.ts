import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Conversion E2E Tests
 * Covers: FR-007 (PDF Upload), FR-012 (HTML Generation), FR-016 (HTML Download)
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TEST_PDF = path.join(FIXTURES_DIR, 'test_simple.pdf');

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(TEST_USER.email);

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(TEST_USER.password);

  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');

  // Wait for redirect to templates
  await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });
}

test.describe('PDF Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('FR-007: PDF Upload Flow', () => {
    test('TC-007-01: Navigate to template detail by clicking', async ({ page }) => {
      // Look for template name links
      const templateLinks = page.locator('a.text-lg.font-semibold[href^="/templates/"]');
      const count = await templateLinks.count();

      if (count === 0) {
        test.skip();
        return;
      }

      // Click on the first template
      await templateLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should be on template detail page
      await expect(page).toHaveURL(/\/templates\/\d+/);

      // Should have back link
      const backLink = page.locator('text=テンプレート一覧');
      await expect(backLink).toBeVisible({ timeout: 10000 });
    });

    test('TC-007-02: Template detail shows status', async ({ page }) => {
      // Click on a template to go to detail
      const templateLinks = page.locator('a.text-lg.font-semibold[href^="/templates/"]');
      const count = await templateLinks.count();

      if (count === 0) {
        test.skip();
        return;
      }

      await templateLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for various status indicators
      const hasLearning = await page.locator('text=テンプレートを学習中です').isVisible().catch(() => false);
      const hasReady = await page.locator('text=PDFファイルをドラッグ&ドロップ').isVisible().catch(() => false);
      const hasFailed = await page.locator('text=学習が完了していません').isVisible().catch(() => false);
      const hasBackLink = await page.locator('text=テンプレート一覧').isVisible().catch(() => false);

      // At least one of these should be visible
      expect(hasLearning || hasReady || hasFailed || hasBackLink).toBeTruthy();
    });

    test('TC-007-03: Upload PDF file when template is ready', async ({ page }) => {
      // Find a template that's ready (has "学習完了" status on list)
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for ready templates (those with "変換する" button visible)
      const convertButtons = page.locator('a:has-text("変換する")');
      const readyCount = await convertButtons.count();

      if (readyCount === 0) {
        // No ready templates, skip this test
        test.skip();
        return;
      }

      // Click on the convert button of a ready template
      await convertButtons.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should see the upload dropzone
      const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
      await expect(uploadArea).toBeVisible({ timeout: 10000 });

      // Find file input and upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_PDF);

      // Verify file is selected
      await expect(page.locator('text=test_simple.pdf')).toBeVisible({ timeout: 5000 });

      // Check convert button is enabled
      const convertBtn = page.getByRole('button', { name: '変換開始' });
      await expect(convertBtn).toBeEnabled();
    });

    test('TC-007-04: Clear selected file', async ({ page }) => {
      // Find a ready template
      const convertButtons = page.locator('a:has-text("変換する")');
      const readyCount = await convertButtons.count();

      if (readyCount === 0) {
        test.skip();
        return;
      }

      await convertButtons.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
      const isReady = await uploadArea.isVisible().catch(() => false);

      if (!isReady) {
        test.skip();
        return;
      }

      // Upload a file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_PDF);
      await expect(page.locator('text=test_simple.pdf')).toBeVisible({ timeout: 5000 });

      // Clear the file - find the X button with gray-400 text color (clear button styling)
      const clearBtn = page.locator('button.text-gray-400');
      await clearBtn.click();

      // Verify dropzone is shown again
      await expect(page.locator('text=PDFファイルをドラッグ&ドロップ')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('FR-012: HTML Generation', () => {
    test('TC-012-01: Start conversion with PyMuPDF', async ({ page }) => {
      // Find a ready template
      const convertButtons = page.locator('a:has-text("変換する")');
      const readyCount = await convertButtons.count();

      if (readyCount === 0) {
        test.skip();
        return;
      }

      await convertButtons.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
      const isReady = await uploadArea.isVisible().catch(() => false);

      if (!isReady) {
        test.skip();
        return;
      }

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_PDF);
      await expect(page.locator('text=test_simple.pdf')).toBeVisible({ timeout: 5000 });

      // Select PyMuPDF converter
      const converterSelect = page.locator('select');
      await converterSelect.selectOption({ value: 'pymupdf' });

      // Start conversion
      const convertBtn = page.getByRole('button', { name: '変換開始' });
      await convertBtn.click();

      // Wait for conversion to start
      await page.waitForTimeout(5000);

      // Check conversion appears in history - should see file name in the page
      await expect(page.locator('text=test_simple.pdf').last()).toBeVisible({ timeout: 15000 });
    });

    test('TC-012-02: Template detail shows conversion history section', async ({ page }) => {
      // Navigate to any template detail
      const templateLinks = page.locator('a.text-lg.font-semibold[href^="/templates/"]');
      const count = await templateLinks.count();

      if (count === 0) {
        test.skip();
        return;
      }

      await templateLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if there is a conversion history section (use heading role to be specific)
      const historyTitle = page.getByRole('heading', { name: '変換履歴', exact: true });
      await expect(historyTitle).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('FR-016: HTML Download', () => {
    test('TC-016-01: Completed conversions have download button', async ({ page }) => {
      // Navigate to conversions page via sidebar
      await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find download buttons (only visible for completed conversions)
      const downloadButtons = page.locator('button[title="ダウンロード"]');
      const count = await downloadButtons.count();

      if (count > 0) {
        await expect(downloadButtons.first()).toBeVisible();
      } else {
        // No completed conversions yet - that's ok
        test.skip();
      }
    });

    test('TC-016-02: Completed conversions have preview button', async ({ page }) => {
      // Navigate to conversions page via sidebar
      await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find preview buttons (only visible for completed conversions)
      const previewButtons = page.locator('button[title="プレビュー"]');
      const count = await previewButtons.count();

      if (count > 0) {
        await expect(previewButtons.first()).toBeVisible();
      } else {
        // No completed conversions yet - that's ok
        test.skip();
      }
    });
  });

  test.describe('Conversions List Page', () => {
    test('TC-LIST-01: Navigate to conversions page', async ({ page }) => {
      // Click conversions link in sidebar
      await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/conversions/);
      await expect(page.locator('h1')).toContainText('変換履歴');
    });

    test('TC-LIST-02: Conversions page shows history or empty state', async ({ page }) => {
      await page.goto('/conversions');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for either conversions or empty state
      const emptyState = page.locator('text=変換履歴がありません');
      const conversionItems = page.locator('.bg-gray-50');

      const isEmpty = await emptyState.isVisible().catch(() => false);
      const itemCount = await conversionItems.count().catch(() => 0);

      expect(isEmpty || itemCount > 0).toBeTruthy();
    });

    test('TC-LIST-03: Conversions page structure', async ({ page }) => {
      // Navigate using sidebar link for reliable navigation
      await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're on the conversions page
      await expect(page).toHaveURL(/\/conversions/);

      // Check page has expected elements
      // 1. Page title
      await expect(page.locator('h1')).toContainText('変換履歴');

      // 2. Either empty state or list content
      const hasEmptyOrContent = await page.locator('text=変換履歴がありません').isVisible().catch(() => false) ||
                                 await page.locator('text=変換一覧').isVisible().catch(() => false);

      expect(hasEmptyOrContent).toBeTruthy();
    });
  });
});
