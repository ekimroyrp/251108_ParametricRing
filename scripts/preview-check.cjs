const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');
const PORT = 4173;

const waitForServer = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'cmd' : 'sh',
      process.platform === 'win32'
        ? ['/c', 'npm', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', PORT]
        : ['-c', 'npm run preview -- --host 127.0.0.1 --port ' + PORT],
      { cwd }
    );

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    let resolved = false;

    const handleOutput = (data) => {
      const text = data.toString();
      process.stdout.write(`[preview] ${text}`);
      if (!resolved && text.includes('Local')) {
        resolved = true;
        resolve(child);
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', (data) => process.stderr.write(`[preview:err] ${data}`));

    child.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`preview exited with code ${code}`));
      }
    });
  });

(async () => {
  const serverProc = await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[page]', err));

  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForTimeout(2000);
  await browser.close();
  serverProc.kill();
})();
