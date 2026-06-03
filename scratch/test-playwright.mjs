import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`API RESPONSE: ${response.url()} -> Status ${response.status()}`);
        }
    });

    try {
        console.log("Navigating to http://localhost:5174/entry/n-g%C4%A7ammiel ...");
        const response = await page.goto('http://localhost:5174/entry/n-g%C4%A7ammiel');
        console.log(`Main navigation status: ${response ? response.status() : 'null'}`);
        await page.waitForTimeout(3000);
        console.log(`Current URL after wait: ${page.url()}`);
        const content = await page.content();
        console.log("Page 5174 Loaded!");
        console.log("Has Usage Example Header:", content.includes('Usage Example') || content.includes('Eżempju ta’ Użu'));
        console.log("Has Maltese example text:", content.includes("Għammiel tajjeb"));
        
        // Let's also check if "għammiel" is anywhere on the page
        console.log("Has 'għammiel' word on page:", content.toLowerCase().includes("għammiel"));
    } catch (e) {
        console.log("Error loading page:", e.stack);
    }

    await browser.close();
}
run();
