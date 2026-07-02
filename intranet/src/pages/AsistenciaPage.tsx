import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarDays,
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

    const counts = estados.reduce(
      (acc, estado) => {
        acc[estado] = alumnos.filter((alumno) => alumno.estado === estado).length;
        return acc;
      },
      {} as Record<EstadoAsistencia, number>,
    );

    const porcentaje = total > 0 ? Math.round((counts.Presente / total) * 100) : 0;
    return { total, counts, porcentaje };
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

  useEffect(() => {
    cargarSecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeKey]);

  useEffect(() => {
    cargarAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId, fecha, token, scopeKey]);

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

  const confirmarJustificacion = () => {
    if (!justificacionDraft) return;

    const motivo = justificacionDraft.motivo.trim();

    if (!motivo) return;

    setAlumnos((prev) =>
      prev.map((item) =>
        item.id_matricula === justificacionDraft.id_matricula
          ? {
              ...item,
              estado: 'Justificado',
              justificacion_motivo: motivo,
              justificacion_observacion: justificacionDraft.observacion.trim(),
            }
          : item,
      ),
    );

    setJustificacionDraft(null);
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
                className="h-10 rounded-sm bg-slate-950 px-4 text-xs font-black text-white hover:bg-slate-800"
              >
                Guardar justificación
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileAttendanceFab href={mobileHref} visible={hasSeccion} />
    </div>
  );
}
