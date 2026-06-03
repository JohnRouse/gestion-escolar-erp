import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit3, Eye, Loader2, Search, UserRound, Users, X } from 'lucide-react';
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

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const fullName = (p: AlumnoItem['persona']) => `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();
const fecha = (value?: string | null) => value ? new Date(value).toLocaleDateString('es-PE') : '—';
const getCodigo = (alumno: AlumnoItem) => alumno.codigos_colegio?.[0]?.codigo || alumno.codigo_estudiante || 'Sin código';

const toForm = (detalle: AlumnoItem): AlumnoForm => ({
  dni: detalle.persona.dni || '',
  nombres: detalle.persona.nombres || '',
  apellido_paterno: detalle.persona.apellido_paterno || '',
  apellido_materno: detalle.persona.apellido_materno || '',
  fecha_nacimiento: detalle.persona.fecha_nacimiento ? detalle.persona.fecha_nacimiento.slice(0, 10) : '',
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

  useEffect(() => { fetchAlumnos(); }, [params, token]);

  const fetchAlumnos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/alumnos/listado${params}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await axios.get(`/api/academicos/alumnos/${id}/detalle${queryString}`, { headers: { Authorization: `Bearer ${token}` } });
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
      await axios.put(`/api/academicos/alumnos/${detalle.id_persona}`, form, { headers: { Authorization: `Bearer ${token}` } });
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
      const errorMessage = error.response?.data?.message || 'No se pudo actualizar el alumno.';
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

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Alumnos"
        description="Consulta, revisa y edita la información general de los alumnos vinculados al colegio activo."
        icon={UserRound}
        meta={[{ label: 'Contexto activo', value: scopeLabel }, { label: 'Resultados', value: String(meta.total) }]}
      />

      <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Buscar por código, DNI, alumno, apoderado, distrito..." className={`${inputClass} pl-11`} />
          </div>
          <select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }} className={inputClass}>
            <option value="Todos">Todos</option>
            <option value="Pre-matriculado">Pre-matriculado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Sin matrícula">Sin matrícula</option>
          </select>
          <button type="button" onClick={() => { setQ(''); setEstado('Todos'); setPage(1); }} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50">Limpiar</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center"><Loader2 size={26} className="animate-spin text-accent-500" /></div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
            <Users size={34} className="text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600">Sin alumnos</p>
            <p className="mt-1 text-sm text-slate-400">Ajusta los filtros para buscar otro registro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((alumno) => {
              const ultimaMatricula = alumno.matriculas?.[0];
              const apoderado = alumno.apoderados?.[0];
              return (
                <div key={alumno.id_persona} className="grid gap-4 p-5 xl:grid-cols-[1.1fr_1fr_1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-black text-slate-900">{getCodigo(alumno)} · {fullName(alumno.persona)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">DNI: {alumno.persona.dni} · Distrito: {alumno.persona.distrito || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700">{ultimaMatricula ? `${ultimaMatricula.seccion?.grado?.nombre_grado || 'Grado'} "${ultimaMatricula.seccion?.letra || '-'}"` : 'Sin matrícula visible'}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{ultimaMatricula?.colegio?.nombre || '—'} · {ultimaMatricula?.estado_matricula || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-700">{apoderado ? `${apoderado.parentesco}: ${apoderado.apoderado.persona.nombres} ${apoderado.apoderado.persona.apellido_paterno}` : 'Sin apoderado'}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{apoderado?.apoderado.persona.telefono || 'Sin teléfono'}</p>
                  </div>
                  <button type="button" onClick={() => abrirDetalle(alumno.id_persona)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"><Eye size={16} />Ver</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 p-5">
          <button type="button" onClick={() => setPage((c) => Math.max(c - 1, 1))} disabled={page <= 1} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={16} />Anterior</button>
          <p className="text-sm font-bold text-slate-400">{meta.total} registros</p>
          <button type="button" onClick={() => setPage((c) => Math.min(c + 1, meta.totalPages || 1))} disabled={page >= (meta.totalPages || 1)} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Siguiente<ChevronRight size={16} /></button>
        </div>
      </div>

      {detalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <div className="inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-black text-accent-600 ring-1 ring-accent-100">Ficha del alumno</div>
                <h3 className="mt-3 text-xl font-black text-slate-950">{detalle ? `${getCodigo(detalle)} · ${fullName(detalle.persona)}` : 'Cargando alumno'}</h3>
                <p className="mt-1 text-sm text-slate-400">Datos personales, apoderados y matrículas visibles.</p>
              </div>
              <div className="flex gap-2">
                {detalle && <button type="button" onClick={abrirEdicion} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"><Edit3 size={15} />Editar</button>}
                <button type="button" onClick={() => setDetalleOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? <div className="flex min-h-[280px] items-center justify-center"><Loader2 size={24} className="animate-spin text-accent-500" /></div> : detalle ? (
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
                    {detalle.apoderados?.length ? <div className="grid gap-3 md:grid-cols-2">{detalle.apoderados.map((r) => (
                      <div key={r.apoderado.id_persona} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                        <p className="text-sm font-black text-slate-800">{r.parentesco}: {r.apoderado.persona.nombres} {r.apoderado.persona.apellido_paterno}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">DNI: {r.apoderado.persona.dni} · {r.apoderado.persona.telefono || 'Sin teléfono'}</p>
                      </div>
                    ))}</div> : <p className="text-sm font-bold text-slate-400">Sin apoderados vinculados.</p>}
                  </Section>
                  <Section title="Matrículas">
                    {detalle.matriculas?.length ? <div className="space-y-2">{detalle.matriculas.map((m) => (
                      <div key={m.id_matricula} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                        <p className="text-sm font-black text-slate-800">{m.colegio?.nombre || 'Colegio'} · {m.seccion?.grado?.nombre_grado || 'Grado'} "{m.seccion?.letra || '-'}"</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{m.anio?.nombre_anio || 'Año'} · {m.estado_matricula} · {fecha(m.fecha_matricula)}</p>
                      </div>
                    ))}</div> : <p className="text-sm font-bold text-slate-400">Sin matrículas visibles.</p>}
                  </Section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {editOpen && form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div><h3 className="text-xl font-black text-slate-950">Editar alumno</h3><p className="mt-1 text-sm text-slate-400">Actualiza los datos generales del alumno.</p></div>
              <button type="button" onClick={() => setEditOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><X size={18} /></button>
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
            {mensaje && <div className="mx-6 mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{mensaje}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
              <button type="button" onClick={() => setEditOpen(false)} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600">Cancelar</button>
              <button type="button" onClick={guardarEdicion} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 text-sm font-black text-slate-900">{value}</p></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100"><h4 className="text-sm font-black text-slate-900">{title}</h4><div className="mt-3">{children}</div></div>;
}

function Field({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} /></label>;
}