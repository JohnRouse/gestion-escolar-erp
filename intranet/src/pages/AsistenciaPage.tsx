import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  UserCheck,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import Breadcrumb from '../components/Breadcrumb';

type EstadoAsistencia = 'Presente' | 'Ausente' | 'Tardanza' | 'Justificado';

type AlumnoAsistencia = {
  id_matricula: number;
  id_estudiante?: number;
  alumno: string;
  codigo?: string | null;
  estado: EstadoAsistencia;
};

type SeccionOption = {
  id_seccion: number;
  label: string;
  colegio?: string | null;
};

const estados: EstadoAsistencia[] = ['Presente', 'Tardanza', 'Ausente', 'Justificado'];

const todayISO = () => new Date().toISOString().split('T')[0];

const estadoClasses: Record<EstadoAsistencia, string> = {
  Presente: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100',
  Tardanza: 'border-amber-200 bg-amber-50 text-amber-700 ring-amber-100',
  Ausente: 'border-rose-200 bg-rose-50 text-rose-700 ring-rose-100',
  Justificado: 'border-blue-200 bg-blue-50 text-blue-700 ring-blue-100',
};

const estadoDotClasses: Record<EstadoAsistencia, string> = {
  Presente: 'bg-emerald-500',
  Tardanza: 'bg-amber-500',
  Ausente: 'bg-rose-500',
  Justificado: 'bg-blue-500',
};

const estadoIcons: Record<EstadoAsistencia, typeof CheckCircle2> = {
  Presente: CheckCircle2,
  Tardanza: Clock3,
  Ausente: XCircle,
  Justificado: AlertTriangle,
};

function buildUrl(path: string, queryParams: Record<string, string | number>, extra: Record<string, string | number> = {}) {
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

export default function AsistenciaPage() {
  const { token } = useAuth();
  const { queryParams, activeColegio, scopeLabel } = useSchool();

  const [secciones, setSecciones] = useState<SeccionOption[]>([]);
  const [seccionId, setSeccionId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(todayISO());
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [loadingSecciones, setLoadingSecciones] = useState(false);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

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

  const selectedSeccion = secciones.find((item) => item.id_seccion === seccionId);

  const hasSeccion = Boolean(seccionId);
  const mobileHref = hasSeccion ? `/asistencia/mobile?seccion_id=${seccionId}&fecha=${fecha}` : '/asistencia';

  const emptyTitle =
    secciones.length === 0 ? 'No hay secciones disponibles' : 'No hay alumnos para mostrar';

  const emptyDescription =
    secciones.length === 0
      ? `No hay secciones configuradas o asignadas para ${activeColegio?.nombre || scopeLabel}.`
      : 'Verifica la sección seleccionada o la matrícula activa de los estudiantes.';

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

      if (items.length > 0) {
        setSeccionId((current) =>
          current && items.some((item) => item.id_seccion === current)
            ? current
            : items[0].id_seccion,
        );
      } else {
        setSeccionId('');
        setAlumnos([]);
      }
    } catch {
      setError('No se pudieron cargar las secciones disponibles.');
      setSecciones([]);
      setSeccionId('');
      setAlumnos([]);
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
  }, [token, JSON.stringify(queryParams)]);

  useEffect(() => {
    cargarAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId, fecha, token, JSON.stringify(queryParams)]);

  const setEstadoAlumno = (idMatricula: number, estado: EstadoAsistencia) => {
    setMessage(null);
    setAlumnos((prev) =>
      prev.map((alumno) =>
        alumno.id_matricula === idMatricula ? { ...alumno, estado } : alumno,
      ),
    );
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
    <div className="animate-fade-in space-y-6">
      <Breadcrumb />

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
                <UserCheck size={13} />
                Control diario
              </div>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                Registro de asistencia
              </h2>

              <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
                Marca asistencia solo para las secciones disponibles en {activeColegio?.nombre || scopeLabel}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Sección
                </span>
                <select
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                  value={seccionId}
                  disabled={loadingSecciones || secciones.length === 0}
                  onChange={(event) => setSeccionId(Number(event.target.value))}
                >
                  {secciones.length === 0 ? (
                    <option value="">Sin secciones disponibles</option>
                  ) : (
                    secciones.map((item) => (
                      <option key={item.id_seccion} value={item.id_seccion}>
                        {item.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Fecha
                </span>
                <input
                  type="date"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-white px-6 py-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
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
              <div key={estado} className={`rounded-2xl border p-4 ring-1 ${estadoClasses[estado]}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
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
              {hasSeccion ? (
                <Link
                  to={mobileHref}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-100"
                >
                  <Smartphone size={14} />
                  Modo móvil
                </Link>
              ) : (
                <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-300 shadow-sm">
                  <Smartphone size={14} />
                  Modo móvil
                </span>
              )}

              <button
                type="button"
                onClick={cargarAsistencia}
                disabled={loadingAsistencia || !seccionId}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} className={loadingAsistencia ? 'animate-spin' : ''} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={guardar}
                disabled={saving || alumnos.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar asistencia
              </button>
            </div>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${resumen.porcentaje}%` }}
            />
          </div>

          {message && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          {loadingSecciones || loadingAsistencia ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-blue-600" size={28} />
                <p className="mt-3 text-sm font-bold text-slate-500">Cargando asistencia...</p>
              </div>
            </div>
          ) : alumnos.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div>
                <UsersRound className="mx-auto text-slate-300" size={36} />
                <p className="mt-3 text-sm font-black text-slate-700">
                  {emptyTitle}
                </p>
                <p className="mt-1 max-w-md text-xs font-semibold text-slate-400">
                  {emptyDescription}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="hidden grid-cols-[1.6fr_2fr] border-b border-slate-200 bg-slate-50 px-5 py-3 md:grid">
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
                    className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.6fr_2fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {alumno.alumno}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        {alumno.codigo ? `Código: ${alumno.codigo}` : `Matrícula #${alumno.id_matricula}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {estados.map((estado) => (
                        <button
                          key={estado}
                          type="button"
                          onClick={() => setEstadoAlumno(alumno.id_matricula, estado)}
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black transition ring-1 ${
                            alumno.estado === estado
                              ? estadoClasses[estado]
                              : 'border-slate-200 bg-white text-slate-500 ring-transparent hover:bg-slate-50'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${estadoDotClasses[estado]}`} />
                          {estado}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
