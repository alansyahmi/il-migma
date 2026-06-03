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
      args: ['n-ghammiel-qa-test']
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
  await idInput.fill('n-ghammiel-qa-test');

  // 2. Fill Headword
  console.log('Filling Headword...');
  await page.locator('label:has-text("Headword") ~ input, label:has-text("Mamma") ~ input').fill('għammiel-qa');

  // 3. Select POS
  console.log('Selecting POS -> noun...');
  await page.locator('label:has-text("POS") ~ select').selectOption('noun');
  await page.waitForTimeout(500);

  // 4. Fill Root Consonants
  console.log('Filling Root Consonants...');
  await page.locator('label:has-text("Root Consonants") ~ input, label:has-text("Għerq") ~ input, input[placeholder*="k-t-b"]').fill('għ-m-l');

  // 5. Fill Stem
  console.log('Filling Stem...');
  await page.locator('label:has-text("Stem") ~ div input, label:has-text("Żokk") ~ div input, input[placeholder*="kanta"]').fill('għammiel');

  // 6. Fill CV Pattern / Wiżen
  console.log('Filling CV Pattern...');
  await page.locator('label:has-text("CV Pattern / Wiżen") ~ div input, label:has-text("Mudell (Wiżen)") ~ div input, input[placeholder*="Fagħal or CCvC"]').fill('CaCCieC');

  // 7. Add Tags
  console.log('Adding Tags...');
  const tagsInput = page.locator('input[placeholder*="Add tag..."], input[placeholder*="Żid tikketta..."]');
  await tagsInput.fill('archaic');
  await tagsInput.press('Enter');
  await page.waitForTimeout(100);
  await tagsInput.fill('rare');
  await tagsInput.press('Enter');
  await page.waitForTimeout(100);

  // 8. Add Phonetics Variant
  console.log('Adding Phonetics Variant...');
  await page.click('button:has-text("Add Variant"), button:has-text("Żid Varjant")');
  await page.waitForTimeout(500);
  await page.locator('div:has(> label:has-text("Spelling")), div:has(> label:has-text("Kitba"))').locator('input').fill('għammiel');
  await page.locator('div:has(> label:has-text("IPA"))').locator('input').fill('/aːmˈmɪːl/');

  // Exercise Collective/Singulative reactivity
  console.log('Exercising Collective/Singulative reactivity...');
  const collCheckbox = page.locator('label:has-text("Collective") input, label:has-text("Kollettiv") input');
  await collCheckbox.check();
  console.log('Collective checked.');
  await page.waitForTimeout(200);
  await collCheckbox.uncheck();
  console.log('Collective unchecked.');
  await page.waitForTimeout(200);

  // 9. Select Gender -> masculine
  console.log('Selecting Gender -> masculine...');
  await page.locator('label:has-text("Gender") ~ select, label:has-text("Ġens") ~ select').selectOption('masculine');
  await page.waitForTimeout(500);

  // 10. Enter Feminine Form & Fem. Pattern
  console.log('Filling Feminine Form and Fem. Pattern...');
  await page.locator('label:has-text("Feminine Form") ~ input, label:has-text("Singulative Form") ~ input, label:has-text("Femminil") ~ input').fill('għammiela');
  
  const femPatternInput = page.locator('div:has(> label:has-text("Fem. Pattern")), div:has(> label:has-text("Mudell Fem."))').locator('input');
  await femPatternInput.fill('CaCCieCa');
  await femPatternInput.press('Enter');

  // 11. Fill Vowel Sets
  console.log('Filling Vowel Sets...');
  await page.locator('label:has-text("Vowel Set (Singular)") ~ div input, label:has-text("Vowel Set (Singular)") ~ input').fill('a-ie');
  await page.locator('label:has-text("Vowel Set (Opp. Gender)") ~ div input, label:has-text("Vowel Set (Opp. Gender)") ~ input').fill('a-ie-a');
  await page.locator('label:has-text("Vowel Set (Dual)") ~ div input, label:has-text("Vowel Set (Dual)") ~ input').fill('a-ie');
  await page.locator('label:has-text("Vowel Set (Plural)") ~ div input, label:has-text("Vowel Set (Plural)") ~ input').fill('a-ie');

  // 12. Fill Dual Form & Dual Suffix
  console.log('Filling Dual Form and Dual Suffix...');
  await page.locator('input[placeholder*="xahrejn"]').fill('għammielejn');
  await page.waitForTimeout(200);
  const dualPatternInput = page.locator('div:has(> label:has-text("Dual Suffix")), div:has(> label:has-text("Suffiss Doppju"))').locator('input');
  await dualPatternInput.fill('CvCCejn');
  await dualPatternInput.press('Enter');

  // 13. Plural Forms (Plural Form 1 and Plural Pattern 1)
  console.log('Filling Plural Form 1...');
  await page.locator('label:has-text("Plural Form 1") ~ input, label:has-text("Forma tal-Plural 1") ~ input').fill('għammiela');
  await page.locator('label:has-text("Plural Pattern 1") ~ input, label:has-text("Mudell tal-Plural 1") ~ input').fill('CaCCieCa');

  // Click "+ Add Plural" to add a second plural form
  console.log('Adding Plural Form 2...');
  await page.click('button:has-text("Add Plural"), button:has-text("Żid Plural")');
  await page.waitForTimeout(200);
  await page.locator('label:has-text("Plural Form 2") ~ input, label:has-text("Forma tal-Plural 2") ~ input').fill('għammieliet');
  await page.locator('label:has-text("Plural Pattern 2") ~ input, label:has-text("Mudell tal-Plural 2") ~ input').fill('CaCCiCiet');

  // 14. Paucal Form & Pattern
  console.log('Filling Paucal Form and Pattern...');
  await page.locator('label:has-text("Paucal Form") ~ input, label:has-text("Forma Pawkali") ~ input').fill('għammiliet');
  const paucalPatternInput = page.locator('div:has(> label:has-text("Paucal Pattern")), div:has(> label:has-text("Mudell Pawkali"))').locator('input');
  await paucalPatternInput.fill('CaCCiCiet');
  await paucalPatternInput.press('Enter');

  // 15. Augmentative Form & Pattern
  console.log('Filling Augmentative Form and Pattern...');
  await page.locator('label:has-text("Augmentative Form") ~ input, label:has-text("Forma Tkabbir") ~ input').fill('għammielun');
  const augPatternInput = page.locator('div:has(> label:has-text("Augmentative Pattern")), div:has(> label:has-text("Mudell Tkabbir"))').locator('input');
  await augPatternInput.fill('CaCCieCun');
  await augPatternInput.press('Enter');

  // 16. Diminutive & Pattern
  console.log('Filling Diminutive and Pattern...');
  await page.locator('label:has-text("Diminutive") ~ input, label:has-text("Diminuttiv") ~ input').fill('għajmiel');
  await page.waitForTimeout(200);
  const dimPatternInput = page.locator('div:has(> label:has-text("Diminutive Pattern")), div:has(> label:has-text("Mudell Diminuttiv"))').locator('input');
  await dimPatternInput.fill('CaCjjieC');
  await dimPatternInput.press('Enter');

  // 17. Definitions
  console.log('Filling Definition 1...');
  const definitionsFieldset = page.locator('fieldset:has-text("Definitions"), fieldset:has-text("Definizzjonijiet")');
  await page.locator('label:has-text("Sense 1: English") ~ input, label:has-text("Sens 1: Ingliż") ~ input').fill('worker-qa');
  await definitionsFieldset.locator('label:has-text("Maltese") ~ input, label:has-text("Malti") ~ input').first().fill('ħaddiem-qa');
  await definitionsFieldset.locator('label:has-text("Register") ~ select, label:has-text("Reġistru") ~ select').first().selectOption('colloquial');

  // Add Definition 2
  console.log('Adding Definition 2...');
  await page.click('button:has-text("Add Sense"), button:has-text("Żid Sens")');
  await page.waitForTimeout(500);
  await page.locator('label:has-text("Sense 2: English") ~ input, label:has-text("Sens 2: Ingliż") ~ input').fill('producer-qa');
  await definitionsFieldset.locator('label:has-text("Maltese") ~ input, label:has-text("Malti") ~ input').nth(1).fill('produttur-qa');

  // 18. Usage Example
  console.log('Filling Usage Examples...');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("Maltese sentence") ~ input, label:has-text("Malti sentence") ~ input')
    .fill('Huwa għammiel tajjeb.');
  await page.locator('fieldset:has-text("Usage Example"), fieldset:has-text("Eżempju ta\' Użu")')
    .locator('label:has-text("English sentence") ~ input, label:has-text("Ingliż sentence") ~ input')
    .fill('He is a good worker.');

  // 19. Relationships
  console.log('Adding Alternative Form Relationship...');
  const altFormEditor = page.locator('div.space-y-3:has(span:has-text("Alternative Forms")), div.space-y-3:has(span:has-text("Forom Alternattivi"))').first();
  await altFormEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await altFormEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-kittieb'); // kittieb
  await altFormEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Derived Term Relationship...');
  const derivedEditor = page.locator('div.space-y-3:has(span:has-text("Derived Terms")), div.space-y-3:has(span:has-text("Termini Derivati"))').first();
  await derivedEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await derivedEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-ktieb'); // ktieb
  await derivedEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Synonym Relationship...');
  const synonymEditor = page.locator('div.space-y-3:has(span:has-text("Synonyms")), div.space-y-3:has(span:has-text("Sinonimi"))').first();
  await synonymEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await synonymEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-ħarrief'); // ħarrief
  await synonymEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  console.log('Adding Antonym Relationship...');
  const antonymEditor = page.locator('div.space-y-3:has(span:has-text("Antonyms")), div.space-y-3:has(span:has-text("Antonimi"))').first();
  await antonymEditor.locator('button:text("Add"), button:text("Żid")').click();
  await page.waitForTimeout(500);
  await antonymEditor.locator('input[placeholder*="entry-id or headword"]').fill('n-baħħar'); // baħħar
  await antonymEditor.locator('input[placeholder*="entry-id or headword"]').press('Enter');
  await page.waitForTimeout(1000);

  // 20. Etymology Builder
  console.log('Adding Etymology Chain Step...');
  await page.click('button:has-text("Add Step"), button:has-text("Żid Pass")');
  await page.waitForTimeout(500);
  const etymologyFieldset = page.locator('fieldset:has(legend:has-text("Etymology Builder")), fieldset:has(legend:has-text("Oriġini tal-Kelma"))');
  const etymologyStep = etymologyFieldset.locator('div.relative').last();
  await etymologyStep.locator('select').selectOption('Borrowed from');
  await etymologyStep.locator('input[placeholder*="Arabic"]').fill('Arabic');
  await etymologyStep.locator('input[placeholder*="cantare"]').fill('‘āmil');
  await etymologyStep.locator('input[placeholder*="kan-ta-re"]').fill('aamil');
  await etymologyStep.locator('input[placeholder*="to sing"]').fill('worker');

  // 21. Source Citation
  console.log('Filling Source Citation...');
  await page.locator('label:has-text("Source Citation") ~ input, label:has-text("Sors / Referenza") ~ input').fill('Aquilina1987');

  // Take screenshot before save
  await page.screenshot({ path: join(artifactsDir, 'browser_new_entry_filled_full.png'), fullPage: true });
  console.log('Form fully filled, screenshot taken.');

  // Click Save/Create button
  console.log('Clicking "Create Entry" button...');
  await page.click('button:has-text("Create Entry"), button:has-text("Oħloq Entrata")');
  await page.waitForTimeout(3000);

  // Take screenshot after save
  await page.screenshot({ path: join(artifactsDir, 'browser_after_creation_full.png') });
  console.log('Clicked create entry, screenshot taken.');

  // Verify the entry was added by checking if it exists in the list or searching
  console.log('Searching for għammiel-qa in admin entries list...');
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Fittex"]').first();
  await searchInput.fill('għammiel-qa');
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(artifactsDir, 'browser_search_result_full.png') });

  // Navigate to entry details page to verify rendering
  console.log('Navigating to details page...');
  const entryLink = page.locator('a:has-text("għammiel-qa")');
  if (await entryLink.count() > 0) {
    await entryLink.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(artifactsDir, 'browser_entry_detail_page_full.png'), fullPage: true });
    console.log('Detail page screenshot taken.');
  } else {
    console.error('Could not find għammiel-qa entry link in search results.');
  }

  await browser.close();
  console.log('Browser closed. Test run complete!');
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});
