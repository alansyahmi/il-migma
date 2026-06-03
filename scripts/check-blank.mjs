import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message));

  console.log('Navigating to http://localhost:5174/admin');
  try {
    await page.goto('http://localhost:5174/admin', { waitUntil: 'networkidle0', timeout: 5000 });
  } catch(e) {
    console.log('Navigation ended with:', e.message);
  }
  
  await browser.close();
})();
