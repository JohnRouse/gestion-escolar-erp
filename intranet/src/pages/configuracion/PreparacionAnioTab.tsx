import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';

type AnioLectivo = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  estado: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  colegio?: {
    id_colegio: number;
    nombre: string;
    nombre_corto?: string | null;
  } | null;
};

type EstadoItem = 'listo' | 'parcial' | 'pendiente' | 'bloqueo' | 'no_aplica';

type PreparacionItem = {
  grupo: string;
  clave: string;
  titulo: string;
  estado: EstadoItem;
  mensaje: string;
  tab?: string;
  actual?: number;
  total?: number;
  obligatorio?: boolean;
  aplica?: boolean;
};

type PreparacionGrupo = {
  key: string;
  titulo: string;
  items: PreparacionItem[];
};

type PreparacionData = {
  perfil_operativo?: {
    key: string;
    nombre: string;
    descripcion: string;
  };
  anio: {
    id_anio: number;
    nombre_anio: string;
    estado: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  colegio: {
    id_colegio: number;
    nombre: string;
    nombre_corto?: string | null;
  } | null;
  resumen: {
    porcentaje: number;
    estado_general: 'listo' | 'parcial' | 'incompleto' | 'bloqueado';
    total: number;
    listos: number;
    parciales: number;
    pendientes: number;
    bloqueos: number;
  };
  grupos: PreparacionGrupo[];
};

const selectClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

const estadoUi: Record<
  EstadoItem,
  {
    label: string;
    icon: typeof CheckCircle2;
    badge: string;
    card: string;
  }
> = {
  listo: {
    label: 'Listo',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    card: 'border-slate-200 bg-white',
  },
  parcial: {
    label: 'Parcial',
    icon: Clock3,
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    card: 'border-slate-200 bg-white',
  },
  pendiente: {
    label: 'Pendiente',
    icon: AlertTriangle,
    badge: 'bg-orange-50 text-orange-800 ring-orange-200',
    card: 'border-slate-200 bg-white',
  },
  bloqueo: {
    label: 'Bloquea uso',
    icon: XCircle,
    badge: 'bg-rose-50 text-rose-800 ring-rose-200',
    card: 'border-slate-200 bg-white',
  },
  no_aplica: {
    label: 'No aplica aún',
    icon: ShieldCheck,
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    card: 'border-slate-100 bg-slate-50/70',
  },
};

const prioridadAnio = (estado?: string) => {
  const value = String(estado || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (value.includes('curso')) return 1;
  if (value.includes('matricula')) return 2;
  if (value.includes('plan')) return 3;
  if (value.includes('cerrado')) return 8;
  return 5;
};

const PERFILES_OPERATIVOS = [
  {
    key: 'colegio_completo',
    label: 'Colegio completo',
    description: 'Matrícula, estructura académica, notas y finanzas.',
  },
  {
    key: 'academia',
    label: 'Academia / instituto',
    description: 'Estructura, cursos, docentes y evaluación; finanzas no bloquea.',
  },
  {
    key: 'solo_matricula',
    label: 'Solo matrícula',
    description: 'Valida lo necesario para registrar alumnos y cobrar matrícula.',
  },
  {
    key: 'solo_tesoreria',
    label: 'Solo tesorería',
    description: 'Valida año lectivo y conceptos de pago.',
  },
  {
    key: 'sin_notas',
    label: 'Sin notas',
    description: 'Evaluación y plantillas no bloquean la apertura.',
  },
  {
    key: 'sin_pensiones',
    label: 'Sin pensiones',
    description: 'Las pensiones no bloquean la apertura académica.',
  },
] as const;

export default function PreparacionAnioTab() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const [searchParams, setSearchParams] = useSearchParams();

  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;

  const colegioInicial =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? String(activeColegio.id_colegio)
      : colegios[0]?.id_colegio
        ? String(colegios[0].id_colegio)
        : '';

  const [colegioGestionId, setColegioGestionId] = useState(colegioInicial);
  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [idAnio, setIdAnio] = useState(searchParams.get('anio_id') || '');
  const [perfilOperativo, setPerfilOperativo] = useState(
    searchParams.get('perfil') || 'colegio_completo',
  );
  const [loadingAnios, setLoadingAnios] = useState(false);
  const [loadingPreparacion, setLoadingPreparacion] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [data, setData] = useState<PreparacionData | null>(null);

  const colegioSeleccionadoId = Number(
    mostrarSelectorInstitucion ? colegioGestionId : activeColegio?.id_colegio || colegioGestionId || 0,
  );

  const nombreColegio = (id?: number | null) => {
    if (!id) return scopeLabel;
    const colegio = colegios.find((item) => item.id_colegio === id);
    return colegio?.nombre || colegio?.nombre_corto || `Colegio #${id}`;
  };

  const queryConColegio = useMemo(() => {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');

    if (colegioSeleccionadoId) {
      params.delete('scope');
      params.set('colegio_id', String(colegioSeleccionadoId));
    }

    return params.toString() ? `?${params.toString()}` : '';
  }, [queryString, colegioSeleccionadoId]);

  const aniosOrdenados = useMemo(() => {
    return [...anios].sort((a, b) => {
      const prioridad = prioridadAnio(a.estado) - prioridadAnio(b.estado);
      if (prioridad !== 0) return prioridad;
      return Number(b.id_anio) - Number(a.id_anio);
    });
  }, [anios]);

  const perfilActivo =
    PERFILES_OPERATIVOS.find((perfil) => perfil.key === perfilOperativo) ||
    PERFILES_OPERATIVOS[0];

  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  useEffect(() => {
    cargarAnios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryConColegio]);

  useEffect(() => {
    if (!idAnio) {
      setData(null);
      return;
    }

    cargarPreparacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, idAnio, queryConColegio, perfilOperativo]);

  const cargarAnios = async () => {
    if (!token || !colegioSeleccionadoId) {
      setAnios([]);
      setIdAnio('');
      setData(null);
      return;
    }

    setLoadingAnios(true);
    setMensaje(null);
    setData(null);

    try {
      const res = await axios.get(`/api/academicos/anios${queryConColegio}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const lista: AnioLectivo[] = Array.isArray(res.data) ? res.data : [];
      const filtrados = lista.filter(
        (anio) => Number(anio.id_colegio) === Number(colegioSeleccionadoId),
      );

      setAnios(filtrados);

      const anioUrl = searchParams.get('anio_id');
      const existeUrl = filtrados.some((anio) => String(anio.id_anio) === String(anioUrl));
      const recomendado = filtrados
        .slice()
        .sort((a, b) => {
          const prioridad = prioridadAnio(a.estado) - prioridadAnio(b.estado);
          if (prioridad !== 0) return prioridad;
          return Number(b.id_anio) - Number(a.id_anio);
        })[0];

      const nextId = existeUrl ? String(anioUrl) : recomendado ? String(recomendado.id_anio) : '';
      setIdAnio(nextId);

      if (nextId) {
        setSearchParams({ tab: 'preparacion', anio_id: nextId, perfil: perfilOperativo });
      }
    } catch (error: any) {
      setAnios([]);
      setIdAnio('');
      setMensaje(error.response?.data?.message || 'No se pudieron cargar los años lectivos.');
    } finally {
      setLoadingAnios(false);
    }
  };

  const cargarPreparacion = async () => {
    if (!token || !idAnio) return;

    setLoadingPreparacion(true);
    setMensaje(null);

    try {
      const params = new URLSearchParams(
        queryConColegio.startsWith('?') ? queryConColegio.slice(1) : queryConColegio,
      );
      params.set('perfil', perfilOperativo);
      const suffix = params.toString() ? `?${params.toString()}` : '';

      const res = await axios.get(`/api/academicos/anios/${idAnio}/preparacion${suffix}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);
    } catch (error: any) {
      setData(null);
      setMensaje(error.response?.data?.message || 'No se pudo cargar la preparación del año lectivo.');
    } finally {
      setLoadingPreparacion(false);
    }
  };

  const cambiarAnio = (value: string) => {
    setIdAnio(value);

    if (value) {
      setSearchParams({ tab: 'preparacion', anio_id: value, perfil: perfilOperativo });
    } else {
      setSearchParams({ tab: 'preparacion' });
    }
  };

  const irATab = (tab?: string) => {
    if (!tab) return;
    setSearchParams({ tab });
  };

  return (
    <div className="config-preparacion-page space-y-5">
      <section className="rounded-[26px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Preparación del año lectivo</p>
            <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-400">
              Revisa si el año tiene estructura académica, cursos, docentes, plantillas, matrícula
              y conceptos de pago listos para operar.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarPreparacion}
            disabled={!idAnio || loadingPreparacion}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingPreparacion ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Actualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {mostrarSelectorInstitucion && (
            <label>
              <Label>Institución para revisar</Label>
              <select
                value={colegioGestionId}
                onChange={(event) => {
                  setColegioGestionId(event.target.value);
                  setIdAnio('');
                  setData(null);
                  setSearchParams({ tab: 'preparacion' });
                }}
                className={selectClass}
              >
                {colegios.map((colegio) => (
                  <option key={colegio.id_colegio} value={colegio.id_colegio}>
                    {colegio.nombre || colegio.nombre_corto}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <Label>Año lectivo</Label>
            <select
              value={idAnio}
              onChange={(event) => cambiarAnio(event.target.value)}
              className={selectClass}
              disabled={loadingAnios || aniosOrdenados.length === 0}
            >
              <option value="">Seleccionar año</option>
              {aniosOrdenados.map((anio) => (
                <option key={anio.id_anio} value={anio.id_anio}>
                  {anio.nombre_anio} · {anio.estado}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Label>Perfil operativo</Label>
            <select
              value={perfilOperativo}
              onChange={(event) => {
                const nextPerfil = event.target.value;
                setPerfilOperativo(nextPerfil);
                setSearchParams(
                  idAnio
                    ? { tab: 'preparacion', anio_id: idAnio, perfil: nextPerfil }
                    : { tab: 'preparacion', perfil: nextPerfil },
                );
              }}
              className={selectClass}
            >
              {PERFILES_OPERATIVOS.map((perfil) => (
                <option key={perfil.key} value={perfil.key}>
                  {perfil.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
            <Building2 size={13} />
            Contexto de revisión: {nombreColegio(colegioSeleccionadoId)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
            <ShieldCheck size={13} />
            Perfil: {data?.perfil_operativo?.nombre || perfilActivo.label}
          </p>
        </div>

        <p className="mt-2 text-xs font-bold text-slate-400">
          {data?.perfil_operativo?.descripcion || perfilActivo.description}
        </p>
      </section>

      {mensaje && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
          {mensaje}
        </div>
      )}

      {loadingAnios || loadingPreparacion ? (
        <section className="flex min-h-[340px] items-center justify-center rounded-[26px] bg-white ring-1 ring-slate-100">
          <div className="text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-blue-600" />
            <p className="mt-3 text-sm font-black text-slate-600">Revisando configuración...</p>
          </div>
        </section>
      ) : !idAnio ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-[26px] bg-white text-center ring-1 ring-slate-100">
          <ShieldCheck size={34} className="text-slate-300" />
          <p className="mt-3 text-sm font-black text-slate-700">Selecciona un año lectivo</p>
          <p className="mt-1 max-w-md text-sm font-bold text-slate-400">
            El sistema revisará automáticamente qué falta configurar.
          </p>
        </section>
      ) : data ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div className="rounded-[26px] bg-white p-5 ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Estado general
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-black text-slate-950">{data.resumen.porcentaje}%</p>
                  <p className="mt-1 text-sm font-bold text-slate-400">
                    {data.anio.nombre_anio} · {data.colegio?.nombre || nombreColegio(colegioSeleccionadoId)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                  {data.resumen.estado_general}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${data.resumen.porcentaje}%` }}
                />
              </div>
            </div>

            <MetricCard label="Listos" value={data.resumen.listos} tone="emerald" />
            <MetricCard label="Advertencias" value={data.resumen.parciales + data.resumen.pendientes} tone="amber" />
            <MetricCard label="Bloqueos" value={data.resumen.bloqueos} tone="rose" />
          </section>

          <section className="space-y-4">
            {data.grupos.map((grupo, groupIndex) => (
              <article
                key={grupo.key}
                className="config-card-enter overflow-hidden rounded-[26px] bg-white ring-1 ring-slate-100"
                style={{ animationDelay: `${groupIndex * 40}ms` }}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="text-sm font-black text-slate-900">{grupo.titulo}</p>
                </div>

                <div className="grid gap-3 p-4 xl:grid-cols-2">
                  {grupo.items.map((item) => {
                    const ui = estadoUi[item.estado];
                    const Icon = ui.icon;

                    return (
                      <div
                        key={item.clave}
                        className={`preparacion-item preparacion-item--${item.estado} rounded-[18px] border p-4 transition hover:shadow-sm ${ui.card}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1 ${ui.badge}`}>
                              <Icon size={17} />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-900">{item.titulo}</p>
                                <span className="preparacion-obligation-badge rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700 ring-1 ring-slate-300">
                                  {item.obligatorio === false ? 'Opcional' : 'Obligatorio'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                {item.mensaje}
                              </p>
                            </div>
                          </div>

                          <span className={`preparacion-status-badge shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ring-1 ${ui.badge}`}>
                            {ui.label}
                          </span>
                        </div>

                        {typeof item.actual === 'number' && typeof item.total === 'number' && item.total > 0 && (
                          <div className="mt-4">
                            <div className="mb-1 flex justify-between text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                              <span>Avance</span>
                              <span>
                                {item.actual}/{item.total}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/80">
                              <div
                                className="h-full rounded-full bg-slate-950 transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, Math.round((item.actual / item.total) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {item.tab && item.estado !== 'listo' && (
                          <button
                            type="button"
                            onClick={() => irATab(item.tab)}
                            className="mt-4 inline-flex h-9 items-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                          >
                            Ir a configurar
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'rose';
}) {
  const styles = {
    emerald: {
      accent: 'bg-emerald-500',
      label: 'text-emerald-700',
    },
    amber: {
      accent: 'bg-amber-500',
      label: 'text-amber-700',
    },
    rose: {
      accent: 'bg-rose-500',
      label: 'text-rose-700',
    },
  }[tone];

  return (
    <div className="preparacion-metric rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${styles.accent}`}
        />
        <p
          className={`text-xs font-bold uppercase tracking-[0.04em] ${styles.label}`}
        >
          {label}
        </p>
      </div>

      <p className="mt-3 text-3xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm font-normal text-slate-600">
        Configuraciones
      </p>
    </div>
  );
}
