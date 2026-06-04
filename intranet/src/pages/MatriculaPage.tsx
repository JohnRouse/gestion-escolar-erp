import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

type PersonaForm = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento?: string;
  genero?: string;
  telefono: string;
  correo: string;
  direccion: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ocupacion?: string;
};

type Alumno = {
  id_persona: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  pais?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  estudiantes: {
    id_persona: number;
    codigo_estudiante: string;
    apoderados?: {
      parentesco: string;
      apoderado: {
        id_persona: number;
        ocupacion?: string | null;
        persona: {
          id_persona: number;
          dni: string;
          nombres: string;
          apellido_paterno: string;
          apellido_materno: string;
          telefono?: string | null;
          correo?: string | null;
          direccion?: string | null;
          pais?: string | null;
          departamento?: string | null;
          provincia?: string | null;
          distrito?: string | null;
        };
      };
    }[];
    matriculas: {
      id_matricula: number;
      estado_matricula: string;
      id_colegio?: number;
      colegio?: { nombre: string; codigo?: string | null };
      anio?: { nombre_anio: string };
      seccion?: {
        letra: string;
        grado: {
          id_grado?: number;
          nombre_grado: string;
          nivel?: { id_nivel?: number; nombre_nivel: string };
        };
      };
    }[];
  }[];
};

type Apoderado = {
  id_persona: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  pais?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  parentesco?: string;
  apoderado?: {
    id_persona: number;
    ocupacion?: string | null;
  };
};

type Anio = {
  id_anio: number;
  id_tenant?: number | null;
  id_colegio?: number | null;
  nombre_anio: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: string;
};

type Seccion = {
  id_seccion: number;
  label?: string;
  letra: string;
  capacidad: number;
  matriculados: number;
  disponibles: number;
  grado: {
    nombre_grado: string;
    nivel?: { nombre_nivel: string };
  };
};

type ReglaEdad = {
  edad: number;
  permiteExcepcionTraslado: boolean;
  label: string;
};

type CodigoColegio = {
  id_estudiante: number;
  id_colegio: number;
  codigo: string;
};

interface UltimaMatricula {
  id_matricula: number;
  id_colegio?: number | null;
  fecha_matricula: string;
  estado_matricula?: string;
  colegio?: { nombre: string; codigo?: string | null };
  anio?: { nombre_anio: string };
  registrado_por?: {
    username: string;
    rol?: { nombre_rol: string };
    persona?: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno?: string;
    };
  } | null;
  estudiante: {
    codigo_estudiante?: string;
    codigos_colegio?: CodigoColegio[];
    persona: {
      dni?: string;
      nombres: string;
      apellido_paterno: string;
    };
  };
  seccion: {
    letra: string;
    grado: {
      nombre_grado: string;
      nivel?: { nombre_nivel: string };
    };
  };
}

const emptyAlumno: PersonaForm = {
  dni: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  genero: '',
  telefono: '',
  correo: '',
  direccion: '',
  pais: 'Perú',
  departamento: '',
  provincia: '',
  distrito: '',
};

const emptyApoderado: PersonaForm = {
  dni: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  telefono: '',
  correo: '',
  direccion: '',
  pais: 'Perú',
  departamento: '',
  provincia: '',
  distrito: '',
  ocupacion: '',
};

const parentescos = [
  'Madre',
  'Padre',
  'Abuela',
  'Abuelo',
  'Tía',
  'Tío',
  'Tutor legal',
  'Otro',
];

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const selectClass = inputClass;

const darkButtonClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

const outlineButtonClass =
  'mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const buildQuery = (
  base: string,
  extra: Record<string, string | number | undefined | null>,
) => {
  const params = new URLSearchParams(base.replace('?', ''));

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

const normalizarFechaLocal = (value: string | Date) => {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
};

const calcularEdadDetallada = (
  fechaNacimiento?: string | null,
  fechaCorte?: Date,
) => {
  if (!fechaNacimiento || !fechaCorte) return null;

  const nacimiento = normalizarFechaLocal(fechaNacimiento);
  const corte = normalizarFechaLocal(fechaCorte);

  if (
    Number.isNaN(nacimiento.getTime()) ||
    Number.isNaN(corte.getTime()) ||
    nacimiento > corte
  ) {
    return null;
  }

  let anios = corte.getFullYear() - nacimiento.getFullYear();
  let meses = corte.getMonth() - nacimiento.getMonth();
  let dias = corte.getDate() - nacimiento.getDate();

  if (dias < 0) {
    meses -= 1;

    const ultimoDiaMesAnterior = new Date(
      corte.getFullYear(),
      corte.getMonth(),
      0,
    ).getDate();

    dias += ultimoDiaMesAnterior;
  }

  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  const partes = [];

  partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);

  if (meses > 0) {
    partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }

  return {
    anios,
    meses,
    dias,
    totalMeses: anios * 12 + meses,
    texto:
      partes.length === 1
        ? partes[0]
        : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`,
  };
};

const edadNumero = (fecha?: string | null) => {
  if (!fecha) return null;

  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad;
};

const edadTexto = (fecha?: string | null) => {
  const edad = edadNumero(fecha);

  if (edad === null) return '—';
  if (edad < 0) return 'Fecha inválida';

  return `${edad} años`;
};

const generoTexto = (genero?: string | null) => {
  if (!genero) return '—';
  if (genero === 'F') return 'Femenino';
  if (genero === 'M') return 'Masculino';
  return genero;
};

const formatFechaHora = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const getCodigoInstitucional = (matricula: {
  id_colegio?: number | null;
  estudiante?: {
    codigo_estudiante?: string | null;
    codigos_colegio?: CodigoColegio[];
  };
}) => {
  const codigoColegio = matricula.estudiante?.codigos_colegio?.find(
    (item) => item.id_colegio === matricula.id_colegio,
  );

  return codigoColegio?.codigo || matricula.estudiante?.codigo_estudiante || 'Sin código';
};

const getCodigoDetalleMatricula = (detalle: any) => {
  if (!detalle) return 'Sin código';

  const codigoColegio = detalle.estudiante?.codigos_colegio?.find(
    (item: CodigoColegio) => item.id_colegio === detalle.id_colegio,
  );

  return codigoColegio?.codigo || detalle.estudiante?.codigo_estudiante || 'Sin código';
};

const validarFechaNacimientoFrontend = (fecha?: string) => {
  if (!fecha) return 'Ingresa la fecha de nacimiento.';

  const nacimiento = new Date(`${fecha}T00:00:00`);
  const hoy = new Date();
  const minima = new Date('1990-01-01T00:00:00');

  if (Number.isNaN(nacimiento.getTime())) {
    return 'La fecha de nacimiento no es válida.';
  }

  if (nacimiento > hoy) {
    return 'La fecha de nacimiento no puede ser futura.';
  }

  if (nacimiento < minima) {
    return 'La fecha de nacimiento parece demasiado antigua. Revisa el dato.';
  }

  return null;
};

export default function MatriculaPage() {
  const { token } = useAuth();
  const {
    activeScope,
    activeColegio,
    colegios,
    scopeLabel,
    queryString,
    puedeVerConsolidado,
  } = useSchool();

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [colegioDestinoId, setColegioDestinoId] = useState<number | ''>('');
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [anios, setAnios] = useState<Anio[]>([]);
  const [anioId, setAnioId] = useState<number | ''>('');
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [gradoFiltro, setGradoFiltro] = useState('');
  const [seccionId, setSeccionId] = useState<number | ''>('');
  const [ultimas, setUltimas] = useState<UltimaMatricula[]>([]);

  const [loadingBase, setLoadingBase] = useState(false);
  const [buscandoAlumno, setBuscandoAlumno] = useState(false);
  const [matriculando, setMatriculando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [apoderadoDni, setApoderadoDni] = useState('');
  const [parentesco, setParentesco] = useState('Madre');
  const [buscandoApoderado, setBuscandoApoderado] = useState(false);
  const [apoderadoEncontrado, setApoderadoEncontrado] =
    useState<Apoderado | null>(null);
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);

  const [modalAlumno, setModalAlumno] = useState(false);
  const [modalApoderado, setModalApoderado] = useState(false);
  const [formAlumno, setFormAlumno] = useState<PersonaForm>(emptyAlumno);
  const [formApoderado, setFormApoderado] =
    useState<PersonaForm>(emptyApoderado);
  const [savingPersona, setSavingPersona] = useState(false);
  const [errorPersona, setErrorPersona] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleMatricula, setDetalleMatricula] = useState<any | null>(null);
  const [cronogramaOpen, setCronogramaOpen] = useState(false);

  const [modalEditarAlumno, setModalEditarAlumno] = useState(false);
  const [excepcionTraslado, setExcepcionTraslado] = useState(false);

  const [tipoIngreso, setTipoIngreso] = useState('Nuevo');
  const [colegioProcedencia, setColegioProcedencia] = useState('');
  const [codigoModularProcedencia, setCodigoModularProcedencia] = useState('');
  const [gradoProcedencia, setGradoProcedencia] = useState('');
  const [observacionProcedencia, setObservacionProcedencia] = useState('');

  const estudiante = alumno?.estudiantes?.[0] || null;

  const estadosMatriculaBloqueantes = [
    'Activo',
    'Pre-matriculado',
    'Reserva',
    'Pendiente',
  ];

  const colegioDestinoQuery = useMemo(() => {
    if (activeScope.tipo === 'colegio') return queryString;
    if (colegioDestinoId) return `?colegio_id=${colegioDestinoId}`;
    return queryString;
  }, [activeScope.tipo, colegioDestinoId, queryString]);

  const colegioDestinoNombre = useMemo(() => {
    if (activeScope.tipo === 'colegio') {
      return (
        activeColegio?.nombre_corto ||
        activeColegio?.nombre ||
        'Colegio activo'
      );
    }

    if (!colegioDestinoId) return 'Por seleccionar';

    const colegio = colegios.find(
      (item) => item.id_colegio === colegioDestinoId,
    );

    return colegio?.nombre_corto || colegio?.nombre || 'Colegio seleccionado';
  }, [activeScope.tipo, activeColegio, colegioDestinoId, colegios]);

  const anioSeleccionado = useMemo(
    () => anios.find((item) => item.id_anio === anioId) || null,
    [anioId, anios],
  );

  const getEstadoOperativoAnioFrontend = (anio?: Anio | null) => {
    const estado = String(anio?.estado || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (['cerrado', 'archivado'].includes(estado)) return 'Cerrado';
    if (estado.includes('planificacion')) return 'Planificación';
    if (estado.includes('matricula') || estado === 'abierto') return 'Matrícula abierta';
    if (estado === 'activo' || estado.includes('curso')) return 'En curso';

    return anio?.estado || 'Planificación';
  };

  const esAnioDisponibleParaRegistro = (anio?: Anio | null) => {
    if (!anio) return false;

    const estadoOperativo = getEstadoOperativoAnioFrontend(anio);

    if (estadoOperativo === 'Cerrado' || estadoOperativo === 'Archivado') {
      return false;
    }

    if (anio.fecha_fin) {
      const fechaFin = new Date(`${String(anio.fecha_fin).slice(0, 10)}T23:59:59`);
      if (!Number.isNaN(fechaFin.getTime()) && fechaFin < new Date()) {
        return false;
      }
    }

    return true;
  };

  const getAnioCorteFrontend = () => {
    const desdeNombre = anioSeleccionado?.nombre_anio?.match(/\d{4}/)?.[0];

    if (desdeNombre) return Number(desdeNombre);

    if (anioSeleccionado?.fecha_inicio) {
      const fecha = new Date(anioSeleccionado.fecha_inicio);
      if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
    }

    return new Date().getFullYear();
  };

  const getAnioCorteMatriculaFrontend = (matricula: any) => {
    const desdeNombre = matricula?.anio?.nombre_anio?.match(/\d{4}/)?.[0];

    if (desdeNombre) return Number(desdeNombre);

    if (matricula?.anio?.fecha_inicio) {
      const fecha = new Date(matricula.anio.fecha_inicio);
      if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
    }

    return null;
  };

  const aniosDisponibles = useMemo(
    () => anios.filter((anio) => esAnioDisponibleParaRegistro(anio)),
    [anios],
  );

  const tiposIngresoPermitidos = useMemo(() => {
    if (!anioSeleccionado || !esAnioDisponibleParaRegistro(anioSeleccionado)) {
      return [];
    }

    const estadoOperativo = getEstadoOperativoAnioFrontend(anioSeleccionado);

    if (estadoOperativo === 'Planificación') {
      return ['Reserva'];
    }

    const anioCorte = getAnioCorteFrontend();
    const corteRegular = new Date(`${anioCorte}-03-31T23:59:59`);
    const hoy = new Date();

    const fechaInicio = anioSeleccionado.fecha_inicio
      ? new Date(`${String(anioSeleccionado.fecha_inicio).slice(0, 10)}T00:00:00`)
      : null;

    const fechaFin = anioSeleccionado.fecha_fin
      ? new Date(`${String(anioSeleccionado.fecha_fin).slice(0, 10)}T23:59:59`)
      : null;

    const estaEnCurso =
      fechaInicio && fechaFin && hoy >= fechaInicio && hoy <= fechaFin;

    const pasoCorteRegular = hoy > corteRegular;

    if (estadoOperativo === 'En curso' || (estaEnCurso && pasoCorteRegular)) {
      return ['Traslado', 'Reingreso', 'Regularización'];
    }

    if (estadoOperativo === 'Matrícula abierta') {
      return ['Nuevo', 'Traslado', 'Reingreso', 'Continuidad interna'];
    }

    return ['Nuevo', 'Traslado', 'Reingreso', 'Continuidad interna'];
  }, [anioSeleccionado, anioId, anios]);

  useEffect(() => {
    if (!anioId) return;

    if (!tiposIngresoPermitidos.length) {
      setTipoIngreso('');
      return;
    }

    if (!tiposIngresoPermitidos.includes(tipoIngreso)) {
      setTipoIngreso(tiposIngresoPermitidos[0]);
      setExcepcionTraslado(false);
    }
  }, [anioId, tiposIngresoPermitidos, tipoIngreso]);

  const avisoPeriodoMatricula = useMemo(() => {
    if (!anioSeleccionado) return null;

    const estadoOperativo = getEstadoOperativoAnioFrontend(anioSeleccionado);
    const hoy = new Date();
    const fechaInicio = anioSeleccionado.fecha_inicio
      ? new Date(anioSeleccionado.fecha_inicio)
      : null;
    const fechaFin = anioSeleccionado.fecha_fin
      ? new Date(anioSeleccionado.fecha_fin)
      : null;
    const anioCorte = getAnioCorteFrontend();
    const corteRegular = new Date(`${anioCorte}-03-31T23:59:59`);

    if (estadoOperativo === 'Cerrado' || (fechaFin && hoy > fechaFin)) {
      return {
        bloquea: true,
        tipo: 'error',
        texto:
          'El año lectivo seleccionado está cerrado o vencido. Selecciona un año lectivo vigente o crea uno nuevo en Configuración > Años lectivos. Recuerda: la fecha de fin del año lectivo debe ser el fin del año escolar, no el cierre de matrícula.',
      };
    }

    if (estadoOperativo === 'Planificación') {
      if (tipoIngreso !== 'Reserva') {
        return {
          bloquea: true,
          tipo: 'warning',
          texto:
            'Este año lectivo todavía está en planificación. Para este periodo solo puedes registrar reservas. Cambia el tipo de ingreso a Reserva o cambia el estado del año a Matrícula abierta si ya iniciarán el proceso.',
        };
      }

      return {
        bloquea: false,
        tipo: 'info',
        texto:
          'Se registrará como reserva. No se generará cobro ni activación hasta que el año lectivo pase a Matrícula abierta o En curso.',
      };
    }

    const tiposPermitidosEnCurso = ['Traslado', 'Reingreso', 'Regularización'];
    const estaEnCurso = fechaInicio && fechaFin && hoy >= fechaInicio && hoy <= fechaFin;
    const pasoCorteRegular = hoy > corteRegular;

    if (estadoOperativo === 'En curso' || (estaEnCurso && pasoCorteRegular)) {
      if (!tiposPermitidosEnCurso.includes(tipoIngreso)) {
        return {
          bloquea: true,
          tipo: 'warning',
          texto:
            'La matrícula regular de este año ya está cerrada. En periodo en curso solo se permiten Traslado, Reingreso o Regularización autorizada. Si deseas reservar para el próximo año, crea/selecciona el año lectivo siguiente y usa tipo de ingreso Reserva.',
        };
      }

      return {
        bloquea: false,
        tipo: 'info',
        texto:
          'Periodo en curso: se permitirá continuar porque el tipo de ingreso corresponde a traslado, reingreso o regularización autorizada.',
      };
    }

    if (tipoIngreso === 'Reserva') {
      return {
        bloquea: true,
        tipo: 'warning',
        texto:
          'El tipo Reserva debe usarse para años futuros o en planificación. Para el año en curso usa Traslado, Reingreso o Regularización autorizada.',
      };
    }

    return null;
  }, [anioSeleccionado, tipoIngreso, anioId]);

  const edadAl31Marzo = (fecha?: string | null) => {
    if (!fecha) return null;

    const anioCorte = getAnioCorteFrontend();
    const corte = new Date(`${anioCorte}-03-31T23:59:59`);

    return calcularEdadDetallada(fecha, corte);
  };

  const niveles = useMemo(
    () =>
      Array.from(
        new Set(
          secciones.map((s) => s.grado?.nivel?.nombre_nivel).filter(Boolean),
        ),
      ) as string[],
    [secciones],
  );

  const grados = useMemo(
    () =>
      Array.from(
        new Set(
          secciones
            .filter(
              (s) =>
                !nivelFiltro || s.grado?.nivel?.nombre_nivel === nivelFiltro,
            )
            .map((s) => s.grado?.nombre_grado)
            .filter(Boolean),
        ),
      ) as string[],
    [nivelFiltro, secciones],
  );

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter(
        (s) =>
          (!nivelFiltro || s.grado?.nivel?.nombre_nivel === nivelFiltro) &&
          (!gradoFiltro || s.grado?.nombre_grado === gradoFiltro),
      ),
    [gradoFiltro, nivelFiltro, secciones],
  );

  const seccionSeleccionada = useMemo(
    () => secciones.find((s) => s.id_seccion === seccionId) || null,
    [seccionId, secciones],
  );

  const reglaEdadSeleccionada = (): ReglaEdad | null => {
    if (!seccionSeleccionada) return null;

    const nivel =
      seccionSeleccionada.grado?.nivel?.nombre_nivel?.toLowerCase() || '';
    const grado = seccionSeleccionada.grado?.nombre_grado?.toLowerCase() || '';

    if (nivel.includes('inicial')) {
      const edad = Number(grado.match(/\d+/)?.[0]);

      if (edad >= 3 && edad <= 5) {
        return {
          edad,
          permiteExcepcionTraslado: false,
          label: `Inicial ${edad} años`,
        };
      }
    }

    if (nivel.includes('primaria')) {
      const gradoNumero =
        grado.includes('primer') || grado.includes('1')
          ? 1
          : grado.includes('segundo') || grado.includes('2')
            ? 2
            : grado.includes('tercer') || grado.includes('3')
              ? 3
              : grado.includes('cuarto') || grado.includes('4')
                ? 4
                : grado.includes('quinto') || grado.includes('5')
                  ? 5
                  : grado.includes('sexto') || grado.includes('6')
                    ? 6
                    : null;

      if (gradoNumero) {
        return {
          edad: 5 + gradoNumero,
          permiteExcepcionTraslado: gradoNumero >= 2,
          label: `${gradoNumero}.° de primaria`,
        };
      }
    }

    return null;
  };

  const errorEdadNormativa = useMemo(() => {
    if (!alumno || !seccionSeleccionada) return null;

    const edadCorte = edadAl31Marzo(alumno.fecha_nacimiento);
    const regla = reglaEdadSeleccionada();
    const anioCorte = getAnioCorteFrontend();

    if (!regla || !edadCorte) return null;

    if (edadCorte.anios >= regla.edad) return null;

    if (regla.permiteExcepcionTraslado && excepcionTraslado) return null;

    return `El alumno no cumple la edad para ${regla.label}. Para este año lectivo debe tener ${regla.edad} años cumplidos al 31 de marzo de ${anioCorte}. Edad al corte: ${edadCorte.texto}.`;
  }, [alumno, seccionSeleccionada, anioId, excepcionTraslado]);

  const avisoEdadFichaAlumno = useMemo(() => {
    if (!formAlumno.fecha_nacimiento) return null;

    const anioCorte = getAnioCorteFrontend();
    const corte = new Date(`${anioCorte}-03-31T23:59:59`);
    const edad = calcularEdadDetallada(formAlumno.fecha_nacimiento, corte);

    if (!edad) return null;

    if (edad.anios < 3) {
      return `Aviso: para el año lectivo ${anioCorte}, el alumno tendría ${edad.texto} al 31 de marzo. Puedes guardar su ficha como prospecto, pero no podrá matricularse en Inicial 3 años de ese periodo.`;
    }

    return null;
  }, [formAlumno.fecha_nacimiento, anioId]);

  const matriculaActiva = useMemo(() => {
    if (!estudiante?.matriculas?.length) return null;

    const matriculasBloqueantes = estudiante.matriculas.filter((m) =>
      estadosMatriculaBloqueantes.includes(m.estado_matricula),
    );

    if (!matriculasBloqueantes.length) return null;

    if (anioId) {
      const anioCorteDestino = getAnioCorteFrontend();

      const mismaGestion = matriculasBloqueantes.find((m) => {
        const anioCorteMatricula = getAnioCorteMatriculaFrontend(m);
        return anioCorteMatricula === anioCorteDestino;
      });

      if (mismaGestion) return mismaGestion;
    }

    if (activeScope.tipo === 'colegio') {
      const mismaSede = matriculasBloqueantes.find(
        (m) => m.id_colegio === activeScope.id_colegio,
      );

      if (mismaSede) return mismaSede;
    }

    if (colegioDestinoId) {
      const mismaSedeDestino = matriculasBloqueantes.find(
        (m) => m.id_colegio === colegioDestinoId,
      );

      if (mismaSedeDestino) return mismaSedeDestino;
    }

    return null;
  }, [activeScope, colegioDestinoId, estudiante?.matriculas, anioId]);

  const alertaEdad = useMemo(() => {
    if (!alumno || !seccionSeleccionada) return null;

    const edad = edadNumero(alumno.fecha_nacimiento);
    if (edad === null) return null;

    if (edad < 0) {
      return 'La fecha de nacimiento del alumno es futura o inválida.';
    }

    const nivel =
      seccionSeleccionada.grado?.nivel?.nombre_nivel?.toLowerCase() || '';

    if (nivel.includes('primaria') && edad < 6) {
      return 'El alumno parece menor para Primaria.';
    }

    if (nivel.includes('secundaria') && edad < 11) {
      return 'El alumno parece menor para Secundaria.';
    }

    if (nivel.includes('inicial') && edad > 6) {
      return 'El alumno parece mayor para Inicial.';
    }

    return null;
  }, [alumno, seccionSeleccionada]);

  const colegioDestinoRequerido = useMemo(() => {
    return activeScope.tipo === 'todos' && !colegioDestinoId;
  }, [activeScope.tipo, colegioDestinoId]);

  function formatMatriculaActiva(matricula: any) {
    if (!matricula) return '';

    const colegio = matricula.colegio?.nombre || 'colegio registrado';
    const anio = matricula.anio?.nombre_anio || 'año lectivo';
    const grado = matricula.seccion?.grado?.nombre_grado || 'grado';
    const letra = matricula.seccion?.letra || '-';
    const nivel = matricula.seccion?.grado?.nivel?.nombre_nivel || 'nivel';
    const estado = matricula.estado_matricula || 'matriculado';

    if (estado === 'Reserva') {
      return `Este alumno ya tiene una reserva registrada en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}. Puedes revisar el detalle para continuar el proceso.`;
    }

    if (estado === 'Pre-matriculado') {
      return `Este alumno ya está pre-matriculado en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}. Puedes revisar el detalle para aprobar, registrar pago o activar la matrícula.`;
    }

    if (estado === 'Activo') {
      return `Este alumno ya tiene matrícula activa en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`;
    }

    return `Este alumno ya figura como ${estado} en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`;
  }

  function irADetalleMatriculaActiva(matricula: any) {
    if (!matricula?.id_matricula) return;

    const params = new URLSearchParams();
    params.set('matricula_id', String(matricula.id_matricula));

    if (matricula.id_colegio) {
      params.set('colegio_id', String(matricula.id_colegio));
    }

    navigate(`/matricula/historial?${params.toString()}`);
  }

  const mensajeValidacionMatricula = useMemo(() => {
    if (colegioDestinoRequerido) {
      return {
        tipo: 'info' as const,
        texto:
          'Selecciona el colegio destino en el bloque derecho. Estás trabajando con todos los colegios, por eso el sistema necesita saber en qué sede se registrará la matrícula.',
      };
    }

    if (!alumno) {
      return {
        tipo: 'info' as const,
        texto: 'Busca o registra primero al alumno que deseas matricular.',
      };
    }

    // La tarjeta visual ya informa que existe matrícula, no es necesario duplicar aquí
    if (!apoderados.length) {
      return {
        tipo: 'warning' as const,
        texto:
          'El alumno debe tener al menos un apoderado vinculado antes de registrar la matrícula.',
      };
    }

    if (!anioId) {
      return {
        tipo: 'info' as const,
        texto: 'Selecciona el año lectivo de la matrícula.',
      };
    }

    if (!seccionId) {
      return {
        tipo: 'info' as const,
        texto: 'Selecciona el grado y sección donde se registrará al alumno.',
      };
    }

    if (avisoPeriodoMatricula?.bloquea) {
      return {
        tipo: avisoPeriodoMatricula.tipo as 'error' | 'warning' | 'info',
        texto: avisoPeriodoMatricula.texto,
      };
    }

    if (errorEdadNormativa) {
      return {
        tipo: 'error' as const,
        texto: errorEdadNormativa,
      };
    }

    if (avisoPeriodoMatricula) {
      return {
        tipo: avisoPeriodoMatricula.tipo as 'error' | 'warning' | 'info',
        texto: avisoPeriodoMatricula.texto,
      };
    }

    return null;
  }, [
    colegioDestinoRequerido,
    alumno,
    apoderados.length,
    anioId,
    seccionId,
    avisoPeriodoMatricula,
    errorEdadNormativa,
  ]);

  useEffect(() => {
    if (activeScope.tipo === 'colegio' && activeScope.id_colegio) {
      setColegioDestinoId(activeScope.id_colegio);
    }

    if (activeScope.tipo === 'todos') {
      setColegioDestinoId('');
    }

    setAlumno(null);
    setApoderados([]);
    setSeccionId('');
    setAnioId('');
    setMensaje(null);
  }, [activeScope.tipo, activeScope.id_colegio]);

  useEffect(() => {
    if (token) fetchBase();
  }, [token, colegioDestinoId, queryString]);

  useEffect(() => {
    if (token && anioId) fetchSecciones(Number(anioId));
  }, [token, anioId, colegioDestinoId, queryString]);

  const fetchBase = async () => {
    if (!token) return;

    setLoadingBase(true);

    try {
      const [ultimasRes, aniosRes] = await Promise.all([
        axios.get(`/api/academicos/matriculas/ultimas${colegioDestinoQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/academicos/anios${colegioDestinoQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const aniosData: Anio[] = aniosRes.data || [];

      setUltimas((ultimasRes.data || []).slice(0, 5));
      setAnios(aniosData);

      const estadoNormalizado = (estado?: string) =>
        String(estado || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      const fechaNoVencida = (a: Anio) => {
        if (!a.fecha_fin) return true;

        const fechaFin = new Date(`${String(a.fecha_fin).slice(0, 10)}T23:59:59`);
        return Number.isNaN(fechaFin.getTime()) || fechaFin >= new Date();
      };

      const aniosRegistrables = aniosData.filter((a) => {
        const estado = estadoNormalizado(a.estado);
        return !['cerrado', 'archivado'].includes(estado) && fechaNoVencida(a);
      });

      const activo =
        aniosRegistrables.find((a) => estadoNormalizado(a.estado).includes('matricula')) ||
        aniosRegistrables.find((a) => estadoNormalizado(a.estado) === 'abierto') ||
        aniosRegistrables.find((a) => estadoNormalizado(a.estado).includes('curso')) ||
        aniosRegistrables.find((a) => estadoNormalizado(a.estado) === 'activo') ||
        aniosRegistrables.find((a) => estadoNormalizado(a.estado).includes('planificacion')) ||
        aniosRegistrables[0] ||
        '';

      const resolved = activo ? activo.id_anio : '';

      setAnioId((current) => current || resolved);

      if (resolved) await fetchSecciones(Number(resolved));
    } catch {
      setUltimas([]);
      setAnios([]);
      setSecciones([]);
    } finally {
      setLoadingBase(false);
    }
  };

  const fetchSecciones = async (idAnio: number) => {
    if (!token) return;

    const query = buildQuery(colegioDestinoQuery, { anio_id: idAnio });

    try {
      const res = await axios.get(`/api/academicos/secciones${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSecciones(res.data || []);
    } catch {
      setSecciones([]);
    }
  };

  const abrirDetalleMatricula = async (idMatricula: number) => {
    if (!token) return;

    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleMatricula(null);
    setCronogramaOpen(false);

    try {
      const res = await axios.get(
        `/api/academicos/matriculas/${idMatricula}/detalle${colegioDestinoQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setDetalleMatricula(res.data);
    } catch (error: any) {
      setMensaje(
        error.response?.data?.message ||
          'No se pudo cargar el detalle de matrícula.',
      );
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const imprimirDetalleMatricula = () => {
    window.print();
  };

  const apoderadosDesdeAlumno = (alumnoData: Alumno): Apoderado[] => {
    const estudianteData = alumnoData.estudiantes?.[0];

    if (!estudianteData?.apoderados?.length) return [];

    return estudianteData.apoderados.map((relacion) => ({
      id_persona: relacion.apoderado.id_persona,
      dni: relacion.apoderado.persona.dni,
      nombres: relacion.apoderado.persona.nombres,
      apellido_paterno: relacion.apoderado.persona.apellido_paterno,
      apellido_materno: relacion.apoderado.persona.apellido_materno,
      telefono: relacion.apoderado.persona.telefono,
      correo: relacion.apoderado.persona.correo,
      direccion: relacion.apoderado.persona.direccion,
      pais: relacion.apoderado.persona.pais,
      departamento: relacion.apoderado.persona.departamento,
      provincia: relacion.apoderado.persona.provincia,
      distrito: relacion.apoderado.persona.distrito,
      apoderado: {
        id_persona: relacion.apoderado.id_persona,
        ocupacion: relacion.apoderado.ocupacion,
      },
      parentesco: relacion.parentesco,
    }));
  };

  const buscarAlumnoPorDni = async (dniBusqueda: string) => {
    if (!token || !dniBusqueda.trim()) return;

    setBuscandoAlumno(true);
    setMensaje(null);
    setApoderados([]);

    try {
      const query = puedeVerConsolidado
        ? '&scope=all'
        : colegioDestinoQuery
          ? `&${colegioDestinoQuery.replace('?', '')}`
          : '';

      const res = await axios.get(
        `/api/academicos/alumnos/buscar?dni=${dniBusqueda.trim()}${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setAlumno(res.data);
      setApoderados(apoderadosDesdeAlumno(res.data));
      setSeccionId('');
      setNivelFiltro('');
      setGradoFiltro('');
      setMensaje(null);

      // La tarjeta visual informa si tiene matrícula bloqueante, no mostramos toast.
    } catch (err: any) {
      setAlumno(null);
      setMensaje(err.response?.data?.message || 'No se encontró el alumno.');
    } finally {
      setBuscandoAlumno(false);
    }
  };

  const buscarAlumno = () => buscarAlumnoPorDni(dni);

  const buscarApoderadoPorDni = async (dniBusqueda: string) => {
    if (!token || !dniBusqueda.trim()) return;

    setBuscandoApoderado(true);
    setMensaje(null);

    try {
      const res = await axios.get(
        `/api/academicos/apoderados/buscar?dni=${dniBusqueda.trim()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setApoderadoEncontrado(res.data);
      return res.data;
    } catch (err: any) {
      setApoderadoEncontrado(null);
      setMensaje(err.response?.data?.message || 'No se encontró el apoderado.');
      return null;
    } finally {
      setBuscandoApoderado(false);
    }
  };

  const buscarApoderado = () => buscarApoderadoPorDni(apoderadoDni);

  const agregarApoderado = async (apoderado: Apoderado) => {
    if (!estudiante?.id_persona || !token) {
      setMensaje('Primero debes buscar o registrar un alumno.');
      return;
    }

    if (apoderados.some((item) => item.id_persona === apoderado.id_persona)) {
      setMensaje('Este apoderado ya está vinculado al alumno.');
      return;
    }

    const parentescoSeleccionado =
      apoderado.parentesco || parentesco || 'Apoderado';

    try {
      await axios.post(
        `/api/academicos/alumnos/${estudiante.id_persona}/apoderados`,
        {
          id_apoderado: apoderado.id_persona,
          parentesco: parentescoSeleccionado,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setApoderados([
        ...apoderados,
        {
          ...apoderado,
          parentesco: parentescoSeleccionado,
        },
      ]);

      setMensaje(null);
      showToast({
        type: 'success',
        title: 'Apoderado vinculado',
        message: `${parentescoSeleccionado} agregado correctamente a la ficha del alumno.`,
      });

      setApoderadoEncontrado(null);
      setApoderadoDni('');
      setParentesco('Madre');
    } catch (error: any) {
      setMensaje(
        error.response?.data?.message || 'No se pudo vincular el apoderado.',
      );
    }
  };

  const crearPersona = async (tipo: 'alumno' | 'apoderado') => {
    if (!token) return;

    const form = tipo === 'alumno' ? formAlumno : formApoderado;

    if (
      !form.dni ||
      !form.nombres ||
      !form.apellido_paterno ||
      !form.apellido_materno
    ) {
      setErrorPersona('Completa DNI, nombres y apellidos.');
      return;
    }

    if (tipo === 'alumno') {
      const errorFecha = validarFechaNacimientoFrontend(form.fecha_nacimiento);

      if (errorFecha) {
        setErrorPersona(errorFecha);
        return;
      }
    }

    setSavingPersona(true);
    setErrorPersona(null);

    try {
      const res = await axios.post(
        tipo === 'alumno'
          ? '/api/academicos/alumnos'
          : '/api/academicos/apoderados',
        {
          ...form,
          pais: form.pais || 'Perú',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (tipo === 'alumno') {
        setDni(form.dni);
        setModalAlumno(false);
        setFormAlumno(emptyAlumno);

        showToast({
          type: 'success',
          title: 'Alumno registrado',
          message: 'La ficha del alumno se guardó correctamente.',
        });

        await buscarAlumnoPorDni(form.dni);
      } else {
        const parentescoNuevo = parentesco || 'Apoderado';

        const apoderadoCreado: Apoderado = {
          id_persona: res.data?.apoderado?.id_persona || res.data?.persona?.id_persona,
          dni: res.data?.persona?.dni || form.dni,
          nombres: res.data?.persona?.nombres || form.nombres,
          apellido_paterno: res.data?.persona?.apellido_paterno || form.apellido_paterno,
          apellido_materno: res.data?.persona?.apellido_materno || form.apellido_materno,
          telefono: res.data?.persona?.telefono || form.telefono,
          correo: res.data?.persona?.correo || form.correo,
          direccion: res.data?.persona?.direccion || form.direccion,
          pais: res.data?.persona?.pais || form.pais,
          departamento: res.data?.persona?.departamento || form.departamento,
          provincia: res.data?.persona?.provincia || form.provincia,
          distrito: res.data?.persona?.distrito || form.distrito,
          parentesco: parentescoNuevo,
          apoderado: {
            id_persona: res.data?.apoderado?.id_persona || res.data?.persona?.id_persona,
            ocupacion: res.data?.apoderado?.ocupacion || form.ocupacion,
          },
        };

        setApoderadoDni(form.dni);
        setModalApoderado(false);
        setFormApoderado(emptyApoderado);

        showToast({
          type: 'success',
          title: 'Apoderado registrado',
          message: 'La ficha del apoderado se guardó correctamente.',
        });

        if (estudiante?.id_persona) {
          await agregarApoderado(apoderadoCreado);
        } else {
          setApoderadoEncontrado(apoderadoCreado);
        }
      }
    } catch (err: any) {
      setErrorPersona(
        err.response?.data?.message || 'No se pudo guardar el registro.',
      );
    } finally {
      setSavingPersona(false);
    }
  };

  const editarAlumno = async () => {
    if (!token || !estudiante?.id_persona) return;

    const errorFecha = validarFechaNacimientoFrontend(formAlumno.fecha_nacimiento);

    if (errorFecha) {
      setErrorPersona(errorFecha);
      return;
    }

    setSavingPersona(true);
    setErrorPersona(null);

    try {
      const res = await axios.put(
        `/api/academicos/alumnos/${estudiante.id_persona}`,
        {
          ...formAlumno,
          pais: formAlumno.pais || 'Perú',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setAlumno(res.data);
      setApoderados(apoderadosDesdeAlumno(res.data));
      setModalEditarAlumno(false);
      setMensaje(null);
      showToast({
        type: 'success',
        title: 'Alumno actualizado',
        message: 'Los datos del alumno se actualizaron correctamente.',
      });
    } catch (err: any) {
      setErrorPersona(
        err.response?.data?.message || 'No se pudo actualizar el alumno.',
      );
    } finally {
      setSavingPersona(false);
    }
  };

  const resetProcedencia = () => {
    setTipoIngreso('Nuevo');
    setColegioProcedencia('');
    setCodigoModularProcedencia('');
    setGradoProcedencia('');
    setObservacionProcedencia('');
  };

  const limpiarFlujoMatricula = () => {
    setDni('');
    setAlumno(null);
    setApoderados([]);
    setApoderadoDni('');
    setApoderadoEncontrado(null);
    setParentesco('Madre');
    setSeccionId('');
    setNivelFiltro('');
    setGradoFiltro('');
    setExcepcionTraslado(false);
    setMensaje(null);
    resetProcedencia();
  };

  const revisarMatricula = () => {
    if (!alumno || !estudiante) {
      return setMensaje('Primero busca o registra un alumno.');
    }

    if (colegioDestinoRequerido) {
      setMensaje(
        'Selecciona el colegio destino en el bloque derecho. Estás trabajando con todos los colegios, por eso el sistema necesita saber en qué sede se registrará la matrícula.',
      );
      return;
    }

    if (mensajeValidacionMatricula) {
      if (
        mensajeValidacionMatricula.tipo === 'error' ||
        mensajeValidacionMatricula.tipo === 'warning'
      ) {
        setMensaje(mensajeValidacionMatricula.texto);
        return;
      }
    }

    if (!anioId || !seccionId) {
      return setMensaje('Selecciona año lectivo y sección.');
    }

    if (!apoderados.length) {
      return setMensaje('Debes vincular al menos un apoderado.');
    }

    if (matriculaActiva) {
      // La tarjeta informativa ya indica que hay una matrícula, no bloqueamos.
      setConfirmOpen(true);
      return;
    }

    setConfirmOpen(true);
  };

  const registrarMatricula = async () => {
    if (!token || !estudiante || !anioId || !seccionId) return;

    setMatriculando(true);
    setMensaje(null);

    try {
      const res = await axios.post(
        `/api/academicos/matriculas${colegioDestinoQuery}`,
        {
          id_estudiante: estudiante.id_persona,
          id_anio: Number(anioId),
          id_seccion: Number(seccionId),
          id_colegio: Number(colegioDestinoId || activeColegio?.id_colegio),
          apoderados: apoderados.map((a) => ({
            id_apoderado: a.id_persona,
            parentesco: a.parentesco || 'Apoderado',
          })),
          excepcion_traslado: excepcionTraslado,
          tipo_ingreso: tipoIngreso,
          colegio_procedencia: colegioProcedencia,
          codigo_modular_procedencia: codigoModularProcedencia,
          grado_procedencia: gradoProcedencia,
          observacion_procedencia: observacionProcedencia,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const estadoGuardado = res.data?.estado_matricula || tipoIngreso;

      showToast({
        type: 'success',
        title:
          estadoGuardado === 'Reserva' || tipoIngreso === 'Reserva'
            ? 'Reserva registrada'
            : 'Pre-matrícula registrada',
        message:
          estadoGuardado === 'Reserva' || tipoIngreso === 'Reserva'
            ? 'La reserva se guardó correctamente.'
            : 'La pre-matrícula se guardó correctamente.',
      });

      setConfirmOpen(false);
      limpiarFlujoMatricula();

      await fetchBase();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'No se pudo registrar la matrícula.';

      setMensaje(errorMessage);
      showToast({
        type: 'error',
        title: 'No se pudo registrar',
        message: errorMessage,
      });
      setConfirmOpen(false);
    } finally {
      setMatriculando(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Gestión académica"
        title="Gestión de Matrícula"
        description="Busca alumnos, vincula apoderados y confirma la pre-matrícula en el colegio seleccionado."
        icon={GraduationCap}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Colegio destino', value: colegioDestinoNombre },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.65fr]">
        <section className="space-y-5">
          <Card
            icon={Search}
            title="Buscar alumno"
            subtitle="Ingresa el DNI para revisar su ficha."
          >
            <div className="flex gap-2">
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarAlumno()}
                placeholder="DNI del alumno"
                className={inputClass}
              />

              <button
                type="button"
                onClick={buscarAlumno}
                disabled={!dni || buscandoAlumno}
                className={darkButtonClass}
              >
                {buscandoAlumno ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Buscar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormAlumno({ ...emptyAlumno, dni });
                setErrorPersona(null);
                setModalAlumno(true);
              }}
              className={outlineButtonClass}
            >
              <UserPlus size={16} />
              Nuevo alumno
            </button>
          </Card>

          <Card
            icon={Clock}
            title="Últimos registros"
            subtitle="Últimas 5 pre-matrículas y matrículas registradas."
            action={
              <button
                type="button"
                onClick={() => navigate('/matricula/historial')}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100 transition hover:bg-slate-50"
              >
                Ver todas
              </button>
            }
          >
            {loadingBase ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : ultimas.length === 0 ? (
              <Empty text="Sin registros recientes" />
            ) : (
              <div className="space-y-3">
                {ultimas.slice(0, 5).map((matricula) => {
                  const registrador = matricula.registrado_por?.persona
                    ? `${matricula.registrado_por.persona.nombres} ${matricula.registrado_por.persona.apellido_paterno}`
                    : 'No registrado';

                  return (
                    <button
                      key={matricula.id_matricula}
                      type="button"
                      onClick={() =>
                        abrirDetalleMatricula(matricula.id_matricula)
                      }
                      className="w-full rounded-2xl bg-slate-50/80 p-4 text-left ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {getCodigoInstitucional(matricula)} ·{' '}
                            {matricula.estudiante.persona.nombres}{' '}
                            {matricula.estudiante.persona.apellido_paterno}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {matricula.seccion.grado.nombre_grado} "
                            {matricula.seccion.letra}" ·{' '}
                            {matricula.seccion.grado.nivel?.nombre_nivel ||
                              'Nivel'}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {formatFechaHora(matricula.fecha_matricula)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Registrado por: {registrador}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                          {matricula.estado_matricula || 'Registrado'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-5">
          {alumno ? (
            <div className="animate-content-soft rounded-[30px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      {alumno.nombres} {alumno.apellido_paterno}{' '}
                      {alumno.apellido_materno}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                      <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
                        DNI: {alumno.dni}
                      </span>
                      <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">
                        Código: {estudiante?.codigo_estudiante || '—'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFormAlumno({
                          dni: alumno.dni || '',
                          nombres: alumno.nombres || '',
                          apellido_paterno: alumno.apellido_paterno || '',
                          apellido_materno: alumno.apellido_materno || '',
                          fecha_nacimiento: alumno.fecha_nacimiento
                            ? alumno.fecha_nacimiento.slice(0, 10)
                            : '',
                          genero: alumno.genero || '',
                          telefono: alumno.telefono || '',
                          correo: alumno.correo || '',
                          direccion: alumno.direccion || '',
                          pais: alumno.pais || 'Perú',
                          departamento: alumno.departamento || '',
                          provincia: alumno.provincia || '',
                          distrito: alumno.distrito || '',
                        });
                        setErrorPersona(null);
                        setModalEditarAlumno(true);
                      }}
                      className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      Editar datos del alumno
                    </button>
                  </div>

                  {matriculaActiva ? (
                    <Badge tone="amber">
                      {matriculaActiva.estado_matricula}
                    </Badge>
                  ) : (
                    <Badge tone="emerald">Disponible para registro</Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Info
                    icon={CalendarDays}
                    label="Edad"
                    value={edadTexto(alumno.fecha_nacimiento)}
                  />
                  <Info
                    icon={Users}
                    label="Género"
                    value={generoTexto(alumno.genero)}
                  />
                  <Info
                    icon={Phone}
                    label="Teléfono"
                    value={alumno.telefono || '—'}
                  />
                  <Info
                    icon={MapPin}
                    label="Distrito"
                    value={alumno.distrito || '—'}
                  />
                </div>

                {estudiante?.matriculas?.length > 0 && (
                  <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Historial visible
                    </p>

                    <div className="mt-3 space-y-2">
                      {estudiante.matriculas.map((m) => (
                        <div
                          key={m.id_matricula}
                          className="rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100"
                        >
                          <b>
                            {m.seccion?.grado?.nombre_grado || 'Grado'} "
                            {m.seccion?.letra || '-'}"
                          </b>
                          <p className="text-xs text-slate-400">
                            {m.colegio?.nombre || 'Colegio'} ·{' '}
                            {m.anio?.nombre_anio || 'Año lectivo'} ·{' '}
                            {m.estado_matricula}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[30px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Users size={32} className="text-slate-300" />
                <h3 className="mt-4 text-base font-black text-slate-800">
                  Busca un alumno por DNI
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Al encontrarlo podrás vincular apoderados y registrar la
                  pre-matrícula.
                </p>
              </div>
            </div>
          )}

          {alumno && matriculaActiva && (
            <div className="animate-content-soft">
              <Card
                icon={AlertCircle}
                title={
                  matriculaActiva.estado_matricula === 'Reserva'
                    ? 'Alumno con reserva registrada'
                    : matriculaActiva.estado_matricula === 'Pre-matriculado'
                      ? 'Alumno pre-matriculado'
                      : matriculaActiva.estado_matricula === 'Activo'
                        ? 'Alumno con matrícula activa'
                        : 'Matrícula existente'
                }
                subtitle="No es necesario iniciar una nueva matrícula para este alumno."
              >
                <div className="rounded-3xl bg-amber-50 p-5 text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                  {formatMatriculaActiva(matriculaActiva)}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => irADetalleMatriculaActiva(matriculaActiva)}
                    className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    Ver detalle
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDni('');
                      setAlumno(null);
                      setApoderados([]);
                      setMensaje(null);
                    }}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    Buscar otro alumno
                  </button>
                </div>
              </Card>
            </div>
          )}

          {alumno && !matriculaActiva && (
            <>
              {activeScope.tipo === 'todos' && puedeVerConsolidado && (
                <Card
                  icon={MapPin}
                  title="Colegio destino"
                  subtitle="Selecciona la sede donde se registrará la matrícula."
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <label>
                      <Label>Sede de matrícula</Label>
                      <select
                        value={colegioDestinoId}
                        onChange={(e) => {
                          setColegioDestinoId(e.target.value ? Number(e.target.value) : '');
                          setSeccionId('');
                          setAnioId('');
                          setExcepcionTraslado(false);
                          setMensaje(null);
                        }}
                        className={selectClass}
                      >
                        <option value="">Selecciona colegio destino</option>
                        {colegios.map((c) => (
                          <option key={c.id_colegio} value={c.id_colegio}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                      {colegioDestinoId ? colegioDestinoNombre : 'Pendiente'}
                    </div>
                  </div>

                  {!colegioDestinoId && (
                    <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 ring-1 ring-sky-100">
                      Selecciona primero la sede para cargar los años lectivos y secciones disponibles de ese colegio.
                    </p>
                  )}
                </Card>
              )}

              <Card
                icon={ShieldCheck}
                title="Apoderados"
                subtitle="Debes vincular al menos un apoderado."
              >
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
                  <input
                    value={apoderadoDni}
                    onChange={(e) => setApoderadoDni(e.target.value)}
                    placeholder="DNI del apoderado"
                    className={inputClass}
                  />

                  <select
                    value={parentesco}
                    onChange={(e) => setParentesco(e.target.value)}
                    className={selectClass}
                  >
                    {parentescos.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={buscarApoderado}
                    disabled={!apoderadoDni || buscandoApoderado}
                    className={darkButtonClass}
                  >
                    {buscandoApoderado ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    Buscar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormApoderado({
                      ...emptyApoderado,
                      dni: apoderadoDni,
                    });
                    setErrorPersona(null);
                    setModalApoderado(true);
                  }}
                  className={outlineButtonClass}
                >
                  <UserPlus size={16} />
                  Nuevo apoderado
                </button>

                {apoderadoEncontrado && (
                  <div className="animate-content-soft mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {apoderadoEncontrado.nombres}{' '}
                          {apoderadoEncontrado.apellido_paterno}{' '}
                          {apoderadoEncontrado.apellido_materno}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          DNI {apoderadoEncontrado.dni} ·{' '}
                          {apoderadoEncontrado.telefono || 'Sin teléfono'} ·{' '}
                          {apoderadoEncontrado.distrito || 'Sin distrito'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          agregarApoderado({
                            ...apoderadoEncontrado,
                            parentesco,
                          })
                        }
                        className="h-10 rounded-2xl bg-accent-500 px-4 text-xs font-black text-white"
                      >
                        Agregar como {parentesco}
                      </button>
                    </div>
                  </div>
                )}

                {apoderados.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                      Apoderados cargados desde la ficha del alumno
                    </div>

                    {apoderados.map((a) => (
                      <div
                        key={a.id_persona}
                        className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {a.nombres} {a.apellido_paterno}{' '}
                            {a.apellido_materno}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {a.parentesco} · DNI {a.dni} ·{' '}
                            {a.telefono || 'Sin teléfono'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!token || !estudiante?.id_persona) return;

                            try {
                              await axios.delete(
                                `/api/academicos/alumnos/${estudiante.id_persona}/apoderados/${a.id_persona}`,
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );

                              setApoderados(apoderados.filter((x) => x.id_persona !== a.id_persona));
                              setMensaje(null);
                              showToast({
                                type: 'success',
                                title: 'Apoderado desvinculado',
                                message: 'El apoderado fue retirado de la ficha del alumno.',
                              });
                            } catch (err: any) {
                              setMensaje(
                                err.response?.data?.message || 'No se pudo desvincular el apoderado.',
                              );
                            }
                          }}
                          className="h-9 rounded-xl bg-white px-3 text-xs font-bold text-rose-600 ring-1 ring-rose-100"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                icon={GraduationCap}
                title="Registrar pre-matrícula"
                subtitle="Filtra por nivel y grado para elegir sección."
              >
                <div className="grid gap-4 xl:grid-cols-3">
                  <label>
                    <Label>Año lectivo</Label>
                    <select
                      value={anioId}
                      onChange={(e) => {
                        setAnioId(e.target.value ? Number(e.target.value) : '');
                        setExcepcionTraslado(false);
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecciona año</option>
                      {aniosDisponibles.map((a) => (
                        <option key={a.id_anio} value={a.id_anio}>
                          {a.nombre_anio} · {a.estado}
                        </option>
                      ))}
                    </select>
                    {aniosDisponibles.length === 0 && (
                      <p className="mt-2 text-xs font-bold text-rose-500">
                        No hay años lectivos disponibles para registrar matrícula en este colegio.
                        Crea o abre un año desde Configuración &gt; Años lectivos.
                      </p>
                    )}
                  </label>

                  <label>
                    <Label>Nivel</Label>
                    <select
                      value={nivelFiltro}
                      onChange={(e) => {
                        setNivelFiltro(e.target.value);
                        setGradoFiltro('');
                        setSeccionId('');
                      }}
                      className={selectClass}
                    >
                      <option value="">Todos</option>
                      {niveles.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <Label>Grado</Label>
                    <select
                      value={gradoFiltro}
                      onChange={(e) => {
                        setGradoFiltro(e.target.value);
                        setSeccionId('');
                      }}
                      className={selectClass}
                    >
                      <option value="">Todos</option>
                      {grados.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid max-h-[310px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {seccionesFiltradas.map((s) => {
                    const selected = s.id_seccion === seccionId;
                    const sinCupos = s.disponibles <= 0;
                    const porcentaje =
                      s.capacidad > 0
                        ? Math.min(
                            100,
                            Math.round((s.matriculados / s.capacidad) * 100),
                          )
                        : 0;

                    return (
                      <button
                        key={s.id_seccion}
                        type="button"
                        disabled={sinCupos}
                        onClick={() => {
                          setSeccionId(selected ? '' : s.id_seccion);
                          setExcepcionTraslado(false);
                        }}
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
                              {s.grado.nombre_grado} "{s.letra}"
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {s.grado.nivel?.nombre_nivel || 'Nivel'} ·{' '}
                              {s.capacidad} cupos
                            </p>
                          </div>

                          {selected && (
                            <CheckCircle2
                              size={18}
                              className="text-accent-600"
                            />
                          )}
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                          <div
                            className="h-full rounded-full bg-accent-500"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-400">
                          {s.matriculados} registrados · {s.disponibles}{' '}
                          disponibles
                        </p>
                      </button>
                    );
                  })}
                </div>

                {seccionesFiltradas.length === 0 && (
                  <Empty text="Sin secciones disponibles" />
                )}

                {/* ─── BLOQUE DE PROCEDENCIA ───────────────── */}
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Procedencia del alumno
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label>
                      <Label>Tipo de ingreso</Label>
                      <select
                        value={tipoIngreso}
                        onChange={(e) => setTipoIngreso(e.target.value)}
                        className={selectClass}
                        disabled={tiposIngresoPermitidos.length === 0}
                      >
                        {tiposIngresoPermitidos.length === 0 ? (
                          <option value="">Sin opciones disponibles</option>
                        ) : (
                          tiposIngresoPermitidos.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))
                        )}
                      </select>
                      {anioSeleccionado && (
                        <p className="mt-2 text-xs font-bold text-slate-400">
                          {getEstadoOperativoAnioFrontend(anioSeleccionado) === 'Planificación'
                            ? 'Año en planificación: solo permite reservas.'
                            : getEstadoOperativoAnioFrontend(anioSeleccionado) === 'En curso'
                              ? 'Año en curso: solo permite traslado, reingreso o regularización.'
                              : 'Matrícula abierta: permite ingreso regular.'}
                        </p>
                      )}
                    </label>

                    {(tipoIngreso === 'Traslado' || tipoIngreso === 'Reingreso') && (
                      <>
                        <label>
                          <Label>Colegio de procedencia</Label>
                          <input
                            value={colegioProcedencia}
                            onChange={(e) => setColegioProcedencia(e.target.value)}
                            placeholder="Nombre del colegio anterior"
                            className={inputClass}
                          />
                        </label>

                        <label>
                          <Label>Código modular</Label>
                          <input
                            value={codigoModularProcedencia}
                            onChange={(e) => setCodigoModularProcedencia(e.target.value)}
                            placeholder="Opcional"
                            className={inputClass}
                          />
                        </label>

                        <label>
                          <Label>Grado procedencia</Label>
                          <input
                            value={gradoProcedencia}
                            onChange={(e) => setGradoProcedencia(e.target.value)}
                            placeholder="Ej. Inicial 4 años, 2do primaria"
                            className={inputClass}
                          />
                        </label>
                      </>
                    )}

                    <label className="md:col-span-2">
                      <Label>Observación</Label>
                      <textarea
                        value={observacionProcedencia}
                        onChange={(e) => setObservacionProcedencia(e.target.value)}
                        placeholder="Información adicional sobre ingreso, traslado o continuidad"
                        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                      />
                    </label>
                  </div>
                </div>
                {/* ─── FIN BLOQUE DE PROCEDENCIA ──────────── */}

                {seccionSeleccionada && reglaEdadSeleccionada()?.permiteExcepcionTraslado && (
                  <label className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
                    <input
                      type="checkbox"
                      checked={excepcionTraslado}
                      onChange={(e) => setExcepcionTraslado(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Excepción por traslado. Usar solo si el alumno viene de otra institución
                      con constancia/certificado de estudios que sustente la continuidad.
                    </span>
                  </label>
                )}

                {mensajeValidacionMatricula && (
                  <div
                    className={cx(
                      'mt-4 rounded-2xl px-4 py-3 text-sm font-bold ring-1',
                      mensajeValidacionMatricula.tipo === 'error'
                        ? 'bg-rose-50 text-rose-700 ring-rose-100'
                        : mensajeValidacionMatricula.tipo === 'warning'
                          ? 'bg-amber-50 text-amber-700 ring-amber-100'
                          : 'bg-sky-50 text-sky-700 ring-sky-100',
                    )}
                  >
                    {mensajeValidacionMatricula.texto}
                  </div>
                )}

                {mensaje && (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
                    {mensaje}
                  </div>
                )}

                <button
                  type="button"
                  onClick={revisarMatricula}
                  disabled={aniosDisponibles.length === 0}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tipoIngreso === 'Reserva'
                    ? 'Revisar y registrar reserva'
                    : 'Revisar y registrar pre-matrícula'}
                </button>
              </Card>
            </>
          )}
        </section>
      </div>

      {confirmOpen && alumno && seccionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm animate-modal-overlay-in">
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 animate-modal-panel-in">
            <ModalHead
              title="Revisar pre-matrícula"
              subtitle="Verifica los datos antes de guardar."
              onClose={() => setConfirmOpen(false)}
            />

            <div className="space-y-4 p-6">
              {alertaEdad && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
                  <AlertTriangle size={16} className="mr-2 inline" />
                  {alertaEdad}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Summary
                  label="Alumno"
                  value={`${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`}
                  detail={`DNI ${alumno.dni} · ${edadTexto(
                    alumno.fecha_nacimiento,
                  )}`}
                />

                <Summary
                  label="Destino"
                  value={colegioDestinoNombre}
                  detail={`${seccionSeleccionada.grado.nombre_grado} "${
                    seccionSeleccionada.letra
                  }" · ${
                    seccionSeleccionada.grado.nivel?.nombre_nivel || ''
                  }`}
                />

                <Summary
                  label="Procedencia"
                  value={tipoIngreso}
                  detail={
                    tipoIngreso === 'Traslado' || tipoIngreso === 'Reingreso'
                      ? colegioProcedencia || 'Colegio de procedencia no indicado'
                      : 'Sin colegio de procedencia'
                  }
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Apoderados
                </p>

                <div className="mt-3 space-y-2">
                  {apoderados.map((a) => (
                    <div
                      key={a.id_persona}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100"
                    >
                      {a.parentesco}: {a.nombres} {a.apellido_paterno} · DNI{' '}
                      {a.dni}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600"
              >
                Corregir
              </button>

              <button
                type="button"
                onClick={registrarMatricula}
                disabled={matriculando}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                {matriculando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Confirmar pre-matrícula
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAlumno && (
        <PersonaModal
          title="Nuevo alumno"
          form={formAlumno}
          setForm={setFormAlumno}
          error={errorPersona}
          loading={savingPersona}
          onClose={() => setModalAlumno(false)}
          onSave={() => crearPersona('alumno')}
          aviso={avisoEdadFichaAlumno}
          alumno
        />
      )}

      {modalEditarAlumno && (
        <PersonaModal
          title="Editar alumno"
          form={formAlumno}
          setForm={setFormAlumno}
          error={errorPersona}
          loading={savingPersona}
          onClose={() => setModalEditarAlumno(false)}
          onSave={editarAlumno}
          alumno
        />
      )}

      {modalApoderado && (
        <PersonaModal
          title="Nuevo apoderado"
          form={formApoderado}
          setForm={setFormApoderado}
          error={errorPersona}
          loading={savingPersona}
          onClose={() => setModalApoderado(false)}
          onSave={() => crearPersona('apoderado')}
          apoderado
          parentesco={parentesco}
          onParentescoChange={setParentesco}
        />
      )}

      {detalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm animate-modal-overlay-in">
          <div className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 animate-modal-panel-in">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600 ring-1 ring-accent-100">
                  Detalle de matrícula
                </div>

                <h3 className="mt-3 text-xl font-black text-slate-950">
                  {detalleMatricula?.estudiante?.persona
                    ? `${getCodigoDetalleMatricula(detalleMatricula)} · ${detalleMatricula.estudiante.persona.nombres} ${detalleMatricula.estudiante.persona.apellido_paterno}`
                    : 'Cargando matrícula'}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Información académica, apoderados y cronograma generado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={imprimirDetalleMatricula}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Imprimir / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setDetalleOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? (
                <div className="flex min-h-[260px] items-center justify-center text-sm font-bold text-slate-500">
                  Cargando detalle...
                </div>
              ) : detalleMatricula ? (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <DetailBox
                      label="Código"
                      value={getCodigoDetalleMatricula(detalleMatricula)}
                    />
                    <DetailBox
                      label="Estado"
                      value={detalleMatricula.estado_matricula}
                    />
                    <DetailBox
                      label="Fecha"
                      value={formatFechaHora(detalleMatricula.fecha_matricula)}
                    />
                    <DetailBox
                      label="Registrado por"
                      value={
                        detalleMatricula.registrado_por?.persona
                          ? `${detalleMatricula.registrado_por.persona.nombres} ${detalleMatricula.registrado_por.persona.apellido_paterno}`
                          : 'No registrado'
                      }
                    />
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Datos académicos
                    </h4>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailBox
                        label="Colegio"
                        value={detalleMatricula.colegio?.nombre || '—'}
                        white
                      />
                      <DetailBox
                        label="Nivel"
                        value={
                          detalleMatricula.seccion?.grado?.nivel
                            ?.nombre_nivel || '—'
                        }
                        white
                      />
                      <DetailBox
                        label="Grado"
                        value={
                          detalleMatricula.seccion?.grado?.nombre_grado || '—'
                        }
                        white
                      />
                      <DetailBox
                        label="Sección"
                        value={detalleMatricula.seccion?.letra || '—'}
                        white
                      />
                      <DetailBox
                        label="Año lectivo"
                        value={detalleMatricula.anio?.nombre_anio || '—'}
                        white
                      />
                      <DetailBox
                        label="Aula"
                        value={detalleMatricula.seccion?.aula?.nombre_aula || '—'}
                        white
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Apoderados
                    </h4>

                    <div className="mt-3 space-y-3">
                      {detalleMatricula.estudiante?.apoderados?.length ? (
                        detalleMatricula.estudiante.apoderados.map(
                          (relacion: any) => (
                            <div
                              key={relacion.id_apoderado}
                              className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                            >
                              <p className="text-sm font-black text-slate-800">
                                {relacion.parentesco}:{' '}
                                {relacion.apoderado.persona.nombres}{' '}
                                {relacion.apoderado.persona.apellido_paterno}
                              </p>

                              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2">
                                <p>
                                  <span className="text-slate-400">DNI:</span>{' '}
                                  {relacion.apoderado.persona.dni || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Número:
                                  </span>{' '}
                                  {relacion.apoderado.persona.telefono || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Correo:
                                  </span>{' '}
                                  {relacion.apoderado.persona.correo || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Distrito:
                                  </span>{' '}
                                  {relacion.apoderado.persona.distrito || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Departamento:
                                  </span>{' '}
                                  {relacion.apoderado.persona.departamento ||
                                    '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Dirección:
                                  </span>{' '}
                                  {relacion.apoderado.persona.direccion || '—'}
                                </p>
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-sm font-bold text-slate-400">
                          Sin apoderados vinculados.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Resumen financiero
                    </h4>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <DetailBox
                        label="Pago matrícula"
                        value={
                          detalleMatricula.resumen_financiero
                            ?.estado_pago_matricula || 'No generado'
                        }
                        white
                      />
                      <DetailBox
                        label="Programado"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero
                            ?.total_programado,
                        )}
                        white
                      />
                      <DetailBox
                        label="Pagado"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero?.total_pagado,
                        )}
                        white
                      />
                      <DetailBox
                        label="Saldo"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero?.saldo,
                        )}
                        white
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <button
                      type="button"
                      onClick={() => setCronogramaOpen(!cronogramaOpen)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          Cronograma de pagos
                        </h4>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {detalleMatricula.cronogramas?.length || 0} conceptos
                          generados
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                        {cronogramaOpen ? 'Ocultar' : 'Ver detalle'}
                      </span>
                    </button>

                    {cronogramaOpen && (
                      <div className="mt-4 space-y-2">
                        {detalleMatricula.cronogramas?.length ? (
                          detalleMatricula.cronogramas.map((item: any) => (
                            <div
                              key={item.id_cronograma}
                              className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  {item.concepto.nombre_concepto}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Vencimiento:{' '}
                                  {new Date(
                                    item.fecha_vencimiento,
                                  ).toLocaleDateString('es-PE')}{' '}
                                  · Monto:{' '}
                                  {formatMoney(item.concepto.monto_base)}
                                </p>
                              </div>

                              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                                {item.estado_pago}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm font-bold text-slate-400">
                            No hay conceptos generados.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
      {children}
    </span>
  );
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: any;
  action?: any;
}) {
  return (
    <div className="animate-content-soft rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Icon size={18} />
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-900">{title}</h2>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {action}
      </div>

      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
      <p className="text-sm font-bold text-slate-500">{text}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={15} />
        <p className="text-[11px] font-black uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>

      <p className="mt-2 truncate text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: 'emerald' | 'amber';
  children: string;
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : 'bg-amber-50 text-amber-700 ring-amber-100';

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>

      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function DetailBox({
  label,
  value,
  white = false,
}: {
  label: string;
  value: string;
  white?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ring-slate-100 ${
        white ? 'bg-white' : 'bg-slate-50'
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ModalHead({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600 ring-1 ring-accent-100">
          <UserPlus size={13} />
          Registro
        </div>

        <h3 className="mt-3 text-xl font-black text-slate-950">{title}</h3>

        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function PersonaModal({
  title,
  form,
  setForm,
  error,
  loading,
  onClose,
  onSave,
  alumno,
  apoderado,
  aviso,
  parentesco,
  onParentescoChange,
}: any) {
  const set = (key: keyof PersonaForm, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm animate-modal-overlay-in">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 animate-modal-panel-in">
        <ModalHead
          title={title}
          subtitle="Registra datos básicos y ubicación."
          onClose={onClose}
        />

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="DNI"
              value={form.dni}
              onChange={(v: string) => set('dni', v)}
            />

            {alumno && (
              <Field
                label="Fecha de nacimiento"
                type="date"
                value={form.fecha_nacimiento || ''}
                onChange={(v: string) => set('fecha_nacimiento', v)}
              />
            )}

            {apoderado && onParentescoChange && (
              <label>
                <Label>Vínculo con el alumno</Label>
                <select
                  value={parentesco || 'Madre'}
                  onChange={(event) => onParentescoChange(event.target.value)}
                  className={selectClass}
                >
                  {parentescos.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <Field
              label="Nombres"
              value={form.nombres}
              onChange={(v: string) => set('nombres', v)}
            />

            <Field
              label="Apellido paterno"
              value={form.apellido_paterno}
              onChange={(v: string) => set('apellido_paterno', v)}
            />

            <Field
              label="Apellido materno"
              value={form.apellido_materno}
              onChange={(v: string) => set('apellido_materno', v)}
            />

            {alumno && (
              <label>
                <Label>Género</Label>
                <select
                  value={form.genero || ''}
                  onChange={(e) => set('genero', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecciona</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </label>
            )}

            {apoderado && !onParentescoChange && (
              <Field
                label="Ocupación"
                value={form.ocupacion || ''}
                onChange={(v: string) => set('ocupacion', v)}
              />
            )}

            {apoderado && onParentescoChange && (
              <Field
                label="Ocupación"
                value={form.ocupacion || ''}
                onChange={(v: string) => set('ocupacion', v)}
              />
            )}

            <Field
              label="Teléfono"
              value={form.telefono}
              onChange={(v: string) => set('telefono', v)}
            />

            <Field
              label="Correo"
              type="email"
              value={form.correo}
              onChange={(v: string) => set('correo', v)}
            />

            <Field
              label="País"
              value={form.pais}
              onChange={(v: string) => set('pais', v)}
            />

            <Field
              label="Departamento"
              value={form.departamento}
              onChange={(v: string) => set('departamento', v)}
            />

            <Field
              label="Provincia"
              value={form.provincia}
              onChange={(v: string) => set('provincia', v)}
            />

            <Field
              label="Distrito"
              value={form.distrito}
              onChange={(v: string) => set('distrito', v)}
            />

            <div className="md:col-span-2">
              <Field
                label="Dirección"
                value={form.direccion}
                onChange={(v: string) => set('direccion', v)}
              />
            </div>
          </div>

          {aviso && (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
              {aviso}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}