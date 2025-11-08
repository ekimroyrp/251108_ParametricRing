const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const distIndex = path.resolve(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distIndex)) {
  console.error('dist build not found; run `npm run build` first.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('[browser]', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('[pageerror]', err);
  });

  await page.goto('file:///' + distIndex.replace(/\\/g, '/'));
  await page.waitForTimeout(2000);
  await page.close();
  await browser.close();
})();
