import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Lock,
  Pencil,
  Power,
  RefreshCw,
  Save,
  Sparkles,
  Unlock,
} from 'lucide-react';

interface Unidad {
  id_unidad: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado_abierto: boolean;
}

interface Bimestre {
  id_bimestre: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  unidades: Unidad[];
}

interface PeriodosResponse {
  id_anio: number;
  nombre_anio: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  bimestres: Bimestre[];
}

const toInputDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export default function PeriodosTab() {
  const { token } = useAuth();

  const [data, setData] = useState<PeriodosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(
    null,
  );

  const unidadAbierta = useMemo(() => {
    return data?.bimestres
      .flatMap((bimestre) =>
        bimestre.unidades.map((unidad) => ({
          ...unidad,
          bimestre: bimestre.numero,
        })),
      )
      .find((unidad) => unidad.estado_abierto);
  }, [data]);

  const cargarPeriodos = async () => {
    if (!token) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get('/api/academicos/periodos?anio_id=1', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudieron cargar los periodos.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPeriodos();
  }, [token]);

  const updateBimestreLocal = (
    idBimestre: number,
    field: 'fecha_inicio' | 'fecha_fin',
    value: string,
  ) => {
    if (!data) return;

    setData({
      ...data,
      bimestres: data.bimestres.map((bimestre) =>
        bimestre.id_bimestre === idBimestre
          ? {
              ...bimestre,
              [field]: value,
            }
          : bimestre,
      ),
    });
  };

  const updateUnidadLocal = (
    idUnidad: number,
    field: 'fecha_inicio' | 'fecha_fin',
    value: string,
  ) => {
    if (!data) return;

    setData({
      ...data,
      bimestres: data.bimestres.map((bimestre) => ({
        ...bimestre,
        unidades: bimestre.unidades.map((unidad) =>
          unidad.id_unidad === idUnidad
            ? {
                ...unidad,
                [field]: value,
              }
            : unidad,
        ),
      })),
    });
  };

  const guardarBimestre = async (bimestre: Bimestre) => {
    if (!token) return;

    setSavingKey(`bimestre-${bimestre.id_bimestre}`);
    setMensaje(null);

    try {
      await axios.put(
        `/api/academicos/bimestres/${bimestre.id_bimestre}`,
        {
          fecha_inicio: toInputDate(bimestre.fecha_inicio),
          fecha_fin: toInputDate(bimestre.fecha_fin),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMensaje({ tipo: 'exito', texto: `Bimestre ${bimestre.numero} actualizado.` });
      await cargarPeriodos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo actualizar el bimestre.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const guardarUnidad = async (unidad: Unidad) => {
    if (!token) return;

    setSavingKey(`unidad-${unidad.id_unidad}`);
    setMensaje(null);

    try {
      await axios.put(
        `/api/academicos/unidades/${unidad.id_unidad}`,
        {
          fecha_inicio: toInputDate(unidad.fecha_inicio),
          fecha_fin: toInputDate(unidad.fecha_fin),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMensaje({ tipo: 'exito', texto: `Unidad ${unidad.numero} actualizada.` });
      await cargarPeriodos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo actualizar la unidad.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const abrirUnidad = async (unidad: Unidad) => {
    if (!token) return;

    setSavingKey(`abrir-${unidad.id_unidad}`);
    setMensaje(null);

    try {
      await axios.put(
        `/api/academicos/unidades/${unidad.id_unidad}/abrir`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMensaje({
        tipo: 'exito',
        texto: `Unidad ${unidad.numero} abierta correctamente.`,
      });

      await cargarPeriodos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo abrir la unidad.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const cerrarUnidad = async (unidad: Unidad) => {
    if (!token) return;

    setSavingKey(`cerrar-${unidad.id_unidad}`);
    setMensaje(null);

    try {
      await axios.put(
        `/api/academicos/unidades/${unidad.id_unidad}/cerrar`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMensaje({
        tipo: 'exito',
        texto: `Unidad ${unidad.numero} cerrada correctamente.`,
      });

      await cargarPeriodos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No se pudo cerrar la unidad.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-28 rounded-[2rem]" />
        <div className="skeleton h-64 rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-gray-200/70 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
              <CalendarRange size={21} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                Año académico
              </p>
              <p className="mt-1 text-lg font-black text-gray-950">
                {data?.nombre_anio || 'Año lectivo'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-200/70 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Unlock size={21} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                Unidad abierta
              </p>
              <p className="mt-1 text-lg font-black text-gray-950">
                {unidadAbierta
                  ? `Bim. ${unidadAbierta.bimestre} · Unidad ${unidadAbierta.numero}`
                  : 'Ninguna'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-200/70 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <Sparkles size={21} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                Estado
              </p>
              <p className="mt-1 text-lg font-black text-gray-950">
                {data?.estado || 'Planificación'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {mensaje && (
        <div
          className={cx(
            'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold',
            mensaje.tipo === 'exito'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-rose-100 bg-rose-50 text-rose-700',
          )}
        >
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
          {mensaje.texto}
        </div>
      )}

      <section className="space-y-4">
        {data?.bimestres.map((bimestre) => {
          const abierto = bimestre.unidades.some((unidad) => unidad.estado_abierto);

          return (
            <article
              key={bimestre.id_bimestre}
              className="overflow-hidden rounded-[2rem] border border-gray-200/70 bg-white/90 shadow-sm shadow-gray-200/60"
            >
              <div className="border-b border-gray-100 bg-gray-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div
                      className={cx(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1',
                        abierto
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-gray-100 text-gray-500 ring-gray-200',
                      )}
                    >
                      {abierto ? <Unlock size={13} /> : <Lock size={13} />}
                      {abierto ? 'Bimestre en curso' : 'Bimestre cerrado'}
                    </div>

                    <h3 className="mt-3 text-xl font-black text-gray-950">
                      {bimestre.numero}.° Bimestre
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Configura las fechas generales y abre solo la unidad que los docentes
                      podrán trabajar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => guardarBimestre(bimestre)}
                    disabled={savingKey === `bimestre-${bimestre.id_bimestre}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingKey === `bimestre-${bimestre.id_bimestre}` ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Guardar bimestre
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Inicio
                    </span>
                    <input
                      type="date"
                      value={toInputDate(bimestre.fecha_inicio)}
                      onChange={(e) =>
                        updateBimestreLocal(
                          bimestre.id_bimestre,
                          'fecha_inicio',
                          e.target.value,
                        )
                      }
                      className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                      Fin
                    </span>
                    <input
                      type="date"
                      value={toInputDate(bimestre.fecha_fin)}
                      onChange={(e) =>
                        updateBimestreLocal(bimestre.id_bimestre, 'fecha_fin', e.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 p-5 xl:grid-cols-2">
                {bimestre.unidades.map((unidad) => (
                  <div
                    key={unidad.id_unidad}
                    className={cx(
                      'rounded-[1.5rem] border p-4 transition',
                      unidad.estado_abierto
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-gray-200 bg-white',
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            'flex h-11 w-11 items-center justify-center rounded-2xl ring-1',
                            unidad.estado_abierto
                              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              : 'bg-gray-50 text-gray-500 ring-gray-200',
                          )}
                        >
                          {unidad.estado_abierto ? <Unlock size={18} /> : <Lock size={18} />}
                        </div>

                        <div>
                          <p className="text-sm font-black text-gray-900">
                            Unidad {unidad.numero}
                          </p>
                          <p className="text-xs text-gray-500">
                            {unidad.estado_abierto
                              ? 'Disponible para registro de notas'
                              : 'No disponible para docentes'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cx(
                          'inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1',
                          unidad.estado_abierto
                            ? 'bg-white text-emerald-700 ring-emerald-200'
                            : 'bg-gray-50 text-gray-500 ring-gray-200',
                        )}
                      >
                        {unidad.estado_abierto ? 'Abierta' : 'Cerrada'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                          Inicio
                        </span>
                        <input
                          type="date"
                          value={toInputDate(unidad.fecha_inicio)}
                          onChange={(e) =>
                            updateUnidadLocal(unidad.id_unidad, 'fecha_inicio', e.target.value)
                          }
                          className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                          Fin
                        </span>
                        <input
                          type="date"
                          value={toInputDate(unidad.fecha_fin)}
                          onChange={(e) =>
                            updateUnidadLocal(unidad.id_unidad, 'fecha_fin', e.target.value)
                          }
                          className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => guardarUnidad(unidad)}
                        disabled={savingKey === `unidad-${unidad.id_unidad}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingKey === `unidad-${unidad.id_unidad}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Pencil size={15} />
                        )}
                        Guardar fechas
                      </button>

                      {unidad.estado_abierto ? (
                        <button
                          type="button"
                          onClick={() => cerrarUnidad(unidad)}
                          disabled={savingKey === `cerrar-${unidad.id_unidad}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-xs font-bold text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingKey === `cerrar-${unidad.id_unidad}` ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Power size={15} />
                          )}
                          Cerrar unidad
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirUnidad(unidad)}
                          disabled={savingKey === `abrir-${unidad.id_unidad}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingKey === `abrir-${unidad.id_unidad}` ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Unlock size={15} />
                          )}
                          Abrir unidad
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <button
        type="button"
        onClick={cargarPeriodos}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"
      >
        <RefreshCw size={16} />
        Actualizar periodos
      </button>
    </div>
  );
}