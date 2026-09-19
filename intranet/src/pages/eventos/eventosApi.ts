import axios from "axios";

export type EventoEstado = "programado" | "cancelado" | "realizado";
export type AudienciaTipo = "colegio" | "niveles" | "grados" | "secciones";

export type Evento = {
  id_evento: number;
  id_tenant: number;
  id_colegio: number;
  id_anio: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  tipo: string;
  estado: EventoEstado;
  ubicacion: string | null;
  motivo_cancelacion: string | null;
  creado_en: string;
  actualizado_en: string;
  colegio: { id_colegio: number; nombre: string } | null;
  anio: { id_anio: number; nombre_anio: string };
  audiencia: { tipo: AudienciaTipo; ids: number[]; etiquetas: string[] };
  creado_por: string | null;
  actualizado_por: string | null;
  historial: Array<{
    accion: string;
    fecha: string;
    motivo: string | null;
    actor: string | null;
    datos: unknown;
  }>;
};

export type EventoFormPayload = {
  id_tenant: number;
  id_colegio: number;
  id_anio: number;
  titulo: string;
  tipo: string;
  descripcion?: string;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  ubicacion?: string;
  audiencia: { tipo: AudienciaTipo; ids: number[] };
};

export type EventoOptions = {
  anios: Array<{
    id_anio: number;
    nombre_anio: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
  }>;
  anio_predeterminado_id: number | null;
  niveles: Array<{ id_nivel: number; nombre_nivel: string }>;
  grados: Array<{
    id_grado: number;
    nombre_grado: string;
    id_nivel: number;
  }>;
  secciones: Array<{
    id_seccion: number;
    letra: string;
    id_grado: number;
    nombre: string;
  }>;
};

function auth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function listEventos(
  token: string,
  params: Record<string, string | number>,
) {
  const response = await axios.get<{
    data: Evento[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>("/api/eventos", { ...auth(token), params });
  return response.data;
}

export async function getEvento(token: string, id: number) {
  const response = await axios.get<Evento>(`/api/eventos/${id}`, auth(token));
  return response.data;
}

export async function getEventoOptions(
  token: string,
  params: { tenant_id: number; colegio_id: number; anio_id?: number },
) {
  const response = await axios.get<EventoOptions>("/api/eventos/opciones", {
    ...auth(token),
    params,
  });
  return response.data;
}

export async function createEvento(token: string, payload: EventoFormPayload) {
  const response = await axios.post<Evento>(
    "/api/eventos",
    payload,
    auth(token),
  );
  return response.data;
}

export async function updateEvento(
  token: string,
  id: number,
  payload: Omit<
    EventoFormPayload,
    "id_tenant" | "id_colegio" | "id_anio" | "tipo"
  >,
) {
  const response = await axios.patch<Evento>(
    `/api/eventos/${id}`,
    payload,
    auth(token),
  );
  return response.data;
}

export async function cancelEvento(token: string, id: number, motivo: string) {
  const response = await axios.post<Evento>(
    `/api/eventos/${id}/cancelar`,
    { motivo },
    auth(token),
  );
  return response.data;
}

export async function finishEvento(token: string, id: number) {
  const response = await axios.post<Evento>(
    `/api/eventos/${id}/realizar`,
    {},
    auth(token),
  );
  return response.data;
}
