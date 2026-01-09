import { test, expect } from '@playwright/test';

/**
 * Template Rules Editor E2E Tests
 * Covers: FR-007 (Template Rules Editor)
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Helper function to login
async function login(page: any) {
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

// Helper to navigate to a ready template's detail page
async function navigateToReadyTemplate(page: any) {
  await page.goto('/templates');
  await page.waitForLoadState('networkidle');

  // Find a template with "ready" status (green badge)
  // Look for template cards that have StatusBadge with "ready" or "学習完了"
  const readyTemplates = page.locator('a[href^="/templates/"]').filter({
    has: page.locator('text=学習完了')
  });

  const count = await readyTemplates.count();
  if (count > 0) {
    await readyTemplates.first().click();
    await page.waitForLoadState('networkidle');
    return true;
  }

  // Alternative: just click first template and check status
  const templateLinks = page.locator('a[href^="/templates/"].text-lg');
  if (await templateLinks.count() > 0) {
    await templateLinks.first().click();
    await page.waitForLoadState('networkidle');
    return true;
  }

  return false;
}

test.describe('Template Rules Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('FR-007: Rules Tab Navigation', () => {
    test('TC-007-01: Display tabs on template detail page', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Check for tab buttons - target the tab container specifically
      const tabContainer = page.locator('.border-b.mb-6');
      await expect(tabContainer.locator('button', { hasText: '変換' })).toBeVisible();
      await expect(page.getByRole('button', { name: /ルール編集/ })).toBeVisible();
    });

    test('TC-007-02: Switch to rules edit tab', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Click rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      // Check for rules editor content (either form or learning message)
      const rulesEditor = page.locator('text=ルール編集');
      const learningMessage = page.locator('text=学習中');
      const notLearnedMessage = page.locator('text=まだ学習されていません');

      const hasEditor = await rulesEditor.isVisible().catch(() => false);
      const isLearning = await learningMessage.isVisible().catch(() => false);
      const notLearned = await notLearnedMessage.isVisible().catch(() => false);

      expect(hasEditor || isLearning || notLearned).toBeTruthy();
    });

    test('TC-007-03: Switch back to conversion tab', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(300);

      // Go back to conversion tab
      await page.getByRole('button', { name: /変換/ }).click();
      await page.waitForTimeout(300);

      // Should see PDF upload area
      await expect(page.locator('text=PDF一括変換')).toBeVisible();
    });
  });

  test.describe('FR-007: Structured Form Editor', () => {
    test('TC-007-04: Display structured form sections', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      // Check if not learning
      const isLearning = await page.locator('text=学習中です').isVisible().catch(() => false);
      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);

      if (isLearning || notLearned) {
        test.skip();
        return;
      }

      // Check for section tabs
      await expect(page.getByRole('button', { name: '基本情報' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'デザイン' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'HTMLテンプレート' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'カスタムCSS' })).toBeVisible();
      await expect(page.getByRole('button', { name: '変換指示' })).toBeVisible();
    });

    test('TC-007-05: Edit basic info section', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Click basic info section
      await page.getByRole('button', { name: '基本情報' }).click();
      await page.waitForTimeout(300);

      // Check for input fields
      const siteNameInput = page.locator('input[placeholder*="My Blog"]');
      const baseUrlInput = page.locator('input[placeholder*="example.com"]');

      const hasSiteNameInput = await siteNameInput.isVisible().catch(() => false);
      const hasBaseUrlInput = await baseUrlInput.isVisible().catch(() => false);

      expect(hasSiteNameInput || hasBaseUrlInput).toBeTruthy();
    });

    test('TC-007-06: Navigate between form sections', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Click design section
      await page.getByRole('button', { name: 'デザイン' }).click();
      await page.waitForTimeout(300);

      // Should see color inputs
      await expect(page.locator('text=カラー設定')).toBeVisible();

      // Click CSS section
      await page.getByRole('button', { name: 'カスタムCSS' }).click();
      await page.waitForTimeout(300);

      // Should see CSS textarea
      await expect(page.locator('text=インラインCSS')).toBeVisible();
    });
  });

  test.describe('FR-007: JSON Editor Mode', () => {
    test('TC-007-07: Switch to JSON edit mode', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Click JSON mode button
      await page.getByRole('button', { name: 'JSON' }).click();
      await page.waitForTimeout(300);

      // Should see JSON editor
      await expect(page.locator('text=JSON編集')).toBeVisible();
    });

    test('TC-007-08: Switch between form and JSON modes', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Switch to JSON
      await page.getByRole('button', { name: 'JSON' }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=JSON編集')).toBeVisible();

      // Switch back to form
      await page.getByRole('button', { name: 'フォーム' }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('button', { name: '基本情報' })).toBeVisible();
    });
  });

  test.describe('FR-007: Save Functionality', () => {
    test('TC-007-09: Save button is visible', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Save button should be visible
      await expect(page.getByRole('button', { name: /保存/ })).toBeVisible();
    });

    test('TC-007-10: Save button disabled when no changes', async ({ page }) => {
      const hasTemplate = await navigateToReadyTemplate(page);
      if (!hasTemplate) {
        test.skip();
        return;
      }

      // Go to rules tab
      await page.getByRole('button', { name: /ルール編集/ }).click();
      await page.waitForTimeout(500);

      const notLearned = await page.locator('text=まだ学習されていません').isVisible().catch(() => false);
      if (notLearned) {
        test.skip();
        return;
      }

      // Save button should be disabled when no changes
      const saveButton = page.getByRole('button', { name: /保存/ });
      await expect(saveButton).toBeDisabled();
    });
  });
});
