import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectPortalAcademicYear } from "../src/lib/portalAcademicYear.ts";
import {
  authorizedDeepLinkDay,
  parsePortalCalendarDeepLink,
} from "../src/lib/portalCalendarDeepLink.ts";

const year = (id, estado, inicio = "2026-03-01") => ({
  id_anio: id,
  estado,
  fecha_inicio: inicio,
});

test("selecciona el año del hijo cuando es operativo", () => {
  const selected = selectPortalAcademicYear(
    [year(1, "Abierto"), year(2, "Matrícula abierta")],
    2,
  );
  assert.equal(selected?.id_anio, 2);
});

test("prioriza estados operativos sin depender solo de Abierto", () => {
  const selected = selectPortalAcademicYear([
    year(1, "Planificación"),
    year(2, "En curso"),
    year(3, "Cerrado"),
  ]);
  assert.equal(selected?.id_anio, 2);
});

test("sin año operativo devuelve ausencia explícita", () => {
  assert.equal(
    selectPortalAcademicYear([year(1, "Cerrado"), year(2, "Archivado")]),
    null,
  );
});

test("deep link selecciona año, mes y día solicitados dentro del contrato autorizado", () => {
  const selected = selectPortalAcademicYear(
    [year(1, "En curso"), year(2, "Planificación", "2027-03-01")],
    1,
    2,
  );
  const deepLink = parsePortalCalendarDeepLink(
    new URLSearchParams("anio_id=2&mes=9&dia=17&evento_id=40"),
  );
  assert.equal(selected?.id_anio, 2);
  assert.deepEqual(deepLink, {
    anioId: 2,
    mes: 9,
    dia: 17,
    eventoId: 40,
  });
  assert.equal(
    authorizedDeepLinkDay(deepLink, [
      { id_evento: 40, fecha: "2027-09-17T00:00:00.000Z" },
    ]),
    17,
  );
});

test("evento_id del query no concede acceso si no está en la respuesta autorizada", () => {
  const deepLink = parsePortalCalendarDeepLink(
    new URLSearchParams("anio_id=2&mes=9&dia=17&evento_id=999"),
  );
  assert.equal(
    authorizedDeepLinkDay(deepLink, [
      { id_evento: 40, fecha: "2027-09-17T00:00:00.000Z" },
    ]),
    null,
  );
});

test("deep link de un evento cancelado deja el calendario en su vista normal", () => {
  const deepLink = parsePortalCalendarDeepLink(
    new URLSearchParams("anio_id=2&mes=9&dia=17&evento_id=40"),
  );
  assert.equal(
    authorizedDeepLinkDay(deepLink, [
      {
        id_evento: 40,
        fecha: "2027-09-17T00:00:00.000Z",
        estado: "cancelado",
      },
    ]),
    null,
  );
});

test("calendario sale de loading en error y ofrece reintento", async () => {
  const source = await readFile(
    new URL("../src/app/dashboard/calendario/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /setStatus\("error"\);\s*setLoading\(false\)/);
  assert.match(source, /No se pudo cargar el calendario\./);
  assert.match(source, />\s*Reintentar\s*</);
});

test("proxy conserva API_INTERNAL_URL y reescribe uploads", async () => {
  const source = await readFile(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /process\.env\.API_INTERNAL_URL/);
  assert.match(source, /source: '\/uploads\/:path\*'/);
  assert.match(source, /destination: `\$\{apiInternalUrl\}\/uploads\/:path\*`/);
});
