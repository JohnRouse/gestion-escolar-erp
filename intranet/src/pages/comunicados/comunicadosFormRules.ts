import type { ComunicadoAudienciaTipo } from "./comunicadosApi";

export type ComunicadoYearChangeState = {
  id_anio: string;
  audiencia_tipo: ComunicadoAudienciaTipo;
  audiencia_ids: number[];
};

export function changeComunicadoYear<T extends ComunicadoYearChangeState>(
  state: T,
  id_anio: string,
): T {
  return {
    ...state,
    id_anio,
    audiencia_tipo: "colegio",
    audiencia_ids: [],
  };
}

export function buildComunicadoAudience(
  tipo: ComunicadoAudienciaTipo,
  ids: number[],
) {
  return {
    tipo,
    ids: tipo === "colegio" ? [] : [...ids],
  };
}
