import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import {
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
    matriculas: any[];
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
};

type Anio = { id_anio: number; nombre_anio: string; estado: string };
type Seccion = {
  id_seccion: number;
  label: string;
  letra: string;
  capacidad: number;
  matriculados: number;
  disponibles: number;
  grado: { nombre_grado: string; nivel?: { nombre_nivel: string } };
};
type UltimaMatricula = {
  id_matricula: number;
  fecha_matricula: string;
  colegio?: { nombre: string };
  estudiante: { persona: { nombres: string; apellido_paterno: string } };
  seccion: { letra: string; grado: { nombre_grado: string; nivel?: { nombre_nivel: string } } };
};

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

const parentescos = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Tutor legal', 'Otro'];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const buildQuery = (base: string, extra: Record<string, string | number | undefined | null>) => {
  const params = new URLSearchParams(base.replace('?', ''));

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

const edadNumero = (fecha?: string | null) => {
  if (!fecha) return null;
  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const edadTexto = (fecha?: string | null) => {
  const edad = edadNumero(fecha);
  return edad === null ? '—' : `${edad} años`;
};

const generoTexto = (genero?: string | null) => {
  if (!genero) return '—';
  if (genero === 'F') return 'Femenino';
  if (genero === 'M') return 'Masculino';
  return genero;
};

const fechaCorta = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function MatriculaPage() {
  const { token } = useAuth();
  const { activeScope, activeColegio, colegios, scopeLabel, queryString, puedeVerConsolidado } =
    useSchool();

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

  const estudiante = alumno?.estudiantes?.[0] || null;

  const colegioDestinoQuery = useMemo(() => {
    if (activeScope.tipo === 'colegio') return queryString;
    if (colegioDestinoId) return `?colegio_id=${colegioDestinoId}`;
    return queryString;
  }, [activeScope.tipo, colegioDestinoId, queryString]);

  const colegioDestinoNombre = useMemo(() => {
    if (activeScope.tipo === 'colegio') {
      return activeColegio?.nombre_corto || activeColegio?.nombre || 'Colegio activo';
    }

    if (!colegioDestinoId) return 'Por seleccionar';
    const colegio = colegios.find((item) => item.id_colegio === colegioDestinoId);
    return colegio?.nombre_corto || colegio?.nombre || 'Colegio seleccionado';
  }, [activeScope.tipo, activeColegio, colegioDestinoId, colegios]);

  const niveles = useMemo(
    () => Array.from(new Set(secciones.map((s) => s.grado?.nivel?.nombre_nivel).filter(Boolean))) as string[],
    [secciones],
  );

  const grados = useMemo(
    () =>
      Array.from(
        new Set(
          secciones
            .filter((s) => !nivelFiltro || s.grado?.nivel?.nombre_nivel === nivelFiltro)
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

  const matriculaActiva = useMemo(() => {
    if (!estudiante?.matriculas?.length) return null;
    if (activeScope.tipo === 'colegio') {
      return estudiante.matriculas.find(
        (m) => m.estado_matricula === 'Activo' && m.id_colegio === activeScope.id_colegio,
      );
    }
    if (colegioDestinoId) {
      return estudiante.matriculas.find(
        (m) => m.estado_matricula === 'Activo' && m.id_colegio === colegioDestinoId,
      );
    }
    return estudiante.matriculas.find((m) => m.estado_matricula === 'Activo');
  }, [activeScope, colegioDestinoId, estudiante?.matriculas]);

  const alertaEdad = useMemo(() => {
    if (!alumno || !seccionSeleccionada) return null;

    const edad = edadNumero(alumno.fecha_nacimiento);
    if (edad === null) return null;

    const nivel = seccionSeleccionada.grado?.nivel?.nombre_nivel?.toLowerCase() || '';
    if (nivel.includes('primaria') && edad < 6) return 'El alumno parece menor para Primaria.';
    if (nivel.includes('secundaria') && edad < 11) return 'El alumno parece menor para Secundaria.';
    if (nivel.includes('inicial') && edad > 6) return 'El alumno parece mayor para Inicial.';
    return null;
  }, [alumno, seccionSeleccionada]);

  useEffect(() => {
    if (activeScope.tipo === 'colegio' && activeScope.id_colegio) setColegioDestinoId(activeScope.id_colegio);
    if (activeScope.tipo === 'todos') setColegioDestinoId('');

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
      setUltimas(ultimasRes.data || []);
      setAnios(aniosData);

      const activo = aniosData.find((a) => a.estado === 'Activo') || aniosData[0];
      const resolved = activo?.id_anio || '';
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

  const buscarAlumno = async () => {
    if (!token || !dni.trim()) return;

    setBuscandoAlumno(true);
    setMensaje(null);
    setApoderados([]);

    try {
      const query = colegioDestinoQuery ? `&${colegioDestinoQuery.replace('?', '')}` : '';
      const res = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni.trim()}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlumno(res.data);
    } catch (err: any) {
      setAlumno(null);
      setMensaje(err.response?.data?.message || 'No se encontró el alumno.');
    } finally {
      setBuscandoAlumno(false);
    }
  };

  const buscarApoderado = async () => {
    if (!token || !apoderadoDni.trim()) return;

    setBuscandoApoderado(true);
    setMensaje(null);

    try {
      const res = await axios.get(`/api/academicos/apoderados/buscar?dni=${apoderadoDni.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApoderadoEncontrado(res.data);
    } catch (err: any) {
      setApoderadoEncontrado(null);
      setMensaje(err.response?.data?.message || 'No se encontró el apoderado.');
    } finally {
      setBuscandoApoderado(false);
    }
  };

  const agregarApoderado = (apoderado: Apoderado) => {
    if (apoderados.some((a) => a.id_persona === apoderado.id_persona)) {
      setMensaje('Este apoderado ya está vinculado.');
      return;
    }

    setApoderados([...apoderados, { ...apoderado, parentesco }]);
    setApoderadoEncontrado(null);
    setApoderadoDni('');
    setParentesco('Madre');
  };

  const crearPersona = async (tipo: 'alumno' | 'apoderado') => {
    if (!token) return;

    const form = tipo === 'alumno' ? formAlumno : formApoderado;

    if (!form.dni || !form.nombres || !form.apellido_paterno || !form.apellido_materno) {
      setErrorPersona('Completa DNI, nombres y apellidos.');
      return;
    }

    if (tipo === 'alumno' && !form.fecha_nacimiento) {
      setErrorPersona('Completa la fecha de nacimiento.');
      return;
    }

    setSavingPersona(true);
    setErrorPersona(null);

    try {
      await axios.post(
        tipo === 'alumno' ? '/api/academicos/alumnos' : '/api/academicos/apoderados',
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
        setTimeout(() => buscarAlumno(), 150);
      } else {
        setApoderadoDni(form.dni);
        setModalApoderado(false);
        setFormApoderado(emptyApoderado);
        setTimeout(() => buscarApoderado(), 150);
      }
    } catch (err: any) {
      setErrorPersona(err.response?.data?.message || 'No se pudo guardar el registro.');
    } finally {
      setSavingPersona(false);
    }
  };

  const revisarMatricula = () => {
    if (!alumno || !estudiante) return setMensaje('Primero busca o registra un alumno.');
    if (!anioId || !seccionId) return setMensaje('Selecciona año lectivo y sección.');
    if (activeScope.tipo === 'todos' && !colegioDestinoId) return setMensaje('Selecciona un colegio destino.');
    if (!apoderados.length) return setMensaje('Debes vincular al menos un apoderado.');
    if (matriculaActiva) return setMensaje('Este alumno ya tiene matrícula activa en este contexto.');

    setConfirmOpen(true);
  };

  const registrarMatricula = async () => {
    if (!token || !estudiante || !anioId || !seccionId) return;

    setMatriculando(true);
    setMensaje(null);

    try {
      await axios.post(
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
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMensaje('Matrícula registrada correctamente.');
      setConfirmOpen(false);
      setApoderados([]);
      await fetchBase();
      await buscarAlumno();
    } catch (err: any) {
      setMensaje(err.response?.data?.message || 'No se pudo registrar la matrícula.');
      setConfirmOpen(false);
    } finally {
      setMatriculando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Gestión académica"
        title="Gestión de Matrícula"
        description="Busca alumnos, vincula apoderados y confirma la matrícula en el colegio seleccionado."
        icon={GraduationCap}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Colegio destino', value: colegioDestinoNombre },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.65fr]">
        <section className="space-y-5">
          <Card icon={Search} title="Buscar alumno" subtitle="Ingresa el DNI para revisar su ficha.">
            {activeScope.tipo === 'todos' && puedeVerConsolidado && (
              <label className="mb-4 block">
                <Label>Colegio destino</Label>
                <select
                  value={colegioDestinoId}
                  onChange={(e) => {
                    setColegioDestinoId(e.target.value ? Number(e.target.value) : '');
                    setAlumno(null);
                    setApoderados([]);
                    setSeccionId('');
                    setAnioId('');
                  }}
                  className={selectClass}
                >
                  <option value="">Selecciona colegio</option>
                  {colegios.map((c) => (
                    <option key={c.id_colegio} value={c.id_colegio}>{c.nombre}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex gap-2">
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarAlumno()}
                placeholder="DNI del alumno"
                className={inputClass}
              />
              <button type="button" onClick={buscarAlumno} disabled={!dni || buscandoAlumno} className={darkButtonClass}>
                {buscandoAlumno ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
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

          <Card icon={Clock} title="Últimas matrículas hoy" subtitle="Registros recientes según el colegio activo.">
            {loadingBase ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : ultimas.length === 0 ? (
              <Empty text="Sin matrículas hoy" />
            ) : (
              <div className="space-y-3">
                {ultimas.map((m) => (
                  <div key={m.id_matricula} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-sm font-black text-slate-800">{m.estudiante.persona.nombres} {m.estudiante.persona.apellido_paterno}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.seccion.grado.nombre_grado} "{m.seccion.letra}" · {fechaCorta(m.fecha_matricula)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-5">
          <div className="rounded-[30px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            {!alumno ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Users size={32} className="text-slate-300" />
                <h3 className="mt-4 text-base font-black text-slate-800">Busca un alumno por DNI</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">Al encontrarlo podrás vincular apoderados y registrar matrícula.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">{alumno.nombres} {alumno.apellido_paterno} {alumno.apellido_materno}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                      <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">DNI: {alumno.dni}</span>
                      <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">Código: {estudiante?.codigo_estudiante || '—'}</span>
                    </div>
                  </div>
                  {matriculaActiva ? (
                    <Badge tone="emerald">Matrícula activa</Badge>
                  ) : (
                    <Badge tone="amber">Sin matrícula en este contexto</Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Info icon={CalendarDays} label="Edad" value={edadTexto(alumno.fecha_nacimiento)} />
                  <Info icon={Users} label="Género" value={generoTexto(alumno.genero)} />
                  <Info icon={Phone} label="Teléfono" value={alumno.telefono || '—'} />
                  <Info icon={MapPin} label="Distrito" value={alumno.distrito || '—'} />
                </div>

                {estudiante?.matriculas?.length > 0 && (
                  <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Historial visible</p>
                    <div className="mt-3 space-y-2">
                      {estudiante.matriculas.map((m) => (
                        <div key={m.id_matricula} className="rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">
                          <b>{m.seccion?.grado?.nombre_grado || 'Grado'} "{m.seccion?.letra || '-'}"</b>
                          <p className="text-xs text-slate-400">{m.colegio?.nombre || 'Colegio'} · {m.anio?.nombre_anio || 'Año lectivo'} · {m.estado_matricula}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {alumno && (
            <>
              <Card icon={ShieldCheck} title="Apoderados" subtitle="Debes vincular al menos un apoderado.">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
                  <input value={apoderadoDni} onChange={(e) => setApoderadoDni(e.target.value)} placeholder="DNI del apoderado" className={inputClass} />
                  <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className={selectClass}>
                    {parentescos.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button type="button" onClick={buscarApoderado} disabled={!apoderadoDni || buscandoApoderado} className={darkButtonClass}>
                    {buscandoApoderado ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Buscar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormApoderado({ ...emptyApoderado, dni: apoderadoDni });
                    setErrorPersona(null);
                    setModalApoderado(true);
                  }}
                  className={outlineButtonClass}
                >
                  <UserPlus size={16} />
                  Nuevo apoderado
                </button>

                {apoderadoEncontrado && (
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-800">{apoderadoEncontrado.nombres} {apoderadoEncontrado.apellido_paterno} {apoderadoEncontrado.apellido_materno}</p>
                        <p className="mt-1 text-xs text-slate-400">DNI {apoderadoEncontrado.dni} · {apoderadoEncontrado.telefono || 'Sin teléfono'} · {apoderadoEncontrado.distrito || 'Sin distrito'}</p>
                      </div>
                      <button type="button" onClick={() => agregarApoderado(apoderadoEncontrado)} className="h-10 rounded-2xl bg-accent-500 px-4 text-xs font-black text-white">
                        Agregar como {parentesco}
                      </button>
                    </div>
                  </div>
                )}

                {apoderados.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {apoderados.map((a) => (
                      <div key={a.id_persona} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-800">{a.nombres} {a.apellido_paterno} {a.apellido_materno}</p>
                          <p className="mt-1 text-xs text-slate-400">{a.parentesco} · DNI {a.dni} · {a.telefono || 'Sin teléfono'}</p>
                        </div>
                        <button type="button" onClick={() => setApoderados(apoderados.filter((x) => x.id_persona !== a.id_persona))} className="h-9 rounded-xl bg-white px-3 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card icon={GraduationCap} title="Registrar matrícula" subtitle="Filtra por nivel y grado para elegir sección.">
                <div className="grid gap-4 xl:grid-cols-3">
                  <label>
                    <Label>Año lectivo</Label>
                    <select value={anioId} onChange={(e) => setAnioId(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
                      <option value="">Selecciona año</option>
                      {anios.map((a) => <option key={a.id_anio} value={a.id_anio}>{a.nombre_anio} · {a.estado}</option>)}
                    </select>
                  </label>
                  <label>
                    <Label>Nivel</Label>
                    <select value={nivelFiltro} onChange={(e) => { setNivelFiltro(e.target.value); setGradoFiltro(''); setSeccionId(''); }} className={selectClass}>
                      <option value="">Todos</option>
                      {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label>
                    <Label>Grado</Label>
                    <select value={gradoFiltro} onChange={(e) => { setGradoFiltro(e.target.value); setSeccionId(''); }} className={selectClass}>
                      <option value="">Todos</option>
                      {grados.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid max-h-[310px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {seccionesFiltradas.map((s) => {
                    const selected = s.id_seccion === seccionId;
                    const sinCupos = s.disponibles <= 0;
                    return (
                      <button
                        key={s.id_seccion}
                        type="button"
                        disabled={sinCupos}
                        onClick={() => setSeccionId(selected ? '' : s.id_seccion)}
                        className={cx(
                          'rounded-2xl border p-4 text-left transition',
                          selected ? 'border-accent-300 bg-accent-50 ring-4 ring-accent-100' : 'border-slate-100 bg-slate-50 hover:bg-white',
                          sinCupos && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-800">{s.grado.nombre_grado} "{s.letra}"</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{s.grado.nivel?.nombre_nivel || 'Nivel'} · {s.capacidad} cupos</p>
                          </div>
                          {selected && <CheckCircle2 size={18} className="text-accent-600" />}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                          <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, Math.round((s.matriculados / s.capacidad) * 100))}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-400">{s.matriculados} matriculados · {s.disponibles} disponibles</p>
                      </button>
                    );
                  })}
                </div>

                {seccionesFiltradas.length === 0 && <Empty text="Sin secciones disponibles" />}

                {mensaje && (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
                    {mensaje}
                  </div>
                )}

                <button type="button" onClick={revisarMatricula} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-600">
                  <ArrowRight size={16} />
                  Revisar y registrar matrícula
                </button>
              </Card>
            </>
          )}
        </section>
      </div>

      {confirmOpen && alumno && seccionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <ModalHead title="Revisar matrícula" subtitle="Verifica los datos antes de guardar." onClose={() => setConfirmOpen(false)} />
            <div className="space-y-4 p-6">
              {alertaEdad && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
                  <AlertTriangle size={16} className="mr-2 inline" />
                  {alertaEdad}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Summary label="Alumno" value={`${alumno.nombres} ${alumno.apellido_paterno} ${alumno.apellido_materno}`} detail={`DNI ${alumno.dni} · ${edadTexto(alumno.fecha_nacimiento)}`} />
                <Summary label="Destino" value={colegioDestinoNombre} detail={`${seccionSeleccionada.grado.nombre_grado} "${seccionSeleccionada.letra}" · ${seccionSeleccionada.grado.nivel?.nombre_nivel || ''}`} />
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Apoderados</p>
                <div className="mt-3 space-y-2">
                  {apoderados.map((a) => (
                    <div key={a.id_persona} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
                      {a.parentesco}: {a.nombres} {a.apellido_paterno} · DNI {a.dni}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600">Corregir</button>
              <button type="button" onClick={registrarMatricula} disabled={matriculando} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50">
                {matriculando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirmar matrícula
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAlumno && (
        <PersonaModal title="Nuevo alumno" form={formAlumno} setForm={setFormAlumno} error={errorPersona} loading={savingPersona} onClose={() => setModalAlumno(false)} onSave={() => crearPersona('alumno')} alumno />
      )}

      {modalApoderado && (
        <PersonaModal title="Nuevo apoderado" form={formApoderado} setForm={setFormApoderado} error={errorPersona} loading={savingPersona} onClose={() => setModalApoderado(false)} onSave={() => crearPersona('apoderado')} apoderado />
      )}
    </div>
  );
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';
const selectClass = inputClass;
const darkButtonClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
const outlineButtonClass =
  'mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50';

function Label({ children }: { children: string }) {
  return <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">{children}</span>;
}

function Card({ icon: Icon, title, subtitle, children }: any) {
  return (
    <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
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
        <p className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 truncate text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'emerald' | 'amber'; children: string }) {
  const cls = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100';
  return <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ring-1 ${cls}`}>{children}</span>;
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function ModalHead({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
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
      <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <X size={18} />
      </button>
    </div>
  );
}

function PersonaModal({ title, form, setForm, error, loading, onClose, onSave, alumno, apoderado }: any) {
  const set = (key: keyof PersonaForm, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
        <ModalHead title={title} subtitle="Registra datos básicos y ubicación." onClose={onClose} />
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} onChange={(v: string) => set('dni', v)} />
            {alumno && <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento || ''} onChange={(v: string) => set('fecha_nacimiento', v)} />}
            <Field label="Nombres" value={form.nombres} onChange={(v: string) => set('nombres', v)} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v: string) => set('apellido_paterno', v)} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(v: string) => set('apellido_materno', v)} />
            {alumno && (
              <label>
                <Label>Género</Label>
                <select value={form.genero || ''} onChange={(e) => set('genero', e.target.value)} className={selectClass}>
                  <option value="">Selecciona</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </label>
            )}
            {apoderado && <Field label="Ocupación" value={form.ocupacion || ''} onChange={(v: string) => set('ocupacion', v)} />}
            <Field label="Teléfono" value={form.telefono} onChange={(v: string) => set('telefono', v)} />
            <Field label="Correo" type="email" value={form.correo} onChange={(v: string) => set('correo', v)} />
            <Field label="País" value={form.pais} onChange={(v: string) => set('pais', v)} />
            <Field label="Departamento" value={form.departamento} onChange={(v: string) => set('departamento', v)} />
            <Field label="Provincia" value={form.provincia} onChange={(v: string) => set('provincia', v)} />
            <Field label="Distrito" value={form.distrito} onChange={(v: string) => set('distrito', v)} />
            <div className="md:col-span-2">
              <Field label="Dirección" value={form.direccion} onChange={(v: string) => set('direccion', v)} />
            </div>
          </div>
          {error && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600">Cancelar</button>
          <button type="button" onClick={onSave} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: any) {
  return (
    <label>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}
