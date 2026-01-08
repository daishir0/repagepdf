import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/templates/, { timeout: 15000 });
}

test('Debug conversions page', async ({ page }) => {
  await login(page);
  
  await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/conversions-debug.png', fullPage: true });
  
  // Log all buttons
  const allButtons = await page.locator('button').all();
  console.log('Total buttons found:', allButtons.length);
  
  for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
    const title = await allButtons[i].getAttribute('title').catch(() => null);
    const text = await allButtons[i].textContent().catch(() => '');
    console.log(`Button ${i}: title="${title}", text="${text?.trim()}"`);
  }
  
  // Check for edit buttons specifically
  const editButtons = page.locator('button[title="編集"]');
  const editCount = await editButtons.count();
  console.log('Edit buttons found:', editCount);
  
  // Check for completed status badges
  const completedBadges = page.locator('text=完了');
  const completedCount = await completedBadges.count();
  console.log('Completed badges found:', completedCount);
});
