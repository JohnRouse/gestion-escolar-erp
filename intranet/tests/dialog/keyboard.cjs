// Run with a development Vite server; uses only this fixture and in-memory state.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.DIALOG_TEST_URL || 'http://localhost:3012/tests/dialog/';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Reject any accidental business request, including reads.
    const requests = [];
    let blockedFonts = 0;
    await page.route('**/*', (route) => {
      const request = route.request();
      if (new URL(request.url()).hostname === 'fonts.googleapis.com') {
        blockedFonts += 1;
        return route.abort();
      }
      if (new URL(request.url()).origin !== new URL(url).origin ||
          /\/(api|uploads)(\/|$)/.test(new URL(request.url()).pathname) ||
          request.method() !== 'GET') {
        requests.push(request.url());
        return route.abort();
      }
      return route.continue();
    });
    const dialog = (name) => page.getByRole('dialog', { name, exact: true });
    const focus = () => page.evaluate(() => document.activeElement.id || document.activeElement.textContent);
    const count = async (expected) => assert.equal(await page.getByRole('dialog').count(), expected);
    const scroll = async (expected) => assert.equal(await page.evaluate(() => document.body.style.overflow), expected);
    const reset = async () => {
      await page.goto(url);
      await page.evaluate(() => { document.body.style.overflow = 'scroll'; });
      await page.locator('#launch').click();
    };
    const pair = async () => { await reset(); await page.locator('#open-child').click(); };
    const test = async (name, run) => { await run(); console.log(`PASS ${name}`); };

    await test('Escape closes only child; parent remains locked; focus returns in two steps', async () => {
      await pair(); await page.keyboard.press('Escape'); await count(1);
      assert.equal(await page.locator('#events').textContent(), 'hijo');
      assert.equal(await focus(), 'open-child'); await scroll('hidden');
      await page.keyboard.press('Escape'); await count(0);
      assert.equal(await focus(), 'launch'); await scroll('scroll');
    });
    await test('preventClose consumes Escape; dynamic unblock uses current options', async () => {
      await pair(); await page.locator('#child-first').click();
      await page.keyboard.press('Escape'); await count(2);
      assert.equal(await page.locator('#events').textContent(), ''); await scroll('hidden');
      await page.locator('#child-first').click(); await page.keyboard.press('Escape'); await count(1);
    });
    await test('closeOnEscape=false consumes Escape without closing parent', async () => {
      await pair(); await dialog('Hijo').getByRole('button', { name: 'Alternar Escape', exact: true }).click();
      await page.keyboard.press('Escape'); await count(2);
      assert.equal(await page.locator('#events').textContent(), '');
      await dialog('Hijo').getByRole('button', { name: 'Alternar Escape', exact: true }).click();
      await page.keyboard.press('Escape'); await count(1);
    });
    await test('Tab advances normally and both boundaries wrap only inside child', async () => {
      await pair(); await page.locator('#child-first').focus(); await page.keyboard.press('Tab');
      assert.equal(await focus(), 'Alternar Escape');
      await page.keyboard.press('Shift+Tab'); assert.equal(await focus(), 'child-first');
      await page.locator('#child-last').focus(); await page.keyboard.press('Tab');
      assert.equal(await dialog('Hijo').getByRole('button', {name: 'Cerrar diálogo'}).evaluate((el) => el === document.activeElement), true);
      await page.keyboard.press('Shift+Tab'); assert.equal(await focus(), 'child-last');
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press(i < 10 ? 'Tab' : 'Shift+Tab');
        assert.equal(await dialog('Hijo').evaluate((el) => el.contains(document.activeElement)), true);
      }
    });
    await test('focus outside or on panel is recovered by topmost in both directions', async () => {
      await pair();
      for (const target of ['#outside', '[role="dialog"]:last-of-type']) {
        // Use the actual panel for the second branch (portals have sibling wrappers).
        if (target === '#outside') await page.locator(target).focus(); else await dialog('Hijo').focus();
        await page.keyboard.press('Shift+Tab'); assert.equal(await focus(), 'child-last');
        await page.locator('#outside').focus(); await page.keyboard.press('Tab');
        assert.equal(await dialog('Hijo').evaluate((el) => el.contains(document.activeElement)), true);
      }
    });
    await test('no focusable controls: both Tab directions stay on child panel', async () => {
      await pair(); await dialog('Hijo').getByRole('button', {name: 'Sin controles'}).click();
      for (const key of ['Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        assert.equal(await dialog('Hijo').evaluate((el) => el === document.activeElement), true);
      }
      await page.keyboard.press('Escape'); await count(1); assert.equal(await focus(), 'open-child');
    });
    await test('three layers and conditionally mounted native autoFocus in StrictMode', async () => {
      await pair(); await dialog('Hijo').getByRole('button', {name: 'Abrir tercero'}).click();
      assert.equal(await page.getByRole('textbox', {name: 'Campo tercero'}).evaluate((el) => el === document.activeElement), true);
      await page.keyboard.press('Escape'); await count(2); assert.equal(await focus(), 'Abrir tercero'); await scroll('hidden');
      await page.keyboard.press('Escape'); await count(1); assert.equal(await focus(), 'open-child');
      await page.keyboard.press('Escape'); await count(0); await scroll('scroll');
      assert.equal(await page.locator('#events').textContent(), 'tercero,hijo,padre');
    });
    await test('removing lower layer keeps child focus and forwards final focus origin', async () => {
      await pair(); await dialog('Hijo').getByRole('button', {name: 'Desmontar padre'}).click();
      await count(1); await scroll('hidden');
      assert.equal(await dialog('Hijo').evaluate((el) => el.contains(document.activeElement)), true);
      await page.keyboard.press('Escape'); await count(0); assert.equal(await focus(), 'launch'); await scroll('scroll');
    });
    await test('a reopened portal becomes the painted topmost regardless of component order', async () => {
      await pair(); await dialog('Hijo').getByRole('button', {name:'Desmontar padre'}).click();
      await dialog('Hijo').getByRole('button', {name:'Reabrir padre'}).click(); await count(2);
      await page.keyboard.press('Escape'); await count(1);
      assert.equal(await page.locator('#events').textContent(), 'padre');
      assert.equal(await dialog('Hijo').evaluate((el) => el.contains(document.activeElement)), true);
      await page.keyboard.press('Escape'); await count(0); await scroll('scroll');
    });
    await test('simultaneous close restores external focus and original overflow', async () => {
      await pair(); await dialog('Hijo').getByRole('button', {name:'Cerrar todos'}).click();
      await count(0); await scroll('scroll'); assert.equal(await focus(), 'launch');
    });
    await test('close button, overlay and Cancel preserve parent and focus', async () => {
      for (const method of ['button','overlay','cancel']) {
        await pair();
        if (method === 'button') await dialog('Hijo').getByRole('button',{name:'Cerrar diálogo'}).click();
        if (method === 'overlay') await page.mouse.click(5, 5);
        if (method === 'cancel') await page.locator('#child-last').click();
        await count(1); assert.equal(await focus(), 'open-child'); await scroll('hidden');
      }
    });
    await test('repeated reopen and cleanup do not duplicate handlers or leak scroll lock', async () => {
      await reset();
      for (let i = 0; i < 5; i++) {
        await page.locator('#open-child').click(); await page.keyboard.press('Escape'); await count(1);
      }
      assert.equal(await page.locator('#events').textContent(), Array(5).fill('hijo').join(','));
      await page.keyboard.press('Escape'); await count(0); await scroll('scroll');
      await page.locator('#outside').focus(); await page.keyboard.press('Escape'); assert.equal(await focus(), 'outside');
    });
    await test('CenteredFormModal and ConfirmDialog preserve native and explicit initial focus', async () => {
      await page.goto(url); await page.locator('#open-form').click();
      assert.equal(await page.getByRole('textbox',{name:'Campo formulario'}).evaluate((el) => el === document.activeElement), true);
      await dialog('Formulario').getByRole('button',{name:'Guardar',exact:true}).click();
      assert.equal(await focus(), 'Cancelar');
      await page.keyboard.press('Escape'); await count(1); assert.equal(await focus(), 'Guardar');
      await page.keyboard.press('Escape'); await count(0); assert.equal(await focus(), 'open-form');
    });
    await test('responsive matrix and reduced motion retain keyboard operation', async () => {
      for (const [width,height] of [[360,800],[390,844],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
        await page.setViewportSize({width,height}); await page.emulateMedia({reducedMotion:'reduce'}); await pair();
        const bounds = await dialog('Hijo').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height);
        assert.equal(await dialog('Hijo').evaluate((el) => getComputedStyle(el).animationName), 'none');
        await page.locator('#child-last').focus(); await page.keyboard.press('Tab');
        const indicator = await dialog('Hijo').getByRole('button',{name:'Cerrar diálogo'}).evaluate((el) => ({
          visible:el.matches(':focus-visible'), shadow:getComputedStyle(el).boxShadow, outline:getComputedStyle(el).outlineStyle,
        }));
        assert.ok(indicator.visible && (indicator.shadow !== 'none' || indicator.outline !== 'none'));
        await page.keyboard.press('Escape'); await count(1);
      }
    });
    await test('125%, 150% and 200% zoom-equivalent CSS viewports keep dialog operable', async () => {
      // Effective layout viewport at browser zoom; this is not native browser UI zoom.
      for (const factor of [1.25, 1.5, 2]) {
        const width = Math.floor(1440 / factor), height = Math.floor(900 / factor);
        await page.setViewportSize({width, height}); await pair();
        const bounds = await dialog('Hijo').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height);
        await page.locator('#child-last').focus(); await page.keyboard.press('Tab');
        assert.equal(await dialog('Hijo').evaluate((el) => el.contains(document.activeElement)), true);
        if (process.env.DIALOG_SCREENSHOT_DIR) {
          await page.screenshot({path: `${process.env.DIALOG_SCREENSHOT_DIR}/dialog-zoom-${factor}.png`});
        }
        await page.keyboard.press('Escape'); await count(1);
      }
    });
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    console.log(`PASS zero page errors; zero API or mutating requests; ${blockedFonts} external font requests blocked`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
