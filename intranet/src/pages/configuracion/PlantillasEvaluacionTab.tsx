import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Eye,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

type Alcance = 'institucion' | 'nivel' | 'grado' | 'seccion' | 'curso' | 'asignacion';

interface TipoEval { id_tipo_eval: number; nombre_tipo: string; }
interface Nivel { id_nivel: number; nombre_nivel: string; }
interface Curso { id_curso: number; nombre_curso: string; }
interface ColegioBasico { id_colegio: number; nombre?: string | null; nombre_corto?: string | null; }
interface Anio { id_anio: number; id_colegio?: number | null; nombre_anio: string; estado?: string; colegio?: ColegioBasico | null; }
interface Unidad { id_unidad: number; label: string; bimestre: number; numero: number; estado_abierto: boolean; }
interface Seccion { id_seccion: number; id_colegio?: number | null; letra: string; grado?: { id_grado?: number; nombre_grado?: string; nivel?: { id_nivel?: number; nombre_nivel?: string } }; colegio?: ColegioBasico | null; }
interface Asignacion { id_asignacion: number; id_colegio?: number | null; id_curso: number; id_seccion: number; docente: string; curso: string; seccion: string; nivel?: string | null; grado?: string | null; colegio?: string | null; }
interface PlantillaDetalle { id_detalle?: number; id_tipo_eval: number; descripcion: string; orden: number; tipo?: TipoEval; }
interface Plantilla { id_plantilla: number; nombre: string; id_tenant?: number | null; id_colegio?: number | null; id_nivel?: number | null; id_curso?: number | null; nivel?: Nivel | null; curso?: Curso | null; colegio?: ColegioBasico | null; detalles: PlantillaDetalle[]; }
interface Preview { plantilla: { id_plantilla: number; nombre: string; evaluaciones: number }; cobertura: { total: number; cubiertas: number; faltantes: number; porcentaje: number; estado: string; asignaciones: any[]; faltantes_agrupadas: any[]; }; }

type ModalState = { mode: 'create' } | { mode: 'edit'; plantilla: Plantilla };

const panelClass = 'rounded-[1.5rem] border border-slate-200/70 bg-white/95 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)] ring-1 ring-white/70';
const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300';
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400';

const detalleVacio = (orden: number, tipoDefault?: number): PlantillaDetalle => ({ id_tipo_eval: tipoDefault || 0, descripcion: '', orden });

export default function PlantillasEvaluacionTab() {
  const { token } = useAuth();
  const { tenant, colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [tipos, setTipos] = useState<TipoEval[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [anios, setAnios] = useState<Anio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const [nombre, setNombre] = useState('');
  const [idNivel, setIdNivel] = useState('');
  const [idCurso, setIdCurso] = useState('');
  const [detalles, setDetalles] = useState<PlantillaDetalle[]>([]);

  const [colegioGestionId, setColegioGestionId] = useState('');
  const [idAnio, setIdAnio] = useState('');
  const [idUnidad, setIdUnidad] = useState('');
  const [idPlantillaAplicar, setIdPlantillaAplicar] = useState('');
  const [alcance, setAlcance] = useState<Alcance>('institucion');
  const [fNivel, setFNivel] = useState('');
  const [fGrado, setFGrado] = useState('');
  const [fSeccion, setFSeccion] = useState('');
  const [fCurso, setFCurso] = useState('');
  const [fAsignacion, setFAsignacion] = useState('');

  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;
  const colegioSeleccionadoId = Number(mostrarSelectorInstitucion ? colegioGestionId : activeColegio?.id_colegio || colegioGestionId || colegios[0]?.id_colegio || 0);
  const tipoDefault = tipos[0]?.id_tipo_eval;

  const nombreColegio = (id?: number | null) => {
    if (!id) return 'Institución no definida';
    const colegio = colegios.find((item) => item.id_colegio === id);
    return colegio?.nombre || colegio?.nombre_corto || `Institución #${id}`;
  };

  const aniosFiltrados = useMemo(() => anios.filter((anio) => !colegioSeleccionadoId || anio.id_colegio === colegioSeleccionadoId || !anio.id_colegio), [anios, colegioSeleccionadoId]);
  const cursosFiltrados = useMemo(() => cursos.filter((curso: any) => !colegioSeleccionadoId || !curso.id_colegio || curso.id_colegio === colegioSeleccionadoId), [cursos, colegioSeleccionadoId]);
  const seccionesFiltradas = useMemo(() => secciones.filter((sec) => !colegioSeleccionadoId || sec.id_colegio === colegioSeleccionadoId), [secciones, colegioSeleccionadoId]);
  const gradosDisponibles = useMemo(() => {
    const map = new Map<string, { id_grado: number; nombre_grado: string; nivel?: string }>();
    seccionesFiltradas.forEach((sec) => {
      const id = sec.grado?.id_grado;
      if (id && !map.has(String(id))) map.set(String(id), { id_grado: id, nombre_grado: sec.grado?.nombre_grado || `Grado #${id}`, nivel: sec.grado?.nivel?.nombre_nivel });
    });
    return Array.from(map.values());
  }, [seccionesFiltradas]);

  const plantillasFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return plantillas;
    return plantillas.filter((p) => [p.nombre, p.nivel?.nombre_nivel, p.curso?.nombre_curso, ...(p.detalles || []).map((d) => d.descripcion)].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [plantillas, search]);

  const payloadAplicacion = () => ({
    id_anio: Number(idAnio),
    id_unidad: Number(idUnidad),
    id_colegio: colegioSeleccionadoId || undefined,
    alcance,
    id_nivel: fNivel ? Number(fNivel) : undefined,
    id_grado: fGrado ? Number(fGrado) : undefined,
    id_seccion: fSeccion ? Number(fSeccion) : undefined,
    id_curso: fCurso ? Number(fCurso) : undefined,
    id_asignacion: fAsignacion ? Number(fAsignacion) : undefined,
  });

  const queryConColegio = () => {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');
    if (colegioSeleccionadoId) params.set('colegio_id', String(colegioSeleccionadoId));
    return `?${params.toString()}`;
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setMensaje(null);
    try {
      const [plantillasRes, tiposRes, nivelesRes, cursosRes, seccionesRes, aniosRes] = await Promise.all([
        axios.get(`/api/plantillas${queryString}`, authHeader),
        axios.get(`/api/calificaciones/tipos-evaluacion${queryString}`, authHeader),
        axios.get(`/api/academicos/niveles${queryString}`, authHeader),
        axios.get(`/api/academicos/cursos${queryString}`, authHeader),
        axios.get(`/api/academicos/secciones${queryString}`, authHeader),
        axios.get(`/api/academicos/anios${queryString}`, authHeader),
      ]);
      setPlantillas(Array.isArray(plantillasRes.data) ? plantillasRes.data : []);
      setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
      setNiveles(Array.isArray(nivelesRes.data) ? nivelesRes.data : []);
      setCursos(Array.isArray(cursosRes.data) ? cursosRes.data : []);
      setSecciones(Array.isArray(seccionesRes.data) ? seccionesRes.data : []);
      setAnios(Array.isArray(aniosRes.data) ? aniosRes.data : []);
      const colegioInicial = activeScope.tipo === 'colegio' ? activeColegio?.id_colegio : colegios[0]?.id_colegio;
      if (colegioInicial) setColegioGestionId(String(colegioInicial));
    } catch (error) {
      setMensaje({ type: 'error', text: 'No se pudieron cargar las plantillas de evaluación.' });
    } finally { setLoading(false); }
  };

  const loadUnidades = async (anio = idAnio) => {
    if (!token || !anio) { setUnidades([]); return; }
    try {
      const res = await axios.get(`/api/plantillas/unidades?anio_id=${anio}`, authHeader);
      const data = Array.isArray(res.data) ? res.data : [];
      setUnidades(data);
      setIdUnidad((current) => current || String(data[0]?.id_unidad || ''));
    } catch { setUnidades([]); }
  };

  const loadAsignaciones = async () => {
    if (!token || !colegioSeleccionadoId || !idAnio) return;
    const params = new URLSearchParams(queryConColegio().slice(1));
    params.set('anio_id', idAnio);
    const res = await axios.get(`/api/academicos/asignaciones-docentes?${params.toString()}`, authHeader);
    setAsignaciones(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => { loadData(); }, [token, queryString]);
  useEffect(() => {
    const recomendado = aniosFiltrados.find((anio) => ['En curso', 'Abierto', 'Planificación'].includes(anio.estado || '')) || aniosFiltrados[0];
    setIdAnio(recomendado ? String(recomendado.id_anio) : '');
    setIdUnidad(''); setPreview(null);
  }, [colegioSeleccionadoId, anios.length]);
  useEffect(() => { loadUnidades(idAnio); loadAsignaciones(); }, [idAnio, colegioSeleccionadoId]);

  const resetForm = () => {
    setNombre(''); setIdNivel(''); setIdCurso('');
    setDetalles([detalleVacio(1, tipoDefault), detalleVacio(2, tipoDefault), detalleVacio(3, tipoDefault)]);
  };
  const openCreate = () => { setModal({ mode: 'create' }); setMensaje(null); resetForm(); };
  const openEdit = (plantilla: Plantilla) => {
    setModal({ mode: 'edit', plantilla }); setMensaje(null);
    setNombre(plantilla.nombre || ''); setIdNivel(plantilla.id_nivel ? String(plantilla.id_nivel) : ''); setIdCurso(plantilla.id_curso ? String(plantilla.id_curso) : '');
    setDetalles(plantilla.detalles?.length ? plantilla.detalles.slice().sort((a, b) => a.orden - b.orden).map((d, i) => ({ id_tipo_eval: d.id_tipo_eval || d.tipo?.id_tipo_eval || tipoDefault || 0, descripcion: d.descripcion || '', orden: d.orden || i + 1 })) : [detalleVacio(1, tipoDefault)]);
  };
  const closeModal = () => { if (!saving) { setModal(null); resetForm(); } };
  const renumerarDetalles = (items: PlantillaDetalle[]) =>
    items.map((detalle, index) => ({ ...detalle, orden: index + 1 }));

  const addDetalle = () =>
    setDetalles((current) => renumerarDetalles([...current, detalleVacio(current.length + 1, tipoDefault)]));

  const updateDetalle = (index: number, patch: Partial<PlantillaDetalle>) =>
    setDetalles((current) => current.map((detalle, idx) => idx === index ? { ...detalle, ...patch } : detalle));

  const removeDetalle = (index: number) =>
    setDetalles((current) => renumerarDetalles(current.filter((_, idx) => idx !== index)));

  const moveDetalle = (index: number, direction: 'up' | 'down') => {
    setDetalles((current) => {
      const next = [...current];
      const target = direction === 'up' ? index - 1 : index + 1;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return renumerarDetalles(next);
    });
  };

  const handleSave = async () => {
    if (!token || !modal) return;
    const cleanDetalles = detalles.map((d, i) => ({ id_tipo_eval: Number(d.id_tipo_eval), descripcion: d.descripcion.trim(), orden: i + 1 })).filter((d) => d.id_tipo_eval && d.descripcion);
    if (!nombre.trim()) return setMensaje({ type: 'error', text: 'Escribe el nombre de la plantilla.' });
    if (!cleanDetalles.length) return setMensaje({ type: 'error', text: 'Agrega al menos una evaluación a la plantilla.' });
    const payload = { nombre: nombre.trim(), id_tenant: tenant?.id_tenant || undefined, id_colegio: colegioSeleccionadoId || undefined, id_nivel: idNivel ? Number(idNivel) : null, id_curso: idCurso ? Number(idCurso) : null, detalles: cleanDetalles };
    setSaving(true);
    try {
      if (modal.mode === 'edit') await axios.put(`/api/plantillas/${modal.plantilla.id_plantilla}`, payload, authHeader);
      else await axios.post('/api/plantillas', payload, authHeader);
      await loadData(); setModal(null); resetForm(); setMensaje({ type: 'success', text: 'Plantilla guardada correctamente.' });
      showToast({ type: 'success', title: 'Plantilla guardada', message: 'La plantilla quedó lista para aplicarse.' });
    } catch (error: any) { setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo guardar la plantilla.' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (plantilla: Plantilla) => {
    if (!confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) return;
    try { await axios.delete(`/api/plantillas/${plantilla.id_plantilla}`, authHeader); setPlantillas((c) => c.filter((p) => p.id_plantilla !== plantilla.id_plantilla)); }
    catch (error: any) { setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo eliminar la plantilla.' }); }
  };

  const revisarCobertura = async () => {
    if (!idPlantillaAplicar || !idAnio || !idUnidad) return setMensaje({ type: 'error', text: 'Selecciona plantilla, año y unidad.' });
    setApplying(true); setPreview(null);
    try {
      const res = await axios.post(`/api/plantillas/${idPlantillaAplicar}/previsualizar`, payloadAplicacion(), authHeader);
      setPreview(res.data);
    } catch (error: any) { setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo revisar la cobertura.' }); }
    finally { setApplying(false); }
  };

  const aplicarPlantilla = async () => {
    if (!preview) return revisarCobertura();

    if (preview.cobertura.faltantes <= 0) {
      setMensaje({
        type: 'success',
        text: 'No hay asignaciones pendientes. La cobertura de esta plantilla ya está completa.',
      });
      return;
    }

    setConfirmApplyOpen(true);
  };

  const confirmarAplicacionPlantilla = async () => {
    if (!preview) return;

    setApplying(true);
    setMensaje(null);

    try {
      const res = await axios.post(`/api/plantillas/${idPlantillaAplicar}/aplicar-alcance`, payloadAplicacion(), authHeader);
      setPreview({ plantilla: preview.plantilla, cobertura: res.data.cobertura });
      setConfirmApplyOpen(false);
      showToast({ type: 'success', title: 'Plantilla aplicada', message: `${res.data.evaluacionesCreadas} evaluaciones creadas y ${res.data.notasCreadas} notas iniciales en 00.` });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo aplicar la plantilla.' });
    } finally {
      setApplying(false);
    }
  };

  const resetFiltrosAlcance = (next: Alcance) => { setAlcance(next); setFNivel(''); setFGrado(''); setFSeccion(''); setFCurso(''); setFAsignacion(''); setPreview(null); };

  if (loading) return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><div className="skeleton h-24 rounded-3xl"/><div className="skeleton h-24 rounded-3xl"/><div className="skeleton h-24 rounded-3xl"/></div><div className="skeleton h-72 rounded-3xl"/></div>;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <style>{`@keyframes softFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.soft-fade-up{animation:softFadeUp .28s ease-out both}`}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between soft-fade-up">
        <div><h3 className="text-lg font-black tracking-[-0.01em] text-slate-950">Plantillas de evaluación</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Dirección crea plantillas, revisa cobertura y las aplica antes de que los docentes registren notas.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"><Plus size={17}/> Nueva plantilla</button>
      </div>

      {mensaje && !modal && <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold soft-fade-up ${mensaje.type==='success'?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-red-200 bg-red-50 text-red-700'}`}>{mensaje.type==='success'?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {mensaje.text}</div>}

      <div className="grid gap-3 md:grid-cols-3 soft-fade-up">
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Plantillas</span><ClipboardList size={18} className="text-blue-500"/></div><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{plantillas.length}</p><p className="mt-1 text-sm text-slate-500">Configuradas para {scopeLabel}</p></div>
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Evaluaciones</span><Layers3 size={18} className="text-violet-500"/></div><p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{plantillas.reduce((t,p)=>t+(p.detalles?.length||0),0)}</p><p className="mt-1 text-sm text-slate-500">Columnas base configuradas</p></div>
        <div className={`${panelClass} p-4`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Cobertura</span><ShieldCheck size={18} className="text-emerald-500"/></div><p className="mt-3 text-xl font-black text-slate-950">{preview ? `${preview.cobertura.cubiertas}/${preview.cobertura.total}` : 'Por revisar'}</p><p className="mt-1 text-sm text-slate-500">Asignaciones con plantilla</p></div>
      </div>

      <section className={`${panelClass} overflow-hidden soft-fade-up`}>
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4"><h4 className="text-sm font-black text-slate-950">Aplicar plantilla</h4><p className="mt-1 text-sm text-slate-500">Elige el alcance. El sistema revisará qué asignaciones ya tienen evaluaciones y cuáles faltan.</p></div>
        <div className="grid gap-4 p-5 lg:grid-cols-4">
          {mostrarSelectorInstitucion && <label><span className={labelClass}>Institución</span><select className={inputClass} value={colegioGestionId} onChange={(e)=>{setColegioGestionId(e.target.value);setPreview(null);}}>{colegios.map(c=><option key={c.id_colegio} value={c.id_colegio}>{c.nombre||c.nombre_corto}</option>)}</select></label>}
          <label><span className={labelClass}>Plantilla</span><select className={inputClass} value={idPlantillaAplicar} onChange={(e)=>{setIdPlantillaAplicar(e.target.value);setPreview(null);}}><option value="">Selecciona plantilla</option>{plantillas.map(p=><option key={p.id_plantilla} value={p.id_plantilla}>{p.nombre}</option>)}</select></label>
          <label><span className={labelClass}>Año lectivo</span><select className={inputClass} value={idAnio} onChange={(e)=>{setIdAnio(e.target.value);setIdUnidad('');setPreview(null);}}><option value="">Selecciona año</option>{aniosFiltrados.map(a=><option key={a.id_anio} value={a.id_anio}>{a.nombre_anio}</option>)}</select></label>
          <label><span className={labelClass}>Unidad</span><select className={inputClass} value={idUnidad} onChange={(e)=>{setIdUnidad(e.target.value);setPreview(null);}}><option value="">Selecciona unidad</option>{unidades.map(u=><option key={u.id_unidad} value={u.id_unidad}>{u.label}</option>)}</select></label>
          <label><span className={labelClass}>Aplicar a</span><select className={inputClass} value={alcance} onChange={(e)=>resetFiltrosAlcance(e.target.value as Alcance)}><option value="institucion">Toda la institución</option><option value="nivel">Un nivel</option><option value="grado">Un grado</option><option value="seccion">Una sección</option><option value="curso">Un curso</option><option value="asignacion">Asignación específica</option></select></label>
          {alcance==='nivel' && <label><span className={labelClass}>Nivel</span><select className={inputClass} value={fNivel} onChange={(e)=>setFNivel(e.target.value)}><option value="">Selecciona nivel</option>{niveles.map(n=><option key={n.id_nivel} value={n.id_nivel}>{n.nombre_nivel}</option>)}</select></label>}
          {alcance==='grado' && <label><span className={labelClass}>Grado</span><select className={inputClass} value={fGrado} onChange={(e)=>setFGrado(e.target.value)}><option value="">Selecciona grado</option>{gradosDisponibles.map(g=><option key={g.id_grado} value={g.id_grado}>{g.nombre_grado}{g.nivel?` · ${g.nivel}`:''}</option>)}</select></label>}
          {alcance==='seccion' && <label><span className={labelClass}>Sección</span><select className={inputClass} value={fSeccion} onChange={(e)=>setFSeccion(e.target.value)}><option value="">Selecciona sección</option>{seccionesFiltradas.map(s=><option key={s.id_seccion} value={s.id_seccion}>{s.grado?.nombre_grado} "{s.letra}" · {s.grado?.nivel?.nombre_nivel}</option>)}</select></label>}
          {alcance==='curso' && <label><span className={labelClass}>Curso</span><select className={inputClass} value={fCurso} onChange={(e)=>setFCurso(e.target.value)}><option value="">Selecciona curso</option>{cursosFiltrados.map(c=><option key={c.id_curso} value={c.id_curso}>{c.nombre_curso}</option>)}</select></label>}
          {alcance==='asignacion' && <label className="lg:col-span-2"><span className={labelClass}>Asignación</span><select className={inputClass} value={fAsignacion} onChange={(e)=>setFAsignacion(e.target.value)}><option value="">Selecciona asignación</option>{asignaciones.map(a=><option key={a.id_asignacion} value={a.id_asignacion}>{a.curso} · {a.seccion} · {a.docente}</option>)}</select></label>}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Primero revisa cobertura. Luego aplica solo a las asignaciones pendientes.</p><div className="flex gap-2"><button type="button" onClick={revisarCobertura} disabled={applying} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50"><Eye size={17}/> Revisar cobertura</button><button type="button" onClick={aplicarPlantilla} disabled={applying || !preview || preview.cobertura.faltantes===0} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50">{applying?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Aplicar plantilla</button></div></div>
      </section>

      {preview && <section className={`${panelClass} overflow-hidden soft-fade-up`}><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><h4 className="text-sm font-black text-slate-950">Cobertura de plantilla</h4><p className="mt-1 text-sm text-slate-500">{preview.plantilla.nombre} · {preview.plantilla.evaluaciones} evaluaciones</p></div><div className={`rounded-2xl px-4 py-2 text-sm font-black ring-1 ${preview.cobertura.estado==='completo'?'bg-emerald-50 text-emerald-700 ring-emerald-100':preview.cobertura.estado==='pendiente'?'bg-amber-50 text-amber-700 ring-amber-100':'bg-blue-50 text-blue-700 ring-blue-100'}`}>{preview.cobertura.estado==='completo'?'Todo listo':preview.cobertura.estado==='sin_asignaciones'?'Sin asignaciones':preview.cobertura.estado==='pendiente'?'Pendiente':'Parcial'} · {preview.cobertura.cubiertas}/{preview.cobertura.total}</div></div><div className="grid gap-3 p-5 md:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Total</p><p className="mt-2 text-3xl font-black text-slate-950">{preview.cobertura.total}</p></div><div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-500">Cubiertas</p><p className="mt-2 text-3xl font-black text-emerald-700">{preview.cobertura.cubiertas}</p></div><div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-500">Faltantes</p><p className="mt-2 text-3xl font-black text-amber-700">{preview.cobertura.faltantes}</p></div></div>{preview.cobertura.faltantes_agrupadas?.length>0 && <div className="space-y-3 border-t border-slate-100 p-5"><h5 className="text-sm font-black text-slate-950">Asignaciones pendientes</h5>{preview.cobertura.faltantes_agrupadas.map((grupo:any)=><div key={grupo.key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><p className="text-sm font-black text-slate-800">{grupo.nivel || 'Nivel'} · {grupo.grado || 'Grado'}</p><div className="mt-2 space-y-2">{grupo.items.map((item:any)=><p key={item.id_asignacion} className="text-sm text-slate-600">{item.seccion} · {item.curso} · {item.docente}</p>)}</div></div>)}</div>}</section>}

      <div className={`${panelClass} p-4 soft-fade-up`}><div className="relative max-w-md"><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Buscar plantilla, curso, nivel o evaluación..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div></div>
      {plantillasFiltradas.length===0 ? <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center soft-fade-up`}><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><ClipboardList size={25}/></div><h4 className="text-base font-black text-slate-900">No hay plantillas para mostrar</h4><p className="mt-1 max-w-md text-sm text-slate-500">Crea una plantilla inicial para que pueda aplicarse a cursos, niveles o a toda una institución.</p></div> : <div className="grid gap-4 xl:grid-cols-2 soft-fade-up">{plantillasFiltradas.map((plantilla)=><article key={plantilla.id_plantilla} className={`${panelClass} overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-50px_rgba(15,23,42,0.65)]`}><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div className="min-w-0"><h4 className="truncate text-base font-black text-slate-950">{plantilla.nombre}</h4><p className="mt-1 text-sm text-slate-500">{plantilla.curso?.nombre_curso || plantilla.nivel?.nombre_nivel || 'Alcance general'}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={()=>openEdit(plantilla)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"><Pencil size={16}/></button><button type="button" onClick={()=>handleDelete(plantilla)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={16}/></button></div></div><div className="space-y-2 px-5 py-4">{(plantilla.detalles||[]).slice().sort((a,b)=>a.orden-b.orden).map((detalle,index)=><div key={`${plantilla.id_plantilla}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"><div><p className="text-sm font-bold text-slate-900">{String(index+1).padStart(2,'0')}. {detalle.descripcion}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{detalle.tipo?.nombre_tipo || 'Tipo no especificado'}</p></div></div>)}</div></article>)}</div>}

      {modal && <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeModal}/><div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200 soft-fade-up"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100"><ClipboardList size={13}/> {modal.mode==='edit'?'Editar plantilla':'Nueva plantilla'}</div><h2 className="mt-3 text-xl font-black text-slate-950">Plantilla de evaluación</h2><p className="mt-1 text-sm text-slate-500">Configura las columnas iniciales que usará Dirección al aplicar plantillas.</p></div><button type="button" onClick={closeModal} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={17}/></button></div><div className="space-y-5 overflow-y-auto px-6 py-5">{mensaje && modal && <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${mensaje.type==='error'?'bg-red-50 text-red-700 ring-1 ring-red-100':'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}>{mensaje.text}</div>}<div className="grid gap-4 md:grid-cols-3"><label className="block md:col-span-3"><span className={labelClass}>Nombre de la plantilla</span><input className={inputClass} value={nombre} onChange={(e)=>setNombre(e.target.value)} placeholder="Ej. Plantilla general de Comunicación"/></label><label className="block"><span className={labelClass}>Nivel sugerido</span><select className={inputClass} value={idNivel} onChange={(e)=>setIdNivel(e.target.value)}><option value="">Todos los niveles</option>{niveles.map(n=><option key={n.id_nivel} value={n.id_nivel}>{n.nombre_nivel}</option>)}</select></label><label className="block md:col-span-2"><span className={labelClass}>Curso sugerido</span><select className={inputClass} value={idCurso} onChange={(e)=>setIdCurso(e.target.value)}><option value="">Todos los cursos</option>{cursos.map(c=><option key={c.id_curso} value={c.id_curso}>{c.nombre_curso}</option>)}</select></label></div><div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-950">Evaluaciones iniciales</p><p className="mt-1 text-xs font-semibold text-slate-500">Estas columnas aparecerán en Registro de Notas cuando Dirección aplique la plantilla.</p></div><button type="button" onClick={addDetalle} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700"><Plus size={15}/> Agregar</button></div><div className="space-y-3">
                  {detalles.map((detalle,index)=>(
                    <div key={index} className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 md:grid-cols-[72px_140px_1fr_94px_44px]">
                      <div className="flex h-11 items-center justify-center rounded-2xl bg-slate-50 text-sm font-black tabular-nums text-slate-700 ring-1 ring-slate-100">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <select className={inputClass} value={detalle.id_tipo_eval||''} onChange={(e)=>updateDetalle(index,{id_tipo_eval:Number(e.target.value)})}>
                        <option value="">Tipo</option>
                        {tipos.map(t=><option key={t.id_tipo_eval} value={t.id_tipo_eval}>{t.nombre_tipo}</option>)}
                      </select>
                      <input className={inputClass} value={detalle.descripcion} onChange={(e)=>updateDetalle(index,{descripcion:e.target.value})} placeholder={`Evaluación ${index + 1}: Cuaderno, Práctica 1, Examen...`}/>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={()=>moveDetalle(index,'up')} disabled={index===0} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30" title="Subir evaluación">
                          <ArrowUp size={15}/>
                        </button>
                        <button type="button" onClick={()=>moveDetalle(index,'down')} disabled={index===detalles.length-1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30" title="Bajar evaluación">
                          <ArrowDown size={15}/>
                        </button>
                      </div>
                      <button type="button" onClick={()=>removeDetalle(index)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-300 transition hover:bg-red-50 hover:text-red-500" disabled={detalles.length===1}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div></div></div><div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-200">Cancelar</button><button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60">{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Guardar plantilla</button></div></div></div>}
      {confirmApplyOpen && preview && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => !applying && setConfirmApplyOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200 soft-fade-up">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                <ShieldCheck size={13} /> Confirmar aplicación
              </div>
              <h3 className="mt-3 text-xl font-black tracking-[-0.02em] text-slate-950">Aplicar plantilla</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Se aplicará <strong>{preview.plantilla.nombre}</strong> a las asignaciones pendientes de la cobertura revisada.
              </p>
            </div>

            <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{preview.cobertura.total}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Cubiertas</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{preview.cobertura.cubiertas}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Pendientes</p>
                <p className="mt-2 text-2xl font-black text-amber-700">{preview.cobertura.faltantes}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/80 px-5 py-4 mx-6 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
              Al confirmar, el sistema creará las evaluaciones y las notas iniciales en <strong>00</strong> para los alumnos matriculados o activos.
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmApplyOpen(false)}
                disabled={applying}
                className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAplicacionPlantilla}
                disabled={applying}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {applying ? <Loader2 size={17} className="animate-spin"/> : <ShieldCheck size={17}/>}
                {applying ? 'Aplicando...' : 'Sí, aplicar plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}