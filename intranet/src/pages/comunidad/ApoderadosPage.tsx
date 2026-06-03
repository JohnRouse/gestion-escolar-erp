import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit3, Eye, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';

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

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';
const fullName = (p: ApoderadoItem['persona']) => `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();
const getCodigo = (e: ApoderadoItem['estudiantes'][number]['estudiante']) => e.codigos_colegio?.[0]?.codigo || e.codigo_estudiante || 'Sin código';

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

export default function ApoderadosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();

  const [data, setData] = useState<ApoderadoItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState<ApoderadoItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ApoderadoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    if (q.trim()) search.set('q', q.trim());
    search.set('page', String(page));
    search.set('limit', '10');
    const query = search.toString();
    return query ? `?${query}` : '';
  }, [page, q, queryString]);

  useEffect(() => { fetchApoderados(); }, [params, token]);

  const fetchApoderados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/apoderados/listado${params}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await axios.get(`/api/academicos/apoderados/${id}/detalle${queryString}`, { headers: { Authorization: `Bearer ${token}` } });
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
      await axios.put(`/api/academicos/apoderados/${detalle.id_persona}`, form, { headers: { Authorization: `Bearer ${token}` } });
      setEditOpen(false);
      await abrirDetalle(detalle.id_persona);
      await fetchApoderados();
      setMensaje('Datos del apoderado actualizados correctamente.');
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se pudo actualizar el apoderado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Apoderados"
        description="Consulta, revisa y edita los datos generales de apoderados vinculados a alumnos del colegio activo."
        icon={ShieldCheck}
        meta={[{ label: 'Contexto activo', value: scopeLabel }, { label: 'Resultados', value: String(meta.total) }]}
      />

      <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Buscar por DNI, nombre, teléfono, correo, alumno..." className={`${inputClass} pl-11`} />
          </div>
          <button type="button" onClick={() => { setQ(''); setPage(1); }} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50">Limpiar</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center"><Loader2 size={26} className="animate-spin text-accent-500" /></div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center"><ShieldCheck size={34} className="text-slate-300" /><p className="mt-3 text-sm font-black text-slate-600">Sin apoderados</p><p className="mt-1 text-sm text-slate-400">Ajusta los filtros para buscar otro registro.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((apoderado) => {
              const hijo = apoderado.estudiantes?.[0]?.estudiante;
              return (
                <div key={apoderado.id_persona} className="grid gap-4 p-5 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
                  <div><p className="text-sm font-black text-slate-900">{fullName(apoderado.persona)}</p><p className="mt-1 text-xs font-bold text-slate-400">DNI: {apoderado.persona.dni} · {apoderado.persona.telefono || 'Sin teléfono'}</p></div>
                  <div><p className="text-sm font-black text-slate-700">{apoderado.ocupacion || 'Sin ocupación'}</p><p className="mt-1 text-xs font-bold text-slate-400">{apoderado.persona.correo || 'Sin correo'}</p></div>
                  <div><p className="text-sm font-black text-slate-700">{hijo ? `${getCodigo(hijo)} · ${hijo.persona.nombres} ${hijo.persona.apellido_paterno}` : 'Sin hijos visibles'}</p><p className="mt-1 text-xs font-bold text-slate-400">{apoderado.estudiantes?.length || 0} alumno(s) vinculados</p></div>
                  <button type="button" onClick={() => abrirDetalle(apoderado.id_persona)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"><Eye size={16} />Ver</button>
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
              <div><div className="inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-black text-accent-600 ring-1 ring-accent-100">Ficha del apoderado</div><h3 className="mt-3 text-xl font-black text-slate-950">{detalle ? fullName(detalle.persona) : 'Cargando apoderado'}</h3><p className="mt-1 text-sm text-slate-400">Datos personales y alumnos vinculados.</p></div>
              <div className="flex gap-2">{detalle && <button type="button" onClick={abrirEdicion} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"><Edit3 size={15} />Editar</button>}<button type="button" onClick={() => setDetalleOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:bg-slate-100"><X size={18} /></button></div>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? <div className="flex min-h-[280px] items-center justify-center"><Loader2 size={24} className="animate-spin text-accent-500" /></div> : detalle ? (
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
                    {detalle.estudiantes?.length ? <div className="space-y-2">{detalle.estudiantes.map((r) => (
                      <div key={r.estudiante.id_persona} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"><p className="text-sm font-black text-slate-800">{r.parentesco}: {getCodigo(r.estudiante)} · {r.estudiante.persona.nombres} {r.estudiante.persona.apellido_paterno}</p><p className="mt-1 text-xs font-bold text-slate-400">DNI alumno: {r.estudiante.persona.dni} · {r.estudiante.matriculas?.[0]?.estado_matricula || 'Sin matrícula visible'}</p></div>
                    ))}</div> : <p className="text-sm font-bold text-slate-400">Sin alumnos vinculados.</p>}
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
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><h3 className="text-xl font-black text-slate-950">Editar apoderado</h3><p className="mt-1 text-sm text-slate-400">Actualiza los datos generales del apoderado.</p></div><button type="button" onClick={() => setEditOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><X size={18} /></button></div>
            <div className="grid max-h-[72vh] gap-3 overflow-y-auto p-6 md:grid-cols-2">
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
            {mensaje && <div className="mx-6 mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{mensaje}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-100 p-6"><button type="button" onClick={() => setEditOpen(false)} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600">Cancelar</button><button type="button" onClick={guardarEdicion} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}Guardar cambios</button></div>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} /></label>;
}
