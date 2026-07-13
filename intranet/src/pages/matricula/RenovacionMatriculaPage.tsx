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
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type CodigoColegio = { id_estudiante: number; id_colegio: number; codigo: string };

type Alumno = {
  id_persona: number; dni: string; nombres: string; apellido_paterno: string; apellido_materno: string; fecha_nacimiento?: string | null;
  estudiantes: {
    id_persona: number; codigo_estudiante: string; codigos_colegio?: CodigoColegio[];
    apoderados?: { parentesco: string; apoderado: { id_persona: number; persona: { id_persona: number; dni: string; nombres: string; apellido_paterno: string; apellido_materno: string; telefono?: string | null; correo?: string | null; }; }; }[];
    matriculas: MatriculaAlumno[];
  }[];
};

type MatriculaAlumno = {
  id_matricula: number; codigo_matricula?: string | null; id_colegio?: number | null; estado_matricula: string;
  colegio?: { nombre: string; nombre_corto?: string | null; codigo?: string | null };
  anio?: { id_anio?: number; nombre_anio: string; estado?: string; fecha_inicio?: string | null; fecha_fin?: string | null; };
  seccion?: { letra: string; grado: { id_grado?: number; nombre_grado: string; nivel?: { id_nivel?: number; nombre_nivel: string }; }; };
};

type Anio = { id_anio: number; id_colegio?: number | null; nombre_anio: string; estado: string; fecha_inicio?: string | null; fecha_fin?: string | null; };

type Seccion = { id_seccion: number; letra: string; capacidad: number; matriculados: number; disponibles: number; grado: { nombre_grado: string; nivel?: { nombre_nivel: string }; }; };

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const inputClass = "h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-800 outline-none transition-all duration-150 focus:border-[#0f62fe] focus:bg-white focus:ring-2 focus:ring-[#0f62fe]/20 hover:border-neutral-300 placeholder:text-neutral-400 appearance-none";
const selectClass = inputClass;
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400";

const estadosNoFinales = ['Activo', 'Pre-matriculado', 'Reserva', 'Pendiente', 'Observado'];

const getAnioCorte = (anio?: { nombre_anio?: string | null; fecha_inicio?: string | null } | null) => {
  const desdeNombre = anio?.nombre_anio?.match(/\d{4}/)?.[0];
  if (desdeNombre) return Number(desdeNombre);
  if (anio?.fecha_inicio) { const fecha = new Date(anio.fecha_inicio); if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear(); }
  return new Date().getFullYear();
};

const normalizarEstado = (estado?: string | null) => String(estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esAnioRegistrable = (anio: Anio) => {
  const estado = normalizarEstado(anio.estado);
  if (['cerrado', 'archivado'].includes(estado)) return false;
  if (anio.fecha_fin) { const fechaFin = new Date(`${String(anio.fecha_fin).slice(0, 10)}T23:59:59`); if (!Number.isNaN(fechaFin.getTime()) && fechaFin < new Date()) return false; }
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
  const codigoColegio = estudiante?.codigos_colegio?.find((item) => item.id_colegio === Number(colegioId));
  return codigoColegio?.codigo || estudiante?.codigo_estudiante || 'Sin código';
};

const getNombreCompleto = (alumno: Alumno | null) => alumno ? `${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}` : '—';

function Card({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f62fe]/10 text-[#0f62fe]">
          <Icon size={18} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Detail({ label, value, tone = 'neutral' }: { label: string; value: React.ReactNode; tone?: 'neutral' | 'emerald' | 'amber' | 'sky' }) {
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    neutral: { bg: 'bg-neutral-50', text: 'text-neutral-900', ring: 'ring-neutral-200/60' },
    emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', ring: 'ring-emerald-200/60' },
    amber: { bg: 'bg-amber-50/50', text: 'text-amber-700', ring: 'ring-amber-200/60' },
    sky: { bg: 'bg-sky-50/50', text: 'text-sky-700', ring: 'ring-sky-200/60' },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <div className={`rounded-xl p-4 ring-1 ${t.bg} ${t.ring}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <div className={`mt-1.5 text-sm font-semibold ${t.text}`}>{value}</div>
    </div>
  );
}

export default function RenovacionMatriculaPage() {
  const { token } = useAuth();
  const { activeScope, activeColegio, colegios, queryString, scopeLabel, puedeVerConsolidado } = useSchool();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [colegioDestinoId, setColegioDestinoId] = useState<number | ''>(activeScope.tipo === 'colegio' && activeScope.id_colegio ? activeScope.id_colegio : '');
  const [anios, setAnios] = useState<Anio[]>([]);
  const [anioDestinoId, setAnioDestinoId] = useState<number | ''>('');
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [gradoFiltro, setGradoFiltro] = useState('');
  const [seccionDestinoId, setSeccionDestinoId] = useState<number | ''>('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [loadingBase, setLoadingBase] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const colegioDestinoQuery = useMemo(() => {
    if (activeScope.tipo === 'colegio') return queryString;
    if (colegioDestinoId) return `?colegio_id=${colegioDestinoId}`;
    return queryString;
  }, [activeScope.tipo, colegioDestinoId, queryString]);

  const colegioDestino = useMemo(() => {
    if (activeScope.tipo === 'colegio') return activeColegio || null;
    return colegios.find((item) => item.id_colegio === colegioDestinoId) || null;
  }, [activeScope.tipo, activeColegio, colegios, colegioDestinoId]);

  const anioDestino = useMemo(() => anios.find((item) => item.id_anio === anioDestinoId) || null, [anios, anioDestinoId]);
  const estudiante = alumno?.estudiantes?.[0] || null;
  const aniosDisponibles = useMemo(() => anios.filter((anio) => esAnioRegistrable(anio)), [anios]);
  const anioDestinoNumero = anioDestino ? getAnioCorte(anioDestino) : null;

  const matriculasNoFinales = useMemo(() => (estudiante?.matriculas || []).filter((m) => estadosNoFinales.includes(m.estado_matricula)), [estudiante?.matriculas]);

  const matriculaMismoAnio = useMemo(() => {
    if (!anioDestinoNumero) return null;
    return matriculasNoFinales.find((m) => getAnioCorte(m.anio) === anioDestinoNumero) || null;
  }, [matriculasNoFinales, anioDestinoNumero]);

  const matriculaOrigen = useMemo(() => {
    if (!anioDestinoNumero) return matriculasNoFinales.filter((m) => ['Activo', 'Pre-matriculado'].includes(m.estado_matricula)).sort((a, b) => getAnioCorte(b.anio) - getAnioCorte(a.anio))[0] || null;
    return matriculasNoFinales.filter((m) => ['Activo', 'Pre-matriculado'].includes(m.estado_matricula) && getAnioCorte(m.anio) < anioDestinoNumero).sort((a, b) => getAnioCorte(b.anio) - getAnioCorte(a.anio))[0] || null;
  }, [matriculasNoFinales, anioDestinoNumero]);

  const tipoRenovacion = useMemo(() => {
    if (!matriculaOrigen || !colegioDestinoId) return 'Renovación';
    return matriculaOrigen.id_colegio === Number(colegioDestinoId) ? 'Renovación' : 'Renovación con cambio de sede';
  }, [matriculaOrigen, colegioDestinoId]);

  const niveles = useMemo(() => Array.from(new Set(secciones.map((item) => item.grado?.nivel?.nombre_nivel).filter(Boolean))) as string[], [secciones]);
  const grados = useMemo(() => Array.from(new Set(secciones.filter((item) => !nivelFiltro || item.grado?.nivel?.nombre_nivel === nivelFiltro).map((item) => item.grado?.nombre_grado).filter(Boolean))) as string[], [nivelFiltro, secciones]);
  const seccionesFiltradas = useMemo(() => secciones.filter((item) => (!nivelFiltro || item.grado?.nivel?.nombre_nivel === nivelFiltro) && (!gradoFiltro || item.grado?.nombre_grado === gradoFiltro)), [secciones, nivelFiltro, gradoFiltro]);
  const seccionDestino = useMemo(() => secciones.find((item) => item.id_seccion === seccionDestinoId) || null, [secciones, seccionDestinoId]);
  const apoderados = useMemo(() => estudiante?.apoderados || [], [estudiante?.apoderados]);

  const puedeRenovar = useMemo(() => {
    if (!alumno || !estudiante) return false;
    if (!colegioDestinoId || !anioDestinoId || !seccionDestinoId) return false;
    if (!matriculaOrigen) return false;
    if (matriculaMismoAnio) return false;
    if (!apoderados.length) return false;
    return true;
  }, [alumno, estudiante, colegioDestinoId, anioDestinoId, seccionDestinoId, matriculaOrigen, matriculaMismoAnio, apoderados.length]);

  useEffect(() => {
    if (activeScope.tipo === 'colegio' && activeScope.id_colegio) setColegioDestinoId(activeScope.id_colegio);
    if (activeScope.tipo === 'todos') setColegioDestinoId('');
    setAnioDestinoId(''); setSeccionDestinoId(''); setSecciones([]);
  }, [activeScope.tipo, activeScope.id_colegio]);

  useEffect(() => { if (token) fetchAnios(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [token, colegioDestinoId, queryString]);

  useEffect(() => { if (token && anioDestinoId) fetchSecciones(Number(anioDestinoId)); else setSecciones([]); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [token, anioDestinoId, colegioDestinoId, queryString]);

  const fetchAnios = async () => {
    if (!token) return; setLoadingBase(true);
    try {
      const res = await axios.get(`/api/academicos/anios${colegioDestinoQuery}`, { headers: { Authorization: `Bearer ${token}` } });
      const data: Anio[] = res.data || []; setAnios(data);
      const candidato = data.filter((a) => esAnioRegistrable(a)).find((a) => getEstadoOperativo(a) === 'Planificación') || data.filter((a) => esAnioRegistrable(a)).find((a) => getEstadoOperativo(a) === 'Matrícula abierta') || '';
      setAnioDestinoId((current) => current || (candidato ? (candidato as Anio).id_anio : ''));
    } catch (error: any) {
      setAnios([]);
      showToast({ type: 'error', title: 'No se cargaron años', message: error.response?.data?.message || 'No se pudo cargar años lectivos.' });
    } finally { setLoadingBase(false); }
  };

  const fetchSecciones = async (idAnio: number) => {
    if (!token) return;
    const base = colegioDestinoQuery.replace('?', ''); const params = new URLSearchParams(base); params.set('anio_id', String(idAnio));
    try {
      const res = await axios.get(`/api/academicos/secciones?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setSecciones(res.data || []); setSeccionDestinoId(''); setNivelFiltro(''); setGradoFiltro('');
    } catch (error: any) {
      setSecciones([]);
      showToast({ type: 'error', title: 'No se cargaron secciones', message: error.response?.data?.message || 'No se pudo cargar secciones.' });
    }
  };

  const buscarAlumno = async () => {
    if (!token || !dni.trim()) return;
    setBuscando(true); setMensaje(null); setAlumno(null);
    try {
      const query = puedeVerConsolidado ? '&scope=all' : colegioDestinoQuery ? `&${colegioDestinoQuery.replace('?', '')}` : '';
      const res = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni.trim()}${query}`, { headers: { Authorization: `Bearer ${token}` } });
      setAlumno(res.data);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se encontró el alumno.'); setAlumno(null);
    } finally { setBuscando(false); }
  };

  const registrarRenovacion = async () => {
    if (!token || !estudiante || !puedeRenovar) return;
    setGuardando(true); setMensaje(null);
    try {
      const res = await axios.post(`/api/academicos/matriculas${colegioDestinoQuery}`, {
        id_estudiante: estudiante.id_persona, id_anio: Number(anioDestinoId), id_seccion: Number(seccionDestinoId),
        id_colegio: Number(colegioDestinoId || activeColegio?.id_colegio), tipo_ingreso: tipoRenovacion,
        observacion_procedencia: observacion || `${tipoRenovacion}. Origen: ${matriculaOrigen?.colegio?.nombre || 'sede anterior'} · ${matriculaOrigen?.anio?.nombre_anio || 'año anterior'}.`,
        apoderados: apoderados.map((r) => ({ id_apoderado: r.apoderado.id_persona, parentesco: r.parentesco || 'Apoderado' })),
      }, { headers: { Authorization: `Bearer ${token}` } });
      const codigo = res.data?.codigo_matricula || `#${res.data?.id_matricula || ''}`;
      showToast({ type: 'success', title: 'Renovación registrada', message: `Se creó la matrícula ${codigo}.`, duration: 6500 });
      navigate(`/matricula/historial?matricula_id=${res.data?.id_matricula}&colegio_id=${colegioDestinoId}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo registrar la renovación/re-matrícula.';
      setMensaje(message);
      showToast({ type: 'error', title: 'No se pudo registrar', message, duration: 6500 });
    } finally { setGuardando(false); }
  };

  return (
    <div className="carbon-matricula-page w-full space-y-6">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <PageHeader eyebrow="Matrícula" title="Renovación / Re-matrícula" description="Pre-matricula alumnos vigentes para el siguiente año, con opción de conservar sede o cambiar de colegio dentro del grupo." icon={ArrowRightLeft} meta={[{ label: 'Contexto activo', value: scopeLabel }, { label: 'Proceso', value: 'Continuidad y cambio de sede' }]} />
      </div>

      <div className={`grid gap-6 xl:grid-cols-[0.95fr_1.55fr] transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <section className="space-y-6">
          <Card icon={Search} title="Buscar alumno vigente" subtitle="Busca por DNI para revisar su matrícula actual.">
            <div className="flex gap-3">
              <input value={dni} onChange={(e) => setDni(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarAlumno()} placeholder="DNI del alumno" className={inputClass} />
              <button type="button" disabled={!dni.trim() || buscando} onClick={buscarAlumno} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100">
                {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar
              </button>
            </div>
            {mensaje && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 ring-1 ring-red-200/60">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {mensaje}
              </div>
            )}
          </Card>

          <Card icon={Building2} title="Destino de renovación" subtitle="Selecciona sede y año escolar destino.">
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Colegio destino</span>
                <select className={selectClass} value={colegioDestinoId} disabled={activeScope.tipo === 'colegio'} onChange={(e) => { setColegioDestinoId(e.target.value ? Number(e.target.value) : ''); setAnioDestinoId(''); setSeccionDestinoId(''); setSecciones([]); }}>
                  <option value="">Selecciona colegio</option>
                  {colegios.map((c) => <option key={c.id_colegio} value={c.id_colegio}>{c.nombre || c.nombre_corto}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Año destino</span>
                <select className={selectClass} value={anioDestinoId} onChange={(e) => { setAnioDestinoId(e.target.value ? Number(e.target.value) : ''); setSeccionDestinoId(''); }} disabled={!colegioDestinoId || loadingBase}>
                  <option value="">Selecciona año</option>
                  {aniosDisponibles.map((a) => <option key={a.id_anio} value={a.id_anio}>{a.nombre_anio} · {a.estado}</option>)}
                </select>
              </label>
              {anioDestino && (
                <div className="flex items-start gap-2 rounded-xl bg-sky-50/50 p-4 text-sm font-medium text-sky-700 ring-1 ring-sky-200/60">
                  <CalendarDays size={16} className="mt-0.5 flex-shrink-0" /> Estado del año destino: {getEstadoOperativo(anioDestino)}. La renovación se registrará como pre-matrícula si el año está en planificación.
                </div>
              )}
            </div>
          </Card>

          {alumno && (
            <Card icon={UserRoundCheck} title="Alumno encontrado" subtitle="Ficha base y vínculo familiar.">
              <div className="space-y-3">
                <Detail label="Alumno" value={getNombreCompleto(alumno)} />
                <Detail label="DNI" value={alumno.dni} />
                <Detail label="Código alumno" value={getCodigoAlumno(alumno, colegioDestinoId)} />
                <Detail label="Apoderados vinculados" value={`${apoderados.length} apoderado(s)`} tone={apoderados.length ? 'emerald' : 'amber'} />
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-6">
          <Card icon={ShieldCheck} title="Validación de origen" subtitle="El sistema toma la matrícula vigente anterior al año destino.">
            {!alumno ? (
              <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-400 ring-1 ring-neutral-200/60">Busca un alumno para revisar su matrícula de origen.</p>
            ) : matriculaMismoAnio ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50/50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200/60">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> El alumno ya tiene un proceso para el año destino: <span className="font-semibold">{matriculaMismoAnio.codigo_matricula || `#${matriculaMismoAnio.id_matricula}`}</span> · {matriculaMismoAnio.estado_matricula} · {matriculaMismoAnio.colegio?.nombre || 'Colegio'}. No se puede crear una segunda renovación para el mismo año.
              </div>
            ) : matriculaOrigen ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Detail label="Matrícula origen" value={matriculaOrigen.codigo_matricula || `#${matriculaOrigen.id_matricula}`} tone="sky" />
                <Detail label="Sede origen" value={matriculaOrigen.colegio?.nombre || '—'} />
                <Detail label="Año origen" value={matriculaOrigen.anio?.nombre_anio || '—'} />
                <Detail label="Estado" value={matriculaOrigen.estado_matricula} tone="emerald" />
                <div className="md:col-span-2 xl:col-span-4">
                  <Detail label="Sección origen" value={`${matriculaOrigen.seccion?.grado?.nombre_grado || 'Grado'} "${matriculaOrigen.seccion?.letra || '-'}" · ${matriculaOrigen.seccion?.grado?.nivel?.nombre_nivel || 'Nivel'}`} />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50/50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200/60">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> No se encontró una matrícula vigente anterior para renovar. Si el alumno es nuevo, traslado externo o reingreso, usa “Registrar matrícula”.
              </div>
            )}
          </Card>

          <Card icon={GraduationCap} title="Sección destino" subtitle="Elige el grado y sección del siguiente año.">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Nivel</span>
                <select className={selectClass} value={nivelFiltro} onChange={(e) => { setNivelFiltro(e.target.value); setGradoFiltro(''); setSeccionDestinoId(''); }} disabled={!anioDestinoId}>
                  <option value="">Todos</option> {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Grado</span>
                <select className={selectClass} value={gradoFiltro} onChange={(e) => { setGradoFiltro(e.target.value); setSeccionDestinoId(''); }} disabled={!anioDestinoId}>
                  <option value="">Todos</option> {grados.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Tipo proceso</span>
                <input className={inputClass} value={tipoRenovacion} readOnly />
              </label>
            </div>

            <div className="mt-5 grid max-h-[330px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {seccionesFiltradas.map((seccion) => {
                const selected = seccion.id_seccion === seccionDestinoId;
                const sinCupos = seccion.disponibles <= 0;
                const porcentaje = seccion.capacidad > 0 ? Math.min(100, Math.round((seccion.matriculados / seccion.capacidad) * 100)) : 0;

                return (
                  <button key={seccion.id_seccion} type="button" disabled={sinCupos} onClick={() => setSeccionDestinoId(selected ? '' : seccion.id_seccion)}
                    className={cx(
                      'renewal-section-card rounded-2xl border p-4 text-left transition-all duration-150',
                      selected ? 'renewal-section-card--selected' : 'border-neutral-200/60 bg-neutral-50 hover:bg-white hover:border-neutral-300',
                      sinCupos && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="renewal-section-title text-sm font-semibold text-neutral-900">{seccion.grado.nombre_grado} "{seccion.letra}"</p>
                        <p className="renewal-section-meta mt-1 text-xs text-neutral-600">{seccion.grado.nivel?.nombre_nivel || 'Nivel'} · {seccion.capacidad} cupos</p>
                      </div>
                      {selected && <CheckCircle2 size={18} className="text-[#0f62fe] flex-shrink-0" />}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200/60">
                      <div className="h-full rounded-full bg-[#0f62fe] transition-all duration-500" style={{ width: `${porcentaje}%` }} />
                    </div>
                    <p className="renewal-section-availability mt-2 text-xs font-medium text-neutral-600">{seccion.matriculados} registrados · {seccion.disponibles} disponibles</p>
                  </button>
                );
              })}
            </div>

            {!seccionesFiltradas.length && (
              <p className="mt-5 rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-400 ring-1 ring-neutral-200/60">Selecciona año destino o crea secciones para ese año.</p>
            )}

            {seccionDestino && (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50/50 p-4 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> Destino seleccionado: {colegioDestino?.nombre || colegioDestino?.nombre_corto} · {seccionDestino.grado.nombre_grado} "{seccionDestino.letra}" · {seccionDestino.grado.nivel?.nombre_nivel || 'Nivel'}.
              </div>
            )}

            <label className="mt-5 block">
              <span className={labelClass}>Observación del proceso</span>
              <textarea className="min-h-24 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 outline-none transition-all duration-150 focus:border-[#0f62fe] focus:bg-white focus:ring-2 focus:ring-[#0f62fe]/20 hover:border-neutral-300 placeholder:text-neutral-400" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. Renovación anticipada por campaña noviembre-diciembre." />
            </label>

            {!puedeRenovar && alumno && (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50/50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200/60">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> Revisa que exista matrícula origen vigente, año destino, sección destino y apoderados vinculados. También valida que no exista otro proceso para el mismo año destino.
              </div>
            )}

            <button type="button" disabled={!puedeRenovar || guardando} onClick={registrarRenovacion}
              className="mt-5 h-12 w-full rounded-2xl bg-[#0f62fe] px-5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0043ce] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {guardando ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />} Registrar renovación / re-matrícula
            </button>
          </Card>
        </section>
      </div>
    </div>
  );
}