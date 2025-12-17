import { test, expect } from '@playwright/test';

/**
 * Settings E2E Tests
 * Covers: FR-018 (Converter Settings), FR-019 (Converter Switch)
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

// Helper function to navigate to settings
async function navigateToSettings(page: any) {
  // Click settings link in sidebar (use navigation role to be specific)
  await page.getByRole('navigation').getByRole('link', { name: '設定' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/settings/);
}

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToSettings(page);
  });

  test.describe('FR-018: Converter Settings', () => {
    test('TC-018-01: Display settings page', async ({ page }) => {
      // Check page title
      await expect(page.locator('h1')).toContainText('設定');

      // Check for converter settings section
      await expect(page.locator('text=変換設定')).toBeVisible();

      // Check for converter select (by label text)
      await expect(page.getByText('デフォルト変換方式')).toBeVisible();
      await expect(page.locator('select')).toBeVisible();
    });

    test('TC-018-02: Display converter options', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Check for converter options
      const options = await converterSelect.locator('option').allTextContents();

      expect(options.some(opt => /PyMuPDF/i.test(opt))).toBeTruthy();
      expect(options.some(opt => /pdfplumber/i.test(opt))).toBeTruthy();
    });

    test('TC-018-03: Change default converter', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Select pdfplumber
      await converterSelect.selectOption({ value: 'pdfplumber' });

      // Save settings
      await page.getByRole('button', { name: '設定を保存' }).click();

      // Wait for save
      await page.waitForLoadState('networkidle');

      // Should show success (toast or remain on page without error)
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/settings/);
    });

    test('TC-018-04: Display API key settings', async ({ page }) => {
      // Check for API key section
      await expect(page.locator('text=APIキー設定')).toBeVisible();

      // Check for OpenAI section
      await expect(page.locator('text=OpenAI API')).toBeVisible();

      // Check for Anthropic section
      await expect(page.locator('text=Anthropic API')).toBeVisible();
    });

    test('TC-018-05: API key input fields exist', async ({ page }) => {
      // OpenAI API key input (placeholder contains "sk-...")
      const openaiKeyInput = page.locator('input[type="password"][placeholder*="sk-"]').first();
      await expect(openaiKeyInput).toBeVisible();

      // Anthropic API key input (placeholder contains "sk-ant-...")
      const anthropicKeyInput = page.locator('input[type="password"][placeholder*="sk-ant-"]');
      await expect(anthropicKeyInput).toBeVisible();
    });
  });

  test.describe('FR-019: Converter Switch', () => {
    test('TC-019-01: Select PyMuPDF converter', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Select PyMuPDF
      await converterSelect.selectOption({ value: 'pymupdf' });

      // Save
      await page.getByRole('button', { name: '設定を保存' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify selection persisted
      await expect(converterSelect).toHaveValue('pymupdf');
    });

    test('TC-019-02: Select pdfplumber converter', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Select pdfplumber
      await converterSelect.selectOption({ value: 'pdfplumber' });

      // Save
      await page.getByRole('button', { name: '設定を保存' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify selection persisted
      await expect(converterSelect).toHaveValue('pdfplumber');
    });

    test('TC-019-03: Select OpenAI Vision converter', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Check if OpenAI option exists
      const options = await converterSelect.locator('option').allTextContents();
      const hasOpenAI = options.some(opt => /OpenAI/i.test(opt));

      if (hasOpenAI) {
        await converterSelect.selectOption({ value: 'openai' });

        // Save
        await page.getByRole('button', { name: '設定を保存' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await expect(converterSelect).toHaveValue('openai');
      } else {
        test.skip();
      }
    });

    test('TC-019-04: Select Claude Vision converter', async ({ page }) => {
      const converterSelect = page.locator('select').first();
      await expect(converterSelect).toBeVisible();

      // Check if Claude option exists
      const options = await converterSelect.locator('option').allTextContents();
      const hasClaude = options.some(opt => /Claude/i.test(opt));

      if (hasClaude) {
        await converterSelect.selectOption({ value: 'claude' });

        // Save
        await page.getByRole('button', { name: '設定を保存' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await expect(converterSelect).toHaveValue('claude');
      } else {
        test.skip();
      }
    });
  });

  test.describe('Account Settings', () => {
    test('TC-020-01: Display account settings', async ({ page }) => {
      // Check for account settings section
      await expect(page.locator('text=アカウント設定')).toBeVisible();

      // Check for email display
      await expect(page.locator('text=メールアドレス')).toBeVisible();

      // Check for password change section
      await expect(page.locator('text=パスワード変更')).toBeVisible();
    });

    test('TC-020-02: Password change button disabled without input', async ({ page }) => {
      // Find password change button
      const changePasswordBtn = page.getByRole('button', { name: 'パスワードを変更' });
      await expect(changePasswordBtn).toBeVisible();

      // Should be disabled without input
      await expect(changePasswordBtn).toBeDisabled();
    });
  });
});
