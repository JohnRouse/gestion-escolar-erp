import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, BookOpenCheck, CheckCircle2, GraduationCap, Loader2, Plus, Search, Trash2, UserRoundCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

interface DocenteApi { id_persona: number; persona?: { nombres?: string; apellido_paterno?: string; apellido_materno?: string; dni?: string; }; }
interface Curso { id_curso: number; nombre_curso: string; area?: { nombre_area?: string }; }
interface Seccion { id_seccion: number; letra: string; grado?: { nombre_grado?: string; nivel?: { nombre_nivel?: string } }; }
interface Anio { id_anio: number; nombre_anio: string; estado?: string; id_colegio?: number | null; }
interface Asignacion { id_asignacion: number; id_docente: number; id_curso: number; id_seccion: number; id_anio: number; id_colegio?: number | null; docente: string; curso: string; area?: string | null; seccion: string; nivel?: string | null; anio?: string | null; colegio?: string | null; matriculados?: number; evaluaciones?: number; }

const panelClass = 'rounded-[1.5rem] border border-slate-200/70 bg-white/95 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)] ring-1 ring-white/70';
const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300';
const labelClass = 'mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400';

const formatearDocente = (docente: DocenteApi) => {
  const persona = docente.persona;
  return [persona?.nombres, persona?.apellido_paterno, persona?.apellido_materno].filter(Boolean).join(' ') || `Docente #${docente.id_persona}`;
};

const formatearSeccion = (seccion: Seccion) => {
  const grado = seccion.grado;
  const nivel = grado?.nivel;
  return grado ? `${grado.nombre_grado} "${seccion.letra}"${nivel?.nombre_nivel ? ` · ${nivel.nombre_nivel}` : ''}` : `Sección ${seccion.letra}`;
};

export default function AsignacionesDocentesTab() {
  const { token } = useAuth();
  const { tenant, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const colegioConfigId = activeScope.tipo === 'colegio' && activeColegio?.id_colegio ? activeColegio.id_colegio : null;

  const [docentes, setDocentes] = useState<DocenteApi[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [anios, setAnios] = useState<Anio[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [idAnio, setIdAnio] = useState('');
  const [idDocente, setIdDocente] = useState('');
  const [idCurso, setIdCurso] = useState('');
  const [idSeccion, setIdSeccion] = useState('');
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const anioActual = useMemo(() => anios.find((anio) => ['En curso', 'Abierto', 'Planificación'].includes(anio.estado || '')) || anios[0], [anios]);

  const asignacionesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return asignaciones;
    return asignaciones.filter((item) => [item.docente, item.curso, item.seccion, item.nivel, item.anio, item.colegio, item.area].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [asignaciones, search]);

  const loadBase = async () => {
    if (!token) return;
    setLoading(true);
    setMensaje(null);
    try {
      const [docentesRes, cursosRes, seccionesRes, aniosRes] = await Promise.all([
        axios.get('/api/academicos/docentes', authHeader),
        axios.get(`/api/academicos/cursos${queryString}`, authHeader),
        axios.get(`/api/academicos/secciones${queryString}`, authHeader),
        axios.get(`/api/academicos/anios${queryString}`, authHeader),
      ]);
      const listaAnios: Anio[] = aniosRes.data || [];
      setDocentes(docentesRes.data || []);
      setCursos(cursosRes.data || []);
      setSecciones(seccionesRes.data || []);
      setAnios(listaAnios);
      const recomendado = listaAnios.find((anio) => ['En curso', 'Abierto', 'Planificación'].includes(anio.estado || '')) || listaAnios[0];
      if (recomendado) setIdAnio(String(recomendado.id_anio));
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo cargar la información base para asignaciones.' });
    } finally {
      setLoading(false);
    }
  };

  const loadAsignaciones = async (anio = idAnio) => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (queryString.startsWith('?')) {
        const current = new URLSearchParams(queryString.slice(1));
        current.forEach((value, key) => params.set(key, value));
      }
      if (anio) params.set('anio_id', anio);
      const res = await axios.get(`/api/academicos/asignaciones-docentes?${params.toString()}`, authHeader);
      setAsignaciones(res.data || []);
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudieron cargar las asignaciones docentes.' });
    }
  };

  useEffect(() => { loadBase(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, queryString]);
  useEffect(() => { if (idAnio) loadAsignaciones(idAnio); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idAnio, queryString]);

  const crearAsignacion = async () => {
    if (!token) return;
    if (!idAnio || !idDocente || !idCurso || !idSeccion) {
      setMensaje({ type: 'error', text: 'Selecciona año, docente, curso y sección.' });
      return;
    }
    setSaving(true);
    setMensaje(null);
    try {
      await axios.post(`/api/academicos/asignaciones-docentes${queryString}`, { id_anio: Number(idAnio), id_docente: Number(idDocente), id_curso: Number(idCurso), id_seccion: Number(idSeccion), id_colegio: colegioConfigId || undefined, id_tenant: tenant?.id_tenant || undefined }, authHeader);
      await loadAsignaciones(idAnio);
      setIdDocente(''); setIdCurso(''); setIdSeccion('');
      setMensaje({ type: 'success', text: 'Asignación docente creada correctamente.' });
      showToast({ type: 'success', title: 'Asignación creada', message: `El curso quedó asignado para ${scopeLabel}.` });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo crear la asignación docente.' });
    } finally {
      setSaving(false);
    }
  };

  const eliminarAsignacion = async (asignacion: Asignacion) => {
    if (!confirm(`¿Eliminar la asignación de ${asignacion.docente} en ${asignacion.curso} - ${asignacion.seccion}?`)) return;
    try {
      await axios.delete(`/api/academicos/asignaciones-docentes/${asignacion.id_asignacion}${queryString}`, authHeader);
      setAsignaciones((prev) => prev.filter((item) => item.id_asignacion !== asignacion.id_asignacion));
      setMensaje({ type: 'success', text: 'Asignación eliminada correctamente.' });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo eliminar la asignación.' });
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><div className="skeleton h-24 rounded-3xl" /><div className="skeleton h-24 rounded-3xl" /><div className="skeleton h-24 rounded-3xl" /></div><div className="skeleton h-80 rounded-3xl" /></div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div><h3 className="text-lg font-black tracking-[-0.01em] text-slate-950">Asignaciones docentes</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Define qué docente enseña cada curso en una sección y año lectivo. Esta información alimenta Registro de Notas y Asistencia.</p></div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200/70">Contexto: <span className="text-slate-950">{scopeLabel}</span></div>
      </div>

      {mensaje && <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-all duration-300 ${mensaje.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70' : 'bg-red-50 text-red-700 ring-red-200/70'}`}>{mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{mensaje.text}</span></div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Asignaciones</span><UserRoundCheck size={18} className="text-blue-500" /></div><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{asignaciones.length}</p><p className="mt-1 text-sm text-slate-500">Cursos asignados</p></div>
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Docentes</span><UsersRound size={18} className="text-slate-500" /></div><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{docentes.length}</p><p className="mt-1 text-sm text-slate-500">Disponibles</p></div>
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Cursos</span><BookOpenCheck size={18} className="text-violet-500" /></div><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{cursos.length}</p><p className="mt-1 text-sm text-slate-500">Configurados</p></div>
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Año actual</span><GraduationCap size={18} className="text-amber-500" /></div><p className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-slate-950">{anioActual?.nombre_anio || '—'}</p><p className="mt-1 text-sm text-slate-500">{anioActual?.estado || 'Sin estado'}</p></div>
      </div>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4"><h4 className="text-sm font-black text-slate-950">Crear nueva asignación</h4><p className="mt-1 text-sm text-slate-500">Selecciona los cuatro datos principales antes de habilitar notas para un curso.</p></div>
        <div className="grid gap-4 p-5 lg:grid-cols-4">
          <label><span className={labelClass}>Año lectivo</span><select className={inputClass} value={idAnio} onChange={(e) => setIdAnio(e.target.value)}><option value="">Selecciona año</option>{anios.map((anio) => <option key={anio.id_anio} value={anio.id_anio}>{anio.nombre_anio} {anio.estado ? `· ${anio.estado}` : ''}</option>)}</select></label>
          <label><span className={labelClass}>Docente</span><select className={inputClass} value={idDocente} onChange={(e) => setIdDocente(e.target.value)}><option value="">Selecciona docente</option>{docentes.map((docente) => <option key={docente.id_persona} value={docente.id_persona}>{formatearDocente(docente)}</option>)}</select></label>
          <label><span className={labelClass}>Curso</span><select className={inputClass} value={idCurso} onChange={(e) => setIdCurso(e.target.value)}><option value="">Selecciona curso</option>{cursos.map((curso) => <option key={curso.id_curso} value={curso.id_curso}>{curso.nombre_curso}</option>)}</select></label>
          <label><span className={labelClass}>Sección</span><select className={inputClass} value={idSeccion} onChange={(e) => setIdSeccion(e.target.value)}><option value="">Selecciona sección</option>{secciones.map((seccion) => <option key={seccion.id_seccion} value={seccion.id_seccion}>{formatearSeccion(seccion)}</option>)}</select></label>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Si una asignación ya tiene evaluaciones, no podrá eliminarse para proteger las notas registradas.</p><button type="button" onClick={crearAsignacion} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}Asignar docente</button></div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><h4 className="text-sm font-black text-slate-950">Asignaciones registradas</h4><p className="mt-1 text-sm text-slate-500">Estas relaciones aparecerán en Registro de Notas.</p></div><div className="relative w-full max-w-md"><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Buscar docente, curso, sección..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        {asignacionesFiltradas.length === 0 ? <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><UserRoundCheck size={25} /></div><h4 className="text-base font-black text-slate-950">Aún no hay asignaciones para mostrar</h4><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Crea la primera asignación para que Registro de Notas pueda mostrar salones, cursos y alumnos.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100"><th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">Docente</th><th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">Curso</th><th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">Sección</th><th className="px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">Alumnos</th><th className="px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">Evaluaciones</th><th className="px-5 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{asignacionesFiltradas.map((item) => <tr key={item.id_asignacion} className="transition-colors duration-150 hover:bg-slate-50/80"><td className="px-5 py-4"><p className="font-black text-slate-900">{item.docente}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{item.colegio || scopeLabel} · {item.anio || 'Año lectivo'}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.curso}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{item.area || 'Área no definida'}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.seccion}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{item.nivel || 'Nivel'}</p></td><td className="px-5 py-4 text-center"><span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">{item.matriculados || 0}</span></td><td className="px-5 py-4 text-center"><span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{item.evaluaciones || 0}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => eliminarAsignacion(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-all duration-150 hover:bg-red-50 hover:text-red-500" title="Eliminar asignación"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}