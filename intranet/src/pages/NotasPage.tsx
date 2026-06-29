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
  LockKeyhole,
  UnlockKeyhole,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ListOrdered,
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
  grupo_evaluacion?: string;
  tipo?: string;
  nombre_tipo?: string;
  tipo_evaluacion?: {
    nombre?: string;
    descripcion?: string;
  };
  orden?: number;
}

interface GrillaData {
  asignacion: { seccion: string; curso: string };
  evaluaciones: Evaluacion[];
  registro?: {
    cerrado: boolean;
    fecha_cierre?: string | null;
    cerrado_por?: number | null;
    fecha_reapertura?: string | null;
    reabierto_por?: number | null;
    motivo_reapertura?: string | null;
  };
  grilla: {
    id_matricula: number;
    codigo_matricula?: string | null;
    codigo_estudiante?: string | null;
    codigo_alumno?: string | null;
    alumno: string;
    promedio?: number | string;
    [key: string]: any;
  }[];
}

interface UnidadNotas {
  id_unidad: number;
  numero: number;
  label: string;
  estado_abierto: boolean;
}

interface PeriodoNotas {
  id_bimestre: number;
  numero: number;
  label: string;
  unidades: UnidadNotas[];
}

const tipoEvaluaciones = [
  { id: '1', label: 'Participación' },
  { id: '2', label: 'Tarea' },
  { id: '3', label: 'Práctica' },
  { id: '4', label: 'Examen' },
];

// ── Tipos y helpers para modal por lote ──
type TipoGrilla = 'TRABAJO EN CLASE' | 'PRÁCTICAS' | 'EXAMEN';

type EvaluacionModalItem = {
  id?: number;
  tempId: string;
  descripcion: string;
  grupo_evaluacion: TipoGrilla;
  esNueva?: boolean;
};

const tipoGrillaOptions: { id: TipoGrilla; label: string }[] = [
  { id: 'TRABAJO EN CLASE', label: 'Trabajo en clase' },
  { id: 'PRÁCTICAS', label: 'Práctica' },
  { id: 'EXAMEN', label: 'Examen' },
];

const normalizarGrupoTipo = (value?: string | null): TipoGrilla => {
  const texto = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (texto.includes('PRACTICA')) return 'PRÁCTICAS';
  if (texto.includes('EXAMEN')) return 'EXAMEN';
  return 'TRABAJO EN CLASE';
};

const getGrupoOrden = (grupo: string) => {
  const normalizado = normalizarGrupoTipo(grupo);
  if (normalizado === 'TRABAJO EN CLASE') return 1;
  if (normalizado === 'PRÁCTICAS') return 2;
  return 3;
};

const crearTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
};

const defaultGrupoStyle: { header: string; subHeader: string; cell: string; accent: string } = {
  header: 'bg-neutral-50 text-neutral-600',
  subHeader: 'bg-neutral-50/60 text-neutral-600',
  cell: 'bg-white',
  accent: 'bg-neutral-300',
};

const getGrupoStyle = (grupo: string) => grupoStyles[grupo] || defaultGrupoStyle;

function normalizeText(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const getGrupoEvaluacion = (evaluacion: Evaluacion) => {
  const grupoManual = normalizarGrupoTipo(evaluacion.grupo_evaluacion);

  if (evaluacion.grupo_evaluacion) return grupoManual;

  const texto = `${evaluacion.descripcion || ''} ${evaluacion.tipo || ''}`.toLowerCase();

  if (texto.includes('práctica') || texto.includes('practica')) return 'PRÁCTICAS';
  if (texto.includes('examen')) return 'EXAMEN';
  return 'TRABAJO EN CLASE';
};

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

function getCodigoAlumnoFila(fila: GrillaData['grilla'][number]) {
  return (
    fila.codigo_matricula ||
    fila.codigo_alumno ||
    fila.codigo_estudiante ||
    `MAT-${fila.id_matricula}`
  );
}

function textoMayusculas(value?: string | null) {
  return String(value || '').toLocaleUpperCase('es-PE');
}

function calcularPromedioFila(fila: GrillaData['grilla'][number], evaluaciones: Evaluacion[]) {
  if (!evaluaciones.length) return 0;
  const total = evaluaciones.reduce((suma, evaluacion) => suma + normalizarNotaEntera(fila[evaluacion.id]), 0);
  return Math.round(total / evaluaciones.length);
}

function getNotaColor(value: unknown) {
  const nota = normalizarNotaEntera(value);

  if (nota <= 10) {
    return 'border-red-200 bg-red-50/60 text-red-600 focus:border-red-300 focus:ring-red-100';
  }

  return 'border-blue-200 bg-blue-50/60 text-blue-700 focus:border-blue-300 focus:ring-blue-100';
}

export default function NotasPage() {
  const { token, user } = useAuth();
  const { queryParams, scopeLabel, activeScope } = useSchool();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [salonSeleccionado, setSalonSeleccionado] = useState('');
  const [asignacionId, setAsignacionId] = useState<number | null>(null);
  const [periodosNotas, setPeriodosNotas] = useState<PeriodoNotas[]>([]);
  const [periodoId, setPeriodoId] = useState(0);
  const [unidadId, setUnidadId] = useState(0);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [periodosError, setPeriodosError] = useState<string | null>(null);
  const [grilla, setGrilla] = useState<GrillaData | null>(null);
  const [grillaKey, setGrillaKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [asignacionesError, setAsignacionesError] = useState<string | null>(null);

  // ── Estados del modal de evaluación ──
  const [modalOpen, setModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [nuevaEvalDesc, setNuevaEvalDesc] = useState('');
  const [nuevaEvalTipoGrilla, setNuevaEvalTipoGrilla] = useState<TipoGrilla>('TRABAJO EN CLASE');
  const [evaluacionesModal, setEvaluacionesModal] = useState<EvaluacionModalItem[]>([]);
  const [guardandoModal, setGuardandoModal] = useState(false);

  // Estados de cierre/reapertura de registro (ya existentes)
  const [procesandoRegistro, setProcesandoRegistro] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | {
    tipo: 'cerrar' | 'reabrir';
    titulo: string;
    descripcion: string;
    textoBoton: string;
  }>(null);

  const esProfesor = user?.rol === 'Profesor';
  const puedeGestionarEvaluaciones = ['Admin', 'Director', 'Profesor'].includes(user?.rol || '');

  const esVistaConsolidada = activeScope.tipo === 'todos';

  const getSalonKey = useCallback((asignacion: Asignacion) => {
    return `${asignacion.id_colegio || 'sin-colegio'}-${asignacion.id_seccion || asignacion.seccion}`;
  }, []);

  const getSalonLabel = useCallback((asignacion: Asignacion) => {
    if (esVistaConsolidada && asignacion.colegio) {
      return `${asignacion.seccion} · ${asignacion.colegio}`;
    }
    return asignacion.seccion;
  }, [esVistaConsolidada]);

  const resetGrillaVisual = useCallback(() => {
    setGrilla(null);
    setGrillaKey('');
    setMensaje(null);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    setLoadingAsignaciones(true);
    setAsignacionesError(null);
    resetGrillaVisual();

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
          setSalonSeleccionado(getSalonKey(data[0]));
          setAsignacionId(data[0].id_asignacion);
        } else {
          setSalonSeleccionado('');
          setAsignacionId(null);
          setGrilla(null);
          setGrillaKey('');
        }
      })
      .catch((err) => {
        if (cancelled) return;

        console.error('Error cargando asignaciones docentes para notas:', err);
        setAsignaciones([]);
        setSalonSeleccionado('');
        setAsignacionId(null);
        setGrilla(null);
        setGrillaKey('');
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
  }, [token, queryParams, getSalonKey, resetGrillaVisual]);

  const salones = useMemo(() => {
    const unicos = new Map<string, { key: string; label: string }>();

    asignaciones.forEach((asignacion) => {
      if (!asignacion.seccion) return;

      const key = getSalonKey(asignacion);

      if (!unicos.has(key)) {
        unicos.set(key, {
          key,
          label: getSalonLabel(asignacion),
        });
      }
    });

    return Array.from(unicos.values());
  }, [asignaciones, getSalonKey, getSalonLabel]);

  const cursosPorSalon = useMemo(() => {
    if (!salonSeleccionado) return asignaciones;

    return asignaciones.filter((asignacion) => getSalonKey(asignacion) === salonSeleccionado);
  }, [asignaciones, salonSeleccionado, getSalonKey]);

  const asignacionActual = useMemo(() => asignaciones.find((a) => a.id_asignacion === asignacionId), [asignaciones, asignacionId]);

  const periodoActual = useMemo(
    () => periodosNotas.find((p) => p.id_bimestre === periodoId) || periodosNotas[0] || null,
    [periodosNotas, periodoId],
  );

  const unidadesDelPeriodo = periodoActual?.unidades || [];

  const unidadActual = useMemo(() => {
    return unidadesDelPeriodo.find((unidad) => unidad.id_unidad === unidadId) || null;
  }, [unidadesDelPeriodo, unidadId]);

  const unidadAbierta = Boolean(unidadActual?.estado_abierto);
  const registroCerrado = Boolean(grilla?.registro?.cerrado);
  const notasEditables = Boolean(unidadAbierta && !registroCerrado);
  const puedeReabrirRegistro = ['Admin', 'Director'].includes(user?.rol || '') && registroCerrado;

  // ── Helpers para modal por lote ──
  const getTipoEvalIdParaGrupo = useCallback((grupo: TipoGrilla) => {
    const buscador = (palabras: string[]) => {
      const encontrado = tipoEvaluaciones.find((tipo) => {
        const texto = normalizeText(tipo.label);
        return palabras.some((palabra) => texto.includes(palabra));
      });

      return encontrado ? Number(encontrado.id) : null;
    };

    if (grupo === 'PRÁCTICAS') return buscador(['practica']) || 3;
    if (grupo === 'EXAMEN') return buscador(['examen']) || 4;

    return buscador(['participacion', 'cuaderno', 'tarea']) || 1;
  }, []);

  const ordenGrillaActualKey = useMemo(() => {
    return (grilla?.evaluaciones || []).map((eva) => `eva-${eva.id}`).join('|');
  }, [grilla]);

  const ordenModalKey = useMemo(() => {
    return evaluacionesModal.map((eva) => eva.tempId).join('|');
  }, [evaluacionesModal]);

  const hayCambiosModal = useMemo(() => {
    return evaluacionesModal.some((eva) => eva.esNueva) || ordenModalKey !== ordenGrillaActualKey;
  }, [evaluacionesModal, ordenModalKey, ordenGrillaActualKey]);

  // Reemplazo de practicasExistentes y siguientePractica
  const practicasModal = useMemo(() => {
    const base = evaluacionesModal.length
      ? evaluacionesModal
      : (grilla?.evaluaciones || []).map((eva) => ({
          id: eva.id,
          tempId: `eva-${eva.id}`,
          descripcion: eva.descripcion,
          grupo_evaluacion: getGrupoEvaluacion(eva),
          esNueva: false,
        }));

    return base.filter((eva) => normalizarGrupoTipo(eva.grupo_evaluacion) === 'PRÁCTICAS');
  }, [evaluacionesModal, grilla]);

  const siguientePractica = useMemo(() => {
    const numeros = practicasModal
      .map((p) => {
        const match = normalizeText(p.descripcion).match(/practica\s*(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter((numero): numero is number => Number.isFinite(numero));

    return numeros.length ? Math.max(...numeros) + 1 : practicasModal.length + 1;
  }, [practicasModal]);

  const cargarGrilla = useCallback(async () => {
    if (!token || !asignacionId || !unidadId) {
      setGrilla(null);
      setGrillaKey('');
      setLoading(false);
      return;
    }

    const currentKey = `${asignacionId}-${unidadId}`;
    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get(`/api/calificaciones/unidades/${unidadId}/grilla?asignacion_id=${asignacionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGrilla(res.data);
      setGrillaKey(currentKey);
    } catch {
      setGrilla(null);
      setGrillaKey('');
    } finally {
      setLoading(false);
    }
  }, [token, asignacionId, unidadId]);

  useEffect(() => { cargarGrilla(); }, [cargarGrilla]);

  const cargarPeriodosNotas = useCallback(async () => {
    if (!token || !asignacionId) {
      setPeriodosNotas([]);
      setPeriodoId(0);
      setUnidadId(0);
      setGrillaKey('');
      setLoadingPeriodos(false);
      return;
    }

    setLoadingPeriodos(true);
    setPeriodosError(null);

    try {
      const res = await axios.get(`/api/academicos/asignaciones/${asignacionId}/periodos`, {
        headers: { Authorization: `Bearer ${token}` },
        params: queryParams,
      });

      const periodosDataRaw: PeriodoNotas[] = Array.isArray(res.data?.periodos)
        ? res.data.periodos
        : [];

      const periodosData = periodosDataRaw
        .map((periodo) => ({
          ...periodo,
          unidades: (periodo.unidades || []).filter((unidad) => unidad.estado_abierto),
        }))
        .filter((periodo) => periodo.unidades.length > 0);

      setPeriodosNotas(periodosData);

      const unidadPreferida =
        res.data?.unidad_abierta ||
        periodosData.flatMap((periodo) => periodo.unidades).find((unidad) => unidad.estado_abierto) ||
        periodosData[0]?.unidades?.[0];

      if (unidadPreferida) {
        const periodo = periodosData.find((item) =>
          item.unidades.some((unidad) => unidad.id_unidad === unidadPreferida.id_unidad),
        );

        setPeriodoId(periodo?.id_bimestre || periodosData[0]?.id_bimestre || 0);
        setUnidadId(unidadPreferida.id_unidad);
      } else {
        setPeriodoId(0);
        setUnidadId(0);
      }
    } catch (error: any) {
      setPeriodosNotas([]);
      setPeriodoId(0);
      setUnidadId(0);
      setPeriodosError(error.response?.data?.message || 'No se pudieron cargar los periodos del año.');
    } finally {
      setLoadingPeriodos(false);
    }
  }, [token, asignacionId, queryParams]);

  useEffect(() => {
    cargarPeriodosNotas();
  }, [cargarPeriodosNotas]);

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

  const evaluacionesAgrupadas = useMemo(() => {
    const grupos = new Map<string, Evaluacion[]>();

    (grilla?.evaluaciones || []).forEach((evaluacion) => {
      const grupo = getGrupoEvaluacion(evaluacion);
      const actuales = grupos.get(grupo) || [];
      actuales.push(evaluacion);
      grupos.set(grupo, actuales);
    });

    const orden = ['TRABAJO EN CLASE', 'PRÁCTICAS', 'EXAMEN'];
    return Array.from(grupos.entries()).sort(([a], [b]) => orden.indexOf(a) - orden.indexOf(b));
  }, [grilla]);

  const getPromedioClass = (promedio: number) => {
    if (normalizarNotaEntera(promedio) <= 10) {
      return 'bg-red-50 text-red-600 ring-red-200/60';
    }

    return 'bg-blue-50 text-blue-700 ring-blue-200/60';
  };

  const grillaSelectionKey = asignacionId && unidadId ? `${asignacionId}-${unidadId}` : '';
  const grillaEnSincronia = Boolean(grilla && grillaSelectionKey && grillaKey === grillaSelectionKey);
  const mostrandoCargaGrilla = Boolean(
    loading ||
    loadingAsignaciones ||
    loadingPeriodos ||
    (asignacionId && unidadId && !grillaEnSincronia)
  );

  const handleSalonChange = (salonKey: string) => {
    resetGrillaVisual();
    setPeriodosNotas([]);
    setPeriodoId(0);
    setUnidadId(0);
    setLoadingPeriodos(true);
    setSalonSeleccionado(salonKey);
    const primera = asignaciones.find((asignacion) => getSalonKey(asignacion) === salonKey);
    setAsignacionId(primera?.id_asignacion ?? null);
  };

  const handleCursoChange = (idAsignacion: number) => {
    resetGrillaVisual();
    setPeriodosNotas([]);
    setPeriodoId(0);
    setUnidadId(0);
    setLoadingPeriodos(true);
    setAsignacionId(idAsignacion);
    const asig = asignaciones.find((a) => a.id_asignacion === idAsignacion);
    if (asig) setSalonSeleccionado(getSalonKey(asig));
  };

  const handlePeriodoChange = (idPeriodo: number) => {
    resetGrillaVisual();
    const nuevoPeriodo = periodosNotas.find((p) => p.id_bimestre === idPeriodo) || periodosNotas[0];

    setPeriodoId(nuevoPeriodo?.id_bimestre || 0);
    setUnidadId(nuevoPeriodo?.unidades?.[0]?.id_unidad || 0);
  };

  const handleNotaChange = (idMatricula: number, idEval: number, valor: string) => {
    if (registroCerrado) return;
    if (!grilla) return;
    const notaNormalizada = normalizarNotaDesdeInput(valor);
    setGrilla({ ...grilla, grilla: grilla.grilla.map((fila) => fila.id_matricula === idMatricula ? { ...fila, [idEval]: notaNormalizada } : fila) });
  };

  const guardarNotas = async () => {
    if (!grilla || !token || !asignacionId || !notasEditables) return;
    setSaving(true); setMensaje(null);
    const notas = grilla.grilla.flatMap((fila) => grilla.evaluaciones.filter((eva) => { const v = fila[eva.id]; return v !== null && v !== undefined && v !== ''; }).map((eva) => ({ id_matricula: fila.id_matricula, id_evaluacion_det: eva.id, valor_nota: normalizarNotaEntera(fila[eva.id]) })));
    try {
      await axios.put(`/api/calificaciones/unidades/${unidadId}/notas`, { id_unidad: unidadId, notas }, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ tipo: 'exito', texto: 'Notas guardadas correctamente.' });
    } catch (err: any) { setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'Error al guardar las notas.' }); } finally { setSaving(false); }
  };

  // ── Modal: abrir con orden lógico ──
  const openModal = () => {
    setIsClosing(false);
    setNuevaEvalDesc('');
    setNuevaEvalTipoGrilla('TRABAJO EN CLASE');
    setEvaluacionesModal(
      (grilla?.evaluaciones || [])
        .map((eva) => ({
          id: eva.id,
          tempId: `eva-${eva.id}`,
          descripcion: eva.descripcion,
          grupo_evaluacion: getGrupoEvaluacion(eva),
          esNueva: false,
        }))
        .sort((a, b) => getGrupoOrden(a.grupo_evaluacion) - getGrupoOrden(b.grupo_evaluacion)),
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => { setModalOpen(false); setIsClosing(false); }, 200);
  };

  // ── Funciones para modal por lote ──
  const insertarEvaluacionEnOrden = useCallback((lista: EvaluacionModalItem[], nueva: EvaluacionModalItem) => {
    const grupoNuevo = normalizarGrupoTipo(nueva.grupo_evaluacion);
    const copia = [...lista];

    if (grupoNuevo === 'TRABAJO EN CLASE') {
      const primerNoTrabajo = copia.findIndex((item) => normalizarGrupoTipo(item.grupo_evaluacion) !== 'TRABAJO EN CLASE');
      if (primerNoTrabajo === -1) return [...copia, nueva];
      return [...copia.slice(0, primerNoTrabajo), nueva, ...copia.slice(primerNoTrabajo)];
    }

    if (grupoNuevo === 'PRÁCTICAS') {
      const ultimaPractica = copia.reduce((ultimo, item, index) => {
        return normalizarGrupoTipo(item.grupo_evaluacion) === 'PRÁCTICAS' ? index : ultimo;
      }, -1);

      if (ultimaPractica >= 0) {
        return [...copia.slice(0, ultimaPractica + 1), nueva, ...copia.slice(ultimaPractica + 1)];
      }

      const primerExamen = copia.findIndex((item) => normalizarGrupoTipo(item.grupo_evaluacion) === 'EXAMEN');
      if (primerExamen >= 0) return [...copia.slice(0, primerExamen), nueva, ...copia.slice(primerExamen)];

      return [...copia, nueva];
    }

    return [...copia, nueva];
  }, []);

  const agregarEvaluacionAlModal = useCallback((descripcionManual?: string, grupoManual?: TipoGrilla) => {
    const descripcion = (descripcionManual || nuevaEvalDesc).trim();
    const grupo = normalizarGrupoTipo(grupoManual || nuevaEvalTipoGrilla);

    if (!descripcion || !notasEditables) return;

    const nueva: EvaluacionModalItem = {
      tempId: crearTempId(),
      descripcion,
      grupo_evaluacion: grupo,
      esNueva: true,
    };

    setEvaluacionesModal((actual) => insertarEvaluacionEnOrden(actual, nueva));

    if (!descripcionManual) {
      setNuevaEvalDesc('');
      setNuevaEvalTipoGrilla('TRABAJO EN CLASE');
    }
  }, [insertarEvaluacionEnOrden, notasEditables, nuevaEvalDesc, nuevaEvalTipoGrilla]);

  const moverEvaluacionModal = (tempId: string, direccion: -1 | 1) => {
    setEvaluacionesModal((actual) => {
      const index = actual.findIndex((item) => item.tempId === tempId);
      const nuevoIndex = index + direccion;

      if (index < 0 || nuevoIndex < 0 || nuevoIndex >= actual.length) return actual;

      const copia = [...actual];
      const [item] = copia.splice(index, 1);
      copia.splice(nuevoIndex, 0, item);

      return copia;
    });
  };

  const quitarEvaluacionNuevaModal = (tempId: string) => {
    setEvaluacionesModal((actual) => actual.filter((item) => item.tempId !== tempId));
  };

  const guardarCambiosEvaluacionesModal = async () => {
    if (!token || !asignacionId || !unidadId || !notasEditables || !hayCambiosModal) return;

    setGuardandoModal(true);
    setMensaje(null);

    try {
      const idsFinales: number[] = [];

      for (const item of evaluacionesModal) {
        if (item.id) {
          idsFinales.push(item.id);
          continue;
        }

        const grupo = normalizarGrupoTipo(item.grupo_evaluacion);

        const res = await axios.post(
          '/api/calificaciones/evaluaciones',
          {
            id_asignacion: asignacionId,
            id_unidad: unidadId,
            id_tipo_eval: getTipoEvalIdParaGrupo(grupo),
            descripcion_actividad: item.descripcion,
            grupo_evaluacion: grupo,
            orden: idsFinales.length + 1,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const nuevoId = Number(res.data?.id_evaluacion_det || res.data?.id || res.data?.id_evaluacion);

        if (!nuevoId) {
          throw new Error('No se pudo obtener el ID de la evaluación creada.');
        }

        idsFinales.push(nuevoId);
      }

      await axios.put(
        '/api/calificaciones/evaluaciones/orden',
        {
          id_asignacion: asignacionId,
          id_unidad: unidadId,
          orden: idsFinales.map((id, index) => ({
            id_evaluacion_det: id,
            orden: index + 1,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMensaje({ tipo: 'exito', texto: 'Evaluaciones actualizadas correctamente.' });
      closeModal();
      await cargarGrilla();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || err.message || 'No se pudieron guardar las evaluaciones.',
      });
    } finally {
      setGuardandoModal(false);
    }
  };

  // Cierre y reapertura de registro (sin cambios respecto al ZIP anterior)
  const cerrarRegistroNotas = async () => {
    if (!token || !asignacionId || !unidadId) return;

    setProcesandoRegistro(true);
    setMensaje(null);

    try {
      await axios.put(
        `/api/calificaciones/unidades/${unidadId}/registro/cerrar`,
        { id_asignacion: asignacionId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMensaje({ tipo: 'exito', texto: 'Registro de notas cerrado correctamente.' });
      await cargarGrilla();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo cerrar el registro de notas.',
      });
    } finally {
      setProcesandoRegistro(false);
      setConfirmAction(null);
    }
  };

  const reabrirRegistroNotas = async () => {
    if (!token || !asignacionId || !unidadId) return;

    setProcesandoRegistro(true);
    setMensaje(null);

    try {
      await axios.put(
        `/api/calificaciones/unidades/${unidadId}/registro/reabrir`,
        { id_asignacion: asignacionId, motivo: motivoReapertura.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMensaje({ tipo: 'exito', texto: 'Registro de notas reabierto correctamente.' });
      setMotivoReapertura('');
      await cargarGrilla();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo reabrir el registro de notas.',
      });
    } finally {
      setProcesandoRegistro(false);
      setConfirmAction(null);
    }
  };

  const ejecutarConfirmAction = () => {
    if (confirmAction?.tipo === 'cerrar') cerrarRegistroNotas();
    if (confirmAction?.tipo === 'reabrir') reabrirRegistroNotas();
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
    <div className="carbon-notas-page w-full space-y-6">
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
        description="Grilla dinámica por salón, bimestre, unidad y curso."
        icon={BookOpenCheck}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {puedeGestionarEvaluaciones && (
              <button
                type="button"
                onClick={openModal}
                disabled={!asignacionId || !notasEditables}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Plus size={16} /> Agregar evaluación
              </button>
            )}
            {grilla && notasEditables && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    tipo: 'cerrar',
                    titulo: 'Cerrar registro de notas',
                    descripcion: 'Al cerrar este registro, las notas de este curso y unidad ya no podrán modificarse hasta que Dirección o Administración lo reabra.',
                    textoBoton: 'Cerrar registro',
                  })
                }
                disabled={procesandoRegistro}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <LockKeyhole size={16} />
                Cerrar registro
              </button>
            )}
            {grilla && puedeReabrirRegistro && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    tipo: 'reabrir',
                    titulo: 'Reabrir registro de notas',
                    descripcion: 'Esta acción volverá a permitir la edición de notas y evaluaciones para esta unidad. Registra el motivo de reapertura.',
                    textoBoton: 'Reabrir registro',
                  })
                }
                disabled={procesandoRegistro}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <UnlockKeyhole size={16} />
                Reabrir registro
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
              disabled={saving || !grilla || !notasEditables}
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
              {salones.map((salon) => (
                <option key={salon.key} value={salon.key}>
                  {salon.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}><Calendar size={14} /> Periodo</span>
            <select
              className={inputClass}
              value={periodoId}
              onChange={(e) => handlePeriodoChange(Number(e.target.value))}
              disabled={loadingPeriodos || periodosNotas.length === 0}
            >
              {loadingPeriodos && <option value={0}>Cargando periodos...</option>}
              {!loadingPeriodos && periodosNotas.length === 0 && <option value={0}>Sin unidades abiertas</option>}
              {periodosNotas.map((p) => (
                <option key={p.id_bimestre} value={p.id_bimestre}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}><ClipboardList size={14} /> Unidad</span>
            <select
              className={inputClass}
              value={unidadId}
              onChange={(e) => {
                resetGrillaVisual();
                setUnidadId(Number(e.target.value));
              }}
              disabled={loadingPeriodos || unidadesDelPeriodo.length === 0}
            >
              {unidadesDelPeriodo.length === 0 && <option value={0}>Sin unidades abiertas</option>}
              {unidadesDelPeriodo.map((unidad) => (
                <option key={unidad.id_unidad} value={unidad.id_unidad}>
                  {unidad.label}
                </option>
              ))}
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
            <p className="text-xl font-semibold text-neutral-900">
              {asignacionActual ? getSalonLabel(asignacionActual) : '—'}
            </p>
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

      {grilla && registroCerrado && (
        <section className="no-print rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-700 shadow-sm soft-fade-up">
          <div className="flex items-start gap-3">
            <LockKeyhole size={18} className="mt-0.5 text-slate-500" />
            <div>
              <p className="font-black text-slate-900">Registro de notas cerrado</p>
              <p className="mt-1 leading-6">
                Esta grilla ya no puede modificarse. Solo Dirección o Administración puede reabrirla si existe una corrección justificada.
              </p>
            </div>
          </div>
        </section>
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

       {/* Mensaje cuando no hay unidades abiertas para registrar notas */}
      {!loadingPeriodos && !periodosError && asignacionId && periodosNotas.length === 0 && (
        <section className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/80 px-6 py-5 text-sm text-amber-900 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-black">No hay unidades abiertas para registrar notas.</p>
                <p className="mt-1 max-w-3xl leading-6 text-amber-800">
                  Dirección debe configurar los periodos del año antes de registrar notas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.assign('/configuracion?tab=periodos')}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Ir a periodos
            </button>
          </div>
        </section>
      )}

      {/* Aviso de unidad cerrada */}
      {grilla && unidadActual && !unidadAbierta && (
        <section className="no-print rounded-3xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-700 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 text-slate-500" />
            <div>
              <p className="font-black text-slate-900">Unidad cerrada para edición</p>
              <p className="mt-1 leading-6">
                Puedes revisar o imprimir la grilla, pero no guardar cambios hasta que Dirección abra esta unidad.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Grilla */}
      {mostrandoCargaGrilla ? (
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
              <p className="mt-1 text-sm text-neutral-500">{grilla.asignacion?.seccion || asignacionActual?.seccion || 'Salón no especificado'} · {periodoActual?.label || 'Periodo'} · {unidadActual?.label || 'Unidad'}</p>
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
                            Código: {getCodigoAlumnoFila(fila)}
                          </p>
                        </div>

                        <span className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums ring-1 ${getPromedioClass(promedio)}`}>
                          {promedioTexto}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        {evaluacionesAgrupadas.map(([grupoNombre, items]) => {
                          const style = getGrupoStyle(grupoNombre);

                          return (
                            <div key={grupoNombre} className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                              <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${style.subHeader || ''}`}>
                                {grupoNombre}
                              </p>

                              <div className="mt-3 grid gap-3">
                                {items.map((eva) => (
                                  <label key={eva.id} className="grid grid-cols-[1fr_76px] items-center gap-3">
                                    <span className="text-xs font-bold leading-4 text-neutral-600">
                                      {textoMayusculas(eva.descripcion)}
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
                                      disabled={!notasEditables}
                                      className={`h-10 rounded-xl border text-center text-sm font-black tabular-nums outline-none transition-all focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${getNotaColor(fila[eva.id])}`}
                                      aria-label={`Nota de ${fila.alumno} en ${textoMayusculas(eva.descripcion)}`}
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
              <div className="carbon-notas-table-wrap hidden overflow-auto lg:block">
                <table className="carbon-notas-table w-full min-w-[1180px] text-sm">
                  <thead>
                    <tr className="carbon-notas-group-row">
                      <th rowSpan={2} className="carbon-rowspan-header carbon-sticky-start sticky left-0 z-30 w-14 border-b border-r border-neutral-100 bg-neutral-50 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400">N°</th>
                      <th rowSpan={2} className="carbon-rowspan-header carbon-sticky-name sticky left-[56px] z-30 w-[270px] border-b border-r border-neutral-100 bg-neutral-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Nombre completo</th>
                      {evaluacionesAgrupadas.map(([grupoNombre, items]) => {
                        const style = getGrupoStyle(grupoNombre);
                        return (
                          <th key={grupoNombre} colSpan={items.length} className={`carbon-group-header border-b border-r border-neutral-100 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest ${style.header || ''}`}>
                            {grupoNombre}
                          </th>
                        );
                      })}
                      <th rowSpan={2} className="carbon-rowspan-header carbon-sticky-prom sticky right-0 z-30 w-24 border-b border-l border-neutral-100 bg-neutral-50 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-neutral-400 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">Prom.</th>
                    </tr>
                    <tr className="carbon-notas-eval-row">
                      {evaluacionesAgrupadas.flatMap(([grupoNombre, items]) => {
                        const style = getGrupoStyle(grupoNombre);
                        return items.map((eva) => (
                          <th key={eva.id} className={`carbon-eval-header group min-w-[116px] border-b border-r border-neutral-100 px-2 py-2 text-center align-middle ${style.subHeader || ''}`}>
                            <div className="mx-auto flex max-w-[140px] items-center justify-center gap-1.5">
                              <span className="line-clamp-2 text-[11px] font-semibold leading-4 tracking-wide">{textoMayusculas(eva.descripcion)}</span>
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
                            <p className="text-[11px] text-neutral-400">Código: {getCodigoAlumnoFila(fila)}</p>
                          </td>
                          {evaluacionesAgrupadas.flatMap(([_, items]) =>
                            items.map((eva) => {
                              const style = getGrupoStyle(getGrupoEvaluacion(eva));
                              return (
                                <td key={eva.id} className={`border-b border-r border-neutral-100 px-2 py-2 text-center align-middle group-hover:bg-neutral-50/70 transition-colors ${style.cell || ''}`}>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formatearNotaEntera(fila[eva.id])}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onChange={(e) => handleNotaChange(fila.id_matricula, eva.id, e.target.value)}
                                    disabled={!notasEditables}
                                    className={`carbon-nota-input mx-auto h-9 w-16 rounded-xl border text-center text-sm font-semibold tabular-nums outline-none transition-all focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${getNotaColor(fila[eva.id])}`}
                                    aria-label={`Nota de ${fila.alumno} en ${textoMayusculas(eva.descripcion)}`}
                                  />
                                </td>
                              );
                            })
                          )}
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

      {/* ═══ Modal de Nueva Evaluación (por lote) ═══ */}
      {modalOpen && (
        <div className={`no-print fixed inset-0 z-[80] flex items-center justify-center p-4 ${isClosing ? 'modal-overlay-exit' : 'modal-overlay-enter'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl ring-1 ring-neutral-200/50 w-full max-w-lg overflow-hidden flex flex-col ${isClosing ? 'modal-panel-exit' : 'modal-panel-enter'}`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5 flex-shrink-0">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100"><Plus size={13} /> Nueva evaluación</div>
                <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">Agregar evaluación</h2>
                <p className="mt-1 text-sm text-neutral-400">{periodoActual?.label || 'Periodo'}, {unidadActual?.label || 'Unidad'}.</p>
              </div>
              <button type="button" onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 transition-all duration-150 hover:bg-neutral-200 hover:text-neutral-600 flex-shrink-0"><X size={16} /></button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_190px]">
                <div>
                  <label className={labelClass}>Descripción</label>
                  <input
                    type="text"
                    value={nuevaEvalDesc}
                    onChange={(e) => setNuevaEvalDesc(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
                    placeholder="Ej. Cuaderno, Exposición, Práctica 1, Examen..."
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    value={nuevaEvalTipoGrilla}
                    onChange={(e) => setNuevaEvalTipoGrilla(e.target.value as TipoGrilla)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-150 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
                  >
                    {tipoGrillaOptions.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => agregarEvaluacionAlModal()}
                    disabled={!nuevaEvalDesc.trim() || !notasEditables}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-black text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Plus size={15} />
                    Agregar al orden
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-blue-50/70 p-4 ring-1 ring-blue-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">Atajo rápido</p>
                    <p className="mt-1.5 text-sm font-semibold text-neutral-800">Siguiente práctica: Práctica {siguientePractica}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => agregarEvaluacionAlModal(`Práctica ${siguientePractica}`, 'PRÁCTICAS')}
                    disabled={!notasEditables}
                    className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition-all duration-150 hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Usar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3">
                  <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <ListOrdered size={14} />
                    Orden actual de la grilla
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Puedes mover las evaluaciones antes de guardar. Las nuevas evaluaciones se guardarán recién al final.
                  </p>
                </div>

                <div className="space-y-2">
                  {evaluacionesModal.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-semibold text-slate-400">
                      Aún no hay evaluaciones en esta unidad.
                    </div>
                  ) : (
                    evaluacionesModal.map((eva, index) => {
                      const grupo = normalizarGrupoTipo(eva.grupo_evaluacion);
                      const style = getGrupoStyle(grupo);

                      return (
                        <div
                          key={eva.tempId}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm transition-all duration-200 ${
                            eva.esNueva
                              ? 'border-blue-200 bg-blue-50/45'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <GripVertical size={16} className="shrink-0 text-slate-300" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-black text-slate-900">{eva.descripcion}</p>
                              {eva.esNueva && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                                  Nuevo
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${style.header}`}>
                              {grupo}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {eva.esNueva && (
                              <button
                                type="button"
                                onClick={() => quitarEvaluacionNuevaModal(eva.tempId)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition-all hover:bg-red-100"
                                title="Quitar"
                              >
                                <X size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => moverEvaluacionModal(eva.tempId, -1)}
                              disabled={index === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                              title="Subir"
                            >
                              <ArrowUp size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => moverEvaluacionModal(eva.tempId, 1)}
                              disabled={index === evaluacionesModal.length - 1}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                              title="Bajar"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 sm:flex-row sm:justify-end flex-shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 hover:border-neutral-300"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarCambiosEvaluacionesModal}
                disabled={!hayCambiosModal || guardandoModal || !notasEditables}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {guardandoModal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {guardandoModal ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cerrar/reabrir */}
      {confirmAction && (
        <div
          className="no-print fixed inset-0 z-[90] flex items-center justify-center p-4 modal-overlay-enter"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null); }}
        >
          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />

          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-neutral-200/60 modal-panel-enter">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-600"
            >
              <X size={16} />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              {confirmAction.tipo === 'cerrar' ? <LockKeyhole size={22} /> : <UnlockKeyhole size={22} />}
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-950">{confirmAction.titulo}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{confirmAction.descripcion}</p>

            {confirmAction.tipo === 'reabrir' && (
              <div className="mt-4">
                <label className={labelClass}>Motivo de reapertura</label>
                <textarea
                  value={motivoReapertura}
                  onChange={(e) => setMotivoReapertura(e.target.value)}
                  className="min-h-[88px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="Ej. Corrección solicitada por Dirección."
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={ejecutarConfirmAction}
                disabled={procesandoRegistro}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesandoRegistro ? <Loader2 size={16} className="animate-spin" /> : null}
                {confirmAction.textoBoton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}