import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
  SlidersHorizontal,
  Camera,
  UploadCloud,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import PersonAvatar from '../../components/PersonAvatar';
import LocationSelects from '../../components/LocationSelects';
import CommunityEditModal from '../../components/community/CommunityEditModal';
import {
  LinkedGuardianCards,
  LinkedGuardiansCompact,
} from '../../components/community/CommunityLinkedPeople';
import {
  CommunityField as Field,
  CommunityInfo as Info,
  CommunitySection as Section,
  communityInputClass,
} from '../../components/community/CommunityUI';

type CodigoColegio = { id_colegio: number; codigo: string };
type Meta = { total: number; page: number; limit: number; totalPages: number };

type AlumnoItem = {
  id_persona: number;
  codigo_estudiante: string;
  avatar_url?: string | null;
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

const inputClass = communityInputClass;

const fullName = (p: AlumnoItem['persona']) =>
  `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();

const fecha = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-PE') : '—';

const getCodigo = (alumno: AlumnoItem) =>
  alumno.codigos_colegio?.[0]?.codigo || alumno.codigo_estudiante || 'Sin código';

const assetUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `/api${url}`;
  if (url.startsWith('uploads/')) return `/api/${url}`;
  return url;
};

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
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<AlumnoItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState<AlumnoItem | null>(null);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false); // Nuevo estado para el visor de fotos

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<AlumnoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<{ file: File; previewUrl: string } | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1.08);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [confirmEditAlumno, setConfirmEditAlumno] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmApoderadoDestino, setConfirmApoderadoDestino] = useState<{ id: number; nombre: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    if (debouncedQ) search.set('q', debouncedQ);
    if (estado !== 'Todos') search.set('estado', estado);
    search.set('page', String(page));
    search.set('limit', '10');
    const query = search.toString();
    return query ? `?${query}` : '';
  }, [debouncedQ, estado, page, queryString]);

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

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const alumnoParamId = Number(search.get('alumno') || 0);

    if (!alumnoParamId || !token) return;

    void abrirDetalle(alumnoParamId);

    search.delete('alumno');
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

  const prepararFotoAlumno = (file?: File | null) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      const errorMessage = 'Selecciona una imagen JPG o PNG.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Formato no permitido', message: errorMessage });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      const errorMessage = 'La imagen no debe superar los 3 MB.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Imagen muy pesada', message: errorMessage });
      return;
    }

    if (avatarDraft?.previewUrl) {
      URL.revokeObjectURL(avatarDraft.previewUrl);
    }

    setAvatarZoom(1.08);
    setAvatarOffsetY(0);
    setAvatarDraft({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const crearFotoAjustada = async (file: File, zoom: number, offsetY: number) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    const width = 420;
    const height = 560;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) return file;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const baseScale = Math.max(width / image.width, height / image.height);
    const scale = baseScale * zoom;
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2 + offsetY;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          resolve(
            new File(
              [blob],
              file.name.replace(/\.(png|jpg|jpeg)$/i, '') + '-libreta.jpg',
              { type: 'image/jpeg' },
            ),
          );
        },
        'image/jpeg',
        0.92,
      );
    });
  };

  const confirmarSubidaFoto = async () => {
    if (!avatarDraft) return;

    const adjustedFile = await crearFotoAjustada(
      avatarDraft.file,
      avatarZoom,
      avatarOffsetY,
    );

    await subirFotoAlumno(adjustedFile);

    URL.revokeObjectURL(avatarDraft.previewUrl);
    setAvatarDraft(null);
  };

  const subirFotoAlumno = async (file?: File | null) => {
    if (!token || !detalle || !file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      const errorMessage = 'Selecciona una imagen JPG o PNG.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Formato no permitido', message: errorMessage });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      const errorMessage = 'La imagen no debe superar los 3 MB.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Imagen muy pesada', message: errorMessage });
      return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    setUploadingAvatar(true);
    setMensaje(null);

    try {
      const res = await axios.post(
        `/api/academicos/alumnos/${detalle.id_persona}/avatar${queryString}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const avatarUrl = res.data?.avatar_url || '';

      setDetalle((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: avatarUrl,
            }
          : prev,
      );

      await fetchAlumnos();

      setMensaje('Foto del alumno actualizada correctamente.');
      showToast({
        type: 'success',
        title: 'Foto actualizada',
        message: 'La foto se usará en la libreta del alumno.',
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'No se pudo subir la foto del alumno.';

      setMensaje(errorMessage);
      showToast({
        type: 'error',
        title: 'No se pudo subir',
        message: errorMessage,
      });
    } finally {
      setUploadingAvatar(false);
    }
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
    <div className="carbon-community-page w-full space-y-5 erp-page-enter">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
            className="h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50 py-0 pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pre-matriculado">Pre-matriculado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Sin matrícula">Sin matrícula</option>
          </select>
        </div>

        {/* Limpiar filtros */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setQ(''); setEstado('Todos'); setPage(1); }}
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

      {/* ── Tabla de alumnos ── */}
      <div className="carbon-list-panel overflow-hidden border border-slate-200 bg-white">
        {/* Encabezado de columnas */}
        <div className="carbon-list-header hidden border-b border-slate-200 bg-slate-50 px-5 py-3 xl:grid xl:grid-cols-[2fr_1.4fr_1.4fr_auto] xl:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Alumno</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Matrícula</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Apoderados vinculados</span>
          <span className="w-20" />
        </div>

        {loading && data.length === 0 ? (
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
          <div className={`divide-y divide-slate-100/80 ${loading ? "erp-table-refreshing" : ""}`}>
            {data.map((alumno) => {
              const ultimaMatricula = alumno.matriculas?.[0];
              const apoderadosList = alumno.apoderados || [];
              const nombre = fullName(alumno.persona);
              const estadoMatricula = ultimaMatricula?.estado_matricula;

              return (
                <div
                  key={alumno.id_persona}
                  className="carbon-list-row group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 xl:grid-cols-[2fr_1.4fr_1.4fr_auto]"
                >
                  {/* Columna alumno */}
                  <div className="flex min-w-0 items-center gap-3">
                    {alumno.avatar_url ? (
                      <img
                        src={assetUrl(alumno.avatar_url)}
                        alt={nombre}
                        className="h-11 w-11 rounded-2xl bg-white object-contain p-0.5 ring-1 ring-slate-200"
                      />
                    ) : (
                      <PersonAvatar persona={alumno.persona} size="md" rounded="2xl" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {nombre}
                      </p>
                      <p className="erp-compact-meta mt-0.5 truncate text-xs text-slate-400">
                        <span className="erp-compact-code font-semibold text-slate-500">{getCodigo(alumno)}</span>
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
                  {/* Columna apoderados */}
                  <div className="min-w-0">
                    <LinkedGuardiansCompact items={apoderadosList} />
                  </div>

                  {/* Acción */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(alumno.id_persona)}
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
                  detalle.avatar_url ? (
                    <button
                      type="button"
                      onClick={() => setAvatarViewOpen(true)}
                      className="group relative h-14 w-14 shrink-0 rounded-2xl outline-none transition focus:ring-4 focus:ring-accent-100"
                    >
                      <img
                        src={assetUrl(detalle.avatar_url)}
                        alt={fullName(detalle.persona)}
                        className="h-14 w-14 rounded-2xl bg-white object-contain p-0.5 ring-1 ring-slate-200 transition group-hover:opacity-80 group-hover:ring-accent-300"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/30 group-hover:opacity-100">
                        <Eye size={18} className="text-white" />
                      </div>
                    </button>
                  ) : (
                    <PersonAvatar persona={detalle.persona} size="lg" rounded="2xl" />
                  )
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
                  <>
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                      {uploadingAvatar ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : detalle.avatar_url ? (
                        <Camera size={13} />
                      ) : (
                        <UploadCloud size={13} />
                      )}
                      {uploadingAvatar ? 'Subiendo...' : detalle.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        disabled={uploadingAvatar}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          prepararFotoAlumno(file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={abrirEdicion}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-accent-600 transition hover:bg-accent-100"
                    >
                      <Edit3 size={13} />
                      Editar
                    </button>
                  </>
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

                  <Section title="Apoderados vinculados">
                    <LinkedGuardianCards
                      items={detalle.apoderados || []}
                      onSelect={(target) => setConfirmApoderadoDestino(target)}
                    />
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
        </div>,
        document.body
      )}

      {/* ── Modal de visualización de foto (Visor) ── */}
      {avatarViewOpen && detalle?.avatar_url && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setAvatarViewOpen(false)}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl items-center justify-center">
            <button
              type="button"
              onClick={() => setAvatarViewOpen(false)}
              className="absolute -top-2 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 sm:top-2 sm:right-2"
            >
              <X size={20} />
            </button>
            <img 
              src={assetUrl(detalle.avatar_url)} 
              alt={fullName(detalle.persona)} 
              className="max-h-[85vh] w-full max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de edición ── */}
      <CommunityEditModal
        open={editOpen && Boolean(form)}
        title="Editar alumno"
        description="Actualiza los datos generales del alumno."
        message={mensaje}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={() => setConfirmEditAlumno(true)}
      >
        {form && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
            <Field label="Nombres" value={form.nombres} onChange={(v) => setForm({ ...form, nombres: v })} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v) => setForm({ ...form, apellido_paterno: v })} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(v) => setForm({ ...form, apellido_materno: v })} />
            <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(v) => setForm({ ...form, fecha_nacimiento: v })} />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Correo" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} />

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

      {avatarDraft && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <section className="w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200 erp-detail-enter my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">
                  Foto del alumno
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Ajustar foto del alumno
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Ajusta el encuadre antes de guardar. Esta imagen aparecerá en la libreta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(avatarDraft.previewUrl);
                  setAvatarDraft(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex justify-center">
                <div className="h-[280px] w-[210px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
                  <img
                    src={avatarDraft.previewUrl}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${avatarZoom}) translateY(${avatarOffsetY}px)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl bg-blue-50 p-4 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                  Usa el zoom para acercar el rostro y el ajuste vertical para centrarlo mejor.
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Zoom
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.02"
                    value={avatarZoom}
                    onChange={(event) => setAvatarZoom(Number(event.target.value))}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Ajuste vertical
                  </span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="2"
                    value={avatarOffsetY}
                    onChange={(event) => setAvatarOffsetY(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(avatarDraft.previewUrl);
                  setAvatarDraft(null);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarSubidaFoto()}
                disabled={uploadingAvatar}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {uploadingAvatar && <Loader2 size={15} className="animate-spin" />}
                Confirmar y subir
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={confirmEditAlumno}
        eyebrow="Alumno"
        title="Confirmar edición"
        description="Se actualizarán los datos generales del alumno. Esta información puede usarse en matrícula, reportes y libreta."
        tone="neutral"
        confirmLabel="Sí, guardar"
        cancelLabel="Cancelar"
        loading={saving}
        onCancel={() => setConfirmEditAlumno(false)}
        onConfirm={() => {
          setConfirmEditAlumno(false);
          void guardarEdicion();
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmApoderadoDestino)}
        eyebrow="Apoderado vinculado"
        title="Ver ficha del apoderado"
        description={`Se abrirá la ficha de ${confirmApoderadoDestino?.nombre || 'este apoderado'} en la página de Apoderados.`}
        tone="neutral"
        confirmLabel="Sí, ver apoderado"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmApoderadoDestino(null)}
        onConfirm={() => {
          const targetId = confirmApoderadoDestino?.id;
          setConfirmApoderadoDestino(null);
          setDetalleOpen(false);

          if (targetId) {
            navigate(`/comunidad/apoderados?apoderado=${targetId}`);
          }
        }}
      />
    </div>
  );
}
