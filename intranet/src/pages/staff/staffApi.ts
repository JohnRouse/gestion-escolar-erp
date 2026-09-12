import axios from 'axios';
export type StaffPersona = {
  id_persona?: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  direccion?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  correo?: string | null;
};
export type StaffAccess = {
  id_usuario: number;
  username: string;
  estado: boolean;
  rol: { nombre_rol: string };
  tenants: { id_tenant: number; estado: string }[];
  colegios: { id_colegio: number; rol_colegio: string; estado: string }[];
};
export type StaffItem = {
  id_staff: number;
  id_persona: number;
  id_colegio: number | null;
  cargo: string;
  area: string;
  permite_citas: boolean;
  persona: StaffPersona;
  colegio: { id_colegio: number; nombre: string } | null;
  seccion: {
    id_seccion: number;
    id_colegio: number | null;
    colegio: { nombre: string } | null;
  } | null;
  accesos?: StaffAccess[];
};
export type StaffPayload = {
  id_colegio: number;
  cargo: string;
  area: string;
  permite_citas: boolean;
  motivo?: string;
  persona?: StaffPersona;
  acceso?: { username: string; rol: string; password?: string };
};
export type StaffAccessAction =
  | {
      accion: 'editar_usuario';
      username: string;
      motivo: string;
    }
  | { accion: 'cambiar_rol'; rol: string; motivo: string }
  | { accion: 'restablecer_password'; password: string; motivo: string }
  | { accion: 'cambiar_estado'; estado: boolean; motivo: string };
export function staffApi(token: string | null, params: Record<string, string | number>) {
  const config = { params, headers: { Authorization: `Bearer ${token}` } };
  return {
    list: async (q: string, citas: string, page: number, signal: AbortSignal) =>
      (
        await axios.get<{
          data: StaffItem[];
          meta: { total: number; totalPages: number };
        }>('/api/staff', {
          ...config,
          params: { ...params, q, ...(citas ? { citas } : {}), page },
          signal,
        })
      ).data,
    detail: async (id: number) => (await axios.get<StaffItem>(`/api/staff/${id}`, config)).data,
    lookup: async (dni: string) =>
      (await axios.get<StaffPersona | null>(`/api/staff/personas/${dni}`, config)).data || null,
    save: async (body: StaffPayload, id?: number) =>
      id
        ? (await axios.put<StaffItem>(`/api/staff/${id}`, body, config)).data
        : (await axios.post<StaffItem>('/api/staff', body, config)).data,
    manageAccess: async (staffId: number, userId: number, body: StaffAccessAction) =>
      (await axios.patch<StaffItem>(`/api/staff/${staffId}/accesos/${userId}`, body, config)).data,
  };
}
export function staffError(error: unknown) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join(' · ') : message;
  }
  return 'No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.';
}
