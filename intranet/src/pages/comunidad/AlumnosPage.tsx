import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Search,
  UserRound,
  Users,
  X,
  GraduationCap,
  Phone,
  SlidersHorizontal,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type CodigoColegio = { id_colegio: number; codigo: string };
type Meta = { total: number; page: number; limit: number; totalPages: number };

type AlumnoItem = {
  id_persona: number;
  codigo_estudiante: string;
  codigos_colegio?: CodigoColegio[];
  persona: {
    dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
    fecha_nacimiento: string; telefono?: string | null; correo?: string | null;
    direccion?: string | null; pais?: string | null; departamento?: string | null;
    provincia?: string | null; distrito?: string | null;
  };
  apoderados?: {
    parentesco: string;
    apoderado: { id_persona: number; persona: { dni: string; nombres: string; apellido_paterno: string; apellido_materno: string; telefono?: string | null; correo?: string | null } };
  }[];
  matriculas?: any[];
};

type AlumnoForm = {
  dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
  fecha_nacimiento: string; telefono: string; correo: string; direccion: string;
  pais: string; departamento: string; provincia: string; distrito: string;
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const fullName = (p: AlumnoItem['persona']) =>
  `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();

const fecha = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-PE') : '—';

const getCodigo = (alumno: AlumnoItem) =>
  alumno.codigos_colegio?.[0]?.codigo || alumno.codigo_estudiante || 'Sin código';

const getInitials = (nombres: string) => {
  const parts = nombres.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : nombres.slice(0, 2).toUpperCase();
};

// Paleta de colores para avatares determinística según nombre
const avatarColors = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

const getAvatarColor = (name: string) => {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length];
};

// Badge de estado de matrícula
const estadoBadge: Record<string, string> = {
  Activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Anulado: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  'Pre-matriculado': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Inactivo: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const getEstadoBadge = (estado?: string) =>
  estadoBadge[estado || ''] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';

const toForm = (detalle: AlumnoItem): AlumnoForm => ({
  dni: detalle.persona.dni || '',
  nombres: detalle.persona.nombres || '',
  apellido_paterno: detalle.persona.apellido_paterno || '',
  apellido_materno: detalle.persona.apellido_materno || '',
  fecha_nacimiento: detalle.persona.fecha_nacimiento
    ? detalle.persona.fecha_nacimiento.slice(0, 10)
    : '',
  telefono: detalle.persona.telefono || '',
  correo: detalle.persona.correo || '',
  direccion: detalle.persona.direccion || '',
  pais: detalle.persona.pais || 'Perú',
  departamento: detalle.persona.departamento || '',
  provincia: detalle.persona.provincia || '',
  distrito: detalle.persona.distrito || '',
});

export default function AlumnosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [data, setData] = useState<AlumnoItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState<AlumnoItem | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<AlumnoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    if (q.trim()) search.set('q', q.trim());
    if (estado !== 'Todos') search.set('estado', estado);
    search.set('page', String(page));
    search.set('limit', '10');
    const query = search.toString();
    return query ? `?${query}` : '';
  }, [estado, page, q, queryString]);

  useEffect(() => {
    fetchAlumnos();
  }, [params, token]);

  const fetchAlumnos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/alumnos/listado${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = async (id: number) => {
    if (!token) return;
    setDetalleOpen(true);
    setDetalleLoading(true);
    setMensaje(null);
    try {
      const res = await axios.get(
        `/api/academicos/alumnos/${id}/detalle${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetalle(res.data);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se pudo cargar el alumno.');
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const abrirEdicion = () => {
    if (!detalle) return;
    setForm(toForm(detalle));
    setEditOpen(true);
    setMensaje(null);
  };

  const guardarEdicion = async () => {
    if (!token || !detalle || !form) return;
    setSaving(true);
    setMensaje(null);
    try {
      await axios.put(`/api/academicos/alumnos/${detalle.id_persona}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditOpen(false);
      await abrirDetalle(detalle.id_persona);
      await fetchAlumnos();
      setMensaje('Datos del alumno actualizados correctamente.');
      showToast({
        type: 'success',
        title: 'Alumno actualizado',
        message: 'Los datos del alumno se actualizaron correctamente.',
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'No se pudo actualizar el alumno.';
      setMensaje(errorMessage);
      showToast({
        type: 'error',
        title: 'No se pudo actualizar',
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = q.trim() !== '' || estado !== 'Todos';

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Alumnos"
        description="Consulta, revisa y edita la información general de los alumnos vinculados al colegio activo."
        icon={UserRound}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
      />

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por código, DNI, alumno, apoderado, distrito…"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-0.5 text-slate-400 transition hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro de estado */}
        <div className="relative">
          <SlidersHorizontal
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            value={estado}
            onChange={(e) => { setPage(1); setEstado(e.target.value); }}
            className="h-11 appearance-none rounded-2xl border border-slate-200 bg-white py-0 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pre-matriculado">Pre-matriculado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Sin matrícula">Sin matrícula</option>
          </select>
        </div>

        {/* Limpiar filtros — solo visible si hay filtros activos */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setQ(''); setEstado('Todos'); setPage(1); }}
            className="h-11 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla de alumnos ── */}
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm shadow-slate-100/80">
        {/* Encabezado de columnas */}
        <div className="hidden border-b border-slate-100 bg-slate-50/60 px-5 py-3 xl:grid xl:grid-cols-[2fr_1.4fr_1.4fr_auto] xl:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Alumno</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Matrícula</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Apoderado</span>
          <span className="w-20" />
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Users size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Sin resultados</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Ajusta los filtros para encontrar un registro.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {data.map((alumno) => {
              const ultimaMatricula = alumno.matriculas?.[0];
              const apoderado = alumno.apoderados?.[0];
              const nombre = fullName(alumno.persona);
              const initials = getInitials(alumno.persona.nombres);
              const avatarColor = getAvatarColor(nombre);
              const estadoMatricula = ultimaMatricula?.estado_matricula;

              return (
                <div
                  key={alumno.id_persona}
                  className="group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 xl:grid-cols-[2fr_1.4fr_1.4fr_auto]"
                >
                  {/* Columna alumno */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${avatarColor}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {nombre}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        <span className="font-semibold text-slate-500">{getCodigo(alumno)}</span>
                        {' · '}DNI {alumno.persona.dni}
                        {alumno.persona.distrito
                          ? ` · ${alumno.persona.distrito}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {/* Columna matrícula */}
                  <div className="min-w-0">
                    {ultimaMatricula ? (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {ultimaMatricula.seccion?.grado?.nombre_grado || 'Grado'}{' '}
                            &quot;{ultimaMatricula.seccion?.letra || '-'}&quot;
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEstadoBadge(estadoMatricula)}`}
                          >
                            {estadoMatricula || '—'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {ultimaMatricula?.colegio?.nombre || '—'}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sin matrícula visible</span>
                    )}
                  </div>

                  {/* Columna apoderado */}
                  <div className="min-w-0">
                    {apoderado ? (
                      <>
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {apoderado.parentesco}:{' '}
                          {apoderado.apoderado.persona.nombres}{' '}
                          {apoderado.apoderado.persona.apellido_paterno}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                          {apoderado.apoderado.persona.telefono ? (
                            <>
                              <Phone size={11} className="shrink-0" />
                              {apoderado.apoderado.persona.telefono}
                            </>
                          ) : (
                            'Sin teléfono'
                          )}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sin apoderado</span>
                    )}
                  </div>

                  {/* Acción */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(alumno.id_persona)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 group-hover:border-slate-300"
                    >
                      <Eye size={13} />
                      Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
          <button
            type="button"
            onClick={() => setPage((c) => Math.max(c - 1, 1))}
            disabled={page <= 1}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>

          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500">
              Página{' '}
              <span className="font-black text-slate-800">{page}</span>
              {' '}de{' '}
              <span className="font-black text-slate-800">{meta.totalPages || 1}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {meta.total} registros en total
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPage((c) => Math.min(c + 1, meta.totalPages || 1))}
            disabled={page >= (meta.totalPages || 1)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Modal de detalle ── */}
      {detalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200/80">
            {/* Header del modal */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-center gap-4">
                {detalle && (
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${getAvatarColor(fullName(detalle.persona))}`}
                  >
                    {getInitials(detalle.persona.nombres)}
                  </div>
                )}
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-600 ring-1 ring-accent-100">
                    <GraduationCap size={11} />
                    Ficha del alumno
                  </div>
                  <h3 className="mt-1.5 text-lg font-black text-slate-950">
                    {detalle
                      ? `${getCodigo(detalle)} · ${fullName(detalle.persona)}`
                      : 'Cargando…'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Datos personales, apoderados y matrículas.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {detalle && (
                  <button
                    type="button"
                    onClick={abrirEdicion}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Edit3 size={13} />
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetalleOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-accent-500" />
                </div>
              ) : detalle ? (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="DNI" value={detalle.persona.dni} />
                    <Info label="Nacimiento" value={fecha(detalle.persona.fecha_nacimiento)} />
                    <Info label="Teléfono" value={detalle.persona.telefono || '—'} />
                    <Info label="Correo" value={detalle.persona.correo || '—'} />
                    <Info label="Departamento" value={detalle.persona.departamento || '—'} />
                    <Info label="Provincia" value={detalle.persona.provincia || '—'} />
                    <Info label="Distrito" value={detalle.persona.distrito || '—'} />
                    <Info label="Dirección" value={detalle.persona.direccion || '—'} />
                  </div>

                  <Section title="Apoderados">
                    {detalle.apoderados?.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {detalle.apoderados.map((r) => (
                          <div
                            key={r.apoderado.id_persona}
                            className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                          >
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${getAvatarColor(r.apoderado.persona.nombres)}`}
                            >
                              {getInitials(r.apoderado.persona.nombres)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {r.parentesco}:{' '}
                                {r.apoderado.persona.nombres}{' '}
                                {r.apoderado.persona.apellido_paterno}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                DNI: {r.apoderado.persona.dni} ·{' '}
                                {r.apoderado.persona.telefono || 'Sin teléfono'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Sin apoderados vinculados.</p>
                    )}
                  </Section>

                  <Section title="Matrículas">
                    {detalle.matriculas?.length ? (
                      <div className="space-y-2">
                        {detalle.matriculas.map((m) => (
                          <div
                            key={m.id_matricula}
                            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {m.colegio?.nombre || 'Colegio'} ·{' '}
                                {m.seccion?.grado?.nombre_grado || 'Grado'} &quot;
                                {m.seccion?.letra || '-'}&quot;
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {m.anio?.nombre_anio || 'Año'} · {fecha(m.fecha_matricula)}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getEstadoBadge(m.estado_matricula)}`}
                            >
                              {m.estado_matricula}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Sin matrículas visibles.</p>
                    )}
                  </Section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de edición ── */}
      {editOpen && form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200/80">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">Editar alumno</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Actualiza los datos generales del alumno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid max-h-[72vh] gap-3 overflow-y-auto p-6 md:grid-cols-2">
              <Field label="DNI" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
              <Field label="Nombres" value={form.nombres} onChange={(v) => setForm({ ...form, nombres: v })} />
              <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v) => setForm({ ...form, apellido_paterno: v })} />
              <Field label="Apellido materno" value={form.apellido_materno} onChange={(v) => setForm({ ...form, apellido_materno: v })} />
              <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(v) => setForm({ ...form, fecha_nacimiento: v })} />
              <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
              <Field label="Correo" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} />
              <Field label="País" value={form.pais} onChange={(v) => setForm({ ...form, pais: v })} />
              <Field label="Departamento" value={form.departamento} onChange={(v) => setForm({ ...form, departamento: v })} />
              <Field label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} />
              <Field label="Distrito" value={form.distrito} onChange={(v) => setForm({ ...form, distrito: v })} />
              <Field label="Dirección" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} />
            </div>

            {mensaje && (
              <div className="mx-6 mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
                {mensaje}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
