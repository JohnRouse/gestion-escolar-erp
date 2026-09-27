import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Perfil > Datos usa endpoints propios y no envía avatar_url en el PUT general", async () => {
  const source = await readFile(new URL("../src/components/TabDatos.tsx", import.meta.url), "utf8");
  assert.match(source, /\/api\/auth\/portal\/perfil\/avatar/);
  assert.match(source, /formData\.append\("avatar", file\)/);
  assert.match(source, /axios\.delete<Perfil>/);
  assert.match(source, /Agregar foto/);
  assert.match(source, /Cambiar foto/);
  assert.match(source, /Quitar foto/);
  assert.match(source, /const nombreAvatar = perfil\?\.nombres\?\.trim\(\)\.split\(\/\\s\+\/\)\[0\] \|\| "Apoderado"/);
  assert.match(source, /name=\{nombreAvatar\}/);
  assert.doesNotMatch(source, /ocupacion,\s*avatar_url:/);
});

test("DashboardHeader relee el avatar del backend y acepta actualización inmediata", async () => {
  const source = await readFile(new URL("../src/components/DashboardHeader.tsx", import.meta.url), "utf8");
  assert.match(source, /axios\.get<\{ avatar_url\?: string \| null \}>\("\/api\/auth\/portal\/perfil"/);
  assert.match(source, /setAvatarApoderado\(authoritativeAvatar\)/);
  assert.match(source, /onAvatarChange=\{updateAvatar\}/);
});

test("el avatar compartido llena el círculo sin caja inline ni espacio de baseline", async () => {
  const avatar = await readFile(new URL("../src/components/PortalAvatar.tsx", import.meta.url), "utf8");
  const header = await readFile(new URL("../src/components/DashboardHeader.tsx", import.meta.url), "utf8");

  assert.match(avatar, /relative flex shrink-0 items-center justify-center overflow-hidden/);
  assert.match(avatar, /block h-full w-full object-cover object-center/);
  assert.doesNotMatch(avatar, /inline-flex/);
  assert.match(header, /className="block shrink-0 rounded-full p-0 leading-none"/);
  assert.match(header, /className="h-11 w-11 rounded-full border border-border"/);
});
