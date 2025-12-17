import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Covers: FR-001 (User Authentication), FR-002 (Session Management)
 * Test Cases: TC-001-01 ~ TC-001-06, TC-002-01 ~ TC-002-04
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'wrongpassword'
};

// Helper function to login
async function login(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill email using ID selector (Japanese)
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForLoadState('networkidle');
}

test.describe('FR-001: User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('TC-001-01: Login with valid credentials', async ({ page }) => {
    // Fill in login form
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(TEST_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USER.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Expect redirect to templates page (dashboard)
    await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });

    // Verify user is logged in (logout button has title="ログアウト")
    await expect(page.locator('button[title="ログアウト"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-001-02: Login with wrong password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('wrongpassword');

    await page.click('button[type="submit"]');

    // Wait a moment for potential navigation or error display
    await page.waitForTimeout(2000);

    // Should stay on login page (login should fail)
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-001-03: Login with unregistered email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(INVALID_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('anypassword');

    await page.click('button[type="submit"]');

    // Wait a moment for potential navigation or error display
    await page.waitForTimeout(2000);

    // Should stay on login page (login should fail)
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-001-04: Login with empty email', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USER.password);

    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-001-05: Login with empty password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_USER.email);

    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-001-06: Login with invalid email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_USER.password);

    await page.click('button[type="submit"]');

    // HTML5 email validation should prevent submission
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('FR-002: Session Management', () => {
  test('TC-002-01: Logout', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);

    // Wait for redirect to templates
    await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });

    // Click logout button (has title="ログアウト")
    const logoutBtn = page.locator('button[title="ログアウト"]');
    await logoutBtn.waitFor({ state: 'visible' });
    await logoutBtn.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Expect redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('TC-002-02: Session persistence after page reload', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);

    // Wait for redirect to templates
    await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on templates page (logged in)
    await expect(page).toHaveURL(/\/templates/);
    await expect(page.locator('button[title="ログアウト"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-002-03: Access templates without login', async ({ page }) => {
    // Try to access templates page directly without login
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('TC-002-04: Access settings without login', async ({ page }) => {
    // Try to access settings page directly without login
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
