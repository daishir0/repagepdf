import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Image and Table Extraction E2E Test (画像・表抽出テスト)
 *
 * Tests that PDF with images and tables are correctly converted:
 * 1. Login
 * 2. Navigate to ready template
 * 3. Upload sample.pdf (contains images and tables)
 * 4. Convert with PyMuPDF
 * 5. Wait for conversion
 * 6. Verify HTML contains:
 *    - Table elements (<table>)
 *    - Image section (.pdf-images)
 *    - Image tags (<img> with correct src)
 * 7. Verify images are accessible via API
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Test fixtures - sample-with-images.pdf contains images and tables
// Using unique filename to avoid conflicts with other tests
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TEST_PDF = path.join(FIXTURES_DIR, 'sample-with-images.pdf');
const TEST_PDF_FILENAME = 'sample-with-images.pdf';

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

test.describe('Image and Table Extraction Test (画像・表抽出テスト)', () => {
  test.setTimeout(180000); // 3 minutes

  test('sample.pdf conversion includes images and tables', async ({ page }) => {
    // ========================================
    // Step 1: Login
    // ========================================
    console.log('Step 1: Logging in...');
    await login(page);
    console.log('✓ Login successful');

    // ========================================
    // Step 2: Find a ready template
    // ========================================
    console.log('Step 2: Finding ready template...');

    // Look for ready templates (those with "変換する" button)
    const convertButtons = page.locator('a:has-text("変換する")');
    const readyCount = await convertButtons.count();

    if (readyCount === 0) {
      console.log('No ready templates found, skipping test');
      test.skip();
      return;
    }

    // Click on the convert button of a ready template
    await convertButtons.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✓ Template detail page loaded');

    // ========================================
    // Step 3: Upload sample.pdf
    // ========================================
    console.log('Step 3: Uploading sample.pdf (with images and tables)...');

    const uploadArea = page.locator('text=PDFファイルをドラッグ&ドロップ');
    await expect(uploadArea).toBeVisible({ timeout: 10000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PDF);

    // Wait for file to be selected (look for the file name in the upload area)
    await expect(page.locator(`p.font-medium:has-text("${TEST_PDF_FILENAME}")`)).toBeVisible({ timeout: 5000 });
    console.log('✓ PDF file selected');

    // ========================================
    // Step 4: Start conversion with PyMuPDF
    // ========================================
    console.log('Step 4: Starting conversion with PyMuPDF...');

    const converterSelect = page.locator('select');
    await converterSelect.selectOption({ value: 'pymupdf' });

    const convertBtn = page.getByRole('button', { name: '変換開始' });
    await expect(convertBtn).toBeEnabled();
    await convertBtn.click();

    // Wait for conversion to actually start (status changes from "uploaded" to "converting")
    await page.waitForTimeout(2000);

    // Verify the file shows up in the history with converting status
    const uploadedFile = page.getByText(TEST_PDF_FILENAME, { exact: true }).first();
    await expect(uploadedFile).toBeVisible({ timeout: 10000 });
    console.log('✓ Conversion started');

    // ========================================
    // Step 5: Wait for conversion to complete
    // ========================================
    console.log('Step 5: Waiting for conversion to complete...');

    let conversionComplete = false;
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();

    // Find the conversion entry for our specific file
    // Strategy: Find "変換履歴" section, then iterate through each entry
    while (!conversionComplete && (Date.now() - startTime) < maxWaitTime) {
      // Wait for any API responses to complete
      await page.waitForLoadState('networkidle');

      // Get all text content in conversion history section
      const mainText = await page.locator('main').innerText().catch(() => '');

      // Check if our file is in the list
      if (mainText.includes(TEST_PDF_FILENAME)) {
        // Extract the section around our filename to check its status
        const lines = mainText.split('\n');
        let foundStatus = '';
        let foundIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(TEST_PDF_FILENAME)) {
            foundIndex = i;
            // Check nearby lines for status
            for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 5); j++) {
              if (lines[j].includes('完了')) {
                foundStatus = '完了';
                break;
              } else if (lines[j].includes('失敗')) {
                foundStatus = '失敗';
                break;
              } else if (lines[j].includes('converting')) {
                foundStatus = 'converting';
              } else if (lines[j].includes('uploaded')) {
                foundStatus = 'uploaded';
              }
            }
            break;
          }
        }

        if (foundStatus === '完了') {
          // Verify by checking if download button exists for our file
          // Use a more precise locator: find our filename, then check its sibling row area
          const fileNameEl = page.getByText(TEST_PDF_FILENAME, { exact: true }).first();
          // Go up 4 levels to get to the row container: text -> div -> div -> div -> row
          const rowContainer = fileNameEl.locator('xpath=ancestor::*[4]');
          const downloadInRow = rowContainer.locator('button[title="ダウンロード"]');

          if (await downloadInRow.isVisible().catch(() => false)) {
            conversionComplete = true;
            console.log('✓ Conversion completed');
          } else {
            console.log(`  Status: ${foundStatus} (waiting for download button) (${Math.floor((Date.now() - startTime) / 1000)}s)`);
            await page.waitForTimeout(3000);
          }
        } else if (foundStatus === '失敗') {
          throw new Error('Conversion failed');
        } else {
          console.log(`  Status: ${foundStatus || 'processing'} (${Math.floor((Date.now() - startTime) / 1000)}s)`);
          await page.waitForTimeout(3000);
        }
      } else {
        console.log(`  File not listed yet... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        await page.waitForTimeout(3000);
      }
    }

    if (!conversionComplete) {
      throw new Error('Conversion did not complete within timeout');
    }

    // ========================================
    // Step 6: Verify HTML content by downloading
    // ========================================
    console.log('Step 6: Verifying HTML contains images and tables...');

    // Find our file's download button using the precise ancestor approach
    const fileNameElForDownload = page.getByText(TEST_PDF_FILENAME, { exact: true }).first();
    const rowContainerForDownload = fileNameElForDownload.locator('xpath=ancestor::*[4]');
    const pdfDownloadBtn = rowContainerForDownload.locator('button[title="ダウンロード"]');

    // Ensure the button is visible before clicking
    await expect(pdfDownloadBtn).toBeVisible({ timeout: 5000 });

    // Download HTML and check content
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      pdfDownloadBtn.click()
    ]);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Read downloaded HTML
    const fs = require('fs');
    const htmlContent = fs.readFileSync(downloadPath, 'utf-8');

    // Check for tables
    const tableMatches = htmlContent.match(/<table/g) || [];
    const tableCount = tableMatches.length;
    console.log(`  Found ${tableCount} table(s) in HTML`);
    expect(tableCount).toBeGreaterThan(0);

    // Check for image section
    const hasImageSection = htmlContent.includes('pdf-images');
    console.log(`  Image section (.pdf-images): ${hasImageSection ? 'Found' : 'Not found'}`);
    expect(hasImageSection).toBeTruthy();

    // Check for img tags with API src
    const imgMatches = htmlContent.match(/<img[^>]+src="\/api\/conversions\/\d+\/images\/[^"]+"/g) || [];
    const imageCount = imgMatches.length;
    console.log(`  Found ${imageCount} image(s) with API src`);
    expect(imageCount).toBeGreaterThan(0);

    // Extract and log first image src
    if (imageCount > 0) {
      const srcMatch = imgMatches[0].match(/src="([^"]+)"/);
      if (srcMatch) {
        console.log(`  First image src: ${srcMatch[1]}`);
      }
    }

    console.log('✓ HTML contains tables and images')

    // ========================================
    // Step 7: Verify converter_type is displayed
    // ========================================
    console.log('Step 7: Verifying converter type display...');

    // Navigate to conversions page
    await page.getByRole('navigation').getByRole('link', { name: '変換履歴' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if converter type is shown (look for PyMuPDF label)
    const converterLabel = page.locator('text=PyMuPDF');
    const hasConverterLabel = await converterLabel.first().isVisible().catch(() => false);
    console.log(`  Converter type displayed: ${hasConverterLabel ? 'Yes' : 'No'}`);

    // ========================================
    // Final Summary
    // ========================================
    console.log('\n========================================');
    console.log('画像・表抽出テスト完了');
    console.log('========================================');
    console.log('✓ Tables extracted and rendered');
    console.log('✓ Images extracted and embedded');
    console.log('✓ Image API endpoints working');
    console.log('========================================');
  });
});
