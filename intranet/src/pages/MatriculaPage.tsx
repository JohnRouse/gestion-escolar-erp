import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import { useToast } from '../contexts/ToastContext';
import LocationSelects from '../components/LocationSelects';
import {
  AlertCircle, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Circle, Clock,
  GraduationCap, Loader2, MapPin, Phone, Search, ShieldCheck, UserPlus, Users, X,
  PencilLine,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonaForm = {
  dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
  fecha_nacimiento?: string; genero?: string; telefono: string; correo: string;
  direccion: string; pais: string; departamento: string; provincia: string;
  distrito: string; ocupacion?: string;
};

type Alumno = {
  id_persona: number; dni: string; nombres: string; apellido_paterno: string;
  apellido_materno: string; fecha_nacimiento?: string | null; genero?: string | null;
  telefono?: string | null; correo?: string | null; direccion?: string | null;
  pais?: string | null; departamento?: string | null; provincia?: string | null; distrito?: string | null;
  estudiantes: {
    id_persona: number; codigo_estudiante: string;
    apoderados?: {
      parentesco: string;
      apoderado: {
        id_persona: number; ocupacion?: string | null;
        persona: {
          id_persona: number; dni: string; nombres: string; apellido_paterno: string;
          apellido_materno: string; telefono?: string | null; correo?: string | null;
          direccion?: string | null; pais?: string | null; departamento?: string | null;
          provincia?: string | null; distrito?: string | null;
        };
      };
    }[];
    matriculas: {
      id_matricula: number; codigo_matricula?: string | null; estado_matricula: string;
      id_colegio?: number; colegio?: { nombre: string; codigo?: string | null };
      anio?: { id_anio?: number; nombre_anio: string; estado?: string; fecha_inicio?: string | null; fecha_fin?: string | null };
      seccion?: { letra: string; grado: { id_grado?: number; nombre_grado: string; nivel?: { id_nivel?: number; nombre_nivel: string } } };
    }[];
  }[];
};

type Apoderado = {
  id_persona: number; dni: string; nombres: string; apellido_paterno: string;
  apellido_materno: string; telefono?: string | null; correo?: string | null;
  direccion?: string | null; pais?: string | null; departamento?: string | null;
  provincia?: string | null; distrito?: string | null; parentesco?: string;
  apoderado?: { id_persona: number; ocupacion?: string | null };
};

type Anio = {
  id_anio: number; id_tenant?: number | null; id_colegio?: number | null;
  nombre_anio: string; fecha_inicio?: string | null; fecha_fin?: string | null; estado: string;
};

type Seccion = {
  id_seccion: number; label?: string; letra: string; capacidad: number;
  matriculados: number; disponibles: number;
  grado: { nombre_grado: string; nivel?: { nombre_nivel: string } };
};

type ReglaEdad = { edad: number; permiteExcepcionTraslado: boolean; label: string };
type CodigoColegio = { id_estudiante: number; id_colegio: number; codigo: string };

interface UltimaMatricula {
  id_matricula: number; codigo_matricula?: string | null; id_colegio?: number | null;
  fecha_matricula: string; estado_matricula?: string;
  colegio?: { nombre: string; codigo?: string | null };
  anio?: { nombre_anio: string };
  registrado_por?: { username: string; rol?: { nombre_rol: string }; persona?: { nombres: string; apellido_paterno: string; apellido_materno?: string } } | null;
  estudiante: { codigo_estudiante?: string; codigos_colegio?: CodigoColegio[]; persona: { dni?: string; nombres: string; apellido_paterno: string } };
  seccion: { letra: string; grado: { nombre_grado: string; nivel?: { nombre_nivel: string } } };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyAlumno: PersonaForm = { dni: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', genero: '', telefono: '', correo: '', direccion: '', pais: 'Perú', departamento: '', provincia: '', distrito: '' };
const emptyApoderado: PersonaForm = { dni: '', nombres: '', apellido_paterno: '', apellido_materno: '', telefono: '', correo: '', direccion: '', pais: 'Perú', departamento: '', provincia: '', distrito: '', ocupacion: '' };
const parentescos = ['Madre','Padre','Abuela','Abuelo','Tía','Tío','Tutor legal','Otro'];

const inputClass = "h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-800 outline-none transition-all duration-150 focus:border-[#0f62fe] focus:bg-white focus:ring-2 focus:ring-[#0f62fe]/20 hover:border-neutral-300 placeholder:text-neutral-400 appearance-none";
const selectClass = inputClass;
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400";
const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const AVATAR_COLORS = ['bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const getInitials = (nombres: string) => { const p = nombres.trim().split(' '); return p.length >= 2 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : nombres.slice(0, 2).toUpperCase(); };

const ESTADO_BADGE: Record<string, string> = {
  Activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  Reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  Anulado: 'bg-red-50 text-red-600 ring-1 ring-red-200/60',
  'Pre-matriculado': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60',
  Inactivo: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200/60',
};
const getEstadoCls = (estado?: string) => ESTADO_BADGE[estado || ''] || 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200/60';

// ─── Utility functions ────────────────────────────────────────────────────────
const buildQuery = (base: string, extra: Record<string, string | number | undefined | null>) => { const params = new URLSearchParams(base.replace('?', '')); Object.entries(extra).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); }); const query = params.toString(); return query ? `?${query}` : ''; };
const normalizarFechaLocal = (value: string | Date) => { if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate()); return new Date(`${String(value).slice(0, 10)}T00:00:00`); };
const calcularEdadDetallada = (fechaNacimiento?: string | null, fechaCorte?: Date) => { if (!fechaNacimiento || !fechaCorte) return null; const nacimiento = normalizarFechaLocal(fechaNacimiento); const corte = normalizarFechaLocal(fechaCorte); if (Number.isNaN(nacimiento.getTime()) || Number.isNaN(corte.getTime()) || nacimiento > corte) return null; let anios = corte.getFullYear() - nacimiento.getFullYear(); let meses = corte.getMonth() - nacimiento.getMonth(); let dias = corte.getDate() - nacimiento.getDate(); if (dias < 0) { meses -= 1; dias += new Date(corte.getFullYear(), corte.getMonth(), 0).getDate(); } if (meses < 0) { anios -= 1; meses += 12; } const partes = [`${anios} ${anios === 1 ? 'año' : 'años'}`]; if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`); return { anios, meses, dias, totalMeses: anios * 12 + meses, texto: partes.length === 1 ? partes[0] : `${partes.slice(0,-1).join(', ')} y ${partes[partes.length-1]}` }; };
const edadNumero = (fecha?: string | null) => { if (!fecha) return null; const nacimiento = new Date(fecha); if (Number.isNaN(nacimiento.getTime())) return null; const hoy = new Date(); let edad = hoy.getFullYear() - nacimiento.getFullYear(); const mes = hoy.getMonth() - nacimiento.getMonth(); if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--; return edad; };
const edadTexto = (fecha?: string | null) => { const edad = edadNumero(fecha); if (edad === null) return '—'; if (edad < 0) return 'Fecha inválida'; return `${edad} años`; };
const generoTexto = (genero?: string | null) => { if (!genero) return '—'; if (genero === 'F') return 'Femenino'; if (genero === 'M') return 'Masculino'; return genero; };
const formatFechaHora = (value: string) => new Date(value).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatMoney = (value: number | string | null | undefined) => `S/ ${Number(value || 0).toFixed(2)}`;
const getCodigoInstitucional = (matricula: { id_colegio?: number | null; estudiante?: { codigo_estudiante?: string | null; codigos_colegio?: CodigoColegio[] } }) => { const codigoColegio = matricula.estudiante?.codigos_colegio?.find((item) => item.id_colegio === matricula.id_colegio); return codigoColegio?.codigo || matricula.estudiante?.codigo_estudiante || 'Sin código'; };
const getCodigoMatricula = (matricula: { id_matricula: number; codigo_matricula?: string | null }) => matricula.codigo_matricula || `MAT-${String(matricula.id_matricula).padStart(6, '0')}`;
const getCodigoDetalleMatricula = (detalle: any) => { if (!detalle) return 'Sin código'; const codigoColegio = detalle.estudiante?.codigos_colegio?.find((item: CodigoColegio) => item.id_colegio === detalle.id_colegio); return codigoColegio?.codigo || detalle.estudiante?.codigo_estudiante || 'Sin código'; };
const validarFechaNacimientoFrontend = (fecha?: string) => { if (!fecha) return 'Ingresa la fecha de nacimiento.'; const nacimiento = new Date(`${fecha}T00:00:00`); const hoy = new Date(); const minima = new Date('1990-01-01T00:00:00'); if (Number.isNaN(nacimiento.getTime())) return 'La fecha de nacimiento no es válida.'; if (nacimiento > hoy) return 'La fecha de nacimiento no puede ser futura.'; if (nacimiento < minima) return 'La fecha de nacimiento parece demasiado antigua. Revisa el dato.'; return null; };

// ─── Enrollment progress ────────────────────────────────────────────────────

type EnrollmentProgressStep = {
  title: string;
  done: boolean;
};

function EnrollmentProgress({
  steps,
}: {
  steps: EnrollmentProgressStep[];
}) {
  const firstPending =
    steps.findIndex((step) => !step.done);

  const activeIndex =
    firstPending === -1
      ? steps.length - 1
      : firstPending;

  return (
    <nav
      className="matricula-progress"
      aria-label="Progreso del registro de matrícula"
    >
      <div className="matricula-progress__track">
        {steps.map((step, index) => {
          const state = step.done
            ? 'done'
            : index === activeIndex
              ? 'current'
              : 'pending';

          return (
            <div
              key={`${index}-${step.title}`}
              className={`matricula-progress__step matricula-progress__step--${state}`}
              aria-current={
                state === 'current'
                  ? 'step'
                  : undefined
              }
            >
              <span className="matricula-progress__number">
                {step.done ? (
                  <CheckCircle2
                    size={16}
                    strokeWidth={2.4}
                  />
                ) : (
                  index + 1
                )}
              </span>

              <span className="matricula-progress__title">
                {step.title}
              </span>

              {index < steps.length - 1 && (
                <span
                  className="matricula-progress__connector"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function getNombreOperacion(
  tipoIngreso?: string,
) {
  const tipo = String(tipoIngreso || '');

  if (tipo === 'Reserva') {
    return 'reserva';
  }

  if (
    tipo === 'Renovación' ||
    tipo === 'Renovación con cambio de sede'
  ) {
    return 'renovación';
  }

  if (tipo === 'Traslado') {
    return 'traslado';
  }

  if (tipo === 'Reingreso') {
    return 'reingreso';
  }

  if (tipo === 'Regularización') {
    return 'regularización';
  }

  return 'pre-matrícula';
}

function getArticuloOperacion(
  tipoIngreso?: string,
) {
  const operacion =
    getNombreOperacion(tipoIngreso);

  return [
    'traslado',
    'reingreso',
  ].includes(operacion)
    ? 'el'
    : 'la';
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ViewportPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}

export default function MatriculaPage() {
  const { token } = useAuth();
  const { activeScope, activeColegio, colegios, scopeLabel, queryString, puedeVerConsolidado } = useSchool();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [closingModal, setClosingModal] = useState<string | null>(null);

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
  const [apoderadoEncontrado, setApoderadoEncontrado] = useState<Apoderado | null>(null);
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);
  const [modalAlumno, setModalAlumno] = useState(false);
  const [modalApoderado, setModalApoderado] = useState(false);
  const [formAlumno, setFormAlumno] = useState<PersonaForm>(emptyAlumno);
  const [formApoderado, setFormApoderado] = useState<PersonaForm>(emptyApoderado);
  const [savingPersona, setSavingPersona] = useState(false);
  const [errorPersona, setErrorPersona] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleMatricula, setDetalleMatricula] = useState<any | null>(null);
  const [cronogramaOpen, setCronogramaOpen] = useState(false);
  const [modalEditarAlumno, setModalEditarAlumno] = useState(false);
  const [modalEditarApoderado, setModalEditarApoderado] = useState(false);
  const [apoderadoEditando, setApoderadoEditando] = useState<Apoderado | null>(null);
  const [excepcionTraslado, setExcepcionTraslado] = useState(false);
  const [tipoIngreso, setTipoIngreso] = useState('Nuevo');
  const [colegioProcedencia, setColegioProcedencia] = useState('');
  const [codigoModularProcedencia, setCodigoModularProcedencia] = useState('');
  const [gradoProcedencia, setGradoProcedencia] = useState('');
  const [observacionProcedencia, setObservacionProcedencia] = useState('');

  const modalActivo =
    modalAlumno ||
    modalApoderado ||
    modalEditarAlumno ||
    modalEditarApoderado ||
    confirmOpen ||
    detalleOpen;

  useEffect(() => {
    if (
      !modalActivo ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        overflowAnterior;
    };
  }, [modalActivo]);

  useEffect(() => { setMounted(true); }, []);

  const estudiante = alumno?.estudiantes?.[0] || null;
  const estadosMatriculaBloqueantes = ['Activo','Pre-matriculado','Reserva','Pendiente','Observado'];

  const colegioDestinoQuery = useMemo(() => { if (activeScope.tipo === 'colegio') return queryString; if (colegioDestinoId) return `?colegio_id=${colegioDestinoId}`; return queryString; }, [activeScope.tipo, colegioDestinoId, queryString]);
  // Nombre institucional completo para matrícula y revisión.
  const colegioDestinoNombre = useMemo(() => {
    if (activeScope.tipo === 'colegio') {
      return (
        activeColegio?.nombre ||
        activeColegio?.nombre_corto ||
        'Institución activa'
      );
    }

    if (!colegioDestinoId) {
      return 'Por seleccionar';
    }

    const colegio = colegios.find(
      (item) =>
        item.id_colegio ===
        colegioDestinoId,
    );

    return (
      colegio?.nombre ||
      colegio?.nombre_corto ||
      'Institución seleccionada'
    );
  }, [
    activeScope.tipo,
    activeColegio,
    colegioDestinoId,
    colegios,
  ]);
  const colegioDestinoDefinido = useMemo(() => { if (activeScope.tipo === 'colegio') return Boolean(activeScope.id_colegio); return Boolean(colegioDestinoId); }, [activeScope.tipo, activeScope.id_colegio, colegioDestinoId]);
  const anioSeleccionado = useMemo(() => anios.find((item) => item.id_anio === anioId) || null, [anioId, anios]);

  const getEstadoOperativoAnioFrontend = (anio?: Anio | null) => { const estado = String(anio?.estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); if (['cerrado','archivado'].includes(estado)) return 'Cerrado'; if (estado.includes('planificacion')) return 'Planificación'; if (estado.includes('matricula') || estado === 'abierto') return 'Matrícula abierta'; if (estado === 'activo' || estado.includes('curso')) return 'En curso'; return anio?.estado || 'Planificación'; };
  const esAnioDisponibleParaRegistro = (anio?: Anio | null) => { if (!anio) return false; const estadoOperativo = getEstadoOperativoAnioFrontend(anio); if (estadoOperativo === 'Cerrado' || estadoOperativo === 'Archivado') return false; if (anio.fecha_fin) { const fechaFin = new Date(`${String(anio.fecha_fin).slice(0, 10)}T23:59:59`); if (!Number.isNaN(fechaFin.getTime()) && fechaFin < new Date()) return false; } return true; };
  const getAnioCorteFrontend = () => { const desdeNombre = anioSeleccionado?.nombre_anio?.match(/\d{4}/)?.[0]; if (desdeNombre) return Number(desdeNombre); if (anioSeleccionado?.fecha_inicio) { const fecha = new Date(anioSeleccionado.fecha_inicio); if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear(); } return new Date().getFullYear(); };
  const getAnioCorteMatriculaFrontend = (matricula: any) => { const desdeNombre = matricula?.anio?.nombre_anio?.match(/\d{4}/)?.[0]; if (desdeNombre) return Number(desdeNombre); if (matricula?.anio?.fecha_inicio) { const fecha = new Date(matricula.anio.fecha_inicio); if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear(); } return null; };

  const aniosDisponibles = useMemo(() => anios.filter((anio) => esAnioDisponibleParaRegistro(anio)), [anios]);

  const tiposIngresoPermitidos = useMemo(() => { if (!anioSeleccionado || !esAnioDisponibleParaRegistro(anioSeleccionado)) return []; const estadoOperativo = getEstadoOperativoAnioFrontend(anioSeleccionado); if (estadoOperativo === 'Planificación') return ['Reserva','Renovación','Renovación con cambio de sede']; const anioCorte = getAnioCorteFrontend(); const corteRegular = new Date(`${anioCorte}-03-31T23:59:59`); const hoy = new Date(); const fechaInicio = anioSeleccionado.fecha_inicio ? new Date(`${String(anioSeleccionado.fecha_inicio).slice(0, 10)}T00:00:00`) : null; const fechaFin = anioSeleccionado.fecha_fin ? new Date(`${String(anioSeleccionado.fecha_fin).slice(0, 10)}T23:59:59`) : null; const estaEnCurso = fechaInicio && fechaFin && hoy >= fechaInicio && hoy <= fechaFin; const pasoCorteRegular = hoy > corteRegular; if (estadoOperativo === 'En curso' || (estaEnCurso && pasoCorteRegular)) return ['Traslado','Reingreso','Regularización']; return ['Nuevo','Traslado','Reingreso','Continuidad interna','Renovación','Renovación con cambio de sede']; }, [anioSeleccionado, anioId, anios]);

  useEffect(() => { if (!anioId) return; if (!tiposIngresoPermitidos.length) { setTipoIngreso(''); return; } if (!tiposIngresoPermitidos.includes(tipoIngreso)) { setTipoIngreso(tiposIngresoPermitidos[0]); setExcepcionTraslado(false); } }, [anioId, tiposIngresoPermitidos, tipoIngreso]);

  const avisoPeriodoMatricula = useMemo(() => { if (!anioSeleccionado) return null; const estadoOperativo = getEstadoOperativoAnioFrontend(anioSeleccionado); const hoy = new Date(); const fechaInicio = anioSeleccionado.fecha_inicio ? new Date(anioSeleccionado.fecha_inicio) : null; const fechaFin = anioSeleccionado.fecha_fin ? new Date(anioSeleccionado.fecha_fin) : null; const anioCorte = getAnioCorteFrontend(); const corteRegular = new Date(`${anioCorte}-03-31T23:59:59`); if (estadoOperativo === 'Cerrado' || (fechaFin && hoy > fechaFin)) return { bloquea: true, tipo: 'error', texto: 'El año lectivo seleccionado está cerrado o vencido. Selecciona un año lectivo vigente o crea uno nuevo en Configuración > Años lectivos.' }; if (estadoOperativo === 'Planificación') { if (!['Reserva','Renovación','Renovación con cambio de sede'].includes(tipoIngreso)) return { bloquea: true, tipo: 'warning', texto: 'Este año lectivo todavía está en planificación. Solo puedes registrar reservas o renovaciones anticipadas.' }; const esRenovacion = ['Renovación','Renovación con cambio de sede'].includes(tipoIngreso); return { bloquea: false, tipo: 'info', texto: esRenovacion ? 'Se registrará como pre-matrícula anticipada para el siguiente año.' : 'Se registrará como reserva. No se generará cobro ni activación hasta que el año lectivo pase a Matrícula abierta o En curso.' }; } const tiposPermitidosEnCurso = ['Traslado','Reingreso','Regularización']; const estaEnCurso = fechaInicio && fechaFin && hoy >= fechaInicio && hoy <= fechaFin; const pasoCorteRegular = hoy > corteRegular; if (estadoOperativo === 'En curso' || (estaEnCurso && pasoCorteRegular)) { if (!tiposPermitidosEnCurso.includes(tipoIngreso)) return { bloquea: true, tipo: 'warning', texto: 'La matrícula regular de este año ya está cerrada. En periodo en curso solo se permiten Traslado, Reingreso o Regularización autorizada.' }; return { bloquea: false, tipo: 'info', texto: 'Periodo en curso: se permitirá continuar porque el tipo de ingreso corresponde a traslado, reingreso o regularización autorizada.' }; } if (tipoIngreso === 'Reserva') return { bloquea: true, tipo: 'warning', texto: 'El tipo Reserva debe usarse para años futuros o en planificación.' }; return null; }, [anioSeleccionado, tipoIngreso, anioId]);

  const edadAl31Marzo = (fecha?: string | null) => { if (!fecha) return null; const anioCorte = getAnioCorteFrontend(); const corte = new Date(`${anioCorte}-03-31T23:59:59`); return calcularEdadDetallada(fecha, corte); };
  const niveles = useMemo(() => Array.from(new Set(secciones.map((s) => s.grado?.nivel?.nombre_nivel).filter(Boolean))) as string[], [secciones]);
  const grados = useMemo(() => Array.from(new Set(secciones.filter((s) => !nivelFiltro || s.grado?.nivel?.nombre_nivel === nivelFiltro).map((s) => s.grado?.nombre_grado).filter(Boolean))) as string[], [nivelFiltro, secciones]);
  const seccionesFiltradas = useMemo(() => {
    if (!nivelFiltro || !gradoFiltro) {
      return [];
    }

    return secciones.filter(
      (seccion) =>
        seccion.grado?.nivel?.nombre_nivel ===
          nivelFiltro &&
        seccion.grado?.nombre_grado ===
          gradoFiltro,
    );
  }, [
    gradoFiltro,
    nivelFiltro,
    secciones,
  ]);
  const seccionSeleccionada = useMemo(() => secciones.find((s) => s.id_seccion === seccionId) || null, [seccionId, secciones]);

  const reglaEdadSeleccionada = (): ReglaEdad | null => { if (!seccionSeleccionada) return null; const nivel = seccionSeleccionada.grado?.nivel?.nombre_nivel?.toLowerCase() || ''; const grado = seccionSeleccionada.grado?.nombre_grado?.toLowerCase() || ''; if (nivel.includes('inicial')) { const edad = Number(grado.match(/\d+/)?.[0]); if (edad >= 3 && edad <= 5) return { edad, permiteExcepcionTraslado: false, label: `Inicial ${edad} años` }; } if (nivel.includes('primaria')) { const gradoNumero = grado.includes('primer')||grado.includes('1') ? 1 : grado.includes('segundo')||grado.includes('2') ? 2 : grado.includes('tercer')||grado.includes('3') ? 3 : grado.includes('cuarto')||grado.includes('4') ? 4 : grado.includes('quinto')||grado.includes('5') ? 5 : grado.includes('sexto')||grado.includes('6') ? 6 : null; if (gradoNumero) return { edad: 5 + gradoNumero, permiteExcepcionTraslado: gradoNumero >= 2, label: `${gradoNumero}.° de primaria` }; } return null; };

  const errorEdadNormativa = useMemo(() => { if (!alumno || !seccionSeleccionada) return null; const edadCorte = edadAl31Marzo(alumno.fecha_nacimiento); const regla = reglaEdadSeleccionada(); const anioCorte = getAnioCorteFrontend(); if (!regla || !edadCorte) return null; if (edadCorte.anios >= regla.edad) return null; if (regla.permiteExcepcionTraslado && excepcionTraslado) return null; return `El alumno no cumple la edad para ${regla.label}. Debe tener ${regla.edad} años cumplidos al 31 de marzo de ${anioCorte}. Edad al corte: ${edadCorte.texto}.`; }, [alumno, seccionSeleccionada, anioId, excepcionTraslado]);

  const avisoEdadFichaAlumno = useMemo(() => { if (!formAlumno.fecha_nacimiento) return null; const anioCorte = getAnioCorteFrontend(); const corte = new Date(`${anioCorte}-03-31T23:59:59`); const edad = calcularEdadDetallada(formAlumno.fecha_nacimiento, corte); if (!edad) return null; if (edad.anios < 3) return `Aviso: para el año lectivo ${anioCorte}, el alumno tendría ${edad.texto} al 31 de marzo.`; return null; }, [formAlumno.fecha_nacimiento, anioId]);

  const matriculaActiva = useMemo(() => { if (!estudiante?.matriculas?.length || !anioId) return null; const anioDestino = getAnioCorteFrontend(); const matriculasBloqueantes = estudiante.matriculas.filter((m) => estadosMatriculaBloqueantes.includes(m.estado_matricula) && getAnioCorteMatriculaFrontend(m) === anioDestino); if (!matriculasBloqueantes.length) return null; if (activeScope.tipo === 'colegio') { const mismaSede = matriculasBloqueantes.find((m) => m.id_colegio === activeScope.id_colegio); if (mismaSede) return mismaSede; } if (colegioDestinoId) { const mismaSedeDestino = matriculasBloqueantes.find((m) => m.id_colegio === colegioDestinoId); if (mismaSedeDestino) return mismaSedeDestino; } return matriculasBloqueantes[0]; }, [activeScope, colegioDestinoId, estudiante?.matriculas, anioId]);

  const matriculaPosterior = useMemo(() => {
    if (
      !estudiante?.matriculas?.length ||
      !anioId
    ) {
      return null;
    }

    const anioDestino =
      getAnioCorteFrontend();

    return (
      estudiante.matriculas
        .filter((matricula) => {
          const anioMatricula =
            getAnioCorteMatriculaFrontend(
              matricula,
            );

          return (
            estadosMatriculaBloqueantes.includes(
              matricula.estado_matricula,
            ) &&
            anioMatricula !== null &&
            anioMatricula > anioDestino
          );
        })
        .sort(
          (a, b) =>
            Number(
              getAnioCorteMatriculaFrontend(a),
            ) -
            Number(
              getAnioCorteMatriculaFrontend(b),
            ),
        )[0] || null
    );
  }, [
    estudiante?.matriculas,
    anioId,
  ]);

  const alertaEdad = useMemo(() => { if (!alumno || !seccionSeleccionada) return null; const edad = edadNumero(alumno.fecha_nacimiento); if (edad === null) return null; if (edad < 0) return 'La fecha de nacimiento del alumno es futura o inválida.'; const nivel = seccionSeleccionada.grado?.nivel?.nombre_nivel?.toLowerCase() || ''; if (nivel.includes('primaria') && edad < 6) return 'El alumno parece menor para Primaria.'; if (nivel.includes('secundaria') && edad < 11) return 'El alumno parece menor para Secundaria.'; if (nivel.includes('inicial') && edad > 6) return 'El alumno parece mayor para Inicial.'; return null; }, [alumno, seccionSeleccionada]);

  const colegioDestinoRequerido = useMemo(() => activeScope.tipo === 'todos' && !colegioDestinoId, [activeScope.tipo, colegioDestinoId]);

  const formatMatriculaActiva = (matricula: any) => { if (!matricula) return ''; const colegio = matricula.colegio?.nombre || 'colegio registrado'; const anio = matricula.anio?.nombre_anio || 'año lectivo'; const grado = matricula.seccion?.grado?.nombre_grado || 'grado'; const letra = matricula.seccion?.letra || '-'; const nivel = matricula.seccion?.grado?.nivel?.nombre_nivel || 'nivel'; const estado = matricula.estado_matricula || 'matriculado'; if (estado === 'Reserva') return `Este alumno ya tiene una reserva registrada en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`; if (estado === 'Pre-matriculado') return `Este alumno ya está pre-matriculado en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`; if (estado === 'Activo') return `Este alumno ya tiene una matrícula activa en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`; return `Este alumno ya figura como ${estado} en ${colegio}, ${grado} "${letra}" · ${nivel}, ${anio}.`; };
  const irADetalleMatriculaActiva = (matricula: any) => { if (!matricula?.id_matricula) return; const params = new URLSearchParams(); params.set('matricula_id', String(matricula.id_matricula)); if (matricula.id_colegio) params.set('colegio_id', String(matricula.id_colegio)); navigate(`/matricula/historial?${params.toString()}`); };

  const mensajeValidacionMatricula = useMemo(() => { if (colegioDestinoRequerido) return { tipo: 'info' as const, texto: 'Selecciona el colegio destino. Estás trabajando con todos los colegios.' }; if (!alumno) return { tipo: 'info' as const, texto: 'Busca o registra primero al alumno que deseas matricular.' }; if (!apoderados.length) return { tipo: 'warning' as const, texto: 'El alumno debe tener al menos un apoderado vinculado antes de registrar la matrícula.' }; if (!anioId) return { tipo: 'info' as const, texto: 'Selecciona el año lectivo de la matrícula.' }; if (!seccionId) return { tipo: 'info' as const, texto: 'Selecciona el grado y sección donde se registrará al alumno.' }; if (avisoPeriodoMatricula?.bloquea) return { tipo: avisoPeriodoMatricula.tipo as 'error'|'warning'|'info', texto: avisoPeriodoMatricula.texto }; if (errorEdadNormativa) return { tipo: 'error' as const, texto: errorEdadNormativa }; if (avisoPeriodoMatricula) return { tipo: avisoPeriodoMatricula.tipo as 'error'|'warning'|'info', texto: avisoPeriodoMatricula.texto }; return null; }, [colegioDestinoRequerido, alumno, apoderados.length, anioId, seccionId, avisoPeriodoMatricula, errorEdadNormativa]);

  useEffect(() => { if (activeScope.tipo === 'colegio' && activeScope.id_colegio) setColegioDestinoId(activeScope.id_colegio); if (activeScope.tipo === 'todos') setColegioDestinoId(''); setAlumno(null); setApoderados([]); setSeccionId(''); setAnioId(''); setMensaje(null); }, [activeScope.tipo, activeScope.id_colegio]);
  useEffect(() => { if (token) fetchBase(); }, [token, colegioDestinoId, queryString]);
  useEffect(() => { if (token && anioId) fetchSecciones(Number(anioId)); }, [token, anioId, colegioDestinoId, queryString]);

  const fetchBase = async () => { if (!token) return; setLoadingBase(true); try { const [ultimasRes, aniosRes] = await Promise.all([ axios.get(`/api/academicos/matriculas/ultimas${colegioDestinoQuery}`, { headers: { Authorization: `Bearer ${token}` } }), axios.get(`/api/academicos/anios${colegioDestinoQuery}`, { headers: { Authorization: `Bearer ${token}` } }), ]); const aniosData: Anio[] = aniosRes.data || []; setUltimas((ultimasRes.data || []).slice(0, 5)); setAnios(aniosData); const estadoNorm = (estado?: string) => String(estado||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); const fechaNoVencida = (a: Anio) => { if (!a.fecha_fin) return true; const f = new Date(`${String(a.fecha_fin).slice(0,10)}T23:59:59`); return Number.isNaN(f.getTime()) || f >= new Date(); }; const aniosRegistrables = aniosData.filter((a) => !['cerrado','archivado'].includes(estadoNorm(a.estado)) && fechaNoVencida(a)); const activo = aniosRegistrables.find((a) => estadoNorm(a.estado).includes('matricula')) || aniosRegistrables.find((a) => estadoNorm(a.estado) === 'abierto') || aniosRegistrables.find((a) => estadoNorm(a.estado).includes('curso')) || aniosRegistrables.find((a) => estadoNorm(a.estado) === 'activo') || aniosRegistrables.find((a) => estadoNorm(a.estado).includes('planificacion')) || aniosRegistrables[0]; const resolved = activo ? activo.id_anio : ''; setAnioId((current) => current || resolved); if (resolved) await fetchSecciones(Number(resolved)); } catch { setUltimas([]); setAnios([]); setSecciones([]); } finally { setLoadingBase(false); } };
  const fetchSecciones = async (idAnio: number) => { if (!token) return; const query = buildQuery(colegioDestinoQuery, { anio_id: idAnio }); try { const res = await axios.get(`/api/academicos/secciones${query}`, { headers: { Authorization: `Bearer ${token}` } }); setSecciones(res.data || []); } catch { setSecciones([]); } };

  const abrirDetalleMatricula = async (idMatricula: number) => { if (!token) return; setClosingModal(null); setDetalleOpen(true); setDetalleLoading(true); setDetalleMatricula(null); setCronogramaOpen(false); try { const res = await axios.get(`/api/academicos/matriculas/${idMatricula}/detalle${colegioDestinoQuery}`, { headers: { Authorization: `Bearer ${token}` } }); setDetalleMatricula(res.data); } catch (error: any) { setMensaje(error.response?.data?.message || 'No se pudo cargar el detalle de matrícula.'); setDetalleOpen(false); } finally { setDetalleLoading(false); } };
  
  const closeModal = (setter: React.Dispatch<React.SetStateAction<boolean>>, name: string) => {
    setClosingModal(name);
    setTimeout(() => { setter(false); setClosingModal(null); }, 200);
  };

  const apoderadosDesdeAlumno = (alumnoData: Alumno): Apoderado[] => { const estudianteData = alumnoData.estudiantes?.[0]; if (!estudianteData?.apoderados?.length) return []; return estudianteData.apoderados.map((relacion) => ({ id_persona: relacion.apoderado.id_persona, dni: relacion.apoderado.persona.dni, nombres: relacion.apoderado.persona.nombres, apellido_paterno: relacion.apoderado.persona.apellido_paterno, apellido_materno: relacion.apoderado.persona.apellido_materno, telefono: relacion.apoderado.persona.telefono, correo: relacion.apoderado.persona.correo, direccion: relacion.apoderado.persona.direccion, pais: relacion.apoderado.persona.pais, departamento: relacion.apoderado.persona.departamento, provincia: relacion.apoderado.persona.provincia, distrito: relacion.apoderado.persona.distrito, apoderado: { id_persona: relacion.apoderado.id_persona, ocupacion: relacion.apoderado.ocupacion }, parentesco: relacion.parentesco, })); };

  const apoderadoToForm = (apoderado: Apoderado): PersonaForm => ({
    dni: apoderado.dni || '',
    nombres: apoderado.nombres || '',
    apellido_paterno: apoderado.apellido_paterno || '',
    apellido_materno: apoderado.apellido_materno || '',
    telefono: apoderado.telefono || '',
    correo: apoderado.correo || '',
    direccion: apoderado.direccion || '',
    pais: apoderado.pais || 'Perú',
    departamento: apoderado.departamento || '',
    provincia: apoderado.provincia || '',
    distrito: apoderado.distrito || '',
    ocupacion: apoderado.apoderado?.ocupacion || '',
  });

  const abrirEditarApoderado = (apoderado: Apoderado) => {
    setApoderadoEditando(apoderado);
    setParentesco(apoderado.parentesco || parentesco || 'Apoderado');
    setFormApoderado(apoderadoToForm(apoderado));
    setErrorPersona(null);
    setClosingModal(null);
    setModalEditarApoderado(true);
  };

  const buscarAlumnoPorDni = async (dniBusqueda: string) => { if (!token || !dniBusqueda.trim()) return; setBuscandoAlumno(true); setMensaje(null); setApoderados([]); try { const query = puedeVerConsolidado ? '&scope=all' : colegioDestinoQuery ? `&${colegioDestinoQuery.replace('?','')}` : ''; const res = await axios.get(`/api/academicos/alumnos/buscar?dni=${dniBusqueda.trim()}${query}`, { headers: { Authorization: `Bearer ${token}` } }); setAlumno(res.data); setApoderados(apoderadosDesdeAlumno(res.data)); setSeccionId(''); setNivelFiltro(''); setGradoFiltro(''); setMensaje(null); } catch (err: any) { setAlumno(null); setMensaje(err.response?.data?.message || 'No se encontró el alumno.'); } finally { setBuscandoAlumno(false); } };
  const buscarAlumno = () => buscarAlumnoPorDni(dni);
  const buscarApoderadoPorDni = async (dniBusqueda: string) => { if (!token || !dniBusqueda.trim()) return; setBuscandoApoderado(true); setMensaje(null); try { const res = await axios.get(`/api/academicos/apoderados/buscar?dni=${dniBusqueda.trim()}`, { headers: { Authorization: `Bearer ${token}` } }); setApoderadoEncontrado(res.data); return res.data; } catch (err: any) { setApoderadoEncontrado(null); setMensaje(err.response?.data?.message || 'No se encontró el apoderado.'); return null; } finally { setBuscandoApoderado(false); } };
  const buscarApoderado = () => buscarApoderadoPorDni(apoderadoDni);

  const agregarApoderado = async (apoderado: Apoderado) => { if (!estudiante?.id_persona || !token) { setMensaje('Primero debes buscar o registrar un alumno.'); return; } if (apoderados.some((item) => item.id_persona === apoderado.id_persona)) { setMensaje('Este apoderado ya está vinculado al alumno.'); return; } const parentescoSeleccionado = apoderado.parentesco || parentesco || 'Apoderado'; try { await axios.post(`/api/academicos/alumnos/${estudiante.id_persona}/apoderados`, { id_apoderado: apoderado.id_persona, parentesco: parentescoSeleccionado }, { headers: { Authorization: `Bearer ${token}` } }); setApoderados([...apoderados, { ...apoderado, parentesco: parentescoSeleccionado }]); setMensaje(null); showToast({ type: 'success', title: 'Apoderado vinculado', message: `${parentescoSeleccionado} agregado correctamente.` }); setApoderadoEncontrado(null); setApoderadoDni(''); setParentesco('Madre'); } catch (error: any) { setMensaje(error.response?.data?.message || 'No se pudo vincular el apoderado.'); } };

  const crearPersona = async (tipo: 'alumno' | 'apoderado') => { if (!token) return; const form = tipo === 'alumno' ? formAlumno : formApoderado; if (!form.dni || !form.nombres || !form.apellido_paterno || !form.apellido_materno) { setErrorPersona('Completa DNI, nombres y apellidos.'); return; } if (tipo === 'alumno') { const errorFecha = validarFechaNacimientoFrontend(form.fecha_nacimiento); if (errorFecha) { setErrorPersona(errorFecha); return; } } setSavingPersona(true); setErrorPersona(null); try { const res = await axios.post(tipo === 'alumno' ? '/api/academicos/alumnos' : '/api/academicos/apoderados', { ...form, pais: form.pais || 'Perú' }, { headers: { Authorization: `Bearer ${token}` } }); if (tipo === 'alumno') { setDni(form.dni); closeModal(setModalAlumno, 'alumno'); setFormAlumno(emptyAlumno); showToast({ type: 'success', title: 'Alumno registrado', message: 'La ficha del alumno se guardó correctamente.' }); await buscarAlumnoPorDni(form.dni); } else { const parentescoNuevo = parentesco || 'Apoderado'; const apoderadoCreado: Apoderado = { id_persona: res.data?.apoderado?.id_persona || res.data?.persona?.id_persona, dni: res.data?.persona?.dni || form.dni, nombres: res.data?.persona?.nombres || form.nombres, apellido_paterno: res.data?.persona?.apellido_paterno || form.apellido_paterno, apellido_materno: res.data?.persona?.apellido_materno || form.apellido_materno, telefono: res.data?.persona?.telefono || form.telefono, correo: res.data?.persona?.correo || form.correo, direccion: res.data?.persona?.direccion || form.direccion, pais: res.data?.persona?.pais || form.pais, departamento: res.data?.persona?.departamento || form.departamento, provincia: res.data?.persona?.provincia || form.provincia, distrito: res.data?.persona?.distrito || form.distrito, parentesco: parentescoNuevo, apoderado: { id_persona: res.data?.apoderado?.id_persona || res.data?.persona?.id_persona, ocupacion: res.data?.apoderado?.ocupacion || form.ocupacion } }; setApoderadoDni(form.dni); closeModal(setModalApoderado, 'apoderado'); setFormApoderado(emptyApoderado); showToast({ type: 'success', title: 'Apoderado registrado', message: 'La ficha del apoderado se guardó correctamente.' }); if (estudiante?.id_persona) await agregarApoderado(apoderadoCreado); else setApoderadoEncontrado(apoderadoCreado); } } catch (err: any) { setErrorPersona(err.response?.data?.message || 'No se pudo guardar el registro.'); } finally { setSavingPersona(false); } };

  const editarAlumno = async () => { if (!token || !estudiante?.id_persona) return; const errorFecha = validarFechaNacimientoFrontend(formAlumno.fecha_nacimiento); if (errorFecha) { setErrorPersona(errorFecha); return; } setSavingPersona(true); setErrorPersona(null); try { const res = await axios.put(`/api/academicos/alumnos/${estudiante.id_persona}`, { ...formAlumno, pais: formAlumno.pais || 'Perú' }, { headers: { Authorization: `Bearer ${token}` } }); setAlumno(res.data); setApoderados(apoderadosDesdeAlumno(res.data)); closeModal(setModalEditarAlumno, 'editarAlumno'); setMensaje(null); showToast({ type: 'success', title: 'Alumno actualizado', message: 'Los datos del alumno se actualizaron correctamente.' }); } catch (err: any) { setErrorPersona(err.response?.data?.message || 'No se pudo actualizar el alumno.'); } finally { setSavingPersona(false); } };

  const editarApoderado = async () => {
    if (!token || !apoderadoEditando) return;

    if (!formApoderado.dni || !formApoderado.nombres || !formApoderado.apellido_paterno || !formApoderado.apellido_materno) {
      setErrorPersona('Completa DNI, nombres y apellidos.');
      return;
    }

    setSavingPersona(true);
    setErrorPersona(null);

    try {
      const res = await axios.put(
        `/api/academicos/apoderados/${apoderadoEditando.id_persona}`,
        { ...formApoderado, pais: formApoderado.pais || 'Perú' },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const actualizado: Apoderado = {
        ...apoderadoEditando,
        id_persona: res.data?.id_persona || apoderadoEditando.id_persona,
        dni: res.data?.dni || formApoderado.dni,
        nombres: res.data?.nombres || formApoderado.nombres,
        apellido_paterno: res.data?.apellido_paterno || formApoderado.apellido_paterno,
        apellido_materno: res.data?.apellido_materno || formApoderado.apellido_materno,
        telefono: res.data?.telefono || formApoderado.telefono,
        correo: res.data?.correo || formApoderado.correo,
        direccion: res.data?.direccion || formApoderado.direccion,
        pais: res.data?.pais || formApoderado.pais,
        departamento: res.data?.departamento || formApoderado.departamento,
        provincia: res.data?.provincia || formApoderado.provincia,
        distrito: res.data?.distrito || formApoderado.distrito,
        parentesco,
        apoderado: {
          id_persona: res.data?.apoderado?.id_persona || apoderadoEditando.id_persona,
          ocupacion: res.data?.apoderado?.ocupacion || formApoderado.ocupacion,
        },
      };

      setApoderados((actuales) =>
        actuales.map((item) => item.id_persona === actualizado.id_persona ? actualizado : item),
      );

      setApoderadoEncontrado((actual) =>
        actual?.id_persona === actualizado.id_persona ? actualizado : actual,
      );

      closeModal(setModalEditarApoderado, 'editarApoderado');
      setApoderadoEditando(null);
      setMensaje(null);
      showToast({
        type: 'success',
        title: 'Apoderado actualizado',
        message: 'Los datos del apoderado se actualizaron correctamente.',
      });
    } catch (err: any) {
      setErrorPersona(err.response?.data?.message || 'No se pudo actualizar el apoderado.');
    } finally {
      setSavingPersona(false);
    }
  };

  const limpiarFlujoMatricula = () => { setDni(''); setAlumno(null); setApoderados([]); setApoderadoDni(''); setApoderadoEncontrado(null); setParentesco('Madre'); setSeccionId(''); setNivelFiltro(''); setGradoFiltro(''); setExcepcionTraslado(false); setMensaje(null); setTipoIngreso('Nuevo'); setColegioProcedencia(''); setCodigoModularProcedencia(''); setGradoProcedencia(''); setObservacionProcedencia(''); };

  const revisarMatricula = () => {
    // Validación defensiva completa antes de abrir la revisión.

    setMensaje(null);

    if (!alumno || !estudiante) {
      setMensaje(
        'Primero busca o registra un alumno.',
      );
      return;
    }

    if (matriculaActiva) {
      setMensaje(
        formatMatriculaActiva(
          matriculaActiva,
        ),
      );
      return;
    }

    if (colegioDestinoRequerido) {
      setMensaje(
        'Selecciona la institución de destino.',
      );
      return;
    }

    if (!anioId) {
      setMensaje(
        'Selecciona el año lectivo.',
      );
      return;
    }

    if (!nivelFiltro) {
      setMensaje(
        'Selecciona el nivel educativo.',
      );
      return;
    }

    if (!gradoFiltro) {
      setMensaje(
        'Selecciona el grado.',
      );
      return;
    }

    if (
      !seccionId ||
      !seccionSeleccionada
    ) {
      setMensaje(
        'Selecciona una sección con cupos disponibles.',
      );
      return;
    }

    if (!apoderados.length) {
      setMensaje(
        'Debes vincular al menos un apoderado.',
      );
      return;
    }

    if (!tipoIngreso) {
      setMensaje(
        'Selecciona el tipo de ingreso.',
      );
      return;
    }

    if (
      requiereProcedencia &&
      !colegioProcedencia.trim()
    ) {
      setMensaje(
        'Indica la institución de procedencia.',
      );
      return;
    }

    if (
      requiereProcedencia &&
      !gradoProcedencia.trim()
    ) {
      setMensaje(
        'Indica el grado de procedencia.',
      );
      return;
    }

    if (
      mensajeValidacionMatricula &&
      (
        mensajeValidacionMatricula.tipo ===
          'error' ||
        mensajeValidacionMatricula.tipo ===
          'warning'
      )
    ) {
      setMensaje(
        mensajeValidacionMatricula.texto,
      );
      return;
    }

    setClosingModal(null);
    setConfirmOpen(true);
  };

  const registrarMatricula = async () => { if (!token || !estudiante || !anioId || !seccionId) return; setMatriculando(true); setMensaje(null); try { const res = await axios.post(`/api/academicos/matriculas${colegioDestinoQuery}`, { id_estudiante: estudiante.id_persona, id_anio: Number(anioId), id_seccion: Number(seccionId), id_colegio: Number(colegioDestinoId || activeColegio?.id_colegio), apoderados: apoderados.map((a) => ({ id_apoderado: a.id_persona, parentesco: a.parentesco || 'Apoderado' })), excepcion_traslado: excepcionTraslado, tipo_ingreso: tipoIngreso, colegio_procedencia: colegioProcedencia, codigo_modular_procedencia: codigoModularProcedencia, grado_procedencia: gradoProcedencia, observacion_procedencia: observacionProcedencia }, { headers: { Authorization: `Bearer ${token}` } }); const estadoGuardado = res.data?.estado_matricula || tipoIngreso; showToast({ type: 'success', title: estadoGuardado === 'Reserva' || tipoIngreso === 'Reserva' ? 'Reserva registrada' : 'Pre-matrícula registrada', message: estadoGuardado === 'Reserva' || tipoIngreso === 'Reserva' ? 'La reserva se guardó correctamente.' : 'La pre-matrícula se guardó correctamente.' }); setConfirmOpen(false); limpiarFlujoMatricula(); await fetchBase(); } catch (err: any) { const errorMessage = err.response?.data?.message || 'No se pudo registrar la matrícula.'; setMensaje(errorMessage); showToast({ type: 'error', title: 'No se pudo registrar', message: errorMessage }); setConfirmOpen(false); } finally { setMatriculando(false); } };



  const vistaConsolidada =
    activeScope.tipo === 'todos' &&
    puedeVerConsolidado;

  const requiereProcedencia =
    tipoIngreso === 'Traslado' ||
    tipoIngreso === 'Reingreso';

  useEffect(() => {
    if (requiereProcedencia) {
      return;
    }

    setColegioProcedencia('');
    setCodigoModularProcedencia('');
    setGradoProcedencia('');
  }, [requiereProcedencia]);

  const procedenciaCompleta =
    !requiereProcedencia ||
    Boolean(
      colegioProcedencia.trim() &&
      gradoProcedencia.trim(),
    );

  const validacionBloqueante =
    mensajeValidacionMatricula?.tipo ===
      'error' ||
    mensajeValidacionMatricula?.tipo ===
      'warning';

  const datosPrincipalesCompletos =
    Boolean(
      alumno &&
        colegioDestinoDefinido &&
        apoderados.length > 0 &&
        anioSeleccionado &&
        seccionSeleccionada &&
        tipoIngreso &&
        procedenciaCompleta,
    );

  const flujoListo =
    datosPrincipalesCompletos &&
    !validacionBloqueante;

  const pasosFlujo: EnrollmentProgressStep[] = [
    {
      title: 'Alumno',
      done: Boolean(alumno),
    },

    ...(vistaConsolidada
      ? [
          {
            title: 'Institución',
            done: colegioDestinoDefinido,
          },
        ]
      : []),

    {
      title: 'Apoderados',
      done: apoderados.length > 0,
    },
    {
      title: 'Sección',
      done: Boolean(
        anioSeleccionado &&
          seccionSeleccionada,
      ),
    },
    {
      title: 'Ingreso',
      done: Boolean(
        tipoIngreso &&
          procedenciaCompleta,
      ),
    },
    {
      title: 'Revisión',
      done: flujoListo,
    },
  ];

  const pasosCompletos =
    pasosFlujo.filter(
      (step) => step.done,
    ).length;

  const pasoPendiente =
    pasosFlujo.find(
      (step) => !step.done,
    );

  const textoPasoPendiente =
    validacionBloqueante
      ? mensajeValidacionMatricula?.texto ||
        'Existe una validación pendiente.'
      : requiereProcedencia &&
          !colegioProcedencia.trim()
        ? 'Falta indicar la institución de procedencia.'
        : requiereProcedencia &&
            !gradoProcedencia.trim()
          ? 'Falta indicar el grado de procedencia.'
          : pasoPendiente
            ? `Falta completar el paso ${pasoPendiente.title}.`
            : 'Revisa la información antes de continuar.';

  const operacionLabel =
    getNombreOperacion(tipoIngreso);

  const operacionConArticulo =
    `${getArticuloOperacion(tipoIngreso)} ${operacionLabel}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="carbon-matricula-page w-full space-y-6">
      <style>{`
        @keyframes modalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalOverlayOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalPanelIn { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalPanelOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(16px) scale(0.98); } }
        .modal-overlay-enter { animation: modalOverlayIn 0.2s ease-out forwards; }
        .modal-overlay-exit { animation: modalOverlayOut 0.15s ease-in forwards; }
        .modal-panel-enter { animation: modalPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .modal-panel-exit { animation: modalPanelOut 0.15s ease-in forwards; }
      `}</style>

      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <PageHeader
          eyebrow="Gestión académica"
          title="Registro de matrícula"
          description="Registra reservas o pre-matrículas, vincula apoderados y selecciona la institución, el año lectivo y la sección de destino."
          icon={GraduationCap}
          meta={[
            {
              label: 'Contexto activo',
              value: scopeLabel,
            },
            {
              label: 'Institución destino',
              value: colegioDestinoNombre,
            },
          ]}
        />
      </div>

      <EnrollmentProgress
        steps={pasosFlujo}
      />

      <div className={`matricula-main-layout grid gap-5 xl:grid-cols-[0.78fr_1.82fr] transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* ── Columna izquierda ── */}
        <section className="space-y-6">
          <Card icon={Search} title="Buscar alumno" subtitle="Ingresa el DNI para revisar su ficha.">
            <div className="flex gap-3">
              <input value={dni} onChange={(e) => setDni(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarAlumno()} placeholder="DNI del alumno" className={inputClass} />
              <button type="button" onClick={buscarAlumno} disabled={!dni || buscandoAlumno} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-all duration-150 hover:bg-neutral-50 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50">
                {buscandoAlumno ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
              </button>
            </div>
            <button type="button" onClick={() => { setFormAlumno({ ...emptyAlumno, dni }); setErrorPersona(null); setClosingModal(null); setModalAlumno(true); }} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-500 transition-all duration-150 hover:border-[#0f62fe] hover:bg-[#0f62fe]/5 hover:text-neutral-900">
              <UserPlus size={15} /> Nuevo alumno
            </button>
          </Card>

          <Card icon={Clock} title="Últimos registros" subtitle="Últimas 5 pre-matrículas registradas." action={<button type="button" onClick={() => navigate('/matricula/historial')} className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">Ver todas</button>}>
            {loadingBase ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="h-14 animate-pulse rounded-2xl bg-neutral-100" />))}</div>
            ) : ultimas.length === 0 ? (
              <Empty text="Sin registros recientes" />
            ) : (
              <div className="recent-enrollment-list space-y-3">
                {ultimas.slice(0, 5).map((matricula) => {
                  const registrador =
                    matricula.registrado_por?.persona
                      ? `${matricula.registrado_por.persona.nombres} ${matricula.registrado_por.persona.apellido_paterno}`
                      : 'No registrado';

                  const nombreAlumno =
                    `${matricula.estudiante.persona.nombres} ${matricula.estudiante.persona.apellido_paterno}`;

                  const gradoSeccion =
                    `${matricula.seccion.grado.nombre_grado} "${matricula.seccion.letra}"`;

                  const nivel =
                    matricula.seccion.grado.nivel?.nombre_nivel ||
                    'Nivel no indicado';

                  const institucion =
                    matricula.colegio?.nombre ||
                    'Institución no indicada';

                  const anio =
                    matricula.anio?.nombre_anio ||
                    'Año no indicado';

                  const avatarColor =
                    getAvatarColor(nombreAlumno);

                  return (
                    <button
                      key={matricula.id_matricula}
                      type="button"
                      onClick={() =>
                        abrirDetalleMatricula(
                          matricula.id_matricula,
                        )
                      }
                      className="recent-enrollment-card group w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`recent-enrollment-avatar ${avatarColor}`}
                        >
                          {getInitials(
                            matricula.estudiante.persona.nombres,
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="recent-enrollment-code">
                            {getCodigoMatricula(
                              matricula,
                            )}
                          </p>

                          <p className="recent-enrollment-name">
                            {nombreAlumno}
                          </p>

                          <p className="recent-enrollment-dni">
                            DNI:{' '}
                            {matricula.estudiante.persona.dni ||
                              'No registrado'}
                          </p>
                        </div>

                        <span
                          className={`recent-enrollment-status ${getEstadoCls(
                            matricula.estado_matricula,
                          )}`}
                        >
                          {matricula.estado_matricula ||
                            'Registrado'}
                        </span>
                      </div>

                      <div className="recent-enrollment-details">
                        <div>
                          <span>
                            Grado y sección
                          </span>

                          <strong>
                            {gradoSeccion}
                          </strong>

                          <small>
                            {nivel}
                          </small>
                        </div>

                        <div>
                          <span>
                            Institución
                          </span>

                          <strong>
                            {institucion}
                          </strong>

                          <small>
                            {anio}
                          </small>
                        </div>
                      </div>

                      <div className="recent-enrollment-footer">
                        <span>
                          <CalendarDays
                            size={13}
                            aria-hidden="true"
                          />

                          {formatFechaHora(
                            matricula.fecha_matricula,
                          )}
                        </span>

                        <span className="min-w-0 truncate">
                          Registró: {registrador}
                        </span>

                        <span className="recent-enrollment-open">
                          Ver detalle
                          <ArrowRight
                            size={13}
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* ── Columna derecha ── */}
        <section className="matricula-workspace space-y-4">
          {alumno ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  {(() => { const nombre = `${alumno.nombres} ${alumno.apellido_paterno}`; const color = getAvatarColor(nombre); const initials = getInitials(alumno.nombres); return (<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${color}`}>{initials}</div>); })()}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-neutral-900 tracking-tight">{alumno.nombres} {alumno.apellido_paterno} {alumno.apellido_materno}</h3>
                    <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                      <span className="rounded-full bg-neutral-50 px-2 py-0.5 ring-1 ring-neutral-200/60">DNI: {alumno.dni}</span>
                      <span className="rounded-full bg-neutral-50 px-2 py-0.5 ring-1 ring-neutral-200/60">Código: {estudiante?.codigo_estudiante || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {matriculaActiva ? <Badge tone="amber">{matriculaActiva.estado_matricula}</Badge> : <Badge tone="emerald">Disponible</Badge>}
                  <button type="button" onClick={() => { setFormAlumno({ dni: alumno.dni||'', nombres: alumno.nombres||'', apellido_paterno: alumno.apellido_paterno||'', apellido_materno: alumno.apellido_materno||'', fecha_nacimiento: alumno.fecha_nacimiento ? alumno.fecha_nacimiento.slice(0,10) : '', genero: alumno.genero||'', telefono: alumno.telefono||'', correo: alumno.correo||'', direccion: alumno.direccion||'', pais: alumno.pais||'Perú', departamento: alumno.departamento||'', provincia: alumno.provincia||'', distrito: alumno.distrito||'' }); setErrorPersona(null); setClosingModal(null); setModalEditarAlumno(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 hover:border-neutral-300">
                    <PencilLine size={13} /> Editar datos
                  </button>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Info icon={CalendarDays} label="Edad" value={edadTexto(alumno.fecha_nacimiento)} />
                  <Info icon={Users} label="Género" value={generoTexto(alumno.genero)} />
                  <Info icon={Phone} label="Teléfono" value={alumno.telefono || '—'} />
                  <Info icon={MapPin} label="Distrito" value={alumno.distrito || '—'} />
                </div>
                {estudiante?.matriculas?.length > 0 && (
                  <div className="matricula-visible-history">
                    <div className="matricula-visible-history__heading">
                      <div>
                        <p>Matrículas registradas</p>
                        <span>
                          Historial académico visible del alumno.
                        </span>
                      </div>

                      <strong>
                        {estudiante.matriculas.length}
                      </strong>
                    </div>

                    <div className="matricula-visible-history__list">
                      {estudiante.matriculas.map((matricula) => (
                        <div
                          key={matricula.id_matricula}
                          className="matricula-visible-history__item"
                        >
                          <div className="matricula-visible-history__title">
                            <div>
                              <strong>
                                {matricula.seccion?.grado
                                  ?.nombre_grado ||
                                  'Grado no indicado'}{' '}
                                &quot;
                                {matricula.seccion?.letra ||
                                  '-'}
                                &quot;
                              </strong>

                              <small>
                                {matricula.codigo_matricula ||
                                  `Matrícula ${matricula.id_matricula}`}
                              </small>
                            </div>

                            <span
                              className={`matricula-visible-history__status ${getEstadoCls(
                                matricula.estado_matricula,
                              )}`}
                            >
                              {matricula.estado_matricula}
                            </span>
                          </div>

                          <div className="matricula-visible-history__meta">
                            <span>
                              <GraduationCap size={13} />
                              {matricula.seccion?.grado
                                ?.nivel?.nombre_nivel ||
                                'Nivel no indicado'}
                            </span>

                            <span>
                              <MapPin size={13} />
                              {matricula.colegio?.nombre ||
                                'Institución no indicada'}
                            </span>

                            <span>
                              <CalendarDays size={13} />
                              {matricula.anio?.nombre_anio ||
                                'Año lectivo no indicado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100"><Users size={24} className="text-neutral-300" /></div>
                <div><h3 className="text-sm font-medium text-neutral-700">Busca un alumno por DNI</h3><p className="mt-1 max-w-xs text-xs text-neutral-400">Al encontrarlo podrás vincular apoderados y registrar la pre-matrícula.</p></div>
              </div>
            </div>
          )}

          {alumno && matriculaActiva && (
            <Card icon={AlertCircle} title={matriculaActiva.estado_matricula === 'Reserva' ? 'Alumno con reserva registrada' : matriculaActiva.estado_matricula === 'Pre-matriculado' ? 'Alumno pre-matriculado' : matriculaActiva.estado_matricula === 'Activo' ? 'Alumno con matrícula activa' : 'Matrícula existente'} subtitle="No es necesario iniciar una nueva matrícula para este alumno.">
              <div className="flex items-start gap-2 rounded-xl bg-amber-50/50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200/60"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{formatMatriculaActiva(matriculaActiva)}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => irADetalleMatriculaActiva(matriculaActiva)} className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-all duration-150 hover:bg-neutral-50">Ver detalle</button>
                <button type="button" onClick={() => { setDni(''); setAlumno(null); setApoderados([]); setMensaje(null); }} className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50">Buscar otro alumno</button>
              </div>
            </Card>
          )}

          {alumno && !matriculaActiva && (
            <div className="matricula-enrollment-flow">
              <div className="matricula-flow-top-grid">
                {vistaConsolidada && (
                  <Card
                    icon={MapPin}
                    title="Institución destino"
                    subtitle="Selecciona la sede donde se registrará al alumno."
                  >
                    <label>
                      <span className={labelClass}>
                        Institución de matrícula
                      </span>

                      <select
                        value={colegioDestinoId}
                        onChange={(event) => {
                          setColegioDestinoId(
                            event.target.value
                              ? Number(
                                  event.target.value,
                                )
                              : '',
                          );

                          setSeccionId('');
                          setAnioId('');
                          setNivelFiltro('');
                          setGradoFiltro('');
                          setExcepcionTraslado(false);
                          setMensaje(null);
                        }}
                        className={selectClass}
                      >
                        <option value="">
                          Selecciona institución destino
                        </option>

                        {colegios.map((colegio) => (
                          <option
                            key={colegio.id_colegio}
                            value={colegio.id_colegio}
                          >
                            {colegio.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  </Card>
                )}

                <Card
                  icon={ShieldCheck}
                  title="Apoderados"
                  subtitle="Busca un apoderado existente o registra uno nuevo."
                >
                  <div className="matricula-guardian-search">
                    <input
                      value={apoderadoDni}
                      onChange={(event) =>
                        setApoderadoDni(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) =>
                        event.key === 'Enter' &&
                        buscarApoderado()
                      }
                      placeholder="DNI del apoderado"
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={buscarApoderado}
                      disabled={
                        !apoderadoDni ||
                        buscandoApoderado
                      }
                      className="matricula-guardian-search__button"
                    >
                      {buscandoApoderado ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Search size={16} />
                      )}

                      Buscar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setParentesco('Madre');

                        setFormApoderado({
                          ...emptyApoderado,
                        });

                        setErrorPersona(null);
                        setClosingModal(null);
                        setModalApoderado(true);
                      }}
                      className="matricula-new-guardian-button"
                    >
                      <UserPlus size={16} />
                      Nuevo
                    </button>
                  </div>

                  {apoderadoEncontrado && (
                    <div className="matricula-guardian-result">
                      <div className="min-w-0">
                        <p className="matricula-guardian-result__name">
                          {apoderadoEncontrado.nombres}{' '}
                          {
                            apoderadoEncontrado.apellido_paterno
                          }{' '}
                          {
                            apoderadoEncontrado.apellido_materno
                          }
                        </p>

                        <p className="matricula-guardian-result__detail">
                          DNI {apoderadoEncontrado.dni}
                          {' · '}
                          {apoderadoEncontrado.telefono ||
                            'Sin teléfono'}
                          {' · '}
                          {apoderadoEncontrado.distrito ||
                            'Sin distrito'}
                        </p>
                      </div>

                      <div className="matricula-guardian-result__actions">
                        <label>
                          <span className="sr-only">
                            Vínculo con el alumno
                          </span>

                          <select
                            value={parentesco}
                            onChange={(event) =>
                              setParentesco(
                                event.target.value,
                              )
                            }
                            className="matricula-guardian-result__relationship"
                            aria-label="Vínculo con el alumno"
                          >
                            {parentescos.map(
                              (parentescoItem) => (
                                <option
                                  key={parentescoItem}
                                  value={parentescoItem}
                                >
                                  {parentescoItem}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            agregarApoderado({
                              ...apoderadoEncontrado,
                              parentesco,
                            })
                          }
                          className="matricula-guardian-result__add"
                        >
                          Vincular
                        </button>
                      </div>
                    </div>
                  )}

                  {apoderados.length > 0 ? (
                    <div className="matricula-guardian-chips">
                      {apoderados.map((apoderado) => {
                        const avatarColor =
                          getAvatarColor(
                            apoderado.nombres,
                          );

                        const initials =
                          getInitials(
                            apoderado.nombres,
                          );

                        return (
                          <div
                            key={apoderado.id_persona}
                            className="matricula-guardian-chip"
                          >
                            <span
                              className={`matricula-guardian-chip__avatar ${avatarColor}`}
                            >
                              {initials}
                            </span>

                            <span className="matricula-guardian-chip__copy">
                              <strong>
                                {apoderado.nombres}{' '}
                                {
                                  apoderado.apellido_paterno
                                }
                              </strong>

                              <small>
                                {apoderado.parentesco}
                                {' · '}
                                DNI {apoderado.dni}
                              </small>
                            </span>

                            <span className="matricula-guardian-chip__actions">
                              <button
                                type="button"
                                title="Editar apoderado"
                                aria-label={`Editar a ${apoderado.nombres}`}
                                onClick={() =>
                                  abrirEditarApoderado(
                                    apoderado,
                                  )
                                }
                              >
                                <PencilLine size={15} />
                              </button>

                              <button
                                type="button"
                                className="matricula-guardian-chip__remove"
                                title="Desvincular apoderado"
                                aria-label={`Desvincular a ${apoderado.nombres}`}
                                onClick={async () => {
                                  if (
                                    !token ||
                                    !estudiante?.id_persona
                                  ) {
                                    return;
                                  }

                                  try {
                                    await axios.delete(
                                      `/api/academicos/alumnos/${estudiante.id_persona}/apoderados/${apoderado.id_persona}`,
                                      {
                                        headers: {
                                          Authorization:
                                            `Bearer ${token}`,
                                        },
                                      },
                                    );

                                    setApoderados(
                                      (actuales) =>
                                        actuales.filter(
                                          (item) =>
                                            item.id_persona !==
                                            apoderado.id_persona,
                                        ),
                                    );

                                    setMensaje(null);

                                    showToast({
                                      type: 'success',
                                      title:
                                        'Apoderado desvinculado',
                                      message:
                                        'El apoderado fue retirado de la ficha del alumno.',
                                    });
                                  } catch (
                                    error: any
                                  ) {
                                    setMensaje(
                                      error.response?.data
                                        ?.message ||
                                        'No se pudo desvincular el apoderado.',
                                    );
                                  }
                                }}
                              >
                                <X size={15} />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="matricula-guardian-empty">
                      Todavía no hay apoderados vinculados.
                    </div>
                  )}
                </Card>
              </div>

              <Card
                icon={GraduationCap}
                title="Año, grado y sección"
                subtitle="Selecciona primero los filtros y luego la sección de destino."
              >
                <div className="matricula-registration-grid">
                  <section className="matricula-section-picker">
                    <div className="matricula-section-picker__heading">
                      <div>
                        <span>Sección de destino</span>
                        <strong>
                          Elige una sección con cupos disponibles
                        </strong>
                      </div>

                      {seccionSeleccionada && (
                        <span className="matricula-selected-section">
                          {seccionSeleccionada.grado
                            .nombre_grado}{' '}
                          “{seccionSeleccionada.letra}”
                        </span>
                      )}
                    </div>

                    <div className="matricula-filter-grid">
                      <label>
                        <span className={labelClass}>
                          Año lectivo
                        </span>

                        <select
                          value={anioId}
                          onChange={(event) => {
                            setAnioId(
                              event.target.value
                                ? Number(
                                    event.target.value,
                                  )
                                : '',
                            );

                            setNivelFiltro('');
                            setGradoFiltro('');
                            setSeccionId('');
                            setExcepcionTraslado(false);
                          }}
                          className={selectClass}
                        >
                          <option value="">
                            Selecciona año
                          </option>

                          {aniosDisponibles.map(
                            (anio) => (
                              <option
                                key={anio.id_anio}
                                value={anio.id_anio}
                              >
                                {anio.nombre_anio}
                                {' · '}
                                {anio.estado}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>
                          Nivel
                        </span>

                        <select
                          value={nivelFiltro}
                          disabled={!anioId}
                          onChange={(event) => {
                            setNivelFiltro(
                              event.target.value,
                            );

                            setGradoFiltro('');
                            setSeccionId('');
                          }}
                          className={selectClass}
                        >
                          <option value="">
                            Selecciona nivel
                          </option>

                          {niveles.map((nivel) => (
                            <option
                              key={nivel}
                              value={nivel}
                            >
                              {nivel}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>
                          Grado
                        </span>

                        <select
                          value={gradoFiltro}
                          disabled={!nivelFiltro}
                          onChange={(event) => {
                            setGradoFiltro(
                              event.target.value,
                            );

                            setSeccionId('');
                          }}
                          className={selectClass}
                        >
                          <option value="">
                            Selecciona grado
                          </option>

                          {grados.map((grado) => (
                            <option
                              key={grado}
                              value={grado}
                            >
                              {grado}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {aniosDisponibles.length === 0 && (
                      <p className="matricula-inline-error">
                        No hay años lectivos disponibles.
                      </p>
                    )}

                    {!anioId ||
                    !nivelFiltro ||
                    !gradoFiltro ? (
                      <div className="matricula-section-prompt">
                        <GraduationCap size={22} />

                        <div>
                          <strong>
                            Completa los filtros
                          </strong>

                          <p>
                            Selecciona año, nivel y grado
                            para mostrar únicamente sus
                            secciones.
                          </p>
                        </div>
                      </div>
                    ) : seccionesFiltradas.length ===
                      0 ? (
                      <Empty text="No hay secciones configuradas para este grado." />
                    ) : (
                      <div className="matricula-section-grid">
                        {seccionesFiltradas.map(
                          (seccion) => {
                            const selected =
                              seccion.id_seccion ===
                              seccionId;

                            const sinCupos =
                              seccion.disponibles <= 0;

                            const porcentajeOcupado =
                              seccion.capacidad > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (seccion.matriculados /
                                        seccion.capacidad) *
                                        100,
                                    ),
                                  )
                                : 0;

                            const porcentajeDisponible =
                              seccion.capacidad > 0
                                ? Math.round(
                                    (seccion.disponibles /
                                      seccion.capacidad) *
                                      100,
                                  )
                                : 0;

                            const pocosCupos =
                              !sinCupos &&
                              (seccion.disponibles <= 5 ||
                                porcentajeDisponible <=
                                  20);

                            const statusClass =
                              sinCupos
                                ? 'matricula-section-card--full'
                                : pocosCupos
                                  ? 'matricula-section-card--warning'
                                  : 'matricula-section-card--available';

                            const statusLabel =
                              sinCupos
                                ? 'Sin cupos'
                                : pocosCupos
                                  ? 'Pocos cupos'
                                  : 'Disponible';

                            return (
                              <button
                                key={
                                  seccion.id_seccion
                                }
                                type="button"
                                disabled={sinCupos}
                                onClick={() => {
                                  setSeccionId(
                                    selected
                                      ? ''
                                      : seccion.id_seccion,
                                  );

                                  setExcepcionTraslado(
                                    false,
                                  );
                                }}
                                className={cx(
                                  'matricula-section-card',
                                  statusClass,
                                  selected &&
                                    'matricula-section-card--selected',
                                )}
                              >
                                <div className="matricula-section-card__header">
                                  <div>
                                    <strong>
                                      {
                                        seccion.grado
                                          .nombre_grado
                                      }{' '}
                                      “{seccion.letra}”
                                    </strong>

                                    <small>
                                      {seccion.grado
                                        .nivel
                                        ?.nombre_nivel ||
                                        'Nivel'}
                                    </small>
                                  </div>

                                  <span className="matricula-section-card__status">
                                    {selected ? (
                                      <CheckCircle2
                                        size={14}
                                      />
                                    ) : null}

                                    {selected
                                      ? 'Confirmada'
                                      : statusLabel}
                                  </span>
                                </div>

                                <div className="matricula-section-card__vacancies">
                                  <span>
                                    <strong>
                                      {
                                        seccion.disponibles
                                      }
                                    </strong>
                                    vacantes
                                  </span>

                                  <span>
                                    {
                                      seccion.matriculados
                                    }
                                    {' '}
                                    matriculados
                                  </span>
                                </div>

                                <div className="matricula-section-card__meter">
                                  <span
                                    style={{
                                      width:
                                        `${porcentajeOcupado}%`,
                                    }}
                                  />
                                </div>

                                <small className="matricula-section-card__capacity">
                                  Capacidad total:{' '}
                                  {seccion.capacidad}
                                </small>
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </section>

                  <section className="matricula-entry-panel">
                    <div className="matricula-entry-panel__heading">
                      <span>Tipo de ingreso</span>

                      <strong>
                        Define cómo ingresa el alumno
                      </strong>
                    </div>

                    <label>
                      <span className={labelClass}>
                        Proceso
                      </span>

                      <select
                        value={tipoIngreso}
                        onChange={(event) =>
                          setTipoIngreso(
                            event.target.value,
                          )
                        }
                        className={selectClass}
                        disabled={
                          tiposIngresoPermitidos.length ===
                          0
                        }
                      >
                        {tiposIngresoPermitidos.length ===
                        0 ? (
                          <option value="">
                            Selecciona primero un año
                          </option>
                        ) : (
                          tiposIngresoPermitidos.map(
                            (tipo) => (
                              <option
                                key={tipo}
                                value={tipo}
                              >
                                {tipo}
                              </option>
                            ),
                          )
                        )}
                      </select>
                    </label>

                    {anioSeleccionado && (
                      <div className="matricula-year-status">
                        {getEstadoOperativoAnioFrontend(
                          anioSeleccionado,
                        ) === 'Planificación'
                          ? 'Año en planificación: permite reservas y renovaciones anticipadas.'
                          : getEstadoOperativoAnioFrontend(
                                anioSeleccionado,
                              ) === 'En curso'
                            ? 'Año en curso: permite traslado, reingreso o regularización.'
                            : 'Matrícula abierta: permite el ingreso regular.'}
                      </div>
                    )}

                    {requiereProcedencia ? (
                      <div className="matricula-origin-fields">
                        <label>
                          <span className={labelClass}>
                            Institución de procedencia
                          </span>

                          <input
                            value={colegioProcedencia}
                            onChange={(event) =>
                              setColegioProcedencia(
                                event.target.value,
                              )
                            }
                            placeholder="Nombre de la institución anterior"
                            className={inputClass}
                          />
                        </label>

                        <label>
                          <span className={labelClass}>
                            Grado de procedencia
                          </span>

                          <input
                            value={gradoProcedencia}
                            onChange={(event) =>
                              setGradoProcedencia(
                                event.target.value,
                              )
                            }
                            placeholder="Ej. 4to de primaria"
                            className={inputClass}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="matricula-origin-not-required">
                        Para este tipo de ingreso no se
                        requieren datos de otra institución.
                      </div>
                    )}

                    <details className="matricula-optional-fields">
                      <summary>
                        Datos adicionales y observación
                      </summary>

                      <div className="matricula-optional-fields__content">
                        {requiereProcedencia && (
                          <label>
                            <span className={labelClass}>
                              Código modular
                            </span>

                            <input
                              value={
                                codigoModularProcedencia
                              }
                              onChange={(event) =>
                                setCodigoModularProcedencia(
                                  event.target.value,
                                )
                              }
                              placeholder="Opcional"
                              className={inputClass}
                            />
                          </label>
                        )}

                        <label>
                          <span className={labelClass}>
                            Observación opcional
                          </span>

                          <textarea
                            value={
                              observacionProcedencia
                            }
                            onChange={(event) =>
                              setObservacionProcedencia(
                                event.target.value,
                              )
                            }
                            placeholder="Información adicional sobre el proceso"
                            className="matricula-observation"
                          />
                        </label>
                      </div>
                    </details>
                  </section>
                </div>

                {seccionSeleccionada &&
                  reglaEdadSeleccionada()
                    ?.permiteExcepcionTraslado && (
                    <label className="matricula-transfer-exception">
                      <input
                        type="checkbox"
                        checked={excepcionTraslado}
                        onChange={(event) =>
                          setExcepcionTraslado(
                            event.target.checked,
                          )
                        }
                      />

                      <span>
                        <strong>
                          Excepción por traslado
                        </strong>

                        Usar únicamente cuando exista una
                        constancia o certificado que sustente
                        la continuidad del alumno.
                      </span>
                    </label>
                  )}

                {mensajeValidacionMatricula && (
                  <div
                    className={cx(
                      'matricula-validation-message',
                      mensajeValidacionMatricula.tipo ===
                        'error'
                        ? 'matricula-validation-message--error'
                        : mensajeValidacionMatricula.tipo ===
                            'warning'
                          ? 'matricula-validation-message--warning'
                          : 'matricula-validation-message--info',
                    )}
                  >
                    {mensajeValidacionMatricula.tipo ===
                    'error' ? (
                      <AlertCircle size={17} />
                    ) : (
                      <AlertTriangle size={17} />
                    )}

                    {
                      mensajeValidacionMatricula.texto
                    }
                  </div>
                )}

                {matriculaPosterior && (
                  <div className="matricula-future-enrollment-warning">
                    <CalendarDays size={18} />

                    <div>
                      <strong>
                        El alumno tiene un proceso para un año posterior
                      </strong>

                      <p>
                        {matriculaPosterior.anio?.nombre_anio ||
                          'Año posterior'}
                        {' · '}
                        {matriculaPosterior.colegio?.nombre ||
                          'Institución no indicada'}
                        {' · '}
                        {matriculaPosterior.seccion?.grado
                          ?.nombre_grado ||
                          'Grado no indicado'}{' '}
                        &quot;
                        {matriculaPosterior.seccion?.letra ||
                          '-'}
                        &quot;.
                        Este registro se realizará para{' '}
                        {anioSeleccionado?.nombre_anio ||
                          'el año seleccionado'}.
                        Verifica que corresponda antes de continuar.
                      </p>
                    </div>
                  </div>
                )}

                {mensaje && (
                  <div className="matricula-validation-message matricula-validation-message--neutral">
                    <AlertCircle size={17} />
                    {mensaje}
                  </div>
                )}

                <div className="matricula-final-action">
                  <div>
                    <span>
                      {pasosCompletos} de{' '}
                      {pasosFlujo.length} pasos
                      completados
                    </span>

                    <strong>
                      {flujoListo
                        ? `Todo listo para registrar ${operacionConArticulo}.`
                        : textoPasoPendiente}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={revisarMatricula}
                    disabled={
                      !flujoListo ||
                      validacionBloqueante ||
                      aniosDisponibles.length === 0
                    }
                    aria-disabled={
                      !flujoListo ||
                      validacionBloqueante ||
                      aniosDisponibles.length === 0
                    }
                  >
                    Revisar y registrar{' '}
                    {operacionConArticulo}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </Card>
            </div>
          )}
        </section>
      </div>

      {/* ── Modal confirmación ── */}
      {confirmOpen && alumno && seccionSeleccionada && (
        <ViewportPortal>
          <div className={`carbon-matricula-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center px-4 py-6 backdrop-blur-sm ${closingModal === 'confirm' ? 'modal-overlay-exit' : 'modal-overlay-enter'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(setConfirmOpen, 'confirm'); }}>
          <div className="absolute inset-0 bg-neutral-950/40" />
          <div className={`carbon-matricula-modal-panel matricula-review-modal relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200/50 flex flex-col max-h-[88vh] ${closingModal === 'confirm' ? 'modal-panel-exit' : 'modal-panel-enter'}`}>
            <ModalHead title={`Revisar ${operacionConArticulo}`} subtitle="Confirma la institución, sección, proceso y apoderados antes de guardar." onClose={() => closeModal(setConfirmOpen, 'confirm')} />
            <div className="matricula-review-body space-y-4 p-6 overflow-y-auto">
              <div className="matricula-review-intro">
                <span>
                  <CheckCircle2 size={22} />
                </span>

                <div>
                  <small>Revisión final</small>

                  <strong>
                    Confirma los datos antes de registrar{' '}
                    {operacionConArticulo}
                  </strong>

                  <p>
                    El sistema todavía no guardará cambios
                    hasta que pulses el botón de confirmación.
                  </p>
                </div>
              </div>

              {alertaEdad && (
                <div className="matricula-review-alert matricula-review-alert--warning">
                  <AlertTriangle size={17} />
                  {alertaEdad}
                </div>
              )}

              {matriculaPosterior && (
                <div className="matricula-review-alert matricula-review-alert--info">
                  <CalendarDays size={17} />

                  <div>
                    <strong>
                      Existe un proceso para un año posterior
                    </strong>

                    <p>
                      {matriculaPosterior.anio?.nombre_anio ||
                        'Año posterior'}
                      {' · '}
                      {matriculaPosterior.colegio?.nombre ||
                        'Institución no indicada'}.
                      El registro actual corresponde a{' '}
                      {anioSeleccionado?.nombre_anio ||
                        'otro año lectivo'}.
                    </p>
                  </div>
                </div>
              )}

              <div className="matricula-review-grid">
                <Summary
                  label="Alumno"
                  value={`${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`}
                  detail={`DNI ${alumno.dni} · ${edadTexto(
                    alumno.fecha_nacimiento,
                  )}`}
                />

                <Summary
                  label="Institución destino"
                  value={colegioDestinoNombre}
                  detail={
                    anioSeleccionado?.nombre_anio ||
                    'Año lectivo no indicado'
                  }
                />

                <Summary
                  label="Destino académico"
                  value={`${seccionSeleccionada.grado.nombre_grado} "${seccionSeleccionada.letra}"`}
                  detail={
                    seccionSeleccionada.grado.nivel
                      ?.nombre_nivel ||
                    'Nivel no indicado'
                  }
                />

                <Summary
                  label="Proceso"
                  value={tipoIngreso}
                  detail={
                    requiereProcedencia
                      ? `${colegioProcedencia} · ${gradoProcedencia}`
                      : 'No requiere institución de procedencia'
                  }
                />
              </div>

              <div className="matricula-review-guardians">
                <div className="matricula-review-guardians__heading">
                  <div>
                    <span>Apoderados vinculados</span>
                    <small>
                      {apoderados.length}{' '}
                      {apoderados.length === 1
                        ? 'apoderado'
                        : 'apoderados'}
                    </small>
                  </div>

                  <Users size={18} />
                </div>

                <div className="matricula-review-guardians__list">
                  {apoderados.map((apoderado) => (
                    <div
                      key={apoderado.id_persona}
                      className="matricula-review-guardian"
                    >
                      <span
                        className={`matricula-review-guardian__avatar ${getAvatarColor(
                          apoderado.nombres,
                        )}`}
                      >
                        {getInitials(
                          apoderado.nombres,
                        )}
                      </span>

                      <div>
                        <strong>
                          {apoderado.nombres}{' '}
                          {apoderado.apellido_paterno}
                        </strong>

                        <small>
                          {apoderado.parentesco}
                          {' · '}
                          DNI {apoderado.dni}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="matricula-review-footer flex flex-col-reverse gap-3 border-t border-neutral-100 sm:flex-row sm:justify-end flex-shrink-0">
              <button type="button" onClick={() => closeModal(setConfirmOpen, 'confirm')} className="h-10 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50">Corregir</button>
              <button type="button" onClick={registrarMatricula} disabled={matriculando} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#0f62fe] px-5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0043ce] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100">
                {matriculando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirmar {operacionConArticulo}
              </button>
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}

      {/* ── Modales persona ── */}
      {modalAlumno && <PersonaModal title="Nuevo alumno" form={formAlumno} setForm={setFormAlumno} error={errorPersona} loading={savingPersona} onClose={() => closeModal(setModalAlumno, 'alumno')} onSave={() => crearPersona('alumno')} aviso={avisoEdadFichaAlumno} alumno isClosing={closingModal === 'alumno'} />}
      {modalEditarAlumno && <PersonaModal title="Editar alumno" form={formAlumno} setForm={setFormAlumno} error={errorPersona} loading={savingPersona} onClose={() => closeModal(setModalEditarAlumno, 'editarAlumno')} onSave={editarAlumno} alumno isClosing={closingModal === 'editarAlumno'} />}
      {modalApoderado && <PersonaModal title="Nuevo apoderado" form={formApoderado} setForm={setFormApoderado} error={errorPersona} loading={savingPersona} onClose={() => closeModal(setModalApoderado, 'apoderado')} onSave={() => crearPersona('apoderado')} apoderado parentesco={parentesco} onParentescoChange={setParentesco} isClosing={closingModal === 'apoderado'} />}
      {modalEditarApoderado && (
        <PersonaModal
          title="Editar apoderado"
          form={formApoderado}
          setForm={setFormApoderado}
          error={errorPersona}
          loading={savingPersona}
          onClose={() => closeModal(setModalEditarApoderado, 'editarApoderado')}
          onSave={editarApoderado}
          apoderado
          parentesco={parentesco}
          onParentescoChange={setParentesco}
          isClosing={closingModal === 'editarApoderado'}
        />
      )}

      {/* ── Modal detalle matrícula ── */}
      {detalleOpen && (
        <ViewportPortal>
          <div className={`carbon-matricula-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center px-4 py-6 backdrop-blur-sm ${closingModal === 'detail' ? 'modal-overlay-exit' : 'modal-overlay-enter'}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(setDetalleOpen, 'detail'); }}>
          <div className="absolute inset-0 bg-neutral-950/40" />
          <div className={`relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200/50 flex flex-col max-h-[90vh] ${closingModal === 'detail' ? 'modal-panel-exit' : 'modal-panel-enter'}`}>
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-6 flex-shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0f62fe]/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 ring-1 ring-[#0f62fe]/20">Detalle de matrícula</div>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900 tracking-tight">{detalleMatricula?.estudiante?.persona ? `${getCodigoDetalleMatricula(detalleMatricula)} · ${detalleMatricula.estudiante.persona.nombres} ${detalleMatricula.estudiante.persona.apellido_paterno}` : 'Cargando matrícula'}</h3>
                <p className="mt-0.5 text-xs text-neutral-400">Información académica, apoderados y cronograma generado.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50">Imprimir / PDF</button>
                <button type="button" onClick={() => closeModal(setDetalleOpen, 'detail')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition-all duration-150 hover:bg-neutral-200"><X size={15} /></button>
              </div>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? (
                <div className="flex min-h-[260px] items-center justify-center"><Loader2 size={22} className="animate-spin text-[#0f62fe]" /></div>
              ) : detalleMatricula ? (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <DetailBox label="Código" value={getCodigoDetalleMatricula(detalleMatricula)} />
                    <DetailBox label="Estado" value={detalleMatricula.estado_matricula} />
                    <DetailBox label="Fecha" value={formatFechaHora(detalleMatricula.fecha_matricula)} />
                    <DetailBox label="Registrado por" value={detalleMatricula.registrado_por?.persona ? `${detalleMatricula.registrado_por.persona.nombres} ${detalleMatricula.registrado_por.persona.apellido_paterno}` : 'No registrado'} />
                  </div>
                  <SectionBox title="Datos académicos">
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailBox label="Colegio" value={detalleMatricula.colegio?.nombre || '—'} white />
                      <DetailBox label="Nivel" value={detalleMatricula.seccion?.grado?.nivel?.nombre_nivel || '—'} white />
                      <DetailBox label="Grado" value={detalleMatricula.seccion?.grado?.nombre_grado || '—'} white />
                      <DetailBox label="Sección" value={detalleMatricula.seccion?.letra || '—'} white />
                      <DetailBox label="Año lectivo" value={detalleMatricula.anio?.nombre_anio || '—'} white />
                      <DetailBox label="Aula" value={detalleMatricula.seccion?.aula?.nombre_aula || '—'} white />
                    </div>
                  </SectionBox>
                  <SectionBox title="Apoderados">
                    <div className="space-y-3">
                      {detalleMatricula.estudiante?.apoderados?.length ? (
                        detalleMatricula.estudiante.apoderados.map((relacion: any) => (
                          <div key={relacion.id_apoderado} className="rounded-xl bg-white p-4 ring-1 ring-neutral-200/60">
                            <p className="text-sm font-medium text-neutral-800">{relacion.parentesco}: {relacion.apoderado.persona.nombres} {relacion.apoderado.persona.apellido_paterno}</p>
                            <div className="mt-3 grid gap-2 text-xs text-neutral-500 md:grid-cols-2">
                              <p><span className="text-neutral-400">DNI:</span> {relacion.apoderado.persona.dni || '—'}</p>
                              <p><span className="text-neutral-400">Número:</span> {relacion.apoderado.persona.telefono || '—'}</p>
                              <p><span className="text-neutral-400">Correo:</span> {relacion.apoderado.persona.correo || '—'}</p>
                              <p><span className="text-neutral-400">Distrito:</span> {relacion.apoderado.persona.distrito || '—'}</p>
                              <p><span className="text-neutral-400">Departamento:</span> {relacion.apoderado.persona.departamento || '—'}</p>
                              <p><span className="text-neutral-400">Dirección:</span> {relacion.apoderado.persona.direccion || '—'}</p>
                            </div>
                          </div>
                        ))
                      ) : (<p className="text-sm text-neutral-400">Sin apoderados vinculados.</p>)}
                    </div>
                  </SectionBox>
                  <SectionBox title="Resumen financiero">
                    <div className="grid gap-3 md:grid-cols-4">
                      <DetailBox label="Pago matrícula" value={detalleMatricula.resumen_financiero?.estado_pago_matricula || 'No generado'} white />
                      <DetailBox label="Programado" value={formatMoney(detalleMatricula.resumen_financiero?.total_programado)} white />
                      <DetailBox label="Pagado" value={formatMoney(detalleMatricula.resumen_financiero?.total_pagado)} white />
                      <DetailBox label="Saldo" value={formatMoney(detalleMatricula.resumen_financiero?.saldo)} white />
                    </div>
                  </SectionBox>
                  <div className="rounded-xl bg-neutral-50 p-5 ring-1 ring-neutral-200/60">
                    <button type="button" onClick={() => setCronogramaOpen(!cronogramaOpen)} className="flex w-full items-center justify-between text-left">
                      <div><h4 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Cronograma de pagos</h4><p className="mt-1 text-xs text-neutral-400">{detalleMatricula.cronogramas?.length || 0} conceptos generados</p></div>
                      <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 transition-all duration-150 hover:bg-neutral-50">{cronogramaOpen ? 'Ocultar' : 'Ver detalle'}</span>
                    </button>
                    {cronogramaOpen && (
                      <div className="mt-4 space-y-2">
                        {detalleMatricula.cronogramas?.length ? (
                          detalleMatricula.cronogramas.map((item: any) => (
                            <div key={item.id_cronograma} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-neutral-200/60 sm:flex-row sm:items-center sm:justify-between">
                              <div><p className="text-sm font-medium text-neutral-800">{item.concepto.nombre_concepto}</p><p className="mt-0.5 text-xs text-neutral-400">Vencimiento: {new Date(item.fecha_vencimiento).toLocaleDateString('es-PE')} · Monto: {formatMoney(item.concepto.monto_base)}</p></div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getEstadoCls(item.estado_pago)}`}>{item.estado_pago}</span>
                            </div>
                          ))
                        ) : (<p className="text-sm text-neutral-400">No hay conceptos generados.</p>)}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Card({ icon: Icon, title, subtitle, children, action }: { icon: any; title: string; subtitle: string; children: any; action?: any }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0f62fe]/10 text-[#0f62fe]"><Icon size={15} strokeWidth={2} /></div>
          <div><h2 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h2><p className="text-[11px] text-neutral-400">{subtitle}</p></div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) { return (<div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-5 text-center"><p className="text-sm text-neutral-400">{text}</p></div>); }

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
      <div className="flex items-center gap-1.5 text-neutral-400"><Icon size={13} /><p className="text-[11px] font-semibold uppercase tracking-widest">{label}</p></div>
      <p className="mt-2 truncate text-base font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'emerald' | 'amber'; children: string }) {
  const cls = tone === 'emerald' ? 'bg-emerald-50/50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-amber-50/50 text-amber-700 ring-1 ring-amber-200/60';
  return <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="matricula-review-summary rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{detail}</p>
    </div>
  );
}

function DetailBox({ label, value, white = false }: { label: string; value: string; white?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ring-neutral-200/60 ${white ? 'bg-white' : 'bg-neutral-50'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ModalHead({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-6 flex-shrink-0">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0f62fe]/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 ring-1 ring-[#0f62fe]/20"><UserPlus size={11} /> Registro</div>
        <h3 className="mt-2 text-lg font-semibold text-neutral-900 tracking-tight">{title}</h3>
        <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition-all duration-150 hover:bg-neutral-200"><X size={15} /></button>
    </div>
  );
}

function PersonaModal({ title, form, setForm, error, loading, onClose, onSave, alumno, apoderado, aviso, parentesco, onParentescoChange, isClosing }: any) {
  const set = (key: keyof PersonaForm, value: string) => setForm({ ...form, [key]: value });

  if (typeof document === 'undefined') return null;

  return createPortal(
    (
    <div className={`carbon-matricula-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center px-4 py-6 backdrop-blur-sm ${isClosing ? 'modal-overlay-exit' : 'modal-overlay-enter'}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-neutral-950/40" />
      <div className={`carbon-matricula-modal-panel relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200/50 flex flex-col max-h-[88vh] ${isClosing ? 'modal-panel-exit' : 'modal-panel-enter'}`}>
        <ModalHead title={title} subtitle="Registra datos básicos y ubicación." onClose={onClose} />
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} onChange={(v: string) => set('dni', v)} />
            {alumno && <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento || ''} onChange={(v: string) => set('fecha_nacimiento', v)} />}
            {apoderado && onParentescoChange && (<label><span className={labelClass}>Vínculo con el alumno</span><select value={parentesco || 'Madre'} onChange={(e) => onParentescoChange(e.target.value)} className={selectClass}>{parentescos.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>)}
            <Field label="Nombres" value={form.nombres} onChange={(v: string) => set('nombres', v)} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v: string) => set('apellido_paterno', v)} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(v: string) => set('apellido_materno', v)} />
            {alumno && (<label><span className={labelClass}>Género</span><select value={form.genero || ''} onChange={(e) => set('genero', e.target.value)} className={selectClass}><option value="">Selecciona</option><option value="F">Femenino</option><option value="M">Masculino</option></select></label>)}
            {apoderado && <Field label="Ocupación" value={form.ocupacion || ''} onChange={(v: string) => set('ocupacion', v)} />}
            <Field label="Teléfono" value={form.telefono} onChange={(v: string) => set('telefono', v)} />
            <Field label="Correo" type="email" value={form.correo} onChange={(v: string) => set('correo', v)} />
            <div className="md:col-span-2">
              <LocationSelects
                value={{
                  pais: form.pais || 'Perú',
                  departamento: form.departamento,
                  provincia: form.provincia,
                  distrito: form.distrito,
                }}
                onChange={(location) =>
                  setForm({
                    ...form,
                    pais: location.pais || 'Perú',
                    departamento: location.departamento || '',
                    provincia: location.provincia || '',
                    distrito: location.distrito || '',
                  })
                }
                labelClass={labelClass}
                selectClass={selectClass}
              />
            </div>
            <div className="md:col-span-2"><Field label="Dirección" value={form.direccion} onChange={(v: string) => set('direccion', v)} /></div>
          </div>
          {aviso && <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50/50 p-3 text-sm font-medium text-amber-700 ring-1 ring-amber-200/60"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{aviso}</div>}
          {error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50/50 p-3 text-sm font-medium text-red-600 ring-1 ring-red-200/60"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{error}</div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 p-6 sm:flex-row sm:justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="h-10 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50">Cancelar</button>
          <button type="button" onClick={onSave} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#0f62fe] px-5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0043ce] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Guardar
          </button>
        </div>
      </div>
    </div>
    ),
    document.body,
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}