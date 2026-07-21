import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ClipboardList,
  History,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';

type PersonaProceso = {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
};

type UsuarioProceso = {
  username?: string | null;
  persona?: PersonaProceso | null;
};

type DetalleProceso = {
  id_detalle?: number;
  situacion_final?: string | null;
  continuidad?: string | null;
  accion?: string | null;
  estado_resultado?: string | null;
  error_observacion?: string | null;

  snapshot_json?: {
    motivo?: string | null;
    [key: string]: unknown;
  } | null;

  estudiante?: {
    persona?: PersonaProceso | null;
  } | null;

  grado_origen?: {
    nombre_grado?: string | null;
    nivel?: {
      nombre_nivel?: string | null;
    } | null;
  } | null;

  grado_destino?: {
    nombre_grado?: string | null;
    nivel?: {
      nombre_nivel?: string | null;
    } | null;
  } | null;

  seccion_destino?: {
    letra?: string | null;
  } | null;
};

type EjecucionProceso = {
  id_ejecucion?: number;
  numero_ejecucion?: number;
  etapa?: string | null;
  estado?: string | null;
  fecha_ejecucion?: string | null;
  fecha_reversion?: string | null;
  total_evaluados?: number | null;
  total_procesados?: number | null;
  total_pendientes?: number | null;
  total_omitidos?: number | null;
  total_bloqueados?: number | null;
  motivo_reversion?: string | null;
  ejecutado_por?: UsuarioProceso | null;
  revertido_por?: UsuarioProceso | null;
};

export type ProcesoPromocionDetalle = {
  id_lote?: number;
  estado?: string | null;
  estado_matricula_destino?: string | null;
  fecha_vista_previa?: string | null;
  fecha_ejecucion?: string | null;
  fecha_reversion?: string | null;
  created_at?: string | null;
  observacion?: string | null;
  motivo_reversion?: string | null;

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

  creado_por?: UsuarioProceso | null;
  ejecutado_por?: UsuarioProceso | null;
  revertido_por?: UsuarioProceso | null;

  detalles?: DetalleProceso[];
  ejecuciones?: EjecucionProceso[];
};

type Props = {
  proceso?: ProcesoPromocionDetalle;
  cargando?: boolean;
  onClose: () => void;
  onContinue?: (
    idProceso: number,
  ) => Promise<void>;
};

type PestanaDetalle =
  | 'resumen'
  | 'estudiantes'
  | 'actividad';

const estadoVisible = (
  estado?: string | null,
) => {
  const value =
    String(estado || '');

  const labels:
    Record<string, string> = {
      Borrador:
        'Borrador',
      'Vista previa':
        'Preparado',
      'En proceso':
        'En ejecución',
      Ejecutado:
        'Ejecutado',
      Finalizado:
        'Completado',
      Revertido:
        'Revertido',
    };

  return labels[value]
    || value
    || 'Sin estado';
};

const resultadoVisible = (
  value?: string | null,
) => {
  const labels:
    Record<string, string> = {
      LISTO:
        'Listo',
      PROCESADO:
        'Procesado',
      PENDIENTE:
        'Pendiente',
      BLOQUEADO:
        'Requiere revisión',
      OMITIDO:
        'No incluido',
      REVERTIDO:
        'Revertido',
    };

  const key =
    String(value || '')
      .toUpperCase();

  return labels[key]
    || value
    || 'Sin resultado';
};

const situacionVisible = (
  value?: string | null,
) => {
  const labels:
    Record<string, string> = {
      PRO:
        'Promovido',
      PER:
        'Permanece en el grado',
    };

  return labels[
    String(value || '')
      .toUpperCase()
  ]
    || value
    || '—';
};

const accionVisible = (
  value?: string | null,
) => {
  const labels:
    Record<string, string> = {
      PROMOVER:
        'Promover',
      PERMANECER:
        'Mantener en el grado',
      EGRESAR:
        'Registrar egreso',
      OMITIR:
        'No incluir',
    };

  return labels[
    String(value || '')
      .toUpperCase()
  ]
    || value
    || '—';
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

const tonoResultado = (
  resultado?: string | null,
) => {
  switch (
    String(resultado || '')
      .toUpperCase()
  ) {
    case 'LISTO':
    case 'PROCESADO':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'BLOQUEADO':
      return 'bg-red-50 text-red-700 ring-red-200';

    case 'PENDIENTE':
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    case 'REVERTIDO':
      return 'bg-slate-100 text-slate-700 ring-slate-300';

    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
};

const nombrePersona = (
  persona?: PersonaProceso | null,
) => {
  return [
    persona?.nombres,
    persona?.apellido_paterno,
    persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    || '—';
};

const nombreUsuario = (
  usuario?: UsuarioProceso | null,
) => {
  return nombrePersona(
    usuario?.persona,
  ) !== '—'
    ? nombrePersona(
        usuario?.persona,
      )
    : usuario?.username
      || '—';
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
      dateStyle:
        'medium',
      timeStyle:
        'short',
    },
  ).format(date);
};

export default function DetallePromocionModal({
  proceso = {},
  cargando = false,
  onClose,
  onContinue,
}: Props) {
  const [
    pestana,
    setPestana,
  ] = useState<PestanaDetalle>(
    'resumen',
  );

  const [
    continuando,
    setContinuando,
  ] = useState(false);

  const detalles =
    Array.isArray(
      proceso.detalles,
    )
      ? proceso.detalles
      : [];

  const ejecuciones =
    Array.isArray(
      proceso.ejecuciones,
    )
      ? proceso.ejecuciones
      : [];

  const resumen =
    useMemo(() => {
      const contar = (
        ...estados: string[]
      ) =>
        detalles.filter(
          (detalle) =>
            estados.includes(
              String(
                detalle.estado_resultado
                || '',
              ).toUpperCase(),
            ),
        ).length;

      return {
        total:
          detalles.length,
        listos:
          contar('LISTO'),
        procesados:
          contar('PROCESADO'),
        pendientes:
          contar(
            'PENDIENTE',
            'PENDIENTE_RECUPERACION',
          ),

        omitidos:
          contar('OMITIDO'),
        bloqueados:
          contar('BLOQUEADO'),
        revertidos:
          contar('REVERTIDO'),
      };
    }, [
      detalles,
    ]);

  const idProceso =
    Number(
      proceso.id_lote
      || 0,
    );

  const estado =
    String(
      proceso.estado
      || '',
    );

  const puedeContinuar =
    Boolean(onContinue)
    && Number.isInteger(idProceso)
    && idProceso > 0
    && [
      'Borrador',
      'Vista previa',
      'En proceso',
    ].includes(estado);

  const origen =
    [
      proceso.seccion_origen
        ?.grado
        ?.nivel
        ?.nombre_nivel,
      proceso.seccion_origen
        ?.grado
        ?.nombre_grado,
      proceso.seccion_origen
        ?.letra
        ? `Sección ${proceso.seccion_origen.letra}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
    || 'Origen no disponible';

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape'
        && !continuando
      ) {
        onClose();
      }
    };

    window.addEventListener(
      'keydown',
      onKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        onKeyDown,
      );
    };
  }, [
    continuando,
    onClose,
  ]);

  if (cargando) {
    return createPortal(
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5"
        role="presentation"
        onMouseDown={(event) => {
          if (
            event.target
            === event.currentTarget
          ) {
            onClose();
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="detalle-promocion-cargando"
          className="flex h-[92vh] min-h-0 w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl sm:h-[88vh] border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div className="flex-1 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                Detalle histórico
              </p>

              <div
                id="detalle-promocion-cargando"
                className="erp-skeleton-line h-5 w-52"
              />

              <div className="erp-skeleton-line w-96 max-w-full" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex shrink-0 gap-5 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="erp-skeleton-line w-24" />
            <div className="erp-skeleton-line w-32" />
            <div className="erp-skeleton-line w-24" />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {Array.from({
                length: 7,
              }).map((_, index) => (
                <div
                  key={index}
                  className="erp-skeleton-block h-24 p-4"
                />
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="erp-skeleton-block h-52 p-5" />
              <div className="erp-skeleton-block h-52 p-5" />
            </div>

            <p className="mt-5 text-center text-sm font-semibold text-slate-500">
              Cargando información del proceso…
            </p>
          </div>

          <footer className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar
            </button>
          </footer>
        </section>
      </div>,
      document.body,
    );
  }


  const continuar =
    async () => {
      if (
        !onContinue
        || !puedeContinuar
      ) {
        return;
      }

      setContinuando(true);

      try {
        await onContinue(
          idProceso,
        );

        onClose();
      } finally {
        setContinuando(false);
      }
    };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target
          === event.currentTarget
          && !continuando
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-promocion-titulo"
        className="flex h-[92vh] min-h-0 w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl sm:h-[88vh] border border-slate-200 bg-white shadow-2xl"
      >
        <header className="erp-content-ready flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
              Detalle histórico
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2
                id="detalle-promocion-titulo"
                className="text-xl font-black text-slate-950"
              >
                Proceso N.° {idProceso || '—'}
              </h2>

              <span
                className={
                  'inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1 '
                  + tonoEstado(
                    estado,
                  )
                }
              >
                {estadoVisible(
                  estado,
                )}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-slate-600">
              {origen}
              {' · '}
              {proceso.anio_origen
                ?.nombre_anio
                || 'Año de origen'}
              {' → '}
              {proceso.anio_destino
                ?.nombre_anio
                || 'Año de destino'}
            </p>
          </div>

          <button
            type="button"
            disabled={continuando}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            aria-label="Cerrar detalle"
          >
            <X size={18} />
          </button>
        </header>

        <div className="erp-content-ready shrink-0 border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <div className="flex gap-2 overflow-x-auto">
            {[
              {
                key:
                  'resumen' as const,
                label:
                  'Resumen',
                icon:
                  ClipboardList,
              },
              {
                key:
                  'estudiantes' as const,
                label:
                  `Estudiantes (${detalles.length})`,
                icon:
                  Users,
              },
              {
                key:
                  'actividad' as const,
                label:
                  'Actividad',
                icon:
                  History,
              },
            ].map((item) => {
              const Icon =
                item.icon;

              const activo =
                pestana
                === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setPestana(
                      item.key,
                    )
                  }
                  className={
                    'inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-black transition '
                    + (
                      activo
                        ? 'border-blue-700 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    )
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-5">
          {pestana === 'resumen' && (
            <div className="erp-tab-enter h-full overflow-y-auto pr-1 space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  Estado actual de los alumnos
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Cantidad de estudiantes según su situación actual dentro de este proceso.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {[
                  {
                    label:
                      'Evaluados',
                    descripcion:
                      'Incluidos en el proceso',
                    value:
                      resumen.total,
                  },
                  {
                    label:
                      'Listos',
                    descripcion:
                      'Aptos para ejecutar',
                    value:
                      resumen.listos,
                  },
                  {
                    label:
                      'Procesados',
                    descripcion:
                      'Ejecutados correctamente',
                    value:
                      resumen.procesados,
                  },
                  {
                    label:
                      'Pendientes',
                    descripcion:
                      'En espera de resolución',
                    value:
                      resumen.pendientes,
                  },
                  {
                    label:
                      'En revisión',
                    descripcion:
                      'Presentan un bloqueo',
                    value:
                      resumen.bloqueados,
                  },
                  {
                    label:
                      'No incluidos',
                    descripcion:
                      'No generan matrícula',
                    value:
                      resumen.omitidos,
                  },
                  {
                    label:
                      'Revertidos',
                    descripcion:
                      'Promoción anulada',
                    value:
                      resumen.revertidos,
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

                    <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                      {item.descripcion}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-black text-slate-950">
                    Información académica
                  </h3>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Colegio
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {proceso.colegio
                          ?.nombre
                          || proceso.colegio
                            ?.nombre_corto
                          || '—'}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Grupo de origen
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {origen}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Año de origen
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {proceso.anio_origen
                          ?.nombre_anio
                          || '—'}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Año de destino
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {proceso.anio_destino
                          ?.nombre_anio
                          || '—'}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Estado de la nueva matrícula
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {proceso.estado_matricula_destino
                          || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-black text-slate-950">
                    Registro administrativo
                  </h3>

                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Creado
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {fechaLegible(
                          proceso.created_at,
                        )}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Creado por
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {nombreUsuario(
                          proceso.creado_por,
                        )}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Ejecutado
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {fechaLegible(
                          proceso.fecha_ejecucion,
                        )}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-slate-500">
                        Revertido
                      </dt>
                      <dd className="text-right font-black text-slate-800">
                        {fechaLegible(
                          proceso.fecha_reversion,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {(proceso.observacion
                || proceso.motivo_reversion) && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {proceso.observacion && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        Observación del proceso
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                        {proceso.observacion}
                      </p>
                    </div>
                  )}

                  {proceso.motivo_reversion && (
                    <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        Motivo de reversión
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                        {proceso.motivo_reversion}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {pestana === 'estudiantes' && (
            <div className="erp-tab-enter flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-[1050px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                    <tr>
                      {[
                        'Estudiante',
                        'Situación final',
                        'Continuidad',
                        'Acción',
                        'Resultado',
                        'Destino',
                        'Observación',
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.1em] text-slate-500"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {detalles.map((detalle) => (
                      <tr
                        key={
                          detalle.id_detalle
                          || nombrePersona(
                            detalle.estudiante
                              ?.persona,
                          )
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-900">
                          {nombrePersona(
                            detalle.estudiante
                              ?.persona,
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {situacionVisible(
                            detalle.situacion_final,
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {detalle.continuidad
                            || '—'}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {accionVisible(
                            detalle.accion,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 '
                              + tonoResultado(
                                detalle.estado_resultado,
                              )
                            }
                          >
                            {resultadoVisible(
                              detalle.estado_resultado,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {[
                            detalle.grado_destino
                              ?.nivel
                              ?.nombre_nivel,
                            detalle.grado_destino
                              ?.nombre_grado,
                            detalle.seccion_destino
                              ?.letra
                              ? `Sección ${detalle.seccion_destino.letra}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                            || '—'}
                        </td>

                        <td className="min-w-72 px-4 py-3 text-sm font-medium text-slate-600">
                          {detalle.error_observacion
                            || detalle.snapshot_json
                              ?.motivo
                            || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detalles.length === 0 && (
                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  Este proceso no contiene estudiantes.
                </div>
              )}
            </div>
          )}

          {pestana === 'actividad' && (
            <div className="erp-tab-enter mx-auto h-full max-w-4xl overflow-y-auto pr-1 space-y-4">
              {[
                {
                  key: 'vista-previa',
                  titulo:
                    'Vista previa generada',
                  fecha:
                    proceso.fecha_vista_previa,
                  descripcion:
                    'El sistema evaluó a los estudiantes, '
                    + 'la continuidad académica y los cupos '
                    + 'de las secciones de destino.',
                  visible:
                    Boolean(
                      proceso.fecha_vista_previa,
                    ),
                  estado:
                    'Preparado',
                },
                {
                  key: 'ejecucion',
                  titulo:
                    'Promoción ejecutada',
                  fecha:
                    proceso.fecha_ejecucion,
                  descripcion:
                    ejecuciones.length > 0
                      ? `${ejecuciones.reduce(
                          (
                            total,
                            item,
                          ) =>
                            total
                            + Number(
                                item.total_procesados
                                || 0,
                              ),
                          0,
                        )} estudiante(s) procesado(s).`
                      : 'Se procesaron las matrículas '
                        + 'del año de destino.',
                  visible:
                    Boolean(
                      proceso.fecha_ejecucion,
                    ),
                  estado:
                    'Ejecutada',
                },
                {
                  key: 'reversion',
                  titulo:
                    'Promoción revertida',
                  fecha:
                    proceso.fecha_reversion,
                  descripcion:
                    proceso.motivo_reversion
                    || ejecuciones.find(
                      (item) =>
                        item.fecha_reversion,
                    )?.motivo_reversion
                    || 'Las matrículas generadas fueron '
                      + 'anuladas y se restauró la situación '
                      + 'anterior.',
                  visible:
                    Boolean(
                      proceso.fecha_reversion
                      || ejecuciones.some(
                        (item) =>
                          item.fecha_reversion,
                      ),
                    ),
                  estado:
                    'Revertida',
                },
              ]
                .filter(
                  (item) =>
                    item.visible,
                )
                .map(
                  (
                    item,
                    index,
                    eventos,
                  ) => (
                    <div
                      key={item.key}
                      className="relative flex gap-4"
                    >
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <div
                          className={
                            'flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white '
                            + (
                              item.key === 'reversion'
                                ? 'bg-slate-700 text-white'
                                : item.key === 'ejecucion'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-600 text-white'
                            )
                          }
                        >
                          {index + 1}
                        </div>

                        {index
                          < eventos.length - 1 && (
                            <div className="mt-2 min-h-12 w-px flex-1 bg-slate-300" />
                          )}
                      </div>

                      <div className="mb-4 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              {item.titulo}
                            </p>

                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                              {item.descripcion}
                            </p>
                          </div>

                          <div className="shrink-0 text-left sm:text-right">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                              {item.estado}
                            </span>

                            <p className="mt-2 whitespace-nowrap text-xs font-semibold text-slate-500">
                              {fechaLegible(
                                item.fecha,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}

              {!proceso.fecha_vista_previa
                && !proceso.fecha_ejecucion
                && !proceso.fecha_reversion && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
                    Este proceso todavía no registra actividad.
                  </div>
                )}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={continuando}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cerrar
          </button>

          {puedeContinuar && (
            <button
              type="button"
              disabled={continuando}
              onClick={() =>
                void continuar()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {continuando ? (
                <RotateCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={16} />
              )}

              Abrir para gestionar
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
