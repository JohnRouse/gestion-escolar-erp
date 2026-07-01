import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
import LocationSelects from '../../components/LocationSelects';
import CommunityEditModal from '../../components/community/CommunityEditModal';
import {
  CommunityField as Field,
  CommunityInfo as Info,
  CommunitySection as Section,
  communityInputClass,
} from '../../components/community/CommunityUI';

type Meta = { total: number; page: number; limit: number; totalPages: number };

type ApoderadoItem = {
  id_persona: number;
  ocupacion?: string | null;
  persona: {
    dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
    telefono?: string | null; correo?: string | null; direccion?: string | null;
    pais?: string | null; departamento?: string | null; provincia?: string | null; distrito?: string | null;
  };
  credencial?: {
    existe: boolean;
    estado: boolean;
    label: string;
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

const inputClass = communityInputClass;

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

const apoderadoEstado = (apoderado: ApoderadoItem) => {
  if (!apoderado.credencial?.existe) return 'sin_credencial';
  return apoderado.credencial.estado ? 'activo' : 'inactivo';
};

const apoderadoEstadoLabel = (apoderado: ApoderadoItem) => {
  const estado = apoderadoEstado(apoderado);

  if (estado === 'activo') return 'Activo';
  if (estado === 'inactivo') return 'Inactivo';

  return 'Sin credencial';
};

const apoderadoEstadoClass = (apoderado: ApoderadoItem) => {
  const estado = apoderadoEstado(apoderado);

  if (estado === 'activo') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (estado === 'inactivo') return 'bg-slate-100 text-slate-600 ring-slate-200';

  return 'bg-amber-50 text-amber-700 ring-amber-200';
};


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
  const navigate = useNavigate();
  const location = useLocation();

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
  const [confirmAlumnoDestino, setConfirmAlumnoDestino] = useState<{ id: number; nombre: string } | null>(null);

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

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const apoderadoParamId = Number(search.get('apoderado') || 0);

    if (!apoderadoParamId || !token) return;

    void abrirDetalle(apoderadoParamId);

    search.delete('apoderado');
    const nextSearch = search.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.search, navigate, token]);

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
        <div className="carbon-list-header hidden border-b border-slate-200 bg-slate-50 px-5 py-3 xl:grid xl:grid-cols-[1.8fr_1.25fr_1.45fr_0.8fr_auto] xl:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Apoderado</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Ocupación y contacto</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Alumnos vinculados</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Estado</span>
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
                  className="carbon-list-row group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 xl:grid-cols-[1.8fr_1.25fr_1.45fr_0.8fr_auto]"
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
                    {apoderado.estudiantes?.length ? (
                      <div className="space-y-1.5">
                        {apoderado.estudiantes.slice(0, 3).map((rel) => {
                          const estudiante = rel.estudiante;
                          const nombreAlumno = [
                            estudiante.persona.nombres,
                            estudiante.persona.apellido_paterno,
                            estudiante.persona.apellido_materno,
                          ].filter(Boolean).join(' ');

                          return (
                            <div key={estudiante.id_persona} className="min-w-0">
                              <p className="erp-compact-code truncate text-sm font-semibold text-slate-800">
                                {getCodigo(estudiante)} · {nombreAlumno}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                Parentesco: {rel.parentesco}
                              </p>
                            </div>
                          );
                        })}

                        {totalHijos > 3 && (
                          <p className="text-xs font-bold text-slate-400">
                            +{totalHijos - 3} alumno(s) más vinculados
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin alumnos vinculados</span>
                    )}
                  </div>


                  {/* Estado */}
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${apoderadoEstadoClass(apoderado)}`}
                    >
                      {apoderadoEstadoLabel(apoderado)}
                    </span>
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
                          const matricula = r.estudiante.matriculas?.[0];
                          const seccion = matricula?.seccion;
                          const salon = seccion?.grado
                            ? `${seccion.grado.nombre_grado} "${seccion.letra}" · ${seccion.grado.nivel?.nombre_nivel || ''}`.trim()
                            : 'Sin sección activa';
                          const nombreAlumno = [
                            r.estudiante.persona.nombres,
                            r.estudiante.persona.apellido_paterno,
                            r.estudiante.persona.apellido_materno,
                          ].filter(Boolean).join(' ');

                          return (
                            <button
                              type="button"
                              key={r.estudiante.id_persona}
                              onClick={() =>
                                setConfirmAlumnoDestino({
                                  id: r.estudiante.id_persona,
                                  nombre: nombreAlumno,
                                })
                              }
                              className="group flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-blue-200 hover:shadow-sm"
                            >
                              <PersonAvatar persona={r.estudiante.persona} size="sm" rounded="xl" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    Alumno: {nombreAlumno}
                                  </p>
                                  {estadoMatricula && (
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEstadoBadge(estadoMatricula)}`}
                                    >
                                      {estadoMatricula}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  Parentesco registrado: {r.parentesco}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {getCodigo(r.estudiante)} · DNI {r.estudiante.persona.dni}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {salon}
                                </p>
                                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-600 opacity-0 transition group-hover:opacity-100">
                                  Ver ficha del alumno
                                </p>
                              </div>
                            </button>
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
                    onSaved={(credencial) => {
                      const nextCredencial = {
                        existe: Boolean(credencial.existe),
                        estado: Boolean(credencial.estado),
                      };

                      setDetalleCredencial(nextCredencial);

                      setData((prev) =>
                        prev.map((item) =>
                          detalle && item.id_persona === detalle.id_persona
                            ? {
                                ...item,
                                credencial: {
                                  ...(item as any).credencial,
                                  existe: nextCredencial.existe,
                                  estado: nextCredencial.estado,
                                  label: nextCredencial.existe
                                    ? nextCredencial.estado
                                      ? 'Activo'
                                      : 'Inactivo'
                                    : 'Sin credencial',
                                },
                              } as any
                            : item,
                        ),
                      );

                      void fetchApoderados();
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de edición ── */}
      <CommunityEditModal
        open={editOpen && Boolean(form)}
        title="Editar apoderado"
        description="Actualiza los datos generales del apoderado."
        message={mensaje}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={() => setConfirmEditApoderado(true)}
      >
        {form && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
            <Field label="Nombres" value={form.nombres} onChange={(v) => setForm({ ...form, nombres: v })} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v) => setForm({ ...form, apellido_paterno: v })} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(v) => setForm({ ...form, apellido_materno: v })} />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Correo" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} />
            <Field label="Ocupación" value={form.ocupacion} onChange={(v) => setForm({ ...form, ocupacion: v })} />

            <div className="md:col-span-2">
              <LocationSelects
                value={{
                  pais: form.pais || 'Perú',
                  departamento: form.departamento,
                  provincia: form.provincia,
                  distrito: form.distrito,
                }}
                onChange={(location) =>
                  setForm({
                    ...form,
                    pais: location.pais || 'Perú',
                    departamento: location.departamento || '',
                    provincia: location.provincia || '',
                    distrito: location.distrito || '',
                  })
                }
                wrapperClassName="grid gap-4 md:grid-cols-3"
                selectClass={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <Field label="Dirección" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} />
            </div>
          </div>
        )}
      </CommunityEditModal>

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
      <ConfirmDialog
        open={Boolean(confirmAlumnoDestino)}
        eyebrow="Alumno vinculado"
        title="Ver ficha del alumno"
        description={`Se abrirá la ficha de ${confirmAlumnoDestino?.nombre || 'este alumno'} en la página de Alumnos.`}
        tone="neutral"
        confirmLabel="Sí, ver alumno"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmAlumnoDestino(null)}
        onConfirm={() => {
          const targetId = confirmAlumnoDestino?.id;
          setConfirmAlumnoDestino(null);
          setDetalleOpen(false);

          if (targetId) {
            navigate(`/comunidad/alumnos?alumno=${targetId}`);
          }
        }}
      />
    </div>
  );
}
