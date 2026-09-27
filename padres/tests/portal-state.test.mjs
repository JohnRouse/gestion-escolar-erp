import assert from "node:assert/strict";
import test from "node:test";
import { reconcileSelectedChild, updateChildAvatarState, withChildColors } from "../src/lib/portalChildren.ts";
import {
  attendancePercentage,
  averageAvailableScores,
  formatPortalScore,
  paymentSummary,
} from "../src/lib/portalDashboard.ts";

const child = (id, name) => ({ id_estudiante: id, nombre: name, grado: "1ro" });

test("cambio de hijo conserva el autorizado y refresca sus datos", () => {
  const stored = { ...child(2, "Nombre antiguo"), anio: "2025" };
  const fresh = [child(1, "Ana"), { ...child(2, "Luis"), anio: "2026" }];
  assert.deepEqual(reconcileSelectedChild(fresh, stored), fresh[1]);
});

test("un hijo ajeno guardado localmente nunca se convierte en selección", () => {
  const authorized = [child(1, "Ana")];
  assert.deepEqual(reconcileSelectedChild(authorized, child(999, "Ajeno")), authorized[0]);
  assert.equal(reconcileSelectedChild([], child(999, "Ajeno")), null);
});

test("los hijos reciben fallback visual local estable", () => {
  const result = withChildColors([child(1, "Ana"), { ...child(2, "Luis"), color: "#123456" }]);
  assert.ok(result[0].color);
  assert.equal(result[1].color, "#123456");
});

test("la foto actualiza hijos y selectedChild sin recargar", () => {
  const children = [child(1, "Ana"), child(2, "Luis")];
  const avatarUrl = "/uploads/alumnos/foto-estudiante-item-nueva.jpg";
  const result = updateChildAvatarState(children, children[1], 2, avatarUrl);

  assert.equal(result.children[1].avatar_url, avatarUrl);
  assert.equal(result.selectedChild.avatar_url, avatarUrl);
  assert.equal(result.children[0].avatar_url, undefined);

  const removed = updateChildAvatarState(
    result.children,
    result.selectedChild,
    2,
    null,
  );
  assert.equal(removed.children[1].avatar_url, null);
  assert.equal(removed.selectedChild.avatar_url, null);
});

test("asistencia sin registros no representa 100% ni 0%", () => {
  assert.equal(attendancePercentage([]), null);
  assert.equal(attendancePercentage([{ estado: "Presente" }, { estado: "Ausente" }]), 50);
});

test("notas ausentes no se convierten en cero", () => {
  assert.equal(averageAvailableScores([null, undefined]), null);
  assert.equal(averageAvailableScores([14, null, 15]), 14.5);
  assert.equal(formatPortalScore(14), "14");
  assert.equal(formatPortalScore(14.5), "14.5");
});

test("pagos diferencia fallo, deuda y ausencia de deuda", () => {
  assert.deepEqual(paymentSummary("rejected"), { total: null, label: "No disponible", tone: "neutral" });
  assert.deepEqual(paymentSummary("fulfilled", 0), { total: 0, label: "Sin deuda pendiente", tone: "success" });
  assert.deepEqual(paymentSummary("fulfilled", "120.50"), { total: 120.5, label: "Por pagar", tone: "warning" });
});
