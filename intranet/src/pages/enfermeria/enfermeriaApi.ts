import axios from "axios";

export type EnfermeriaEstado = "abierta" | "cerrada";
export type EnfermeriaDestino =
  | "regresa_aula"
  | "retiro_apoderado"
  | "derivacion_externa"
  | "observacion";

export type AlumnoEnfermeria = {
  id_matricula: number;
  codigo_matricula: string | null;
  estado_matricula: string;
  atencion_abierta_id: number | null;
  id_colegio: number;
  colegio: string;
  estudiante: {
    id_estudiante: number;
    id_seccion: number;
    codigo: string;
    nombre: string;
    seccion: string;
  };
};

export type AutorizacionMedicacion = {
  id_autorizacion: number;
  medicamento: string;
  dosis_instruccion: string;
  via: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  observaciones: string | null;
  estado: "activa" | "vencida" | "revocada";
  apoderado: string;
  registrado_por: string;
  fecha_revocacion: string | null;
  motivo_revocacion: string | null;
  revocado_por: string | null;
};

export type AtencionEnfermeria = {
  id_atencion: number;
  id_tenant: number;
  id_colegio: number;
  id_matricula: number;
  fecha_hora_ingreso: string;
  motivo: string;
  observacion_reportada: string | null;
  acciones_realizadas: string | null;
  medicacion_administrada: boolean;
  fecha_medicacion: string | null;
  estado: EnfermeriaEstado;
  destino: EnfermeriaDestino | null;
  fecha_hora_cierre: string | null;
  colegio: { id_colegio: number; nombre: string };
  estudiante: {
    id_estudiante: number;
    id_seccion: number;
    codigo: string;
    nombre: string;
    seccion: string;
    codigo_matricula: string | null;
  };
  responsable: string;
  autorizacion_medicacion: AutorizacionMedicacion | null;
  medicacion_registrada_por: string | null;
  contactos: Array<{
    id_contacto: number;
    fecha_hora: string;
    medio: string;
    observacion: string | null;
    notificacion_enviada: boolean;
    apoderado: string;
    actor: string;
  }>;
  historial?: Array<{
    id_movimiento: number;
    accion: string;
    motivo: string | null;
    datos: unknown;
    creado_en: string;
    actor: string;
  }>;
};

export type FichaSalud = {
  id_ficha: number;
  grupo_sanguineo: string | null;
  alergias_declaradas: string | null;
  condiciones_declaradas: string | null;
  medicacion_habitual_declarada: string | null;
  seguro_centro_atencion: string | null;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  observaciones_relevantes: string | null;
  fecha_actualizacion: string;
  actualizado_por: string;
};

export type FichaAlumno = {
  estudiante: {
    id_estudiante: number;
    nombre: string;
    id_colegio: number;
    colegio: string;
  };
  ficha: FichaSalud | null;
  apoderados: Array<{
    id_apoderado: number;
    nombre: string;
    parentesco: string;
  }>;
  autorizaciones: AutorizacionMedicacion[];
  atenciones: AtencionEnfermeria[];
};

export type AtencionesResult = {
  data: AtencionEnfermeria[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  resumen: {
    atenciones_hoy: number;
    en_observacion: number;
    cerradas_hoy: number;
  };
};

export function enfermeriaApi(
  token: string | null,
  scopeParams: Record<string, string | number>,
) {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: scopeParams,
  };
  const fichaConfig = (schoolId: number) => ({
    ...config,
    params: { ...scopeParams, colegio_ficha_id: schoolId },
  });
  return {
    list: async (
      filters: Record<string, string | number>,
      signal?: AbortSignal,
    ) =>
      (
        await axios.get<AtencionesResult>("/api/enfermeria/atenciones", {
          ...config,
          params: { ...scopeParams, ...filters },
          signal,
        })
      ).data,
    detail: async (id: number) =>
      (
        await axios.get<AtencionEnfermeria>(
          `/api/enfermeria/atenciones/${id}`,
          config,
        )
      ).data,
    students: async (q: string, signal?: AbortSignal) =>
      (
        await axios.get<AlumnoEnfermeria[]>("/api/enfermeria/alumnos/buscar", {
          ...config,
          params: { ...scopeParams, q },
          signal,
        })
      ).data,
    create: async (data: {
      id_matricula: number;
      motivo: string;
      observacion_reportada?: string;
    }) =>
      (
        await axios.post<AtencionEnfermeria>(
          "/api/enfermeria/atenciones",
          data,
          config,
        )
      ).data,
    update: async (
      id: number,
      data: {
        observacion_reportada?: string;
        acciones_realizadas?: string;
        motivo_correccion?: string;
      },
    ) =>
      (
        await axios.patch<AtencionEnfermeria>(
          `/api/enfermeria/atenciones/${id}`,
          data,
          config,
        )
      ).data,
    contact: async (
      id: number,
      data: {
        id_apoderado: number;
        medio: "telefono" | "presencial" | "otro";
        observacion?: string;
        notificar: boolean;
      },
    ) =>
      (
        await axios.post<AtencionEnfermeria>(
          `/api/enfermeria/atenciones/${id}/contactos`,
          data,
          config,
        )
      ).data,
    medication: async (id: number, idAutorizacion: number) =>
      (
        await axios.post<AtencionEnfermeria>(
          `/api/enfermeria/atenciones/${id}/medicacion`,
          { id_autorizacion: idAutorizacion },
          config,
        )
      ).data,
    close: async (
      id: number,
      data: {
        destino: EnfermeriaDestino;
        acciones_realizadas?: string;
        notificar_apoderado: boolean;
        id_apoderado?: number;
        medio_contacto?: "telefono" | "presencial" | "otro";
        observacion_contacto?: string;
      },
    ) =>
      (
        await axios.post<AtencionEnfermeria>(
          `/api/enfermeria/atenciones/${id}/cerrar`,
          data,
          config,
        )
      ).data,
    record: async (studentId: number, schoolId: number) =>
      (
        await axios.get<FichaAlumno>(
          `/api/enfermeria/alumnos/${studentId}/ficha`,
          fichaConfig(schoolId),
        )
      ).data,
    saveRecord: async (
      studentId: number,
      schoolId: number,
      data: Record<string, string>,
    ) =>
      (
        await axios.put<FichaAlumno>(
          `/api/enfermeria/alumnos/${studentId}/ficha`,
          data,
          fichaConfig(schoolId),
        )
      ).data,
    authorize: async (
      studentId: number,
      schoolId: number,
      data: {
        id_apoderado: number;
        medicamento: string;
        dosis_instruccion: string;
        via?: string;
        fecha_inicio: string;
        fecha_fin: string;
        observaciones?: string;
      },
    ) =>
      (
        await axios.post<FichaAlumno>(
          `/api/enfermeria/alumnos/${studentId}/autorizaciones`,
          data,
          fichaConfig(schoolId),
        )
      ).data,
    revoke: async (id: number, motivo: string) =>
      (
        await axios.patch(
          `/api/enfermeria/autorizaciones/${id}/revocar`,
          { ...scopeParams, motivo },
          { headers: config.headers },
        )
      ).data,
  };
}

export function enfermeriaError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return "No se pudo completar la operación. Intenta nuevamente.";
}

export function enfermeriaAtencionAbiertaId(error: unknown) {
  if (
    !axios.isAxiosError<{
      code?: unknown;
      atencion_abierta_id?: unknown;
    }>(error) ||
    error.response?.status !== 409 ||
    error.response.data?.code !== "ENFERMERIA_ATENCION_ABIERTA"
  ) {
    return null;
  }

  const id = Number(error.response.data.atencion_abierta_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
