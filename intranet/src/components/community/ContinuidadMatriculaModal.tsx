import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import {
  CalendarClock,
  Loader2,
} from 'lucide-react';
import CommunityEditModal from './CommunityEditModal';
import {
  CommunityStatusChip,
  CommunityTextarea,
  communityInputClass,
} from './CommunityUI';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

export type DecisionContinuidad =
  | 'Pendiente'
  | 'Continúa'
  | 'No continúa'
  | 'Traslado interno'
  | 'Traslado externo';

type ContinuidadDraft = {
  idAnioDestino: number | '';
  motivo: string;
};

type AnioContinuidad = {
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

type Props = {
  open: boolean;
  matricula: any | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const decisiones: DecisionContinuidad[] = [
  'Pendiente',
  'Continúa',
  'No continúa',
  'Traslado interno',
  'Traslado externo',
];

const fechaInicio = (
  value?: string | Date | null,
) => {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
};

const toneContinuidad = (
  value: DecisionContinuidad,
) => {
  if (value === 'Continúa') {
    return 'success' as const;
  }

  if (value === 'Pendiente') {
    return 'warning' as const;
  }

  if (
    value === 'No continúa'
    || value === 'Traslado externo'
  ) {
    return 'danger' as const;
  }

  return 'info' as const;
};

export default function ContinuidadMatriculaModal({
  open,
  matricula,
  onClose,
  onSaved,
}: Props) {
  const { token } = useAuth();

  const {
    queryString,
    puedeVerConsolidado,
    colegios,
  } = useSchool();

  const { showToast } = useToast();

  const [
    continuidad,
    setContinuidad,
  ] = useState<DecisionContinuidad>(
    'Pendiente',
  );

  const [
    idAnioDestino,
    setIdAnioDestino,
  ] = useState<number | ''>('');

  const [
    motivo,
    setMotivo,
  ] = useState('');

  const [
    anios,
    setAnios,
  ] = useState<AnioContinuidad[]>([]);

  const [
    loadingAnios,
    setLoadingAnios,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const decisionDraftsRef =
    useRef<
      Partial<
        Record<
          DecisionContinuidad,
          ContinuidadDraft
        >
      >
    >({});

  const queryAcceso =
    puedeVerConsolidado
      ? '?scope=all'
      : queryString;

  useEffect(() => {
    if (
      !open
      || !matricula
      || !token
    ) {
      return;
    }

    const decisionInicial =
      (
        matricula
          .continuidad_siguiente_anio
        || 'Pendiente'
      ) as DecisionContinuidad;

    const anioInicial =
      matricula.id_anio_continuidad
      || '';

    const motivoInicial =
      matricula.motivo_continuidad
      || '';

    setContinuidad(
      decisionInicial,
    );

    setIdAnioDestino(
      anioInicial,
    );

    setMotivo(
      motivoInicial,
    );

    decisionDraftsRef.current = {
      [decisionInicial]: {
        idAnioDestino:
          anioInicial,

        motivo:
          motivoInicial,
      },
    };

    setMessage(null);
    setLoadingAnios(true);

    let cancelled = false;

    const cargarAnios = async () => {
      try {
        const response =
          await axios.get(
            `/api/academicos/anios${queryAcceso}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (cancelled) return;

        const data =
          Array.isArray(response.data)
            ? response.data
            : response.data?.data || [];

        setAnios(data);
      } catch {
        if (!cancelled) {
          setAnios([]);

          setMessage(
            'No se pudieron cargar los '
            + 'años lectivos disponibles.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAnios(false);
        }
      }
    };

    void cargarAnios();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    matricula,
    token,
    queryAcceso,
  ]);

  /*
   * La decisión familiar no asigna todavía
   * año, grado ni sección. Ese destino será
   * definido durante la renovación masiva.
   */
  const requiereDestino = false;

  const requiereMotivo =
    continuidad === 'No continúa'
    || continuidad === 'Traslado externo';

  const aniosDestino =
    useMemo(() => {
      if (!matricula) return [];

      const inicioActual =
        fechaInicio(
          matricula.anio?.fecha_inicio,
        );

      return anios
        .filter((anio) => {
          const inicioDestino =
            fechaInicio(anio.fecha_inicio);

          if (
            !inicioActual
            || !inicioDestino
            || inicioDestino.getTime()
              <= inicioActual.getTime()
          ) {
            return false;
          }

          const idColegioDestino =
            Number(
              anio.id_colegio
              || anio.colegio?.id_colegio
              || 0,
            );

          if (
            continuidad === 'Continúa'
          ) {
            return (
              idColegioDestino
              === Number(
                matricula.id_colegio,
              )
            );
          }

          if (
            continuidad
            === 'Traslado interno'
          ) {
            return (
              idColegioDestino > 0
              && idColegioDestino
                !== Number(
                  matricula.id_colegio,
                )
            );
          }

          return false;
        })
        .sort((a, b) => {
          const fechaA =
            fechaInicio(a.fecha_inicio)
              ?.getTime()
            || 0;

          const fechaB =
            fechaInicio(b.fecha_inicio)
              ?.getTime()
            || 0;

          return fechaA - fechaB;
        });
    }, [
      anios,
      continuidad,
      matricula,
    ]);

  const guardarDeshabilitado =
    (
      requiereDestino
      && (
        loadingAnios
        || aniosDestino.length === 0
        || !idAnioDestino
      )
    )
    || (
      requiereMotivo
      && !motivo.trim()
    );

  const nombreColegioAnio = (
    anio: AnioContinuidad,
  ) => {
    const idColegio =
      Number(
        anio.id_colegio
        || anio.colegio?.id_colegio
        || 0,
      );

    const colegioContexto =
      colegios.find(
        (item) =>
          item.id_colegio === idColegio,
      );

    return (
      anio.colegio?.nombre
      || anio.colegio?.nombre_corto
      || colegioContexto?.nombre
      || colegioContexto?.nombre_corto
      || `Institución ${idColegio}`
    );
  };

  const cambiarDecision = (
    value: DecisionContinuidad,
  ) => {
    if (value === continuidad) {
      setMessage(null);
      return;
    }

    decisionDraftsRef.current[
      continuidad
    ] = {
      idAnioDestino,
      motivo,
    };

    const draftDestino =
      decisionDraftsRef.current[
        value
      ];

    setContinuidad(value);
    setMessage(null);

    setIdAnioDestino(
      draftDestino
        ?.idAnioDestino
      ?? '',
    );

    setMotivo(
      draftDestino?.motivo
      ?? '',
    );
  };

  const guardar = async () => {
    if (
      !token
      || !matricula
    ) {
      return;
    }

    if (
      requiereDestino
      && !idAnioDestino
    ) {
      setMessage(
        'Selecciona el año lectivo '
        + 'de destino.',
      );

      return;
    }

    if (
      (
        continuidad === 'No continúa'
        || continuidad
          === 'Traslado externo'
      )
      && !motivo.trim()
    ) {
      setMessage(
        'Indica el motivo de la '
        + 'decisión de continuidad.',
      );

      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response =
        await axios.patch(
          `/api/academicos/matriculas/${matricula.id_matricula}/continuidad${queryAcceso}`,
          {
            continuidad,

            id_anio_continuidad:
              requiereDestino
                ? Number(idAnioDestino)
                : undefined,

            motivo:
              motivo.trim()
              || undefined,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const successMessage =
        response.data?.message
        || 'La continuidad fue actualizada.';

      showToast({
        type: 'success',
        title: 'Continuidad actualizada',
        message: successMessage,
      });

      await onSaved();
      onClose();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message
        || 'No se pudo registrar '
          + 'la continuidad.';

      setMessage(errorMessage);

      showToast({
        type: 'error',
        title: 'No se pudo completar',
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const cerrar = () => {
    if (saving) return;

    setMessage(null);
    onClose();
  };

  const continuidadActual:
    DecisionContinuidad =
      matricula
        ?.continuidad_siguiente_anio
      || 'Pendiente';

  return (
    <CommunityEditModal
      open={open}
      eyebrow="Continuidad escolar"
      title="Gestionar continuidad"
      description={
        'Registra la decisión familiar para '
        + 'el siguiente año. El grado y la '
        + 'sección se asignarán posteriormente.'
      }
      maxWidthClassName="max-w-2xl"
      message={message}
      saving={saving}
      submitDisabled={
        guardarDeshabilitado
      }
      submitLabel="Guardar decisión"
      onClose={cerrar}
      onSubmit={guardar}
    >
      {matricula && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <CalendarClock size={18} />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">
                  {matricula.colegio?.nombre
                    || 'Institución'}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {matricula.anio?.nombre_anio
                    || 'Año lectivo'}
                  {' · '}
                  {matricula.seccion?.grado
                    ?.nombre_grado
                    || 'Grado'}
                  {' “'}
                  {matricula.seccion?.letra
                    || '-'}
                  {'”'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    Decisión vigente:
                  </span>

                  <CommunityStatusChip
                    label={continuidadActual}
                    tone={toneContinuidad(
                      continuidadActual,
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
              Decisión para el siguiente año
            </span>

            <select
              value={continuidad}
              className={communityInputClass}
              onChange={(event) =>
                cambiarDecision(
                  event.target
                    .value as DecisionContinuidad,
                )
              }
            >
              {decisiones.map((item) => {
                if (
                  item === 'Traslado interno'
                  && !puedeVerConsolidado
                ) {
                  return null;
                }

                return (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                );
              })}
            </select>
          </label>

          {requiereDestino && (
            <label>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
                Año lectivo de destino
              </span>

              <select
                value={idAnioDestino}
                disabled={loadingAnios}
                className={communityInputClass}
                onChange={(event) =>
                  setIdAnioDestino(
                    event.target.value
                      ? Number(
                          event.target.value,
                        )
                      : '',
                  )
                }
              >
                <option value="">
                  {loadingAnios
                    ? 'Cargando años…'
                    : 'Selecciona el año de destino'}
                </option>

                {aniosDestino.map((anio) => (
                  <option
                    key={anio.id_anio}
                    value={anio.id_anio}
                  >
                    {anio.nombre_anio}
                    {' · '}
                    {nombreColegioAnio(anio)}
                  </option>
                ))}
              </select>

              {!loadingAnios
                && aniosDestino.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    No existen años posteriores
                    compatibles con esta decisión.
                    Crea o habilita el siguiente año
                    en Configuración &gt; Años lectivos.
                  </p>
                )}

              {loadingAnios && (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                  Consultando años lectivos…
                </p>
              )}
            </label>
          )}

          <CommunityTextarea
            label={
              continuidad === 'No continúa'
              || continuidad
                === 'Traslado externo'
                ? 'Motivo obligatorio'
                : 'Observación'
            }
            value={motivo}
            rows={4}
            placeholder={
              continuidad === 'No continúa'
                ? 'Indica el motivo por el que el alumno no continuará.'
                : continuidad
                    === 'Traslado externo'
                  ? 'Indica la institución de destino o el motivo del traslado.'
                  : 'Observación opcional sobre la decisión.'
            }
            onChange={setMotivo}
          />

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
            Esta decisión registra la intención
            familiar. El año, grado y sección de
            destino se definirán durante la promoción
            o renovación masiva.
          </div>
        </div>
      )}
    </CommunityEditModal>
  );
}
