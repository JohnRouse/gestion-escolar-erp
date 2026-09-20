export interface PortalAcademicYear {
  id_anio: number;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
}

function normalizeStatus(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function operationalPriority(status: string) {
  const normalized = normalizeStatus(status);
  if (["en curso", "abierto", "activo"].includes(normalized)) return 1;
  if (["matricula abierta", "matriculas abiertas"].includes(normalized)) return 2;
  if (["planificacion", "planificado"].includes(normalized)) return 3;
  return null;
}

export function selectPortalAcademicYear(
  years: PortalAcademicYear[],
  selectedYearId?: number | null,
  requestedYearId?: number | null,
) {
  const operational = years.filter(
    (year) => operationalPriority(year.estado) !== null,
  );
  const requested = operational.find(
    (year) => year.id_anio === requestedYearId,
  );
  if (requested) return requested;

  const selected = operational.find(
    (year) => year.id_anio === selectedYearId,
  );
  if (selected) return selected;

  return [...operational].sort((left, right) => {
    const priority =
      operationalPriority(left.estado)! - operationalPriority(right.estado)!;
    if (priority !== 0) return priority;
    return (
      new Date(right.fecha_inicio).getTime() -
      new Date(left.fecha_inicio).getTime()
    );
  })[0] ?? null;
}
