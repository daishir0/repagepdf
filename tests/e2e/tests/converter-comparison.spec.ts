import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Converter Comparison Test (変換方式比較テスト)
 *
 * Tests all 4 PDF conversion methods using an existing ready template
 */

// Test data
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TEST_PDF = path.join(FIXTURES_DIR, 'sample-easy.pdf');
const OUTPUT_DIR = path.join(__dirname, '..', 'test-results', 'converter-comparison');

// Converter types
const CONVERTER_TYPES = [
  { value: 'pymupdf', label: 'PyMuPDF (高速)', timeout: 60000 },
  { value: 'pdfplumber', label: 'pdfplumber (表に強い)', timeout: 60000 },
  { value: 'openai', label: 'OpenAI Vision (高精度)', timeout: 180000 },
  { value: 'claude', label: 'Claude Vision (高精度)', timeout: 180000 }
];

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

// Helper to wait for conversion
async function waitForConversion(page: Page, maxWait: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const downloadBtn = page.locator('button[title="ダウンロード"]').first();
    const isComplete = await downloadBtn.isVisible().catch(() => false);

    if (isComplete) {
      return true;
    }

    const failedBadge = page.locator('text=失敗').first();
    const hasFailed = await failedBadge.isVisible().catch(() => false);

    if (hasFailed) {
      return false;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`  Waiting for conversion... (${elapsed}s)`);
    await page.waitForTimeout(3000);
  }

  return false;
}

// Helper to find ready template
async function findReadyTemplate(page: Page): Promise<number | null> {
  await page.goto('/templates');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Look for templates with "準備完了" status
  const templateCards = page.locator('[class*="template"]').or(page.locator('a[href*="/templates/"]'));
  const count = await templateCards.count();

  for (let i = 0; i < count; i++) {
    const card = templateCards.nth(i);
    const readyBadge = card.locator('text=準備完了');
    const isReady = await readyBadge.isVisible().catch(() => false);

    if (isReady) {
      // Get the template link
      const link = card.locator('a[href*="/templates/"]').first();
      const href = await link.getAttribute('href').catch(() => null);

      if (href) {
        const match = href.match(/\/templates\/(\d+)/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
  }

  // Try clicking on first template to check if it's ready
  const firstTemplate = page.locator('a[href*="/templates/"]').first();
  await firstTemplate.click();
  await page.waitForLoadState('networkidle');

  const url = page.url();
  const match = url.match(/\/templates\/(\d+)/);
  if (match) {
    // Check if template is ready
    const readyBadge = page.locator('text=準備完了');
    const isReady = await readyBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (isReady) {
      return parseInt(match[1]);
    }
  }

  return null;
}

test.describe.serial('Converter Comparison Test (変換方式比較テスト)', () => {
  test.setTimeout(600000); // 10 minutes total

  // Use existing ready template (from database check: ID 46 is ready)
  let templateId: number | null = 46;
  const results: Record<string, { time: number; size: number; html: string }> = {};

  // Create output directory
  test.beforeAll(async () => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  for (const converter of CONVERTER_TYPES) {
    test(`Convert PDF with ${converter.label}`, async ({ page }) => {
      console.log(`\n========================================`);
      console.log(`Testing: ${converter.label}`);
      console.log(`========================================`);

      await login(page);

      // Find or use a ready template
      if (!templateId) {
        templateId = await findReadyTemplate(page);
        if (!templateId) {
          throw new Error('No ready template found. Please create a template first.');
        }
        console.log(`Using template ID: ${templateId}`);
      }

      // Navigate to templates list first
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click on template name link to go to detail page
      const templateLink = page.locator(`a[href="/templates/${templateId}"]`).first();
      await templateLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify URL is correct
      await expect(page).toHaveURL(new RegExp(`/templates/${templateId}`));

      // Verify we're on template detail page (has file input)
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible({ timeout: 10000 });
      console.log('✓ Template detail page loaded');

      // Upload PDF
      await fileInput.setInputFiles(TEST_PDF);
      await expect(page.locator('text=sample-easy.pdf').first()).toBeVisible({ timeout: 5000 });
      console.log('✓ PDF file selected');

      // Select converter type
      const converterSelect = page.locator('select');
      await converterSelect.selectOption({ value: converter.value });
      console.log(`✓ Selected converter: ${converter.value}`);

      // Start conversion
      const convertBtn = page.getByRole('button', { name: '変換開始' });
      await expect(convertBtn).toBeEnabled();
      await convertBtn.click();
      console.log('✓ Conversion started');

      // Wait for conversion
      const startTime = Date.now();
      const success = await waitForConversion(page, converter.timeout);
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (!success) {
        console.log(`✗ Conversion failed or timed out for ${converter.label}`);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${converter.value}-error.png`),
          fullPage: true
        });
        throw new Error(`Conversion failed for ${converter.label}`);
      }

      console.log(`✓ Conversion completed in ${elapsed}s`);

      // Download HTML
      const downloadBtn = page.locator('button[title="ダウンロード"]').first();

      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;

      // Save HTML file
      const htmlPath = path.join(OUTPUT_DIR, `${converter.value}-output.html`);
      await download.saveAs(htmlPath);
      console.log(`✓ HTML saved: ${htmlPath}`);

      // Read HTML content for comparison
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const fileSize = fs.statSync(htmlPath).size;

      results[converter.value] = {
        time: elapsed,
        size: fileSize,
        html: htmlContent
      };

      // Save screenshot
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${converter.value}-preview.png`),
        fullPage: true
      });

      console.log(`\n${converter.label} completed: ${elapsed}s, ${fileSize} bytes`);
    });
  }

  test.afterAll(async () => {
    // Generate comparison report
    let report = `# Converter Comparison Report\n\n`;
    report += `## Summary\n\n`;
    report += `| Converter | Time (s) | HTML Size (bytes) |\n`;
    report += `|-----------|----------|------------------|\n`;

    for (const converter of CONVERTER_TYPES) {
      const result = results[converter.value];
      if (result) {
        report += `| ${converter.label} | ${result.time}s | ${result.size} |\n`;
      } else {
        report += `| ${converter.label} | - | - |\n`;
      }
    }

    report += `\n## Details\n\n`;
    for (const converter of CONVERTER_TYPES) {
      const result = results[converter.value];
      if (result) {
        report += `### ${converter.label}\n\n`;
        report += `- Conversion time: ${result.time} seconds\n`;
        report += `- Output size: ${result.size} bytes\n`;
        report += `- HTML preview (first 500 chars):\n\`\`\`html\n${result.html.substring(0, 500)}...\n\`\`\`\n\n`;
      }
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.md'), report);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(results, null, 2));

    console.log('\n========================================');
    console.log('Comparison Report Generated');
    console.log('========================================');
    console.log(report);
  });
});
