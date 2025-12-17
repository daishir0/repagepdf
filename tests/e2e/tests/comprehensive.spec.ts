import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Comprehensive E2E Scenario Test (総合テスト)
 *
 * Tests the complete workflow from template creation to HTML generation:
 * 1. Login
 * 2. Create template with 3 URLs from jsrpd.jp
 * 3. Navigate to template detail page
 * 4. Wait for learning to complete
 * 5. Upload sample PDF
 * 6. Start conversion
 * 7. Wait for conversion to complete
 * 8. Verify HTML generation
 * 9. Download HTML
 *
 * Covers: FR-003, FR-004, FR-007, FR-012, FR-016
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Reference URLs from jsrpd.jp
const REFERENCE_URLS = {
  url1: 'https://www.jsrpd.jp/rehabilitation/purpose/',
  url2: 'https://www.jsrpd.jp/rehabilitation/data/',
  url3: 'https://www.jsrpd.jp/rehabilitation/ideal/'
};

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TEST_PDF = path.join(FIXTURES_DIR, 'sample-easy.pdf');

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

test.describe('Comprehensive E2E Scenario Test (総合テスト)', () => {
  // Use longer timeout for this comprehensive test
  test.setTimeout(300000); // 5 minutes

  test('Complete workflow: Template creation → Learning → PDF upload → Conversion → HTML download', async ({ page }) => {
    // ========================================
    // Step 1: Login
    // ========================================
    console.log('Step 1: Logging in...');
    await login(page);
    await expect(page).toHaveURL(/\/templates/);
    console.log('✓ Login successful');

    // ========================================
    // Step 2: Create template with 3 URLs
    // ========================================
    console.log('Step 2: Creating template with 3 URLs...');
    const templateName = `総合テスト ${Date.now()}`;

    // Click create button
    await page.getByRole('button', { name: '新規作成' }).click();
    await expect(page.getByRole('heading', { name: 'テンプレートを作成' })).toBeVisible();

    // Fill template name
    const nameInput = page.locator('input[placeholder*="〇〇市"]');
    await nameInput.fill(templateName);

    // Fill URL 1 (required)
    const url1Input = page.locator('input[placeholder*="page1"]');
    await url1Input.fill(REFERENCE_URLS.url1);

    // Fill URL 2 (optional)
    const url2Input = page.locator('input[placeholder*="page2"]');
    await url2Input.fill(REFERENCE_URLS.url2);

    // Fill URL 3 (optional)
    const url3Input = page.locator('input[placeholder*="page3"]');
    await url3Input.fill(REFERENCE_URLS.url3);

    // Submit
    await page.getByRole('button', { name: '作成して学習開始' }).click();
    await page.waitForLoadState('networkidle');

    // Verify template appears in list
    await expect(page.locator(`text=${templateName}`)).toBeVisible({ timeout: 30000 });
    console.log('✓ Template created with 3 URLs');

    // ========================================
    // Step 3: Navigate to template detail page
    // ========================================
    console.log('Step 3: Navigating to template detail page...');

    // Click on template name to go to detail page
    const templateLink = page.locator(`a:has-text("${templateName}")`).first();
    await templateLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/templates\/\d+/);
    console.log('✓ Navigated to template detail page');

    // ========================================
    // Step 4: Wait for learning to complete on detail page
    // ========================================
    console.log('Step 4: Waiting for learning to complete...');

    // Wait for status to become "ready" (準備完了) on the detail page
    // The detail page auto-polls every 5 seconds, so we just wait for the upload area
    // Poll every 3 seconds for up to 2 minutes (the page auto-refreshes the template status)
    let learningComplete = false;
    const maxWaitTime = 120000; // 2 minutes
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (!learningComplete && (Date.now() - startTime) < maxWaitTime) {
      // Check if upload dropzone is visible (only shows when template is ready)
      const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
      const isUploadVisible = await uploadArea.isVisible().catch(() => false);

      if (isUploadVisible) {
        learningComplete = true;
        console.log('✓ Learning completed - upload area visible');
      } else {
        // Check for failed status badge
        const failedBadge = page.locator('text=失敗');
        const hasFailed = await failedBadge.isVisible().catch(() => false);

        if (hasFailed) {
          const errorMessage = await page.locator('.text-danger-500').textContent().catch(() => 'Unknown error');
          throw new Error(`Template learning failed: ${errorMessage}`);
        }

        // Check if still learning
        const learningText = page.locator('text=テンプレートを学習中です');
        const isLearning = await learningText.isVisible().catch(() => false);

        if (isLearning) {
          console.log(`  Waiting for learning... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        } else {
          console.log(`  Template not ready, waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        }

        // Wait for the page's auto-refresh to update (page polls every 5 seconds)
        await page.waitForTimeout(pollInterval);
      }
    }

    if (!learningComplete) {
      throw new Error('Template learning did not complete within timeout');
    }

    // ========================================
    // Step 5: Upload PDF
    // ========================================
    console.log('Step 5: Uploading PDF...');

    // Verify upload area is visible (confirmed in step 4)
    const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
    await expect(uploadArea).toBeVisible({ timeout: 10000 });

    // Upload PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PDF);

    // Verify file is selected
    await expect(page.locator('text=sample-easy.pdf')).toBeVisible({ timeout: 5000 });
    console.log('✓ PDF file selected');

    // ========================================
    // Step 6: Start conversion
    // ========================================
    console.log('Step 6: Starting conversion...');

    // Select PyMuPDF converter (fast, no API key needed)
    const converterSelect = page.locator('select');
    await converterSelect.selectOption({ value: 'pymupdf' });

    // Click convert button
    const convertBtn = page.getByRole('button', { name: '変換開始' });
    await expect(convertBtn).toBeEnabled();
    await convertBtn.click();

    console.log('✓ Conversion started');

    // ========================================
    // Step 7: Wait for conversion to complete
    // ========================================
    console.log('Step 7: Waiting for conversion to complete...');

    // Wait for conversion to appear in history and complete
    // Poll every 3 seconds for up to 2 minutes
    let conversionComplete = false;
    const conversionMaxWait = 120000;
    const conversionStartTime = Date.now();

    while (!conversionComplete && (Date.now() - conversionStartTime) < conversionMaxWait) {
      // Look for completed status (download button) or error status (失敗 badge)
      const downloadBtn = page.locator('button[title="ダウンロード"]').first();
      const isComplete = await downloadBtn.isVisible().catch(() => false);

      if (isComplete) {
        conversionComplete = true;
        console.log('✓ Conversion completed');
      } else {
        // Check for specific conversion failure status badge
        const failedBadge = page.locator('text=失敗').first();
        const hasFailed = await failedBadge.isVisible().catch(() => false);

        if (hasFailed) {
          // Get the error message from conversion history
          const errorInHistory = page.locator('.text-danger-500').first();
          const errorText = await errorInHistory.textContent().catch(() => 'Unknown error');
          throw new Error(`Conversion failed: ${errorText}`);
        }

        // Check for processing status
        const processingStatus = page.locator('text=処理中').first();
        const isProcessing = await processingStatus.isVisible().catch(() => false);

        if (isProcessing) {
          console.log(`  Processing conversion... (${Math.floor((Date.now() - conversionStartTime) / 1000)}s)`);
        } else {
          console.log(`  Waiting for conversion... (${Math.floor((Date.now() - conversionStartTime) / 1000)}s)`);
        }

        await page.waitForTimeout(3000);
      }
    }

    if (!conversionComplete) {
      throw new Error('Conversion did not complete within timeout');
    }

    // ========================================
    // Step 8: Verify HTML generation
    // ========================================
    console.log('Step 8: Verifying HTML generation...');

    // Click preview button to verify HTML was generated
    const previewBtn = page.locator('button[title="プレビュー"]').first();
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify preview modal appears with content
    const previewModal = page.locator('text=HTMLプレビュー');
    await expect(previewModal).toBeVisible({ timeout: 5000 });

    // Verify there's actual content in the preview
    const previewContent = page.locator('.prose');
    await expect(previewContent).toBeVisible();

    // Close preview
    await page.getByRole('button', { name: '閉じる' }).click();
    console.log('✓ HTML generated and previewed');

    // ========================================
    // Step 9: Download HTML
    // ========================================
    console.log('Step 9: Downloading HTML...');

    // Setup download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button[title="ダウンロード"]').first().click()
    ]);

    // Verify download
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toContain('.html');

    console.log(`✓ HTML downloaded: ${suggestedFilename}`);

    // ========================================
    // Final Summary
    // ========================================
    console.log('\n========================================');
    console.log('総合テスト完了 (Comprehensive Test Complete)');
    console.log('========================================');
    console.log(`Template: ${templateName}`);
    console.log(`URLs: ${REFERENCE_URLS.url1}`);
    console.log(`       ${REFERENCE_URLS.url2}`);
    console.log(`       ${REFERENCE_URLS.url3}`);
    console.log(`PDF: sample-easy.pdf`);
    console.log(`Output: ${suggestedFilename}`);
    console.log('========================================');
  });
});
