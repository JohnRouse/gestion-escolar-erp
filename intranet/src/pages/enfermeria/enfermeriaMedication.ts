import type { AutorizacionMedicacion } from "./enfermeriaApi";

export type MedicationState = "administered" | "available" | "unavailable";

export function currentMedicationAuthorizations(
  authorizations: AutorizacionMedicacion[],
  today: string,
) {
  return authorizations.filter(
    (item) =>
      item.estado === "activa" &&
      item.fecha_inicio.slice(0, 10) <= today &&
      item.fecha_fin.slice(0, 10) >= today,
  );
}

export function resolveMedicationState(
  administered: boolean,
  currentAuthorizationsCount: number,
): MedicationState {
  if (administered) return "administered";
  return currentAuthorizationsCount > 0 ? "available" : "unavailable";
}
