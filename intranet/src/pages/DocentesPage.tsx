import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import CommunityDetailModal from '../components/community/CommunityDetailModal';
import CommunityEditModal from '../components/community/CommunityEditModal';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useToast } from '../contexts/ToastContext';
import LocationSelects from '../components/LocationSelects';
import AccessCredentialsCard from '../components/AccessCredentialsCard';

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type Area = {
  id_area: number;
  nombre_area: string;
};

type DocenteItem = {
  id_persona: number;
  nombre_completo: string;
  fecha_ingreso?: string | null;
  persona: {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_nacimiento?: string | null;
    genero?: string | null;
    telefono?: string | null;
    correo?: string | null;
    direccion?: string | null;
    pais?: string | null;
    departamento?: string | null;
    provincia?: string | null;
    distrito?: string | null;
  };
  especialidades?: {
    id_area: number;
    area: Area;
  }[];
  colegios?: {
    id_colegio: number;
    nombre: string;
  }[];
  credencial?: {
    existe: boolean;
    username: string;
    estado: boolean;
    label: string;
  };
  secciones_count?: number;
  secciones_resumen?: {
    id_seccion: number;
    seccion: string;
    nivel?: string | null;
    colegio?: string | null;
  }[];
  tutorias_resumen?: {
    id_seccion: number;
    seccion: string;
    nivel?: string | null;
    colegio?: string | null;
  }[];
  asignaciones_resumen?: {
    id_asignacion: number;
    curso: string;
    area?: string | null;
    seccion: string;
    nivel?: string | null;
    anio?: string | null;
    colegio?: string | null;
  }[];
  _count?: {
    asignaciones: number;
    horarios: number;
  };
};

type DocenteForm = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  genero: string;
  telefono: string;
  correo: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  fecha_ingreso: string;
  especialidades: number[];
  crear_credencial: boolean;
  username: string;
  password: string;
  credencial_activa: boolean;
};

const emptyForm: DocenteForm = {
  dni: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  genero: '',
  telefono: '',
  correo: '',
  direccion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  fecha_ingreso: '',
  especialidades: [],
  crear_credencial: false,
  username: '',
  password: '',
  credencial_activa: true,
};

const inputClass =
  'h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100';

function toDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function initials(docente: DocenteItem) {
  const n = docente.persona?.nombres?.slice(0, 1) || 'D';
  const a = docente.persona?.apellido_paterno?.slice(0, 1) || '';
  return `${n}${a}`.toUpperCase();
}

function docenteStatus(docente: DocenteItem) {
  if (docente.credencial?.estado) return 'activo';
  return 'inactivo';
}

function docenteStatusLabel(docente: DocenteItem) {
  return docenteStatus(docente) === 'activo' ? 'Activo' : 'Inactivo';
}

function seccionesLabel(count = 0) {
  return `${count} ${count === 1 ? 'sección' : 'secciones'}`;
}

function tutorLabel(docente: DocenteItem) {
  const tutorias = docente.tutorias_resumen || [];

  if (!tutorias.length) return 'Tutoría no asignada';

  return `Tutor de ${tutorias.map((item) => item.seccion).join(', ')}`;
}

function toForm(docente: DocenteItem): DocenteForm {
  return {
    dni: docente.persona.dni || '',
    nombres: docente.persona.nombres || '',
    apellido_paterno: docente.persona.apellido_paterno || '',
    apellido_materno: docente.persona.apellido_materno || '',
    fecha_nacimiento: toDateInput(docente.persona.fecha_nacimiento),
    genero: docente.persona.genero || '',
    telefono: docente.persona.telefono || '',
    correo: docente.persona.correo || '',
    direccion: docente.persona.direccion || '',
    departamento: docente.persona.departamento || '',
    provincia: docente.persona.provincia || '',
    distrito: docente.persona.distrito || '',
    fecha_ingreso: toDateInput(docente.fecha_ingreso),
    especialidades: (docente.especialidades || []).map((item) => item.id_area),
    crear_credencial: false,
    username: '',
    password: '',
    credencial_activa: true,
  };
}

export default function DocentesPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [docentes, setDocentes] = useState<DocenteItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DocenteForm>(emptyForm);
  const [editing, setEditing] = useState<DocenteItem | null>(null);
  const [selected, setSelected] = useState<DocenteItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));

    if (debouncedQ) search.set('q', debouncedQ);
    if (estadoFiltro !== 'todos') search.set('estado', estadoFiltro);
    search.set('page', String(page));
    search.set('limit', '12');

    const value = search.toString();
    return value ? `?${value}` : '';
  }, [debouncedQ, estadoFiltro, page, queryString]);

  const areasParams = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    const value = search.toString();
    return value ? `?${value}` : '';
  }, [queryString]);

  const fetchDocentes = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await axios.get(`/api/academicos/docentes${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(res.data)) {
        setDocentes(res.data);
        setMeta({ total: res.data.length, page: 1, limit: 12, totalPages: 1 });
      } else {
        setDocentes(res.data?.data || []);
        setMeta(res.data?.meta || { total: 0, page: 1, limit: 12, totalPages: 1 });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar la lista de docentes.';
      showToast({ type: 'error', title: 'Error al cargar', message });
      setDocentes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`/api/academicos/areas${areasParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAreas(res.data || []);
    } catch {
      setAreas([]);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, [params, token]);

  useEffect(() => {
    fetchAreas();
  }, [areasParams, token]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (docente: DocenteItem) => {
    setEditing(docente);
    setForm(toForm(docente));
    setModalOpen(true);
  };

  const openDetalle = async (docente: DocenteItem) => {
    if (!token) return;

    setSelected(docente);
    setDetalleOpen(true);

    try {
      const res = await axios.get(`/api/academicos/docentes/${docente.id_persona}/detalle${areasParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSelected(res.data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar el detalle del docente.';
      showToast({ type: 'error', title: 'Error al cargar detalle', message });
    }
  };

  const syncSelectedDocenteCredential = (credencial: {
    existe: boolean;
    username: string;
    estado: boolean;
  }) => {
    setSelected((current) => {
      if (!current) return current;

      return {
        ...current,
        credencial: {
          existe: Boolean(credencial.existe),
          username: credencial.username || '',
          estado: Boolean(credencial.estado),
          label: credencial.estado ? 'Activo' : 'Inactivo',
        },
      };
    });
  };

  const handleDocenteCredentialSaved = async (credencial: {
    existe: boolean;
    username: string;
    estado: boolean;
  }) => {
    syncSelectedDocenteCredential(credencial);
    await fetchDocentes();
  };

  const toggleArea = (idArea: number) => {
    setForm((current) => {
      const exists = current.especialidades.includes(idArea);

      return {
        ...current,
        especialidades: exists
          ? current.especialidades.filter((id) => id !== idArea)
          : [...current.especialidades, idArea],
      };
    });
  };

  const guardarDocente = async () => {
    if (!token) return;

    if (!form.dni.trim() || !form.nombres.trim() || !form.apellido_paterno.trim()) {
      showToast({
        type: 'warning',
        title: 'Datos incompletos',
        message: 'Completa DNI, nombres y apellido paterno.',
      });
      return;
    }

    if (!form.fecha_nacimiento) {
      showToast({
        type: 'warning',
        title: 'Fecha requerida',
        message: 'Ingresa la fecha de nacimiento del docente.',
      });
      return;
    }

    if (form.especialidades.length === 0) {
      showToast({
        type: 'warning',
        title: 'Especialidad requerida',
        message: 'Selecciona al menos un área para vincular al docente con el colegio.',
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        dni: form.dni.trim(),
        nombres: form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim(),
      };

      if (editing) {
        await axios.put(`/api/academicos/docentes/${editing.id_persona}${areasParams}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`/api/academicos/docentes${areasParams}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      showToast({
        type: 'success',
        title: editing ? 'Docente actualizado' : 'Docente registrado',
        message: editing ? 'Los datos del docente fueron actualizados.' : 'El docente fue registrado correctamente.',
      });

      setModalOpen(false);
      setEditing(null);
      await fetchDocentes();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo guardar el docente.';
      showToast({ type: 'error', title: 'No se pudo guardar', message });
    } finally {
      setSaving(false);
    }
  };

  const eliminarDocente = async () => {
    if (!token || !selected) return;

    setSaving(true);

    try {
      await axios.delete(`/api/academicos/docentes/${selected.id_persona}${areasParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast({
        type: 'success',
        title: 'Docente eliminado',
        message: 'El docente fue retirado del directorio.',
      });

      setConfirmDelete(false);
      setDetalleOpen(false);
      setSelected(null);
      await fetchDocentes();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo eliminar el docente.';
      showToast({ type: 'error', title: 'No se pudo eliminar', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="carbon-docentes-page w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Personal académico"
        title="Docentes"
        description="Registra, consulta y administra docentes por colegio, especialidad y asignaciones académicas."
        icon={GraduationCap}
        meta={[
          { label: 'Colegio actual', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={17} />
            Nuevo docente
          </button>
        }
      />

      <section className="rounded-[24px] border border-slate-200 bg-white p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(event) => {
                setPage(1);
                setQ(event.target.value);
              }}
              placeholder="Buscar por DNI, docente, correo o especialidad..."
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 pl-11 pr-10 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setPage(1);
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={estadoFiltro}
            onChange={(event) => {
              setEstadoFiltro(event.target.value);
              setPage(1);
            }}
            className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Solo activos</option>
            <option value="inactivo">Solo inactivos</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="grid border-b border-slate-300 bg-slate-100 px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-700 xl:grid-cols-[2fr_1.25fr_1.1fr_1fr_0.8fr_auto]">
          <span>Docente</span>
          <span>Especialidades</span>
          <span>Colegios</span>
          <span>Secciones</span>
          <span>Estado</span>
          <span />
        </div>

        {loading && docentes.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : docentes.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <UserRound size={24} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900">Sin docentes registrados</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Registra el primer docente para gestionar horarios, asistencia y notas.
              </p>
            </div>
          </div>
        ) : (
          <div className={loading ? 'opacity-70' : ''}>
            {docentes.map((docente) => (
              <article
                key={docente.id_persona}
                className="grid items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-b-0 hover:bg-slate-50 xl:grid-cols-[2fr_1.25fr_1.1fr_1fr_0.8fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                    {initials(docente)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{docente.nombre_completo}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-slate-600">
                      <span>DNI {docente.persona.dni}</span>
                      {docente.persona.telefono && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} />
                          {docente.persona.telefono}
                        </span>
                      )}
                      {docente.persona.correo && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={11} />
                          {docente.persona.correo}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(docente.especialidades || []).slice(0, 3).map((item) => (
                    <span
                      key={item.id_area}
                      className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700"
                    >
                      {item.area.nombre_area}
                    </span>
                  ))}
                  {(docente.especialidades || []).length > 3 && (
                    <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">
                      +{(docente.especialidades || []).length - 3}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {(docente.colegios || []).map((item) => item.nombre).join(' · ') || 'Sin colegio visible'}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <BriefcaseBusiness size={16} className="text-slate-500" />
                    {seccionesLabel(docente.secciones_count || 0)}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {tutorLabel(docente)}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                      docenteStatus(docente) === 'activo'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {docenteStatusLabel(docente)}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openDetalle(docente)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 text-xs font-black text-slate-800 hover:bg-slate-100"
                  >
                    <Eye size={14} />
                    Ver
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>

          <p className="text-center text-xs font-bold text-slate-600">
            Página <span className="font-black text-slate-950">{meta.page}</span> de{' '}
            <span className="font-black text-slate-950">{meta.totalPages || 1}</span>
          </p>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
            disabled={page >= (meta.totalPages || 1)}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <CommunityEditModal
        open={modalOpen}
        eyebrow={editing ? 'Editar docente' : 'Nuevo docente'}
        title={editing ? editing.nombre_completo : 'Registrar docente'}
        description="Completa los datos generales y selecciona sus áreas de especialidad."
        saving={saving}
        submitLabel={editing ? 'Guardar cambios' : 'Registrar docente'}
        cancelLabel="Cancelar"
        maxWidthClassName="max-w-5xl"
        onClose={() => setModalOpen(false)}
        onSubmit={guardarDocente}
      >
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} disabled={Boolean(editing)} onChange={(value) => setForm({ ...form, dni: value })} />
            <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(value) => setForm({ ...form, fecha_nacimiento: value })} />
            <Field label="Nombres" value={form.nombres} onChange={(value) => setForm({ ...form, nombres: value })} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(value) => setForm({ ...form, apellido_paterno: value })} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(value) => setForm({ ...form, apellido_materno: value })} />
            <Field label="Fecha de ingreso" type="date" value={form.fecha_ingreso} onChange={(value) => setForm({ ...form, fecha_ingreso: value })} />
            <Field label="Teléfono" value={form.telefono} onChange={(value) => setForm({ ...form, telefono: value })} />
            <Field label="Correo" value={form.correo} onChange={(value) => setForm({ ...form, correo: value })} />
            <div className="md:col-span-2">
              <LocationSelects
                value={{
                  pais: 'Perú',
                  departamento: form.departamento,
                  provincia: form.provincia,
                  distrito: form.distrito,
                }}
                onChange={(location) =>
                  setForm({
                    ...form,
                    departamento: location.departamento || '',
                    provincia: location.provincia || '',
                    distrito: location.distrito || '',
                  })
                }
                selectClass={inputClass}
                wrapperClassName="grid gap-4 md:grid-cols-3"
              />
            </div>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Género</span>
              <select
                value={form.genero}
                onChange={(event) => setForm({ ...form, genero: event.target.value })}
                className={inputClass}
              >
                <option value="">No especificado</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Dirección</span>
              <input
                value={form.direccion}
                onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <aside className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <GraduationCap size={20} />
              </span>
              <div>
                <h4 className="font-black text-slate-950">Áreas / especialidades</h4>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                  Estas áreas vinculan al docente con el colegio actual.
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {areas.length === 0 ? (
                <p className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  No hay áreas configuradas para el colegio actual.
                </p>
              ) : (
                areas.map((area) => (
                  <label
                    key={area.id_area}
                    className="flex cursor-pointer items-center gap-3 rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.especialidades.includes(area.id_area)}
                      onChange={() => toggleArea(area.id_area)}
                      className="h-4 w-4"
                    />
                    {area.nombre_area}
                  </label>
                ))
              )}
            </div>

            {!editing && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.crear_credencial}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        crear_credencial: event.target.checked,
                        username: event.target.checked && !form.username ? form.dni : form.username,
                      })
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    Crear credencial de acceso
                    <small className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                      El docente podrá ingresar con rol Profesor. La contraseña se guarda protegida.
                    </small>
                  </span>
                </label>

                {form.crear_credencial && (
                  <div className="mt-3 grid gap-3">
                    <Field
                      label="Usuario"
                      value={form.username}
                      onChange={(value) => setForm({ ...form, username: value })}
                    />
                    <Field
                      label="Contraseña temporal"
                      type="password"
                      value={form.password}
                      onChange={(value) => setForm({ ...form, password: value })}
                    />
                    <label className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        Estado
                      </span>
                      <select
                        value={form.credencial_activa ? 'activo' : 'inactivo'}
                        onChange={(event) => setForm({ ...form, credencial_activa: event.target.value === 'activo' })}
                        className={inputClass}
                      >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Desactivado</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </CommunityEditModal>

      <CommunityDetailModal
        open={detalleOpen && Boolean(selected)}
        eyebrow="Ficha docente"
        title={selected?.nombre_completo || 'Docente'}
        description={selected ? `DNI ${selected.persona.dni}` : undefined}
        leadingSlot={
          selected ? (
            <span className="text-sm font-black">
              {initials(selected)}
            </span>
          ) : undefined
        }
        actions={
          selected ? (
            <button
              type="button"
              onClick={() => {
                setDetalleOpen(false);
                openEdit(selected);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              <Edit3 size={14} />
              Editar docente
            </button>
          ) : undefined
        }
        maxWidthClassName="max-w-4xl"
        onClose={() => setDetalleOpen(false)}
      >
        {selected && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Info icon={Phone} label="Teléfono" value={selected.persona.telefono || '—'} />
              <Info icon={Mail} label="Correo" value={selected.persona.correo || '—'} />
              <Info icon={CalendarDays} label="Fecha de ingreso" value={toDateInput(selected.fecha_ingreso) || '—'} />
            </div>

            <section className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-black text-slate-950">Especialidades</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selected.especialidades || []).map((item) => (
                  <span key={item.id_area} className="rounded-sm border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                    {item.area.nombre_area}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-950">Asignaciones recientes</h4>
              <div className="mt-3 space-y-2">
                {(selected.asignaciones_resumen || []).length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">Sin asignaciones registradas.</p>
                ) : (
                  (selected.asignaciones_resumen || []).map((item) => (
                    <div key={item.id_asignacion} className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-black text-slate-950">{item.curso}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {item.seccion} · {item.anio || 'Año no definido'} · {item.colegio || 'Colegio'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <AccessCredentialsCard
              personaId={selected.id_persona}
              tipo="docente"
              token={token}
              queryString={queryString}
              className="mt-5"
              onLoaded={syncSelectedDocenteCredential}
              onSaved={handleDocenteCredentialSaved}
            />
          </>
        )}
      </CommunityDetailModal>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar docente?"
        description="Solo se podrá eliminar si no tiene asignaciones ni horarios vinculados."
        confirmLabel="Eliminar docente"
        tone="danger"
        loading={saving}
        onConfirm={eliminarDocente}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500`}
      />
    </label>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} />
        <p className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
