import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Loader2,
  UserCheck,
  UsersRound,
  UserX,
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

  const currentStateLabel =
    currentAlumno?.registrado
      ? currentAlumno.estado
      : 'Pendiente';

  const currentInitials =
    currentAlumno?.alumno
      ? currentAlumno.alumno
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      : 'AL';

  return (
    <div className="attendance-mobile-page">
      <header className="attendance-mobile-header">
        <div className="attendance-mobile-header__inner">
          <div className="attendance-mobile-header__top">
            <Link
              to="/asistencia"
              className="attendance-mobile-back"
              aria-label="Regresar a asistencia"
              title="Regresar"
            >
              <ChevronLeft size={21} />
            </Link>

            <div className="attendance-mobile-heading">
              <p className="attendance-mobile-eyebrow">
                Registro rápido
              </p>

              <h1>Asistencia móvil</h1>

              <p className="attendance-mobile-section-name">
                {selectedSeccion?.label ||
                  'Selecciona una sección'}
              </p>
            </div>

            <div
              className="attendance-mobile-sync"
              data-saving={
                syncing ? 'true' : 'false'
              }
            >
              {syncing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={15} />
              )}

              <span>
                {syncing
                  ? 'Guardando'
                  : 'Automático'}
              </span>
            </div>
          </div>

          <div className="attendance-mobile-filters">
            <label className="attendance-mobile-field">
              <span>
                <UsersRound
                  size={14}
                  aria-hidden="true"
                />
                Sección
              </span>

              <select
                className="attendance-mobile-control"
                value={seccionId}
                onChange={(event) =>
                  setSeccionId(
                    Number(event.target.value),
                  )
                }
              >
                {secciones.length === 0 ? (
                  <option value="">
                    Sin secciones
                  </option>
                ) : (
                  secciones.map((item) => (
                    <option
                      key={item.id_seccion}
                      value={item.id_seccion}
                    >
                      {item.label}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="attendance-mobile-field">
              <span>
                <CalendarDays
                  size={14}
                  aria-hidden="true"
                />
                Fecha
              </span>

              <input
                type="date"
                className="attendance-mobile-control"
                value={fecha}
                onChange={(event) =>
                  setFecha(event.target.value)
                }
              />
            </label>
          </div>

          <div className="attendance-mobile-stats">
            <div>
              <span>Alumnos</span>
              <strong>{alumnos.length}</strong>
            </div>

            <div>
              <span>Guardados</span>
              <strong>{registrados}</strong>
            </div>

            <div>
              <span>Pendientes</span>
              <strong>{pendientes}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="attendance-mobile-main">
        <section className="attendance-mobile-progress">
          <div className="attendance-mobile-progress__top">
            <div>
              <span>Avance de asistencia</span>

              <strong>
                {alumnos.length > 0
                  ? `${currentIndex + 1} de ${alumnos.length}`
                  : 'Sin alumnos'}
              </strong>
            </div>

            <span className="attendance-mobile-progress__percentage">
              {avance}%
            </span>
          </div>

          <div className="attendance-mobile-progress__track">
            <div
              className="attendance-mobile-progress__bar"
              style={{
                width: `${avance}%`,
              }}
            />
          </div>
        </section>

        {offlineMessage && (
          <div className="attendance-mobile-notice attendance-mobile-notice--error">
            <WifiOff
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>Error de conexión</strong>
              <p>{offlineMessage}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="attendance-mobile-notice attendance-mobile-notice--success">
            <CheckCircle2
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>Registro guardado</strong>
              <p>{message}</p>
            </div>
          </div>
        )}

        {loading ? (
          <section className="attendance-mobile-empty">
            <Loader2
              size={34}
              className="animate-spin"
            />

            <strong>Cargando alumnos</strong>
            <p>Preparando la lista de asistencia.</p>
          </section>
        ) : !currentAlumno ? (
          <section className="attendance-mobile-empty">
            <XCircle size={38} />

            <strong>
              {secciones.length === 0
                ? 'No hay secciones disponibles'
                : 'No hay alumnos registrados'}
            </strong>

            <p>
              {secciones.length === 0
                ? 'No existen secciones asignadas para este usuario.'
                : 'Revisa las matrículas activas de la sección.'}
            </p>
          </section>
        ) : (
          <>
            <section className="attendance-mobile-student">
              <div className="attendance-mobile-student__meta">
                <span>
                  Alumno {currentIndex + 1} de{' '}
                  {alumnos.length}
                </span>

                <span
                  className="attendance-mobile-student__status"
                  data-status={currentStateLabel}
                >
                  {currentStateLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="attendance-mobile-student__arrow attendance-mobile-student__arrow--left"
                aria-label="Alumno anterior"
              >
                <ChevronLeft size={23} />
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={
                  currentIndex >= alumnos.length - 1
                }
                className="attendance-mobile-student__arrow attendance-mobile-student__arrow--right"
                aria-label="Alumno siguiente"
              >
                <ChevronRight size={23} />
              </button>

              <div className="attendance-mobile-avatar">
                {currentInitials}
              </div>

              <p className="attendance-mobile-student__label">
                Alumno actual
              </p>

              <h2>{currentAlumno.alumno}</h2>

              <p className="attendance-mobile-student__code">
                {currentAlumno.codigo
                  ? `Código: ${currentAlumno.codigo}`
                  : `Matrícula #${currentAlumno.id_matricula}`}
              </p>

              {selectedSeccion?.colegio && (
                <p className="attendance-mobile-student__school">
                  {selectedSeccion.colegio}
                </p>
              )}

              <div className="attendance-mobile-student-list">
                {alumnos.map((alumno, index) => (
                  <button
                    key={alumno.id_matricula}
                    type="button"
                    onClick={() =>
                      setCurrentIndex(index)
                    }
                    aria-label={`Ir al alumno ${
                      index + 1
                    }`}
                    aria-current={
                      index === currentIndex
                        ? 'true'
                        : undefined
                    }
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

            <section className="attendance-mobile-actions">
              <button
                type="button"
                data-state="presente"
                disabled={syncing}
                onClick={() =>
                  marcarEstado('Presente')
                }
              >
                <UserCheck
                  size={23}
                  aria-hidden="true"
                />

                <span>
                  <strong>Presente</strong>
                  <small>Asistió con normalidad</small>
                </span>
              </button>

              <div className="attendance-mobile-actions__middle">
                <button
                  type="button"
                  data-state="tardanza"
                  disabled={syncing}
                  onClick={() =>
                    marcarEstado('Tardanza')
                  }
                >
                  <Clock3
                    size={21}
                    aria-hidden="true"
                  />

                  <span>
                    <strong>Tardanza</strong>
                    <small>Llegó tarde</small>
                  </span>
                </button>

                <button
                  type="button"
                  data-state="ausente"
                  disabled={syncing}
                  onClick={() =>
                    marcarEstado('Ausente')
                  }
                >
                  <UserX
                    size={21}
                    aria-hidden="true"
                  />

                  <span>
                    <strong>Ausente</strong>
                    <small>No asistió</small>
                  </span>
                </button>
              </div>

              <button
                type="button"
                data-state="justificado"
                disabled={syncing}
                onClick={() =>
                  marcarEstado('Justificado')
                }
              >
                <FileCheck2
                  size={21}
                  aria-hidden="true"
                />

                <span>
                  <strong>Justificado</strong>
                  <small>
                    Ausencia con justificación
                  </small>
                </span>
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}