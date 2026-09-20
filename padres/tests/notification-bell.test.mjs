import assert from "node:assert/strict";
import test from "node:test";
import {
  activatePortalNotification,
  portalNotificationTarget,
} from "../src/lib/portalNotificationNavigation.ts";

const origin = "http://portal.local";

test("notif.url interna válida navega a la URL exacta", () => {
  assert.equal(
    portalNotificationTarget(
      {
        origen: "eventos",
        url: "/dashboard/calendario?anio_id=7&mes=9&dia=17&evento_id=31",
      },
      origin,
    ),
    "/dashboard/calendario?anio_id=7&mes=9&dia=17&evento_id=31",
  );
});

test("evento sin URL usa el fallback del calendario", () => {
  assert.equal(
    portalNotificationTarget({ origen: "eventos", url: null }, origin),
    "/dashboard/calendario",
  );
});

test("URL externa o maliciosa se rechaza y usa el fallback por origen", () => {
  for (const url of [
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "javascript:alert(1)",
    "/otro-sitio",
    "/dashboard\\evil",
  ]) {
    assert.equal(
      portalNotificationTarget({ origen: "pagos", url }, origin),
      "/dashboard/pagos",
    );
  }
});

test("un fallo del PATCH no bloquea cierre ni navegación", async () => {
  const actions = [];
  const readError = new Error("red no disponible");

  activatePortalNotification({
    notification: {
      id_notif: 12,
      leida: false,
      origen: "citas",
      url: null,
    },
    markRead: () => Promise.reject(readError),
    onOptimisticRead: () => actions.push("read"),
    onReadError: (error) => actions.push(error),
    close: () => actions.push("close"),
    navigate: (target) => actions.push(target),
    origin,
  });

  assert.deepEqual(actions, ["read", "close", "/dashboard/citas"]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(actions[3], readError);
});

test("notificación histórica genérica sigue abriendo el calendario", () => {
  assert.equal(
    portalNotificationTarget(
      { origen: "eventos", url: "/dashboard/calendario" },
      origin,
    ),
    "/dashboard/calendario",
  );
});
