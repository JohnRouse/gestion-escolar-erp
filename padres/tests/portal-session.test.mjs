import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPortalSession,
  establishPortalSession,
  isValidPortalToken,
} from "../src/lib/portalSession.ts";

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("acepta únicamente un token vigente del portal", () => {
  const now = Date.UTC(2026, 8, 21);
  assert.equal(isValidPortalToken(token({ canal: "portal-padres", exp: now / 1000 + 60 }), now), true);
  assert.equal(isValidPortalToken(token({ canal: "interno", exp: now / 1000 + 60 }), now), false);
  assert.equal(isValidPortalToken(token({ canal: "portal-padres", exp: now / 1000 - 1 }), now), false);
  assert.equal(isValidPortalToken("no-es-jwt", now), false);
});

test("una sesión nueva no conserva hijo ni avatar de la cuenta anterior", () => {
  const storage = memoryStorage({ selectedChild: "viejo", avatar_url: "viejo", token: "viejo" });
  establishPortalSession(storage, "nuevo", { nombre: "Rosa" });
  assert.equal(storage.getItem("token"), "nuevo");
  assert.deepEqual(JSON.parse(storage.getItem("user")), { nombre: "Rosa" });
  assert.equal(storage.getItem("selectedChild"), null);
  assert.equal(storage.getItem("avatar_url"), null);
});

test("logout elimina todos los datos locales de identidad", () => {
  const storage = memoryStorage({ token: "x", user: "x", selectedChild: "x", avatar_url: "x", tema: "oscuro" });
  clearPortalSession(storage);
  assert.equal(storage.getItem("token"), null);
  assert.equal(storage.getItem("user"), null);
  assert.equal(storage.getItem("selectedChild"), null);
  assert.equal(storage.getItem("avatar_url"), null);
  assert.equal(storage.getItem("tema"), "oscuro");
});
