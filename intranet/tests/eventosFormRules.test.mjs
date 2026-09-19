import assert from "node:assert/strict";
import test from "node:test";
import {
  changeEventYear,
  eventDateBelongsToYear,
} from "../src/pages/eventos/eventosFormRules.ts";

const years = [
  {
    id_anio: 2026,
    nombre_anio: "Año Escolar 2026",
    fecha_inicio: "2026-03-01T00:00:00.000Z",
    fecha_fin: "2026-12-20T00:00:00.000Z",
    estado: "Abierto",
  },
  {
    id_anio: 2027,
    nombre_anio: "Año Escolar 2027",
    fecha_inicio: "2027-03-01T00:00:00.000Z",
    fecha_fin: "2027-12-20T00:00:00.000Z",
    estado: "Planificación",
  },
];

test("cambiar de año limpia destinos y una fecha fuera del nuevo rango", () => {
  const result = changeEventYear(
    {
      id_anio: "2026",
      fecha: "2026-09-17",
      audiencia_tipo: "secciones",
      audiencia_ids: [20],
    },
    "2027",
    years,
  );

  assert.equal(result.id_anio, "2027");
  assert.equal(result.fecha, "");
  assert.equal(result.audiencia_tipo, "colegio");
  assert.deepEqual(result.audiencia_ids, []);
});

test("la fecha se conserva cuando pertenece al año seleccionado", () => {
  assert.equal(eventDateBelongsToYear("2027-09-17", years[1]), true);
  assert.equal(eventDateBelongsToYear("2026-09-17", years[1]), false);
});
