import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Save,
  Smartphone,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';

type EstadoAsistencia = 'Presente' | 'Ausente' | 'Tardanza' | 'Justificado';

type AlumnoAsistencia = {
  id_matricula: number;
  id_estudiante?: number;
  alumno: string;
  codigo?: string | null;
  estado: EstadoAsistencia;
  registrado?: boolean;
  justificacion_motivo?: string;
  justificacion_observacion?: string;
  requiere_justificacion?: boolean;
};

type JustificacionDraft = {
  id_matricula: number;
  alumno: string;
  motivo: string;
  observacion: string;
};

type SeccionOption = {
  id_seccion: number;
  label: string;
  colegio?: string | null;
  id_colegio?: number | null;
  grado?: string | null;
  nivel?: string | null;
  letra?: string | null;
};

type CalendarioDia = {
  fecha: string;
  dia: number;
  dia_semana: number;
  lectivo: boolean;
  total_alumnos: number;
  registrados: number;
  pendientes_registro: number;
  pendientes_justificacion: number;
  avance: number;
  estado: 'completo' | 'parcial' | 'sin_registro' | 'no_lectivo' | 'sin_alumnos';
};

type CalendarioAsistencia = {
  mes: string;
  total_alumnos: number;
  resumen: {
    completos: number;
    parciales: number;
    sin_registro: number;
    pendientes_justificacion: number;
  };
  dias: CalendarioDia[];
};

const estados: EstadoAsistencia[] = ['Presente', 'Tardanza', 'Ausente', 'Justificado'];

const motivosJustificacion = [
  'Enfermedad',
  'Cita médica',
  'Permiso familiar',
  'Trámite documentario',
  'Otro',
];

const todayISO = () => new Date().toISOString().split('T')[0];

const estadoSummaryClasses: Record<EstadoAsistencia, string> = {
  Presente: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Tardanza: 'border-amber-300 bg-amber-50 text-amber-800',
  Ausente: 'border-rose-300 bg-rose-50 text-rose-800',
  Justificado: 'border-blue-300 bg-blue-50 text-blue-800',
};

const estadoButtonSelected: Record<EstadoAsistencia, string> = {
  Presente: 'border-emerald-700 bg-emerald-700 text-white',
  Tardanza: 'border-amber-600 bg-amber-500 text-slate-950',
  Ausente: 'border-rose-700 bg-rose-700 text-white',
  Justificado: 'border-blue-700 bg-blue-700 text-white',
};

const estadoButtonIdle: Record<EstadoAsistencia, string> = {
  Presente: 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50',
  Tardanza: 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50',
  Ausente: 'border-rose-300 bg-white text-rose-800 hover:bg-rose-50',
  Justificado: 'border-blue-300 bg-white text-blue-800 hover:bg-blue-50',
};

const estadoIcons: Record<EstadoAsistencia, typeof CheckCircle2> = {
  Presente: CheckCircle2,
  Tardanza: Clock3,
  Ausente: XCircle,
  Justificado: AlertTriangle,
};

function buildUrl(
  path: string,
  queryParams: Record<string, string | number>,
  extra: Record<string, string | number> = {},
) {
  const params = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  Object.entries(extra).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function uniqueClean(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'es'));
}

function shortSeccionLabel(section: SeccionOption) {
  if (section.letra) return `Sección "${section.letra}"`;
  return section.label;
}

function MobileAttendanceFab({
  href,
  visible,
}: {
  href: string;
  visible: boolean;
}) {
  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <Link
      to={href}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-[9999] inline-flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-black text-white shadow-2xl shadow-blue-300 md:hidden"
    >
      <Smartphone size={18} />
      Tomar asistencia
    </Link>,
    document.body,
  );
}

export default function AsistenciaPage() {
  const { token } = useAuth();
  const { queryParams, activeColegio, scopeLabel } = useSchool();

  const [secciones, setSecciones] = useState<SeccionOption[]>([]);
  const [nivel, setNivel] = useState('');
  const [grado, setGrado] = useState('');
  const [seccionId, setSeccionId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(todayISO());
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [loadingSecciones, setLoadingSecciones] = useState(false);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [loadingCalendario, setLoadingCalendario] = useState(false);
  const [calendarioMes, setCalendarioMes] = useState(todayISO().slice(0, 7));
  const [calendario, setCalendario] = useState<CalendarioAsistencia | null>(null);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justificacionDraft, setJustificacionDraft] = useState<JustificacionDraft | null>(null);

  const scopeKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const niveles = useMemo(
    () => uniqueClean(secciones.map((item) => item.nivel)),
    [secciones],
  );

  const grados = useMemo(
    () =>
      uniqueClean(
        secciones
          .filter((item) => !nivel || item.nivel === nivel)
          .map((item) => item.grado),
      ),
    [secciones, nivel],
  );

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter((item) => {
        if (nivel && item.nivel !== nivel) return false;
        if (grado && item.grado !== grado) return false;
        return true;
      }),
    [secciones, nivel, grado],
  );

  const selectedSeccion = secciones.find((item) => item.id_seccion === seccionId);
  const hasSeccion = Boolean(seccionId);
  const mobileHref = hasSeccion
    ? `/asistencia/mobile?seccion_id=${seccionId}&fecha=${fecha}`
    : '/asistencia';

  const resumen = useMemo(() => {
    const total = alumnos.length;
    const registrados = alumnos.filter((alumno) => alumno.registrado).length;
    const pendientesRegistro = Math.max(0, total - registrados);

    const counts = estados.reduce(
      (acc, estado) => {
        acc[estado] = alumnos.filter(
          (alumno) => alumno.registrado && alumno.estado === estado,
        ).length;
        return acc;
      },
      {} as Record<EstadoAsistencia, number>,
    );

    const asistenciaValida = counts.Presente + counts.Tardanza + counts.Justificado;
    const porcentajeRegistro = total > 0 ? Math.round((registrados / total) * 100) : 0;
    const porcentajeAsistencia =
      registrados > 0 ? Math.round((asistenciaValida / registrados) * 100) : 0;

    return {
      total,
      registrados,
      pendientesRegistro,
      counts,
      porcentaje: porcentajeAsistencia,
      porcentajeRegistro,
    };
  }, [alumnos]);

  const justificacionesPendientes = useMemo(
    () =>
      alumnos.filter(
        (alumno) =>
          alumno.estado === 'Justificado' &&
          !String(alumno.justificacion_motivo || '').trim(),
      ),
    [alumnos],
  );

  const indicadorSalon = useMemo(
    () => [
      {
        label: 'Presente',
        value: resumen.counts.Presente,
        className: 'bg-emerald-600',
        chipClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      },
      {
        label: 'Tardanza',
        value: resumen.counts.Tardanza,
        className: 'bg-amber-500',
        chipClassName: 'bg-amber-50 text-amber-700 ring-amber-100',
      },
      {
        label: 'Ausente',
        value: resumen.counts.Ausente,
        className: 'bg-rose-600',
        chipClassName: 'bg-rose-50 text-rose-700 ring-rose-100',
      },
      {
        label: 'Justificado',
        value: resumen.counts.Justificado,
        className: 'bg-blue-600',
        chipClassName: 'bg-blue-50 text-blue-700 ring-blue-100',
      },
      {
        label: 'Pendiente',
        value: resumen.pendientesRegistro,
        className: 'bg-slate-300',
        chipClassName: 'bg-slate-50 text-slate-600 ring-slate-100',
      },
    ],
    [resumen],
  );

  const calendarioGrid = useMemo(() => {
    if (!calendario?.dias?.length) return [];

    const firstDate = new Date(`${calendario.dias[0].fecha}T00:00:00`);
    const offset = (firstDate.getDay() + 6) % 7;

    return [
      ...Array.from({ length: offset }, () => null as CalendarioDia | null),
      ...calendario.dias,
    ];
  }, [calendario]);

  const emptyTitle =
    secciones.length === 0 ? 'No hay secciones disponibles' : 'No hay alumnos para mostrar';

  const emptyDescription =
    secciones.length === 0
      ? `No hay secciones configuradas o asignadas para ${activeColegio?.nombre || scopeLabel}.`
      : 'Verifica la sección seleccionada o la matrícula activa de los estudiantes.';

  const seleccionarPrimerFiltro = (items: SeccionOption[]) => {
    const first = items[0];

    if (!first) {
      setNivel('');
      setGrado('');
      setSeccionId('');
      setAlumnos([]);
      return;
    }

    setNivel(first.nivel || '');
    setGrado(first.grado || '');
    setSeccionId(first.id_seccion);
  };

  const handleNivelChange = (value: string) => {
    setNivel(value);

    const gradosFiltrados = uniqueClean(
      secciones
        .filter((item) => !value || item.nivel === value)
        .map((item) => item.grado),
    );

    const nextGrado = gradosFiltrados[0] || '';
    setGrado(nextGrado);

    const first = secciones.find((item) => {
      if (value && item.nivel !== value) return false;
      if (nextGrado && item.grado !== nextGrado) return false;
      return true;
    });

    setSeccionId(first?.id_seccion || '');
  };

  const handleGradoChange = (value: string) => {
    setGrado(value);

    const first = secciones.find((item) => {
      if (nivel && item.nivel !== nivel) return false;
      if (value && item.grado !== value) return false;
      return true;
    });

    setSeccionId(first?.id_seccion || '');
  };

  const handleFechaChange = (value: string) => {
    setFecha(value);

    if (value) {
      setCalendarioMes(value.slice(0, 7));
    }
  };

  const cargarSecciones = async () => {
    if (!token || !headers) return;

    setLoadingSecciones(true);
    setError(null);
    setMessage(null);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia/secciones', queryParams),
        { headers },
      );

      const items: SeccionOption[] = Array.isArray(res.data) ? res.data : [];
      setSecciones(items);
      seleccionarPrimerFiltro(items);
    } catch {
      setError('No se pudieron cargar las secciones disponibles.');
      setSecciones([]);
      seleccionarPrimerFiltro([]);
    } finally {
      setLoadingSecciones(false);
    }
  };

  const cargarAsistencia = async () => {
    if (!seccionId) {
      setAlumnos([]);
      setError(null);
      setMessage(null);
      return;
    }

    if (!token || !headers || !fecha) return;

    setLoadingAsistencia(true);
    setError(null);
    setMessage(null);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia', queryParams, {
          seccion_id: seccionId,
          fecha,
        }),
        { headers },
      );

      setAlumnos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('No se pudo cargar la asistencia de la sección seleccionada.');
      setAlumnos([]);
    } finally {
      setLoadingAsistencia(false);
    }
  };

  const cargarCalendarioAsistencia = async () => {
    if (!seccionId || !token || !headers || !calendarioMes) {
      setCalendario(null);
      return;
    }

    setLoadingCalendario(true);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia/calendario', queryParams, {
          seccion_id: seccionId,
          mes: calendarioMes,
        }),
        { headers },
      );

      setCalendario(res.data || null);
    } catch {
      setCalendario(null);
    } finally {
      setLoadingCalendario(false);
    }
  };

  useEffect(() => {
    cargarSecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeKey]);

  useEffect(() => {
    cargarAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId, fecha, token, scopeKey]);

  useEffect(() => {
    cargarCalendarioAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId, calendarioMes, token, scopeKey]);

  const abrirJustificacion = (alumno: AlumnoAsistencia) => {
    setMessage(null);
    setJustificacionDraft({
      id_matricula: alumno.id_matricula,
      alumno: alumno.alumno,
      motivo: alumno.justificacion_motivo || motivosJustificacion[0],
      observacion: alumno.justificacion_observacion || '',
    });
  };

  const setEstadoAlumno = (idMatricula: number, estado: EstadoAsistencia) => {
    setMessage(null);

    const alumno = alumnos.find((item) => item.id_matricula === idMatricula);

    if (estado === 'Justificado' && alumno) {
      abrirJustificacion(alumno);
      return;
    }

    setAlumnos((prev) =>
      prev.map((item) =>
        item.id_matricula === idMatricula
          ? {
              ...item,
              estado,
              justificacion_motivo: '',
              justificacion_observacion: '',
            }
          : item,
      ),
    );
  };

  const confirmarJustificacion = async () => {
    if (!justificacionDraft || !token || !headers || !seccionId) return;

    const motivo = justificacionDraft.motivo.trim();
    const observacion = justificacionDraft.observacion.trim();

    if (!motivo) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await axios.post(
        buildUrl('/api/academicos/asistencia', queryParams),
        {
          id_seccion: seccionId,
          fecha,
          asistencias: [
            {
              id_matricula: justificacionDraft.id_matricula,
              estado: 'Justificado',
              justificacion_motivo: motivo,
              justificacion_observacion: observacion,
            },
          ],
        },
        { headers },
      );

      setAlumnos((prev) =>
        prev.map((item) =>
          item.id_matricula === justificacionDraft.id_matricula
            ? {
                ...item,
                estado: 'Justificado',
                justificacion_motivo: motivo,
                justificacion_observacion: observacion,
                requiere_justificacion: false,
              }
            : item,
        ),
      );

      setJustificacionDraft(null);
      setMessage('Justificación guardada correctamente.');
      await cargarCalendarioAsistencia();
    } catch {
      setError('No se pudo guardar la justificación. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const guardar = async () => {
    if (!token || !headers || !seccionId || alumnos.length === 0) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await axios.post(
        buildUrl('/api/academicos/asistencia', queryParams),
        {
          id_seccion: seccionId,
          fecha,
          asistencias: alumnos.map((alumno) => ({
            id_matricula: alumno.id_matricula,
            estado: alumno.estado,
            justificacion_motivo: alumno.justificacion_motivo || '',
            justificacion_observacion: alumno.justificacion_observacion || '',
          })),
        },
        { headers },
      );

      setMessage('Asistencia guardada correctamente.');
      await cargarCalendarioAsistencia();
    } catch {
      setError('No se pudo guardar la asistencia. Revisa la fecha o intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        eyebrow="Control diario"
        title="Registro de asistencia"
        description={`Marca asistencia solo para las secciones disponibles en ${activeColegio?.nombre || scopeLabel}.`}
        icon={CalendarDays}
        meta={[
          { label: 'Colegio actual', value: activeColegio?.nombre || scopeLabel },
          { label: 'Alumnos', value: String(resumen.total) },
          { label: 'Pendientes', value: String(justificacionesPendientes.length) },
        ]}
      />

      <section className="rounded-[24px] border border-slate-200 bg-white p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Nivel
            </span>
            <select
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
              value={nivel}
              disabled={loadingSecciones || niveles.length === 0}
              onChange={(event) => handleNivelChange(event.target.value)}
            >
              {niveles.length === 0 ? (
                <option value="">Sin nivel</option>
              ) : (
                niveles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Grado
            </span>
            <select
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
              value={grado}
              disabled={loadingSecciones || grados.length === 0}
              onChange={(event) => handleGradoChange(event.target.value)}
            >
              {grados.length === 0 ? (
                <option value="">Sin grado</option>
              ) : (
                grados.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Sección
            </span>
            <select
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
              value={seccionId}
              disabled={loadingSecciones || seccionesFiltradas.length === 0}
              onChange={(event) => setSeccionId(Number(event.target.value))}
            >
              {seccionesFiltradas.length === 0 ? (
                <option value="">Sin sección</option>
              ) : (
                seccionesFiltradas.map((item) => (
                  <option key={item.id_seccion} value={item.id_seccion}>
                    {shortSeccionLabel(item)}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Fecha
            </span>
            <input
              type="date"
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              <CalendarDays size={13} />
              Calendario mensual
            </div>
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Control de asistencia pendiente
            </h3>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
              Revisa rápidamente qué días están completos, parciales o sin registro.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                Completos: {calendario?.resumen.completos ?? 0}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                Parciales: {calendario?.resumen.parciales ?? 0}
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                Sin registro: {calendario?.resumen.sin_registro ?? 0}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                Justif. pendientes: {calendario?.resumen.pendientes_justificacion ?? 0}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="month"
              value={calendarioMes}
              onChange={(event) => setCalendarioMes(event.target.value)}
              className="h-11 rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={cargarCalendarioAsistencia}
              disabled={loadingCalendario || !seccionId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingCalendario ? 'animate-spin' : ''} />
              Actualizar calendario
            </button>

            <button
              type="button"
              onClick={() => setCalendarioAbierto((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              <ChevronDown
                size={15}
                className={`transition-transform ${calendarioAbierto ? 'rotate-180' : ''}`}
              />
              {calendarioAbierto ? 'Ocultar calendario' : 'Ver calendario'}
            </button>
          </div>
        </div>

        {calendarioAbierto && (
          <>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Días completos
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-800">
              {calendario?.resumen.completos ?? 0}
            </p>
          </div>

          <div className="rounded-sm border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
              Parciales
            </p>
            <p className="mt-1 text-2xl font-black text-amber-800">
              {calendario?.resumen.parciales ?? 0}
            </p>
          </div>

          <div className="rounded-sm border border-rose-200 bg-rose-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
              Sin registro
            </p>
            <p className="mt-1 text-2xl font-black text-rose-800">
              {calendario?.resumen.sin_registro ?? 0}
            </p>
          </div>

          <div className="rounded-sm border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
              Justif. pendientes
            </p>
            <p className="mt-1 text-2xl font-black text-blue-800">
              {calendario?.resumen.pendientes_justificacion ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-sm border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarioGrid.map((dia, index) => {
              if (!dia) {
                return <div key={`empty-${index}`} className="min-h-[74px]" />;
              }

              const active = dia.fecha === fecha;

              const tone =
                dia.estado === 'completo'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : dia.estado === 'parcial'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : dia.estado === 'sin_registro'
                      ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                      : 'border-slate-200 bg-white text-slate-300';

              return (
                <button
                  key={dia.fecha}
                  type="button"
                  onClick={() => {
                    if (dia.lectivo) {
                      handleFechaChange(dia.fecha);
                    }
                  }}
                  disabled={!dia.lectivo}
                  className={`min-h-[74px] rounded-sm border p-2 text-left transition ${
                    active ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  } ${tone}`}
                  title={
                    dia.lectivo
                      ? `${dia.fecha}: ${dia.avance}% · ${dia.registrados}/${dia.total_alumnos} registrados`
                      : `${dia.fecha}: no lectivo`
                  }
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-black">{dia.dia}</span>
                    {dia.lectivo && (
                      <span className="text-[11px] font-black">{dia.avance}%</span>
                    )}
                  </div>

                  {dia.lectivo ? (
                    <div className="mt-2 space-y-1">
                      <p className="truncate text-[10px] font-bold">
                        {dia.registrados}/{dia.total_alumnos} marcados
                      </p>
                      {dia.pendientes_justificacion > 0 && (
                        <p className="truncate text-[10px] font-black">
                          Justif.: {dia.pendientes_justificacion}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] font-bold">No lectivo</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid-cols-4">
          <div className="rounded-sm border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Total
            </p>
            <div className="mt-2 flex items-center gap-2">
              <UsersRound size={18} className="text-slate-500" />
              <span className="text-2xl font-black text-slate-950">{resumen.total}</span>
            </div>
          </div>

          {estados.slice(0, 3).map((estado) => {
            const Icon = estadoIcons[estado];

            return (
              <div
                key={estado}
                className={`rounded-sm border bg-white p-4 ${estadoSummaryClasses[estado]}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.14em]">
                  {estado}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Icon size={18} />
                  <span className="text-2xl font-black">{resumen.counts[estado]}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    <BarChart3 size={13} />
                    Indicador del salón
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">
                    Avance de asistencia
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Muestra cuántos alumnos ya tienen asistencia registrada para la fecha seleccionada.
                  </p>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Registro tomado
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {resumen.registrados} / {resumen.total}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {indicadorSalon.map((item) => {
                  const percent =
                    resumen.total > 0 ? Math.round((item.value / resumen.total) * 100) : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${item.chipClassName}`}>
                          {item.label}
                        </span>
                        <span className="text-xs font-black text-slate-500">
                          {item.value} alumno(s) · {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${item.className}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-sm border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Asistencia efectiva
                </p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {resumen.registrados > 0 ? `${resumen.porcentaje}%` : '—'}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Presente, tardanza y justificado sobre registros tomados.
                </p>
              </div>

              <div className="rounded-sm border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Avance de registro
                </p>
                <p className="mt-1 text-3xl font-black text-blue-700">
                  {resumen.total > 0 ? `${resumen.porcentajeRegistro}%` : '—'}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Porcentaje de alumnos ya marcados.
                </p>
              </div>

              <div className={`rounded-sm border p-4 ${
                resumen.pendientesRegistro > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-emerald-200 bg-emerald-50'
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                  resumen.pendientesRegistro > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  Pendientes de marcar
                </p>
                <p className={`mt-1 text-3xl font-black ${
                  resumen.pendientesRegistro > 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  {resumen.pendientesRegistro}
                </p>
                <p className={`mt-1 text-xs font-semibold ${
                  resumen.pendientesRegistro > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {resumen.pendientesRegistro > 0
                    ? 'Aún falta tomar asistencia a algunos alumnos.'
                    : 'La asistencia del salón está completa.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-slate-900">
                {selectedSeccion?.label || 'Selecciona una sección'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <CalendarDays size={13} />
                {fecha}
                {selectedSeccion?.colegio ? ` · ${selectedSeccion.colegio}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasSeccion && (
                <Link
                  to={mobileHref}
                  className="hidden h-10 items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950 md:inline-flex"
                >
                  <Smartphone size={14} />
                  Modo móvil
                </Link>
              )}

              <button
                type="button"
                onClick={cargarAsistencia}
                disabled={loadingAsistencia || !seccionId}
                className="inline-flex h-10 items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingAsistencia ? 'animate-spin' : ''} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={guardar}
                disabled={saving || alumnos.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-sm bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar asistencia
              </button>
            </div>
          </div>

          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all"
              style={{ width: `${resumen.porcentaje}%` }}
            />
          </div>

          {message && (
            <div className="mb-4 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              {error}
            </div>
          )}

          {justificacionesPendientes.length > 0 && (
            <div className="mb-4 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-amber-100 text-amber-800">
                    <AlertTriangle size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-black text-amber-900">
                      Hay {justificacionesPendientes.length} justificación(es) pendiente(s) de regularizar.
                    </p>
                    <p className="mt-1 text-xs font-semibold text-amber-800">
                      Regulariza el motivo desde esta pantalla. La marca de asistencia ya fue registrada desde el modo móvil.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => abrirJustificacion(justificacionesPendientes[0])}
                  className="inline-flex h-10 items-center justify-center rounded-sm bg-amber-600 px-4 text-xs font-black text-white hover:bg-amber-700"
                >
                  Regularizar ahora
                </button>
              </div>
            </div>
          )}

          {loadingSecciones || loadingAsistencia ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-sm border border-dashed border-slate-300 bg-slate-50">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-slate-700" size={28} />
                <p className="mt-3 text-sm font-bold text-slate-500">Cargando asistencia...</p>
              </div>
            </div>
          ) : alumnos.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-sm border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div>
                <UsersRound className="mx-auto text-slate-300" size={36} />
                <p className="mt-3 text-sm font-black text-slate-700">{emptyTitle}</p>
                <p className="mt-1 max-w-md text-xs font-semibold text-slate-400">
                  {emptyDescription}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
              <div className="carbon-list-header hidden grid-cols-[1.3fr_2fr] border-b border-slate-200 bg-slate-50 px-5 py-3 md:grid">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Alumno
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Estado
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {alumnos.map((alumno) => (
                  <div
                    key={alumno.id_matricula}
                    className="carbon-list-row grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.3fr_2fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {alumno.alumno}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        {alumno.codigo ? `Código: ${alumno.codigo}` : `Matrícula #${alumno.id_matricula}`}
                      </p>
                      {alumno.estado === 'Justificado' && !alumno.justificacion_motivo && (
                        <button
                          type="button"
                          onClick={() => abrirJustificacion(alumno)}
                          className="mt-2 inline-flex rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800 hover:bg-amber-100"
                        >
                          Pendiente de regularizar
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                      {estados.map((estado) => {
                        const active = alumno.estado === estado;

                        return (
                          <button
                            key={estado}
                            type="button"
                            onClick={() => setEstadoAlumno(alumno.id_matricula, estado)}
                            className={`inline-flex h-10 items-center justify-center rounded-sm border px-3 text-xs font-black transition ${
                              active ? estadoButtonSelected[estado] : estadoButtonIdle[estado]
                            }`}
                          >
                            {estado === 'Justificado' &&
                            active &&
                            !alumno.justificacion_motivo
                              ? 'Regularizar'
                              : estado}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {justificacionDraft && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Justificación de asistencia
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                {justificacionDraft.alumno}
              </h3>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Motivo
                </span>
                <select
                  value={justificacionDraft.motivo}
                  onChange={(event) =>
                    setJustificacionDraft((current) =>
                      current ? { ...current, motivo: event.target.value } : current,
                    )
                  }
                  className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  {motivosJustificacion.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Observación opcional
                </span>
                <textarea
                  value={justificacionDraft.observacion}
                  onChange={(event) =>
                    setJustificacionDraft((current) =>
                      current ? { ...current, observacion: event.target.value } : current,
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Ejemplo: Presentó permiso del apoderado, cita médica, etc."
                  className="w-full resize-none rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setJustificacionDraft(null)}
                className="h-10 rounded-sm border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:border-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarJustificacion}
                disabled={saving}
                className="h-10 rounded-sm bg-slate-950 px-4 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? 'Guardando...' : 'Guardar justificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileAttendanceFab href={mobileHref} visible={hasSeccion} />
    </div>
  );
}
