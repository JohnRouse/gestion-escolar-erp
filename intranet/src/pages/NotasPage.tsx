import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpenCheck,
  UsersRound,
  ClipboardList,
  GraduationCap,
  X,
  Sparkles,
  Table2,
  School,
  Calendar,
  BookOpen,
  Zap,
  Printer,
} from 'lucide-react';

interface Asignacion {
  id_asignacion: number;
  id_docente?: number;
  id_curso?: number;
  id_seccion?: number;
  id_anio?: number;
  id_colegio?: number;
  curso: string;
  seccion: string;
  grado?: string | null;
  nivel?: string | null;
  letra?: string | null;
  anio?: string | null;
  colegio?: string | null;
  docente?: string | null;
  matriculados?: number;
}

interface Evaluacion {
  id: number;
  descripcion: string;
  tipo?: string;
  nombre_tipo?: string;
  tipo_evaluacion?: {
    nombre?: string;
    descripcion?: string;
  };
}

interface GrillaData {
  asignacion: { seccion: string; curso: string };
  evaluaciones: Evaluacion[];
  grilla: {
    id_matricula: number;
    alumno: string;
    promedio?: number | string;
    [key: string]: any;
  }[];
}

const periodos = [
  { id: 1, label: '1 Bimestre', unidades: [1, 2] },
  { id: 2, label: '2 Bimestre', unidades: [3, 4] },
  { id: 3, label: '3 Bimestre', unidades: [5, 6] },
  { id: 4, label: '4 Bimestre', unidades: [7, 8] },
];

const tipoEvaluaciones = [
  { id: '1', label: 'Participación' },
  { id: '2', label: 'Tarea' },
  { id: '3', label: 'Práctica' },
  { id: '4', label: 'Examen' },
];

const grupoOrden = ['TRABAJO EN CLASE', 'PRÁCTICAS', 'OTRAS EVALUACIONES', 'EXAMEN'];

const grupoStyles: Record<string, { header: string; subHeader: string; cell: string; accent: string }> = {
  'TRABAJO EN CLASE': {
    header: 'bg-amber-50 text-amber-700',
    subHeader: 'bg-amber-50/60 text-amber-700',
    cell: 'bg-amber-50/20',
    accent: 'bg-amber-400',
  },
  PRÁCTICAS: {
    header: 'bg-indigo-50 text-indigo-700',
    subHeader: 'bg-indigo-50/60 text-indigo-700',
    cell: 'bg-indigo-50/15',
    accent: 'bg-indigo-400',
  },
  EXAMEN: {
    header: 'bg-rose-50 text-rose-700',
    subHeader: 'bg-rose-50/60 text-rose-700',
    cell: 'bg-rose-50/15',
    accent: 'bg-rose-400',
  },
  'OTRAS EVALUACIONES': {
    header: 'bg-neutral-50 text-neutral-600',
    subHeader: 'bg-neutral-50/60 text-neutral-600',
    cell: 'bg-neutral-50/30',
    accent: 'bg-neutral-400',
  },
};

function normalizeText(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function inferirGrupoEvaluacion(evaluacion: Evaluacion) {
  const texto = normalizeText([evaluacion.descripcion, evaluacion.tipo, evaluacion.nombre_tipo, evaluacion.tipo_evaluacion?.nombre, evaluacion.tipo_evaluacion?.descripcion].filter(Boolean).join(' '));
  if (texto.includes('pract')) return 'PRÁCTICAS';
  if (texto.includes('exam')) return 'EXAMEN';
  if (texto.includes('cuaderno') || texto.includes('texto') || texto.includes('interv') || texto.includes('expos') || texto.includes('particip') || texto.includes('tarea') || texto.includes('clase')) return 'TRABAJO EN CLASE';
  return 'OTRAS EVALUACIONES';
}

function normalizarNotaEntera(value: unknown) {
  if (value === '' || value === null || value === undefined) return 0;
  const nota = Number(value);
  if (!Number.isFinite(nota)) return 0;
  return Math.min(20, Math.max(0, Math.trunc(nota)));
}

function normalizarNotaDesdeInput(value: string) {
  const soloNumeros = value.replace(/\D/g, '');
  if (!soloNumeros) return 0;
  return Math.min(20, Math.max(0, parseInt(soloNumeros, 10)));
}

function formatearNotaEntera(value: unknown) {
  return String(normalizarNotaEntera(value)).padStart(2, '0');
}

function calcularPromedioFila(fila: GrillaData['grilla'][number], evaluaciones: Evaluacion[]) {
  if (!evaluaciones.length) return 0;
  const total = evaluaciones.reduce((suma, evaluacion) => suma + normalizarNotaEntera(fila[evaluacion.id]), 0);
  return Math.round(total / evaluaciones.length);
}

function getNotaColor(value: unknown) {
  const nota = normalizarNotaEntera(value);
  if (nota < 11) return 'border-red-200 bg-red-50/60 text-red-600 focus:border-red-300 focus:ring-red-100';
  if (nota >= 14) return 'border-emerald-200 bg-emerald-50/60 text-emerald-600 focus:border-emerald-300 focus:ring-emerald-100';
  return 'border-sky-200 bg-sky-50/60 text-sky-600 focus:border-sky-300 focus:ring-sky-100';
}

export default function NotasPage() {
  const { token, user } = useAuth();
  const { queryParams, scopeLabel } = useSchool();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [salonSeleccionado, setSalonSeleccionado] = useState('');
  const [asignacionId, setAsignacionId] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState(1);
  const [unidadId, setUnidadId] = useState(1);
  const [grilla, setGrilla] = useState<GrillaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [asignacionesError, setAsignacionesError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [nuevaEvalDesc, setNuevaEvalDesc] = useState('');
  const [nuevaEvalTipo, setNuevaEvalTipo] = useState('3');

  const esProfesor = user?.rol === 'Profesor';
  const puedeGestionarEvaluaciones = ['Admin', 'Director'].includes(user?.rol || '');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    setLoadingAsignaciones(true);
    setAsignacionesError(null);

    axios
      .get('/api/academicos/docente/asignaciones', {
        headers: { Authorization: `Bearer ${token}` },
        params: queryParams,
      })
      .then((res) => {
        if (cancelled) return;

        const data: Asignacion[] = Array.isArray(res.data) ? res.data : [];
        setAsignaciones(data);

        if (data.length > 0) {
          setSalonSeleccionado(data[0].seccion);
          setAsignacionId(data[0].id_asignacion);
        } else {
          setSalonSeleccionado('');
          setAsignacionId(null);
          setGrilla(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;

        console.error('Error cargando asignaciones docentes para notas:', err);
        setAsignaciones([]);
        setSalonSeleccionado('');
        setAsignacionId(null);
        setGrilla(null);
        setAsignacionesError(
          err.response?.data?.message || 'No se pudieron cargar las asignaciones docentes.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingAsignaciones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, queryParams]);

  const salones = useMemo(() => {
    const unicos = new Map<string, string>();
    asignaciones.forEach((a) => { if (a.seccion) unicos.set(a.seccion, a.seccion); });
    return Array.from(unicos.values());
  }, [asignaciones]);

  const cursosPorSalon = useMemo(() => {
    if (!salonSeleccionado) return asignaciones;
    return asignaciones.filter((a) => a.seccion === salonSeleccionado);
  }, [asignaciones, salonSeleccionado]);

  const asignacionActual = useMemo(() => asignaciones.find((a) => a.id_asignacion === asignacionId), [asignaciones, asignacionId]);
  const periodoActual = useMemo(() => periodos.find((p) => p.id === periodoId) || periodos[0], [periodoId]);
  const unidadesDelPeriodo = periodoActual.unidades;

  const cargarGrilla = useCallback(async () => {
    if (!token || !asignacionId) return;
    setLoading(true); setMensaje(null);
    try {
      const res = await axios.get(`/api/calificaciones/unidades/${unidadId}/grilla?asignacion_id=${asignacionId}`, { headers: { Authorization: `Bearer ${token}` } });
      setGrilla(res.data);
    } catch { setGrilla(null); } finally { setLoading(false); }
  }, [token, asignacionId, unidadId]);

  useEffect(() => { cargarGrilla(); }, [cargarGrilla]);

  const getCursoLabel = (asignacion: Asignacion) => {
    if (esProfesor || !asignacion.docente) return asignacion.curso;
    return `${asignacion.curso} · ${asignacion.docente}`;
  };

  const alumnosCount = grilla?.grilla.length ?? 0;
  const evaluacionesCount = grilla?.evaluaciones.length ?? 0;

  const promedioGeneral = useMemo(() => {
    if (!grilla?.grilla.length) return '00';
    const promedios = grilla.grilla.map((fila) => calcularPromedioFila(fila, grilla.evaluaciones));
    const promedio = promedios.reduce((total, item) => total + item, 0) / promedios.length;
    return formatearNotaEntera(Math.round(promedio));
  }, [grilla]);

  const gruposEvaluaciones = useMemo(() => {
    if (!grilla?.evaluaciones.length) return [];
    const agrupadas = grilla.evaluaciones.reduce<Record<string, Evaluacion[]>>((acc, eva) => {
      const grupo = inferirGrupoEvaluacion(eva);
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push(eva);
      return acc;
    }, {});
    return grupoOrden.filter((g) => agrupadas[g]?.length).map((g) => ({ nombre: g, evaluaciones: agrupadas[g] }));
  }, [grilla]);

  const practicasExistentes = useMemo(() => {
    return (grilla?.evaluaciones || []).filter((e) => inferirGrupoEvaluacion(e) === 'PRÁCTICAS');
  }, [grilla]);

  const siguientePractica = useMemo(() => {
    const numeros = practicasExistentes.map((p) => { const m = normalizeText(p.descripcion).match(/practica\s*(\d+)/); return m ? Number(m[1]) : null; }).filter((n): n is number => Number.isFinite(n));
    return numeros.length ? Math.max(...numeros) + 1 : practicasExistentes.length + 1;
  }, [practicasExistentes]);

  const getPromedioClass = (promedio: number) => {
    if (promedio >= 14) return 'bg-emerald-50 text-emerald-700 ring-emerald-200/60';
    if (promedio >= 11) return 'bg-sky-50 text-sky-700 ring-sky-200/60';
    return 'bg-red-50 text-red-600 ring-red-200/60';
  };

  const handleSalonChange = (seccion: string) => {
    setSalonSeleccionado(seccion);
    const primera = asignaciones.find((a) => a.seccion === seccion);
    setAsignacionId(primera?.id_asignacion ?? null);
  };

  const handleCursoChange = (idAsignacion: number) => {
    setAsignacionId(idAsignacion);
    const asig = asignaciones.find((a) => a.id_asignacion === idAsignacion);
    if (asig) setSalonSeleccionado(asig.seccion);
  };

  const handlePeriodoChange = (idPeriodo: number) => {
    const nuevoPeriodo = periodos.find((p) => p.id === idPeriodo) || periodos[0];
    setPeriodoId(nuevoPeriodo.id);
    setUnidadId(nuevoPeriodo.unidades[0]);
  };

  const handleNotaChange = (idMatricula: number, idEval: number, valor: string) => {
    if (!grilla) return;
    const notaNormalizada = normalizarNotaDesdeInput(valor);
    setGrilla({ ...grilla, grilla: grilla.grilla.map((fila) => fila.id_matricula === idMatricula ? { ...fila, [idEval]: notaNormalizada } : fila) });
  };

  const guardarNotas = async () => {
    if (!grilla || !token || !asignacionId) return;
    setSaving(true); setMensaje(null);
    const notas = grilla.grilla.flatMap((fila) => grilla.evaluaciones.filter((eva) => { const v = fila[eva.id]; return v !== null && v !== undefined && v !== ''; }).map((eva) => ({ id_matricula: fila.id_matricula, id_evaluacion_det: eva.id, valor_nota: normalizarNotaEntera(fila[eva.id]) })));
    try {
      await axios.put(`/api/calificaciones/unidades/${unidadId}/notas`, { id_unidad: unidadId, notas }, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ tipo: 'exito', texto: 'Notas guardadas correctamente.' });
    } catch (err: any) { setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'Error al guardar las notas.' }); } finally { setSaving(false); }
  };

  const openModal = () => { setIsClosing(false); setModalOpen(true); };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => { setModalOpen(false); setIsClosing(false); }, 200);
  };

  const crearEvaluacion = async () => {
    if (!token || !asignacionId || !nuevaEvalDesc.trim()) return;
    try {
      await axios.post('/api/calificaciones/evaluaciones', { id_asignacion: asignacionId, id_unidad: unidadId, id_tipo_eval: Number(nuevaEvalTipo), descripcion_actividad: nuevaEvalDesc.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      closeModal(); setNuevaEvalDesc(''); setNuevaEvalTipo('3'); cargarGrilla();
    } catch (err: any) { alert(err.response?.data?.message || 'Error al crear evaluación'); }
  };

  const eliminarEvaluacion = async (idEval: number) => {
    if (!confirm('¿Eliminar esta evaluación? Las notas asociadas se perderán.')) return;
    if (!token) return;
    try { await axios.delete(`/api/calificaciones/evaluaciones/${idEval}`, { headers: { Authorization: `Bearer ${token}` } }); cargarGrilla(); } catch (err: any) { alert(err.response?.data?.message || 'Error al eliminar'); }
  };

  const imprimirGrilla = () => {
    window.print();
  };

  const inputClass = "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-150 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300 appearance-none";
  const labelClass = "mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400";

  return (
    <div className="w-full space-y-6">
      <style>{`
        @keyframes modalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalOverlayOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalPanelIn { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalPanelOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(16px) scale(0.98); } }
        .modal-overlay-enter { animation: modalOverlayIn 0.2s ease-out forwards; }
        .modal-overlay-exit { animation: modalOverlayOut 0.15s ease-in forwards; }
        .modal-panel-enter { animation: modalPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .modal-panel-exit { animation: modalPanelOut 0.15s ease-in forwards; }

        @media print {
          body { background: white !important; }
          aside, header, nav, .no-print { display: none !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          input { border: 1px solid #cbd5e1 !important; color: black !important; background: white !important; }
          #notas-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }

        @keyframes softFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .soft-fade-up {
          animation: softFadeUp 0.28s ease-out both;
        }
      `}</style>

      <PageHeader
        eyebrow="Registro de notas por unidad"
        title="Registro de Notas"
        description={`Grilla dinámica por salón, bimestre, unidad y curso. Contexto activo: ${scopeLabel}.`}
        icon={BookOpenCheck}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {puedeGestionarEvaluaciones && (
              <button
                type="button"
                onClick={openModal}
                disabled={!asignacionId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Plus size={16} /> Agregar evaluación
              </button>
            )}
            <button
              type="button"
              onClick={imprimirGrilla}
              disabled={!grilla}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Printer size={16} />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={guardarNotas}
              disabled={saving || !grilla}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        }
      />

      {/* Filtros principales */}
      <section className="no-print rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] soft-fade-up">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className={labelClass}><School size={14} /> Salón</span>
            <select
              className={inputClass}
              value={salonSeleccionado}
              onChange={(e) => handleSalonChange(e.target.value)}
              disabled={loadingAsignaciones || asignaciones.length === 0}
            >
              {loadingAsignaciones && <option value="">Cargando salones...</option>}
              {!loadingAsignaciones && salones.length === 0 && <option value="">Sin salones asignados</option>}
              {salones.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}><Calendar size={14} /> Periodo</span>
            <select className={inputClass} value={periodoId} onChange={(e) => handlePeriodoChange(Number(e.target.value))}>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}><ClipboardList size={14} /> Unidad</span>
            <select className={inputClass} value={unidadId} onChange={(e) => setUnidadId(Number(e.target.value))}>
              {unidadesDelPeriodo.map((u) => <option key={u} value={u}>Unidad {u}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}><BookOpen size={14} /> Curso</span>
            <select
              className={inputClass}
              value={asignacionId ?? ''}
              onChange={(e) => handleCursoChange(Number(e.target.value))}
              disabled={loadingAsignaciones || cursosPorSalon.length === 0}
            >
              {loadingAsignaciones && <option value="">Cargando cursos...</option>}
              {!loadingAsignaciones && cursosPorSalon.length === 0 && <option value="">Sin cursos asignados</option>}
              {cursosPorSalon.map((a) => (
                <option key={a.id_asignacion} value={a.id_asignacion}>
                  {getCursoLabel(a)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Salón Actual</span>
              <School className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-semibold text-neutral-900">{asignacionActual?.seccion || salonSeleccionado || '—'}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Alumnos</span>
              <UsersRound className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-semibold text-neutral-900">{alumnosCount}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Evaluaciones</span>
              <Table2 className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-xl font-semibold text-neutral-900">{evaluacionesCount}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Promedio</span>
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-xl font-semibold text-neutral-900">{promedioGeneral ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Mensaje */}
      {mensaje && (
        <div className={`no-print flex items-center gap-3 rounded-2xl p-4 text-sm font-medium ring-1 ${
          mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-600 ring-emerald-200/60' : 'bg-red-50 text-red-600 ring-red-200/60'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {/* Error y mensajes de asignaciones vacías */}
      {asignacionesError && (
        <div className="no-print rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 ring-1 ring-red-200/60">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">No se pudieron cargar las asignaciones.</p>
              <p className="mt-1 text-red-500">{asignacionesError}</p>
            </div>
          </div>
        </div>
      )}

      {!loadingAsignaciones && !asignacionesError && asignaciones.length === 0 && (
        <section className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/80 px-6 py-5 text-sm text-amber-900 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-black">Aún no hay asignaciones docentes para este contexto.</p>
                <p className="mt-1 max-w-3xl leading-6 text-amber-800">
                  Para usar Registro de Notas no basta con tener grados, secciones y cursos configurados.
                  También debe existir una relación entre docente, curso, sección, año lectivo e institución.
                </p>
                <p className="mt-2 font-bold">Siguiente paso: crea la asignación desde Configuración.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.assign('/configuracion?tab=asignaciones')}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Ir a asignaciones
            </button>
          </div>
        </section>
      )}

      {/* Grilla */}
      {loading ? (
        <div className="rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] soft-fade-up">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2"><div className="h-5 w-40 rounded-lg bg-neutral-100 animate-pulse" /><div className="h-4 w-56 rounded-lg bg-neutral-100 animate-pulse" /></div>
            <div className="h-11 w-32 rounded-2xl bg-neutral-100 animate-pulse" />
          </div>
          <div className="space-y-3">{[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="h-12 w-full rounded-xl bg-neutral-100 animate-pulse" />))}</div>
        </div>
      ) : grilla ? (
        <section id="notas-print-area" className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] soft-fade-up">
          <div className="no-print flex flex-col gap-4 border-b border-neutral-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">{grilla.asignacion?.curso || asignacionActual?.curso || 'Grilla de notas'}</h2>
              <p className="mt-1 text-sm text-neutral-500">{grilla.asignacion?.seccion || asignacionActual?.seccion || 'Salón no especificado'} · {periodoActual.label} · Unidad {unidadId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200/60"><CheckCircle2 size={12} /> Aprobado: ≥11</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200/60"><AlertCircle size={12} /> Desaprobado: &lt;11</span>
            </div>
          </div>

          {grilla.evaluaciones.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Plus size={24} />
              </div>
              <h4 className="text-base font-black text-slate-950">Aún no hay plantilla cargada</h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Dirección o Administración debe aplicar una plantilla para esta unidad antes de iniciar el registro de notas.
              </p>
              {['Admin', 'Director'].includes(user?.rol || '') && (
                <button
                  type="button"
                  onClick={() => window.location.assign('/configuracion?tab=plantillas')}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Ir a plantillas
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Vista móvil: tarjetas por alumno */}
              <div className="space-y-4 p-4 lg:hidden">
                {grilla.grilla.map((fila, index) => {
                  const promedio = calcularPromedioFila(fila, grilla.evaluaciones);
                  const promedioTexto = formatearNotaEntera(promedio);

                  return (
                    <article
                      key={fila.id_matricula}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                            Alumno {index + 1}
                          </p>
                          <h3 className="mt-1 text-sm font-black text-neutral-900">
                            {fila.alumno}
                          </h3>
                          <p className="mt-0.5 text-xs text-neutral-400">
                            Matrícula #{fila.id_matricula}
                          </p>
                        </div>

                        <span className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums ring-1 ${getPromedioClass(promedio)}`}>
                          {promedioTexto}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        {gruposEvaluaciones.map((grupo) => {
                          const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];

                          return (
                            <div key={grupo.nombre} className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                              <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${style.subHeader}`}>
                                {grupo.nombre}
                              </p>

                              <div className="mt-3 grid gap-3">
                                {grupo.evaluaciones.map((eva) => (
                                  <label key={eva.id} className="grid grid-cols-[1fr_76px] items-center gap-3">
                                    <span className="text-xs font-bold leading-4 text-neutral-600">
                                      {eva.descripcion}
                                    </span>

                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={formatearNotaEntera(fila[eva.id])}
                                      onFocus={(e) => e.currentTarget.select()}
                                      onChange={(e) =>
                                        handleNotaChange(fila.id_matricula, eva.id, e.target.value)
                                      }
                                      className={`h-10 rounded-xl border text-center text-sm font-black tabular-nums outline-none transition-all focus:ring-2 ${getNotaColor(fila[eva.id])}`}
                                      aria-label={`Nota de ${fila.alumno} en ${eva.descripcion}`}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Vista desktop: tabla */}
              <div className="hidden overflow-auto lg:block">
                <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="sticky left-0 z-30 w-14 border-b border-r border-neutral-100 bg-neutral-50 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">N°</th>
                      <th rowSpan={2} className="sticky left-[56px] z-30 w-[270px] border-b border-r border-neutral-100 bg-neutral-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Nombre completo</th>
                      {gruposEvaluaciones.map((grupo) => {
                        const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                        return (<th key={grupo.nombre} colSpan={grupo.evaluaciones.length} className={`border-b border-r border-neutral-100 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest ${style.header}`}>{grupo.nombre}</th>);
                      })}
                      <th rowSpan={2} className="sticky right-0 z-30 w-24 border-b border-l border-neutral-100 bg-neutral-50 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">Prom.</th>
                    </tr>
                    <tr>
                      {gruposEvaluaciones.flatMap((grupo) => {
                        const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                        return grupo.evaluaciones.map((eva) => (
                          <th key={eva.id} className={`group min-w-[116px] border-b border-r border-neutral-100 px-2 py-2 text-center align-middle ${style.subHeader}`}>
                            <div className="mx-auto flex max-w-[140px] items-center justify-center gap-1.5">
                              <span className="line-clamp-2 text-[11px] font-semibold leading-4 tracking-wide">{eva.descripcion}</span>
                              {puedeGestionarEvaluaciones && (
                                <button
                                  type="button"
                                  onClick={() => eliminarEvaluacion(eva.id)}
                                  className="no-print flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-neutral-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                                  title="Eliminar evaluación"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </th>
                        ));
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {grilla.grilla.map((fila, index) => {
                      const promedio = calcularPromedioFila(fila, grilla.evaluaciones);
                      const promedioTexto = formatearNotaEntera(promedio);
                      return (
                        <tr key={fila.id_matricula} className="group hover:bg-neutral-50/50 transition-colors">
                          <td className="sticky left-0 z-20 border-b border-r border-neutral-100 bg-white px-3 py-2.5 text-center text-xs font-medium text-neutral-400 group-hover:bg-neutral-50/50 transition-colors">{index + 1}</td>
                          <td className="sticky left-[56px] z-20 border-b border-r border-neutral-100 bg-white px-4 py-2.5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] group-hover:bg-neutral-50/50 transition-colors">
                            <p className="text-sm font-medium text-neutral-800 truncate max-w-[230px]">{fila.alumno}</p>
                            <p className="text-[11px] text-neutral-400">Matrícula #{fila.id_matricula}</p>
                          </td>
                          {gruposEvaluaciones.flatMap((grupo) => {
                            const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                            return grupo.evaluaciones.map((eva) => (
                              <td key={eva.id} className={`border-b border-r border-neutral-100 px-2 py-2 text-center align-middle group-hover:bg-neutral-50/70 transition-colors ${style.cell}`}>
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={formatearNotaEntera(fila[eva.id])} onFocus={(e) => e.currentTarget.select()} onChange={(e) => handleNotaChange(fila.id_matricula, eva.id, e.target.value)} className={`mx-auto h-9 w-16 rounded-xl border text-center text-sm font-semibold tabular-nums outline-none transition-all focus:ring-2 ${getNotaColor(fila[eva.id])}`} aria-label={`Nota de ${fila.alumno} en ${eva.descripcion}`} />
                              </td>
                            ));
                          })}
                          <td className="sticky right-0 z-20 border-b border-l border-neutral-100 bg-white px-3 py-2.5 text-center align-middle shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] group-hover:bg-neutral-50/50 transition-colors">
                            <span className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums ring-1 ${getPromedioClass(promedio)}`}>{promedioTexto}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center soft-fade-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-300 mb-4"><BookOpenCheck size={28} /></div>
          <h3 className="text-base font-semibold text-neutral-900">Selecciona un salón y curso</h3>
          <p className="mt-2 max-w-md text-sm text-neutral-500">Al elegir salón, bimestre, unidad y curso aparecerá la grilla de calificaciones.</p>
        </section>
      )}

      {/* ═══ Modal de Nueva Evaluación ═══ */}
      {modalOpen && (
        <div className={`no-print fixed inset-0 z-[80] flex items-center justify-center p-4 ${isClosing ? 'modal-overlay-exit' : 'modal-overlay-enter'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl ring-1 ring-neutral-200/50 w-full max-w-lg overflow-hidden flex flex-col ${isClosing ? 'modal-panel-exit' : 'modal-panel-enter'}`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5 flex-shrink-0">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100"><Plus size={13} /> Nueva evaluación</div>
                <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">Agregar evaluación</h2>
                <p className="mt-1 text-sm text-neutral-400">{periodoActual.label}, unidad {unidadId}.</p>
              </div>
              <button type="button" onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 transition-all duration-150 hover:bg-neutral-200 hover:text-neutral-600 flex-shrink-0"><X size={16} /></button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 px-6 py-5">
              <div>
                <label className={labelClass}>Descripción</label>
                <input type="text" value={nuevaEvalDesc} onChange={(e) => setNuevaEvalDesc(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300" placeholder="Ej. Cuaderno/P, Práctica 1, Examen mensual..." autoFocus />
              </div>

              <div>
                <label className={labelClass}>Tipo de evaluación</label>
                <select value={nuevaEvalTipo} onChange={(e) => setNuevaEvalTipo(e.target.value)} className="h-11 w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-150 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300">
                  {tipoEvaluaciones.map((tipo) => (<option key={tipo.id} value={tipo.id}>{tipo.label}</option>))}
                </select>
              </div>

              <div className="rounded-2xl bg-blue-50/70 ring-1 ring-blue-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Prácticas existentes</p>
                    <p className="mt-1.5 text-sm font-semibold text-neutral-800">Siguiente: Práctica {siguientePractica}</p>
                  </div>
                  <button type="button" onClick={() => { setNuevaEvalTipo('3'); setNuevaEvalDesc(`Práctica ${siguientePractica}`); }} className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition-all duration-150 hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.98]">Usar</button>
                </div>
                <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                  {practicasExistentes.length === 0 ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-400 shadow-sm">No hay prácticas creadas</span>
                  ) : (practicasExistentes.map((p) => (<span key={p.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm">{p.descripcion}</span>)))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 sm:flex-row sm:justify-end flex-shrink-0">
              <button type="button" onClick={closeModal} className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 hover:border-neutral-300">Cancelar</button>
              <button type="button" onClick={crearEvaluacion} disabled={!nuevaEvalDesc.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"><Plus size={16} /> Crear evaluación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}