import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
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

function estadoMiniClass(estado: EstadoAsistencia, active: boolean) {
  if (active) return 'border-slate-950 bg-slate-950 text-white';

  if (estado === 'Presente') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (estado === 'Tardanza') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (estado === 'Ausente') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const scopeKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const currentAlumno = alumnos[currentIndex] || null;
  const selectedSeccion = secciones.find((item) => item.id_seccion === seccionId);
  const avance = alumnos.length > 0 ? Math.round(((currentIndex + 1) / alumnos.length) * 100) : 0;

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

  const cargarAsistencia = async () => {
    if (!seccionId) {
      setAlumnos([]);
      return;
    }

    if (!token || !headers || !fecha) return;

    setLoading(true);
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
      setCurrentIndex(0);
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

  const marcarEstado = (estado: EstadoAsistencia) => {
    if (!currentAlumno) return;

    setMessage(null);

    setAlumnos((prev) =>
      prev.map((alumno) =>
        alumno.id_matricula === currentAlumno.id_matricula
          ? { ...alumno, estado }
          : alumno,
      ),
    );

    if (currentIndex < alumnos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const guardar = async () => {
    if (!token || !headers || !seccionId || alumnos.length === 0) return;

    setSaving(true);
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

      setMessage('Asistencia guardada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-100 text-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex h-11 items-center gap-2">
          <Link
            to="/asistencia"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <ChevronLeft size={20} />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
              Asistencia móvil
            </p>
            <h1 className="truncate text-sm font-black">
              {selectedSeccion?.label || 'Selecciona sección'}
            </h1>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={saving || alumnos.length === 0}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3 text-[11px] font-black text-white disabled:bg-slate-300"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_128px] gap-2">
          <select
            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black outline-none"
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

          <input
            type="date"
            className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black outline-none"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />
        </div>
      </header>

      <main className="mx-auto flex h-[calc(100dvh-101px)] max-w-md flex-col overflow-hidden px-3 py-3">
        <div className="mb-2 flex shrink-0 items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          <span>{alumnos.length > 0 ? `${currentIndex + 1} / ${alumnos.length}` : '0 / 0'}</span>
          <span>{avance}%</span>
        </div>

        <div className="mb-3 h-1.5 shrink-0 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${avance}%` }}
          />
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto animate-spin text-blue-600" size={32} />
              <p className="mt-3 text-sm font-black text-slate-500">Cargando...</p>
            </div>
          </div>
        ) : !currentAlumno ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-white px-6 text-center shadow-sm">
            <div>
              <XCircle className="mx-auto text-slate-300" size={38} />
              <p className="mt-3 text-base font-black">
                {secciones.length === 0 ? 'No hay secciones disponibles' : 'No hay alumnos'}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                {secciones.length === 0
                  ? 'No hay secciones asignadas o configuradas.'
                  : 'Revisa matrículas activas.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="relative shrink-0 rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex >= alumnos.length - 1}
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Alumno actual
              </p>

              <h2 className="mx-auto mt-3 max-w-[250px] text-[clamp(1.45rem,7vw,2rem)] font-black leading-tight text-slate-950">
                {currentAlumno.alumno}
              </h2>

              <p className="mt-3 text-xs font-black text-slate-400">
                {currentAlumno.codigo ? `Código: ${currentAlumno.codigo}` : `Matrícula #${currentAlumno.id_matricula}`}
              </p>

              <div className="mx-auto mt-3 flex max-w-[280px] gap-1 overflow-x-auto pb-1">
                {alumnos.map((alumno, index) => (
                  <button
                    key={alumno.id_matricula}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-7 min-w-7 rounded-lg border px-2 text-[10px] font-black ${estadoMiniClass(
                      alumno.estado,
                      index === currentIndex,
                    )}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-2 grid shrink-0 gap-2">
              <button
                type="button"
                onClick={() => marcarEstado('Presente')}
                className="h-[17dvh] min-h-[70px] max-h-[98px] rounded-2xl border-2 border-emerald-700 bg-emerald-500 text-[clamp(1.35rem,7vw,2rem)] font-black text-white shadow-sm active:scale-[0.99]"
              >
                Presente
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => marcarEstado('Tardanza')}
                  className="h-[14dvh] min-h-[58px] max-h-[82px] rounded-2xl border-2 border-amber-700 bg-amber-400 text-[clamp(1.1rem,6vw,1.55rem)] font-black text-slate-950 shadow-sm active:scale-[0.99]"
                >
                  Tarde
                </button>

                <button
                  type="button"
                  onClick={() => marcarEstado('Ausente')}
                  className="h-[14dvh] min-h-[58px] max-h-[82px] rounded-2xl border-2 border-rose-800 bg-rose-600 text-[clamp(1.1rem,6vw,1.55rem)] font-black text-white shadow-sm active:scale-[0.99]"
                >
                  Ausente
                </button>
              </div>

              <button
                type="button"
                onClick={() => marcarEstado('Justificado')}
                className="h-[10dvh] min-h-[48px] max-h-[64px] rounded-2xl border-2 border-slate-600 bg-slate-300 text-[clamp(1rem,5vw,1.35rem)] font-black text-slate-950 shadow-sm active:scale-[0.99]"
              >
                Justificar
              </button>
            </section>
          </>
        )}

        {message && (
          <div className="mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            <CheckCircle2 size={15} />
            {message}
          </div>
        )}
      </main>
    </div>
  );
}
