import axios from "axios";

export type NotificacionOrigen =
  | "citas"
  | "pagos"
  | "matricula"
  | "academico"
  | "enfermeria"
  | "eventos"
  | "sistema";

export type NotificacionItem = {
  id_notif: number;
  id_tenant: number | null;
  id_colegio: number | null;
  tipo: string;
  origen: NotificacionOrigen;
  referencia_tipo: string | null;
  referencia_id: string | null;
  canal: "intranet" | null;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  url: string | null;
  colegio: { id_colegio: number; nombre: string } | null;
};

export type NotificacionesResult = {
  data: NotificacionItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  resumen: { no_leidas: number; hoy: number; total_reciente: number };
  politica_legacy:
    | "incluidas_por_tenant_unico"
    | "excluidas_por_contexto_ambiguo";
};

export type NotificacionesFilters = {
  leida?: boolean;
  origen?: NotificacionOrigen;
  q?: string;
  page?: number;
  limit?: number;
};

export function notificacionesApi(
  token: string | null,
  scopeParams: Record<string, string | number>,
) {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: scopeParams,
  };
  return {
    list: async (filters: NotificacionesFilters, signal?: AbortSignal) =>
      (
        await axios.get<NotificacionesResult>("/api/notificaciones", {
          ...config,
          params: { ...scopeParams, ...filters },
          signal,
        })
      ).data,
    count: async (signal?: AbortSignal) =>
      (
        await axios.get<{ count: number }>("/api/notificaciones/count", {
          ...config,
          signal,
        })
      ).data.count,
    markRead: async (id: number, leida: boolean) =>
      (
        await axios.patch<NotificacionItem>(
          `/api/notificaciones/${id}/leida`,
          { leida },
          config,
        )
      ).data,
    markAllRead: async () =>
      (
        await axios.patch<{ actualizadas: number }>(
          "/api/notificaciones/marcar-todas-leidas",
          {},
          config,
        )
      ).data,
  };
}

export function notificationError(error: unknown) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join(" · ") : message;
  }
  return "No se pudieron cargar las notificaciones. Revisa la conexión e inténtalo de nuevo.";
}

const INTRANET_ROUTE_PREFIXES = [
  "/asistencia",
  "/calendario",
  "/citas",
  "/circulares",
  "/comunidad",
  "/configuracion",
  "/dashboard",
  "/docentes",
  "/enfermeria",
  "/matricula",
  "/notas",
  "/notificaciones",
  "/perfil",
  "/reportes",
  "/staff",
  "/tesoreria",
  "/tutoria",
];

export function safeNotificationTarget(url: string | null) {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const valid = INTRANET_ROUTE_PREFIXES.some(
      (prefix) =>
        parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    return valid ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}
