const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const cwd = path.resolve(__dirname, '..');
const PORT = 5173;

const startDevServer = () =>
  new Promise((resolve, reject) => {
    const logPath = path.join(cwd, 'dev-server.log');
    const errPath = path.join(cwd, 'dev-server-error.log');
    try {
      if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
      if (fs.existsSync(errPath)) fs.unlinkSync(errPath);
    } catch (err) {
      console.warn('Unable to clean old log files:', err.message);
    }

    const child = spawn('cmd.exe', ['/c', 'dev.bat', '--', '--host', '127.0.0.1', '--port', PORT], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    child.stdout.on('data', (data) => {
      const text = data.toString();
      fs.appendFileSync(logPath, text);
      process.stdout.write(`[dev] ${text}`);
      if (!resolved && /Local/.test(text)) {
        resolved = true;
        resolve(child);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      fs.appendFileSync(errPath, text);
      process.stderr.write(`[dev:err] ${text}`);
    });

    child.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`dev server exited with code ${code}`));
      }
    });
  });

const killTree = (pid) =>
  new Promise((resolve) => {
    const killer = spawn('taskkill', ['/PID', pid, '/T', '/F']);
    killer.on('exit', () => resolve());
  });

(async () => {
  const server = await startDevServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err));

  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForTimeout(2000);

  await browser.close();
  await killTree(server.pid);
})();
