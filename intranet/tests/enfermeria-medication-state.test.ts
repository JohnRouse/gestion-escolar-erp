import assert from "node:assert/strict";
import test from "node:test";
import type { AutorizacionMedicacion } from "../src/pages/enfermeria/enfermeriaApi.ts";
import {
  currentMedicationAuthorizations,
  resolveMedicationState,
} from "../src/pages/enfermeria/enfermeriaMedication.ts";

const today = "2026-09-15";
const authorization: AutorizacionMedicacion = {
  id_autorizacion: 10,
  medicamento: "Medicamento declarado",
  dosis_instruccion: "Instrucción declarada",
  via: null,
  fecha_inicio: "2026-09-01T12:00:00.000Z",
  fecha_fin: "2026-09-30T12:00:00.000Z",
  observaciones: null,
  estado: "activa",
  apoderado: "Familiar",
  registrado_por: "Responsable",
  fecha_revocacion: null,
  motivo_revocacion: null,
  revocado_por: null,
};

test("sin autorización vigente queda no disponible", () => {
  const current = currentMedicationAuthorizations([], today);
  assert.equal(resolveMedicationState(false, current.length), "unavailable");
});

test("una autorización activa y vigente queda disponible", () => {
  const current = currentMedicationAuthorizations([authorization], today);
  assert.deepEqual(current, [authorization]);
  assert.equal(resolveMedicationState(false, current.length), "available");
});

test("la administración registrada prevalece como estado final", () => {
  assert.equal(resolveMedicationState(true, 0), "administered");
});

test("una autorización revocada no queda disponible", () => {
  const current = currentMedicationAuthorizations(
    [{ ...authorization, estado: "revocada" }],
    today,
  );
  assert.equal(resolveMedicationState(false, current.length), "unavailable");
});

test("una autorización vencida no queda disponible", () => {
  const current = currentMedicationAuthorizations(
    [{ ...authorization, fecha_fin: "2026-09-14T12:00:00.000Z" }],
    today,
  );
  assert.equal(resolveMedicationState(false, current.length), "unavailable");
});

test("una autorización futura no queda disponible", () => {
  const current = currentMedicationAuthorizations(
    [{ ...authorization, fecha_inicio: "2026-09-16T12:00:00.000Z" }],
    today,
  );
  assert.equal(resolveMedicationState(false, current.length), "unavailable");
});
