import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Eye,
  Loader2,
  MessageSquareText,
  Printer,
  Save,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';

type Literal = '' | 'AD' | 'A' | 'B' | 'C';

type Anio = { id_anio: number; nombre_anio: string; estado: string; colegio: string; id_colegio: number | null };
type Periodo = { id_bimestre: number; numero: number; label: string };
type Salon = { id_seccion: number; label: string; colegio: string; grado: string; nivel: string; matriculados: number };
type Panel = {
  anios: Anio[];
  selected_anio_id: number | null;
  periodos: Periodo[];
  salones: Salon[];
  permisos: { puede_exportar: boolean; puede_editar_cierre: boolean; es_tutor: boolean };
};
type AlumnoLista = {
  id_matricula: number;
  codigo: string;
  alumno: string;
  avatar_url?: string | null;
  promedio: number | null;
  cursos_desaprobados: number;
  conducta_pendiente: number;
  familia_pendiente: number;
  comentario_pendiente: boolean;
  estado_cierre: string;
};
type Criterio = { id_criterio: number; descripcion: string; tipo: string; valor: Literal };
type Evaluacion = { id_evaluacion_det: number; descripcion: string; grupo: string; nota: number };
type Curso = { id_asignacion: number; curso: string; area: string; docente: string; promedio: number | null; evaluaciones: Evaluacion[] };
type Detalle = {
  alumno: { id_matricula: number; codigo: string; nombre: string; avatar_url?: string | null; colegio: string; salon: string; anio: string };
  estadistica: { promedio_general: number | null; puntaje: number; cursos_desaprobados: number; orden_merito: number | null; total_alumnos: number; tercio: string };
  cursos: Curso[];
  conducta: Criterio[];
  participacion_familiar: Criterio[];
  comentario: string;
  cierre?: {
    estado: string;
    actualizado_en: string | null;
    registrado_por: string | null;
  };
};

const panelVacio: Panel = {
  anios: [],
  selected_anio_id: null,
  periodos: [],
  salones: [],
  permisos: { puede_exportar: false, puede_editar_cierre: false, es_tutor: false },
};

const escala: { value: Literal; label: string }[] = [
  { value: '', label: 'Pendiente' },
  { value: 'AD', label: 'AD - Logro destacado' },
  { value: 'A', label: 'A - Logro esperado' },
  { value: 'B', label: 'B - En proceso' },
  { value: 'C', label: 'C - En inicio' },
];

function headers(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function assetUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `/api${url}`;
  if (url.startsWith('uploads/')) return `/api/${url}`;
  return url;
}

function iniciales(nombre?: string | null) {
  return String(nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AL';
}

function nota(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return String(Math.round(Number(value))).padStart(2, '0');
}

function fechaHora(value?: string | null) {
  if (!value) return 'Sin guardado previo';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin guardado previo';

  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function notaClass(value: number | null | undefined) {
  if (value === null || value === undefined) return 'bg-slate-50 text-slate-400 ring-slate-200';
  return Number(value) <= 10 ? 'bg-red-50 text-red-600 ring-red-200' : 'bg-blue-50 text-blue-700 ring-blue-200';
}

function grupoClass(grupo: string) {
  const normal = grupo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (normal.includes('PRACTICA')) return 'bg-indigo-50 text-indigo-700 ring-indigo-100';
  if (normal.includes('EXAMEN')) return 'bg-rose-50 text-rose-700 ring-rose-100';
  return 'bg-amber-50 text-amber-700 ring-amber-100';
}

export default function TutoriaPage() {
  const { token, user } = useAuth();
  const { queryParams, scopeLabel, activeScope } = useSchool();

  const [panel, setPanel] = useState<Panel>(panelVacio);
  const [anioId, setAnioId] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [salonId, setSalonId] = useState<number | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoLista[]>([]);
  const [matriculaId, setMatriculaId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [cursoAbierto, setCursoAbierto] = useState<number | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmGuardar, setConfirmGuardar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmExportarAlumno, setConfirmExportarAlumno] = useState(false);
  const [exportingSalon, setExportingSalon] = useState(false);
  const [confirmExportarSalon, setConfirmExportarSalon] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [filtroAlumnos, setFiltroAlumnos] = useState<'todos' | 'pendientes' | 'listos'>('todos');

  const puedeExportar = panel.permisos.puede_exportar || ['Admin', 'Director'].includes(user?.rol || '');
  const puedeEditar = panel.permisos.puede_editar_cierre || ['Admin', 'Director'].includes(user?.rol || '');
  const periodo = panel.periodos.find((item) => item.id_bimestre === periodoId) || null;

  const alumnoTienePendientes = (alumno: AlumnoLista) =>
    alumno.comentario_pendiente ||
    alumno.conducta_pendiente > 0 ||
    alumno.familia_pendiente > 0;

  const alumnosFiltrados = useMemo(() => {
    if (filtroAlumnos === 'pendientes') return alumnos.filter(alumnoTienePendientes);
    if (filtroAlumnos === 'listos') return alumnos.filter((alumno) => !alumnoTienePendientes(alumno));
    return alumnos;
  }, [alumnos, filtroAlumnos]);

  const pendientesSalon = useMemo(() => {
    const pendientes = alumnos.filter(alumnoTienePendientes);

    return {
      total: pendientes.length,
      listos: alumnos.length - pendientes.length,
      comentarios: alumnos.filter((alumno) => alumno.comentario_pendiente).length,
      conducta: alumnos.filter((alumno) => alumno.conducta_pendiente > 0).length,
      familia: alumnos.filter((alumno) => alumno.familia_pendiente > 0).length,
    };
  }, [alumnos]);

  const resumen = useMemo(() => {
    const promedios = alumnos.map((a) => a.promedio).filter((v): v is number => v !== null && v !== undefined);
    return {
      total: alumnos.length,
      promedio: promedios.length ? Math.round(promedios.reduce((s, n) => s + n, 0) / promedios.length) : null,
      comentarios: alumnos.filter((a) => a.comentario_pendiente).length,
      conducta: alumnos.filter((a) => a.conducta_pendiente > 0).length,
      familia: alumnos.filter((a) => a.familia_pendiente > 0).length,
    };
  }, [alumnos]);

  const cargarPanel = useCallback(async (idAnio?: number | null) => {
    if (!token) return;
    setLoadingPanel(true);
    setMensaje(null);
    try {
      const res = await axios.get<Panel>('/api/tutoria/panel', {
        headers: headers(token),
        params: { ...queryParams, ...(idAnio ? { anio_id: idAnio } : {}) },
      });
      const data = res.data || panelVacio;
      setPanel(data);
      setAnioId(data.selected_anio_id);
      setPeriodoId((prev) => (prev && data.periodos.some((p) => p.id_bimestre === prev) ? prev : data.periodos[0]?.id_bimestre ?? null));
      setSalonId((prev) => (prev && data.salones.some((s) => s.id_seccion === prev) ? prev : data.salones[0]?.id_seccion ?? null));
    } catch (err: any) {
      setPanel(panelVacio);
      setAnioId(null); setPeriodoId(null); setSalonId(null); setMatriculaId(null); setDetalle(null); setAlumnos([]);
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo cargar el módulo de Tutoría.' });
    } finally {
      setLoadingPanel(false);
    }
  }, [queryParams, token]);

  useEffect(() => {
    setPanel(panelVacio); setAnioId(null); setPeriodoId(null); setSalonId(null); setMatriculaId(null); setDetalle(null); setAlumnos([]); setFiltroAlumnos('todos');
    cargarPanel(null);
  }, [activeScope.tipo, activeScope.id_colegio, cargarPanel]);

  const cargarAlumnos = useCallback(async () => {
    if (!token || !salonId || !anioId || !periodoId) { setAlumnos([]); setMatriculaId(null); setDetalle(null); return; }
    setLoadingAlumnos(true);
    try {
      const res = await axios.get<AlumnoLista[]>(`/api/tutoria/salones/${salonId}/alumnos`, {
        headers: headers(token),
        params: { id_anio: anioId, id_bimestre: periodoId },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setAlumnos(rows);
      setMatriculaId((prev) => (prev && rows.some((a) => a.id_matricula === prev) ? prev : rows[0]?.id_matricula ?? null));
    } catch (err: any) {
      setAlumnos([]); setMatriculaId(null); setDetalle(null);
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudieron cargar los alumnos.' });
    } finally {
      setLoadingAlumnos(false);
    }
  }, [anioId, periodoId, salonId, token]);

  useEffect(() => { cargarAlumnos(); }, [cargarAlumnos]);

  const cargarDetalle = useCallback(async () => {
    if (!token || !matriculaId || !periodoId) { setDetalle(null); return; }
    setLoadingDetalle(true);
    setCursoAbierto(null);
    try {
      const res = await axios.get<Detalle>(`/api/tutoria/alumnos/${matriculaId}/resumen`, {
        headers: headers(token),
        params: { id_bimestre: periodoId },
      });
      setDetalle(res.data);
      setCursoAbierto(res.data?.cursos?.[0]?.id_asignacion ?? null);
    } catch (err: any) {
      setDetalle(null);
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo cargar el resumen del alumno.' });
    } finally {
      setLoadingDetalle(false);
    }
  }, [matriculaId, periodoId, token]);

  useEffect(() => { cargarDetalle(); }, [cargarDetalle]);

  const cambiarCriterio = (grupo: 'conducta' | 'participacion_familiar', id: number, valor: Literal) => {
    setDetalle((actual) => actual ? { ...actual, [grupo]: actual[grupo].map((c) => c.id_criterio === id ? { ...c, valor } : c) } : actual);
  };

  const ejecutarGuardar = async () => {
    if (!token || !detalle || !periodoId || !puedeEditar) return;
    setSaving(true);
    setMensaje(null);
    try {
      await axios.put(`/api/tutoria/alumnos/${detalle.alumno.id_matricula}/cierre`, {
        id_bimestre: periodoId,
        comentario: detalle.comentario,
        conducta: detalle.conducta.map((c) => ({ id_criterio: c.id_criterio, valor: c.valor || null })),
        participacion_familiar: detalle.participacion_familiar.map((c) => ({ id_criterio: c.id_criterio, valor: c.valor || null })),
      }, { headers: headers(token) });
      setMensaje({ tipo: 'exito', texto: 'Cierre de tutoría guardado correctamente.' });
      await cargarAlumnos();
      await cargarDetalle();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo guardar el cierre.' });
    } finally {
      setSaving(false);
    }
  };

  const exportarLibreta = async () => {
    if (!token || !detalle || !periodoId || !puedeExportar) return;

    setExporting(true);
    setMensaje(null);

    try {
      const res = await axios.get(
        `/api/tutoria/alumnos/${detalle.alumno.id_matricula}/libreta-pdf`,
        {
          headers: headers(token),
          params: { id_bimestre: periodoId },
          responseType: 'blob',
        },
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const cleanName = `${detalle.alumno.codigo || 'alumno'}-${periodo?.label || 'periodo'}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

      link.href = url;
      link.download = `libreta-${cleanName || detalle.alumno.id_matricula}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMensaje({ tipo: 'exito', texto: 'Libreta exportada correctamente.' });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo exportar la libreta.' });
    } finally {
      setExporting(false);
    }
  };

  const confirmarGuardarCierre = async () => {
    setConfirmGuardar(false);
    await ejecutarGuardar();
  };

  const exportarSalon = async () => {
    if (!token || !periodoId || !puedeExportar || alumnos.length === 0) return;

    setExportingSalon(true);
    setMensaje(null);

    try {
      for (const alumno of alumnos) {
        const res = await axios.get(
          `/api/tutoria/alumnos/${alumno.id_matricula}/libreta-pdf`,
          {
            headers: headers(token),
            params: { id_bimestre: periodoId },
            responseType: 'blob',
          },
        );

        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        const cleanName = `${alumno.codigo || alumno.id_matricula}-${alumno.alumno || 'alumno'}-${periodo?.label || 'periodo'}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase();

        link.href = url;
        link.download = `libreta-${cleanName || alumno.id_matricula}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      setMensaje({
        tipo: 'exito',
        texto: `Se exportaron ${alumnos.length} libretas del salón.`,
      });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudieron exportar todas las libretas del salón.',
      });
    } finally {
      setExportingSalon(false);
      setConfirmExportarSalon(false);
    }
  };

  const cards = [
    { label: 'Alumnos', value: resumen.total, helper: 'Del salón', icon: UsersRound },
    { label: 'Promedio', value: nota(resumen.promedio), helper: 'General del salón', icon: BarChart3 },
    { label: 'Comentarios', value: resumen.comentarios, helper: 'Pendientes', icon: MessageSquareText },
    { label: 'Conducta', value: resumen.conducta, helper: 'Pendientes', icon: ShieldCheck },
    { label: 'Familia', value: resumen.familia, helper: 'Pendientes', icon: UserRoundCheck },
  ];

  return (
    <div className="space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Tutoría"
        title="Tutoría y libreta"
        description="Revisa el desempeño integral del alumno, registra conducta, participación familiar y comentario final del periodo."
        icon={BookOpenCheck}
        meta={[{ label: 'Contexto', value: scopeLabel }, { label: 'Periodo', value: periodo?.label || 'Sin periodo' }]}
        actions={puedeExportar && detalle ? (
          <button
            type="button"
            onClick={() => setConfirmExportarAlumno(true)}
            disabled={exporting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {exporting ? <Loader2 size={17} className="animate-spin" /> : <Printer size={17} />}
            {exporting ? 'Exportando...' : 'Exportar libreta'}
          </button>
        ) : null}
      />

      {mensaje && (
        <div className={`flex items-start gap-3 rounded-3xl border px-5 py-4 text-sm font-bold ${mensaje.tipo === 'exito' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {mensaje.texto}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-100 bg-white/90 p-5 shadow-sm shadow-slate-200/70 erp-section-enter">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Año lectivo</span>
            <select value={anioId || ''} disabled={loadingPanel || panel.anios.length === 0} onChange={(e) => { const id = Number(e.target.value); setAnioId(id); setPeriodoId(null); setSalonId(null); setMatriculaId(null); setDetalle(null); setAlumnos([]); cargarPanel(id); }} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50">
              {panel.anios.length === 0 && <option value="">Sin años lectivos</option>}
              {panel.anios.map((a) => <option key={a.id_anio} value={a.id_anio}>{a.nombre_anio} · {a.colegio}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Periodo</span>
            <select value={periodoId || ''} disabled={loadingPanel || panel.periodos.length === 0} onChange={(e) => setPeriodoId(Number(e.target.value))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50">
              {panel.periodos.length === 0 && <option value="">Sin periodos</option>}
              {panel.periodos.map((p) => <option key={p.id_bimestre} value={p.id_bimestre}>{p.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Salón tutorado</span>
            <select value={salonId || ''} disabled={loadingPanel || panel.salones.length === 0} onChange={(e) => setSalonId(Number(e.target.value))} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50">
              {panel.salones.length === 0 && <option value="">Sin salones disponibles</option>}
              {panel.salones.map((s) => <option key={s.id_seccion} value={s.id_seccion}>{s.label}</option>)}
            </select>
          </label>
        </div>
        {loadingPanel && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 size={16} className="animate-spin" /> Cargando tutoría...</p>}

        {puedeExportar && alumnos.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmExportarSalon(true)}
              disabled={exportingSalon}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {exportingSalon ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              {exportingSalon ? 'Exportando salón...' : 'Exportar salón'}
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 erp-stagger">
        {cards.map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs font-semibold text-slate-400">{card.helper}</p></div><div className="rounded-2xl bg-blue-50 p-2 text-blue-600"><Icon size={18} /></div></div>
          </div>;
        })}
      </section>

      <section className="tutoria-main-grid grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)] erp-section-enter">
        <aside className="tutoria-panel-alumnos self-start rounded-[28px] border border-slate-100 bg-white shadow-sm shadow-slate-200/70 erp-detail-enter">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Alumnos del salón</h2>
                <p className="mt-1 text-sm text-slate-500">Selecciona un alumno para revisar su libreta interna.</p>
              </div>
              <span className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[10px] font-black ring-1 ${
                pendientesSalon.total > 0
                  ? 'bg-amber-50 text-amber-700 ring-amber-100'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              }`}>
                {pendientesSalon.total > 0 ? `${pendientesSalon.total} pendientes` : 'Listo'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-100">
              {[
                { key: 'todos', label: 'Todos', count: alumnos.length },
                { key: 'pendientes', label: 'Pendientes', count: pendientesSalon.total },
                { key: 'listos', label: 'Listos', count: pendientesSalon.listos },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFiltroAlumnos(item.key as 'todos' | 'pendientes' | 'listos')}
                  className={`rounded-xl px-2 py-2 text-[11px] font-black transition-all duration-200 ${
                    filtroAlumnos === item.key
                      ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                  <span className="ml-1 text-slate-400">({item.count})</span>
                </button>
              ))}
            </div>

            {pendientesSalon.total > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                <span className="rounded-xl bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-100">
                  Coment.: {pendientesSalon.comentarios}
                </span>
                <span className="rounded-xl bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-100">
                  Conducta: {pendientesSalon.conducta}
                </span>
                <span className="rounded-xl bg-indigo-50 px-2 py-1 text-indigo-700 ring-1 ring-indigo-100">
                  Familia: {pendientesSalon.familia}
                </span>
              </div>
            )}
          </div>
          <div className="tutoria-alumnos-list overflow-y-auto p-4">
            {loadingAlumnos ? <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500"><Loader2 size={16} className="animate-spin" /> Cargando alumnos...</div> : alumnos.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">Sin alumnos para mostrar.</div> : alumnosFiltrados.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">No hay alumnos en este filtro.</div> : alumnosFiltrados.map((alumno) => (
              <button key={alumno.id_matricula} type="button" onClick={() => setMatriculaId(alumno.id_matricula)} className={`tutoria-alumno-card w-full rounded-3xl border p-4 text-left transition-all duration-200 erp-list-item-enter ${matriculaId === alumno.id_matricula ? 'border-blue-200 bg-blue-50/70 shadow-sm shadow-blue-100' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  {alumno.avatar_url ? (
                    <img
                      src={assetUrl(alumno.avatar_url)}
                      alt={alumno.alumno}
                      className="h-11 w-11 shrink-0 rounded-2xl bg-white object-contain p-0.5 ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                      {iniciales(alumno.alumno)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{alumno.alumno}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">Código: {alumno.codigo}</p>
                      </div>
                      <span className={`shrink-0 rounded-xl px-3 py-1 text-sm font-black ring-1 ${notaClass(alumno.promedio)}`}>{nota(alumno.promedio)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">Desaprobados: {alumno.cursos_desaprobados}</span>
                      {alumno.comentario_pendiente && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">Comentario pendiente</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="tutoria-panel-detalle self-start min-h-[720px] rounded-[28px] border border-slate-100 bg-white shadow-sm shadow-slate-200/70 erp-detail-enter">
          {loadingDetalle ? <div className="flex min-h-[520px] items-center justify-center"><div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-500"><Loader2 size={16} className="animate-spin" /> Cargando resumen...</div></div> : !detalle ? <div className="flex min-h-[520px] items-center justify-center p-8 text-center"><div><BookOpenCheck className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-lg font-black text-slate-800">Selecciona un alumno</h2><p className="mt-2 max-w-md text-sm text-slate-500">Aquí aparecerán sus notas consolidadas, detalle por evaluación, conducta, participación familiar y comentario final.</p></div></div> : (
            <div key={`${detalle.alumno.id_matricula}-${periodoId}`} className="space-y-5 p-5 erp-detail-enter">
              <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Alumno seleccionado</p><h2 className="mt-1 text-2xl font-black text-slate-950">{detalle.alumno.nombre}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{detalle.alumno.codigo} · {detalle.alumno.salon}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
                        detalle.cierre?.estado === 'Completo'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-amber-50 text-amber-700 ring-amber-100'
                      }`}>
                        {detalle.cierre?.estado === 'Completo' ? 'Cierre completo' : 'Cierre pendiente'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-100">
                        Último guardado: {fechaHora(detalle.cierre?.actualizado_en)}
                      </span>
                      {detalle.cierre?.registrado_por && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                          Por: {detalle.cierre.registrado_por}
                        </span>
                      )}
                    </div>
                  </div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Promedio', nota(detalle.estadistica.promedio_general)], ['Desaprobados', detalle.estadistica.cursos_desaprobados], ['Mérito', detalle.estadistica.orden_merito || '—'], ['Tercio', detalle.estadistica.tercio || '—']].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-900">{value}</p></div>)}</div></div></div>

              <section className="rounded-[24px] border border-slate-100"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="text-base font-black text-slate-950">Notas consolidadas</h3><p className="text-sm text-slate-500">Solo lectura. El tutor no puede modificar notas desde esta pantalla.</p></div><Eye size={18} className="text-slate-400" /></div><div className="space-y-3 p-4">{detalle.cursos.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">Sin evaluaciones para este periodo.</div> : detalle.cursos.map((curso) => <div key={curso.id_asignacion} className="overflow-hidden rounded-2xl border border-slate-100"><button type="button" onClick={() => setCursoAbierto((actual) => actual === curso.id_asignacion ? null : curso.id_asignacion)} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{curso.curso}</p><p className="text-xs font-semibold text-slate-400">{curso.area} · {curso.docente || 'Docente no asignado'}</p></div><div className="flex items-center gap-3"><span className={`rounded-xl px-3 py-1 text-sm font-black ring-1 ${notaClass(curso.promedio)}`}>{nota(curso.promedio)}</span><ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${cursoAbierto === curso.id_asignacion ? 'rotate-180' : ''}`} /></div></button>{cursoAbierto === curso.id_asignacion && <div className="grid gap-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-3">{curso.evaluaciones.length === 0 ? <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-400 ring-1 ring-slate-100">Sin evaluaciones cargadas.</div> : curso.evaluaciones.map((ev) => <div key={ev.id_evaluacion_det} className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black uppercase text-slate-800">{ev.descripcion}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${grupoClass(ev.grupo)}`}>{ev.grupo}</span></div><span className={`rounded-xl px-3 py-1 text-sm font-black ring-1 ${notaClass(ev.nota)}`}>{nota(ev.nota)}</span></div></div>)}</div>}</div>)}</div></section>

              <section className="grid gap-5 xl:grid-cols-2">{(['conducta', 'participacion_familiar'] as const).map((grupo) => <div key={grupo} className="rounded-[24px] border border-slate-100"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-black text-slate-950">{grupo === 'conducta' ? 'Conducta del alumno' : 'Participación de padres'}</h3><p className="text-sm text-slate-500">Editable por tutor, dirección o administración.</p></div><div className="space-y-3 p-4">{detalle[grupo].map((criterio) => <label key={criterio.id_criterio} className="block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><span className="text-sm font-black text-slate-800">{criterio.descripcion}</span><select value={criterio.valor || ''} disabled={!puedeEditar} onChange={(e) => cambiarCriterio(grupo, criterio.id_criterio, e.target.value as Literal)} className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-400">{escala.map((item) => <option key={item.value || 'empty'} value={item.value}>{item.label}</option>)}</select></label>)}</div></div>)}</section>

              <section className="rounded-[24px] border border-slate-100"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-base font-black text-slate-950">Comentario final del tutor</h3><p className="text-sm text-slate-500">Este texto irá en la libreta del alumno.</p></div><div className="space-y-4 p-4"><textarea value={detalle.comentario || ''} onChange={(e) => setDetalle((actual) => actual ? { ...actual, comentario: e.target.value } : actual)} disabled={!puedeEditar} rows={5} placeholder="Ej. Muestra un buen desempeño académico..." className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100 disabled:text-slate-400" /><div className="flex justify-end"><button type="button" onClick={() => setConfirmGuardar(true)} disabled={!puedeEditar || saving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Guardar cierre de tutoría</button></div></div></section>
            </div>
          )}
        </main>
      </section>
      <ConfirmDialog
        open={confirmGuardar}
        eyebrow="Tutoría"
        title="Confirmar guardado de tutoría"
        description={
          detalle
            ? `Se guardarán las valoraciones de conducta, participación familiar y comentario final de ${detalle.alumno.nombre}.`
            : 'Se guardarán los cambios del cierre de tutoría.'
        }
        tone="neutral"
        confirmLabel="Sí, guardar"
        cancelLabel="Cancelar"
        loading={saving}
        onCancel={() => setConfirmGuardar(false)}
        onConfirm={() => {
          void confirmarGuardarCierre();
        }}
      />

      <ConfirmDialog
        open={confirmExportarSalon}
        eyebrow="Libretas"
        title="Confirmar exportación del salón"
        description={
          pendientesSalon.total > 0
            ? `Se descargarán ${alumnos.length} libretas. Hay ${pendientesSalon.total} alumno(s) con pendientes: ${pendientesSalon.comentarios} comentario(s), ${pendientesSalon.conducta} conducta(s) y ${pendientesSalon.familia} participación familiar.`
            : `Se descargarán ${alumnos.length} libretas PDF del salón seleccionado. Todos los cierres aparecen completos.`
        }
        tone="neutral"
        confirmLabel={pendientesSalon.total > 0 ? "Exportar de todos modos" : "Sí, exportar"}
        cancelLabel="Cancelar"
        loading={exportingSalon}
        onCancel={() => setConfirmExportarSalon(false)}
        onConfirm={() => {
          void exportarSalon();
        }}
      />

      <ConfirmDialog
        open={confirmExportarAlumno}
        eyebrow="Libreta individual"
        title="Confirmar exportación de libreta"
        description={
          detalle
            ? `Se descargará la libreta PDF de ${detalle.alumno.nombre} para ${periodo?.label || 'el periodo seleccionado'}. Verifica que el cierre de tutoría esté guardado antes de exportar.`
            : 'Se descargará la libreta PDF del alumno seleccionado.'
        }
        tone="neutral"
        confirmLabel="Sí, exportar"
        cancelLabel="Cancelar"
        loading={exporting}
        onCancel={() => setConfirmExportarAlumno(false)}
        onConfirm={() => {
          setConfirmExportarAlumno(false);
          void exportarLibreta();
        }}
      />

    </div>
  );
}
