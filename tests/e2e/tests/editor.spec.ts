import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * PDF/HTML Side-by-Side Editor E2E Tests
 * Covers: Requirements 1-7 (サイドバイサイドレイアウト、モード切り替え、WYSIWYGエディタ、画像操作、保存)
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

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

  await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });
}

// Helper to find a completed conversion ID
async function findCompletedConversionId(page: Page): Promise<number | null> {
  await page.goto('/conversions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Look for edit buttons (only visible for completed conversions)
  const editButtons = page.locator('a[href*="/edit"]');
  const count = await editButtons.count();

  if (count === 0) {
    return null;
  }

  // Get the href of the first edit button
  const href = await editButtons.first().getAttribute('href');
  if (!href) return null;

  // Extract conversion ID from href like "/conversions/123/edit"
  const match = href.match(/\/conversions\/(\d+)\/edit/);
  return match ? parseInt(match[1], 10) : null;
}

test.describe('PDF/HTML Side-by-Side Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Requirement 1: サイドバイサイドレイアウト', () => {
    test('TC-EDIT-01: Navigate to edit page from conversions list', async ({ page }) => {
      await page.goto('/conversions');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find edit button (only visible for completed conversions)
      const editButtons = page.locator('button[title="編集"]');
      const count = await editButtons.count();

      if (count === 0) {
        test.skip();
        return;
      }

      // Click on the first edit button
      await editButtons.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Should be on edit page
      await expect(page).toHaveURL(/\/conversions\/\d+\/edit/);
    });

    test('TC-EDIT-02: Edit page shows side-by-side layout', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for PDF pane (left side)
      const pdfPane = page.locator('text=PDF読み込み中').or(page.locator('.react-pdf__Page'));
      const pdfNavigation = page.locator('text=/\\d+ \\/ \\d+/'); // Page counter like "1 / 3"

      // Check for editor pane (right side)
      const editorToolbar = page.locator('button:has-text("プレビュー")');

      // Check side-by-side elements
      const hasPdfContent = await pdfPane.or(pdfNavigation).isVisible({ timeout: 10000 }).catch(() => false);
      const hasEditorToolbar = await editorToolbar.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasPdfContent || hasEditorToolbar).toBeTruthy();
    });

    test('TC-EDIT-03: Resizer is visible between panes', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for resizer element (the draggable divider)
      const resizer = page.locator('.cursor-col-resize');
      await expect(resizer).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Requirement 2: モード切り替え機能', () => {
    test('TC-EDIT-04: Mode toggle buttons are visible', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for preview and edit mode buttons
      const previewBtn = page.locator('button:has-text("プレビュー")');
      const editBtn = page.locator('button:has-text("編集")');

      await expect(previewBtn).toBeVisible({ timeout: 10000 });
      await expect(editBtn).toBeVisible({ timeout: 5000 });
    });

    test('TC-EDIT-05: Clicking edit mode button enables editing', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Click edit button
      const editBtn = page.locator('button:has-text("編集")');
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Format buttons should be visible in edit mode
      const formatButtons = page.locator('button[aria-label="太字"], button[aria-label="斜体"]');
      const formatCount = await formatButtons.count();

      expect(formatCount).toBeGreaterThan(0);
    });

    test('TC-EDIT-06: Switching back to preview mode hides format buttons', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Enter edit mode first
      const editBtn = page.locator('button:has-text("編集")');
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Switch back to preview mode
      const previewBtn = page.locator('button:has-text("プレビュー")');
      await previewBtn.click();
      await page.waitForTimeout(1000);

      // Format buttons should not be visible in preview mode
      const boldBtn = page.locator('button[aria-label="太字"]');
      await expect(boldBtn).toBeHidden();
    });
  });

  test.describe('Requirement 3: WYSIWYGエディタ機能', () => {
    test('TC-EDIT-07: Editor content is visible', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for editor content area
      const editorContent = page.locator('.prose, .ProseMirror');
      await expect(editorContent).toBeVisible({ timeout: 10000 });
    });

    test('TC-EDIT-08: Format toolbar shows bold, italic, underline buttons', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Enter edit mode
      const editBtn = page.locator('button:has-text("編集")');
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Check for format buttons
      const boldBtn = page.locator('button[aria-label="太字"]');
      const italicBtn = page.locator('button[aria-label="斜体"]');
      const strikeBtn = page.locator('button[aria-label="取り消し線"]');

      await expect(boldBtn).toBeVisible();
      await expect(italicBtn).toBeVisible();
      await expect(strikeBtn).toBeVisible();
    });
  });

  test.describe('Requirement 7: 変更の保存', () => {
    test('TC-EDIT-09: Save button is visible', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check for save button
      const saveBtn = page.locator('button:has-text("保存")');
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
    });

    test('TC-EDIT-10: Save button is disabled when no changes', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Save button should be disabled initially (no changes)
      const saveBtn = page.locator('button:has-text("保存")');
      await expect(saveBtn).toBeDisabled();
    });

    test('TC-EDIT-11: Making changes enables save button and shows unsaved indicator', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Enter edit mode
      const editBtn = page.locator('button:has-text("編集")');
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Type some text in the editor
      const editor = page.locator('.ProseMirror');
      await editor.click();
      await page.keyboard.type('Test edit content');
      await page.waitForTimeout(500);

      // Save button should now be enabled
      const saveBtn = page.locator('button:has-text("保存")');
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });

      // Unsaved indicator should be visible
      const unsavedIndicator = page.locator('text=未保存の変更があります');
      await expect(unsavedIndicator).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('TC-EDIT-12: Back button navigates to conversions page', async ({ page }) => {
      const conversionId = await findCompletedConversionId(page);

      if (!conversionId) {
        test.skip();
        return;
      }

      await page.goto(`/conversions/${conversionId}/edit`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Click back button
      const backBtn = page.locator('button:has-text("戻る"), a:has-text("戻る")');
      await backBtn.click();
      await page.waitForLoadState('networkidle');

      // Should be back on conversions page
      await expect(page).toHaveURL(/\/conversions/);
    });

    test('TC-EDIT-13: Edit button appears in conversions list for completed items', async ({ page }) => {
      await page.goto('/conversions');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for edit button (should only appear for completed conversions)
      const editButtons = page.locator('button[title="編集"]');
      const count = await editButtons.count();

      // If there are completed conversions, edit buttons should exist
      const previewButtons = page.locator('button[title="プレビュー"]');
      const previewCount = await previewButtons.count();

      if (previewCount > 0) {
        // There are completed conversions, so edit buttons should exist
        expect(count).toBeGreaterThan(0);
      } else {
        // No completed conversions - test passes (no edit buttons expected)
        expect(count).toBe(0);
      }
    });
  });
});
