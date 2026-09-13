import axios from "axios";

export type CitaEstado =
  | "pendiente"
  | "confirmada"
  | "rechazada"
  | "cancelada"
  | "realizada";

export type CitaTipo = "individual" | "seccion";

export type CitaPermisos = {
  confirmar: boolean;
  rechazar: boolean;
  reprogramar: boolean;
  cancelar: boolean;
  realizar: boolean;
  acuerdos: boolean;
};

export type CitaItem = {
  id_cita: number;
  tipo: CitaTipo;
  id_tenant: number | null;
  id_colegio: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: CitaEstado;
  creado_en: string;
  actualizado_en: string;
  legacy: boolean;
  colegio: { id_colegio: number; nombre: string } | null;
  apoderado: {
    id_apoderado: number;
    nombre: string;
    telefono?: string | null;
  } | null;
  estudiante: {
    id_matricula: number;
    id_estudiante: number;
    codigo: string;
    nombre: string;
    seccion: string;
    anio: string;
  } | null;
  seccion: {
    id_seccion: number;
    nombre: string;
  } | null;
  audiencia: {
    familias_convocadas: number;
    estudiantes: number;
    familias: Array<{
      id_apoderado: number;
      nombre: string;
      parentesco: string;
    }>;
    lista_estudiantes: Array<{
      id_estudiante: number;
      nombre: string;
    }>;
  } | null;
  destinatario: {
    tipo: "staff" | "docente";
    id_destinatario: number;
    id_persona: number | null;
    nombre: string;
    contexto: "staff" | "docente" | "tutor";
    funcion: string;
  };
  historial: Array<{
    id_movimiento: number;
    accion: string;
    estado_anterior: string | null;
    estado_nuevo: string | null;
    fecha_anterior: string | null;
    fecha_nueva: string | null;
    hora_inicio_anterior: string | null;
    hora_fin_anterior: string | null;
    hora_inicio_nueva: string | null;
    hora_fin_nueva: string | null;
    comentario: string | null;
    creado_en: string;
    actor: { id_usuario: number; nombre: string } | null;
  }>;
  acuerdos: Array<{
    id_movimiento: number;
    texto: string | null;
    creado_en: string;
    actor: string;
  }>;
  permisos?: CitaPermisos;
};

export type CitasResult = {
  data: CitaItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  resumen: {
    pendientes: number;
    confirmadas: number;
    hoy: number;
    proximas: number;
  };
  filtros: {
    destinatarios: Array<{
      value: string;
      nombre: string;
      contexto: string;
      funcion: string;
    }>;
  };
};

export type CitaParticipant = {
  id_matricula: number;
  codigo_matricula: string | null;
  id_colegio: number;
  colegio: string;
  estudiante: {
    id_estudiante: number;
    nombre: string;
    codigo: string;
    seccion: string;
    anio: string;
  };
  apoderados: Array<{
    id_apoderado: number;
    nombre: string;
    parentesco: string;
  }>;
  apoderado_coincidente?: number;
};

export type CitaSection = {
  id_seccion: number;
  id_colegio: number;
  colegio: string;
  label: string;
  relaciones: string[];
};

export type CitaRecipient = {
  key: string;
  tipo: "staff" | "docente";
  id_destinatario: number;
  id_persona: number;
  nombre: string;
  contexto: "staff" | "docente" | "tutor";
  funcion: string;
  detalle: string;
};

type CitaCreateBase = {
  id_colegio: number;
  tipo_destinatario: "staff" | "docente";
  id_destinatario: number;
  contexto_destinatario: "staff" | "docente" | "tutor";
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
};

export type CitaCreatePayload =
  | (CitaCreateBase & {
      tipo: "individual";
      id_matricula: number;
      id_apoderado: number;
    })
  | (CitaCreateBase & {
      tipo: "seccion";
      id_seccion: number;
    });

export type CitaListFilters = {
  q?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
  destinatario?: string;
  page?: number;
};

export function citasApi(
  token: string | null,
  scopeParams: Record<string, string | number>,
) {
  const auth = { Authorization: `Bearer ${token}` };
  const config = { headers: auth, params: scopeParams };
  return {
    list: async (filters: CitaListFilters, signal?: AbortSignal) =>
      (
        await axios.get<CitasResult>("/api/citas", {
          ...config,
          params: { ...scopeParams, ...filters },
          signal,
        })
      ).data,
    detail: async (id: number) =>
      (await axios.get<CitaItem>(`/api/citas/${id}`, config)).data,
    participants: async (q: string, signal?: AbortSignal) =>
      (
        await axios.get<CitaParticipant[]>("/api/citas/participantes", {
          ...config,
          params: { ...scopeParams, q: q.trim() },
          signal,
        })
      ).data,
    recipients: async (matriculaId: number) =>
      (
        await axios.get<CitaRecipient[]>("/api/citas/destinatarios", {
          ...config,
          params: { ...scopeParams, matricula_id: matriculaId },
        })
      ).data,
    sections: async () =>
      (await axios.get<CitaSection[]>("/api/citas/secciones", config)).data,
    sectionResponsibles: async (sectionId: number) =>
      (
        await axios.get<CitaRecipient[]>("/api/citas/responsables", {
          ...config,
          params: { ...scopeParams, seccion_id: sectionId },
        })
      ).data,
    create: async (body: CitaCreatePayload) =>
      (await axios.post<CitaItem>("/api/citas", body, config)).data,
    changeState: async (
      id: number,
      estado: Exclude<CitaEstado, "pendiente">,
      comentario?: string,
    ) =>
      (
        await axios.patch<CitaItem>(
          `/api/citas/${id}/estado`,
          { estado, ...(comentario ? { comentario } : {}) },
          config,
        )
      ).data,
    reprogram: async (
      id: number,
      body: {
        fecha: string;
        hora_inicio: string;
        hora_fin: string;
        comentario: string;
      },
    ) =>
      (
        await axios.patch<CitaItem>(
          `/api/citas/${id}/reprogramar`,
          body,
          config,
        )
      ).data,
    addAgreement: async (id: number, acuerdos: string) =>
      (
        await axios.post<CitaItem>(
          `/api/citas/${id}/acuerdos`,
          { acuerdos },
          config,
        )
      ).data,
  };
}

export function citaError(error: unknown) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join(" · ") : message;
  }
  return "No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.";
}
