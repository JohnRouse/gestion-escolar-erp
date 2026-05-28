import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
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

const grupoStyles: Record<string, { header: string; subHeader: string; cell: string }> = {
  'TRABAJO EN CLASE': {
    header: 'bg-amber-50/80 text-amber-700 ring-amber-100',
    subHeader: 'bg-amber-50/55 text-amber-700',
    cell: 'bg-amber-50/20',
  },
  PRÁCTICAS: {
    header: 'bg-indigo-50/80 text-indigo-700 ring-indigo-100',
    subHeader: 'bg-indigo-50/55 text-indigo-700',
    cell: 'bg-indigo-50/20',
  },
  EXAMEN: {
    header: 'bg-rose-50/80 text-rose-700 ring-rose-100',
    subHeader: 'bg-rose-50/55 text-rose-700',
    cell: 'bg-rose-50/15',
  },
  'OTRAS EVALUACIONES': {
    header: 'bg-slate-50/90 text-slate-600 ring-slate-100',
    subHeader: 'bg-slate-50/70 text-slate-600',
    cell: 'bg-slate-50/25',
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
    return 'border-rose-200 bg-rose-50/70 text-rose-600 focus:border-rose-300 focus:ring-rose-100';
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
    if (promedio >= 14) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    if (promedio >= 11) return 'bg-sky-50 text-sky-700 ring-sky-100';
    return 'bg-rose-50 text-rose-700 ring-rose-100';
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
      grilla.evaluaciones.map((eva) => ({
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
      <div className="mx-auto max-w-[1540px] space-y-5">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-100 bg-white/80 px-3 py-1 text-xs font-semibold text-accent-600 shadow-sm shadow-gray-200/60">
              <BookOpenCheck size={14} />
              Registro de notas por unidad
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-950">Registro de Notas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Grilla dinámica por salón, bimestre, unidad y curso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={!asignacionId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm shadow-gray-200/50 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Agregar evaluación
            </button>

            <button
              type="button"
              onClick={guardarNotas}
              disabled={saving || !grilla}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:-translate-y-0.5 hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* Filtros principales */}
        <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100 backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                <School size={13} />
                Salón
              </span>
              <select
                className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-semibold text-gray-800 outline-none transition-all focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                <Calendar size={13} />
                Periodo
              </span>
              <select
                className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-semibold text-gray-800 outline-none transition-all focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                <ClipboardList size={13} />
                Unidad
              </span>
              <select
                className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-semibold text-gray-800 outline-none transition-all focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                <BookOpen size={13} />
                Curso
              </span>
              <select
                className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-semibold text-gray-800 outline-none transition-all focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center gap-3 min-h-[98px] rounded-3xl bg-gray-50/80 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm">
                <GraduationCap size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Salón actual</p>
                <p className="truncate text-lg font-extrabold text-gray-900">
                  {asignacionActual?.seccion || salonSeleccionado || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 min-h-[98px] rounded-3xl bg-gray-50/80 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <UsersRound size={17} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Alumnos</p>
                <p className="text-lg font-extrabold text-gray-900">{alumnosCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 min-h-[98px] rounded-3xl bg-gray-50/80 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                <Table2 size={17} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Evaluaciones</p>
                <p className="text-lg font-extrabold text-gray-900">{evaluacionesCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 min-h-[98px] rounded-3xl bg-gray-50/80 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <Sparkles size={17} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Promedio general</p>
                <p className="text-lg font-extrabold text-gray-900">{promedioGeneral ?? '—'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mensaje */}
        {mensaje && (
          <div
            className={`flex items-start gap-3 rounded-3xl border p-4 text-sm font-medium shadow-sm ${
              mensaje.tipo === 'exito'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <div className="mt-0.5">
              {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </div>
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Grilla */}
        {loading ? (
          <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="skeleton h-4 w-32 rounded-full" />
                <div className="skeleton mt-2 h-3 w-48 rounded-full" />
              </div>
              <div className="skeleton h-10 w-28 rounded-2xl" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-11 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : grilla ? (
          <section className="overflow-hidden rounded-[30px] border border-white bg-white/95 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100 backdrop-blur">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-950">
                  {grilla.asignacion?.curso || asignacionActual?.curso || 'Grilla de notas'}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {grilla.asignacion?.seccion || asignacionActual?.seccion || 'Salón no especificado'} · {periodoActual.label} · Unidad {unidadId}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
                  Azul: aprobado
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                  Rojo: menor a 11
                </span>
              </div>
            </div>

            {grilla.evaluaciones.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-50 text-accent-600">
                  <Plus size={24} />
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900">Aún no hay evaluaciones</h3>
                <p className="mt-1 max-w-md text-sm text-gray-500">
                  Crea la primera evaluación para iniciar el registro de notas de esta unidad.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-600"
                >
                  <Plus size={16} />
                  Agregar evaluación
                </button>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 w-14 border-b border-r border-gray-100 bg-white px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400"
                      >
                        N°
                      </th>
                      <th
                        rowSpan={2}
                        className="sticky left-[56px] z-30 w-[270px] border-b border-r border-gray-100 bg-white px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 shadow-[12px_0_18px_-18px_rgba(15,23,42,0.45)]"
                      >
                        Nombre completo
                      </th>
                      {gruposEvaluaciones.map((grupo) => {
                        const style = grupoStyles[grupo.nombre] || grupoStyles['OTRAS EVALUACIONES'];
                        return (
                          <th
                            key={grupo.nombre}
                            colSpan={grupo.evaluaciones.length}
                            className={`border-b border-r border-gray-100 px-3 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.16em] ring-1 ${style.header}`}
                          >
                            {grupo.nombre}
                          </th>
                        );
                      })}
                      <th
                        rowSpan={2}
                        className="sticky right-0 z-30 w-24 border-b border-l border-gray-100 bg-white px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.42)]"
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
                              <span className="line-clamp-2 text-[11px] font-bold uppercase leading-4 tracking-[0.05em]">
                                {eva.descripcion}
                              </span>
                              <button
                                type="button"
                                onClick={() => eliminarEvaluacion(eva.id)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-all hover:bg-rose-100 hover:text-rose-500 group-hover:opacity-100"
                                title="Eliminar evaluación"
                              >
                                <Trash2 size={13} />
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
                          <td className="sticky left-0 z-20 border-b border-r border-gray-100 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-500 transition-colors group-hover:bg-gray-50">
                            {index + 1}
                          </td>

                          <td className="sticky left-[56px] z-20 border-b border-r border-gray-100 bg-white px-4 py-2 text-center shadow-[12px_0_18px_-18px_rgba(15,23,42,0.45)] transition-colors group-hover:bg-gray-50">
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
                                  className={`mx-auto h-9 w-16 rounded-xl border text-center text-sm font-extrabold tabular-nums outline-none transition-all focus:ring-4 ${getNotaColor(
                                    fila[eva.id]
                                  )}`}
                                  aria-label={`Nota de ${fila.alumno} en ${eva.descripcion}`}
                                />
                              </td>
                            ));
                          })}

                          <td className="sticky right-0 z-20 border-b border-l border-gray-100 bg-white px-3 py-2 text-center align-middle shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.42)] transition-colors group-hover:bg-gray-50">
                            <span
                              className={`inline-flex min-w-14 items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-extrabold tabular-nums ring-1 ${getPromedioClass(
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
          <section className="flex min-h-[340px] flex-col items-center justify-center rounded-[30px] border border-dashed border-gray-200 bg-white/70 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-100 text-gray-400">
              <BookOpenCheck size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">Selecciona un salón y curso</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              Al elegir salón, bimestre, unidad y curso aparecerá la grilla de calificaciones.
            </p>
          </section>
        )}
      </div>

      {/* Modal de nueva evaluación */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white bg-white shadow-2xl shadow-gray-950/20">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
                  <Plus size={13} />
                  Nueva evaluación
                </div>
                <h2 className="mt-3 text-xl font-bold text-gray-950">Agregar evaluación</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Registra una actividad para {periodoActual.label}, unidad {unidadId}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Descripción
                </span>
                <input
                  type="text"
                  value={nuevaEvalDesc}
                  onChange={(e) => setNuevaEvalDesc(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                  placeholder="Ej. Cuaderno/P, Práctica 1, Examen mensual..."
                  autoFocus
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                    Tipo
                  </span>
                  <select
                    value={nuevaEvalTipo}
                    onChange={(e) => setNuevaEvalTipo(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                  >
                    {tipoEvaluaciones.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
                        Prácticas existentes
                      </p>
                      <p className="mt-1 text-sm font-bold text-indigo-700">
                        Sigue: Práctica {siguientePractica}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNuevaEvalTipo('3');
                        setNuevaEvalDesc(`Práctica ${siguientePractica}`);
                      }}
                      className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white"
                    >
                      Usar
                    </button>
                  </div>

                  <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                    {practicasExistentes.length === 0 ? (
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-400">
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
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={crearEvaluacion}
                disabled={!nuevaEvalDesc.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition-all hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Crear evaluación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}