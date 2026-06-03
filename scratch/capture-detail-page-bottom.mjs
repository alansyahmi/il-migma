import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artifactsDir = 'C:\\Users\\titan\\.gemini\\antigravity-ide\\brain\\4d07eeee-9657-4f11-aaf2-97e6936899ca';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1200 }
  });
  const page = await context.newPage();

  console.log('Navigating to Home...');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  console.log('Searching for għammiel...');
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Fittex"]').first();
  await searchInput.fill('għammiel');
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);

  console.log('Clicking the entry link...');
  await page.locator('a:has-text("għammiel")').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Scrolling down to Usage Example...');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: join(artifactsDir, 'browser_detail_page_bottom.png') });
  console.log('Screenshot of detail page bottom taken.');

  await browser.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
