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
  History,
  Loader2,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import AccessibleDialog from '../../components/AccessibleDialog';
import HistorialPromocionPanel from './HistorialPromocionPanel';
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

type ResumenPromocion = {
  total?: number;
  listos?: number;
  bloqueados?: number;
  omitidos?: number;
  promover?: number;
  permanecer?: number;
  egresos?: number;
  ya_existentes?: number;
};

type PersonaPromocion = {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
};

type UsuarioPromocion = {
  id_usuario?: number;
  username?: string | null;
  usuario?: string | null;
  nombre_usuario?: string | null;
  email?: string | null;
  correo?: string | null;
  persona?: PersonaPromocion | null;
};

type DetallePromocion = {
  id_detalle?: number;
  id_estudiante?: number;
  id_matricula_origen?: number | null;
  id_matricula_generada?: number | null;
  situacion_final?: string | null;
  continuidad?: string | null;
  accion?: string | null;
  estado_resultado?: string | null;
  snapshot_json?: {
    motivo?: string | null;
    [key: string]: unknown;
  } | null;
  estudiante?: {
    persona?: PersonaPromocion | null;
  } | null;
};

type DetalleEjecucionPromocion = {
  id_ejecucion_detalle?: number;
  id_detalle?: number;
  estado_resultado?: string | null;
};

type EjecucionPromocion = {
  id_ejecucion: number;
  numero_ejecucion?: number;
  etapa?: string | null;
  estado?: string | null;
  fecha_ejecucion?: string | null;
  fecha_reversion?: string | null;
  procesados?: number | null;
  pendientes?: number | null;
  total_detalles?: number | null;
  total_procesados?: number | null;
  total_pendientes?: number | null;
  secciones_actualizadas?: number | null;
  ejecutado_por?: UsuarioPromocion | null;
  revertido_por?: UsuarioPromocion | null;
  detalles?: DetalleEjecucionPromocion[];
  snapshot_json?: {
    resumen?: ResumenPromocion;
    [key: string]: unknown;
  } | null;
};

type LotePromocion = {
  id_lote?: number;
  estado?: string | null;
  estado_matricula_destino?: string | null;
  fecha_ejecucion?: string | null;
  fecha_reversion?: string | null;

  colegio?: {
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;

  anio_origen?: {
    nombre_anio?: string | null;
  } | null;

  anio_destino?: {
    nombre_anio?: string | null;
  } | null;

  seccion_origen?: {
    letra?: string | null;

    grado?: {
      nombre_grado?: string | null;

      nivel?: {
        nombre_nivel?: string | null;
      } | null;
    } | null;
  } | null;
  ejecutado_por?: UsuarioPromocion | null;
  revertido_por?: UsuarioPromocion | null;
  detalles?: DetallePromocion[];
  ejecuciones?: EjecucionPromocion[];
  snapshot_json?: {
    resumen?: ResumenPromocion;
    [key: string]: unknown;
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
    procesados?: number;
    pendientes?: number;
    revertidos?: number;
  };
  lote?: any;
};

type BloqueoReversion = {
  codigo?: string;
  mensaje?: string;
  id_detalle?: number;
};

type ValidacionReversion = {
  reversible: boolean;
  resumen?: {
    total_detalles?: number;
    procesados?: number;
    detalles_con_bloqueo?: number;
    total_bloqueos?: number;
  };
  lote?: LotePromocion;
  bloqueos?: BloqueoReversion[];
};

type OperacionLote =
  | 'ejecutar'
  | 'revertir'
  | null;

const mensajeErrorApi = (
  error: unknown,
) => {
  if (
    !axios.isAxiosError<{
      message?: unknown;
    }>(error)
  ) {
    return null;
  }

  const message =
    error.response?.data?.message;

  return (
    typeof message === 'string'
    && message.trim()
  )
    ? message
    : null;
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

  if (estado === 'PROCESADO') {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }

  if (
    String(estado || '')
      .startsWith('PENDIENTE')
  ) {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  if (estado === 'BLOQUEADO') {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  if (estado === 'REVERTIDO') {
    return 'bg-slate-200 text-slate-700 ring-slate-300';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const tonoEstadoLote = (
  estado?: string,
) => {
  if (estado === 'Vista previa') {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }

  if (
    estado === 'Ejecutado'
    || estado === 'En proceso'
    || estado === 'Finalizado'
  ) {
    return 'bg-blue-50 text-blue-800 ring-blue-200';
  }

  if (estado === 'Revertido') {
    return 'bg-slate-200 text-slate-700 ring-slate-300';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const formatearFechaHora = (
  value?: string | Date | null,
) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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
  usuario?: UsuarioPromocion | null,
) => {
  const persona = usuario?.persona;

  return [
    persona?.nombres,
    persona?.apellido_paterno,
    persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    || usuario?.username
    || 'Usuario no disponible';
};

const construirResumenLote = (
  lote: LotePromocion | null | undefined,
) => {
  const resumenSnapshot =
    lote?.snapshot_json?.resumen;

  const detalles =
    Array.isArray(lote?.detalles)
      ? lote.detalles
      : [];

  const contar = (
    estado: string,
  ) =>
    detalles.filter(
      (item: DetallePromocion) =>
        item.estado_resultado
        === estado,
    ).length;

  return {
    ...(
      resumenSnapshot
      && typeof resumenSnapshot === 'object'
        ? resumenSnapshot
        : {}
    ),

    total:
      detalles.length,

    listos:
      contar('LISTO'),

    bloqueados:
      contar('BLOQUEADO'),

    omitidos:
      contar('OMITIDO'),

    procesados:
      contar('PROCESADO'),

    pendientes:
      detalles.filter(
        (item: any) =>
          String(
            item.estado_resultado || '',
          ).startsWith('PENDIENTE'),
      ).length,

    revertidos:
      contar('REVERTIDO'),

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
    colegios,
    activeScope,
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
    idNivelOrigenFiltro,
    setIdNivelOrigenFiltro,
  ] = useState<number | ''>('');

  const [
    idGradoOrigenFiltro,
    setIdGradoOrigenFiltro,
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
    mostrarDetalleActivo,
    setMostrarDetalleActivo,
  ] = useState(false);

  const [
    historialVersion,
    setHistorialVersion,
  ] = useState(0);

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

  const [
    operacionModal,
    setOperacionModal,
  ] = useState<OperacionLote>(null);

  const [
    confirmacionOperacion,
    setConfirmacionOperacion,
  ] = useState('');

  const [
    motivoReversion,
    setMotivoReversion,
  ] = useState('');

  const [
    operando,
    setOperando,
  ] = useState(false);

  const [
    validandoReversion,
    setValidandoReversion,
  ] = useState(false);

  const [
    validacionReversion,
    setValidacionReversion,
  ] = useState<ValidacionReversion | null>(
    null,
  );

  const aniosEnriquecidos =
    useMemo<AnioLectivo[]>(
      () =>
        anios.map((anio) => {
          const idColegio =
            Number(
              anio.id_colegio
              || anio.colegio
                ?.id_colegio
              || 0,
            );

          const colegioContexto =
            colegios.find(
              (colegio) =>
                Number(
                  colegio.id_colegio,
                )
                === idColegio,
            );

          const tieneNombre =
            Boolean(
              anio.colegio?.nombre
              || anio.colegio
                ?.nombre_corto,
            );

          if (
            tieneNombre
            || !colegioContexto
          ) {
            return anio;
          }

          return {
            ...anio,

            id_colegio:
              idColegio
              || anio.id_colegio,

            colegio: {
              id_colegio:
                colegioContexto
                  .id_colegio,

              nombre:
                colegioContexto
                  .nombre,

              nombre_corto:
                colegioContexto
                  .nombre_corto,
            },
          };
        }),
      [
        anios,
        colegios,
      ],
    );


  const anioOrigen =
    useMemo(
      () =>
        aniosEnriquecidos.find(
          (item) =>
            item.id_anio
            === idAnioOrigen,
        ) || null,
      [
        aniosEnriquecidos,
        idAnioOrigen,
      ],
    );

  const aniosDestino =
    useMemo(() => {
      if (!anioOrigen) return [];

      return aniosEnriquecidos
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
      aniosEnriquecidos,
    ]);

  const seccionesOrigenConAlumnos =
    useMemo(
      () =>
        seccionesOrigen.filter(
          (item) =>
            Number(
              item.ocupados || 0,
            ) > 0,
        ),
      [
        seccionesOrigen,
      ],
    );

  const nivelesOrigen =
    useMemo(() => {
      const niveles =
        new Map<
          number,
          string
        >();

      for (
        const item
        of seccionesOrigen
      ) {
        const nivel =
          item.seccion.grado.nivel;

        if (nivel?.id_nivel) {
          niveles.set(
            nivel.id_nivel,
            nivel.nombre_nivel,
          );
        }
      }

      return Array.from(
        niveles.entries(),
      )
        .map(
          ([
            id_nivel,
            nombre_nivel,
          ]) => ({
            id_nivel,
            nombre_nivel,
          }),
        )
        .sort(
          (a, b) =>
            a.nombre_nivel.localeCompare(
              b.nombre_nivel,
              'es',
            ),
        );
    }, [
      seccionesOrigen,
    ]);

  const gradosOrigenFiltro =
    useMemo(() => {
      const grados =
        new Map<
          number,
          string
        >();

      for (
        const item
        of seccionesOrigen
      ) {
        const grado =
          item.seccion.grado;

        if (
          idNivelOrigenFiltro
          && grado.nivel?.id_nivel
            !== idNivelOrigenFiltro
        ) {
          continue;
        }

        grados.set(
          grado.id_grado,
          grado.nombre_grado,
        );
      }

      return Array.from(
        grados.entries(),
      )
        .map(
          ([
            id_grado,
            nombre_grado,
          ]) => ({
            id_grado,
            nombre_grado,
          }),
        );
    }, [
      idNivelOrigenFiltro,
      seccionesOrigen,
    ]);

  const seccionesOrigenFiltro =
    useMemo(
      () =>
        seccionesOrigen.filter(
          (item) =>
            (
              !idNivelOrigenFiltro
              || item.seccion.grado
                .nivel?.id_nivel
                === idNivelOrigenFiltro
            )
            && (
              !idGradoOrigenFiltro
              || item.seccion.id_grado
                === idGradoOrigenFiltro
            ),
        ),
      [
        idGradoOrigenFiltro,
        idNivelOrigenFiltro,
        seccionesOrigen,
      ],
    );

  const nombreColegioOrigen =
    anioOrigen?.colegio?.nombre
    || anioOrigen?.colegio
      ?.nombre_corto
    || null;


  const mostrarColegioEnAnio =
    activeScope.tipo === 'todos';

  const etiquetaAnioPromocion = (
    anio: AnioLectivo,
  ) => {
    const nombreColegio =
      anio.colegio?.nombre
      || anio.colegio
        ?.nombre_corto
      || '';

    if (
      !mostrarColegioEnAnio
      || !nombreColegio
    ) {
      return anio.nombre_anio;
    }

    return (
      `${anio.nombre_anio}`
      + ` · ${nombreColegio}`
    );
  };


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
              `Proceso N.° ${idLote} recuperado `
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

        setMostrarDetalleActivo(true);

        setHistorialVersion(
          (value) =>
            value + 1,
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

  const cargarLoteActualizado =
    async (
      idLote: number,
      message?: string,
    ) => {
      if (!token) {
        throw new Error(
          'La sesión ya no está disponible.',
        );
      }

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

      const loteActualizado =
        response.data;

      setResultado({
        message:
          message
          || `Proceso N.° ${idLote} actualizado.`,

        resumen:
          construirResumenLote(
            loteActualizado,
          ),

        lote:
          loteActualizado,
      });

      setMostrarDetalleActivo(true);

      setHistorialVersion(
        (value) =>
          value + 1,
      );

      return loteActualizado;
    };

  const cerrarOperacion = () => {
    if (operando || validandoReversion) return;

    setOperacionModal(null);
    setConfirmacionOperacion('');
    setMotivoReversion('');
    setValidacionReversion(null);
    setValidandoReversion(false);
  };

  const abrirEjecucion = () => {
    setMensaje(null);
    setConfirmacionOperacion('');
    setMotivoReversion('');
    setValidacionReversion(null);
    setOperacionModal('ejecutar');
  };

  const abrirReversion =
    async () => {
      const idLote =
        Number(
          resultado?.lote?.id_lote
          || 0,
        );

      if (
        !token
        || !Number.isInteger(idLote)
        || idLote <= 0
      ) {
        setMensaje(
          'No se pudo identificar el lote.',
        );
        return;
      }

      setMensaje(null);
      setConfirmacionOperacion('');
      setMotivoReversion('');
      setValidacionReversion(null);
      setOperacionModal('revertir');
      setValidandoReversion(true);

      try {
        const response =
          await axios.get(
            `/api/academicos/lotes-promocion/${idLote}/reversion/validar${queryAcceso}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        setValidacionReversion(
          response.data,
        );
      } catch (error: unknown) {
        const errorMessage =
          mensajeErrorApi(error)
          || 'No se pudo validar '
            + 'la reversión del lote.';

        setValidacionReversion({
          reversible: false,
          bloqueos: [
            {
              codigo:
                'VALIDACION_NO_DISPONIBLE',
              mensaje:
                errorMessage,
            },
          ],
        });

        showToast({
          type: 'error',
          title:
            'Validación no disponible',
          message:
            errorMessage,
        });
      } finally {
        setValidandoReversion(false);
      }
    };

  const ejecutarLote =
    async () => {
      const idLote =
        Number(
          resultado?.lote?.id_lote
          || 0,
        );

      if (
        !token
        || !Number.isInteger(idLote)
        || idLote <= 0
      ) {
        setMensaje(
          'No se pudo identificar el lote.',
        );
        return;
      }

      if (
        confirmacionOperacion
          .trim()
          .toUpperCase()
        !== 'EJECUTAR'
      ) {
        return;
      }

      setOperando(true);
      setMensaje(null);

      try {
        const response =
          await axios.post(
            `/api/academicos/lotes-promocion/${idLote}/ejecutar${queryAcceso}`,
            {
              confirmacion:
                'EJECUTAR',
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        await cargarLoteActualizado(
          idLote,
          response.data?.message
          || 'La promoción fue ejecutada.',
        );

        setOperacionModal(null);
        setConfirmacionOperacion('');

        showToast({
          type: 'success',
          title:
            'Promoción ejecutada',
          message:
            response.data?.message
            || 'Se generaron las matrículas '
              + 'del año de destino.',
        });
      } catch (error: unknown) {
        const errorMessage =
          mensajeErrorApi(error)
          || 'No se pudo ejecutar el lote.';

        setMensaje(errorMessage);

        showToast({
          type: 'error',
          title:
            'Ejecución no completada',
          message:
            errorMessage,
        });
      } finally {
        setOperando(false);
      }
    };

  const revertirLote =
    async () => {
      const idLote =
        Number(
          resultado?.lote?.id_lote
          || 0,
        );

      if (
        !token
        || !Number.isInteger(idLote)
        || idLote <= 0
        || !validacionReversion?.reversible
      ) {
        return;
      }

      if (
        confirmacionOperacion
          .trim()
          .toUpperCase()
        !== 'REVERTIR'
        || motivoReversion.trim().length < 5
      ) {
        return;
      }

      setOperando(true);
      setMensaje(null);

      try {
        const response =
          await axios.post(
            `/api/academicos/lotes-promocion/${idLote}/reversion${queryAcceso}`,
            {
              confirmacion:
                'REVERTIR',
              motivo:
                motivoReversion.trim(),
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        await cargarLoteActualizado(
          idLote,
          response.data?.message
          || 'La promoción fue revertida.',
        );

        setOperacionModal(null);
        setConfirmacionOperacion('');
        setMotivoReversion('');
        setValidacionReversion(null);

        showToast({
          type: 'success',
          title:
            'Promoción revertida',
          message:
            response.data?.message
            || 'Las matrículas originales '
              + 'fueron restauradas.',
        });
      } catch (error: unknown) {
        const errorMessage =
          mensajeErrorApi(error)
          || 'No se pudo revertir el lote.';

        setMensaje(errorMessage);

        showToast({
          type: 'error',
          title:
            'Reversión no completada',
          message:
            errorMessage,
        });
      } finally {
        setOperando(false);
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
    setMostrarDetalleActivo(false);
    setMensaje(null);
    setOperacionModal(null);
    setConfirmacionOperacion('');
    setMotivoReversion('');
    setValidacionReversion(null);
    setValidandoReversion(false);
  };

  const resumen =
    resultado?.resumen;

  const lote =
    resultado?.lote;

  const detalles =
    Array.isArray(lote?.detalles)
      ? lote.detalles
      : [];

  const ejecuciones =
    Array.isArray(lote?.ejecuciones)
      ? lote.ejecuciones
      : [];

  const estadoLote =
    String(lote?.estado || '');

  const puedeEjecutar =
    estadoLote === 'Vista previa'
    && Number(resumen?.listos || 0) > 0
    && Number(resumen?.bloqueados || 0) === 0;

  const puedeRevertir =
    [
      'Ejecutado',
      'En proceso',
      'Finalizado',
    ].includes(estadoLote);

  const bloqueosReversion =
    Array.isArray(
      validacionReversion?.bloqueos,
    )
      ? validacionReversion?.bloqueos || []
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
              'Ámbito de consulta',
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
                  Preparar promoción
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
              <div
                className="grid gap-5 lg:grid-cols-2"
                aria-busy="true"
                aria-label="Cargando configuración académica"
              >
                <span className="sr-only">
                  Cargando configuración académica…
                </span>

                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="erp-skeleton-block space-y-5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="erp-skeleton-circle" />

                      <div className="flex-1 space-y-2">
                        <div className="erp-skeleton-line w-36" />
                        <div className="erp-skeleton-line w-56 max-w-full" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="erp-skeleton-line w-32" />
                      <div className="erp-skeleton-control" />
                    </div>

                    <div className="space-y-2">
                      <div className="erp-skeleton-line w-40" />
                      <div className="erp-skeleton-control" />
                    </div>

                    {item === 1 && (
                      <div className="space-y-2">
                        <div className="erp-skeleton-line w-48" />
                        <div className="erp-skeleton-control" />
                      </div>
                    )}
                  </div>
                ))}

                <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
                  <div className="space-y-2">
                    <div className="erp-skeleton-line w-44" />
                    <div className="erp-skeleton-control" />
                  </div>

                  <div className="space-y-2">
                    <div className="erp-skeleton-line w-40" />
                    <div className="erp-skeleton-control" />
                  </div>
                </div>

                <div className="flex justify-end lg:col-span-2">
                  <div className="erp-skeleton-control w-44" />
                </div>
              </div>
            ) : (
              <div className="erp-content-ready grid gap-5 lg:grid-cols-2">
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
                      onChange={(event) => {
                        const value =
                          event.target.value
                            ? Number(
                                event.target.value,
                              )
                            : '';

                        setIdAnioOrigen(value);
                        setIdNivelOrigenFiltro('');
                        setIdGradoOrigenFiltro('');
                        setIdSeccionOrigen('');
                        setIdAnioDestino('');
                        setIdSeccionPromovidos('');
                        setIdSeccionPermanencia('');
                      }}
                      className={inputClass}
                    >
                      <option value="">
                        Seleccionar año
                      </option>

                      {aniosEnriquecidos.map(
                        (anio) => (
                          <option
                            key={anio.id_anio}
                            value={anio.id_anio}
                          >
                            {etiquetaAnioPromocion(
                              anio,
                            )}
                          </option>
                        ),
                      )}
                    </select>

                    {nombreColegioOrigen && (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
                          Institución seleccionada
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {nombreColegioOrigen}
                        </p>
                      </div>
                    )}
                  </label>

                  <div>
                    <span className={etiquetaClass}>
                      Grupo de origen
                    </span>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Nivel
                        </span>

                        <select
                          value={
                            idNivelOrigenFiltro
                          }
                          disabled={
                            !idAnioOrigen
                            || loadingOrigen
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value
                                ? Number(
                                    event.target.value,
                                  )
                                : '';

                            setIdNivelOrigenFiltro(
                              value,
                            );

                            setIdGradoOrigenFiltro('');
                            setIdSeccionOrigen('');
                          }}
                          className={inputClass}
                        >
                          <option value="">
                            {loadingOrigen
                              ? 'Cargando…'
                              : 'Seleccionar nivel'}
                          </option>

                          {nivelesOrigen.map(
                            (nivel) => (
                              <option
                                key={nivel.id_nivel}
                                value={nivel.id_nivel}
                              >
                                {nivel.nombre_nivel}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Grado
                        </span>

                        <select
                          value={
                            idGradoOrigenFiltro
                          }
                          disabled={
                            !idNivelOrigenFiltro
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value
                                ? Number(
                                    event.target.value,
                                  )
                                : '';

                            setIdGradoOrigenFiltro(
                              value,
                            );

                            setIdSeccionOrigen('');
                          }}
                          className={inputClass}
                        >
                          <option value="">
                            Seleccionar grado
                          </option>

                          {gradosOrigenFiltro.map(
                            (grado) => (
                              <option
                                key={grado.id_grado}
                                value={grado.id_grado}
                              >
                                {grado.nombre_grado}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Sección
                        </span>

                        <select
                          value={idSeccionOrigen}
                          disabled={
                            !idGradoOrigenFiltro
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
                            Seleccionar sección
                          </option>

                          {seccionesOrigenFiltro.map(
                            (item) => (
                              <option
                                key={
                                  item.id_seccion_anio
                                }
                                value={
                                  item.id_seccion
                                }
                                disabled={
                                  Number(
                                    item.ocupados
                                    || 0,
                                  ) <= 0
                                }
                              >
                                Sección {item.seccion.letra}
                                {' · '}
                                {item.ocupados} alumno(s)
                                {Number(
                                  item.ocupados
                                  || 0,
                                ) <= 0
                                  ? ' · Sin alumnos por promover'
                                  : ''}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>

                    {idAnioOrigen
                      && !loadingOrigen
                      && seccionesOrigenConAlumnos
                        .length === 0 && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                          Este año no tiene alumnos activos pendientes de promoción. Los niveles y las secciones se muestran como referencia, pero las secciones vacías no pueden seleccionarse.
                        </p>
                      )}
                  </div>

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
                        Destino de la promoción
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
                            {etiquetaAnioPromocion(
                              anio,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {idAnioOrigen
                    && aniosDestino.length === 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-black text-amber-900">
                          No existe un año lectivo posterior habilitado para esta institución.
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                          Crea el siguiente año lectivo antes de continuar con la promoción.
                          Si el alumno pasa de 6.º de Primaria a 1.º de Secundaria,
                          también debe estar configurada esa progresión académica.
                        </p>
                      </div>
                    )}


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
                      Estado de la nueva matrícula
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
                      Observación del proceso
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

          <HistorialPromocionPanel
            token={token}
            queryAcceso={queryAcceso}
            refreshKey={historialVersion}
            anios={aniosEnriquecidos}
            mostrarColegioEnAnio={
              mostrarColegioEnAnio
            }
            onContinueProceso={async (idLote) => {
              setLoadingLote(true);
              setMensaje(null);

              try {
                await cargarLoteActualizado(
                  idLote,
                  `Proceso N.° ${idLote} abierto para continuar su gestión.`,
                );

                window.localStorage.setItem(
                  storageKey,
                  String(idLote),
                );

                window.requestAnimationFrame(
                  () => {
                    document
                      .getElementById(
                        'detalle-promocion-activa',
                      )
                      ?.scrollIntoView({
                        behavior:
                          'smooth',
                        block:
                          'start',
                      });
                  },
                );

                showToast({
                  type: 'success',
                  title: 'Detalle cargado',
                  message:
                    `Se abrió el proceso N.° ${idLote}.`,
                });
              } catch (error: unknown) {
                const errorMessage =
                  mensajeErrorApi(error)
                  || 'No se pudo abrir el lote seleccionado.';

                setMensaje(errorMessage);

                showToast({
                  type: 'error',
                  title: 'Proceso no disponible',
                  message: errorMessage,
                });
              } finally {
                setLoadingLote(false);
              }
            }}
          />

          {loadingLote && !resultado && (
            <section className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
              <Loader2
                size={18}
                className="animate-spin"
              />

              Recuperando el último lote trabajado…
            </section>
          )}

          {resultado && mostrarDetalleActivo && (
            <section
              key={`${lote?.id_lote || 0}-${lote?.estado || 'sin-estado'}-${resumen?.procesados ?? 0}-${resumen?.revertidos ?? 0}`}
              id="detalle-promocion-activa"
              className="erp-action-enter space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                    Detalle de la promoción
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-black text-slate-950">
                      Proceso N.° {lote?.id_lote || '—'}
                    </h2>

                    <span
                      className={
                        'inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1 '
                        + tonoEstadoLote(
                          estadoLote,
                        )
                      }
                    >
                      {estadoLote || 'Sin estado'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {resultado.message}
                  </p>

                  {lote?.seccion_origen && (
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {[
                        lote.seccion_origen
                          ?.grado
                          ?.nivel
                          ?.nombre_nivel,
                        lote.seccion_origen
                          ?.grado
                          ?.nombre_grado,
                        lote.seccion_origen
                          ?.letra
                          ? `Sección ${lote.seccion_origen.letra}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {' · '}
                      {lote.anio_origen
                        ?.nombre_anio
                        || 'Año de origen'}
                      {' → '}
                      {lote.anio_destino
                        ?.nombre_anio
                        || 'Año de destino'}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loadingLote || operando}
                  onClick={() => {
                    const idLote =
                      Number(lote?.id_lote || 0);

                    if (idLote > 0) {
                      setLoadingLote(true);
                      setMensaje(null);

                      void cargarLoteActualizado(
                        idLote,
                        `Proceso N.° ${idLote} actualizado.`,
                      )
                        .catch((error: unknown) => {
                          setMensaje(
                            mensajeErrorApi(error)
                            || 'No se pudo actualizar el lote.',
                          );
                        })
                        .finally(() => {
                          setLoadingLote(false);
                        });
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <RefreshCcw
                    size={15}
                    className={
                      loadingLote
                        ? 'animate-spin'
                        : ''
                    }
                  />
                  Actualizar detalle
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
                    label: 'Procesados',
                    value: resumen?.procesados || 0,
                  },
                  {
                    label: 'Pendientes',
                    value: resumen?.pendientes || 0,
                  },
                  {
                    label: 'Bloqueados',
                    value: resumen?.bloqueados || 0,
                  },
                  {
                    label: 'Revertidos',
                    value: resumen?.revertidos || 0,
                  },
                ].map((item) => (
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
                            className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
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
                              {detalle.error_observacion
                                || detalle.snapshot_json
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
                    El proceso no contiene estudiantes.
                  </div>
                )}
              </div>

              {estadoLote === 'Vista previa' && (
                <div
                  className={
                    'flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between '
                    + (
                      puedeEjecutar
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-amber-200 bg-amber-50'
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    {puedeEjecutar ? (
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-blue-700"
                      />
                    ) : (
                      <AlertTriangle
                        size={19}
                        className="mt-0.5 shrink-0 text-amber-700"
                      />
                    )}

                    <div>
                      <p
                        className={
                          'text-sm font-black '
                          + (
                            puedeEjecutar
                              ? 'text-blue-950'
                              : 'text-amber-950'
                          )
                        }
                      >
                        {puedeEjecutar
                          ? 'La promoción está lista para ejecutarse'
                          : 'La promoción todavía no puede ejecutarse'}
                      </p>

                      <p
                        className={
                          'mt-1 text-sm font-semibold leading-6 '
                          + (
                            puedeEjecutar
                              ? 'text-blue-800'
                              : 'text-amber-800'
                          )
                        }
                      >
                        {puedeEjecutar
                          ? 'La ejecución cerrará las matrículas de origen y creará las reservas del año de destino.'
                          : 'Corrige los bloqueos o genera nuevamente la vista previa antes de continuar.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!puedeEjecutar || operando}
                    onClick={abrirEjecucion}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={16} />
                    Ejecutar promoción
                  </button>
                </div>
              )}

              {puedeRevertir && (
                <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-slate-700"
                    />

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Promoción ejecutada
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                        Antes de revertir, el sistema comprobará que las matrículas generadas no hayan sido utilizadas ni modificadas.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={operando || validandoReversion}
                    onClick={() =>
                      void abrirReversion()
                    }
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-5 text-sm font-black text-slate-800 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    {validandoReversion ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                    Validar reversión
                  </button>
                </div>
              )}

              {estadoLote === 'Revertido' && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4">
                  <RotateCcw
                    size={19}
                    className="mt-0.5 shrink-0 text-slate-700"
                  />

                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Promoción revertida
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                      Las matrículas de origen fueron restauradas y las matrículas generadas quedaron anuladas para conservar la trazabilidad.
                    </p>
                  </div>
                </div>
              )}

              {ejecuciones.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <History
                      size={18}
                      className="text-slate-700"
                    />

                    <div>
                      <h3 className="text-sm font-black text-slate-950">
                        Historial de ejecuciones
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Registro de cada etapa procesada para este lote.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-white">
                        <tr>
                          {[
                            'N.º',
                            'Etapa',
                            'Fecha',
                            'Estado',
                            'Procesados',
                            'Pendientes',
                            'Usuario',
                          ].map((label) => (
                            <th
                              key={label}
                              className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 bg-white">
                        {ejecuciones.map(
                          (ejecucion: EjecucionPromocion) => (
                            <tr
                              key={
                                ejecucion.id_ejecucion
                              }
                            >
                              <td className="px-4 py-3 text-sm font-black text-slate-900">
                                {ejecucion.numero_ejecucion}
                              </td>

                              <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                {ejecucion.etapa || 'Ordinaria'}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">
                                {formatearFechaHora(
                                  ejecucion.fecha_ejecucion,
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={
                                    'inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 '
                                    + tonoEstadoLote(
                                      ejecucion.estado
                                        === 'Ejecutada'
                                        ? 'Finalizado'
                                        : ejecucion.estado
                                          === 'Revertida'
                                          ? 'Revertido'
                                          : ejecucion.estado
                                            ?? undefined,
                                    )
                                  }
                                >
                                  {ejecucion.estado}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-sm font-black text-slate-800">
                                {ejecucion.total_procesados || 0}
                              </td>

                              <td className="px-4 py-3 text-sm font-black text-slate-800">
                                {ejecucion.total_pendientes || 0}
                              </td>

                              <td className="min-w-48 px-4 py-3 text-sm font-semibold text-slate-600">
                                {nombreUsuario(
                                  ejecucion.ejecutado_por,
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <AccessibleDialog
        open={operacionModal !== null}
        eyebrow={`Proceso N.° ${lote?.id_lote || '—'}`}
        title={
          operacionModal === 'ejecutar'
            ? 'Confirmar ejecución'
            : 'Validar y revertir promoción'
        }
        description={
          operacionModal === 'ejecutar'
            ? 'Confirma la promoción masiva antes de modificar las matrículas de origen y destino.'
            : 'Comprueba la reversibilidad y registra el motivo administrativo antes de continuar.'
        }
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            {operacionModal === 'ejecutar' ? (
              <Play
                size={20}
                aria-hidden="true"
              />
            ) : (
              <RotateCcw
                size={20}
                aria-hidden="true"
              />
            )}
          </div>
        }
        onClose={cerrarOperacion}
        preventClose={operando || validandoReversion}
        closeOnEscape
        closeOnOverlay
        closeLabel="Cerrar operación de promoción"
        maxWidthClassName="max-w-xl"
        panelClassName="max-h-[calc(100dvh-2rem)]"
        bodyClassName="space-y-5"
      >
              {operacionModal === 'ejecutar' && (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle
                      size={19}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <p className="text-sm font-semibold leading-6 text-amber-900">
                      Esta operación cerrará las matrículas de origen y creará las matrículas del año de destino para {resumen?.listos || 0} estudiante(s). No cierres la página durante la ejecución.
                    </p>
                  </div>

                  <label className="block">
                    <span className={etiquetaClass}>
                      Escribe EJECUTAR para confirmar
                    </span>

                    <input
                      autoFocus
                      value={confirmacionOperacion}
                      onChange={(event) =>
                        setConfirmacionOperacion(
                          event.target.value,
                        )
                      }
                      placeholder="EJECUTAR"
                      className={inputClass}
                    />
                  </label>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={operando}
                      onClick={cerrarOperacion}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={
                        operando
                        || confirmacionOperacion
                          .trim()
                          .toUpperCase()
                          !== 'EJECUTAR'
                      }
                      onClick={() =>
                        void ejecutarLote()
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {operando ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Play size={16} />
                      )}
                      Ejecutar promoción
                    </button>
                  </div>
                </>
              )}

              {operacionModal === 'revertir' && (
                <>
                  {validandoReversion ? (
                    <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-bold text-slate-600">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Comprobando matrículas e historial…
                    </div>
                  ) : validacionReversion?.reversible ? (
                    <>
                      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <ShieldCheck
                          size={19}
                          className="mt-0.5 shrink-0 text-blue-700"
                        />

                        <div>
                          <p className="text-sm font-black text-blue-950">
                            El lote puede revertirse
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                            Se restaurarán {validacionReversion.resumen?.procesados || 0} matrícula(s) de origen y se anularán las matrículas generadas.
                          </p>
                        </div>
                      </div>

                      <label className="block">
                        <span className={etiquetaClass}>
                          Motivo de la reversión
                        </span>

                        <textarea
                          value={motivoReversion}
                          maxLength={500}
                          rows={4}
                          onChange={(event) =>
                            setMotivoReversion(
                              event.target.value,
                            )
                          }
                          placeholder="Describe el motivo administrativo de la reversión"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          Mínimo 5 caracteres.
                        </span>
                      </label>

                      <label className="block">
                        <span className={etiquetaClass}>
                          Escribe REVERTIR para confirmar
                        </span>

                        <input
                          autoFocus
                          value={confirmacionOperacion}
                          onChange={(event) =>
                            setConfirmacionOperacion(
                              event.target.value,
                            )
                          }
                          placeholder="REVERTIR"
                          className={inputClass}
                        />
                      </label>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          disabled={operando}
                          onClick={cerrarOperacion}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          disabled={
                            operando
                            || motivoReversion
                              .trim()
                              .length < 5
                            || confirmacionOperacion
                              .trim()
                              .toUpperCase()
                              !== 'REVERTIR'
                          }
                          onClick={() =>
                            void revertirLote()
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {operando ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                          Revertir promoción
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <AlertTriangle
                          size={19}
                          className="mt-0.5 shrink-0 text-red-700"
                        />

                        <div>
                          <p className="text-sm font-black text-red-950">
                            El lote no puede revertirse
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-red-800">
                            Revisa los bloqueos encontrados antes de intentar nuevamente.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {bloqueosReversion.length > 0 ? (
                          bloqueosReversion.map(
                            (
                              bloqueo: BloqueoReversion,
                              index: number,
                            ) => (
                              <div
                                key={
                                  `${bloqueo.codigo || 'bloqueo'}-${index}`
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="text-xs font-black text-slate-900">
                                  {bloqueo.codigo
                                    || 'Bloqueo de reversión'}
                                </p>

                                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                                  {bloqueo.mensaje
                                    || 'El sistema encontró una inconsistencia.'}
                                </p>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-sm font-semibold text-slate-600">
                            No se recibió el detalle del bloqueo.
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={cerrarOperacion}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          Cerrar
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
      </AccessibleDialog>
    </div>
  );
}
