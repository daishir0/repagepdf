import { test, expect } from '@playwright/test';

/**
 * Template E2E Tests
 * Covers: FR-003 (Template Creation), FR-005 (Template List), FR-006 (Template Delete)
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

test.describe('Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('FR-005: Template List', () => {
    test('TC-005-01: Display template list page', async ({ page }) => {
      // Already on templates page after login
      await expect(page).toHaveURL(/\/templates/);

      // Check page title
      await expect(page.locator('h1')).toContainText('テンプレート');

      // Check for create button
      await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
    });

    test('TC-005-02: Display empty state or template cards', async ({ page }) => {
      // Check for either empty state or template cards
      const emptyState = page.locator('text=テンプレートがありません');
      const templateLinks = page.locator('a[href^="/templates/"]').filter({ hasNotText: '変換' });

      // Wait a moment for content to load
      await page.waitForTimeout(1000);

      const isEmpty = await emptyState.isVisible().catch(() => false);
      const cardCount = await templateLinks.count();

      // Either empty state is visible OR templates exist
      expect(isEmpty || cardCount > 0).toBeTruthy();
    });

    test('TC-005-03: Navigate to template detail', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForTimeout(1000);

      // Check for template name links
      const templateNameLinks = page.locator('a[href^="/templates/"].text-lg');
      const count = await templateNameLinks.count();

      if (count > 0) {
        const href = await templateNameLinks.first().getAttribute('href');
        await templateNameLinks.first().click();
        await page.waitForLoadState('networkidle');

        if (href) {
          await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/')));
        } else {
          await expect(page).toHaveURL(/\/templates\/\d+/);
        }
      }
    });
  });

  test.describe('FR-003: Template Creation', () => {
    test('TC-003-01: Open create modal', async ({ page }) => {
      // Click create button
      await page.getByRole('button', { name: '新規作成' }).click();

      // Modal should appear with title (use heading role to be specific)
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      // Form inputs should be visible (find by placeholder)
      await expect(page.locator('input[placeholder*="〇〇市"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="example.com"]').first()).toBeVisible();
    });

    test('TC-003-02: Create template with valid data', async ({ page }) => {
      const uniqueName = `E2E Test ${Date.now()}`;

      // Click create button
      await page.getByRole('button', { name: '新規作成' }).click();

      // Wait for modal (use heading role to be specific)
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      // Fill form (use placeholders to identify inputs)
      const nameInput = page.locator('input[placeholder*="〇〇市"]');
      const urlInput = page.locator('input[placeholder*="example.com"]').first();

      await nameInput.fill(uniqueName);
      await urlInput.fill('https://example.com/');

      // Submit
      await page.getByRole('button', { name: '作成して学習開始' }).click();

      // Wait for modal to close and template to appear
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Template should appear in list
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 30000 });
    });

    test('TC-003-03: Cancel create modal', async ({ page }) => {
      // Click create button
      await page.getByRole('button', { name: '新規作成' }).click();

      // Wait for modal
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: 'キャンセル' }).click();

      // Modal should close
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).not.toBeVisible();
    });

    test('TC-003-04: Submit button disabled without name', async ({ page }) => {
      // Click create button
      await page.getByRole('button', { name: '新規作成' }).click();

      // Wait for modal
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      // Only fill URL
      const urlInput = page.locator('input[placeholder*="example.com"]').first();
      await urlInput.fill('https://example.com/');

      // Submit button should be disabled
      const submitBtn = page.getByRole('button', { name: '作成して学習開始' });
      await expect(submitBtn).toBeDisabled();
    });

    test('TC-003-05: Submit button disabled without URL', async ({ page }) => {
      // Click create button
      await page.getByRole('button', { name: '新規作成' }).click();

      // Wait for modal
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      // Only fill name
      const nameInput = page.locator('input[placeholder*="〇〇市"]');
      await nameInput.fill('Test Template');

      // Submit button should be disabled
      const submitBtn = page.getByRole('button', { name: '作成して学習開始' });
      await expect(submitBtn).toBeDisabled();
    });
  });

  test.describe('FR-006: Template Deletion', () => {
    test('TC-006-01: Delete template from list', async ({ page }) => {
      // First create a template to delete
      const uniqueName = `Delete Test ${Date.now()}`;

      await page.getByRole('button', { name: '新規作成' }).click();
      await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

      const nameInput = page.locator('input[placeholder*="〇〇市"]');
      const urlInput = page.locator('input[placeholder*="example.com"]').first();
      await nameInput.fill(uniqueName);
      await urlInput.fill('https://example.com/delete-test');

      await page.getByRole('button', { name: '作成して学習開始' }).click();

      // Wait for template to appear
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible({ timeout: 30000 });

      // The newly created template appears at the top of the list
      // Click the first delete button (which belongs to the newest template)
      const deleteBtn = page.locator('button[title="削除"]').first();
      await deleteBtn.click();

      // Confirm dialog should appear (use heading role)
      await expect(page.getByRole('heading', { name: 'テンプレートを削除' })).toBeVisible();

      // Click confirm
      await page.getByRole('button', { name: '削除する' }).click();

      // Wait for deletion
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Template should be gone
      await expect(page.locator(`text=${uniqueName}`)).not.toBeVisible();
    });

    test('TC-006-02: Cancel template deletion', async ({ page }) => {
      // Check if templates exist
      const deleteButtons = page.locator('button[title="削除"]');
      const count = await deleteButtons.count();

      if (count > 0) {
        // Click first delete button
        await deleteButtons.first().click();

        // Confirm dialog should appear
        await expect(page.getByRole('heading', { name: 'テンプレートを削除' })).toBeVisible();

        // Click cancel
        await page.getByRole('button', { name: 'キャンセル' }).click();

        // Dialog should close
        await expect(page.getByRole('heading', { name: 'テンプレートを削除' })).not.toBeVisible();

        // Should still be on templates page
        await expect(page).toHaveURL(/\/templates/);
      } else {
        test.skip();
      }
    });
  });
});
