import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type AnioLectivo = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado?: string | null;
  colegio?: {
    id_colegio?: number;
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;
};

type SeccionAnio = {
  id_seccion_anio: number;
  id_anio: number;
  id_seccion: number;
  estado: string;
  capacidad_override?: number | null;
  capacidad_efectiva: number;
  ocupados: number;
  disponibles: number;
  sobrecupo?: boolean;
  seccion: {
    id_seccion: number;
    id_grado: number;
    letra: string;
    aula?: {
      capacidad?: number;
      nombre?: string | null;
    } | null;
    grado: {
      id_grado: number;
      nombre_grado: string;
      nivel?: {
        id_nivel: number;
        nombre_nivel: string;
      } | null;
    };
  };
};

type ProgresionGrado = {
  id_progresion?: number;
  id_colegio: number;
  id_grado_origen: number;
  id_grado_destino?: number | null;
  es_terminal?: boolean;
  estado?: string;
  tipo_transicion?: string;
  grado_origen?: {
    id_grado: number;
    nombre_grado: string;
  } | null;
  grado_destino?: {
    id_grado: number;
    nombre_grado: string;
    nivel?: {
      nombre_nivel?: string;
    } | null;
  } | null;
};

type ResultadoVistaPrevia = {
  message?: string;
  resumen?: {
    total?: number;
    listos?: number;
    bloqueados?: number;
    omitidos?: number;
    promover?: number;
    permanecer?: number;
    egresos?: number;
    ya_existentes?: number;
  };
  lote?: any;
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-300 '
  + 'bg-white px-3 text-sm font-semibold text-slate-800 '
  + 'outline-none transition focus:border-blue-500 '
  + 'focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed '
  + 'disabled:bg-slate-100 disabled:text-slate-400';

const etiquetaClass =
  'mb-2 block text-[11px] font-black uppercase '
  + 'tracking-[0.14em] text-slate-500';

const crearQuery = (
  base: string,
  values: Record<string, string | number | undefined>,
) => {
  const search =
    new URLSearchParams(
      base.replace(/^\?/, ''),
    );

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value !== undefined
        && value !== ''
      ) {
        search.set(
          key,
          String(value),
        );
      }
    },
  );

  const result = search.toString();

  return result
    ? `?${result}`
    : '';
};

const fechaInicio = (
  anio?: AnioLectivo | null,
) => {
  if (!anio?.fecha_inicio) return 0;

  const date =
    new Date(anio.fecha_inicio);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
};

const nombreSeccion = (
  item?: SeccionAnio | null,
) => {
  if (!item) return '—';

  const nivel =
    item.seccion.grado.nivel
      ?.nombre_nivel;

  return [
    nivel,
    item.seccion.grado.nombre_grado,
    `Sección ${item.seccion.letra}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

const nombreAlumno = (
  detalle: any,
) => {
  const persona =
    detalle?.estudiante?.persona;

  return [
    persona?.nombres,
    persona?.apellido_paterno,
    persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    || `Estudiante ${detalle?.id_estudiante || '—'}`;
};

const tonoResultado = (
  estado?: string,
) => {
  if (estado === 'LISTO') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (estado === 'BLOQUEADO') {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const construirResumenLote = (
  lote: any,
) => {
  const resumenSnapshot =
    lote?.snapshot_json?.resumen;

  if (
    resumenSnapshot
    && typeof resumenSnapshot === 'object'
  ) {
    return resumenSnapshot;
  }

  const detalles =
    Array.isArray(lote?.detalles)
      ? lote.detalles
      : [];

  return {
    total:
      detalles.length,

    listos:
      detalles.filter(
        (item: any) =>
          item.estado_resultado
          === 'LISTO',
      ).length,

    bloqueados:
      detalles.filter(
        (item: any) =>
          item.estado_resultado
          === 'BLOQUEADO',
      ).length,

    omitidos:
      detalles.filter(
        (item: any) =>
          item.estado_resultado
          === 'OMITIDO',
      ).length,

    promover:
      detalles.filter(
        (item: any) =>
          item.accion
          === 'PROMOVER',
      ).length,

    permanecer:
      detalles.filter(
        (item: any) =>
          item.accion
          === 'PERMANECER',
      ).length,

    egresos:
      detalles.filter(
        (item: any) =>
          item.accion
          === 'EGRESO',
      ).length,

    ya_existentes:
      detalles.filter(
        (item: any) =>
          item.accion
          === 'YA_EXISTE',
      ).length,
  };
};

export default function PromocionMasivaPage() {
  const {
    token,
    user,
  } = useAuth();

  const {
    queryString,
    scopeLabel,
    puedeVerConsolidado,
  } = useSchool();

  const { showToast } =
    useToast();

  const autorizado =
    [
      'Admin',
      'Director',
    ].includes(
      user?.rol || '',
    );

  const queryAcceso =
    puedeVerConsolidado
      ? '?scope=all'
      : queryString;

  const storageKey =
    useMemo(
      () =>
        'erp.promocionMasiva.ultimoLote:'
        + encodeURIComponent(
          queryAcceso || 'default',
        ),
      [
        queryAcceso,
      ],
    );

  const [
    anios,
    setAnios,
  ] = useState<AnioLectivo[]>([]);

  const [
    progresiones,
    setProgresiones,
  ] = useState<ProgresionGrado[]>([]);

  const [
    seccionesOrigen,
    setSeccionesOrigen,
  ] = useState<SeccionAnio[]>([]);

  const [
    seccionesDestino,
    setSeccionesDestino,
  ] = useState<SeccionAnio[]>([]);

  const [
    idAnioOrigen,
    setIdAnioOrigen,
  ] = useState<number | ''>('');

  const [
    idAnioDestino,
    setIdAnioDestino,
  ] = useState<number | ''>('');

  const [
    idSeccionOrigen,
    setIdSeccionOrigen,
  ] = useState<number | ''>('');

  const [
    idSeccionPromovidos,
    setIdSeccionPromovidos,
  ] = useState<number | ''>('');

  const [
    idSeccionPermanencia,
    setIdSeccionPermanencia,
  ] = useState<number | ''>('');

  const [
    estadoDestino,
    setEstadoDestino,
  ] = useState<
    'Reserva' | 'Pre-matriculado'
  >('Reserva');

  const [
    observacion,
    setObservacion,
  ] = useState('');

  const [
    loadingBase,
    setLoadingBase,
  ] = useState(false);

  const [
    loadingOrigen,
    setLoadingOrigen,
  ] = useState(false);

  const [
    loadingDestino,
    setLoadingDestino,
  ] = useState(false);

  const [
    generando,
    setGenerando,
  ] = useState(false);

  const [
    loadingLote,
    setLoadingLote,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState<string | null>(null);

  const [
    resultado,
    setResultado,
  ] = useState<ResultadoVistaPrevia | null>(
    null,
  );

  const anioOrigen =
    useMemo(
      () =>
        anios.find(
          (item) =>
            item.id_anio
            === idAnioOrigen,
        ) || null,
      [
        anios,
        idAnioOrigen,
      ],
    );

  const aniosDestino =
    useMemo(() => {
      if (!anioOrigen) return [];

      return anios
        .filter(
          (item) =>
            item.id_anio
              !== anioOrigen.id_anio
            && Number(item.id_colegio)
              === Number(
                anioOrigen.id_colegio,
              )
            && fechaInicio(item)
              > fechaInicio(anioOrigen),
        )
        .sort(
          (a, b) =>
            fechaInicio(a)
            - fechaInicio(b),
        );
    }, [
      anioOrigen,
      anios,
    ]);

  const seccionOrigen =
    useMemo(
      () =>
        seccionesOrigen.find(
          (item) =>
            item.id_seccion
            === idSeccionOrigen,
        ) || null,
      [
        idSeccionOrigen,
        seccionesOrigen,
      ],
    );

  const idGradoOrigen =
    seccionOrigen
      ?.seccion.id_grado
    || null;

  const progresion =
    useMemo(() => {
      if (
        !idGradoOrigen
        || !anioOrigen?.id_colegio
      ) {
        return null;
      }

      return progresiones.find(
        (item) =>
          item.id_grado_origen
            === idGradoOrigen
          && item.id_colegio
            === Number(
              anioOrigen.id_colegio,
            )
          && item.estado
            !== 'Inactivo',
      ) || null;
    }, [
      anioOrigen,
      idGradoOrigen,
      progresiones,
    ]);

  const esTerminal =
    Boolean(
      progresion?.es_terminal,
    )
    || progresion
      ?.tipo_transicion === 'Egreso';

  const idGradoPromovido =
    esTerminal
      ? null
      : progresion
        ?.id_grado_destino
        || null;

  const seccionesPromovidos =
    useMemo(
      () =>
        idGradoPromovido
          ? seccionesDestino.filter(
              (item) =>
                item.seccion.id_grado
                === idGradoPromovido,
            )
          : [],
      [
        idGradoPromovido,
        seccionesDestino,
      ],
    );

  const seccionesPermanencia =
    useMemo(
      () =>
        idGradoOrigen
          ? seccionesDestino.filter(
              (item) =>
                item.seccion.id_grado
                === idGradoOrigen,
            )
          : [],
      [
        idGradoOrigen,
        seccionesDestino,
      ],
    );

  useEffect(() => {
    if (
      !token
      || !autorizado
    ) {
      return;
    }

    let cancelled = false;

    const cargarBase = async () => {
      setLoadingBase(true);
      setMensaje(null);

      try {
        const [
          aniosResponse,
          progresionesResponse,
        ] = await Promise.all([
          axios.get(
            `/api/academicos/anios${queryAcceso}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          ),

          axios.get(
            `/api/academicos/progresiones-grado${queryAcceso}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          ),
        ]);

        if (cancelled) return;

        const aniosData =
          Array.isArray(aniosResponse.data)
            ? aniosResponse.data
            : aniosResponse.data?.data
              || [];

        const progresionesData =
          Array.isArray(
            progresionesResponse.data,
          )
            ? progresionesResponse.data
            : progresionesResponse.data
              ?.data
              || [];

        setAnios(
          [...aniosData].sort(
            (a, b) =>
              fechaInicio(a)
              - fechaInicio(b),
          ),
        );

        setProgresiones(
          progresionesData,
        );
      } catch (error: any) {
        if (cancelled) return;

        setAnios([]);
        setProgresiones([]);

        setMensaje(
          error.response?.data?.message
          || 'No se pudieron cargar '
            + 'los datos de promoción.',
        );
      } finally {
        if (!cancelled) {
          setLoadingBase(false);
        }
      }
    };

    void cargarBase();

    return () => {
      cancelled = true;
    };
  }, [
    autorizado,
    queryAcceso,
    token,
  ]);

  useEffect(() => {
    if (
      !token
      || !autorizado
    ) {
      return;
    }

    const storedValue =
      window.localStorage.getItem(
        storageKey,
      );

    const idLote =
      Number(storedValue || 0);

    if (
      !Number.isInteger(idLote)
      || idLote <= 0
    ) {
      if (storedValue) {
        window.localStorage.removeItem(
          storageKey,
        );
      }

      return;
    }

    let cancelled = false;

    const cargarUltimoLote =
      async () => {
        setLoadingLote(true);

        try {
          const response =
            await axios.get(
              `/api/academicos/lotes-promocion/${idLote}${queryAcceso}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          if (cancelled) return;

          const loteRecuperado =
            response.data;

          setResultado({
            message:
              `Lote #${idLote} recuperado `
              + 'desde el último trabajo.',

            resumen:
              construirResumenLote(
                loteRecuperado,
              ),

            lote:
              loteRecuperado,
          });
        } catch (error: any) {
          if (cancelled) return;

          const status =
            error.response?.status;

          if (
            status === 403
            || status === 404
          ) {
            window.localStorage
              .removeItem(storageKey);
          } else {
            setMensaje(
              'No se pudo recuperar '
              + 'el último lote trabajado.',
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingLote(false);
          }
        }
      };

    void cargarUltimoLote();

    return () => {
      cancelled = true;
    };
  }, [
    autorizado,
    queryAcceso,
    storageKey,
    token,
  ]);

  useEffect(() => {
    setIdAnioDestino('');
    setIdSeccionOrigen('');
    setIdSeccionPromovidos('');
    setIdSeccionPermanencia('');
    setSeccionesOrigen([]);
    setSeccionesDestino([]);
    setResultado(null);

    if (
      !token
      || !idAnioOrigen
    ) {
      return;
    }

    let cancelled = false;

    const cargarOrigen = async () => {
      setLoadingOrigen(true);
      setMensaje(null);

      try {
        const query =
          crearQuery(
            queryAcceso,
            {
              anio_id:
                idAnioOrigen,
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

        if (!cancelled) {
          setSeccionesOrigen(
            response.data?.data || [],
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          setSeccionesOrigen([]);

          setMensaje(
            error.response?.data?.message
            || 'No se pudieron cargar '
              + 'las secciones de origen.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOrigen(false);
        }
      }
    };

    void cargarOrigen();

    return () => {
      cancelled = true;
    };
  }, [
    idAnioOrigen,
    queryAcceso,
    token,
  ]);

  useEffect(() => {
    setIdSeccionPromovidos('');
    setIdSeccionPermanencia('');
    setSeccionesDestino([]);
    setResultado(null);

    if (
      !token
      || !idAnioDestino
    ) {
      return;
    }

    let cancelled = false;

    const cargarDestino = async () => {
      setLoadingDestino(true);
      setMensaje(null);

      try {
        const query =
          crearQuery(
            queryAcceso,
            {
              anio_id:
                idAnioDestino,
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

        if (!cancelled) {
          setSeccionesDestino(
            response.data?.data || [],
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          setSeccionesDestino([]);

          setMensaje(
            error.response?.data?.message
            || 'No se pudieron cargar '
              + 'las secciones de destino.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDestino(false);
        }
      }
    };

    void cargarDestino();

    return () => {
      cancelled = true;
    };
  }, [
    idAnioDestino,
    queryAcceso,
    token,
  ]);

  useEffect(() => {
    setIdSeccionPromovidos('');
    setIdSeccionPermanencia('');
    setResultado(null);
  }, [
    idSeccionOrigen,
  ]);

  const generarVistaPrevia =
    async () => {
      if (
        !token
        || !idAnioOrigen
        || !idAnioDestino
        || !seccionOrigen
      ) {
        setMensaje(
          'Completa el año y la '
          + 'sección de origen y destino.',
        );

        return;
      }

      if (!progresion) {
        setMensaje(
          'El grado de origen no tiene '
          + 'una progresión configurada.',
        );

        return;
      }

      if (
        !esTerminal
        && (
          !idGradoPromovido
          || !idSeccionPromovidos
        )
      ) {
        setMensaje(
          'Selecciona la sección de '
          + 'destino para los promovidos.',
        );

        return;
      }

      const destinos: {
        id_grado_destino: number;
        id_seccion_destino: number;
      }[] = [];

      if (
        idGradoOrigen
        && idSeccionPermanencia
      ) {
        destinos.push({
          id_grado_destino:
            idGradoOrigen,

          id_seccion_destino:
            Number(
              idSeccionPermanencia,
            ),
        });
      }

      if (
        !esTerminal
        && idGradoPromovido
      ) {
        destinos.push({
          id_grado_destino:
            idGradoPromovido,

          id_seccion_destino:
            Number(
              idSeccionPromovidos,
            ),
        });
      }

      setGenerando(true);
      setMensaje(null);
      setResultado(null);

      try {
        const response =
          await axios.post(
            `/api/academicos/lotes-promocion/vista-previa${queryAcceso}`,
            {
              id_anio_origen:
                Number(idAnioOrigen),

              id_anio_destino:
                Number(idAnioDestino),

              id_seccion_origen:
                seccionOrigen.id_seccion,

              estado_matricula_destino:
                estadoDestino,

              destinos,

              observacion:
                observacion.trim()
                || undefined,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        setResultado(
          response.data,
        );

        const idLoteGenerado =
          Number(
            response.data
              ?.lote
              ?.id_lote
            || 0,
          );

        if (
          Number.isInteger(
            idLoteGenerado,
          )
          && idLoteGenerado > 0
        ) {
          window.localStorage.setItem(
            storageKey,
            String(idLoteGenerado),
          );
        }

        showToast({
          type:
            response.data?.resumen
              ?.bloqueados > 0
              ? 'warning'
              : 'success',

          title:
            'Vista previa generada',

          message:
            response.data?.message
            || 'El lote fue calculado.',
        });
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message
          || 'No se pudo generar '
            + 'la vista previa.';

        setMensaje(errorMessage);

        showToast({
          type: 'error',
          title:
            'No se pudo calcular',
          message:
            errorMessage,
        });
      } finally {
        setGenerando(false);
      }
    };

  const limpiar = () => {
    window.localStorage.removeItem(
      storageKey,
    );

    setIdAnioOrigen('');
    setIdAnioDestino('');
    setIdSeccionOrigen('');
    setIdSeccionPromovidos('');
    setIdSeccionPermanencia('');
    setEstadoDestino('Reserva');
    setObservacion('');
    setSeccionesOrigen([]);
    setSeccionesDestino([]);
    setResultado(null);
    setMensaje(null);
  };

  const resumen =
    resultado?.resumen;

  const lote =
    resultado?.lote;

  const detalles =
    Array.isArray(lote?.detalles)
      ? lote.detalles
      : [];

  return (
    <div className="w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Matrícula"
        title="Promoción masiva"
        description="Prepara el traslado anual de una sección completa con validación académica, control de cupos y trazabilidad por estudiante."
        icon={GraduationCap}
        meta={[
          {
            label:
              'Contexto activo',
            value:
              scopeLabel,
          },
          {
            label:
              'Proceso',
            value:
              'Promoción anual',
          },
        ]}
      />

      {!autorizado ? (
        <section className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle
            size={21}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>
            <h2 className="font-black text-amber-900">
              Acceso restringido
            </h2>

            <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
              La preparación y ejecución de promociones
              masivas requiere el rol de Administración
              o Dirección.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                  Configuración del lote
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Origen y destino académico
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Solo se muestran secciones habilitadas
                  para cada año lectivo.
                </p>
              </div>

              <button
                type="button"
                onClick={limpiar}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCcw size={15} />
                Limpiar
              </button>
            </div>

            {mensaje && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0"
                />
                <span>{mensaje}</span>
              </div>
            )}

            {loadingBase ? (
              <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-bold text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Cargando configuración académica…
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <Users size={17} />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Grupo de origen
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Año y sección que serán evaluados.
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className={etiquetaClass}>
                      Año lectivo de origen
                    </span>

                    <select
                      value={idAnioOrigen}
                      onChange={(event) =>
                        setIdAnioOrigen(
                          event.target.value
                            ? Number(
                                event.target.value,
                              )
                            : '',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Seleccionar año
                      </option>

                      {anios.map((anio) => (
                        <option
                          key={anio.id_anio}
                          value={anio.id_anio}
                        >
                          {anio.nombre_anio}
                          {anio.colegio?.nombre_corto
                            ? ` · ${anio.colegio.nombre_corto}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={etiquetaClass}>
                      Sección de origen
                    </span>

                    <select
                      value={idSeccionOrigen}
                      disabled={
                        !idAnioOrigen
                        || loadingOrigen
                      }
                      onChange={(event) =>
                        setIdSeccionOrigen(
                          event.target.value
                            ? Number(
                                event.target.value,
                              )
                            : '',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        {loadingOrigen
                          ? 'Cargando secciones…'
                          : 'Seleccionar sección'}
                      </option>

                      {seccionesOrigen.map(
                        (item) => (
                          <option
                            key={
                              item.id_seccion_anio
                            }
                            value={
                              item.id_seccion
                            }
                          >
                            {nombreSeccion(item)}
                            {' · '}
                            {item.ocupados} alumno(s)
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {seccionOrigen && (
                    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                      <p className="text-xs font-black text-slate-900">
                        {nombreSeccion(seccionOrigen)}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {seccionOrigen.ocupados} alumno(s) activos
                        · capacidad{' '}
                        {seccionOrigen.capacidad_efectiva}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <ArrowRight size={17} />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Destino del lote
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Año futuro y secciones receptoras.
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className={etiquetaClass}>
                      Año lectivo de destino
                    </span>

                    <select
                      value={idAnioDestino}
                      disabled={!anioOrigen}
                      onChange={(event) =>
                        setIdAnioDestino(
                          event.target.value
                            ? Number(
                                event.target.value,
                              )
                            : '',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Seleccionar año futuro
                      </option>

                      {aniosDestino.map(
                        (anio) => (
                          <option
                            key={anio.id_anio}
                            value={anio.id_anio}
                          >
                            {anio.nombre_anio}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {seccionOrigen && (
                    <div className="rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
                        Progresión configurada
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        {progresion
                          ? esTerminal
                            ? `${seccionOrigen.seccion.grado.nombre_grado} → Egreso`
                            : `${seccionOrigen.seccion.grado.nombre_grado} → ${progresion.grado_destino?.nombre_grado || 'Siguiente grado'}`
                          : 'Sin progresión configurada'}
                      </p>
                    </div>
                  )}

                  {!esTerminal && (
                    <label className="block">
                      <span className={etiquetaClass}>
                        Sección para promovidos
                      </span>

                      <select
                        value={
                          idSeccionPromovidos
                        }
                        disabled={
                          !idAnioDestino
                          || loadingDestino
                          || !idGradoPromovido
                        }
                        onChange={(event) =>
                          setIdSeccionPromovidos(
                            event.target.value
                              ? Number(
                                  event.target.value,
                                )
                              : '',
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          {loadingDestino
                            ? 'Cargando secciones…'
                            : 'Seleccionar sección'}
                        </option>

                        {seccionesPromovidos.map(
                          (item) => (
                            <option
                              key={
                                item.id_seccion_anio
                              }
                              value={
                                item.id_seccion
                              }
                            >
                              {nombreSeccion(item)}
                              {' · '}
                              {item.disponibles} cupo(s)
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}

                  <label className="block">
                    <span className={etiquetaClass}>
                      Sección para permanencia (opcional)
                    </span>

                    <select
                      value={
                        idSeccionPermanencia
                      }
                      disabled={
                        !idAnioDestino
                        || loadingDestino
                        || !idGradoOrigen
                      }
                      onChange={(event) =>
                        setIdSeccionPermanencia(
                          event.target.value
                            ? Number(
                                event.target.value,
                              )
                            : '',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        {loadingDestino
                          ? 'Cargando secciones…'
                          : 'Seleccionar si corresponde'}
                      </option>

                      {seccionesPermanencia.map(
                        (item) => (
                          <option
                            key={
                              item.id_seccion_anio
                            }
                            value={
                              item.id_seccion
                            }
                          >
                            {nombreSeccion(item)}
                            {' · '}
                            {item.disponibles} cupo(s)
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className={etiquetaClass}>
                      Estado administrativo de destino
                    </span>

                    <select
                      value={estadoDestino}
                      onChange={(event) =>
                        setEstadoDestino(
                          event.target.value as
                            | 'Reserva'
                            | 'Pre-matriculado',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="Reserva">
                        Reserva
                      </option>

                      <option value="Pre-matriculado">
                        Pre-matriculado
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className={etiquetaClass}>
                      Observación del lote
                    </span>

                    <input
                      value={observacion}
                      maxLength={500}
                      placeholder="Observación opcional"
                      onChange={(event) =>
                        setObservacion(
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="lg:col-span-2 flex justify-end">
                  <button
                    type="button"
                    disabled={
                      generando
                      || loadingOrigen
                      || loadingDestino
                    }
                    onClick={() =>
                      void generarVistaPrevia()
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {generando ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <ShieldCheck size={16} />
                    )}

                    Generar vista previa
                  </button>
                </div>
              </div>
            )}
          </section>

          {loadingLote && !resultado && (
            <section className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
              <Loader2
                size={18}
                className="animate-spin"
              />

              Recuperando el último lote trabajado…
            </section>
          )}

          {resultado && (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                  Resultado del cálculo
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Lote #{lote?.id_lote || '—'}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {resultado.message}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Total',
                    value: resumen?.total || 0,
                  },
                  {
                    label: 'Listos',
                    value: resumen?.listos || 0,
                  },
                  {
                    label: 'Bloqueados',
                    value: resumen?.bloqueados || 0,
                  },
                  {
                    label: 'Omitidos',
                    value: resumen?.omitidos || 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      {item.label}
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          'Alumno',
                          'Situación',
                          'Continuidad',
                          'Acción',
                          'Resultado',
                          'Observación',
                        ].map((label) => (
                          <th
                            key={label}
                            className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-500"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {detalles.map(
                        (detalle: any) => (
                          <tr
                            key={
                              detalle.id_detalle
                            }
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-900">
                              {nombreAlumno(
                                detalle,
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                              {detalle.situacion_final}
                            </td>

                            <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                              {detalle.continuidad}
                            </td>

                            <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                              {detalle.accion}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={
                                  'inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 '
                                  + tonoResultado(
                                    detalle.estado_resultado,
                                  )
                                }
                              >
                                {detalle.estado_resultado}
                              </span>
                            </td>

                            <td className="min-w-72 px-4 py-3 text-sm font-medium text-slate-500">
                              {detalle.snapshot_json
                                ?.motivo
                                || '—'}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                {detalles.length === 0 && (
                  <div className="p-8 text-center text-sm font-semibold text-slate-500">
                    El lote no contiene estudiantes.
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <p className="text-sm font-semibold leading-6 text-blue-800">
                  Esta es solo una vista previa. Todavía
                  no se ha creado ninguna matrícula en
                  el año de destino.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
