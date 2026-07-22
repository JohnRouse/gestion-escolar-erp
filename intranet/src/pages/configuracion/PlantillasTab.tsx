import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  AlertCircle,
  BookOpenCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CopyPlus,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface TipoEval {
  id_tipo_eval: number;
  nombre_tipo: string;
}

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

interface Curso {
  id_curso: number;
  nombre_curso: string;
  area?: { nombre_area: string } | null;
}

interface DetallePlantilla {
  id_tipo_eval: number;
  descripcion: string;
  orden: number;
  tipo?: TipoEval;
}

interface Plantilla {
  id_plantilla: number;
  nombre: string;
  id_nivel: number | null;
  id_curso: number | null;
  detalles: DetallePlantilla[];
  nivel?: { nombre_nivel: string } | null;
  curso?: { nombre_curso: string } | null;
}

interface AnioLectivo {
  id_anio: number;
  nombre_anio: string;
  estado: string;
}

type Alcance = 'global' | 'nivel' | 'curso';
type FiltroAlcance = 'todos' | Alcance;
type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

const normalizeText = (value: string | number | null | undefined) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const toArray = <T,>(payload: unknown, possibleKeys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of possibleKeys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.rows)) return record.rows as T[];
  }
  return [];
};

const scopeMeta: Record<Alcance, { label: string; help: string; icon: typeof Building2 }> = {
  global: {
    label: 'Todo el colegio',
    help: 'Se usará como estructura general para todos los niveles y cursos.',
    icon: Building2,
  },
  nivel: {
    label: 'Por nivel',
    help: 'Ideal cuando Inicial, Primaria o Secundaria tienen evaluaciones distintas.',
    icon: GraduationCap,
  },
  curso: {
    label: 'Por curso',
    help: 'Útil para cursos con columnas propias, como Biología, Comunicación o Matemática.',
    icon: BookOpenCheck,
  },
};

export default function PlantillasTab() {
  const { token } = useAuth();

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [tipos, setTipos] = useState<TipoEval[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [anios, setAnios] = useState<AnioLectivo[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [plantillaAEliminar, setPlantillaAEliminar] = useState<Plantilla | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroAlcance, setFiltroAlcance] = useState<FiltroAlcance>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [alcance, setAlcance] = useState<Alcance>('global');
  const [idNivel, setIdNivel] = useState<number | null>(null);
  const [idCurso, setIdCurso] = useState<number | null>(null);
  const [detalles, setDetalles] = useState<DetallePlantilla[]>([]);

  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null);
  const [showAplicarAnio, setShowAplicarAnio] = useState(false);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const [aplicandoAnio, setAplicandoAnio] = useState(false);

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchData = async () => {
    if (!token) return;

    setLoading(true);
    setMensaje(null);

    try {
      const [plantRes, tiposRes, nivRes, curRes, aniosRes] = await Promise.all([
        axios.get('/api/plantillas', authHeaders),
        axios.get('/api/calificaciones/tipos-evaluacion', authHeaders),
        axios.get('/api/academicos/niveles', authHeaders),
        axios.get('/api/academicos/cursos', authHeaders),
        axios.get('/api/academicos/anios', authHeaders),
      ]);

      setPlantillas(toArray<Plantilla>(plantRes.data, ['plantillas']));
      setTipos(toArray<TipoEval>(tiposRes.data, ['tipos', 'tiposEvaluacion']));
      setNiveles(toArray<Nivel>(nivRes.data, ['niveles']));
      setCursos(toArray<Curso>(curRes.data, ['cursos']));
      setAnios(toArray<AnioLectivo>(aniosRes.data, ['anios', 'aniosLectivos']));
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudieron cargar las plantillas de evaluación.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sortedDetalles = (items: DetallePlantilla[]) =>
    [...(items || [])].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

  const getTipoNombre = (idTipo: number) =>
    tipos.find((tipo) => Number(tipo.id_tipo_eval) === Number(idTipo))?.nombre_tipo || 'Evaluación';

  const getAlcancePlantilla = (plantilla: Plantilla): Alcance => {
    if (plantilla.id_curso) return 'curso';
    if (plantilla.id_nivel) return 'nivel';
    return 'global';
  };

  const getAlcanceLabel = (plantilla: Plantilla) => {
    if (plantilla.id_curso) return plantilla.curso?.nombre_curso || 'Curso específico';
    if (plantilla.id_nivel) return plantilla.nivel?.nombre_nivel || 'Nivel específico';
    return 'Todos los niveles y cursos';
  };

  const getAlcanceBadge = (plantilla: Plantilla) => {
    const tipo = getAlcancePlantilla(plantilla);
    if (tipo === 'curso') return 'Curso';
    if (tipo === 'nivel') return 'Nivel';
    return 'Global';
  };

  const plantillasFiltradas = useMemo(() => {
    const query = normalizeText(busqueda.trim());

    return plantillas.filter((plantilla) => {
      const alcancePlantilla = getAlcancePlantilla(plantilla);
      const coincideAlcance = filtroAlcance === 'todos' || filtroAlcance === alcancePlantilla;
      const texto = normalizeText(
        [
          plantilla.nombre,
          getAlcanceLabel(plantilla),
          ...(plantilla.detalles || []).map(
            (detalle) => detalle.descripcion || detalle.tipo?.nombre_tipo || getTipoNombre(detalle.id_tipo_eval)
          ),
        ].join(' ')
      );

      return coincideAlcance && (!query || texto.includes(query));
    });
  }, [busqueda, filtroAlcance, plantillas, tipos]);

  const stats = useMemo(() => {
    const totalEvaluaciones = plantillas.reduce(
      (acc, plantilla) => acc + (plantilla.detalles?.length || 0),
      0
    );

    return {
      total: plantillas.length,
      globales: plantillas.filter((plantilla) => getAlcancePlantilla(plantilla) === 'global').length,
      porNivel: plantillas.filter((plantilla) => getAlcancePlantilla(plantilla) === 'nivel').length,
      porCurso: plantillas.filter((plantilla) => getAlcancePlantilla(plantilla) === 'curso').length,
      totalEvaluaciones,
    };
  }, [plantillas]);

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setAlcance('global');
    setIdNivel(null);
    setIdCurso(null);
    setDetalles([]);
    setMensaje(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (plantilla: Plantilla) => {
    setEditingId(plantilla.id_plantilla);
    setNombre(plantilla.nombre || '');
    setAlcance(getAlcancePlantilla(plantilla));
    setIdNivel(plantilla.id_nivel || null);
    setIdCurso(plantilla.id_curso || null);
    setDetalles(
      sortedDetalles(plantilla.detalles || []).map((detalle, index) => ({
        id_tipo_eval: Number(detalle.id_tipo_eval || detalle.tipo?.id_tipo_eval || 0),
        descripcion: detalle.descripcion || detalle.tipo?.nombre_tipo || '',
        orden: index + 1,
      }))
    );
    setMensaje(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const handleChangeAlcance = (nextAlcance: Alcance) => {
    setAlcance(nextAlcance);
    setIdNivel(null);
    setIdCurso(null);
  };

  const nextPracticeNumber = (items = detalles, excludeIndex?: number) => {
    const practiceCount = items.filter((detalle, index) => {
      if (excludeIndex !== undefined && index === excludeIndex) return false;
      return normalizeText(getTipoNombre(detalle.id_tipo_eval)).includes('practica');
    }).length;

    return practiceCount + 1;
  };

  const buildSuggestedDescription = (tipoId: number, items = detalles, excludeIndex?: number) => {
    const tipoNombre = getTipoNombre(tipoId);
    const tipoNormalizado = normalizeText(tipoNombre);

    if (tipoNormalizado.includes('practica')) return `Práctica ${nextPracticeNumber(items, excludeIndex)}`;
    if (tipoNormalizado.includes('examen')) return 'Examen';
    if (tipoNormalizado.includes('cuaderno')) return 'Cuaderno';
    if (tipoNormalizado.includes('participacion')) return 'Participación';
    if (tipoNormalizado.includes('exposicion')) return 'Exposición';

    return tipoNombre;
  };

  const findTipoId = (name: string) =>
    tipos.find((tipo) => normalizeText(tipo.nombre_tipo).includes(normalizeText(name)))?.id_tipo_eval ||
    tipos[0]?.id_tipo_eval ||
    0;

  const addDetalle = (tipoId?: number) => {
    const selectedTipoId = tipoId || tipos[0]?.id_tipo_eval || 0;
    if (!selectedTipoId) return;

    setDetalles((prev) => [
      ...prev,
      {
        id_tipo_eval: selectedTipoId,
        descripcion: buildSuggestedDescription(selectedTipoId, prev),
        orden: prev.length + 1,
      },
    ]);
  };

  const aplicarEstructuraBase = () => {
    if (tipos.length === 0) return;

    const base = [
      { tipo: findTipoId('participacion'), descripcion: 'Participación' },
      { tipo: findTipoId('cuaderno'), descripcion: 'Cuaderno' },
      { tipo: findTipoId('practica'), descripcion: 'Práctica 1' },
      { tipo: findTipoId('practica'), descripcion: 'Práctica 2' },
      { tipo: findTipoId('practica'), descripcion: 'Práctica 3' },
      { tipo: findTipoId('examen'), descripcion: 'Examen' },
    ];

    setDetalles(
      base.map((item, index) => ({
        id_tipo_eval: item.tipo,
        descripcion: item.descripcion,
        orden: index + 1,
      }))
    );
  };

  const removeDetalle = (index: number) => {
    setDetalles((prev) =>
      prev
        .filter((_, currentIndex) => currentIndex !== index)
        .map((detalle, nextIndex) => ({ ...detalle, orden: nextIndex + 1 }))
    );
  };

  const updateDetalle = (index: number, field: keyof DetallePlantilla, value: string | number) => {
    setDetalles((prev) =>
      prev.map((detalle, currentIndex) => {
        if (currentIndex !== index) return detalle;

        const nextDetalle = { ...detalle, [field]: value } as DetallePlantilla;

        if (field === 'id_tipo_eval') {
          nextDetalle.id_tipo_eval = Number(value);
          nextDetalle.descripcion = buildSuggestedDescription(Number(value), prev, index);
        }

        return nextDetalle;
      })
    );
  };

  const moveDetalle = (index: number, direction: 'up' | 'down') => {
    setDetalles((prev) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const items = [...prev];
      const [item] = items.splice(index, 1);
      items.splice(nextIndex, 0, item);

      return items.map((detalle, orderIndex) => ({ ...detalle, orden: orderIndex + 1 }));
    });
  };

  const validateForm = () => {
    if (!nombre.trim()) return 'Ingresa un nombre para la plantilla.';
    if (alcance === 'nivel' && !idNivel) return 'Selecciona el nivel al que se aplicará la plantilla.';
    if (alcance === 'curso' && !idCurso) return 'Selecciona el curso al que se aplicará la plantilla.';
    if (detalles.length === 0) return 'Agrega al menos una evaluación a la plantilla.';
    if (detalles.some((detalle) => !detalle.id_tipo_eval)) return 'Selecciona el tipo en todas las evaluaciones.';
    if (detalles.some((detalle) => !detalle.descripcion.trim())) return 'Completa la descripción de todas las evaluaciones.';

    return null;
  };

  const handleSave = async () => {
    if (!token) return;

    const error = validateForm();
    if (error) {
      setMensaje({ tipo: 'error', texto: error });
      return;
    }

    setSaving(true);
    setMensaje(null);

    const data = {
      nombre: nombre.trim(),
      id_nivel: alcance === 'nivel' ? idNivel : null,
      id_curso: alcance === 'curso' ? idCurso : null,
      detalles: detalles.map((detalle, index) => ({
        id_tipo_eval: Number(detalle.id_tipo_eval),
        descripcion: detalle.descripcion.trim(),
        orden: index + 1,
      })),
    };

    try {
      if (editingId) {
        await axios.put(`/api/plantillas/${editingId}`, data, authHeaders);
      } else {
        await axios.post('/api/plantillas', data, authHeaders);
      }

      await fetchData();
      setMensaje({
        tipo: 'exito',
        texto: editingId ? 'Plantilla actualizada correctamente.' : 'Plantilla creada correctamente.',
      });
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al guardar la plantilla.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !token ||
      !plantillaAEliminar ||
      deletingId !== null
    ) {
      return;
    }

    const plantilla = plantillaAEliminar;

    setDeletingId(plantilla.id_plantilla);
    setMensaje(null);

    try {
      await axios.delete(
        `/api/plantillas/${plantilla.id_plantilla}`,
        authHeaders,
      );

      setPlantillas((prev) =>
        prev.filter(
          (item) =>
            item.id_plantilla !==
            plantilla.id_plantilla,
        ),
      );

      setMensaje({
        tipo: 'exito',
        texto:
          'Plantilla eliminada correctamente.',
      });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto:
          err.response?.data?.message ||
          'No se pudo eliminar la plantilla.',
      });
    } finally {
      setDeletingId(null);
      setPlantillaAEliminar(null);
    }
  };

  const handleAplicarAnio = async () => {
    if (!anioSeleccionado || !plantillaSeleccionada || !token) return;

    setAplicandoAnio(true);
    setMensaje(null);

    try {
      const res = await axios.post(
        `/api/plantillas/${plantillaSeleccionada.id_plantilla}/aplicar-anio`,
        { id_anio: anioSeleccionado },
        authHeaders
      );

      setShowAplicarAnio(false);
      setPlantillaSeleccionada(null);
      setAnioSeleccionado(null);
      setMensaje({
        tipo: 'exito',
        texto: `Plantilla aplicada a ${res.data?.asignaciones ?? 0} asignaciones y ${res.data?.unidades ?? 0} unidades. ${res.data?.evaluacionesCreadas ?? 0} evaluaciones creadas, ${res.data?.evaluacionesExistentes ?? 0} ya existían.`,
      });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al aplicar la plantilla al año.',
      });
    } finally {
      setAplicandoAnio(false);
    }
  };

  const renderAlcanceIcon = (plantilla: Plantilla) => {
    const scope = getAlcancePlantilla(plantilla);
    if (scope === 'curso') return <BookOpenCheck size={15} />;
    if (scope === 'nivel') return <GraduationCap size={15} />;
    return <Building2 size={15} />;
  };

  const alcanceResumen = useMemo(() => {
    if (alcance === 'global') return 'Global';
    if (alcance === 'nivel') {
      return niveles.find((nivel) => nivel.id_nivel === idNivel)?.nombre_nivel || 'Nivel pendiente';
    }
    return cursos.find((curso) => curso.id_curso === idCurso)?.nombre_curso || 'Curso pendiente';
  }, [alcance, idNivel, idCurso, niveles, cursos]);

  const empty = !loading && plantillasFiltradas.length === 0;
  const noTipos = !loading && tipos.length === 0;
  const previewColumns = detalles.length > 0 ? detalles.slice(0, 4) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Plantillas', value: stats.total, icon: ClipboardList },
          { label: 'Globales', value: stats.globales, icon: Building2 },
          { label: 'Por nivel', value: stats.porNivel, icon: GraduationCap },
          { label: 'Por curso', value: stats.porCurso, icon: BookOpenCheck },
          { label: 'Evaluaciones', value: stats.totalEvaluaciones, icon: Layers3 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-[1.45rem] border border-gray-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{item.label}</p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-[-0.04em] text-gray-950">{item.value}</p>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                  <Icon size={19} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mensaje && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
            mensaje.tipo === 'exito'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {noTipos && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-semibold">Primero configura los tipos de evaluación.</p>
              <p className="mt-1 leading-6">
                Para crear una plantilla necesitas tener tipos como Participación, Cuaderno, Práctica o Examen en la pestaña “Tipos de Evaluación”.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[1.75rem] border border-gray-200/70 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                <Sparkles size={19} />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-gray-950">
                  Plantillas de evaluación
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Define desde el inicio del año qué columnas aparecerán en la grilla de notas según el alcance que elijas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(76,110,245,0.95)] transition-all hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || tipos.length === 0}
            >
              <Plus size={17} /> Nueva plantilla
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar plantilla, curso, nivel o evaluación..."
                className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50/70 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition focus:border-accent-200 focus:bg-white focus:ring-4 focus:ring-accent-50"
              />
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-1">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'global', label: 'Global' },
                { key: 'nivel', label: 'Nivel' },
                { key: 'curso', label: 'Curso' },
              ].map((item) => {
                const active = filtroAlcance === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFiltroAlcance(item.key as FiltroAlcance)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-white text-accent-600 shadow-sm ring-1 ring-gray-200/70'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-14 w-full rounded-2xl" />
            <div className="skeleton h-14 w-full rounded-2xl" />
            <div className="skeleton h-14 w-full rounded-2xl" />
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gray-50 text-gray-400 ring-1 ring-gray-200/80">
              <ClipboardList size={24} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-gray-950">No hay plantillas para mostrar</h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              Crea una plantilla base para que el registro de notas cargue automáticamente sus columnas.
            </p>
            <button
              type="button"
              onClick={openCreate}
              disabled={tipos.length === 0}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} /> Nueva plantilla
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                  <th className="px-5 py-3 text-left">Plantilla</th>
                  <th className="px-5 py-3 text-left">Aplica a</th>
                  <th className="px-5 py-3 text-left">Estructura</th>
                  <th className="px-5 py-3 text-center">Evaluaciones</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plantillasFiltradas.map((plantilla) => {
                  const detallesOrdenados = sortedDetalles(plantilla.detalles || []);

                  return (
                    <tr key={plantilla.id_plantilla} className="transition hover:bg-gray-50/70">
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-gray-950">{plantilla.nombre}</p>
                        <p className="mt-1 text-xs text-gray-400">ID #{plantilla.id_plantilla}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
                          {renderAlcanceIcon(plantilla)}
                          <span>{getAlcanceBadge(plantilla)}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-600">{getAlcanceLabel(plantilla)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex max-w-xl flex-wrap gap-2">
                          {detallesOrdenados.slice(0, 7).map((detalle, index) => (
                            <span
                              key={`${plantilla.id_plantilla}-${detalle.orden}-${index}`}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600"
                            >
                              <span className="text-gray-400">{index + 1}.</span>
                              {detalle.descripcion || detalle.tipo?.nombre_tipo || getTipoNombre(detalle.id_tipo_eval)}
                            </span>
                          ))}
                          {detallesOrdenados.length === 0 && (
                            <span className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-400">
                              Sin evaluaciones
                            </span>
                          )}
                          {detallesOrdenados.length > 7 && (
                            <span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-600">
                              +{detallesOrdenados.length - 7} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center align-top">
                        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-2xl bg-gray-50 px-3 text-sm font-bold text-gray-800 ring-1 ring-gray-200/70">
                          {detallesOrdenados.length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right align-top">
                        <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => openEdit(plantilla)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-50 hover:text-accent-600"
                            title="Editar plantilla"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPlantillaSeleccionada(plantilla);
                              setShowAplicarAnio(true);
                              setAnioSeleccionado(null);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-accent-50 hover:text-accent-600"
                            title="Aplicar a todo el año"
                          >
                            <Calendar size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlantillaAEliminar(plantilla)}
                            disabled={deletingId === plantilla.id_plantilla}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Eliminar plantilla"
                          >
                            {deletingId === plantilla.id_plantilla ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
                  <ClipboardList size={14} /> Plantilla anual
                </span>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-gray-950">
                  {editingId ? 'Editar plantilla' : 'Nueva plantilla'}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Configura la estructura que luego se usará para generar las columnas del registro de notas por unidad.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5 p-5 sm:p-6">
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                    Nombre de la plantilla
                  </label>
                  <input
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Ej. Evaluaciones Primaria"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50/70 px-4 text-sm font-medium text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-accent-200 focus:bg-white focus:ring-4 focus:ring-accent-50"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Alcance</p>
                      <p className="mt-1 text-sm text-gray-500">Elige dónde se aplicará esta plantilla.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(Object.keys(scopeMeta) as Alcance[]).map((key) => {
                      const item = scopeMeta[key];
                      const Icon = item.icon;
                      const active = alcance === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleChangeAlcance(key)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? 'border-accent-200 bg-accent-50 text-accent-700 ring-4 ring-accent-50'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={17} />
                            <span className="text-sm font-semibold">{item.label}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-gray-500">{item.help}</p>
                        </button>
                      );
                    })}
                  </div>

                  {alcance !== 'global' && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {alcance === 'nivel' && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                            Nivel
                          </label>
                          <select
                            value={idNivel || ''}
                            onChange={(event) => setIdNivel(event.target.value ? Number(event.target.value) : null)}
                            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-200 focus:ring-4 focus:ring-accent-50"
                          >
                            <option value="">Seleccionar nivel</option>
                            {niveles.map((nivel) => (
                              <option key={nivel.id_nivel} value={nivel.id_nivel}>
                                {nivel.nombre_nivel}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {alcance === 'curso' && (
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                            Curso
                          </label>
                          <select
                            value={idCurso || ''}
                            onChange={(event) => setIdCurso(event.target.value ? Number(event.target.value) : null)}
                            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-200 focus:ring-4 focus:ring-accent-50"
                          >
                            <option value="">Seleccionar curso</option>
                            {cursos.map((curso) => (
                              <option key={curso.id_curso} value={curso.id_curso}>
                                {curso.area?.nombre_area ? `${curso.area.nombre_area} · ` : ''}
                                {curso.nombre_curso}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-950">Estructura de evaluaciones</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        El orden de esta lista será el orden de columnas en la grilla de notas.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={aplicarEstructuraBase}
                        disabled={tipos.length === 0}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CopyPlus size={14} /> Usar base
                      </button>
                      <button
                        type="button"
                        onClick={() => addDetalle()}
                        disabled={tipos.length === 0}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent-500 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus size={14} /> Agregar
                      </button>
                    </div>
                  </div>

                  {tipos.length === 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      No hay tipos de evaluación cargados. Crea primero los tipos en la pestaña “Tipos de Evaluación”.
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {detalles.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                        <FileText className="mx-auto text-gray-300" size={25} />
                        <p className="mt-2 text-sm font-semibold text-gray-700">Aún no hay evaluaciones</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Agrega Participación, Cuaderno, Prácticas, Examen u otros tipos configurados.
                        </p>
                      </div>
                    ) : (
                      detalles.map((detalle, index) => (
                        <div
                          key={`${detalle.orden}-${index}`}
                          className="grid grid-cols-1 gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:grid-cols-[auto_1fr_1fr_auto] md:items-center"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-sm font-bold text-gray-500 ring-1 ring-gray-200/70">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="flex md:hidden">
                              <button
                                type="button"
                                onClick={() => moveDetalle(index, 'up')}
                                disabled={index === 0}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                              >
                                <ChevronUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDetalle(index, 'down')}
                                disabled={index === detalles.length - 1}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                              >
                                <ChevronDown size={15} />
                              </button>
                            </div>
                          </div>

                          <select
                            value={detalle.id_tipo_eval || ''}
                            onChange={(event) => updateDetalle(index, 'id_tipo_eval', Number(event.target.value))}
                            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-200 focus:ring-4 focus:ring-accent-50"
                          >
                            <option value="">Tipo</option>
                            {tipos.map((tipo) => (
                              <option key={tipo.id_tipo_eval} value={tipo.id_tipo_eval}>
                                {tipo.nombre_tipo}
                              </option>
                            ))}
                          </select>

                          <input
                            value={detalle.descripcion}
                            onChange={(event) => updateDetalle(index, 'descripcion', event.target.value)}
                            placeholder="Ej. Práctica 1"
                            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition placeholder:text-gray-300 focus:border-accent-200 focus:ring-4 focus:ring-accent-50"
                          />

                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => moveDetalle(index, 'up')}
                              disabled={index === 0}
                              className="hidden h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                              title="Subir"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDetalle(index, 'down')}
                              disabled={index === detalles.length - 1}
                              className="hidden h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                              title="Bajar"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDetalle(index)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                              title="Eliminar evaluación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <aside className="border-t border-gray-100 bg-gray-50/80 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="sticky top-0 space-y-4">
                  <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Resumen</p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-950">
                      {nombre.trim() || 'Nombre de la plantilla'}
                    </h3>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Alcance</span>
                        <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
                          {alcanceResumen}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Evaluaciones</span>
                        <span className="font-semibold text-gray-900">{detalles.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Vista previa</p>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                      <div
                        className="grid bg-gray-50 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400"
                        style={{
                          gridTemplateColumns: `1.15fr repeat(${Math.max(previewColumns.length, 2)}, minmax(72px, 1fr)) 72px`,
                        }}
                      >
                        <div className="border-r border-gray-200 px-3 py-2 text-left">Alumno</div>
                        {previewColumns.length > 0 ? (
                          previewColumns.map((detalle, index) => (
                            <div key={`${detalle.descripcion}-${index}`} className="border-r border-gray-200 px-3 py-2">
                              {detalle.descripcion || `Eval. ${index + 1}`}
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="border-r border-gray-200 px-3 py-2">Eval. 1</div>
                            <div className="border-r border-gray-200 px-3 py-2">Eval. 2</div>
                          </>
                        )}
                        <div className="px-3 py-2">Prom.</div>
                      </div>
                      <div
                        className="grid text-center text-xs font-semibold text-gray-700"
                        style={{
                          gridTemplateColumns: `1.15fr repeat(${Math.max(previewColumns.length, 2)}, minmax(72px, 1fr)) 72px`,
                        }}
                      >
                        <div className="border-r border-t border-gray-200 px-3 py-3 text-left">Estudiante</div>
                        {Array.from({ length: Math.max(previewColumns.length, 2) }).map((_, index) => (
                          <div key={index} className="border-r border-t border-gray-200 px-3 py-3 last:border-r-0">
                            00
                          </div>
                        ))}
                        <div className="border-t border-gray-200 px-3 py-3">00</div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      Esta plantilla no registra notas; solo define las columnas que aparecerán luego en la grilla.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-accent-100 bg-accent-50/70 p-4 text-xs leading-5 text-accent-700">
                    <p className="font-semibold">Sugerencia</p>
                    <p className="mt-1">
                      Mantén nombres cortos: “Práctica 1”, “Práctica 2”, “Examen”. Así la grilla queda limpia y fácil de leer.
                    </p>
                  </div>
                </div>
              </aside>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-white p-5 sm:flex-row sm:justify-end sm:p-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(76,110,245,0.95)] transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {saving ? 'Guardando...' : 'Guardar plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAplicarAnio && plantillaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"
            onClick={() => {
              if (aplicandoAnio) return;
              setShowAplicarAnio(false);
              setPlantillaSeleccionada(null);
              setAnioSeleccionado(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.55)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <Calendar size={21} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-950">Aplicar plantilla al año</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Se crearán las evaluaciones de <span className="font-semibold text-gray-800">{plantillaSeleccionada.nombre}</span> en las asignaciones del año seleccionado.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                Año lectivo
              </label>
              <select
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-200 focus:ring-4 focus:ring-accent-50"
                value={anioSeleccionado || ''}
                onChange={(event) => setAnioSeleccionado(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Seleccionar año</option>
                {anios.map((anio) => (
                  <option key={anio.id_anio} value={anio.id_anio}>
                    {anio.nombre_anio} ({anio.estado})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (aplicandoAnio) return;
                  setShowAplicarAnio(false);
                  setPlantillaSeleccionada(null);
                  setAnioSeleccionado(null);
                }}
                disabled={aplicandoAnio}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAplicarAnio}
                disabled={!anioSeleccionado || aplicandoAnio}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aplicandoAnio ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {aplicandoAnio ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(plantillaAEliminar)}
        eyebrow="Plantillas de evaluación"
        title={
          plantillaAEliminar
            ? `Eliminar plantilla "${plantillaAEliminar.nombre}"`
            : 'Eliminar plantilla'
        }
        description="La plantilla se eliminará de forma definitiva. Si ya tiene información relacionada, el sistema puede impedir la operación para proteger el historial."
        tone="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        loading={deletingId !== null}
        onCancel={() =>
          setPlantillaAEliminar(null)
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
