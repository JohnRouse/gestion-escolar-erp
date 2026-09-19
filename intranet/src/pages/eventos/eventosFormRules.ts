import type { AudienciaTipo, EventoOptions } from "./eventosApi";

type YearOption = EventoOptions["anios"][number];

export type YearDependentForm = {
  id_anio: string;
  fecha: string;
  audiencia_tipo: AudienciaTipo;
  audiencia_ids: number[];
};

function datePart(value: string) {
  return value.slice(0, 10);
}

export function eventDateBelongsToYear(date: string, year?: YearOption) {
  if (!date || !year) return true;
  return date >= datePart(year.fecha_inicio) && date <= datePart(year.fecha_fin);
}

export function changeEventYear<T extends YearDependentForm>(
  current: T,
  yearId: string,
  years: YearOption[],
): T {
  const year = years.find((item) => item.id_anio === Number(yearId));
  return {
    ...current,
    id_anio: yearId,
    fecha:
      current.fecha && !eventDateBelongsToYear(current.fecha, year)
        ? ""
        : current.fecha,
    audiencia_tipo: "colegio",
    audiencia_ids: [],
  };
}
