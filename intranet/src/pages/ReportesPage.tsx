import { useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Loader2,
  ReceiptText,
  RefreshCw,
  School,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

type Tone = 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

interface FinancierasData {
  morosidadVencida?: number;
  ingresosMes?: number;
  tasaCumplimiento?: number;
  ingresosPorNivel?: { nivel: string; total: number }[];
  proximosAVencer?: number;
}

interface AcademicasData {
  capacidad?: { nivel: string; matriculados: number; capacidad: number }[];
  promedioGeneral?: number;
  asistenciaPorSemana?: { semana: string; porcentaje: number }[];
}

interface AlertasData {
  alumnosRiesgo?: { nombre: string; promedio: number }[];
  riesgoDesercion?: { nombre: string; pensionesVencidas: number; faltas: number }[];
}

interface OperativasData {
  unidadActual?: {
    id_unidad: number;
    numero: number;
    id_bimestre: number;
    bimestre: number;
    fecha_inicio: string;
    fecha_fin: string;
    estado_abierto: boolean;
  } | null;
  cargaDocentes?: {
    id_docente?: number;
    docente: string;
    cursos?: string[];
    secciones?: string[];
    evaluaciones?: number;
    totalEsperado?: number;
    registradas?: number;
    pendientes?: number;
    porcentaje: number;
    estado?: 'completo' | 'avanzado' | 'en_proceso' | 'pendiente' | 'sin_evaluaciones';
  }[];
  comunicados?: any[];
}

interface ReportesState {
  financieras: FinancierasData | null;
  academicas: AcademicasData | null;
  alertas: AlertasData | null;
  operativas: OperativasData | null;
  matriculaTendencia: { mes: string; total: number }[];
  distribucionNivel: { nivel: string; total: number }[];
}

const emptyData: ReportesState = {
  financieras: null, academicas: null, alertas: null, operativas: null,
  matriculaTendencia: [], distribucionNivel: [],
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const formatNumber = (value: number | null | undefined) => Number(value || 0).toLocaleString('es-PE');

const formatMoney = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });

const formatPercent = (value: number | null | undefined) => {
  const n = Number(value || 0);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
};

const formatNota = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  const nota = Number(value);
  if (!Number.isFinite(nota)) return '—';
  return String(Math.round(nota)).padStart(2, '0');
};

/* ─── KPI Card ──────────────────────────────────────── */
function KpiCard({
  label, value, helper, icon: Icon, tone = 'neutral',
}: {
  label: string; value: string | number; helper: string; icon: any; tone?: Tone;
}) {
  const tones: Record<Tone, { dot: string; iconBg: string }> = {
    neutral: { dot: 'bg-neutral-400', iconBg: 'bg-neutral-100 text-neutral-500' },
    blue: { dot: 'bg-blue-600', iconBg: 'bg-blue-50 text-blue-500' },
    emerald: { dot: 'bg-emerald-600', iconBg: 'bg-emerald-50 text-emerald-500' },
    amber: { dot: 'bg-amber-500', iconBg: 'bg-amber-50 text-amber-500' },
    rose: { dot: 'bg-rose-400', iconBg: 'bg-rose-50 text-rose-500' },
    violet: { dot: 'bg-violet-400', iconBg: 'bg-violet-50 text-violet-500' },
  };

  const t = tones[tone];

  return (
    <div className="reportes-kpi-card carbon-report-kpi rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-neutral-300/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 truncate">{label}</p>
          </div>
          <p className="text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums">{value}</p>
          <p className="mt-2 text-xs text-neutral-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty Panel ───────────────────────────────────── */
function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="carbon-report-empty flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-300">
        <BarChart3 size={22} />
      </div>
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs text-neutral-400 leading-5">{description}</p>
    </div>
  );
}

/* ─── Section Card ──────────────────────────────────── */
function SectionCard({
  title, description, icon: Icon, children, action,
}: {
  title: string; description: string; icon: any; children: ReactNode; action?: ReactNode;
}) {
  return (
    <section className="carbon-report-section rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">{title}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ─── Progress Row ──────────────────────────────────── */
function ProgressRow({
  label, value, helper, tone = 'blue',
}: {
  label: string; value: number; helper?: string; tone?: Tone;
}) {
  const barTones: Record<Tone, string> = {
    neutral: 'bg-neutral-400',
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-400',
    violet: 'bg-violet-400',
  };

  const safeValue = Math.min(100, Math.max(0, Number(value || 0)));

  return (
    <div className="carbon-report-progress-row rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-800">{label}</p>
          {helper && <p className="mt-0.5 text-xs text-neutral-400">{helper}</p>}
        </div>
        <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatPercent(safeValue)}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cx('h-full rounded-full transition-all duration-700', barTones[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Amount Row ────────────────────────────────────── */
function AmountRow({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="carbon-report-amount-row flex items-center justify-between gap-4 rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-800">{label}</p>
        {helper && <p className="mt-0.5 text-xs text-neutral-400">{helper}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold text-neutral-900">{formatMoney(value)}</p>
    </div>
  );
}

/* ─── Estado Badge ──────────────────────────────────── */
function EstadoBadge({ estado }: { estado?: string }) {
  const styles: Record<string, string> = {
    completo: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
    avanzado: 'bg-blue-50 text-blue-600 ring-blue-200/60',
    en_proceso: 'bg-amber-50 text-amber-600 ring-amber-200/60',
    pendiente: 'bg-red-50 text-red-600 ring-red-200/60',
    sin_evaluaciones: 'bg-neutral-100 text-neutral-500 ring-neutral-200/60',
  };
  const labels: Record<string, string> = {
    completo: 'Completo', avanzado: 'Avanzado', en_proceso: 'En proceso',
    pendiente: 'Pendiente', sin_evaluaciones: 'Sin evaluaciones',
  };
  const key = estado || 'pendiente';

  return (
    <span className={cx('inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', styles[key] || styles.pendiente)}>
      {labels[key] || 'Pendiente'}
    </span>
  );
}

/* ─── Stat Block (mini KPI inside sections) ─────────── */
function StatBlock({
  label, value, helper, icon: Icon, tone,
}: {
  label: string; value: string | number; helper: string; icon: any; tone: Tone;
}) {
  const tones: Record<Tone, { bg: string; text: string; icon: string; ring: string }> = {
    neutral: { bg: 'bg-neutral-50', text: 'text-neutral-700', icon: 'text-neutral-400', ring: 'ring-neutral-200/60' },
    blue: { bg: 'bg-blue-50/50', text: 'text-blue-700', icon: 'text-blue-400', ring: 'ring-blue-200/60' },
    emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', icon: 'text-emerald-400', ring: 'ring-emerald-200/60' },
    amber: { bg: 'bg-amber-50/50', text: 'text-amber-700', icon: 'text-amber-400', ring: 'ring-amber-200/60' },
    rose: { bg: 'bg-rose-50/50', text: 'text-rose-700', icon: 'text-rose-400', ring: 'ring-rose-200/60' },
    violet: { bg: 'bg-violet-50/50', text: 'text-violet-700', icon: 'text-violet-400', ring: 'ring-violet-200/60' },
  };
  const t = tones[tone];

  return (
    <div className={`carbon-report-stat rounded-2xl ${t.bg} p-5 ring-1 ${t.ring}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={t.icon} />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      </div>
      <p className={`text-2xl font-semibold ${t.text} tabular-nums`}>{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{helper}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function ReportesPage() {
  const { token, user } = useAuth();
  const { activeScope, scopeLabel, queryString } = useSchool();

  const [data, setData] = useState<ReportesState>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const canView = user?.rol === 'Admin' || user?.rol === 'Director';

  const cargarReportes = async () => {
    if (!token || !canView) return;
    setLoading(true); setError('');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const [financieras, academicas, alertas, operativas, matriculaTendencia, distribucionNivel] =
        await Promise.allSettled([
          axios.get(`/api/analiticas/financieras${queryString}`, authHeaders),
          axios.get(`/api/analiticas/academicas${queryString}`, authHeaders),
          axios.get(`/api/analiticas/alertas${queryString}`, authHeaders),
          axios.get(`/api/analiticas/operativas${queryString}`, authHeaders),
          axios.get(`/api/analiticas/matricula-tendencia${queryString}`, authHeaders),
          axios.get(`/api/analiticas/distribucion-nivel${queryString}`, authHeaders),
        ]);

      setData({
        financieras: financieras.status === 'fulfilled' ? financieras.value.data : null,
        academicas: academicas.status === 'fulfilled' ? academicas.value.data : null,
        alertas: alertas.status === 'fulfilled' ? alertas.value.data : null,
        operativas: operativas.status === 'fulfilled' ? operativas.value.data : null,
        matriculaTendencia: matriculaTendencia.status === 'fulfilled' ? matriculaTendencia.value.data || [] : [],
        distribucionNivel: distribucionNivel.status === 'fulfilled' ? distribucionNivel.value.data || [] : [],
      });
    } catch {
      setError('No se pudieron cargar los reportes.');
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { cargarReportes(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [token, canView, queryString]);

  const capacidadTotal = useMemo(() =>
    (data.academicas?.capacidad || []).reduce((t, i) => t + Number(i.capacidad || 0), 0),
    [data.academicas]);

  const matriculadosCapacidad = useMemo(() =>
    (data.academicas?.capacidad || []).reduce((t, i) => t + Number(i.matriculados || 0), 0),
    [data.academicas]);

  const ocupacion = capacidadTotal ? Math.round((matriculadosCapacidad / capacidadTotal) * 100) : 0;
  const unidadOperativa = data.operativas?.unidadActual;

  if (!canView) {
    return (
      <div className="carbon-reportes-page w-full">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/60 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-5">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Reportes no disponibles</h1>
          <p className="mt-2 max-w-md text-sm text-neutral-500 leading-relaxed">
            Esta sección está disponible exclusivamente para Dirección y Administración.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="carbon-reportes-page w-full space-y-6">
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <PageHeader
          eyebrow="Centro de reportes"
          title="Reportes institucionales"
          description={
            activeScope.tipo === 'todos'
              ? `Vista ejecutiva consolidada de ${scopeLabel.toLowerCase()} para revisar indicadores académicos, financieros, operativos y alertas.`
              : `Vista ejecutiva de ${scopeLabel} para revisar indicadores académicos, financieros, operativos y alertas.`
          }
          icon={BarChart3}
          meta={[
            { label: 'Contexto activo', value: scopeLabel },
            { label: 'Vista', value: activeScope.tipo === 'todos' ? 'Consolidada' : 'Por colegio' },
          ]}
          actions={
            <button
              type="button"
              onClick={cargarReportes}
              disabled={loading}
              className="reportes-refresh-button inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </button>
          }
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 ring-1 ring-red-200/60">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div><p className="font-semibold">Error al cargar reportes</p><p className="mt-1 text-xs text-red-500">{error}</p></div>
        </div>
      )}

      {loading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-h-[140px] rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse">
              <div className="h-3 w-20 rounded bg-neutral-100 mb-4" />
              <div className="h-8 w-24 rounded-lg bg-neutral-100 mb-3" />
              <div className="h-3 w-32 rounded bg-neutral-100" />
            </div>
          ))}
        </section>
      ) : (
        <div className={`space-y-6 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* ── KPI Cards ── */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Ingresos del mes" value={formatMoney(data.financieras?.ingresosMes)} helper="Pagos registrados" icon={Wallet} tone="emerald" />
            <KpiCard label="Morosidad" value={formatMoney(data.financieras?.morosidadVencida)} helper="Saldo vencido real" icon={AlertTriangle} tone="rose" />
            <KpiCard label="Promedio general" value={formatNota(data.academicas?.promedioGeneral)} helper="Unidad aperturada" icon={BookOpenCheck} tone="blue" />
            <KpiCard label="Ocupación" value={formatPercent(ocupacion)} helper={`${formatNumber(matriculadosCapacidad)} de ${formatNumber(capacidadTotal)} cupos`} icon={School} tone="violet" />
          </section>

          {/* ── Finanzas & Académico ── */}
          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Finanzas" description="Resumen de pagos, morosidad e ingresos por nivel." icon={ReceiptText}>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatBlock label="Cumplimiento" value={formatPercent(data.financieras?.tasaCumplimiento)} helper="Cronogramas pagados" icon={CheckCircle2} tone="blue" />
                <StatBlock label="Próximos a vencer" value={formatNumber(data.financieras?.proximosAVencer)} helper="En los siguientes días" icon={CalendarClock} tone="amber" />
              </div>
              <div className="mt-5 space-y-3">
                {(data.financieras?.ingresosPorNivel || []).length ? (
                  data.financieras!.ingresosPorNivel!.map((item) => (
                    <AmountRow key={item.nivel} label={item.nivel} value={item.total} helper="Ingresos acumulados" />
                  ))
                ) : (
                  <EmptyPanel title="Sin ingresos por nivel" description="Cuando existan pagos registrados, aparecerá la distribución por nivel." />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Académico" description="Capacidad, ocupación y asistencia semanal." icon={GraduationCap}>
              <div className="space-y-3">
                {(data.academicas?.capacidad || []).length ? (
                  data.academicas!.capacidad!.map((item) => {
                    const porcentaje = item.capacidad ? Math.round((item.matriculados / item.capacidad) * 100) : 0;
                    return <ProgressRow key={item.nivel} label={item.nivel} value={porcentaje} helper={`${formatNumber(item.matriculados)} matriculados de ${formatNumber(item.capacidad)} cupos`} tone="violet" />;
                  })
                ) : (
                  <EmptyPanel title="Sin capacidad configurada" description="La información aparecerá cuando existan aulas, secciones y matrículas activas." />
                )}
              </div>
              <div className="reportes-asistencia-semanal hidden">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Asistencia últimas semanas</p>
                {(data.academicas?.asistenciaPorSemana || []).length ? (
                  <div className="space-y-3">
                    {data.academicas!.asistenciaPorSemana!.map((item) => (
                      <ProgressRow key={item.semana} label={`Semana ${item.semana}`} value={item.porcentaje} helper="Porcentaje de presentes" tone="emerald" />
                    ))}
                  </div>
                ) : (
                  <EmptyPanel title="Sin asistencia registrada" description="Cuando se registre asistencia, aparecerá la tendencia semanal." />
                )}
              </div>
            </SectionCard>
          </section>

          {/* ── Matrícula & Operativo ── */}
          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Matrícula" description="Tendencia mensual y distribución por nivel." icon={Users}>
              <div className="space-y-3">
                {(data.matriculaTendencia || []).length ? (
                  data.matriculaTendencia.map((item) => {
                    const max = Math.max(...data.matriculaTendencia.map((r) => Number(r.total || 0)), 1);
                    return (
                      <div key={item.mes} className="rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-neutral-800">{item.mes}</p>
                          <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatNumber(item.total)}</p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-700"
                            style={{ width: `${Math.round((item.total / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyPanel title="Sin tendencia de matrícula" description="Cuando existan matrículas registradas por mes, se mostrará el avance." />
                )}
              </div>
              <div className="mt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Distribución por nivel</p>
                {(data.distribucionNivel || []).length ? (
                  <div className="space-y-3">
                    {data.distribucionNivel.map((item) => {
                      const total = data.distribucionNivel.reduce((s, r) => s + Number(r.total || 0), 0);
                      const porcentaje = total ? Math.round((item.total / total) * 100) : 0;
                      return <ProgressRow key={item.nivel} label={item.nivel} value={porcentaje} helper={`${formatNumber(item.total)} estudiantes`} tone="blue" />;
                    })}
                  </div>
                ) : (
                  <EmptyPanel title="Sin distribución" description="No se encontraron estudiantes activos por nivel." />
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Operativo"
              description="Carga de notas, alertas y comunicados recientes."
              icon={BarChart3}
              action={
                unidadOperativa ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200/60">
                    <Zap size={12} /> Bim. {unidadOperativa.bimestre} · Unidad {unidadOperativa.numero}
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200/60">
                    <AlertTriangle size={12} /> Sin unidad abierta
                  </span>
                )
              }
            >
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Carga de notas por docente</p>
                {(data.operativas?.cargaDocentes || []).length ? (
                  <div className="space-y-3">
                    {data.operativas!.cargaDocentes!.slice(0, 8).map((item) => (
                      <div key={item.id_docente ?? item.docente} className="rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-neutral-800">{item.docente}</p>
                              <EstadoBadge estado={item.estado} />
                            </div>
                            <p className="mt-1.5 text-xs text-neutral-400">
                              {item.registradas ?? 0} registradas · {item.totalEsperado ?? 0} esperadas · {item.pendientes ?? 0} pendientes
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-neutral-900 tabular-nums">{formatPercent(item.porcentaje)}</p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cx(
                              'h-full rounded-full transition-all duration-700',
                              Number(item.porcentaje || 0) >= 100 ? 'bg-emerald-600' :
                              Number(item.porcentaje || 0) >= 70 ? 'bg-blue-600' :
                              Number(item.porcentaje || 0) > 0 ? 'bg-amber-500' : 'bg-rose-600',
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, Number(item.porcentaje || 0)))}%` }}
                          />
                        </div>
                        {(item.cursos?.length || item.secciones?.length) && (
                          <p className="mt-2.5 line-clamp-1 text-xs text-neutral-400">
                            {item.cursos?.join(' · ') || 'Sin cursos'} · {item.secciones?.join(' / ') || 'Sin sección'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel title="Sin carga docente" description="Cuando exista una unidad abierta con evaluaciones, aparecerá el avance por docente." />
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <StatBlock label="Riesgo académico" value={formatNumber(data.alertas?.alumnosRiesgo?.length || 0)} helper="Alumnos con promedio bajo" icon={AlertTriangle} tone="rose" />
                <StatBlock label="Riesgo integral" value={formatNumber(data.alertas?.riesgoDesercion?.length || 0)} helper="Morosidad o inasistencias" icon={CalendarClock} tone="amber" />
              </div>
            </SectionCard>
          </section>

          {/* ── Alertas ── */}
          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Alumnos en riesgo académico" description="Primeros casos detectados por promedio." icon={AlertTriangle}>
              {(data.alertas?.alumnosRiesgo || []).length ? (
                <div className="space-y-3">
                  {data.alertas!.alumnosRiesgo!.map((item) => (
                    <div key={item.nombre} className="flex items-center justify-between gap-4 rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800">{item.nombre}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">Requiere seguimiento académico</p>
                      </div>
                      <span className="shrink-0 rounded-xl bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 ring-1 ring-red-200/60 tabular-nums">
                        {formatNota(item.promedio)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel title="Sin alumnos en riesgo" description="No se encontraron alumnos con promedio bajo en este corte." />
              )}
            </SectionCard>

            <SectionCard title="Riesgo por morosidad o inasistencia" description="Casos que pueden requerir intervención." icon={TrendingUp}>
              {(data.alertas?.riesgoDesercion || []).length ? (
                <div className="space-y-3">
                  {data.alertas!.riesgoDesercion!.map((item) => (
                    <div key={item.nombre} className="rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                      <p className="text-sm font-medium text-neutral-800">{item.nombre}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-red-200/60">
                          {formatNumber(item.pensionesVencidas)} pensiones vencidas
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200/60">
                          {formatNumber(item.faltas)} faltas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel title="Sin alertas integrales" description="No se encontraron alumnos con criterios de riesgo por ahora." />
              )}
            </SectionCard>
          </section>

          {/* ── Footer ── */}
          <section className="carbon-report-section carbon-report-footer hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CheckCircle2 size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-800">Corte del reporte</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Información consolidada del año académico activo y la unidad aperturada.</p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold text-neutral-500 ring-1 ring-neutral-200/60">
                Reportes básicos activos <ArrowUpRight size={14} />
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}