import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
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

const estados: { value: EstadoAsistencia; label: string; className: string }[] = [
  {
    value: 'Presente',
    label: 'Presente',
    className: 'bg-emerald-300 text-emerald-950 border-emerald-500',
  },
  {
    value: 'Tardanza',
    label: 'Tarde',
    className: 'bg-amber-300 text-amber-950 border-amber-500',
  },
  {
    value: 'Ausente',
    label: 'Ausente',
    className: 'bg-rose-500 text-white border-rose-700',
  },
  {
    value: 'Justificado',
    label: 'Justificar',
    className: 'bg-slate-300 text-slate-900 border-slate-500',
  },
];

const todayISO = () => new Date().toISOString().split('T')[0];

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

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const currentAlumno = alumnos[currentIndex] || null;
  const selectedSeccion = secciones.find((item) => item.id_seccion === seccionId);
  const completados = alumnos.filter((item) => item.estado !== 'Presente').length;
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
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarAsistencia = async () => {
    if (!token || !headers || !seccionId || !fecha) return;

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
  }, [token, JSON.stringify(queryParams)]);

  useEffect(() => {
    cargarAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId, fecha, token, JSON.stringify(queryParams)]);

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

    setCurrentIndex((current) =>
      current < alumnos.length - 1 ? current + 1 : current,
    );
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
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/asistencia"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <ChevronLeft size={22} />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Asistencia móvil
            </p>
            <h1 className="truncate text-base font-black">
              {selectedSeccion?.label || 'Selecciona una sección'}
            </h1>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={saving || alumnos.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-xs font-black text-white disabled:bg-slate-300"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
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
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        <div className="mb-4 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          <span>
            {alumnos.length > 0 ? `${currentIndex + 1} / ${alumnos.length}` : '0 / 0'}
          </span>
          <span>{avance}%</span>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${avance}%` }}
          />
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto animate-spin text-blue-600" size={34} />
              <p className="mt-3 text-sm font-black text-slate-500">Cargando...</p>
            </div>
          </div>
        ) : !currentAlumno ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white px-6 text-center shadow-sm">
            <div>
              <XCircle className="mx-auto text-slate-300" size={40} />
              <p className="mt-3 text-base font-black">No hay alumnos</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Revisa la sección seleccionada o las matrículas activas.
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Alumno actual
              </p>

              <h2 className="mt-5 min-h-[96px] text-3xl font-black leading-tight text-slate-950">
                {currentAlumno.alumno}
              </h2>

              <p className="mt-2 text-sm font-bold text-slate-400">
                {currentAlumno.codigo ? `Código: ${currentAlumno.codigo}` : `Matrícula #${currentAlumno.id_matricula}`}
              </p>

              <div className="mt-6 grid grid-cols-10 gap-1">
                {alumnos.map((alumno, index) => (
                  <button
                    key={alumno.id_matricula}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-7 rounded-lg border text-[10px] font-black ${
                      index === currentIndex
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : alumno.estado === 'Presente'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : alumno.estado === 'Tardanza'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : alumno.estado === 'Ausente'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => marcarEstado('Presente')}
                className="h-32 rounded-[1.75rem] border-2 border-emerald-500 bg-emerald-300 text-3xl font-black text-emerald-950 shadow-sm active:scale-[0.99]"
              >
                Presente
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => marcarEstado('Tardanza')}
                  className="h-32 rounded-[1.75rem] border-2 border-amber-500 bg-amber-300 text-2xl font-black text-amber-950 shadow-sm active:scale-[0.99]"
                >
                  Tarde
                </button>

                <button
                  type="button"
                  onClick={() => marcarEstado('Ausente')}
                  className="h-32 rounded-[1.75rem] border-2 border-rose-700 bg-rose-500 text-2xl font-black text-white shadow-sm active:scale-[0.99]"
                >
                  Ausente
                </button>
              </div>

              <button
                type="button"
                onClick={() => marcarEstado('Justificado')}
                className="h-24 rounded-[1.75rem] border-2 border-slate-500 bg-slate-300 text-2xl font-black text-slate-900 shadow-sm active:scale-[0.99]"
              >
                Justificar
              </button>
            </section>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm"
              >
                <ArrowLeft size={16} />
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((value) => Math.min(alumnos.length - 1, value + 1))}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm"
              >
                Siguiente
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          Cambios pendientes: {completados} marca(s) distintas de presente.
        </p>
      </main>
    </div>
  );
}
