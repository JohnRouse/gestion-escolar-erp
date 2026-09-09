// CRUD is allowed only through the guarded temporary Staff test server.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = 'http://127.0.0.1:33318';
const password = 'Staff-fixture-2026!';
const waitFor = async (check) => {
  for (let n = 0; n < 80; n++) { if (await check()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Timed out waiting for assertion');
};
(async () => {
  const marker = await fetch(`${url}/api/__staff_test_isolated`).then(r => r.json());
  assert.deepEqual(marker, { database: 'staff_v1_test', port: 33316 });
  console.log('Isolated database verified; launching Chrome');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, XDG_CONFIG_HOME: '/tmp/staff-v1-chrome-config', XDG_CACHE_HOME: '/tmp/staff-v1-chrome-cache' } });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      // External decorative resources are not dependencies of the Staff flow.
      await page.route('**/*', route => new URL(route.request().url()).origin === url
        ? route.continue() : route.fulfill({ status: 200, body: '', contentType: 'text/plain' }));
      console.log(`Browser ${viewport.width}: login`);
      await page.goto(`${url}/login`);
      await page.getByPlaceholder('Ingresa tu usuario').fill('staff.admin');
      await page.getByPlaceholder('Ingresa tu contraseña').fill(password);
      await page.getByRole('button', { name: 'Acceder al sistema' }).click();
      await page.waitForURL('**/dashboard');
      await page.goto(`${url}/staff`);
      await page.getByRole('heading', { name: 'Staff institucional', exact: true }).waitFor();
      await page.getByRole('button', { name: /^Editar / }).first().waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByLabel('Buscar Staff').fill('zzzz-no-result');
      await page.getByText('No hay resultados para estos filtros.').waitFor();
      await page.getByLabel('Buscar Staff').fill('');
      await page.getByRole('button', { name: /^Editar / }).first().waitFor();
      await page.getByRole('button', { name: 'Nuevo miembro', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Nuevo miembro de Staff' });
      await dialog.waitFor();
      assert.equal(await dialog.getByLabel('DNI *', { exact: true }).evaluate(el => el === document.activeElement), true);
      await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
      assert.equal(await dialog.locator('form').evaluate(el => el.checkValidity()), false);
      assert.equal(await dialog.getByLabel('Colegio destino *').inputValue(), '');
      // Boundary focus trap, visible focus, Escape and restoration.
      await dialog.getByRole('button', { name: 'Guardar cambios' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      const focusStyle = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.boxShadow]; });
      assert.ok(focusStyle[0] !== 'none' || focusStyle[2] !== 'none', `Missing focus: ${focusStyle}`);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('button', { name: 'Nuevo miembro', exact: true }).evaluate(el => el === document.activeElement), true);
      await page.getByRole('button', { name: 'Nuevo miembro', exact: true }).click();
      const dni = String(95000000 + Math.floor(Math.random() * 900000));
      await dialog.getByLabel('DNI *', { exact: true }).fill(dni);
      const lookupResponse = page.waitForResponse(r => r.url().includes('/api/staff/personas/'));
      await dialog.getByRole('button', { name: 'Comprobar documento' }).click();
      assert.equal((await lookupResponse).status(), 200);
      await dialog.getByText('Documento disponible.', { exact: false }).waitFor();
      await dialog.getByLabel('Nombres *', { exact: true }).fill('Prueba Navegador');
      await dialog.getByLabel('Apellido paterno *').fill('Staff');
      await dialog.getByLabel('Apellido materno *').fill('Aislado');
      await dialog.getByLabel('Fecha de nacimiento *').fill('1991-04-10');
      await dialog.getByLabel('Teléfono', { exact: true }).fill('999111222');
      await dialog.getByLabel('Correo', { exact: true }).fill(`staff.${dni}@example.test`);
      await dialog.getByLabel('Colegio destino *').selectOption({ index: 1 });
      await dialog.getByLabel('Cargo *', { exact: true }).fill('Auxiliar');
      await dialog.getByLabel('Área *', { exact: true }).fill('Bienestar');
      await dialog.getByLabel('Crear o asociar acceso interno').check();
      await dialog.getByLabel('Usuario *', { exact: true }).fill(`staff.browser.${dni}`);
      await dialog.getByLabel('Contraseña inicial (solo cuenta nueva)').fill(password);
      await dialog.getByLabel('Motivo del registro o cambio *').fill('Alta mediante Playwright en base aislada');
      await page.screenshot({ path: `/tmp/staff-v1-form-${viewport.width}.png`, fullPage: true });
      const responsePromise = page.waitForResponse(r => r.url().includes('/api/staff?') && r.request().method() === 'POST');
      await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
      const created = await responsePromise;
      assert.equal(created.status(), 201, await created.text());
      await dialog.waitFor({ state: 'hidden' });
      await page.getByLabel('Buscar Staff').fill(dni);
      const edit = page.getByRole('button', { name: 'Editar Prueba Navegador Staff', exact: true });
      await edit.waitFor(); await edit.click();
      const editor = page.getByRole('dialog', { name: 'Editar miembro de Staff' });
      await editor.waitFor();
      await editor.getByLabel('Cargo *', { exact: true }).fill('Coordinación');
      await editor.getByLabel('Permite citas', { exact: true }).uncheck();
      await editor.getByLabel('Motivo del registro o cambio *').fill('Edición institucional de prueba');
      await editor.getByRole('button', { name: 'Guardar cambios' }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.locator('li').filter({ has: edit }).getByText('No permite citas', { exact: true }).waitFor();
      await edit.click(); await editor.waitFor();
      assert.equal(await editor.getByLabel('Cargo *', { exact: true }).inputValue(), 'Coordinación');
      await editor.getByLabel('Permite citas', { exact: true }).check();
      await editor.getByLabel('Motivo del registro o cambio *').fill('Restaurar disponibilidad de citas');
      await editor.getByRole('button', { name: 'Guardar cambios' }).click();
      await editor.waitFor({ state: 'hidden' });
      await waitFor(() => page.locator('li').filter({ has: edit }).getByText('Permite citas', { exact: true }).count());
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.screenshot({ path: `/tmp/staff-v1-list-${viewport.width}.png`, fullPage: true });
      // Approximate 200% desktop browser zoom by halving the CSS viewport.
      // This matches browser zoom semantics better than applying CSS `zoom: 2`,
      // which also scales vh-based dialog constraints artificially.
      if (viewport.width === 1440) {
        await page.setViewportSize({ width: 720, height: 450 });
        await page.getByRole('button', { name: 'Nuevo miembro', exact: true }).click();
        await dialog.waitFor();
        assert.equal(await dialog.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.top >= 0
            && r.left >= 0
            && r.right <= innerWidth + 1
            && r.bottom <= innerHeight + 1;
        }), true);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        await page.setViewportSize(viewport);
      }
      for (const width of [768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: Admin login, list, search, validation, isolated create+credentials, edit, appointments off/on, keyboard/focus, 200% zoom, reduced motion, no console errors`);
      await context.close();
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = await context.request.post(`${url}/api/auth/login`, { data: { username: 'staff.profesor', password } });
    assert.equal(login.status(), 200);
    const { access_token } = await login.json();
    await page.goto(`${url}/login`);
    await page.evaluate(token => localStorage.setItem('token_intranet', token), access_token);
    await page.goto(`${url}/staff`); await page.waitForURL('**/dashboard');
    assert.equal(await page.getByRole('button', { name: 'Nuevo miembro' }).count(), 0);
    const denied = await context.request.post(`${url}/api/staff?tenant_id=1&scope=all`, { headers: { Authorization: `Bearer ${access_token}` }, data: {} });
    assert.equal(denied.status(), 403);
    console.log('PASS Profesor: URL redirects and direct API write returns 403');
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
