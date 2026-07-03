import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';

type EstadoAsistencia = 'Presente' | 'Ausente' | 'Tardanza' | 'Justificado';

type AlumnoAsistencia = {
  id_matricula: number;
  alumno: string;
  codigo?: string | null;
  estado: EstadoAsistencia;
  registrado?: boolean;
  requiere_justificacion?: boolean;
  justificacion_motivo?: string;
  justificacion_observacion?: string;
};

type SeccionOption = {
  id_seccion: number;
  label: string;
  colegio?: string | null;
};

const todayISO = () => new Date().toISOString().split('T')[0];

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

// Estilos basados en la paleta de Carbon Design System
function estadoMiniClass(estado: EstadoAsistencia, active: boolean, registrado?: boolean) {
  const base = 'h-7 min-w-7 px-2 text-[11px] font-semibold transition-colors focus:outline-none';
  
  if (active) return `${base} bg-[#0f62fe] text-white border border-[#0f62fe]`;

  if (!registrado) return `${base} bg-[#f4f4f4] text-[#525252] border border-transparent hover:bg-[#e0e0e0]`;
  
  if (estado === 'Presente') return `${base} bg-[#def7e1] text-[#044317] border border-[#24a148]`;
  if (estado === 'Tardanza') return `${base} bg-[#fcf4d6] text-[#1c1b1f] border border-[#f1c21b]`;
  if (estado === 'Ausente') return `${base} bg-[#ffd7d9] text-[#680006] border border-[#da1e28]`;
  
  return `${base} bg-[#edf5ff] text-[#002d9c] border border-[#0f62fe]`;
}

export default function AsistenciaMobilePage() {
  const { token } = useAuth();
  const { queryParams } = useSchool();
  const [searchParams] = useSearchParams();

  const initialSeccionId = Number(searchParams.get('seccion_id') || 0);
  const initialFecha = searchParams.get('fecha') || todayISO();

  const [secciones, setSecciones] = useState<SeccionOption[]>([]);
  const [seccionId, setSeccionId] = useState<number | ''>(
    Number.isInteger(initialSeccionId) && initialSeccionId > 0 ? initialSeccionId : '',
  );
  const [fecha, setFecha] = useState(initialFecha);
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  const scopeKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const currentAlumno = alumnos[currentIndex] || null;
  const selectedSeccion = secciones.find((item) => item.id_seccion === seccionId);
  const registrados = alumnos.filter((alumno) => alumno.registrado).length;
  const pendientes = Math.max(0, alumnos.length - registrados);
  const avance = alumnos.length > 0 ? Math.round((registrados / alumnos.length) * 100) : 0;

  const cargarSecciones = async () => {
    if (!token || !headers) return;

    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  const ubicarContinuacion = (items: AlumnoAsistencia[]) => {
    if (items.length === 0) {
      setCurrentIndex(0);
      return;
    }

    const firstPending = items.findIndex((alumno) => !alumno.registrado);
    const done = items.filter((alumno) => alumno.registrado).length;

    if (firstPending >= 0 && done > 0) {
      const continuar = window.confirm(
        `Ya registraste asistencia para ${done} alumno(s). ¿Deseas continuar desde el primer pendiente?`,
      );

      setCurrentIndex(continuar ? firstPending : 0);
      return;
    }

    setCurrentIndex(firstPending >= 0 ? firstPending : 0);
  };

  const cargarAsistencia = async () => {
    if (!seccionId) {
      setAlumnos([]);
      return;
    }

    if (!token || !headers || !fecha) return;

    setLoading(true);
    setMessage(null);
    setOfflineMessage(null);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia', queryParams, {
          seccion_id: seccionId,
          fecha,
        }),
        { headers },
      );

      const items: AlumnoAsistencia[] = Array.isArray(res.data) ? res.data : [];
      setAlumnos(items);
      ubicarContinuacion(items);
    } finally {
      setLoading(false);
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

  const goPrev = () => setCurrentIndex((value) => Math.max(0, value - 1));
  const goNext = () => setCurrentIndex((value) => Math.min(alumnos.length - 1, value + 1));

  const guardarUno = async (idMatricula: number, estado: EstadoAsistencia) => {
    if (!token || !headers || !seccionId) return;

    setSyncing(true);
    setOfflineMessage(null);

    try {
      await axios.post(
        buildUrl('/api/academicos/asistencia', queryParams),
        {
          id_seccion: seccionId,
          fecha,
          asistencias: [
            {
              id_matricula: idMatricula,
              estado,
            },
          ],
        },
        { headers },
      );

      setAlumnos((prev) =>
        prev.map((alumno) =>
          alumno.id_matricula === idMatricula
            ? { ...alumno, estado, registrado: true }
            : alumno,
        ),
      );
    } catch {
      setOfflineMessage(
        'No se pudo guardar esta marca. Revisa la conexión y vuelve a tocar el estado.',
      );

      setAlumnos((prev) =>
        prev.map((alumno) =>
          alumno.id_matricula === idMatricula
            ? { ...alumno, registrado: false }
            : alumno,
        ),
      );
    } finally {
      setSyncing(false);
    }
  };

  const marcarEstado = (estado: EstadoAsistencia) => {
    if (!currentAlumno) return;

    const idMatricula = currentAlumno.id_matricula;

    setMessage(null);
    setOfflineMessage(null);

    setAlumnos((prev) =>
      prev.map((alumno) =>
        alumno.id_matricula === idMatricula
          ? {
              ...alumno,
              estado,
              registrado: true,
              requiere_justificacion: estado === 'Justificado',
            }
          : alumno,
      ),
    );

    if (currentIndex < alumnos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }

    void guardarUno(idMatricula, estado);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f4f4f4] text-[#161616] flex flex-col font-sans">
      {/* Header tipo Carbon UI */}
      <header className="shrink-0 border-b border-[#e0e0e0] bg-white px-4 py-3">
        <div className="flex h-11 items-center gap-3">
          <Link
            to="/asistencia"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-[#161616] hover:bg-[#e0e0e0] transition-colors rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0f62fe]"
          >
            <ChevronLeft size={20} />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#525252]">
              Asistencia móvil
            </p>
            <h1 className="truncate text-lg font-semibold text-[#161616]">
              {selectedSeccion?.label || 'Selecciona sección'}
            </h1>
          </div>

          <div className="inline-flex h-8 shrink-0 items-center gap-1.5 bg-[#e0e0e0] px-3 text-[12px] font-medium text-[#161616]">
            {syncing ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#0f62fe]" />
                Guardando
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-[#24a148]" />
                Auto
              </>
            )}
          </div>
        </div>

        {/* Controles tipo Carbon Form */}
        <div className="mt-4 grid grid-cols-[1fr_140px] gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#525252]">Sección</label>
            <select
              className="h-10 w-full min-w-0 bg-white border border-[#8d8d8d] px-3 text-sm font-medium text-[#161616] outline-none transition-colors hover:border-[#161616] focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
              value={seccionId}
              onChange={(event) => setSeccionId(Number(event.target.value))}
            >
              {secciones.length === 0 ? (
                <option value="">Sin secciones</option>
              ) : (
                secciones.map((item) => (
                  <option key={item.id_seccion} value={item.id_seccion}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#525252]">Fecha</label>
            <input
              type="date"
              className="h-10 w-full bg-white border border-[#8d8d8d] px-2 text-sm font-medium text-[#161616] outline-none transition-colors hover:border-[#161616] focus:border-[#0f62fe] focus:ring-1 focus:ring-[#0f62fe]"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-4 py-4">
        {/* Progress Bar Carbon Style */}
        <div className="mb-4 shrink-0">
          <div className="flex justify-between items-center mb-2 text-[11px] font-medium text-[#525252]">
            <span className="font-semibold text-[#161616]">{alumnos.length > 0 ? `${currentIndex + 1} / ${alumnos.length}` : '0 / 0'}</span>
            <span>{registrados} guardados · {pendientes} pendientes</span>
          </div>
          <div className="h-1 w-full overflow-hidden bg-[#e0e0e0]">
            <div
              className="h-full bg-[#0f62fe] transition-all duration-300"
              style={{ width: `${avance}%` }}
            />
          </div>
        </div>

        {/* Body Content */}
        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center border border-[#e0e0e0] bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto animate-spin text-[#0f62fe]" size={32} />
              <p className="mt-3 text-sm font-medium text-[#525252]">Cargando lista...</p>
            </div>
          </div>
        ) : !currentAlumno ? (
          <div className="flex min-h-0 flex-1 items-center justify-center border border-[#e0e0e0] bg-white px-6 text-center">
            <div>
              <XCircle className="mx-auto text-[#8d8d8d]" size={40} />
              <p className="mt-4 text-base font-semibold text-[#161616]">
                {secciones.length === 0 ? 'No hay secciones disponibles' : 'No hay alumnos'}
              </p>
              <p className="mt-1 text-sm text-[#525252]">
                {secciones.length === 0
                  ? 'No hay secciones asignadas o configuradas.'
                  : 'Revisa matrículas activas.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Student Card Carbon Style */}
            <section className="relative shrink-0 border border-[#e0e0e0] bg-white p-6 text-center shadow-sm">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-transparent text-[#525252] hover:bg-[#e0e0e0] disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe]"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex >= alumnos.length - 1}
                className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-transparent text-[#525252] hover:bg-[#e0e0e0] disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0f62fe]"
              >
                <ChevronRight size={24} />
              </button>

              <p className="text-[11px] font-medium uppercase tracking-wide text-[#525252]">
                Alumno actual
              </p>

              <h2 className="mx-auto mt-2 max-w-[250px] text-[28px] font-semibold leading-tight text-[#161616]">
                {currentAlumno.alumno}
              </h2>

              <p className="mt-2 text-xs font-medium text-[#525252]">
                {currentAlumno.codigo ? `Código: ${currentAlumno.codigo}` : `Matrícula #${currentAlumno.id_matricula}`}
              </p>

              {/* Quick Navigation Pills */}
              <div className="mx-auto mt-4 flex max-w-[280px] gap-1.5 overflow-x-auto pb-1">
                {alumnos.map((alumno, index) => (
                  <button
                    key={alumno.id_matricula}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={estadoMiniClass(
                      alumno.estado,
                      index === currentIndex,
                      alumno.registrado,
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </section>

            {/* Action Buttons Carbon Style */}
            <section className="mt-4 grid flex-1 shrink-0 gap-3">
              <button
                type="button"
                onClick={() => marcarEstado('Presente')}
                className="h-full min-h-[70px] max-h-[90px] bg-[#24a148] hover:bg-[#1c8338] text-white text-xl font-semibold shadow-sm transition-colors active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#24a148] focus:ring-offset-2"
              >
                Presente
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => marcarEstado('Tardanza')}
                  className="h-full min-h-[60px] max-h-[80px] bg-[#f1c21b] hover:bg-[#e0b019] text-[#161616] text-lg font-semibold shadow-sm transition-colors active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#f1c21b] focus:ring-offset-2"
                >
                  Tarde
                </button>

                <button
                  type="button"
                  onClick={() => marcarEstado('Ausente')}
                  className="h-full min-h-[60px] max-h-[80px] bg-[#da1e28] hover:bg-[#a51620] text-white text-lg font-semibold shadow-sm transition-colors active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#da1e28] focus:ring-offset-2"
                >
                  Ausente
                </button>
              </div>

              <button
                type="button"
                onClick={() => marcarEstado('Justificado')}
                className="h-full min-h-[50px] max-h-[65px] bg-[#0f62fe] hover:bg-[#0043ce] text-white text-base font-semibold shadow-sm transition-colors active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#0f62fe] focus:ring-offset-2"
              >
                Justificado
              </button>
            </section>
          </>
        )}

        {/* Inline Notifications Carbon Style */}
        {offlineMessage && (
          <div className="mt-4 flex shrink-0 items-start gap-3 border-l-4 border-[#da1e28] bg-[#fff1f1] px-4 py-3 text-sm text-[#161616]">
            <WifiOff size={18} className="mt-0.5 text-[#da1e28]" />
            <div>
              <p className="font-semibold text-[#da1e28]">Error de conexión</p>
              <p className="text-[13px] text-[#161616]">{offlineMessage}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="mt-4 flex shrink-0 items-start gap-3 border-l-4 border-[#24a148] bg-[#def7e1] px-4 py-3 text-sm text-[#161616]">
            <CheckCircle2 size={18} className="mt-0.5 text-[#24a148]" />
            <div>
              <p className="font-semibold text-[#24a148]">Éxito</p>
              <p className="text-[13px] text-[#161616]">{message}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}