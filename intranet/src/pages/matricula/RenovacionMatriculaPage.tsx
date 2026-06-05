import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type CodigoColegio = {
  id_estudiante: number;
  id_colegio: number;
  codigo: string;
};

type Alumno = {
  id_persona: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento?: string | null;
  estudiantes: {
    id_persona: number;
    codigo_estudiante: string;
    codigos_colegio?: CodigoColegio[];
    apoderados?: {
      parentesco: string;
      apoderado: {
        id_persona: number;
        persona: {
          id_persona: number;
          dni: string;
          nombres: string;
          apellido_paterno: string;
          apellido_materno: string;
          telefono?: string | null;
          correo?: string | null;
        };
      };
    }[];
    matriculas: MatriculaAlumno[];
  }[];
};

type MatriculaAlumno = {
  id_matricula: number;
  codigo_matricula?: string | null;
  id_colegio?: number | null;
  estado_matricula: string;
  colegio?: { nombre: string; nombre_corto?: string | null; codigo?: string | null };
  anio?: {
    id_anio?: number;
    nombre_anio: string;
    estado?: string;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
  };
  seccion?: {
    letra: string;
    grado: {
      id_grado?: number;
      nombre_grado: string;
      nivel?: { id_nivel?: number; nombre_nivel: string };
    };
  };
};

type Anio = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  estado: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

type Seccion = {
  id_seccion: number;
  letra: string;
  capacidad: number;
  matriculados: number;
  disponibles: number;
  grado: {
    nombre_grado: string;
    nivel?: { nombre_nivel: string };
  };
};

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const selectClass = inputClass;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const estadosNoFinales = ['Activo', 'Pre-matriculado', 'Reserva', 'Pendiente', 'Observado'];

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAnioCorte = (anio?: { nombre_anio?: string | null; fecha_inicio?: string | null } | null) => {
  const desdeNombre = anio?.nombre_anio?.match(/\d{4}/)?.[0];

  if (desdeNombre) return Number(desdeNombre);

  if (anio?.fecha_inicio) {
    const fecha = new Date(anio.fecha_inicio);
    if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
  }

  return new Date().getFullYear();
};

const normalizarEstado = (estado?: string | null) =>
  String(estado || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const esAnioRegistrable = (anio: Anio) => {
  const estado = normalizarEstado(anio.estado);

  if (['cerrado', 'archivado'].includes(estado)) return false;

  if (anio.fecha_fin) {
    const fechaFin = new Date(`${String(anio.fecha_fin).slice(0, 10)}T23:59:59`);
    if (!Number.isNaN(fechaFin.getTime()) && fechaFin < new Date()) return false;
  }

  return true;
};

const getEstadoOperativo = (anio?: Anio | null) => {
  const estado = normalizarEstado(anio?.estado);

  if (['cerrado', 'archivado'].includes(estado)) return 'Cerrado';
  if (estado.includes('planificacion')) return 'Planificación';
  if (estado.includes('matricula') || estado === 'abierto') return 'Matrícula abierta';
  if (estado === 'activo' || estado.includes('curso')) return 'En curso';

  return anio?.estado || 'Planificación';
};

const getCodigoAlumno = (alumno: Alumno | null, colegioId?: number | '') => {
  const estudiante = alumno?.estudiantes?.[0];

  const codigoColegio = estudiante?.codigos_colegio?.find(
    (item) => item.id_colegio === Number(colegioId),
  );

  return codigoColegio?.codigo || estudiante?.codigo_estudiante || 'Sin código';
};

const getNombreCompleto = (alumno: Alumno | null) =>
  alumno
    ? `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`
    : '—';

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-content-soft overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm shadow-slate-100/80">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
          <Icon size={17} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
      {children}
    </span>
  );
}

function Detail({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'sky';
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-900 ring-slate-100',
    emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    sky: 'bg-sky-50 text-sky-800 ring-sky-100',
  };

  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-black">{value}</div>
    </div>
  );
}

export default function RenovacionMatriculaPage() {
  const { token } = useAuth();
  const {
    activeScope,
    activeColegio,
    colegios,
    queryString,
    scopeLabel,
    puedeVerConsolidado,
  } = useSchool();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [colegioDestinoId, setColegioDestinoId] = useState<number | ''>(
    activeScope.tipo === 'colegio' && activeScope.id_colegio
      ? activeScope.id_colegio
      : '',
  );
  const [anios, setAnios] = useState<Anio[]>([]);
  const [anioDestinoId, setAnioDestinoId] = useState<number | ''>('');
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [gradoFiltro, setGradoFiltro] = useState('');
  const [seccionDestinoId, setSeccionDestinoId] = useState<number | ''>('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [loadingBase, setLoadingBase] = useState(false);

  const colegioDestinoQuery = useMemo(() => {
    if (activeScope.tipo === 'colegio') return queryString;
    if (colegioDestinoId) return `?colegio_id=${colegioDestinoId}`;
    return queryString;
  }, [activeScope.tipo, colegioDestinoId, queryString]);

  const colegioDestino = useMemo(() => {
    if (activeScope.tipo === 'colegio') return activeColegio || null;
    return colegios.find((item) => item.id_colegio === colegioDestinoId) || null;
  }, [activeScope.tipo, activeColegio, colegios, colegioDestinoId]);

  const anioDestino = useMemo(
    () => anios.find((item) => item.id_anio === anioDestinoId) || null,
    [anios, anioDestinoId],
  );

  const estudiante = alumno?.estudiantes?.[0] || null;

  const aniosDisponibles = useMemo(
    () => anios.filter((anio) => esAnioRegistrable(anio)),
    [anios],
  );

  const anioDestinoNumero = anioDestino ? getAnioCorte(anioDestino) : null;

  const matriculasNoFinales = useMemo(() => {
    return (estudiante?.matriculas || []).filter((matricula) =>
      estadosNoFinales.includes(matricula.estado_matricula),
    );
  }, [estudiante?.matriculas]);

  const matriculaMismoAnio = useMemo(() => {
    if (!anioDestinoNumero) return null;

    return (
      matriculasNoFinales.find(
        (matricula) => getAnioCorte(matricula.anio) === anioDestinoNumero,
      ) || null
    );
  }, [matriculasNoFinales, anioDestinoNumero]);

  const matriculaOrigen = useMemo(() => {
    if (!anioDestinoNumero) {
      return (
        matriculasNoFinales
          .filter((matricula) => ['Activo', 'Pre-matriculado'].includes(matricula.estado_matricula))
          .sort((a, b) => getAnioCorte(b.anio) - getAnioCorte(a.anio))[0] || null
      );
    }

    return (
      matriculasNoFinales
        .filter(
          (matricula) =>
            ['Activo', 'Pre-matriculado'].includes(matricula.estado_matricula) &&
            getAnioCorte(matricula.anio) < anioDestinoNumero,
        )
        .sort((a, b) => getAnioCorte(b.anio) - getAnioCorte(a.anio))[0] || null
    );
  }, [matriculasNoFinales, anioDestinoNumero]);

  const tipoRenovacion = useMemo(() => {
    if (!matriculaOrigen || !colegioDestinoId) return 'Renovación';

    return matriculaOrigen.id_colegio === Number(colegioDestinoId)
      ? 'Renovación'
      : 'Renovación con cambio de sede';
  }, [matriculaOrigen, colegioDestinoId]);

  const niveles = useMemo(
    () =>
      Array.from(
        new Set(secciones.map((item) => item.grado?.nivel?.nombre_nivel).filter(Boolean)),
      ) as string[],
    [secciones],
  );

  const grados = useMemo(
    () =>
      Array.from(
        new Set(
          secciones
            .filter((item) => !nivelFiltro || item.grado?.nivel?.nombre_nivel === nivelFiltro)
            .map((item) => item.grado?.nombre_grado)
            .filter(Boolean),
        ),
      ) as string[],
    [nivelFiltro, secciones],
  );

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter(
        (item) =>
          (!nivelFiltro || item.grado?.nivel?.nombre_nivel === nivelFiltro) &&
          (!gradoFiltro || item.grado?.nombre_grado === gradoFiltro),
      ),
    [secciones, nivelFiltro, gradoFiltro],
  );

  const seccionDestino = useMemo(
    () => secciones.find((item) => item.id_seccion === seccionDestinoId) || null,
    [secciones, seccionDestinoId],
  );

  const apoderados = useMemo(() => {
    return estudiante?.apoderados || [];
  }, [estudiante?.apoderados]);

  const puedeRenovar = useMemo(() => {
    if (!alumno || !estudiante) return false;
    if (!colegioDestinoId || !anioDestinoId || !seccionDestinoId) return false;
    if (!matriculaOrigen) return false;
    if (matriculaMismoAnio) return false;
    if (!apoderados.length) return false;
    return true;
  }, [
    alumno,
    estudiante,
    colegioDestinoId,
    anioDestinoId,
    seccionDestinoId,
    matriculaOrigen,
    matriculaMismoAnio,
    apoderados.length,
  ]);

  useEffect(() => {
    if (activeScope.tipo === 'colegio' && activeScope.id_colegio) {
      setColegioDestinoId(activeScope.id_colegio);
    }

    if (activeScope.tipo === 'todos') {
      setColegioDestinoId('');
    }

    setAnioDestinoId('');
    setSeccionDestinoId('');
    setSecciones([]);
  }, [activeScope.tipo, activeScope.id_colegio]);

  useEffect(() => {
    if (!token) return;

    fetchAnios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, colegioDestinoId, queryString]);

  useEffect(() => {
    if (!token || !anioDestinoId) {
      setSecciones([]);
      return;
    }

    fetchSecciones(Number(anioDestinoId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, anioDestinoId, colegioDestinoId, queryString]);

  const fetchAnios = async () => {
    if (!token) return;

    setLoadingBase(true);

    try {
      const res = await axios.get(`/api/academicos/anios${colegioDestinoQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: Anio[] = res.data || [];
      setAnios(data);

      const candidato =
        data
          .filter((anio) => esAnioRegistrable(anio))
          .find((anio) => getEstadoOperativo(anio) === 'Planificación') ||
        data
          .filter((anio) => esAnioRegistrable(anio))
          .find((anio) => getEstadoOperativo(anio) === 'Matrícula abierta') ||
        '';

      setAnioDestinoId((current) => current || (candidato ? candidato.id_anio : ''));
    } catch (error: any) {
      setAnios([]);
      showToast({
        type: 'error',
        title: 'No se cargaron años',
        message: error.response?.data?.message || 'No se pudo cargar años lectivos.',
      });
    } finally {
      setLoadingBase(false);
    }
  };

  const fetchSecciones = async (idAnio: number) => {
    if (!token) return;

    const base = colegioDestinoQuery.replace('?', '');
    const params = new URLSearchParams(base);
    params.set('anio_id', String(idAnio));

    try {
      const res = await axios.get(`/api/academicos/secciones?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSecciones(res.data || []);
      setSeccionDestinoId('');
      setNivelFiltro('');
      setGradoFiltro('');
    } catch (error: any) {
      setSecciones([]);
      showToast({
        type: 'error',
        title: 'No se cargaron secciones',
        message: error.response?.data?.message || 'No se pudo cargar secciones.',
      });
    }
  };

  const buscarAlumno = async () => {
    if (!token || !dni.trim()) return;

    setBuscando(true);
    setMensaje(null);
    setAlumno(null);

    try {
      const query = puedeVerConsolidado
        ? '&scope=all'
        : colegioDestinoQuery
          ? `&${colegioDestinoQuery.replace('?', '')}`
          : '';

      const res = await axios.get(
        `/api/academicos/alumnos/buscar?dni=${dni.trim()}${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setAlumno(res.data);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se encontró el alumno.');
      setAlumno(null);
    } finally {
      setBuscando(false);
    }
  };

  const registrarRenovacion = async () => {
    if (!token || !estudiante || !puedeRenovar) return;

    setGuardando(true);
    setMensaje(null);

    try {
      const res = await axios.post(
        `/api/academicos/matriculas${colegioDestinoQuery}`,
        {
          id_estudiante: estudiante.id_persona,
          id_anio: Number(anioDestinoId),
          id_seccion: Number(seccionDestinoId),
          id_colegio: Number(colegioDestinoId || activeColegio?.id_colegio),
          tipo_ingreso: tipoRenovacion,
          observacion_procedencia:
            observacion ||
            `${tipoRenovacion}. Origen: ${
              matriculaOrigen?.colegio?.nombre || 'sede anterior'
            } · ${matriculaOrigen?.anio?.nombre_anio || 'año anterior'}.`,
          apoderados: apoderados.map((relacion) => ({
            id_apoderado: relacion.apoderado.id_persona,
            parentesco: relacion.parentesco || 'Apoderado',
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const codigo = res.data?.codigo_matricula || `#${res.data?.id_matricula || ''}`;

      showToast({
        type: 'success',
        title: 'Renovación registrada',
        message: `Se creó la matrícula ${codigo}.`,
        duration: 6500,
      });

      navigate(`/matricula/historial?matricula_id=${res.data?.id_matricula}&colegio_id=${colegioDestinoId}`);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'No se pudo registrar la renovación/re-matrícula.';

      setMensaje(message);

      showToast({
        type: 'error',
        title: 'No se pudo registrar',
        message,
        duration: 6500,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Matrícula"
        title="Renovación / Re-matrícula"
        description="Pre-matricula alumnos vigentes para el siguiente año, con opción de conservar sede o cambiar de colegio dentro del grupo."
        icon={ArrowRightLeft}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Proceso', value: 'Continuidad y cambio de sede' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.55fr]">
        <section className="space-y-5">
          <Card
            icon={Search}
            title="Buscar alumno vigente"
            subtitle="Busca por DNI para revisar su matrícula actual."
          >
            <div className="flex gap-2">
              <input
                value={dni}
                onChange={(event) => setDni(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && buscarAlumno()}
                placeholder="DNI del alumno"
                className={inputClass}
              />
              <button
                type="button"
                disabled={!dni.trim() || buscando}
                onClick={buscarAlumno}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Buscar
              </button>
            </div>

            {mensaje && (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
                {mensaje}
              </p>
            )}
          </Card>

          <Card
            icon={Building2}
            title="Destino de renovación"
            subtitle="Selecciona sede y año escolar destino."
          >
            <div className="space-y-4">
              <label>
                <Label>Colegio destino</Label>
                <select
                  className={selectClass}
                  value={colegioDestinoId}
                  disabled={activeScope.tipo === 'colegio'}
                  onChange={(event) => {
                    setColegioDestinoId(event.target.value ? Number(event.target.value) : '');
                    setAnioDestinoId('');
                    setSeccionDestinoId('');
                    setSecciones([]);
                  }}
                >
                  <option value="">Selecciona colegio</option>
                  {colegios.map((colegio) => (
                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                      {colegio.nombre_corto || colegio.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <Label>Año destino</Label>
                <select
                  className={selectClass}
                  value={anioDestinoId}
                  onChange={(event) => {
                    setAnioDestinoId(event.target.value ? Number(event.target.value) : '');
                    setSeccionDestinoId('');
                  }}
                  disabled={!colegioDestinoId || loadingBase}
                >
                  <option value="">Selecciona año</option>
                  {aniosDisponibles.map((anio) => (
                    <option key={anio.id_anio} value={anio.id_anio}>
                      {anio.nombre_anio} · {anio.estado}
                    </option>
                  ))}
                </select>
              </label>

              {anioDestino && (
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold leading-6 text-sky-700 ring-1 ring-sky-100">
                  Estado del año destino: {getEstadoOperativo(anioDestino)}. La renovación se
                  registrará como pre-matrícula si el año está en planificación.
                </div>
              )}
            </div>
          </Card>

          {alumno && (
            <Card
              icon={UserRoundCheck}
              title="Alumno encontrado"
              subtitle="Ficha base y vínculo familiar."
            >
              <div className="space-y-3">
                <Detail label="Alumno" value={getNombreCompleto(alumno)} />
                <Detail label="DNI" value={alumno.dni} />
                <Detail label="Código alumno" value={getCodigoAlumno(alumno, colegioDestinoId)} />
                <Detail
                  label="Apoderados vinculados"
                  value={`${apoderados.length} apoderado(s)`}
                  tone={apoderados.length ? 'emerald' : 'amber'}
                />
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-5">
          <Card
            icon={ShieldCheck}
            title="Validación de origen"
            subtitle="El sistema toma la matrícula vigente anterior al año destino."
          >
            {!alumno ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                Busca un alumno para revisar su matrícula de origen.
              </p>
            ) : matriculaMismoAnio ? (
              <div className="rounded-3xl bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800 ring-1 ring-amber-100">
                El alumno ya tiene un proceso para el año destino:{' '}
                <span className="font-black">
                  {matriculaMismoAnio.codigo_matricula || `#${matriculaMismoAnio.id_matricula}`}
                </span>{' '}
                · {matriculaMismoAnio.estado_matricula} ·{' '}
                {matriculaMismoAnio.colegio?.nombre || 'Colegio'}.
                No se puede crear una segunda renovación para el mismo año.
              </div>
            ) : matriculaOrigen ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Detail
                  label="Matrícula origen"
                  value={matriculaOrigen.codigo_matricula || `#${matriculaOrigen.id_matricula}`}
                  tone="sky"
                />
                <Detail
                  label="Sede origen"
                  value={matriculaOrigen.colegio?.nombre || '—'}
                />
                <Detail
                  label="Año origen"
                  value={matriculaOrigen.anio?.nombre_anio || '—'}
                />
                <Detail
                  label="Estado"
                  value={matriculaOrigen.estado_matricula}
                  tone="emerald"
                />
                <div className="md:col-span-2 xl:col-span-4">
                  <Detail
                    label="Sección origen"
                    value={`${matriculaOrigen.seccion?.grado?.nombre_grado || 'Grado'} "${
                      matriculaOrigen.seccion?.letra || '-'
                    }" · ${matriculaOrigen.seccion?.grado?.nivel?.nombre_nivel || 'Nivel'}`}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800 ring-1 ring-amber-100">
                No se encontró una matrícula vigente anterior para renovar. Si el alumno es
                nuevo, traslado externo o reingreso, usa “Registrar matrícula”.
              </div>
            )}
          </Card>

          <Card
            icon={GraduationCap}
            title="Sección destino"
            subtitle="Elige el grado y sección del siguiente año."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <Label>Nivel</Label>
                <select
                  className={selectClass}
                  value={nivelFiltro}
                  onChange={(event) => {
                    setNivelFiltro(event.target.value);
                    setGradoFiltro('');
                    setSeccionDestinoId('');
                  }}
                  disabled={!anioDestinoId}
                >
                  <option value="">Todos</option>
                  {niveles.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <Label>Grado</Label>
                <select
                  className={selectClass}
                  value={gradoFiltro}
                  onChange={(event) => {
                    setGradoFiltro(event.target.value);
                    setSeccionDestinoId('');
                  }}
                  disabled={!anioDestinoId}
                >
                  <option value="">Todos</option>
                  {grados.map((grado) => (
                    <option key={grado} value={grado}>
                      {grado}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <Label>Tipo proceso</Label>
                <input className={inputClass} value={tipoRenovacion} readOnly />
              </label>
            </div>

            <div className="mt-5 grid max-h-[330px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {seccionesFiltradas.map((seccion) => {
                const selected = seccion.id_seccion === seccionDestinoId;
                const sinCupos = seccion.disponibles <= 0;
                const porcentaje =
                  seccion.capacidad > 0
                    ? Math.min(100, Math.round((seccion.matriculados / seccion.capacidad) * 100))
                    : 0;

                return (
                  <button
                    key={seccion.id_seccion}
                    type="button"
                    disabled={sinCupos}
                    onClick={() => setSeccionDestinoId(selected ? '' : seccion.id_seccion)}
                    className={cx(
                      'rounded-2xl border p-4 text-left transition',
                      selected
                        ? 'border-accent-300 bg-accent-50 ring-4 ring-accent-100'
                        : 'border-slate-100 bg-slate-50 hover:bg-white',
                      sinCupos && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {seccion.grado.nombre_grado} "{seccion.letra}"
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {seccion.grado.nivel?.nombre_nivel || 'Nivel'} · {seccion.capacidad} cupos
                        </p>
                      </div>

                      {selected && <CheckCircle2 size={18} className="text-accent-600" />}
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${porcentaje}%` }} />
                    </div>

                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {seccion.matriculados} registrados · {seccion.disponibles} disponibles
                    </p>
                  </button>
                );
              })}
            </div>

            {!seccionesFiltradas.length && (
              <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                Selecciona año destino o crea secciones para ese año.
              </p>
            )}

            {seccionDestino && (
              <div className="mt-5 rounded-3xl bg-emerald-50 p-5 text-sm font-bold leading-6 text-emerald-800 ring-1 ring-emerald-100">
                Destino seleccionado: {colegioDestino?.nombre_corto || colegioDestino?.nombre} ·{' '}
                {seccionDestino.grado.nombre_grado} "{seccionDestino.letra}" ·{' '}
                {seccionDestino.grado.nivel?.nombre_nivel || 'Nivel'}.
              </div>
            )}

            <label className="mt-5 block">
              <Label>Observación del proceso</Label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder="Ej. Renovación anticipada por campaña noviembre-diciembre."
              />
            </label>

            {!puedeRenovar && alumno && (
              <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-700 ring-1 ring-amber-100">
                Revisa que exista matrícula origen vigente, año destino, sección destino y apoderados vinculados. También valida que no exista otro proceso para el mismo año destino.
              </div>
            )}

            <button
              type="button"
              disabled={!puedeRenovar || guardando}
              onClick={registrarRenovacion}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white shadow-lg shadow-accent-500/20 transition hover:-translate-y-0.5 hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
              Registrar renovación / re-matrícula
            </button>
          </Card>
        </section>
      </div>
    </div>
  );
}
