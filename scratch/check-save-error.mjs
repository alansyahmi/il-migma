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
    viewport: { width: 1280, height: 960 }
  });
  const page = await context.newPage();

  console.log('Navigating to Admin page...');
  await page.goto('http://localhost:5173/admin');
  await page.waitForLoadState('networkidle');

  console.log('Clicking "New Entry" button...');
  await page.click('button:has-text("New Entry"), button:has-text("Entrata Ġdida")');
  await page.waitForTimeout(1000);

  console.log('Filling headword...');
  await page.fill('input:below(label:has-text("Headword")), input:below(label:has-text("Mamma"))', 'għammiel');

  console.log('Selecting POS -> noun...');
  await page.selectOption('select:below(label:has-text("POS"))', 'noun');
  await page.waitForTimeout(500);

  console.log('Selecting Gender -> masculine...');
  await page.selectOption('select:below(label:has-text("Ġens"), label:has-text("Gender"))', 'masculine');
  await page.waitForTimeout(500);

  console.log('Filling feminine form...');
  await page.fill('input:below(label:has-text("Feminine Form"), label:has-text("Femminil"))', 'għammiela');

  console.log('Filling English definition...');
  await page.fill('input:below(label:has-text("Sense 1: English")), input:below(label:has-text("Sens 1: Ingliż"))', 'worker');

  console.log('Filling Maltese definition...');
  await page.fill('input:below(label:has-text("Maltese"), label:has-text("Malti"))', 'ħaddiem');

  console.log('Filling usage example (Maltese)...');
  await page.fill('input:below(label:has-text("Maltese sentence"), label:has-text("Malti sentence"))', 'Għammiel tajjeb f\'għalqa.');

  console.log('Filling usage example (English)...');
  await page.fill('input:below(label:has-text("English sentence"), label:has-text("Ingliż sentence"))', 'A good worker in a field.');

  // Click Save/Create button
  console.log('Clicking "Create Entry" button...');
  await page.click('button:has-text("Create Entry"), button:has-text("Oħloq Entrata")');
  await page.waitForTimeout(1500);

  // Scroll to the top of the modal to see validation errors
  console.log('Scrolling modal to the top...');
  await page.evaluate(() => {
    // Find the scrollable container inside the modal
    const scrollContainers = Array.from(document.querySelectorAll('*')).filter(
      el => {
        const style = window.getComputedStyle(el);
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.clientHeight < el.scrollHeight;
      }
    );
    for (const container of scrollContainers) {
      container.scrollTop = 0;
    }
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: join(artifactsDir, 'browser_save_error_top.png') });
  console.log('Screenshot of top of modal taken.');

  await browser.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
