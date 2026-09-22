import assert from "node:assert/strict";
import test from "node:test";
import { legacyPortalComunicadosTarget } from "../src/lib/comunicadosRoutes.ts";

test("la ruta portal legacy redirige a Comunicados", () => {
  assert.equal(
    legacyPortalComunicadosTarget({}),
    "/dashboard/comunicados",
  );
});

test("la ruta portal legacy conserva query params simples y repetidos", () => {
  assert.equal(
    legacyPortalComunicadosTarget({
      id_circular: "42",
      origen: ["historico", "campana"],
    }),
    "/dashboard/comunicados?id_circular=42&origen=historico&origen=campana",
  );
});
