import {
  useEffect,
  useState,
} from 'react';
import axios from 'axios';
import DetallePromocionModal, {
  type ProcesoPromocionDetalle,
} from './DetallePromocionModal';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  History,
  Loader2,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';

type AnioHistorial = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  colegio?: {
    id_colegio?: number | null;
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;
};

type UsuarioHistorial = {
  id_usuario?: number;
  username?: string | null;
  persona?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
  } | null;
};

type DestinoHistorial = {
  id_grado: number;
  nombre_grado: string;

  nivel?: {
    id_nivel?: number;
    nombre_nivel?: string | null;
  } | null;

  id_seccion: number;
  letra?: string | null;
};

type LoteHistorial = {
  id_lote: number;
  estado?: string | null;
  estado_matricula_destino?: string | null;
  fecha_vista_previa?: string | null;
  fecha_ejecucion?: string | null;
  fecha_reversion?: string | null;
  created_at?: string | null;
  observacion?: string | null;
  motivo_reversion?: string | null;
  destinos?: DestinoHistorial[];

  colegio?: {
    id_colegio?: number;
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;

  anio_origen?: {
    id_anio: number;
    nombre_anio: string;
  } | null;

  anio_destino?: {
    id_anio: number;
    nombre_anio: string;
  } | null;

  seccion_origen?: {
    id_seccion: number;
    letra?: string | null;
    grado?: {
      nombre_grado?: string | null;
      nivel?: {
        nombre_nivel?: string | null;
      } | null;
    } | null;
  } | null;

  creado_por?: UsuarioHistorial | null;

  ultima_ejecucion?: {
    numero_ejecucion?: number | null;
    etapa?: string | null;
    estado?: string | null;
    fecha_ejecucion?: string | null;
    fecha_reversion?: string | null;
  } | null;

  resumen?: {
    total?: number;
    listos?: number;
    procesados?: number;
    pendientes?: number;
    bloqueados?: number;
    omitidos?: number;
    revertidos?: number;
    ejecuciones?: number;
  } | null;
};

type RespuestaHistorial = {
  items?: LoteHistorial[];

  resumen?: {
    total_lotes?: number;
    total_ejecuciones?: number;
    total_estudiantes?: number;
    por_estado?: Record<string, number>;
    por_resultado?: Record<string, number>;
  };

  paginacion?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    has_previous?: boolean;
    has_next?: boolean;
  };
};

type SeccionFiltro = {
  id_seccion: number;
  seccion?: {
    letra?: string | null;
    grado?: {
      nombre_grado?: string | null;
      nivel?: {
        nombre_nivel?: string | null;
      } | null;
    } | null;
  } | null;
};

type FiltrosHistorial = {
  colegio_id: string;
  q: string;
  estado: string;
  anio_origen_id: string;
  anio_destino_id: string;
  seccion_id: string;
  fecha_desde: string;
  fecha_hasta: string;
};

type Props = {
  token?: string | null;
  queryAcceso: string;
  refreshKey: number;
  anios: AnioHistorial[];
  mostrarColegioEnAnio: boolean;
  onContinueProceso: (
    idProceso: number,
  ) => Promise<void>;
};

const filtrosIniciales: FiltrosHistorial = {
  colegio_id: '',
  q: '',
  estado: '',
  anio_origen_id: '',
  anio_destino_id: '',
  seccion_id: '',
  fecha_desde: '',
  fecha_hasta: '',
};

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-slate-200 '
  + 'bg-white px-3 text-sm font-semibold text-slate-700 '
  + 'outline-none transition focus:border-blue-400 '
  + 'focus:ring-4 focus:ring-blue-100';

const etiquetaClass =
  'text-[10px] font-black uppercase tracking-[0.12em] '
  + 'text-slate-500';

const crearQuery = (
  base: string,
  values: Record<
    string,
    string | number | undefined
  >,
) => {
  const params =
    new URLSearchParams(
      base.startsWith('?')
        ? base.slice(1)
        : base,
    );

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value === undefined
        || value === ''
      ) {
        params.delete(key);
        return;
      }

      params.set(
        key,
        String(value),
      );
    },
  );

  const result =
    params.toString();

  return result
    ? `?${result}`
    : '';
};

const tonoEstado = (
  estado?: string | null,
) => {
  switch (
    String(estado || '')
      .toLowerCase()
  ) {
    case 'finalizado':
    case 'ejecutado':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'revertido':
      return 'bg-slate-100 text-slate-700 ring-slate-300';

    case 'en proceso':
      return 'bg-blue-50 text-blue-700 ring-blue-200';

    case 'vista previa':
    case 'borrador':
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
};

const fechaLegible = (
  value?: string | null,
) => {
  if (!value) return '—';

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'es-PE',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
};

const nombreUsuario = (
  usuario?: UsuarioHistorial | null,
) => {
  const persona =
    usuario?.persona;

  const nombre =
    [
      persona?.nombres,
      persona?.apellido_paterno,
      persona?.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  return nombre
    || usuario?.username
    || '—';
};

const nombreSeccion = (
  lote: LoteHistorial,
) => {
  const seccion =
    lote.seccion_origen;

  const nivel =
    seccion?.grado
      ?.nivel
      ?.nombre_nivel;

  const grado =
    seccion?.grado?.nombre_grado
    || 'Grado';

  const letra =
    seccion?.letra
      ? `Sección ${seccion.letra}`
      : 'Sin sección';

  return [
    nivel,
    grado,
    letra,
  ]
    .filter(Boolean)
    .join(' · ');
};

const nombresDestino = (
  lote: LoteHistorial,
) => {
  const destinos =
    Array.isArray(lote.destinos)
      ? lote.destinos
      : [];

  return destinos.map(
    (destino) =>
      [
        destino.nivel
          ?.nombre_nivel,
        destino.nombre_grado,
        destino.letra
          ? `Sección ${destino.letra}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
  );
};

const nombreSeccionFiltro = (
  item: SeccionFiltro,
) => {
  const seccion =
    item.seccion;

  const nivel =
    seccion?.grado
      ?.nivel
      ?.nombre_nivel;

  const grado =
    seccion?.grado
      ?.nombre_grado
    || 'Grado';

  const letra =
    seccion?.letra
    || '—';

  return [
    nivel,
    `${grado} ${letra}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

export default function HistorialPromocionPanel({
  token,
  queryAcceso,
  refreshKey,
  anios,
  mostrarColegioEnAnio,
  onContinueProceso,
}: Props) {
  const [
    filtros,
    setFiltros,
  ] = useState<FiltrosHistorial>(
    filtrosIniciales,
  );

  const [
    filtrosAplicados,
    setFiltrosAplicados,
  ] = useState<FiltrosHistorial>(
    filtrosIniciales,
  );

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    versionConsulta,
    setVersionConsulta,
  ] = useState(0);

  const [
    respuesta,
    setRespuesta,
  ] = useState<RespuestaHistorial>({
    items: [],
  });

  const [
    secciones,
    setSecciones,
  ] = useState<SeccionFiltro[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    cargandoSecciones,
    setCargandoSecciones,
  ] = useState(false);

  const [
    abriendoLote,
    setAbriendoLote,
  ] = useState<number | null>(null);

  const [
    detalleCargando,
    setDetalleCargando,
  ] = useState(false);

  const [
    detalleProceso,
    setDetalleProceso,
  ] = useState<ProcesoPromocionDetalle | null>(
    null,
  );

  const [
    errorDetalle,
    setErrorDetalle,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (
      !token
      || !filtros.anio_origen_id
    ) {
      setSecciones([]);
      return;
    }

    let cancelado = false;

    const cargarSecciones =
      async () => {
        setCargandoSecciones(true);

        try {
          const query =
            crearQuery(
              queryAcceso,
              {
                anio_id:
                  filtros.anio_origen_id,
                estado:
                  'Activo',
              },
            );

          const response =
            await axios.get(
              `/api/academicos/secciones-anio${query}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          if (cancelado) return;

          const data =
            Array.isArray(
              response.data?.data,
            )
              ? response.data.data
              : Array.isArray(
                    response.data,
                  )
                ? response.data
                : [];

          setSecciones(data);
        } catch {
          if (!cancelado) {
            setSecciones([]);
          }
        } finally {
          if (!cancelado) {
            setCargandoSecciones(false);
          }
        }
      };

    void cargarSecciones();

    return () => {
      cancelado = true;
    };
  }, [
    filtros.anio_origen_id,
    queryAcceso,
    token,
  ]);

  useEffect(() => {
    if (!token) return;

    let cancelado = false;

    const cargarHistorial =
      async () => {
        setCargando(true);
        setError(null);

        try {
          const query =
            crearQuery(
              queryAcceso,
              {
                colegio_id:
                  filtrosAplicados
                    .colegio_id
                  || undefined,

                q:
                  filtrosAplicados.q
                    .trim()
                  || undefined,

                estado:
                  filtrosAplicados.estado
                  || undefined,

                anio_origen_id:
                  filtrosAplicados
                    .anio_origen_id
                  || undefined,

                anio_destino_id:
                  filtrosAplicados
                    .anio_destino_id
                  || undefined,

                seccion_id:
                  filtrosAplicados
                    .seccion_id
                  || undefined,

                fecha_desde:
                  filtrosAplicados
                    .fecha_desde
                  || undefined,

                fecha_hasta:
                  filtrosAplicados
                    .fecha_hasta
                  || undefined,

                page:
                  pagina,

                limit:
                  10,
              },
            );

          const response =
            await axios.get(
              `/api/academicos/lotes-promocion${query}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          if (cancelado) return;

          setRespuesta(
            response.data || {
              items: [],
            },
          );
        } catch (requestError: any) {
          if (cancelado) return;

          setRespuesta({
            items: [],
          });

          setError(
            requestError.response
              ?.data
              ?.message
            || 'No se pudo cargar el historial de promociones.',
          );
        } finally {
          if (!cancelado) {
            setCargando(false);
          }
        }
      };

    void cargarHistorial();

    return () => {
      cancelado = true;
    };
  }, [
    filtrosAplicados,
    pagina,
    queryAcceso,
    refreshKey,
    token,
    versionConsulta,
  ]);

  const colegiosDisponibles =
    Array.from(
      new Map(
        anios
          .map((anio) => {
            const idColegio =
              Number(
                anio.id_colegio
                || anio.colegio
                  ?.id_colegio
                || 0,
              );

            return [
              idColegio,
              {
                id_colegio:
                  idColegio,

                nombre:
                  anio.colegio?.nombre
                  || anio.colegio
                    ?.nombre_corto
                  || (
                    idColegio
                      ? `Institución ${idColegio}`
                      : 'Institución no disponible'
                  ),
              },
            ] as const;
          })
          .filter(
            ([
              idColegio,
            ]) =>
              idColegio > 0,
          ),
      ).values(),
    )
      .sort(
        (a, b) =>
          a.nombre.localeCompare(
            b.nombre,
            'es',
          ),
      );

  const aniosVisibles =
    filtros.colegio_id
      ? anios.filter(
          (anio) =>
            Number(
              anio.id_colegio
              || anio.colegio
                ?.id_colegio
              || 0,
            )
            === Number(
              filtros.colegio_id,
            ),
        )
      : anios;


  const items =
    Array.isArray(
      respuesta.items,
    )
      ? respuesta.items
      : [];

  const resumen =
    respuesta.resumen || {};

  const paginacion =
    respuesta.paginacion || {};

  const totalPaginas =
    Math.max(
      Number(
        paginacion.total_pages
        || 0,
      ),
      1,
    );

  const aplicarFiltros = () => {
    setPagina(1);

    setFiltrosAplicados({
      ...filtros,
      q:
        filtros.q.trim(),
    });

    setVersionConsulta(
      (value) =>
        value + 1,
    );
  };

  const limpiarFiltros = () => {
    setFiltros(
      filtrosIniciales,
    );

    setFiltrosAplicados(
      filtrosIniciales,
    );

    setSecciones([]);
    setPagina(1);

    setVersionConsulta(
      (value) =>
        value + 1,
    );
  };

  const abrirProceso =
    async (
      idProceso: number,
    ) => {
      if (!token) return;

      setAbriendoLote(
        idProceso,
      );

      setDetalleProceso(null);
      setDetalleCargando(true);
      setErrorDetalle(null);

      try {
        const response =
          await axios.get(
            `/api/academicos/lotes-promocion/${idProceso}${queryAcceso}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        setDetalleProceso(
          response.data,
        );
      } catch (requestError: any) {
        setErrorDetalle(
          requestError.response
            ?.data
            ?.message
          || 'No se pudo abrir el detalle del proceso.',
        );
      } finally {
        setDetalleCargando(false);
        setAbriendoLote(null);
      }
    };

  return (
    <section className="erp-data-enter space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <History size={18} />
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
              Consulta histórica
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Historial de promociones
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Revisa procesos anteriores sin modificar matrículas.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={cargando}
          onClick={() =>
            setVersionConsulta(
              (value) =>
                value + 1,
            )
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCcw
            size={15}
            className={
              cargando
                ? 'animate-spin'
                : ''
            }
          />

          Actualizar historial
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={16}
            className="text-slate-600"
          />

          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
            Filtros de consulta
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          {mostrarColegioEnAnio && (
          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Institución
            </span>

            <select
              value={filtros.colegio_id}
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    colegio_id:
                      event.target.value,
                    anio_origen_id: '',
                    anio_destino_id: '',
                    seccion_id: '',
                  }),
                )
              }
              className={inputClass}
            >
              <option value="">
                Todas las instituciones
              </option>

              {colegiosDisponibles.map(
                (colegio) => (
                  <option
                    key={colegio.id_colegio}
                    value={colegio.id_colegio}
                  >
                    {colegio.nombre}
                  </option>
                ),
              )}
            </select>
          </label>
          )}

          <label
            className={
              mostrarColegioEnAnio
                ? 'block xl:col-span-6'
                : 'block xl:col-span-9'
            }
          >
            <span className={etiquetaClass}>
              Buscar
            </span>

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-4 text-slate-400"
              />

              <input
                value={filtros.q}
                placeholder="Proceso, colegio, año, sección o usuario"
                onChange={(event) =>
                  setFiltros(
                    (actual) => ({
                      ...actual,
                      q:
                        event.target.value,
                    }),
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key
                    === 'Enter'
                  ) {
                    aplicarFiltros();
                  }
                }}
                className={
                  inputClass
                  + ' pl-9'
                }
              />
            </div>
          </label>

          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Estado
            </span>

            <select
              value={filtros.estado}
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    estado:
                      event.target.value,
                  }),
                )
              }
              className={inputClass}
            >
              <option value="">
                Todos los estados
              </option>
              <option value="Borrador">
                Borrador
              </option>
              <option value="Vista previa">
                Preparado
              </option>
              <option value="En proceso">
                En ejecución
              </option>
              <option value="Ejecutado">
                Ejecutado
              </option>
              <option value="Finalizado">
                Completado
              </option>
              <option value="Revertido">
                Revertido
              </option>
            </select>
          </label>

          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Año de origen
            </span>

            <select
              value={
                filtros.anio_origen_id
              }
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    anio_origen_id:
                      event.target.value,
                    seccion_id: '',
                  }),
                )
              }
              className={inputClass}
            >
              <option value="">
                Todos los años
              </option>

              {aniosVisibles.map(
                (anio) => (
                  <option
                    key={anio.id_anio}
                    value={anio.id_anio}
                  >
                    {anio.nombre_anio}
                    {mostrarColegioEnAnio
                      && anio.colegio?.nombre
                      ? ` · ${anio.colegio.nombre}`
                      : ''}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Año de destino
            </span>

            <select
              value={
                filtros.anio_destino_id
              }
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    anio_destino_id:
                      event.target.value,
                  }),
                )
              }
              className={inputClass}
            >
              <option value="">
                Todos los años
              </option>

              {aniosVisibles.map(
                (anio) => (
                  <option
                    key={anio.id_anio}
                    value={anio.id_anio}
                  >
                    {anio.nombre_anio}
                    {mostrarColegioEnAnio
                      && anio.colegio?.nombre
                      ? ` · ${anio.colegio.nombre}`
                      : ''}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block xl:col-span-6">
            <span className={etiquetaClass}>
              Sección de origen
            </span>

            <select
              value={
                filtros.seccion_id
              }
              disabled={
                !filtros.anio_origen_id
                || cargandoSecciones
              }
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    seccion_id:
                      event.target.value,
                  }),
                )
              }
              className={inputClass}
            >
              <option value="">
                {cargandoSecciones
                  ? 'Cargando secciones…'
                  : filtros.anio_origen_id
                    ? 'Todas las secciones'
                    : 'Selecciona primero el año de origen'}
              </option>

              {secciones.map(
                (item) => (
                  <option
                    key={item.id_seccion}
                    value={item.id_seccion}
                  >
                    {nombreSeccionFiltro(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Desde
            </span>

            <input
              type="date"
              value={
                filtros.fecha_desde
              }
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    fecha_desde:
                      event.target.value,
                  }),
                )
              }
              className={inputClass}
            />
          </label>

          <label className="block xl:col-span-3">
            <span className={etiquetaClass}>
              Hasta
            </span>

            <input
              type="date"
              value={
                filtros.fecha_hasta
              }
              onChange={(event) =>
                setFiltros(
                  (actual) => ({
                    ...actual,
                    fecha_hasta:
                      event.target.value,
                  }),
                )
              }
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:col-span-6">
            <button
              type="button"
              disabled={cargando}
              onClick={aplicarFiltros}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Filter size={14} />
              )}

              Aplicar filtros
            </button>

            <button
              type="button"
              disabled={cargando}
              onClick={limpiarFiltros}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:flex-none"
            >
              <RefreshCcw size={14} />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label:
              'Procesos encontrados',
            value:
              resumen.total_lotes
              || 0,
          },
          {
            label:
              'Ejecuciones registradas',
            value:
              resumen.total_ejecuciones
              || 0,
          },
          {
            label:
              'Estudiantes evaluados',
            value:
              resumen.total_estudiantes
              || 0,
          },
          {
            label:
              'Procesos revertidos',
            value:
              resumen.por_estado
                ?.Revertido
              || 0,
          },
        ].map(
          (item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {item.label}
              </p>

              <p className="mt-1 text-2xl font-black text-slate-950">
                {item.value}
              </p>
            </div>
          ),
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid gap-3 p-3 lg:hidden">
          {cargando ? (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 p-8 text-sm font-bold text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Cargando historial…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              No se encontraron procesos con los filtros seleccionados.
            </div>
          ) : (
            items.map((lote) => (
              <article
                key={lote.id_lote}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Proceso N.° {lote.id_lote}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {lote.colegio?.nombre
                        || lote.colegio
                          ?.nombre_corto
                        || 'Institución no disponible'}
                    </p>
                  </div>

                  <span
                    className={
                      'inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 '
                      + tonoEstado(
                        lote.estado,
                      )
                    }
                  >
                    {lote.estado
                      || 'Sin estado'}
                  </span>
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      Origen
                    </dt>

                    <dd className="mt-1 font-bold text-slate-800">
                      {nombreSeccion(lote)}
                    </dd>

                    <dd className="text-xs font-semibold text-slate-500">
                      {lote.anio_origen
                        ?.nombre_anio
                        || '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      Destino
                    </dt>

                    <dd className="mt-1 font-bold text-slate-800">
                      {nombresDestino(lote)
                        .join(' / ')
                        || 'Destino no asignado'}
                    </dd>

                    <dd className="text-xs font-semibold text-slate-500">
                      {lote.anio_destino
                        ?.nombre_anio
                        || '—'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      Alumnos
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {lote.resumen?.total || 0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      Ejecuciones
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {lote.resumen
                        ?.ejecuciones
                        || 0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      Creado
                    </p>
                    <p className="mt-1 text-xs font-black text-slate-900">
                      {fechaLegible(
                        lote.created_at,
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    abriendoLote !== null
                  }
                  onClick={() =>
                    void abrirProceso(
                      lote.id_lote,
                    )
                  }
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {abriendoLote
                    === lote.id_lote ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Eye size={14} />
                    )}

                  Ver detalle
                </button>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[1450px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  'Proceso',
                  'Origen',
                  'Destino',
                  'Estado',
                  'Estudiantes',
                  'Ejecuciones',
                  'Fecha de creación',
                  'Creado por',
                  'Acción',
                ].map(
                  (label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {cargando ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12"
                  >
                    <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Cargando historial…
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm font-semibold text-slate-500"
                  >
                    No se encontraron procesos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map(
                  (lote) => (
                    <tr
                      key={lote.id_lote}
                      className="align-top transition hover:bg-slate-50/80"
                    >
                      <td className="w-60 min-w-60 px-4 py-4">
                        <p className="text-sm font-black text-slate-950">
                          Proceso N.° {lote.id_lote}
                        </p>

                        <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                          {lote.colegio
                            ?.nombre
                            || lote.colegio
                              ?.nombre_corto
                            || 'Colegio no disponible'}
                        </p>

                      </td>

                      <td className="w-64 min-w-64 px-4 py-4">
                        <p className="text-sm font-black leading-5 text-slate-800">
                          {nombreSeccion(
                            lote,
                          )}
                        </p>

                        <p className="text-xs font-semibold text-slate-500">
                          {lote.anio_origen
                            ?.nombre_anio
                            || '—'}
                        </p>
                      </td>

                      <td className="w-64 min-w-64 px-4 py-4">
                        {nombresDestino(lote).length > 0 ? (
                          nombresDestino(lote).map(
                            (destino) => (
                              <p
                                key={destino}
                                className="text-sm font-black leading-5 text-slate-800"
                              >
                                {destino}
                              </p>
                            ),
                          )
                        ) : (
                          <p className="text-sm font-black text-slate-500">
                            Destino no asignado
                          </p>
                        )}

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {lote.anio_destino
                            ?.nombre_anio
                            || '—'}
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {lote.estado_matricula_destino
                            || '—'}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            'inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 '
                            + tonoEstado(
                              lote.estado,
                            )
                          }
                        >
                          {lote.estado
                            || 'Sin estado'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-900">
                          {lote.resumen
                            ?.total
                            || 0}
                        </p>

                        <p className="text-[11px] font-semibold text-slate-500">
                          {lote.resumen
                            ?.procesados
                            || 0}{' '}
                          procesados
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-900">
                          {lote.resumen
                            ?.ejecuciones
                            || 0}
                        </p>

                        <p className="text-[11px] font-semibold text-slate-500">
                          {lote.ultima_ejecucion
                            ?.estado
                            || 'Sin ejecución'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">
                        {fechaLegible(
                          lote.created_at,
                        )}
                      </td>

                      <td className="min-w-44 px-4 py-3 text-xs font-semibold text-slate-600">
                        {nombreUsuario(
                          lote.creado_por,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={
                            abriendoLote
                            !== null
                          }
                          onClick={() =>
                            void abrirProceso(
                              lote.id_lote,
                            )
                          }
                          className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {abriendoLote
                            === lote.id_lote ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Eye size={14} />
                            )}

                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Página {paginacion.page || pagina} de {totalPaginas}
            {' · '}
            {paginacion.total || 0} proceso(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                cargando
                || !paginacion
                  .has_previous
              }
              onClick={() =>
                setPagina(
                  (value) =>
                    Math.max(
                      value - 1,
                      1,
                    ),
                )
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            <button
              type="button"
              disabled={
                cargando
                || !paginacion
                  .has_next
              }
              onClick={() =>
                setPagina(
                  (value) =>
                    value + 1,
                )
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {(detalleProceso || detalleCargando) && (
        <DetallePromocionModal
          proceso={detalleProceso || {}}
          cargando={detalleCargando}
          onClose={() => {
            setDetalleProceso(null);
            setDetalleCargando(false);
            setAbriendoLote(null);
            setErrorDetalle(null);
          }}
          onContinue={async (idProceso) => {
            await onContinueProceso(
              idProceso,
            );
          }}
        />
      )}

      {errorDetalle && (
        <div className="fixed bottom-5 right-5 z-[120] max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <span>{errorDetalle}</span>

            <button
              type="button"
              onClick={() =>
                setErrorDetalle(null)
              }
              className="shrink-0 text-red-700"
              aria-label="Cerrar error"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
