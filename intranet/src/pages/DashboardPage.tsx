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
  scope?: {
    tipo: 'todos' | 'colegio';
    tenantId: number | null;
    colegioIds: number[];
    colegios: any[];
    puedeVerConsolidado: boolean;
  };
  usuario: {
    id: number;
    nombre: string;
    rol: string;
    cargo: string;
  };
  modulos: {
    institucional?: any | null;
    docente?: any | null;
    tutoria?: any | null;
  };
}

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('es-PE');

const formatNota = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(1);
};

const getSaludoRol = (rol?: string) => {
  if (rol === 'Profesor') return 'Panel docente';
  if (rol === 'Secretaria') return 'Panel administrativo';
  if (rol === 'Director') return 'Panel directivo';
  if (rol === 'Admin') return 'Panel institucional';
  return 'Panel principal';
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
  onClick,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: any;
  tone?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  onClick?: () => void;
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}
        >
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>

      {onClick && (
        <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-slate-400 transition group-hover:text-slate-700">
          Abrir módulo
          <ArrowUpRight size={13} />
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group min-h-[128px] rounded-[28px] border border-white bg-white/90 p-5 text-left shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="min-h-[128px] rounded-[28px] border border-white bg-white/90 p-5 text-left shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      {content}
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Sparkles size={20} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
      <div
        className="h-full rounded-full bg-accent-500 transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
      />
    </div>
  );
}

function EstadoCargaBadge({ estado }: { estado: string }) {
  const estadoStyles: Record<string, string> = {
    completo: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    avanzado: 'bg-blue-50 text-blue-700 ring-blue-100',
    en_proceso: 'bg-amber-50 text-amber-700 ring-amber-100',
    pendiente: 'bg-rose-50 text-rose-700 ring-rose-100',
    sin_evaluaciones: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  const estadoLabel: Record<string, string> = {
    completo: 'Completo',
    avanzado: 'Avanzado',
    en_proceso: 'En proceso',
    pendiente: 'Pendiente',
    sin_evaluaciones: 'Sin evaluaciones',
  };

  return (
    <span
      className={cx(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1',
        estadoStyles[estado] || estadoStyles.pendiente,
      )}
    >
      {estadoLabel[estado] || 'Pendiente'}
    </span>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { activeScope, activeColegio, scopeLabel, queryString } = useSchool();
  const navigate = useNavigate();

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    axios
      .get(`/api/dashboard/resumen${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
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


  const panelDescription =
    activeScope.tipo === 'todos'
      ? `Vista consolidada de ${scopeLabel.toLowerCase()} para revisar el estado general del grupo.`
      : `Vista rápida de ${
          activeColegio?.nombre || 'la institución'
        } con la información más importante para tu cargo.`;

  return (
    <div className="animate-slide-in-right">
      <div className="w-full space-y-6">
        <PageHeader
          eyebrow={
            activeScope.tipo === 'todos'
              ? 'Panel del grupo académico'
              : getSaludoRol(rol)
          }
          title={`Hola, ${nombreUsuario}`}
          description={panelDescription}
          icon={LayoutDashboard}
          meta={[
            {
              label: 'Contexto activo',
              value: scopeLabel,
            },
            {
              label: 'Rol del sistema',
              value: rol || 'Usuario',
            },
            {
              label: 'Función institucional',
              value:
                resumen?.usuario?.cargo ||
                user?.contexto?.cargo_principal ||
                'Sin cargo',
            },
          ]}
          actions={
            rol === 'Admin' || rol === 'Director' ? (
              <button
                type="button"
                onClick={() => navigate('/reportes')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Ver reportes
                <ArrowUpRight size={16} />
              </button>
            ) : null
          }
        />

        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="min-h-[128px] rounded-[28px] border border-white bg-white p-5 shadow-sm shadow-slate-200/70"
              >
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton mt-4 h-8 w-16 rounded-full" />
                <div className="skeleton mt-3 h-4 w-32 rounded-full" />
              </div>
            ))}
          </section>
        ) : (
          <>
            {institucional && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      {activeScope.tipo === 'todos'
                        ? 'Resumen del grupo académico'
                        : 'Resumen institucional'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {activeScope.tipo === 'todos'
                        ? 'Indicadores consolidados de los colegios activos.'
                        : 'Indicadores generales del colegio.'}
                    </p>
                  </div>
                </div>

                <div
                  className={cx(
                    'grid gap-4 sm:grid-cols-2',
                    activeScope.tipo === 'todos' ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
                  )}
                >
                  {activeScope.tipo === 'todos' && (
                    <KpiCard
                      label="Colegios"
                      value={formatNumber(institucional.kpis?.colegios)}
                      helper="Instituciones activas"
                      icon={School}
                      tone="violet"
                    />
                  )}

                  <KpiCard
                    label="Matriculados"
                    value={formatNumber(institucional.kpis?.matriculados)}
                    helper="Estudiantes activos"
                    icon={GraduationCap}
                    tone="blue"
                    onClick={() => navigate('/matricula')}
                  />

                  <KpiCard
                    label="Docentes"
                    value={formatNumber(institucional.kpis?.docentes)}
                    helper="Equipo académico"
                    icon={Users}
                    tone="emerald"
                    onClick={() => navigate('/docentes')}
                  />

                  <KpiCard
                    label="Circulares"
                    value={formatNumber(institucional.kpis?.circulares)}
                    helper="Comunicados enviados"
                    icon={Mail}
                    tone="amber"
                    onClick={() => navigate('/circulares')}
                  />

                  <KpiCard
                    label="Pagos pend."
                    value={formatNumber(institucional.kpis?.pagosPendientes)}
                    helper="Por regularizar"
                    icon={Wallet}
                    tone="rose"
                    onClick={() => navigate('/tesoreria')}
                  />
                </div>

                {(rol === 'Admin' || rol === 'Director') &&
                  institucional.avanceCargaDocente && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <KpiCard
                        label="Avance carga"
                        value={`${
                          institucional.avanceCargaDocente.resumen
                            ?.porcentajePromedio || 0
                        }%`}
                        helper={
                          institucional.avanceCargaDocente.unidadActual
                            ? `Bim. ${institucional.avanceCargaDocente.unidadActual.bimestre} · Unidad ${institucional.avanceCargaDocente.unidadActual.numero}`
                            : 'Sin unidad abierta'
                        }
                        icon={Table2}
                        tone="blue"
                      />

                      <KpiCard
                        label="Docentes completos"
                        value={`${
                          institucional.avanceCargaDocente.resumen
                            ?.docentesCompletos || 0
                        }/${institucional.avanceCargaDocente.resumen?.docentes || 0}`}
                        helper="Carga de notas al 100%"
                        icon={CheckSquare}
                        tone="emerald"
                      />

                      <KpiCard
                        label="Notas pendientes"
                        value={formatNumber(
                          institucional.avanceCargaDocente.resumen?.pendientes || 0,
                        )}
                        helper="Faltan registrar"
                        icon={AlertTriangle}
                        tone="rose"
                      />
                    </div>
                  )}
              </section>
            )}

            {activeScope.tipo === 'todos' &&
              institucional?.colegios?.length > 0 && (
                <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                        <School size={18} />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Estado por colegio
                        </h3>
                        <p className="text-xs text-slate-400">
                          Comparativo rápido de cada institución del grupo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {institucional.colegios.map((colegio: any) => (
                      <div
                        key={colegio.id_colegio}
                        className="rounded-[28px] bg-slate-50/80 p-5 ring-1 ring-slate-100"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                                style={{
                                  backgroundColor:
                                    colegio.color_principal || '#4f46e5',
                                }}
                              >
                                <School size={19} />
                              </span>

                              <div className="min-w-0">
                                <h4 className="truncate text-base font-black text-slate-950">
                                  {colegio.nombre}
                                </h4>
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {colegio.niveles?.join(' · ') ||
                                    'Sin niveles configurados'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                            {colegio.codigo}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Alumnos
                            </p>
                            <p className="mt-1 text-xl font-black text-slate-950">
                              {formatNumber(colegio.kpis?.matriculados)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Docentes
                            </p>
                            <p className="mt-1 text-xl font-black text-slate-950">
                              {formatNumber(colegio.kpis?.docentes)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Pagos
                            </p>
                            <p className="mt-1 text-xl font-black text-slate-950">
                              {formatNumber(colegio.kpis?.pagosPendientes)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-slate-500">
                              Avance de carga de notas
                            </p>
                            <p className="text-sm font-black text-slate-950">
                              {colegio.avanceCarga?.porcentajePromedio || 0}%
                            </p>
                          </div>

                          <ProgressBar
                            value={colegio.avanceCarga?.porcentajePromedio || 0}
                          />

                          <p className="mt-2 text-xs text-slate-400">
                            {colegio.avanceCarga?.registradas || 0} registradas ·{' '}
                            {colegio.avanceCarga?.pendientes || 0} pendientes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {(rol === 'Admin' || rol === 'Director') &&
              institucional?.avanceCargaDocente && (
                <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                        <Table2 size={18} />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Avance de carga por docente
                        </h3>
                        <p className="text-xs text-slate-400">
                          Estado de notas registradas en la unidad aperturada.
                        </p>
                      </div>
                    </div>

                    {institucional.avanceCargaDocente.unidadActual ? (
                      <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        Bimestre{' '}
                        {institucional.avanceCargaDocente.unidadActual.bimestre} ·
                        Unidad{' '}
                        {institucional.avanceCargaDocente.unidadActual.numero}
                      </span>
                    ) : (
                      <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                        Sin unidad abierta
                      </span>
                    )}
                  </div>

                  {!institucional.avanceCargaDocente.unidadActual ? (
                    <EmptyPanel
                      title="No hay unidad aperturada"
                      description="Abre una unidad desde Configuración para empezar a visualizar el avance de carga por docente."
                    />
                  ) : institucional.avanceCargaDocente.docentes?.length ? (
                    <div className="space-y-3">
                      {institucional.avanceCargaDocente.docentes
                        .slice(0, 8)
                        .map((item: any) => (
                          <div
                            key={item.id_docente}
                            className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-black text-slate-800">
                                    {item.docente}
                                  </p>

                                  <EstadoCargaBadge estado={item.estado} />
                                </div>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.cursos?.join(' · ') || 'Sin cursos'} ·{' '}
                                  {item.secciones?.join(' / ') || 'Sin sección'}
                                </p>

                                {activeScope.tipo === 'todos' &&
                                  item.colegios?.length > 0 && (
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                      {item.colegios.join(' · ')}
                                    </p>
                                  )}
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-left lg:text-right">
                                  <p className="text-lg font-black text-slate-950">
                                    {item.porcentaje}%
                                  </p>
                                  <p className="text-xs font-semibold text-slate-400">
                                    {item.pendientes} pendientes
                                  </p>
                                </div>
                              </div>
                            </div>

                            <ProgressBar value={item.porcentaje} />

                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
                              <span>{item.registradas} registradas</span>
                              <span>·</span>
                              <span>{item.totalEsperado} esperadas</span>
                              <span>·</span>
                              <span>{item.evaluaciones} evaluaciones</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="No hay docentes con carga académica"
                      description="Cuando existan asignaciones docentes para el año activo, aparecerán en esta sección."
                    />
                  )}
                </section>
              )}

            {docente && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Resumen docente
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cursos, secciones, evaluaciones y avance de carga de notas.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <KpiCard
                    label="Cursos"
                    value={formatNumber(docente.kpis?.cursos)}
                    helper="Asignados"
                    icon={BookOpenCheck}
                    tone="blue"
                    onClick={() => navigate('/notas')}
                  />

                  <KpiCard
                    label="Secciones"
                    value={formatNumber(docente.kpis?.secciones)}
                    helper="A tu cargo académico"
                    icon={School}
                    tone="violet"
                  />

                  <KpiCard
                    label="Alumnos"
                    value={formatNumber(docente.kpis?.alumnosAsignados)}
                    helper="En tus secciones"
                    icon={Users}
                    tone="emerald"
                  />

                  <KpiCard
                    label="Evaluaciones"
                    value={formatNumber(docente.kpis?.evaluaciones)}
                    helper={
                      docente.unidadActual
                        ? `Unidad ${docente.unidadActual.numero}`
                        : 'Sin unidad abierta'
                    }
                    icon={Table2}
                    tone="amber"
                    onClick={() => navigate('/notas')}
                  />

                  <KpiCard
                    label="Avance notas"
                    value={`${docente.avanceNotas?.porcentaje || 0}%`}
                    helper={
                      docente.unidadActual
                        ? `Bim. ${docente.unidadActual.bimestre} · Unidad ${docente.unidadActual.numero}`
                        : 'Unidad no aperturada'
                    }
                    icon={Sparkles}
                    tone="slate"
                  />

                  <KpiCard
                    label="Pendientes"
                    value={formatNumber(docente.kpis?.notasPendientes)}
                    helper="Notas por completar"
                    icon={AlertTriangle}
                    tone="rose"
                    onClick={() => navigate('/notas')}
                  />
                </div>

                <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                        <Table2 size={18} />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Avance de carga por curso
                        </h3>
                        <p className="text-xs text-slate-400">
                          Progreso de notas registradas en la unidad aperturada.
                        </p>
                      </div>
                    </div>

                    {docente.unidadActual ? (
                      <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        Unidad {docente.unidadActual.numero} abierta
                      </span>
                    ) : (
                      <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                        Sin unidad abierta
                      </span>
                    )}
                  </div>

                  {!docente.unidadActual ? (
                    <EmptyPanel
                      title="No hay unidad aperturada"
                      description="Cuando Dirección o Administración abra una unidad, aquí aparecerá el avance de carga de notas."
                    />
                  ) : docente.avancePorCurso?.length ? (
                    <div className="space-y-3">
                      {docente.avancePorCurso.map((item: any) => (
                        <div
                          key={item.id_asignacion}
                          className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-800">
                                {item.curso}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {item.seccion} · {item.evaluaciones} evaluaciones ·{' '}
                                {item.alumnos} alumnos
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-lg font-black text-slate-950">
                                {item.porcentaje}%
                              </p>
                              <p className="text-xs font-semibold text-slate-400">
                                {item.pendientes} pendientes
                              </p>
                            </div>
                          </div>

                          <ProgressBar value={item.porcentaje} />

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
                            <span>{item.registradas} registradas</span>
                            <span>·</span>
                            <span>{item.totalEsperado} esperadas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Sin evaluaciones en la unidad"
                      description="Puedes aplicar una plantilla o crear evaluaciones desde el módulo de notas."
                    />
                  )}
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <ClipboardList size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">
                            Mis secciones
                          </h3>
                          <p className="text-xs text-slate-400">
                            Vista rápida de grupos asignados.
                          </p>
                        </div>
                      </div>
                    </div>

                    {docente.seccionesResumen?.length ? (
                      <div className="space-y-3">
                        {docente.seccionesResumen.map((seccion: any) => (
                          <div
                            key={seccion.id_seccion}
                            className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  {seccion.seccion}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {seccion.cursos?.join(' · ') || 'Sin cursos'}
                                </p>
                              </div>
                              <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                                {seccion.totalAlumnos} alumnos
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel
                        title="Sin secciones asignadas"
                        description="Cuando tengas cursos o secciones asignadas, aparecerán aquí."
                      />
                    )}
                  </div>

                  <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                        <CheckSquare size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Accesos rápidos
                        </h3>
                        <p className="text-xs text-slate-400">Acciones frecuentes.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => navigate('/notas')}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                      >
                        Registro de notas
                        <ArrowUpRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/asistencia')}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        Tomar asistencia
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tutoria && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">Tutoría</h2>
                  <p className="text-xs text-slate-400">
                    Seguimiento global de tu sección tutorada.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {tutoria.secciones?.map((seccion: any) => (
                    <div
                      key={seccion.id_seccion}
                      className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600 ring-1 ring-violet-100">
                            <MessageSquareText size={13} />
                            Tutoría activa
                          </div>

                          <h3 className="mt-3 text-lg font-black text-slate-950">
                            {seccion.seccion}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Bimestre {tutoria.bimestre?.numero || '—'}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                          <Users size={20} />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            Alumnos
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {formatNumber(seccion.alumnos)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            Promedio
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {formatNota(seccion.promedioGeneral)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-400">
                            En riesgo
                          </p>
                          <p className="mt-2 text-2xl font-black text-rose-700">
                            {formatNumber(seccion.alumnosRiesgo)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-100">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-500">
                            Coment. pend.
                          </p>
                          <p className="mt-2 text-2xl font-black text-amber-700">
                            {formatNumber(seccion.comentariosPendientes)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400"
                      >
                        Módulo Tutoría disponible en Fase 2
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!institucional && !docente && !tutoria && (
              <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                <EmptyPanel
                  title="Sin panel asignado"
                  description="Tu usuario aún no tiene un contexto académico o administrativo configurado. Revisa su rol, cargo o asignaciones."
                />
              </section>
            )}

            {institucional?.eventosProximos && (
              <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Próximos eventos
                      </h2>
                      <p className="text-xs text-slate-400">
                        Agenda cercana del año escolar.
                      </p>
                    </div>
                  </div>
                </div>

                {institucional.eventosProximos.length === 0 ? (
                  <EmptyPanel
                    title="No hay eventos próximos"
                    description="Cuando se registren actividades, reuniones o evaluaciones, aparecerán aquí."
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {institucional.eventosProximos.map((evento: any) => {
                      const fecha = new Date(evento.fecha);
                      const dia = fecha.getDate();
                      const mes = fecha.toLocaleDateString('es-PE', {
                        month: 'short',
                      });

                      return (
                        <div
                          key={evento.id_evento}
                          className="flex items-start gap-4 rounded-2xl px-2 py-3 transition hover:bg-slate-50"
                        >
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                            <span className="text-lg font-black leading-none">
                              {dia}
                            </span>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                              {mes}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 pt-1">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {evento.titulo}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {evento.hora && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-100">
                                  <Clock size={12} />
                                  {evento.hora}
                                </span>
                              )}

                              {evento.tipo && (
                                <span className="inline-flex rounded-full bg-slate-50 px-2 py-1 text-[11px] font-bold capitalize text-slate-500 ring-1 ring-slate-100">
                                  {evento.tipo}
                                </span>
                              )}
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
              <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Estado de pagos
                      </h2>
                      <p className="text-xs text-slate-400">
                        Seguimiento operativo de tesorería.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/tesoreria')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Ir a tesorería
                    <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Pagos pendientes
                      </p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 tabular-nums">
                        {formatNumber(institucional.kpis?.pagosPendientes)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Cantidad de cronogramas pendientes registrados en el sistema.
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-rose-600 ring-1 ring-rose-100">
                      Pendiente
                    </span>
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