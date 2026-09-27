import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Perfil > Hijos usa multipart foto, reemplazo y retiro sin URL arbitraria", async () => {
  const source = await readFile(
    new URL("../src/components/TabHijos.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /new FormData\(\)/);
  assert.match(source, /formData\.append\("foto", file\)/);
  assert.match(source, /axios\.post/);
  assert.match(source, /axios\.delete/);
  assert.match(source, /Agregar foto/);
  assert.match(source, /Cambiar foto/);
  assert.match(source, /Quitar foto/);
  assert.match(source, /role="alertdialog"/);
  assert.doesNotMatch(source, /Content-Type/);
  assert.doesNotMatch(source, /axios\.put/);
});

test("SelectedChildContext publica una única actualización para todos sus consumidores", async () => {
  const source = await readFile(
    new URL("../src/contexts/SelectedChildContext.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /updateChildAvatar/);
  assert.match(source, /setHijos/);
  assert.match(source, /setSelectedChildState/);
  assert.match(source, /localStorage\.setItem\("selectedChild"/);
});
