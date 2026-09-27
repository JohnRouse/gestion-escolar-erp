import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';

const requireFromPortal = createRequire(new URL('../../padres/package.json', import.meta.url));
const sharp = requireFromPortal('sharp');

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Vite terminó antes de iniciar la prueba.');
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // El servidor todavía está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Vite no inició dentro del tiempo esperado.');
}

test('Portal e Intranet en StrictMode cargan foto vertical y preview/upload usan el mismo Blob 512x512', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'avatar-crop-browser-'));
  const fixture = join(temporaryDirectory, 'vertical.jpg');
  const orientedFixture = join(temporaryDirectory, 'orientation-6.jpg');
  await sharp({
    create: { width: 1080, height: 2400, channels: 3, background: '#173f7a' },
  })
    .composite([
      { input: Buffer.from('<svg width="1080" height="240"><rect width="1080" height="240" fill="#f04444"/></svg>'), top: 0, left: 0 },
      { input: Buffer.from('<svg width="1080" height="600"><circle cx="540" cy="300" r="220" fill="#f7c56f"/><circle cx="465" cy="255" r="25"/><circle cx="615" cy="255" r="25"/></svg>'), top: 900, left: 0 },
      { input: Buffer.from('<svg width="1080" height="240"><rect width="1080" height="240" fill="#43b878"/></svg>'), top: 2160, left: 0 },
    ])
    .jpeg({ quality: 92 })
    .toFile(fixture);
  await sharp({
    create: { width: 1080, height: 2400, channels: 3, background: '#245da8' },
  })
    .jpeg({ quality: 92 })
    .withMetadata({ orientation: 6 })
    .toFile(orientedFixture);

  const port = 4177;
  const url = `http://127.0.0.1:${port}/tests/avatar-crop-browser.html`;
  const server = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: new URL('..', import.meta.url),
    stdio: 'ignore',
  });
  let browser;
  try {
    await waitForServer(url, server);
    browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const failedBlobRequests = [];
    const consoleErrors = [];
    page.on('requestfailed', (request) => {
      if (request.url().startsWith('blob:')) failedBlobRequests.push(request.url());
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(url);
    await page.locator('#photo').setInputFiles(process.env.AVATAR_REAL_PHOTO || fixture);
    await page.waitForFunction(() => window.__avatarResult?.bytesMatch === true);
    const initial = await page.evaluate(() => window.__avatarResult);
    assert.deepEqual(
      { width: initial.width, height: initial.height },
      { width: 512, height: 512 },
    );
    assert.match(initial.mime, /^image\/(webp|jpeg)$/);
    assert.equal(initial.previewCount, 2);

    const initialCropKey = initial.cropKey;
    await page.getByLabel('Zoom de la fotografía').fill('1.6');
    await page.waitForFunction(
      (previous) => Boolean(window.__avatarResult?.bytesMatch && window.__avatarResult.cropKey !== previous),
      initialCropKey,
    );
    const zoomCropKey = await page.evaluate(() => window.__avatarResult?.cropKey);
    const viewport = page.getByRole('group', { name: /Área de recorte cuadrada/ });
    const box = await viewport.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 70, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction(
      (previous) => Boolean(window.__avatarResult?.bytesMatch && window.__avatarResult.cropKey !== previous),
      zoomCropKey,
    );

    const final = await page.evaluate(() => window.__avatarResult);
    assert.equal(final.bytesMatch, true);
    assert.equal(failedBlobRequests.length, 0);
    assert.deepEqual(consoleErrors, []);
    if (process.env.AVATAR_SCREENSHOT) {
      await page.screenshot({ path: process.env.AVATAR_SCREENSHOT, fullPage: true });
    }
    for (const viewportSize of [
      { width: 440, height: 956 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewportSize);
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.equal(layout.scrollWidth, layout.clientWidth);
      const responsiveBox = await viewport.boundingBox();
      assert.ok(responsiveBox && responsiveBox.width <= viewportSize.width && responsiveBox.height <= viewportSize.height);
    }
    if (!process.env.AVATAR_REAL_PHOTO) {
      await page.locator('#photo').setInputFiles(orientedFixture);
      await page.waitForFunction(() => window.__avatarSource?.width === 2400 && window.__avatarSource?.height === 1080);
      await page.waitForFunction(() => window.__avatarResult?.bytesMatch === true);
      const oriented = await page.evaluate(() => ({ source: window.__avatarSource, result: window.__avatarResult }));
      assert.deepEqual(oriented.source, { width: 2400, height: 1080 });
      assert.deepEqual(
        { width: oriented.result.width, height: oriented.result.height },
        { width: 512, height: 512 },
      );
    }

    await page.goto(`http://127.0.0.1:${port}/tests/portal-avatar-crop-browser.html`);
    await page.locator('#portal-photo').setInputFiles(process.env.AVATAR_REAL_PHOTO || fixture);
    await page.waitForFunction(() => {
      const save = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Guardar'));
      return document.querySelectorAll('img').length === 2 && save && !save.disabled;
    });
    await page.getByLabel('Zoom de la fotografía').fill('1.55');
    await page.waitForFunction(() => document.querySelectorAll('img').length === 2);
    await page.getByRole('button', { name: /Guardar/ }).click();
    await page.waitForFunction(() => window.__portalUpload?.bytesMatch === true);
    const portalUpload = await page.evaluate(() => window.__portalUpload);
    assert.deepEqual(
      { width: portalUpload.width, height: portalUpload.height },
      { width: 512, height: 512 },
    );
    assert.match(portalUpload.mime, /^image\/(webp|jpeg)$/);
    assert.equal(failedBlobRequests.length, 0);
    assert.deepEqual(consoleErrors, []);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
