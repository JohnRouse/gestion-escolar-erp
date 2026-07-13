import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Lock,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';

interface ColegioBasico {
  id_colegio: number;
  nombre?: string | null;
  nombre_corto?: string | null;
}

interface Anio {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  colegio?: ColegioBasico | null;
}

interface Unidad {
  id_unidad: number;
  numero: number;
  nombre?: string;
  label: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado_abierto: boolean;
}

interface Periodo {
  id_bimestre: number;
  numero: number;
  nombre?: string;
  label: string;
  fecha_inicio: string;
  fecha_fin: string;
  unidades: Unidad[];
}

interface PeriodosResponse {
  anio: Anio | null;
  periodos: Periodo[];
}

const panelClass =
  'rounded-[1.5rem] border border-slate-200/70 bg-white/95 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.45)] ring-1 ring-white/70';

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300';

const labelClass =
  'mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400';

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PeriodosUnidadesTab() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [anios, setAnios] = useState<Anio[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const [colegioGestionId, setColegioGestionId] = useState('');
  const [idAnio, setIdAnio] = useState('');
  const [modelo, setModelo] = useState<'bimestral' | 'trimestral' | 'personalizado'>('bimestral');
  const [cantidadPeriodos, setCantidadPeriodos] = useState(4);
  const [unidadesPorPeriodo, setUnidadesPorPeriodo] = useState(2);
  const [reemplazar, setReemplazar] = useState(false);

  const [confirmGenerarOpen, setConfirmGenerarOpen] = useState(false);
  const [editando, setEditando] = useState<
    | { tipo: 'periodo'; id: number; nombre: string; fecha_inicio: string; fecha_fin: string }
    | { tipo: 'unidad'; id: number; nombre: string; fecha_inicio: string; fecha_fin: string }
    | null
  >(null);

  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;
  const colegioSeleccionadoId = Number(
    mostrarSelectorInstitucion
      ? colegioGestionId
      : activeColegio?.id_colegio || colegioGestionId || colegios[0]?.id_colegio || 0,
  );

  const nombreColegio = (id?: number | null) => {
    if (!id) return 'Institución no definida';
    const colegio = colegios.find((item) => item.id_colegio === id);
    return colegio?.nombre || colegio?.nombre_corto || `Institución #${id}`;
  };

  const aniosFiltrados = useMemo(() => {
    return anios.filter((anio) => {
      if (!colegioSeleccionadoId) return true;
      return Number(anio.id_colegio) === Number(colegioSeleccionadoId);
    });
  }, [anios, colegioSeleccionadoId]);

  const unidades = useMemo(() => periodos.flatMap((periodo) => periodo.unidades), [periodos]);
  const unidadAbierta = unidades.find((unidad) => unidad.estado_abierto);
  const totalUnidades = unidades.length;

  const toInputDate = (value?: string) => value ? String(value).slice(0, 10) : '';

  const nombrePeriodoBase =
    modelo === 'bimestral'
      ? 'Bimestre'
      : modelo === 'trimestral'
        ? 'Trimestre'
        : 'Periodo';

  const queryConColegio = () => {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');
    if (colegioSeleccionadoId) params.set('colegio_id', String(colegioSeleccionadoId));
    return `?${params.toString()}`;
  };

  const scopedQuery = useMemo(() => queryConColegio(), [queryString, colegioSeleccionadoId]);

  const estadoAnioPrioridad = (estado?: string) => {
    const texto = String(estado || '').toLowerCase();

    if (texto.includes('curso')) return 1;
    if (texto.includes('abierto')) return 2;
    if (texto.includes('matr')) return 3;
    if (texto.includes('plan')) return 4;

    return 9;
  };

  const elegirAnioRecomendado = (lista: Anio[]) => {
    return [...lista].sort((a, b) => {
      const prioridad = estadoAnioPrioridad(a.estado) - estadoAnioPrioridad(b.estado);
      if (prioridad !== 0) return prioridad;
      return Number(b.id_anio) - Number(a.id_anio);
    })[0];
  };

  // Inicializar la institución en vista consolidada
  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  const cargarAnios = async () => {
    if (!token || !colegioSeleccionadoId) {
      setAnios([]);
      setIdAnio('');
      setPeriodos([]);
      setLoading(false); // Evitar que la pantalla se quede en skeleton
      return;
    }

    setLoading(true);
    setMensaje(null);
    setIdAnio('');
    setPeriodos([]);

    try {
      const res = await axios.get(`/api/academicos/anios${queryConColegio()}`, authHeader);
      const data = Array.isArray(res.data) ? res.data : [];

      const filtrados = data.filter(
        (anio) => Number(anio.id_colegio) === Number(colegioSeleccionadoId),
      );

      setAnios(filtrados);

      const recomendado = elegirAnioRecomendado(filtrados);
      setIdAnio(recomendado ? String(recomendado.id_anio) : '');
    } catch (error) {
      setAnios([]);
      setIdAnio('');
      setPeriodos([]);
      setMensaje({ type: 'error', text: 'No se pudieron cargar los años lectivos.' });
    } finally {
      setLoading(false);
    }
  };

  const cargarPeriodos = async (anio = idAnio) => {
    if (!token || !anio) {
      setPeriodos([]);
      return;
    }

    const anioActual = anios.find((item) => String(item.id_anio) === String(anio));

    if (
      colegioSeleccionadoId &&
      anioActual?.id_colegio &&
      Number(anioActual.id_colegio) !== Number(colegioSeleccionadoId)
    ) {
      setPeriodos([]);
      return;
    }

    try {
      const params = new URLSearchParams(scopedQuery.slice(1));
      params.set('anio_id', anio);

      const res = await axios.get<PeriodosResponse>(`/api/academicos/periodos-unidades?${params.toString()}`, authHeader);
      const data = res.data?.periodos || [];
      setPeriodos(data);

      const openState: Record<number, boolean> = {};
      data.forEach((periodo) => {
        openState[periodo.id_bimestre] = true;
      });
      setExpanded(openState);
    } catch (error: any) {
      setPeriodos([]);
      setMensaje({
        type: 'error',
        text: error.response?.data?.message || 'No se pudieron cargar los periodos del año seleccionado.',
      });
    }
  };

  useEffect(() => {
    cargarAnios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, colegioSeleccionadoId, queryString]);

  useEffect(() => {
    if (idAnio) cargarPeriodos(idAnio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAnio, colegioSeleccionadoId]);

  const aplicarModelo = (value: 'bimestral' | 'trimestral' | 'personalizado') => {
    setModelo(value);

    if (value === 'bimestral') {
      setCantidadPeriodos(4);
      setUnidadesPorPeriodo(2);
    }

    if (value === 'trimestral') {
      setCantidadPeriodos(3);
      setUnidadesPorPeriodo(2);
    }
  };

  const generarEstructura = async () => {
    if (!token) return;

    if (!colegioSeleccionadoId) {
      setMensaje({ type: 'error', text: 'Selecciona la institución para configurar sus periodos.' });
      return;
    }

    if (!idAnio) {
      setMensaje({ type: 'error', text: 'Selecciona el año lectivo.' });
      return;
    }

    setGenerando(true);
    setMensaje(null);

    try {
      const res = await axios.post<PeriodosResponse>(
        `/api/academicos/periodos-unidades/generar${scopedQuery}`,
        {
          id_anio: Number(idAnio),
          id_colegio: colegioSeleccionadoId,
          cantidad_periodos: Number(cantidadPeriodos),
          unidades_por_periodo: Number(unidadesPorPeriodo),
          reemplazar,
          nombre_periodo_base: nombrePeriodoBase,
          nombre_unidad_base: 'Unidad',
        },
        authHeader,
      );

      setPeriodos(res.data?.periodos || []);
      setReemplazar(false);
      showToast({
        type: 'success',
        title: 'Estructura generada',
        message: 'Los periodos y unidades quedaron configurados.',
      });
      setMensaje({ type: 'success', text: 'Periodos y unidades generados correctamente.' });
    } catch (error: any) {
      setMensaje({
        type: 'error',
        text: error.response?.data?.message || 'No se pudo generar la estructura académica.',
      });
    } finally {
      setGenerando(false);
    }
  };

  const pedirConfirmacionGenerar = () => {
    if (periodos.length > 0 && !reemplazar) {
      setMensaje({
        type: 'error',
        text: 'Este año ya tiene periodos creados. Marca "reemplazar estructura" si deseas regenerarlos.',
      });
      return;
    }
    setConfirmGenerarOpen(true);
  };

  const guardarEdicion = async () => {
    if (!token || !editando) return;
    try {
      const url =
        editando.tipo === 'periodo'
          ? `/api/academicos/periodos/${editando.id}${scopedQuery}`
          : `/api/academicos/unidades/${editando.id}/detalle${scopedQuery}`;

      const res = await axios.patch<PeriodosResponse>(
        url,
        {
          nombre: editando.nombre,
          fecha_inicio: editando.fecha_inicio,
          fecha_fin: editando.fecha_fin,
        },
        authHeader,
      );

      setPeriodos(res.data?.periodos || []);
      setEditando(null);
      await cargarPeriodos(idAnio);
      showToast({ type: 'success', title: 'Cambios guardados', message: 'La estructura académica fue actualizada.' });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo guardar la edición.' });
    }
  };

  const actualizarEstadoUnidad = async (unidad: Unidad, estado: boolean) => {
    if (!token) return;

    try {
      const res = await axios.patch<PeriodosResponse>(
        `/api/academicos/unidades/${unidad.id_unidad}/estado${scopedQuery}`,
        { estado_abierto: estado },
        authHeader,
      );

      setPeriodos(res.data?.periodos || []);

      showToast({
        type: 'success',
        title: estado ? 'Unidad abierta' : 'Unidad cerrada',
        message: estado
          ? 'Los docentes ya pueden registrar notas en esta unidad.'
          : 'La unidad quedó cerrada para edición.',
      });
    } catch (error: any) {
      setMensaje({
        type: 'error',
        text: error.response?.data?.message || 'No se pudo actualizar el estado de la unidad.',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black tracking-[-0.01em] text-slate-950">Periodos y unidades</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Configura la estructura de evaluación del año: bimestres, trimestres, ciclos o módulos. Dirección debe abrir la unidad activa para que los docentes registren notas.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200/70">
          Contexto: <span className="text-slate-950">{nombreColegio(colegioSeleccionadoId) || scopeLabel}</span>
        </div>
      </div>

      {mensaje && (
        <div
          className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-all duration-300 ${
            mensaje.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70'
              : 'bg-red-50 text-red-700 ring-red-200/70'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.text}</span>
        </div>
      )}

      {mostrarSelectorInstitucion && (
        <section className={`${panelClass} p-4`}>
          <label>
            <span className={labelClass}>Institución para gestionar</span>
            <select
              className={inputClass}
              value={colegioGestionId}
              onChange={(event) => {
                setColegioGestionId(event.target.value);
                setIdAnio('');
                setPeriodos([]);
                setExpanded({});
              }}
            >
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre || colegio.nombre_corto}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Cada institución puede tener su propio año, periodos y unidades.
          </p>
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Año</span>
            <CalendarDays size={18} className="text-blue-500" />
          </div>
          <p className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-slate-950">
            {aniosFiltrados.find((anio) => String(anio.id_anio) === idAnio)?.nombre_anio || '—'}
          </p>
          <p className="mt-1 text-sm text-slate-500">{nombreColegio(colegioSeleccionadoId)}</p>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Periodos</span>
            <Clock3 size={18} className="text-violet-500" />
          </div>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{periodos.length}</p>
          <p className="mt-1 text-sm text-slate-500">Configurados</p>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unidades</span>
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{totalUnidades}</p>
          <p className="mt-1 text-sm text-slate-500">Del año lectivo</p>
        </div>

        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unidad activa</span>
            <ShieldCheck size={18} className={unidadAbierta ? 'text-emerald-500' : 'text-slate-400'} />
          </div>
          <p className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-slate-950">
            {unidadAbierta ? unidadAbierta.label : 'Sin unidad abierta'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {unidadAbierta ? 'Disponible para docentes' : 'Notas bloqueadas'}
          </p>
        </div>
      </div>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h4 className="text-sm font-black text-slate-950">Generar estructura del año</h4>
          <p className="mt-1 text-sm text-slate-500">
            Elige un modelo inicial. Luego podrás abrir o cerrar unidades según avance el año.
          </p>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-5">
          <label>
            <span className={labelClass}>Año lectivo</span>
            <select className={inputClass} value={idAnio} onChange={(event) => setIdAnio(event.target.value)}>
              <option value="">Selecciona año</option>
              {aniosFiltrados.map((anio) => (
                <option key={anio.id_anio} value={anio.id_anio}>
                  {anio.nombre_anio} · {anio.estado}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Modelo</span>
            <select className={inputClass} value={modelo} onChange={(event) => aplicarModelo(event.target.value as any)}>
              <option value="bimestral">Bimestral: 4 periodos</option>
              <option value="trimestral">Trimestral: 3 periodos</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </label>

          <label>
            <span className={labelClass}>Cantidad periodos</span>
            <input
              type="number"
              min={1}
              max={12}
              className={inputClass}
              value={cantidadPeriodos}
              disabled={modelo !== 'personalizado'}
              onChange={(event) => setCantidadPeriodos(Number(event.target.value))}
            />
          </label>

          <label>
            <span className={labelClass}>Unidades por periodo</span>
            <input
              type="number"
              min={1}
              max={12}
              className={inputClass}
              value={unidadesPorPeriodo}
              onChange={(event) => setUnidadesPorPeriodo(Number(event.target.value))}
            />
          </label>

          <label className="flex items-end">
            <span className="flex h-11 w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800">
              <input
                type="checkbox"
                checked={reemplazar}
                onChange={(event) => setReemplazar(event.target.checked)}
              />
              Reemplazar estructura
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            No se puede reemplazar si ya existen evaluaciones asociadas a alguna unidad.
          </p>
          <button
            type="button"
            onClick={pedirConfirmacionGenerar}
            disabled={generando}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generando ? <Loader2 size={17} className="animate-spin" /> : <RefreshCcw size={17} />}
            Generar estructura
          </button>
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h4 className="text-sm font-black text-slate-950">Periodos configurados</h4>
          <p className="mt-1 text-sm text-slate-500">
            Abre la unidad que los docentes podrán llenar. Al abrir una unidad, las demás del año se cierran automáticamente.
          </p>
        </div>

        {periodos.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <CalendarDays size={26} />
            </div>
            <h4 className="text-base font-black text-slate-950">Aún no hay periodos configurados</h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Genera la estructura del año para que Plantillas y Registro de Notas usen unidades reales.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {periodos.map((periodo) => {
              const abierto = expanded[periodo.id_bimestre] ?? true;

              return (
                <article key={periodo.id_bimestre} className="transition-colors duration-200 hover:bg-slate-50/50">
                  <div className="flex w-full items-center gap-3 px-5 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [periodo.id_bimestre]:
                            !abierto,
                        }))
                      }
                      className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                      aria-expanded={abierto}
                    >
                      <div className="min-w-0">
                        <h5 className="truncate font-black text-slate-950">
                          {periodo.nombre ||
                            periodo.label}
                        </h5>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(
                            periodo.fecha_inicio,
                          )}{' '}
                          -{' '}
                          {formatDate(
                            periodo.fecha_fin,
                          )}{' '}
                          · {periodo.unidades.length}{' '}
                          unidad(es)
                        </p>
                      </div>

                      {abierto ? (
                        <ChevronUp
                          size={18}
                          className="shrink-0 text-slate-400"
                        />
                      ) : (
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-slate-400"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditando({
                          tipo: 'periodo',
                          id: periodo.id_bimestre,
                          nombre:
                            periodo.nombre ||
                            periodo.label,
                          fecha_inicio: toInputDate(
                            periodo.fecha_inicio,
                          ),
                          fecha_fin: toInputDate(
                            periodo.fecha_fin,
                          ),
                        })
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`Editar ${
                        periodo.nombre ||
                        periodo.label
                      }`}
                      title="Editar periodo"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  {abierto && (
                    <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
                      {periodo.unidades.map((unidad) => (
                        <div
                          key={unidad.id_unidad}
                          className={`rounded-2xl border p-4 transition-all duration-200 ${
                            unidad.estado_abierto
                              ? 'border-emerald-200 bg-emerald-50/70 ring-1 ring-emerald-100'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-950">{unidad.nombre || unidad.label}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {formatDate(unidad.fecha_inicio)} - {formatDate(unidad.fecha_fin)}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                                unidad.estado_abierto
                                  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                                  : 'bg-slate-100 text-slate-500 ring-slate-200'
                              }`}
                            >
                              {unidad.estado_abierto ? <Unlock size={12} /> : <Lock size={12} />}
                              {unidad.estado_abierto ? 'Abierta' : 'Cerrada'}
                            </span>
                          </div>

                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditando({
                                tipo: 'unidad',
                                id: unidad.id_unidad,
                                nombre: unidad.nombre || unidad.label,
                                fecha_inicio: toInputDate(unidad.fecha_inicio),
                                fecha_fin: toInputDate(unidad.fecha_fin),
                              })}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-all duration-200 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            {unidad.estado_abierto ? (
                              <button
                                type="button"
                                onClick={() => actualizarEstadoUnidad(unidad, false)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-all duration-200 hover:bg-slate-50"
                              >
                                Cerrar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => actualizarEstadoUnidad(unidad, true)}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
                              >
                                Abrir unidad
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmGenerarOpen}
        title={periodos.length > 0 ? 'Reemplazar estructura académica' : 'Generar estructura académica'}
        description={
          periodos.length > 0
            ? 'Se reemplazarán los periodos y unidades actuales. Solo se permitirá si todavía no hay evaluaciones vinculadas.'
            : `Se generará una estructura ${modelo} para el año seleccionado.`
        }
        tone={periodos.length > 0 ? 'warning' : 'neutral'}
        confirmLabel={periodos.length > 0 ? 'Sí, reemplazar' : 'Generar estructura'}
        loading={generando}
        onCancel={() => setConfirmGenerarOpen(false)}
        onConfirm={async () => {
          setConfirmGenerarOpen(false);
          await generarEstructura();
        }}
      />

      {editando && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h5 className="text-sm font-black text-slate-950">
              Editar {editando.tipo === 'periodo' ? 'periodo' : 'unidad'}
            </h5>
            <div className="mt-4 space-y-3">
              <label className={labelClass}>Nombre</label>
              <input
                className={inputClass}
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              />
              <label className={labelClass}>Fecha inicio</label>
              <input
                type="date"
                className={inputClass}
                value={editando.fecha_inicio}
                onChange={(e) => setEditando({ ...editando, fecha_inicio: e.target.value })}
              />
              <label className={labelClass}>Fecha fin</label>
              <input
                type="date"
                className={inputClass}
                value={editando.fecha_fin}
                onChange={(e) => setEditando({ ...editando, fecha_fin: e.target.value })}
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}