import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Target artifacts directory to save screenshots
const artifactsDir = 'C:\\Users\\titan\\.gemini\\antigravity-ide\\brain\\4d07eeee-9657-4f11-aaf2-97e6936899ca';

async function cleanupDb() {
  console.log('Cleaning up database for a clean test run...');
  let client;
  try {
    const fs = await import('fs');
    const devVars = fs.readFileSync('.dev.vars', 'utf8');
    const env = {};
    devVars.split('\n').forEach(line => {
      const [key, ...vals] = line.split('=');
      if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
    });
    
    client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_AUTH_TOKEN });
    await client.execute({
      sql: 'DELETE FROM entries WHERE id = ?',
      args: ['adj-kbir-qa-test']
    });
    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.error('Error cleaning up DB:', err);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function run() {
  await cleanupDb();

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  // Capture page logs and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  page.on('response', async response => {
    if (response.url().includes('/api/admin/entries') && response.status() >= 400) {
      try {
        console.log(`API ERROR RESPONSE [${response.status()}]:`, await response.text());
      } catch (e) {
        console.log(`API ERROR RESPONSE [${response.status()}] (could not read text)`);
      }
    }
  });

  console.log('Navigating to Admin page...');
  await page.goto('http://localhost:5173/admin');
  await page.waitForLoadState('networkidle');

  // Click on "New Entry" button
  console.log('Clicking "New Entry" button...');
  await page.click('button:has-text("New Entry"), button:has-text("Entrata Ġdida")');
  await page.waitForTimeout(1000);

  // 1. Fill Entry ID
  console.log('Filling Entry ID...');
  const idInput = page.locator('input[placeholder*="v-fagħal"], input[placeholder*="e.g. v-fagħal"]');
  await idInput.fill('adj-kbir-qa-test');

  // 2. Fill Headword
  console.log('Filling Headword...');
  await page.locator('label:has-text("Headword") ~ input, label:has-text("Mamma") ~ input').fill('kbir-qa');

  // 3. Select POS
  console.log('Selecting POS -> adjective...');
  await page.locator('label:has-text("POS") ~ select').selectOption('adjective');
  await page.waitForTimeout(500);

  // 4. Fill Root Consonants
  console.log('Filling Root Consonants...');
  await page.locator('label:has-text("Root Consonants") ~ input, label:has-text("Għerq") ~ input, input[placeholder*="k-t-b"]').fill('k-b-r');

  // 5. Fill Stem
  console.log('Filling Stem...');
  await page.locator('label:has-text("Stem") ~ div input, label:has-text("Żokk") ~ div input, input[placeholder*="kanta"]').fill('kbir');

  // 6. Fill CV Pattern / Wiżen
  console.log('Filling CV Pattern...');
  await page.locator('label:has-text("CV Pattern / Wiżen") ~ div input, label:has-text("Mudell (Wiżen)") ~ div input, input[placeholder*="Fagħal or CCvC"]').fill('CCVC');

  // 7. Add Tags
  console.log('Adding Tags...');
  const tagsInput = page.locator('input[placeholder*="Add tag..."], input[placeholder*="Żid tikketta..."]');
  await tagsInput.fill('core');
  await tagsInput.press('Enter');
  await page.waitForTimeout(100);
  await tagsInput.fill('test');
  await tagsInput.press('Enter');
  await page.waitForTimeout(100);

  // 8. Add Phonetics Variant
  console.log('Adding Phonetics Variant...');
  await page.click('button:has-text("Add Variant"), button:has-text("Żid Varjant")');
  await page.waitForTimeout(500);
  await page.locator('div:has(> label:has-text("Spelling")), div:has(> label:has-text("Kitba"))').locator('input').fill('kbir');
  await page.locator('div:has(> label:has-text("IPA"))').locator('input').fill('/kbiːr/');

  // 9. Select Gender -> masculine
  console.log('Selecting Gender -> masculine...');
  await page.locator('label:has-text("Gender") ~ select, label:has-text("Ġens") ~ select').selectOption('masculine');
  await page.waitForTimeout(500);

  // Toggle "Has Inflection" just to make sure it's checked
  console.log('Checking "Has Inflection" checkbox...');
  const inflectCheckbox = page.locator('label:has-text("Has Inflection") input, label:has-text("Għandu Inflessjoni") input');
  if (!(await inflectCheckbox.isChecked())) {
    await inflectCheckbox.check();
  }
  await page.waitForTimeout(200);

  // 11. Enter Feminine Form & Fem. Pattern
  console.log('Filling Feminine Form and Fem. Pattern...');
  await page.locator('label:has-text("Feminine Form") ~ input, label:has-text("Femminil") ~ input').fill('kbira-qa');
  
  const femPatternInput = page.locator('div:has(> label:has-text("Feminine Pattern")), div:has(> label:has-text("Mudell Fem."))').locator('input');
  await femPatternInput.fill('CCiCa');
  await femPatternInput.press('Enter');

  // 12. Plural Forms (Plural Form 1 and Plural Pattern 1)
  console.log('Filling Plural Form 1...');
  await page.locator('label:has-text("Plural Form 1") ~ input, label:has-text("Forma tal-Plural 1") ~ input').fill('kbar-qa');
  await page.locator('label:has-text("Plural Pattern 1") ~ input, label:has-text("Mudell tal-Plural 1") ~ input').fill('CCaC');

  // 13. Fill Dual Form & Dual Suffix
  console.log('Filling Dual Form and Dual Suffix...');
  await page.locator('label:has-text("Dual"):not(:has-text("Vowel")) ~ input, label:has-text("Imtenni") ~ input').fill('kbirotejn');
  await page.waitForTimeout(200);
  const dualPatternInput = page.locator('div:has(> label:has-text("Dual Suffix")), div:has(> label:has-text("Suffiss Doppju"))').locator('input');
  await dualPatternInput.fill('CCiCVtejn');
  await dualPatternInput.press('Enter');

  // 14. Diminutive & Pattern
  console.log('Filling Diminutive and Pattern...');
  await page.locator('label:has-text("Diminutive") ~ input, label:has-text("Diminuttiv") ~ input').fill('kbejjer-qa');
  await page.waitForTimeout(200);
  const dimPatternInput = page.locator('div:has(> label:has-text("Diminutive Pattern")), div:has(> label:has-text("Mudell Diminuttiv"))').locator('input');
  await dimPatternInput.fill('CCejCeC');
  await dimPatternInput.press('Enter');

  // 15. Fill Vowel Sets
  console.log('Filling Vowel Sets...');
  await page.locator('label:has-text("Vowel Set (Singular)") ~ div input, label:has-text("Vowel Set (Singular)") ~ input').fill('i');
  await page.locator('label:has-text("Vowel Set (Opp. Gender)") ~ div input, label:has-text("Vowel Set (Opp. Gender)") ~ input').fill('o');
  await page.locator('label:has-text("Vowel Set (Dual)") ~ div input, label:has-text("Vowel Set (Dual)") ~ input').fill('i-o');
  await page.locator('label:has-text("Vowel Set (Plural)") ~ div input, label:has-text("Vowel Set (Plural)") ~ input').fill('a');

  // 16. Elative (Comparative) Form & Pattern
  console.log('Filling Elative Form and Pattern...');
  await page.locator('label:has-text("Elative (Comparative)") ~ input, label:has-text("Elattiv (Komparattiv)") ~ input').fill('ikbar-qa');
  await page.waitForTimeout(200);
  const elativePatternInput = page.locator('div:has(> label:has-text("Elative Pattern")), div:has(> label:has-text("Mudell Elattiv"))').locator('input');
  await elativePatternInput.fill('iCCaC');
  await elativePatternInput.press('Enter');

  // 17. Definitions
  console.log('Filling Definition 1...');
  const definitionsFieldset = page.locator('fieldset:has-text("Definitions"), fieldset:has-text("Definizzjonijiet")');
  await page.locator('label:has-text("Sense 1: English") ~ input, label:has-text("Sens 1: Ingliż") ~ input').fill('extremely big');
  await definitionsFieldset.locator('label:has-text("Maltese") ~ input, label:has-text("Malti") ~ input').first().fill('kbir ħafna');
  await definitionsFieldset.locator('label:has-text("Register") ~ select, label:has-text("Reġistru") ~ select').first().selectOption('formal');

  // 18. Usage Example
  console.log('Filling Usage Examples...');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("Maltese sentence") ~ input, label:has-text("Malti sentence") ~ input')
    .fill('Huwa kbir.');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("English sentence") ~ input, label:has-text("Ingliż sentence") ~ input')
    .fill('He is big.');

  // 19. Relationships
  console.log('Adding Alternative Form Relationship...');
  const altFormEditor = page.locator('div.space-y-3:has(span:has-text("Alternative Forms")), div.space-y-3:has(span:has-text("Forom Alternattivi"))').first();
  await altFormEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await altFormEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-kittieb');
  await altFormEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Derived Term Relationship...');
  const derivedEditor = page.locator('div.space-y-3:has(span:has-text("Derived Terms")), div.space-y-3:has(span:has-text("Termini Derivati"))').first();
  await derivedEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await derivedEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-ktieb');
  await derivedEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Synonym Relationship...');
  const synonymEditor = page.locator('div.space-y-3:has(span:has-text("Synonyms")), div.space-y-3:has(span:has-text("Sinonimi"))').first();
  await synonymEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await synonymEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-ħarrief');
  await synonymEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Antonym Relationship...');
  const antonymEditor = page.locator('div.space-y-3:has(span:has-text("Antonyms")), div.space-y-3:has(span:has-text("Antonimi"))').first();
  await antonymEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await antonymEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-baħħar');
  await antonymEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  // 20. Etymology Builder
  console.log('Adding Etymology Chain Step...');
  await page.click('button:has-text("Add Step"), button:has-text("Żid Pass")');
  await page.waitForTimeout(500);
  const etymologyFieldset = page.locator('fieldset:has(legend:has-text("Etymology Builder")), fieldset:has(legend:has-text("Oriġini tal-Kelma"))');
  const etymologyStep = etymologyFieldset.locator('div.relative').last();
  await etymologyStep.locator('select').selectOption('From');
  await etymologyStep.locator('input[placeholder*="Arabic"]').fill('Arabic');
  await etymologyStep.locator('input[placeholder*="cantare"]').fill('k-b-r');
  await etymologyStep.locator('input[placeholder*="kan-ta-re"]').fill('k-b-r');
  await etymologyStep.locator('input[placeholder*="to sing"]').fill('to be big');

  // 21. Source Citation
  console.log('Filling Source Citation...');
  await page.locator('label:has-text("Source Citation") ~ input, label:has-text("Sors / Referenza") ~ input').fill('Aquilina1987');

  // Scroll modal/containers to top to view validation errors
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight) el.scrollTop = 0;
    });
  });

  // Take screenshot before save
  await page.screenshot({ path: join(artifactsDir, 'browser_adj_filled_full.png') });
  console.log('Form fully filled, screenshot taken.');

  // Click Save/Create button
  console.log('Clicking "Create Entry" button...');
  await page.click('button:has-text("Create Entry"), button:has-text("Oħloq Entrata")');
  await page.waitForTimeout(4000);

  // Scroll to top again to see validation errors
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight) el.scrollTop = 0;
    });
  });

  // Take screenshot after save
  await page.screenshot({ path: join(artifactsDir, 'browser_adj_after_creation.png') });
  console.log('Clicked create entry, screenshot taken.');

  // Verify the entry was added by checking if it exists in the list or searching
  console.log('Searching for kbir-qa in admin entries list...');
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Fittex"]').first();
  await searchInput.fill('kbir-qa');
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(artifactsDir, 'browser_adj_search_result.png') });

  // Navigate to entry details page to verify rendering
  console.log('Navigating to details page...');
  const entryLink = page.locator('a:has-text("kbir-qa")');
  if (await entryLink.count() > 0) {
    await entryLink.first().click();
    console.log('Waiting 5 seconds for page load...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(artifactsDir, 'browser_adj_detail_page.png'), fullPage: true });
    console.log('Detail page screenshot taken.');
  } else {
    console.error('Could not find kbir-qa entry link in search results.');
  }

  await browser.close();
  console.log('Browser closed. Test run complete!');
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});
