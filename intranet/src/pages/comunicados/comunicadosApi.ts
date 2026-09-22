import axios from "axios";

export type ComunicadoAudienciaTipo = "colegio" | "niveles" | "secciones";

export type Comunicado = {
  id_circular: number;
  id_tenant: number | null;
  id_colegio: number | null;
  id_anio: number | null;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  categoria: string;
  urgente: boolean;
  requiere_autorizacion: boolean;
  institucion: string;
  anio_lectivo: string | null;
  colegio: { id_colegio: number; id_tenant: number; nombre: string } | null;
  remitente: string;
  audiencia: {
    tipo: ComunicadoAudienciaTipo;
    ids: number[];
    etiquetas: string[];
  };
  adjuntos: Array<{
    id_adjunto: number;
    nombre_archivo: string;
    url: string;
  }>;
  notificaciones?: { creadas: number; error?: string };
};

export type ComunicadoOptions = {
  anios: Array<{
    id_anio: number;
    nombre_anio: string;
    estado: string;
    tiene_matriculas_operativas: boolean;
  }>;
  anio_seleccionado: { id_anio: number; nombre_anio: string } | null;
  niveles: Array<{ id_nivel: number; nombre_nivel: string }>;
  secciones: Array<{
    id_seccion: number;
    id_nivel: number;
    nombre: string;
  }>;
};

export type ComunicadoFormPayload = {
  id_tenant: number;
  id_colegio: number;
  id_anio: number;
  titulo: string;
  contenido: string;
  categoria: string;
  urgente: boolean;
  requiere_autorizacion: boolean;
  audiencia: { tipo: ComunicadoAudienciaTipo; ids: number[] };
};

function auth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function listComunicados(
  token: string,
  params: Record<string, string | number | boolean>,
) {
  const response = await axios.get<{
    data: Comunicado[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>("/api/circulares", { ...auth(token), params });
  return response.data;
}

export async function getComunicadoOptions(
  token: string,
  params: { tenant_id: number; colegio_id: number; id_anio?: number },
) {
  const response = await axios.get<ComunicadoOptions>(
    "/api/circulares/opciones",
    { ...auth(token), params },
  );
  return response.data;
}

export async function createComunicado(
  token: string,
  payload: ComunicadoFormPayload,
) {
  const response = await axios.post<Comunicado>(
    "/api/circulares",
    payload,
    auth(token),
  );
  return response.data;
}

export async function uploadComunicadoAttachments(
  token: string,
  circularId: number,
  files: File[],
) {
  const body = new FormData();
  files.forEach((file) => body.append("adjuntos", file));
  const response = await axios.post<Comunicado>(
    `/api/circulares/${circularId}/adjuntos`,
    body,
    auth(token),
  );
  return response.data;
}
