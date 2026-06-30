import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  School,
  Sparkles,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';

interface DashboardResumen {
  rol: string;
  anioIds?: number[];
  anioId?: number;
  scope?: { tipo: 'todos' | 'colegio'; tenantId: number | null; colegioIds: number[]; colegios: any[]; puedeVerConsolidado: boolean; };
  usuario: { id: number; nombre: string; rol: string; cargo: string; };
  modulos: { institucional?: any | null; docente?: any | null; tutoria?: any | null; };
}

const formatNumber = (value: number | null | undefined) => Number(value || 0).toLocaleString('es-PE');
const formatNota = (value: number | null | undefined) => { if (value === null || value === undefined) return '—'; return Number(value).toFixed(1); };
const getSaludoRol = (rol?: string) => { if (rol === 'Profesor') return 'Panel docente'; if (rol === 'Secretaria') return 'Panel administrativo'; if (rol === 'Director') return 'Panel directivo'; if (rol === 'Admin') return 'Panel institucional'; return 'Panel principal'; };
const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

function KpiCard({ label, value, helper, icon: Icon, tone = 'neutral', onClick }: { label: string; value: string | number; helper: string; icon: any; tone?: 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet'; onClick?: () => void; }) {
  const tones: Record<string, { bg: string; text: string }> = {
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
    blue: { bg: 'bg-blue-50/50', text: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-500' },
    amber: { bg: 'bg-amber-50/50', text: 'text-amber-500' },
    rose: { bg: 'bg-red-50/50', text: 'text-red-500' },
    violet: { bg: 'bg-violet-50/50', text: 'text-violet-500' },
  };

  const t = tones[tone] || tones.neutral;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-neutral-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${t.bg} ${t.text}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      {onClick && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors duration-150 group-hover:text-neutral-700">
          Abrir módulo <ArrowUpRight size={13} />
        </div>
      )}
    </>
  );

  const baseClass = "carbon-dashboard-card min-h-[120px] border border-neutral-200 bg-white p-5 text-left transition-colors duration-150";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} group cursor-pointer hover:border-neutral-300`}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-neutral-100 text-neutral-300"><Sparkles size={20} /></div>
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-neutral-400">{description}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="carbon-progress-track mt-3">
      <div className="carbon-progress-fill" style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }} />
    </div>
  );
}

function EstadoCargaBadge({ estado }: { estado: string }) {
  const estadoStyles: Record<string, string> = {
    completo: 'bg-emerald-50/50 text-emerald-600 ring-emerald-200/60',
    avanzado: 'bg-blue-50/50 text-blue-600 ring-blue-200/60',
    en_proceso: 'bg-amber-50/50 text-amber-600 ring-amber-200/60',
    pendiente: 'bg-red-50/50 text-red-500 ring-red-200/60',
    sin_evaluaciones: 'bg-neutral-100 text-neutral-500 ring-neutral-200',
  };
  const estadoLabel: Record<string, string> = { completo: 'Completo', avanzado: 'Avanzado', en_proceso: 'En proceso', pendiente: 'Pendiente', sin_evaluaciones: 'Sin evaluaciones' };
  return (
    <span className={cx('inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold ring-1', estadoStyles[estado] || estadoStyles.pendiente)}>
      {estadoLabel[estado] || 'Pendiente'}
    </span>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { activeScope, activeColegio, scopeLabel, queryString } = useSchool();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    axios.get(`/api/dashboard/resumen${queryString}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setResumen(res.data))
      .catch(() => setResumen(null))
      .finally(() => setLoading(false));
  }, [token, queryString]);

  const rol = resumen?.rol || user?.rol;
  const institucional = resumen?.modulos?.institucional;
  const docente = resumen?.modulos?.docente;
  const tutoria = resumen?.modulos?.tutoria;

  const nombreUsuario = useMemo(() => {
    const nombre = resumen?.usuario?.nombre || user?.nombre || 'Usuario';
    return nombre.split(' ').slice(0, 2).join(' ');
  }, [resumen?.usuario?.nombre, user?.nombre]);

  const panelDescription = activeScope.tipo === 'todos'
    ? `Vista consolidada de ${scopeLabel.toLowerCase()} para revisar el estado general del grupo.`
    : `Vista rápida de ${activeColegio?.nombre || 'la institución'} con la información más importante para tu cargo.`;

  const SectionHeader = ({ icon: Icon, title, subtitle, action }: { icon: any; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600"><Icon size={18} strokeWidth={2} /></div>
        <div><h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3><p className="text-xs text-neutral-400">{subtitle}</p></div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="carbon-dashboard w-full space-y-6">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <PageHeader
          eyebrow={activeScope.tipo === 'todos' ? 'Panel del grupo académico' : getSaludoRol(rol)}
          title={`Hola, ${nombreUsuario}`}
          description={panelDescription}
          icon={LayoutDashboard}
          meta={[{ label: 'Contexto activo', value: scopeLabel }, { label: 'Rol del sistema', value: rol || 'Usuario' }, { label: 'Función institucional', value: resumen?.usuario?.cargo || user?.contexto?.cargo_principal || 'Sin cargo' }]}
          actions={rol === 'Admin' || rol === 'Director' ? (
            <button type="button" onClick={() => navigate('/reportes')} className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-neutral-900 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-neutral-700">
              Ver reportes <ArrowUpRight size={15} />
            </button>
          ) : null}
        />
      </div>

      <div className={`space-y-8 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (<div key={i} className="min-h-[120px] rounded border border-neutral-200 bg-white p-5 shadow-none animate-pulse"><div className="h-3 w-20 rounded bg-neutral-100 mb-4" /><div className="h-7 w-16 rounded bg-neutral-100 mb-3" /><div className="h-3 w-28 rounded bg-neutral-100" /></div>))}
          </section>
        ) : (
          <>
            {institucional && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 tracking-tight">{activeScope.tipo === 'todos' ? 'Resumen del grupo académico' : 'Resumen institucional'}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{activeScope.tipo === 'todos' ? 'Indicadores consolidados de los colegios activos.' : 'Indicadores generales del colegio.'}</p>
                </div>

                <div className={cx('grid gap-4 sm:grid-cols-2', activeScope.tipo === 'todos' ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
                  {activeScope.tipo === 'todos' && (<KpiCard label="Colegios" value={formatNumber(institucional.kpis?.colegios)} helper="Instituciones activas" icon={School} tone="violet" />)}
                  <KpiCard label="Matriculados" value={formatNumber(institucional.kpis?.matriculados)} helper="Estudiantes activos" icon={GraduationCap} tone="blue" onClick={() => navigate('/matricula')} />
                  <KpiCard label="Docentes" value={formatNumber(institucional.kpis?.docentes)} helper="Equipo académico" icon={Users} tone="emerald" onClick={() => navigate('/docentes')} />
                  <KpiCard label="Circulares" value={formatNumber(institucional.kpis?.circulares)} helper="Comunicados enviados" icon={Mail} tone="amber" onClick={() => navigate('/circulares')} />
                  <KpiCard label="Pagos pend." value={formatNumber(institucional.kpis?.pagosPendientes)} helper="Por regularizar" icon={Wallet} tone="rose" onClick={() => navigate('/tesoreria')} />
                </div>

                {(rol === 'Admin' || rol === 'Director') && institucional.avanceCargaDocente && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <KpiCard label="Avance carga" value={`${institucional.avanceCargaDocente.resumen?.porcentajePromedio || 0}%`} helper={institucional.avanceCargaDocente.unidadActual ? `Bim. ${institucional.avanceCargaDocente.unidadActual.bimestre} · Unidad ${institucional.avanceCargaDocente.unidadActual.numero}` : 'Sin unidad abierta'} icon={Table2} tone="blue" />
                    <KpiCard label="Docentes completos" value={`${institucional.avanceCargaDocente.resumen?.docentesCompletos || 0}/${institucional.avanceCargaDocente.resumen?.docentes || 0}`} helper="Carga de notas al 100%" icon={CheckSquare} tone="emerald" />
                    <KpiCard label="Notas pendientes" value={formatNumber(institucional.avanceCargaDocente.resumen?.pendientes || 0)} helper="Faltan registrar" icon={AlertTriangle} tone="rose" />
                  </div>
                )}
              </section>
            )}

            {activeScope.tipo === 'todos' && institucional?.colegios?.length > 0 && (
              <section className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                <SectionHeader icon={School} title="Estado por colegio" subtitle="Comparativo rápido de cada institución del grupo." />
                <div className="grid gap-4 lg:grid-cols-2">
                  {institucional.colegios.map((colegio: any) => (
                    <div key={colegio.id_colegio} className="school-summary-card rounded bg-white p-5 ring-1 ring-neutral-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-white shadow-sm" style={{ backgroundColor: colegio.color_principal || '#4f46e5' }}><School size={19} /></span>
                          <div className="min-w-0"><h4 className="truncate text-sm font-semibold text-neutral-900 tracking-tight">{colegio.nombre}</h4><p className="mt-0.5 truncate text-xs text-neutral-400">{colegio.niveles?.join(' · ') || 'Sin niveles configurados'}</p></div>
                        </div>
                        <span className="shrink-0 rounded-sm bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200">{colegio.codigo}</span>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded bg-white p-3 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Alumnos</p><p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">{formatNumber(colegio.kpis?.matriculados)}</p></div>
                        <div className="rounded bg-white p-3 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Docentes</p><p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">{formatNumber(colegio.kpis?.docentes)}</p></div>
                        <div className="rounded bg-white p-3 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Pagos</p><p className="mt-1 text-lg font-semibold text-neutral-900 tabular-nums">{formatNumber(colegio.kpis?.pagosPendientes)}</p></div>
                      </div>
                      <div className="mt-5">
                        <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-neutral-500">Avance de carga de notas</p><p className="text-sm font-semibold text-neutral-900 tabular-nums">{colegio.avanceCarga?.porcentajePromedio || 0}%</p></div>
                        <ProgressBar value={colegio.avanceCarga?.porcentajePromedio || 0} />
                        <p className="mt-2 text-xs text-neutral-400">{colegio.avanceCarga?.registradas || 0} registradas · {colegio.avanceCarga?.pendientes || 0} pendientes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(rol === 'Admin' || rol === 'Director') && institucional?.avanceCargaDocente && (
              <section className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                <SectionHeader icon={Table2} title="Avance de carga por docente" subtitle="Estado de notas registradas en la unidad aperturada." action={
                  institucional.avanceCargaDocente.unidadActual ? (
                    <span className="inline-flex w-fit rounded-sm bg-emerald-50/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200/60">Bimestre {institucional.avanceCargaDocente.unidadActual.bimestre} · Unidad {institucional.avanceCargaDocente.unidadActual.numero}</span>
                  ) : (<span className="inline-flex w-fit rounded-sm bg-amber-50/50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200/60">Sin unidad abierta</span>)
                } />
                {!institucional.avanceCargaDocente.unidadActual ? (
                  <EmptyPanel title="No hay unidad aperturada" description="Abre una unidad desde Configuración para empezar a visualizar el avance de carga por docente." />
                ) : institucional.avanceCargaDocente.docentes?.length ? (
                  <div className="space-y-3">
                    {institucional.avanceCargaDocente.docentes.slice(0, 8).map((item: any) => (
                      <div key={item.id_docente} className="rounded bg-neutral-50 p-4 ring-1 ring-neutral-200 transition-all duration-150 hover:ring-neutral-300/60">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-neutral-800">{item.docente}</p><EstadoCargaBadge estado={item.estado} /></div>
                            <p className="mt-1 text-xs text-neutral-400">{item.cursos?.join(' · ') || 'Sin cursos'} · {item.secciones?.join(' / ') || 'Sin sección'}</p>
                            {activeScope.tipo === 'todos' && item.colegios?.length > 0 && (<p className="mt-0.5 text-xs text-neutral-400">{item.colegios.join(' · ')}</p>)}
                          </div>
                          <div className="text-left lg:text-right"><p className="text-base font-semibold text-neutral-900 tabular-nums">{item.porcentaje}%</p><p className="text-xs text-neutral-400">{item.pendientes} pendientes</p></div>
                        </div>
                        <ProgressBar value={item.porcentaje} />
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400"><span>{item.registradas} registradas</span><span>·</span><span>{item.totalEsperado} esperadas</span><span>·</span><span>{item.evaluaciones} evaluaciones</span></div>
                      </div>
                    ))}
                  </div>
                ) : (<EmptyPanel title="No hay docentes con carga académica" description="Cuando existan asignaciones docentes para el año activo, aparecerán en esta sección." />)}
              </section>
            )}

            {docente && (
              <section className="space-y-6">
                <div><h2 className="text-base font-semibold text-neutral-900 tracking-tight">Resumen docente</h2><p className="text-xs text-neutral-400 mt-0.5">Cursos, secciones, evaluaciones y avance de carga de notas.</p></div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <KpiCard label="Cursos" value={formatNumber(docente.kpis?.cursos)} helper="Asignados" icon={BookOpenCheck} tone="blue" onClick={() => navigate('/notas')} />
                  <KpiCard label="Secciones" value={formatNumber(docente.kpis?.secciones)} helper="A tu cargo académico" icon={School} tone="violet" />
                  <KpiCard label="Alumnos" value={formatNumber(docente.kpis?.alumnosAsignados)} helper="En tus secciones" icon={Users} tone="emerald" />
                  <KpiCard label="Evaluaciones" value={formatNumber(docente.kpis?.evaluaciones)} helper={docente.unidadActual ? `Unidad ${docente.unidadActual.numero}` : 'Sin unidad abierta'} icon={Table2} tone="amber" onClick={() => navigate('/notas')} />
                  <KpiCard label="Avance notas" value={`${docente.avanceNotas?.porcentaje || 0}%`} helper={docente.unidadActual ? `Bim. ${docente.unidadActual.bimestre} · Unidad ${docente.unidadActual.numero}` : 'Unidad no aperturada'} icon={Sparkles} tone="neutral" />
                  <KpiCard label="Pendientes" value={formatNumber(docente.kpis?.notasPendientes)} helper="Notas por completar" icon={AlertTriangle} tone="rose" onClick={() => navigate('/notas')} />
                </div>

                <div className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                  <SectionHeader icon={Table2} title="Avance de carga por curso" subtitle="Progreso de notas registradas en la unidad aperturada." action={
                    docente.unidadActual ? (<span className="inline-flex w-fit rounded-sm bg-emerald-50/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200/60">Unidad {docente.unidadActual.numero} abierta</span>) : (<span className="inline-flex w-fit rounded-sm bg-amber-50/50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200/60">Sin unidad abierta</span>)
                  } />
                  {!docente.unidadActual ? (<EmptyPanel title="No hay unidad aperturada" description="Cuando Dirección o Administración abra una unidad, aquí aparecerá el avance de carga de notas." />) : docente.avancePorCurso?.length ? (
                    <div className="space-y-3">
                      {docente.avancePorCurso.map((item: any) => (
                        <div key={item.id_asignacion} className="rounded bg-neutral-50 p-4 ring-1 ring-neutral-200 transition-all duration-150 hover:ring-neutral-300/60">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-sm font-medium text-neutral-800">{item.curso}</p><p className="mt-0.5 text-xs text-neutral-400">{item.seccion} · {item.evaluaciones} evaluaciones · {item.alumnos} alumnos</p></div>
                            <div className="text-left sm:text-right"><p className="text-base font-semibold text-neutral-900 tabular-nums">{item.porcentaje}%</p><p className="text-xs text-neutral-400">{item.pendientes} pendientes</p></div>
                          </div>
                          <ProgressBar value={item.porcentaje} />
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400"><span>{item.registradas} registradas</span><span>·</span><span>{item.totalEsperado} esperadas</span></div>
                        </div>
                      ))}
                    </div>
                  ) : (<EmptyPanel title="Sin evaluaciones en la unidad" description="Puedes aplicar una plantilla o crear evaluaciones desde el módulo de notas." />)}
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <div className="rounded border border-neutral-200 bg-white p-6 shadow-none xl:col-span-2">
                    <SectionHeader icon={ClipboardList} title="Mis secciones" subtitle="Vista rápida de grupos asignados." />
                    {docente.seccionesResumen?.length ? (
                      <div className="space-y-3">
                        {docente.seccionesResumen.map((seccion: any) => (
                          <div key={seccion.id_seccion} className="rounded bg-neutral-50 p-4 ring-1 ring-neutral-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-sm font-medium text-neutral-800">{seccion.seccion}</p><p className="mt-0.5 text-xs text-neutral-400">{seccion.cursos?.join(' · ') || 'Sin cursos'}</p></div>
                            <span className="shrink-0 inline-flex w-fit rounded-sm bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200">{seccion.totalAlumnos} alumnos</span>
                          </div>
                        ))}
                      </div>
                    ) : (<EmptyPanel title="Sin secciones asignadas" description="Cuando tengas cursos o secciones asignadas, aparecerán aquí." />)}
                  </div>

                  <div className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                    <SectionHeader icon={CheckSquare} title="Accesos rápidos" subtitle="Acciones frecuentes." />
                    <div className="space-y-3">
                      <button type="button" onClick={() => navigate('/notas')} className="flex w-full items-center justify-between rounded bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-neutral-800  ">
                        Registro de notas <ArrowUpRight size={16} />
                      </button>
                      <button type="button" onClick={() => navigate('/asistencia')} className="flex w-full items-center justify-between rounded bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200 transition-all duration-150 hover:bg-white hover:ring-neutral-300/60">
                        Tomar asistencia <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tutoria && (
              <section className="space-y-6">
                <div><h2 className="text-base font-semibold text-neutral-900 tracking-tight">Tutoría</h2><p className="text-xs text-neutral-400 mt-0.5">Seguimiento global de tu sección tutorada.</p></div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {tutoria.secciones?.map((seccion: any) => (
                    <div key={seccion.id_seccion} className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-1.5 rounded-sm bg-violet-50/50 px-2.5 py-1 text-[11px] font-semibold text-violet-600 ring-1 ring-violet-200/60"><MessageSquareText size={12} /> Tutoría activa</div>
                          <h3 className="mt-3 text-lg font-semibold text-neutral-900 tracking-tight">{seccion.seccion}</h3>
                          <p className="mt-1 text-xs text-neutral-500">Bimestre {tutoria.bimestre?.numero || '—'}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-violet-50/50 text-violet-500"><Users size={18} /></div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded bg-neutral-50 p-4 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Alumnos</p><p className="mt-1.5 text-xl font-semibold text-neutral-900 tabular-nums">{formatNumber(seccion.alumnos)}</p></div>
                        <div className="rounded bg-neutral-50 p-4 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Promedio</p><p className="mt-1.5 text-xl font-semibold text-neutral-900 tabular-nums">{formatNota(seccion.promedioGeneral)}</p></div>
                        <div className="rounded bg-red-50/50 p-4 ring-1 ring-red-200/60"><p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">En riesgo</p><p className="mt-1.5 text-xl font-semibold text-red-600 tabular-nums">{formatNumber(seccion.alumnosRiesgo)}</p></div>
                        <div className="rounded bg-amber-50/50 p-4 ring-1 ring-amber-200/60"><p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">Coment. pend.</p><p className="mt-1.5 text-xl font-semibold text-amber-600 tabular-nums">{formatNumber(seccion.comentariosPendientes)}</p></div>
                      </div>
                      <button type="button" disabled className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-400">
                        Módulo Tutoría disponible en Fase 2 <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!institucional && !docente && !tutoria && (
              <section className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                <EmptyPanel title="Sin panel asignado" description="Tu usuario aún no tiene un contexto académico o administrativo configurado. Revisa su rol, cargo o asignaciones." />
              </section>
            )}

            {institucional?.eventosProximos && (
              <section className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                <SectionHeader icon={Calendar} title="Próximos eventos" subtitle="Agenda cercana del año escolar." />
                {institucional.eventosProximos.length === 0 ? (
                  <EmptyPanel title="No hay eventos próximos" description="Cuando se registren actividades, reuniones o evaluaciones, aparecerán aquí." />
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {institucional.eventosProximos.map((evento: any) => {
                      const fecha = new Date(evento.fecha);
                      const dia = fecha.getDate();
                      const mes = fecha.toLocaleDateString('es-PE', { month: 'short' });
                      return (
                        <div key={evento.id_evento} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0 transition-colors duration-150 hover:bg-neutral-50/50 -mx-2 px-2 rounded">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded bg-[#CCF32F] text-black shadow-sm">
                            <span className="text-base font-semibold leading-none">{dia}</span>
                            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-70">{mes}</span>
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="truncate text-sm font-medium text-neutral-800">{evento.titulo}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {evento.hora && (<span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Clock size={11} />{evento.hora}</span>)}
                              {evento.tipo && (<span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">{evento.tipo}</span>)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {institucional && (
              <section className="rounded border border-neutral-200 bg-white p-6 shadow-none">
                <SectionHeader icon={Wallet} title="Estado de pagos" subtitle="Seguimiento operativo de tesorería." action={
                  <button type="button" onClick={() => navigate('/tesoreria')} className="inline-flex h-9 items-center justify-center gap-2 rounded bg-neutral-900 px-3.5 text-xs font-medium text-white transition-all duration-150 hover:bg-neutral-800  ">
                    Ir a tesorería <ArrowUpRight size={14} />
                  </button>
                } />
                <div className="school-summary-card rounded bg-white p-5 ring-1 ring-neutral-200">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Pagos pendientes</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">{formatNumber(institucional.kpis?.pagosPendientes)}</p>
                      <p className="mt-2 text-xs leading-5 text-neutral-400">Cantidad de cronogramas pendientes registrados en el sistema.</p>
                    </div>
                    <span className="shrink-0 inline-flex w-fit rounded-sm bg-red-50/50 px-2.5 py-1 text-[11px] font-semibold text-red-500 ring-1 ring-red-200/60">Pendiente</span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}