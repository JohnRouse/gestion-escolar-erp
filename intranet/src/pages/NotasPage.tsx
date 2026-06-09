import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
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
} from 'lucide-react';

interface Asignacion {
  id_asignacion: number;
  curso: string;
  seccion: string;
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
    header: 'bg-gradient-to-r from-amber-50 to-amber-50/50 text-amber-700 ring-amber-100',
    subHeader: 'bg-amber-50/80 text-amber-700',
    cell: 'bg-amber-50/30',
    accent: 'bg-amber-500',
  },
  PRÁCTICAS: {
    header: 'bg-gradient-to-r from-indigo-50 to-indigo-50/50 text-indigo-700 ring-indigo-100',
    subHeader: 'bg-indigo-50/80 text-indigo-700',
    cell: 'bg-indigo-50/30',
    accent: 'bg-indigo-500',
  },
  EXAMEN: {
    header: 'bg-gradient-to-r from-rose-50 to-rose-50/50 text-rose-700 ring-rose-100',
    subHeader: 'bg-rose-50/80 text-rose-700',
    cell: 'bg-rose-50/20',
    accent: 'bg-rose-500',
  },
  'OTRAS EVALUACIONES': {
    header: 'bg-gradient-to-r from-slate-50 to-slate-50/50 text-slate-600 ring-slate-100',
    subHeader: 'bg-slate-50/80 text-slate-600',
    cell: 'bg-slate-50/30',
    accent: 'bg-slate-500',
  },
};

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferirGrupoEvaluacion(evaluacion: Evaluacion) {
  const texto = normalizeText(
    [
      evaluacion.descripcion,
      evaluacion.tipo,
      evaluacion.nombre_tipo,
      evaluacion.tipo_evaluacion?.nombre,
      evaluacion.tipo_evaluacion?.descripcion,
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (texto.includes('pract')) return 'PRÁCTICAS';
  if (texto.includes('exam')) return 'EXAMEN';
  if (
    texto.includes('cuaderno') ||
    texto.includes('texto') ||
    texto.includes('interv') ||
    texto.includes('expos') ||
    texto.includes('particip') ||
    texto.includes('tarea') ||
    texto.includes('clase')
  ) {
    return 'TRABAJO EN CLASE';
  }

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

function calcularPromedioFila(
  fila: GrillaData['grilla'][number],
  evaluaciones: Evaluacion[]
) {
  if (!evaluaciones.length) return 0;

  const total = evaluaciones.reduce(
    (suma, evaluacion) => suma + normalizarNotaEntera(fila[evaluacion.id]),
    0
  );

  return Math.round(total / evaluaciones.length);
}

function getNotaColor(value: unknown) {
  const nota = normalizarNotaEntera(value);

  if (nota < 11) {
    return 'border-rose-200 bg-rose-50/70 text-rose-700 focus:border-rose-300 focus:ring-rose-100';
  }

  return 'border-blue-100 bg-blue-50/35 text-blue-700 focus:border-accent-300 focus:ring-accent-100';
}

export default function NotasPage() {
  const { token } = useAuth();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [salonSeleccionado, setSalonSeleccionado] = useState('');
  const [asignacionId, setAsignacionId] = useState<number | null>(null);
  const [periodoId, setPeriodoId] = useState(1);
  const [unidadId, setUnidadId] = useState(1);
  const [grilla, setGrilla] = useState<GrillaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Modal para nueva evaluación
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevaEvalDesc, setNuevaEvalDesc] = useState('');
  const [nuevaEvalTipo, setNuevaEvalTipo] = useState('3');

  // Cargar salones/cursos asignados al docente
  useEffect(() => {
    if (!token) return;

    axios
      .get('/api/academicos/docente/asignaciones', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data: Asignacion[] = res.data || [];
        setAsignaciones(data);

        if (data.length > 0) {
          setSalonSeleccionado(data[0].seccion);
          setAsignacionId(data[0].id_asignacion);
        }
      })
      .catch(() => {});
  }, [token]);

  const salones = useMemo(() => {
    const unicos = new Map<string, string>();
    asignaciones.forEach((asignacion) => {
      if (asignacion.seccion) unicos.set(asignacion.seccion, asignacion.seccion);
    });
    return Array.from(unicos.values());
  }, [asignaciones]);

  const cursosPorSalon = useMemo(() => {
    if (!salonSeleccionado) return asignaciones;
    return asignaciones.filter((asignacion) => asignacion.seccion === salonSeleccionado);
  }, [asignaciones, salonSeleccionado]);

  const asignacionActual = useMemo(
    () => asignaciones.find((asignacion) => asignacion.id_asignacion === asignacionId),
    [asignaciones, asignacionId]
  );

  const periodoActual = useMemo(
    () => periodos.find((periodo) => periodo.id === periodoId) || periodos[0],
    [periodoId]
  );

  const unidadesDelPeriodo = periodoActual.unidades;

  // Cargar grilla cuando cambia curso o unidad
  const cargarGrilla = useCallback(async () => {
    if (!token || !asignacionId) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get(
        `/api/calificaciones/unidades/${unidadId}/grilla?asignacion_id=${asignacionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrilla(res.data);
    } catch {
      setGrilla(null);
    } finally {
      setLoading(false);
    }
  }, [token, asignacionId, unidadId]);

  useEffect(() => {
    cargarGrilla();
  }, [cargarGrilla]);

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

    const agrupadas = grilla.evaluaciones.reduce<Record<string, Evaluacion[]>>((acc, evaluacion) => {
      const grupo = inferirGrupoEvaluacion(evaluacion);
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push(evaluacion);
      return acc;
    }, {});

    return grupoOrden
      .filter((grupo) => agrupadas[grupo]?.length)
      .map((grupo) => ({ nombre: grupo, evaluaciones: agrupadas[grupo] }));
  }, [grilla]);

  const practicasExistentes = useMemo(() => {
    return (grilla?.evaluaciones || []).filter(
      (evaluacion) => inferirGrupoEvaluacion(evaluacion) === 'PRÁCTICAS'
    );
  }, [grilla]);

  const siguientePractica = useMemo(() => {
    const numeros = practicasExistentes
      .map((practica) => {
        const coincidencia = normalizeText(practica.descripcion).match(/practica\s*(\d+)/);
        return coincidencia ? Number(coincidencia[1]) : null;
      })
      .filter((numero): numero is number => Number.isFinite(numero));

    return numeros.length ? Math.max(...numeros) + 1 : practicasExistentes.length + 1;
  }, [practicasExistentes]);

  const getPromedioClass = (promedio: number) => {
    if (promedio >= 14) return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    if (promedio >= 11) return 'bg-sky-100 text-sky-700 ring-sky-200';
    return 'bg-rose-100 text-rose-700 ring-rose-200';
  };

  const handleSalonChange = (seccion: string) => {
    setSalonSeleccionado(seccion);
    const primeraAsignacion = asignaciones.find((asignacion) => asignacion.seccion === seccion);
    setAsignacionId(primeraAsignacion?.id_asignacion ?? null);
  };

  const handleCursoChange = (idAsignacion: number) => {
    setAsignacionId(idAsignacion);
    const asignacion = asignaciones.find((item) => item.id_asignacion === idAsignacion);
    if (asignacion) setSalonSeleccionado(asignacion.seccion);
  };

  const handlePeriodoChange = (idPeriodo: number) => {
    const nuevoPeriodo = periodos.find((periodo) => periodo.id === idPeriodo) || periodos[0];
    setPeriodoId(nuevoPeriodo.id);
    setUnidadId(nuevoPeriodo.unidades[0]);
  };

  // Actualizar una nota localmente
  const handleNotaChange = (idMatricula: number, idEval: number, valor: string) => {
    if (!grilla) return;

    const notaNormalizada = normalizarNotaDesdeInput(valor);

    setGrilla({
      ...grilla,
      grilla: grilla.grilla.map((fila) =>
        fila.id_matricula === idMatricula
          ? { ...fila, [idEval]: notaNormalizada }
          : fila
      ),
    });
  };

  // Guardar todas las notas
  const guardarNotas = async () => {
    if (!grilla || !token || !asignacionId) return;

    setSaving(true);
    setMensaje(null);

    const notas = grilla.grilla.flatMap((fila) =>
      grilla.evaluaciones
        .filter((eva) => {
          const valor = fila[eva.id];

          return valor !== null && valor !== undefined && valor !== '';
        })
        .map((eva) => ({
          id_matricula: fila.id_matricula,
          id_evaluacion_det: eva.id,
          valor_nota: normalizarNotaEntera(fila[eva.id]),
        }))
    );

    try {
      await axios.put(
        `/api/calificaciones/unidades/${unidadId}/notas`,
        { id_unidad: unidadId, notas },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMensaje({ tipo: 'exito', texto: 'Notas guardadas correctamente.' });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al guardar las notas.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Crear nueva evaluación
  const crearEvaluacion = async () => {
    if (!token || !asignacionId || !nuevaEvalDesc.trim()) return;

    try {
      await axios.post(
        '/api/calificaciones/evaluaciones',
        {
          id_asignacion: asignacionId,
          id_unidad: unidadId,
          id_tipo_eval: Number(nuevaEvalTipo),
          descripcion_actividad: nuevaEvalDesc.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setModalOpen(false);
      setNuevaEvalDesc('');
      setNuevaEvalTipo('3');
      cargarGrilla();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear evaluación');
    }
  };

  // Eliminar evaluación
  const eliminarEvaluacion = async (idEval: number) => {
    if (!confirm('¿Eliminar esta evaluación? Las notas asociadas se perderán.')) return;
    if (!token) return;

    try {
      await axios.delete(`/api/calificaciones/evaluaciones/${idEval}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      cargarGrilla();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="animate-slide-in-right">
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow="Registro de notas por unidad"
          title="Registro de Notas"
          description="Grilla dinámica por salón, bimestre, unidad y curso."
          icon={BookOpenCheck}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={!asignacionId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Agregar evaluación
              </button>

              <button
                type="button"
                onClick={guardarNotas}
                disabled={saving || !grilla}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 px-5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          }
        />

        {/* Filtros principales */}
        <section className="rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <School size={14} />
                Salón
              </span>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                value={salonSeleccionado}
                onChange={(e) => handleSalonChange(e.target.value)}
              >
                {salones.length === 0 && <option value="">Sin salones</option>}
                {salones.map((salon) => (
                  <option key={salon} value={salon}>
                    {salon}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Calendar size={14} />
                Periodo
              </span>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                value={periodoId}
                onChange={(e) => handlePeriodoChange(Number(e.target.value))}
              >
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <ClipboardList size={14} />
                Unidad
              </span>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                value={unidadId}
                onChange={(e) => setUnidadId(Number(e.target.value))}
              >
                {unidadesDelPeriodo.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    Unidad {unidad}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <BookOpen size={14} />
                Curso
              </span>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                value={asignacionId ?? ''}
                onChange={(e) => handleCursoChange(Number(e.target.value))}
              >
                {cursosPorSalon.length === 0 && <option value="">Sin cursos</option>}
                {cursosPorSalon.map((asignacion) => (
                  <option key={asignacion.id_asignacion} value={asignacion.id_asignacion}>
                    {asignacion.curso}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group flex flex-col gap-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 p-4 ring-1 ring-blue-100 transition-all hover:ring-blue-200 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Salón Actual</span>
                <School className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {asignacionActual?.seccion || salonSeleccionado || '—'}
              </p>
            </div>

            <div className="group flex flex-col gap-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 ring-1 ring-emerald-100 transition-all hover:ring-emerald-200 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Alumnos</span>
                <UsersRound className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-900">{alumnosCount}</p>
            </div>

            <div className="group flex flex-col gap-3 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-50/50 p-4 ring-1 ring-indigo-100 transition-all hover:ring-indigo-200 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Evaluaciones</span>
                <Table2 className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-indigo-900">{evaluacionesCount}</p>
            </div>

            <div className="group flex flex-col gap-3 rounded-lg bg-gradient-to-br from-violet-50 to-violet-50/50 p-4 ring-1 ring-violet-100 transition-all hover:ring-violet-200 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">Promedio</span>
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-violet-900">{promedioGeneral ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* Mensaje */}
        {mensaje && (
          <div
            className={`flex items-start gap-3 rounded-lg border p-4 text-sm font-semibold animate-in fade-in ${
              mensaje.tipo === 'exito'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <div className="mt-0.5">
              {mensaje.tipo === 'exito' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Grilla */}
        {loading ? (
          <div className="rounded-2xl border border-white bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="skeleton h-5 w-40 rounded-full" />
                <div className="skeleton mt-2 h-4 w-56 rounded-full" />
              </div>
              <div className="skeleton h-11 w-32 rounded-lg" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : grilla ? (
          <section className="overflow-hidden rounded-2xl border border-white bg-white/95 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">
                  {grilla.asignacion?.curso || asignacionActual?.curso || 'Grilla de notas'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {grilla.asignacion?.seccion || asignacionActual?.seccion || 'Salón no especificado'} · {periodoActual.label} · Unidad {unidadId}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                  <Zap size={13} className="text-blue-500" />
                  Aprobado: 11 o más
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                  <AlertCircle size={13} className="text-rose-500" />
                  Desaprobado: menor a 11
                </span>
              </div>
            </div>

            {grilla.evaluaciones.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent-50 text-accent-600 shadow-sm">
                  <Plus size={28} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">Aún no hay evaluaciones</h3>
                <p className="mt-2 max-w-md text-sm text-gray-600">
                  Crea la primera evaluación para iniciar el registro de notas de esta unidad.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 px-5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:from-accent-600 hover:to-accent-700"
                >
                  <Plus size={18} />
                  Crear evaluación
                </button>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 w-14 border-b border-r border-gray-100 bg-white px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500"
                      >
                        N°
                      </th>
                      <th
                        rowSpan={2}
                        className="sticky left-[56px] z-30 w-[270px] border-b border-r border-gray-100 bg-white px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500"
                      >
                        Nombre completo
                      </th>
                      {gruposEvaluaciones.map((grupo) => {
                        const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                        return (
                          <th
                            key={grupo.nombre}
                            colSpan={grupo.evaluaciones.length}
                            className={`border-b border-r border-gray-100 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider ring-1 ${style.header}`}
                          >
                            {grupo.nombre}
                          </th>
                        );
                      })}
                      <th
                        rowSpan={2}
                        className="sticky right-0 z-30 w-24 border-b border-l border-gray-100 bg-white px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 shadow-[-8px_0_12px_-6px_rgba(15,23,42,0.1)]"
                      >
                        Prom.
                      </th>
                    </tr>

                    <tr>
                      {gruposEvaluaciones.flatMap((grupo) => {
                        const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                        return grupo.evaluaciones.map((eva) => (
                          <th
                            key={eva.id}
                            className={`group min-w-[116px] border-b border-r border-gray-100 px-2 py-2 text-center align-middle ${style.subHeader}`}
                          >
                            <div className="mx-auto flex max-w-[140px] items-center justify-center gap-1.5">
                              <span className="line-clamp-2 text-[11px] font-bold uppercase leading-4 tracking-wider">
                                {eva.descripcion}
                              </span>
                              <button
                                type="button"
                                onClick={() => eliminarEvaluacion(eva.id)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100"
                                title="Eliminar evaluación"
                              >
                                <Trash2 size={14} />
                              </button>
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
                        <tr key={fila.id_matricula} className="group">
                          <td className="sticky left-0 z-20 border-b border-r border-gray-100 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-500 transition-colors group-hover:bg-gray-50/50">
                            {index + 1}
                          </td>

                          <td className="sticky left-[56px] z-20 border-b border-r border-gray-100 bg-white px-4 py-2 text-center shadow-[12px_0_18px_-18px_rgba(15,23,42,0.45)] transition-colors group-hover:bg-gray-50/50">
                            <p className="mx-auto max-w-[230px] truncate text-sm font-semibold text-gray-900">
                              {fila.alumno}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400">Matrícula #{fila.id_matricula}</p>
                          </td>

                          {gruposEvaluaciones.flatMap((grupo) => {
                            const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                            return grupo.evaluaciones.map((eva) => (
                              <td
                                key={eva.id}
                                className={`border-b border-r border-gray-100 px-2 py-2 text-center align-middle transition-colors group-hover:bg-gray-50/70 ${style.cell}`}
                              >
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={formatearNotaEntera(fila[eva.id])}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) =>
                                    handleNotaChange(fila.id_matricula, eva.id, e.target.value)
                                  }
                                  className={`mx-auto h-9 w-16 rounded-lg border text-center text-sm font-bold tabular-nums outline-none transition-all focus:ring-3 ${getNotaColor(
                                    fila[eva.id]
                                  )}`}
                                  aria-label={`Nota de ${fila.alumno} en ${eva.descripcion}`}
                                />
                              </td>
                            ));
                          })}

                          <td className="sticky right-0 z-20 border-b border-l border-gray-100 bg-white px-3 py-2 text-center align-middle shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.42)] transition-colors group-hover:bg-gray-50/50">
                            <span
                              className={`inline-flex min-w-14 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold tabular-nums ring-1 ${getPromedioClass(
                                promedio
                              )}`}
                            >
                              {promedioTexto}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-400 shadow-sm">
              <BookOpenCheck size={28} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">Selecciona un salón y curso</h3>
            <p className="mt-2 max-w-md text-sm text-gray-600">
              Al elegir salón, bimestre, unidad y curso aparecerá la grilla de calificaciones.
            </p>
          </section>
        )}
      </div>

      {/* Modal de nueva evaluación */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 shadow-2xl shadow-gray-950/20 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
                  <Plus size={14} />
                  Nueva evaluación
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-950">Agregar evaluación</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Registra una actividad para {periodoActual.label}, unidad {unidadId}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Descripción
                </span>
                <input
                  type="text"
                  value={nuevaEvalDesc}
                  onChange={(e) => setNuevaEvalDesc(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                  placeholder="Ej. Cuaderno/P, Práctica 1, Examen mensual..."
                  autoFocus
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tipo
                  </span>
                  <select
                    value={nuevaEvalTipo}
                    onChange={(e) => setNuevaEvalTipo(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-500 focus:ring-3 focus:ring-accent-100"
                  >
                    {tipoEvaluaciones.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        Prácticas existentes
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-indigo-900">
                        Sigue: Práctica {siguientePractica}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNuevaEvalTipo('3');
                        setNuevaEvalDesc(`Práctica ${siguientePractica}`);
                      }}
                      className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white"
                    >
                      Usar
                    </button>
                  </div>

                  <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                    {practicasExistentes.length === 0 ? (
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-400 shadow-sm">
                        No hay prácticas creadas
                      </span>
                    ) : (
                      practicasExistentes.map((practica) => (
                        <span
                          key={practica.id}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm"
                        >
                          {practica.descripcion}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={crearEvaluacion}
                disabled={!nuevaEvalDesc.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 px-5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Crear evaluación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}