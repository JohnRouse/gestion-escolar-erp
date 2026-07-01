import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import PersonAvatar from '../../components/PersonAvatar';
import AccessCredentialsCard from '../../components/AccessCredentialsCard';

type Meta = { total: number; page: number; limit: number; totalPages: number };

type ApoderadoItem = {
  id_persona: number;
  ocupacion?: string | null;
  persona: {
    dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
    telefono?: string | null; correo?: string | null; direccion?: string | null;
    pais?: string | null; departamento?: string | null; provincia?: string | null; distrito?: string | null;
  };
  estudiantes?: {
    parentesco: string;
    estudiante: {
      id_persona: number; codigo_estudiante: string;
      codigos_colegio?: { id_colegio: number; codigo: string }[];
      persona: { dni: string; nombres: string; apellido_paterno: string; apellido_materno: string };
      matriculas?: any[];
    };
  }[];
};

type ApoderadoForm = {
  dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
  telefono: string; correo: string; direccion: string; pais: string; departamento: string;
  provincia: string; distrito: string; ocupacion: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const fullName = (p: ApoderadoItem['persona']) =>
  `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();

const getCodigo = (e: ApoderadoItem['estudiantes'][number]['estudiante']) =>
  e.codigos_colegio?.[0]?.codigo || e.codigo_estudiante || 'Sin código';

// Badge de estado de matrícula del hijo
const estadoBadge: Record<string, string> = {
  Activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Anulado: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  'Pre-matriculado': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Inactivo: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const getEstadoBadge = (estado?: string) =>
  estadoBadge[estado || ''] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';

const toForm = (d: ApoderadoItem): ApoderadoForm => ({
  dni: d.persona.dni || '',
  nombres: d.persona.nombres || '',
  apellido_paterno: d.persona.apellido_paterno || '',
  apellido_materno: d.persona.apellido_materno || '',
  telefono: d.persona.telefono || '',
  correo: d.persona.correo || '',
  direccion: d.persona.direccion || '',
  pais: d.persona.pais || 'Perú',
  departamento: d.persona.departamento || '',
  provincia: d.persona.provincia || '',
  distrito: d.persona.distrito || '',
  ocupacion: d.ocupacion || '',
});

// ── Componente principal ────────────────────────────────────────────────────

export default function ApoderadosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [data, setData] = useState<ApoderadoItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState<ApoderadoItem | null>(null);
  const [detalleCredencial, setDetalleCredencial] = useState<{ existe: boolean; estado: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ApoderadoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmEditApoderado, setConfirmEditApoderado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    if (debouncedQ) search.set('q', debouncedQ);
    search.set('page', String(page));
    search.set('limit', '10');
    const query = search.toString();
    return query ? `?${query}` : '';
  }, [debouncedQ, page, queryString]);

  useEffect(() => { fetchApoderados(); }, [params, token]);

  const fetchApoderados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/apoderados/listado${params}`, {
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
    setDetalleCredencial(null);
    setMensaje(null);
    try {
      const res = await axios.get(
        `/api/academicos/apoderados/${id}/detalle${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetalle(res.data);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se pudo cargar el apoderado.');
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
      await axios.put(`/api/academicos/apoderados/${detalle.id_persona}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditOpen(false);
      await abrirDetalle(detalle.id_persona);
      await fetchApoderados();
      setMensaje('Datos del apoderado actualizados correctamente.');
      showToast({ type: 'success', title: 'Apoderado actualizado', message: 'Los datos se actualizaron correctamente.' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo actualizar el apoderado.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'No se pudo actualizar', message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="carbon-community-page w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Apoderados"
        description="Consulta, revisa y edita los datos generales de apoderados vinculados a alumnos del colegio activo."
        icon={ShieldCheck}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
      />

      {/* ── Barra de búsqueda ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Buscar por DNI, nombre, teléfono, correo, alumno…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setPage(1); }}
            className="h-11 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading && data.length > 0 && (
        <div className="erp-inline-loading">
          <Loader2 size={14} className="animate-spin" />
          Actualizando resultados...
        </div>
      )}

      {/* ── Tabla de apoderados ── */}
      <div className="carbon-list-panel overflow-hidden border border-slate-200 bg-white">
        {/* Encabezado de columnas */}
        <div className="carbon-list-header hidden border-b border-slate-200 bg-slate-50 px-5 py-3 xl:grid xl:grid-cols-[2fr_1.4fr_1.6fr_auto] xl:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Apoderado</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Ocupación y contacto</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Alumnos vinculados</span>
          <span className="w-20" />
        </div>

        {loading && data.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <ShieldCheck size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Sin apoderados</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Ajusta los filtros para encontrar un registro.
              </p>
            </div>
          </div>
        ) : (
          <div className={`divide-y divide-slate-100/80 ${loading ? "erp-table-refreshing" : ""}`}>
            {data.map((apoderado) => {
              const nombre = fullName(apoderado.persona);
              const primerHijo = apoderado.estudiantes?.[0]?.estudiante;
              const totalHijos = apoderado.estudiantes?.length || 0;

              return (
                <div
                  key={apoderado.id_persona}
                  className="carbon-list-row group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 xl:grid-cols-[2fr_1.4fr_1.6fr_auto]"
                >
                  {/* Columna apoderado */}
                  <div className="flex min-w-0 items-center gap-3">
                    <PersonAvatar persona={apoderado.persona} size="md" rounded="2xl" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{nombre}</p>
                      <p className="erp-compact-meta mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                        <span className="erp-compact-code font-semibold text-slate-500">DNI {apoderado.persona.dni}</span>
                        {apoderado.persona.telefono && (
                          <>
                            <span className="text-slate-300">·</span>
                            <Phone size={10} className="shrink-0" />
                            {apoderado.persona.telefono}
                          </>
                        )}
                        {!apoderado.persona.telefono && (
                          <><span className="text-slate-300">·</span> Sin teléfono</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Columna ocupación y contacto */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase size={12} className="shrink-0 text-slate-400" />
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {apoderado.ocupacion || 'Sin ocupación'}
                      </p>
                    </div>
                    {apoderado.persona.correo ? (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                        <Mail size={10} className="shrink-0" />
                        {apoderado.persona.correo}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400">Sin correo</p>
                    )}
                  </div>

                  {/* Columna alumnos */}
                  <div className="min-w-0">
                    {primerHijo ? (
                      <>
                        <p className="erp-compact-code truncate text-sm font-semibold text-slate-800">
                          {getCodigo(primerHijo)} · {primerHijo.persona.nombres}{' '}
                          {primerHijo.persona.apellido_paterno}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <Users size={10} className="shrink-0" />
                          {totalHijos === 1
                            ? '1 alumno vinculado'
                            : `${totalHijos} alumnos vinculados`}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sin alumnos vinculados</span>
                    )}
                  </div>

                  {/* Acción */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(apoderado.id_persona)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-600 "
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

      {/* ── Modal de detalle usando Portal ── */}
      {detalleOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-5xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200/80 erp-detail-enter my-auto">
            {/* Header del modal */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
              <div className="flex items-center gap-4">
                {detalle && (
                  <PersonAvatar persona={detalle.persona} size="lg" rounded="2xl" />
                )}
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-600 ring-1 ring-accent-100">
                    <ShieldCheck size={11} />
                    Ficha del apoderado
                  </div>
                  <h3 className="mt-1.5 text-lg font-black text-slate-950">
                    {detalle ? fullName(detalle.persona) : 'Cargando…'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Datos personales y alumnos vinculados.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {detalle && (
                  <span
                    className={`inline-flex h-9 items-center rounded-full px-3 text-[11px] font-black ring-1 ${
                      detalleCredencial?.existe
                        ? detalleCredencial.estado
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200'
                        : 'bg-amber-50 text-amber-700 ring-amber-200'
                    }`}
                  >
                    {detalleCredencial?.existe
                      ? detalleCredencial.estado
                        ? 'Activo'
                        : 'Inactivo'
                      : 'Sin credencial'}
                  </span>
                )}
                {detalle && (
                  <button
                    type="button"
                    onClick={abrirEdicion}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-accent-600 transition hover:bg-accent-100"
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
                    <Info label="Teléfono" value={detalle.persona.telefono || '—'} />
                    <Info label="Correo" value={detalle.persona.correo || '—'} />
                    <Info label="Ocupación" value={detalle.ocupacion || '—'} />
                    <Info label="Departamento" value={detalle.persona.departamento || '—'} />
                    <Info label="Provincia" value={detalle.persona.provincia || '—'} />
                    <Info label="Distrito" value={detalle.persona.distrito || '—'} />
                    <Info label="Dirección" value={detalle.persona.direccion || '—'} />
                  </div>

                  <Section title="Alumnos vinculados">
                    {detalle.estudiantes?.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {detalle.estudiantes.map((r) => {
                          const estadoMatricula = r.estudiante.matriculas?.[0]?.estado_matricula;
                          return (
                            <div
                              key={r.estudiante.id_persona}
                              className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                            >
                              <PersonAvatar persona={r.estudiante.persona} size="sm" rounded="xl" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {r.parentesco}:{' '}
                                    {r.estudiante.persona.nombres}{' '}
                                    {r.estudiante.persona.apellido_paterno}
                                  </p>
                                  {estadoMatricula && (
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEstadoBadge(estadoMatricula)}`}
                                    >
                                      {estadoMatricula}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {getCodigo(r.estudiante)} · DNI {r.estudiante.persona.dni}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Sin alumnos vinculados.</p>
                    )}
                  </Section>

                  <AccessCredentialsCard
                    personaId={detalle.id_persona}
                    tipo="apoderado"
                    token={token}
                    queryString={queryString}
                    className="mt-5"
                    onLoaded={(credencial) =>
                      setDetalleCredencial({
                        existe: Boolean(credencial.existe),
                        estado: Boolean(credencial.estado),
                      })
                    }
                    onSaved={(credencial) =>
                      setDetalleCredencial({
                        existe: Boolean(credencial.existe),
                        estado: Boolean(credencial.estado),
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de edición usando Portal ── */}
      {editOpen && form && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200/80 erp-detail-enter my-auto">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">Editar apoderado</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Actualiza los datos generales del apoderado.
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

            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
              <Field label="DNI" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
              <Field label="Nombres" value={form.nombres} onChange={(v) => setForm({ ...form, nombres: v })} />
              <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v) => setForm({ ...form, apellido_paterno: v })} />
              <Field label="Apellido materno" value={form.apellido_materno} onChange={(v) => setForm({ ...form, apellido_materno: v })} />
              <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
              <Field label="Correo" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} />
              <Field label="Ocupación" value={form.ocupacion} onChange={(v) => setForm({ ...form, ocupacion: v })} />
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

            <div className="flex justify-end gap-3 border-t border-slate-100 p-5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setConfirmEditApoderado(true)}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={confirmEditApoderado}
        eyebrow="Apoderado"
        title="Confirmar edición"
        description="Se actualizarán los datos generales del apoderado. Esta información puede usarse en comunicaciones, reportes y vinculación familiar."
        tone="neutral"
        confirmLabel="Sí, guardar"
        cancelLabel="Cancelar"
        loading={saving}
        onCancel={() => setConfirmEditApoderado(false)}
        onConfirm={() => {
          setConfirmEditApoderado(false);
          void guardarEdicion();
        }}
      />
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-slate-200">
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
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}