import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Edit3,
  Search,
  ShieldCheck,
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
import CommunityDetailModal from '../../components/community/CommunityDetailModal';
import {
  CommunityEmptyState,
  CommunityInlineLoading,
  CommunityPagination,
  CommunityTableHeader,
  CommunityTableLoading,
} from '../../components/community/CommunityTableState';
import { LinkedStudentCards } from '../../components/community/CommunityLinkedPeople';
import { GuardianTableRow } from '../../components/community/CommunityTableRows';
import {
  CommunityField as Field,
  CommunityInfo as Info,
  CommunitySection as Section,
  CommunityTextarea as Textarea,
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
      id_persona: number; codigo_estudiante: string; avatar_url?: string | null;
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
      <div className="community-toolbar flex flex-col gap-3 sm:flex-row sm:items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Buscar por DNI, nombre, teléfono, correo, alumno…"
            className="community-search-input h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
        <CommunityInlineLoading />
      )}

      {/* ── Tabla de apoderados ── */}
      <div className="carbon-list-panel overflow-hidden border border-slate-200 bg-white">
        <CommunityTableHeader
          columns={['Apoderado', 'Ocupación y contacto', 'Estado']}
          gridClassName="xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1.2fr)_minmax(120px,0.45fr)_auto]"
        />

        {loading && data.length === 0 ? (
          <CommunityTableLoading />
        ) : data.length === 0 ? (
          <CommunityEmptyState
            icon={ShieldCheck}
            title="Sin apoderados"
            description="Ajusta los filtros para encontrar un registro."
          />
        ) : (
          <div className={`divide-y divide-slate-100/80 ${loading ? "erp-table-refreshing" : ""}`}>
            {data.map((apoderado) => (
              <GuardianTableRow
                key={apoderado.id_persona}
                apoderado={apoderado}
                onOpen={abrirDetalle}
                estadoClass={apoderadoEstadoClass}
                estadoLabel={apoderadoEstadoLabel}
              />
            ))}
          </div>
        )}

        <CommunityPagination
          page={page}
          totalPages={meta.totalPages || 1}
          total={meta.total}
          onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
          onNext={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
        />
      </div>

      {/* ── Modal de detalle ── */}
      <CommunityDetailModal
        open={detalleOpen}
        loading={detalleLoading}
        eyebrow={
          <>
            <ShieldCheck size={11} />
            Ficha del apoderado
          </>
        }
        title={detalle ? fullName(detalle.persona) : 'Cargando…'}
        description="Datos personales y alumnos vinculados."
        leadingSlot={
          detalle ? (
            <PersonAvatar persona={detalle.persona} size="lg" rounded="2xl" />
          ) : null
        }
        actions={
          detalle ? (
            <>
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

              <button
                type="button"
                onClick={abrirEdicion}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-accent-600 transition hover:bg-accent-100"
              >
                <Edit3 size={13} />
                Editar
              </button>
            </>
          ) : null
        }
        onClose={() => setDetalleOpen(false)}
      >
        {detalle ? (
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
              <LinkedStudentCards
                items={detalle.estudiantes || []}
                onSelect={(target) => setConfirmAlumnoDestino(target)}
              />
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
      </CommunityDetailModal>

      {/* ── Modal de edición ── */}
      <CommunityEditModal
        open={editOpen && Boolean(form)}
        eyebrow="Editar apoderado"
        title={detalle ? fullName(detalle.persona) : 'Editar apoderado'}
        description="Completa los datos generales del apoderado."
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
              <Textarea
                label="Dirección"
                value={form.direccion}
                rows={3}
                placeholder="Ingresa la dirección completa del apoderado"
                onChange={(value) =>
                  setForm({
                    ...form,
                    direccion: value,
                  })
                }
              />
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
