import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../src", import.meta.url);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("Galería legacy redirige al dashboard", async () => {
  const source = await readFile(new URL("../src/app/dashboard/galeria/page.tsx", import.meta.url), "utf8");
  assert.match(source, /redirect\("\/dashboard"\)/);
  assert.doesNotMatch(source, /axios|ComentarioFoto|ReaccionFoto/);
});

test("no existe navegación visible ni cliente social de Galería", async () => {
  const legacy = path.normalize(new URL("../src/app/dashboard/galeria/page.tsx", import.meta.url).pathname);
  const navigationHelper = path.normalize(new URL("../src/lib/portalNotificationNavigation.ts", import.meta.url).pathname);
  const files = (await filesUnder(root.pathname)).filter((file) => file !== legacy && file !== navigationHelper);
  const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
  assert.equal(sources.some((source) => /\/dashboard\/galeria|Galería escolar|api\/albumes/.test(source)), false);
});

test("perfil conserva las cinco pestañas y servicios V1", async () => {
  const source = await readFile(new URL("../src/components/ProfileDrawer.tsx", import.meta.url), "utf8");
  for (const label of ["Datos", "Seguridad", "Preferencias", "Hijos", "Servicios", "Horario", "Comunicados"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-selected/);
});

test("selector inferior explicita estudiante seleccionado", async () => {
  const source = await readFile(new URL("../src/components/BottomNav.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-pressed=\{active\}/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /event\.key === "Escape"/);
});
