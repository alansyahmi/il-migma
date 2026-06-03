import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Target artifacts directory to save screenshots
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
  await page.screenshot({ path: join(artifactsDir, 'browser_admin_page.png') });
  console.log('Admin page loaded, screenshot taken.');

  // Click on "New Entry" button
  console.log('Clicking "New Entry" button...');
  await page.click('button:has-text("New Entry"), button:has-text("Entrata Ġdida")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(artifactsDir, 'browser_new_entry_modal.png') });
  console.log('Modal opened, screenshot taken.');

  // Fill Headword
  console.log('Filling headword...');
  await page.locator('label:has-text("Headword") ~ input, label:has-text("Mamma") ~ input').fill('għammiel');

  // Select POS
  console.log('Selecting POS -> noun...');
  await page.locator('label:has-text("POS") ~ select').selectOption('noun');
  await page.waitForTimeout(500);

  // Select Gender -> masculine
  console.log('Selecting Gender -> masculine...');
  await page.locator('label:has-text("Gender") ~ select, label:has-text("Ġens") ~ select').selectOption('masculine');
  await page.waitForTimeout(500);

  // Enter Feminine Form
  console.log('Filling feminine form...');
  await page.locator('label:has-text("Feminine Form") ~ input, label:has-text("Femminil") ~ input').fill('għammiela');

  // Fill English Definition
  console.log('Filling English definition...');
  await page.locator('label:has-text("Sense 1: English") ~ input, label:has-text("Sens 1: Ingliż") ~ input').fill('worker');

  // Fill Maltese Definition
  console.log('Filling Maltese definition...');
  await page.locator('fieldset:has-text("Definitions"), fieldset:has-text("Definizzjonijiet")')
    .locator('label:has-text("Maltese") ~ input, label:has-text("Malti") ~ input')
    .fill('ħaddiem');

  // Fill Usage Example (Maltese)
  console.log('Filling usage example (Maltese)...');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("Maltese sentence") ~ input, label:has-text("Malti sentence") ~ input')
    .fill('Għammiel tajjeb f\'għalqa.');

  // Fill Usage Example (English)
  console.log('Filling usage example (English)...');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("English sentence") ~ input, label:has-text("Ingliż sentence") ~ input')
    .fill('A good worker in a field.');

  await page.screenshot({ path: join(artifactsDir, 'browser_new_entry_filled.png') });
  console.log('Form filled, screenshot taken.');

  // Click Save/Create button
  console.log('Clicking "Create Entry" button...');
  await page.click('button:has-text("Create Entry"), button:has-text("Oħloq Entrata")');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: join(artifactsDir, 'browser_after_creation.png') });
  console.log('Clicked create entry, screenshot taken.');

  // Verify the entry was added by checking if it exists in the list or searching
  console.log('Searching for għammiel in admin entries list...');
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Fittex"]').first();
  await searchInput.fill('għammiel');
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(artifactsDir, 'browser_search_result.png') });

  // Navigate to entry details page to verify rendering
  console.log('Navigating to details page...');
  const entryLink = page.locator('a:has-text("għammiel")');
  if (await entryLink.count() > 0) {
    await entryLink.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(artifactsDir, 'browser_entry_detail_page.png') });
    console.log('Detail page screenshot taken.');
  } else {
    console.error('Could not find għammiel entry link in search results.');
  }

  await browser.close();
  console.log('Browser closed. Test run complete!');
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});
