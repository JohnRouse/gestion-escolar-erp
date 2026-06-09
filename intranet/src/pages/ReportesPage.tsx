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
  ClipboardCheck,
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

type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

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
  riesgoDesercion?: {
    nombre: string;
    pensionesVencidas: number;
    faltas: number;
  }[];
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
  financieras: null,
  academicas: null,
  alertas: null,
  operativas: null,
  matriculaTendencia: [],
  distribucionNivel: [],
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('es-PE');

const formatMoney = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  });

const formatPercent = (value: number | null | undefined) => {
  const number = Number(value || 0);
  return `${Number.isInteger(number) ? number : number.toFixed(1)}%`;
};

const formatNotaRedondeada = (value: number | null | undefined) => {
  const nota = Number(value || 0);
  if (!Number.isFinite(nota)) return '00';

  return String(Math.round(nota)).padStart(2, '0');
};

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: any;
  tone?: Tone;
}) {
  const tones: Record<Tone, { bg: string; icon: string; gradient: string }> = {
    slate: {
      bg: 'bg-slate-50 text-slate-600 ring-slate-100',
      icon: 'text-slate-500',
      gradient: 'from-slate-400 to-slate-600',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-600 ring-blue-100',
      icon: 'text-blue-500',
      gradient: 'from-blue-400 to-blue-600',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      icon: 'text-emerald-500',
      gradient: 'from-emerald-400 to-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 ring-amber-100',
      icon: 'text-amber-500',
      gradient: 'from-amber-400 to-amber-600',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 ring-rose-100',
      icon: 'text-rose-500',
      gradient: 'from-rose-400 to-rose-600',
    },
    violet: {
      bg: 'bg-violet-50 text-violet-600 ring-violet-100',
      icon: 'text-violet-500',
      gradient: 'from-violet-400 to-violet-600',
    },
  };

  return (
    <div className="group min-h-[140px] rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-gray-200 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>

          <p className="mt-3 text-4xl font-bold tracking-tight text-gray-950 tabular-nums">
            {value}
          </p>

          <p className="mt-2 text-sm text-gray-600">{helper}</p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone].gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon size={24} className="text-white" strokeWidth={2} />
        </div>
      </div>
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
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <BarChart3 size={24} />
      </div>

      <p className="text-base font-semibold text-gray-700">{title}</p>

      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description: string;
  icon: any;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-100 to-accent-50 text-accent-600 shadow-sm">
            <Icon size={20} strokeWidth={2} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {children}
    </section>
  );
}

function ProgressRow({
  label,
  value,
  helper,
  tone = 'blue',
}: {
  label: string;
  value: number;
  helper?: string;
  tone?: Tone;
}) {
  const barTones: Record<Tone, string> = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
  };

  const safeValue = Math.min(100, Math.max(0, Number(value || 0)));

  return (
    <div className="group rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{label}</p>

          {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
        </div>

        <p className="text-lg font-bold text-gray-950 tabular-nums">
          {formatPercent(safeValue)}
        </p>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-gray-100">
        <div
          className={cx('h-full rounded-full transition-all duration-700', barTones[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-800">{label}</p>

        {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
      </div>

      <p className="shrink-0 text-base font-bold text-gray-950">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function EstadoCargaBadge({ estado }: { estado?: string }) {
  const estadoStyles: Record<string, string> = {
    completo: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    avanzado: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
    en_proceso: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    pendiente: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    sin_evaluaciones: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  };

  const estadoLabel: Record<string, string> = {
    completo: 'Completo',
    avanzado: 'Avanzado',
    en_proceso: 'En proceso',
    pendiente: 'Pendiente',
    sin_evaluaciones: 'Sin evaluaciones',
  };

  const key = estado || 'pendiente';

  return (
    <span
      className={cx(
        'inline-flex w-fit rounded-lg px-3 py-1 text-xs font-semibold ring-1',
        estadoStyles[key] || estadoStyles.pendiente,
      )}
    >
      {estadoLabel[key] || 'Pendiente'}
    </span>
  );
}

export default function ReportesPage() {
  const { token, user } = useAuth();
  const { activeScope, scopeLabel, queryString } = useSchool();

  const [data, setData] = useState<ReportesState>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.rol === 'Admin' || user?.rol === 'Director';

  const cargarReportes = async () => {
    if (!token || !canView) return;

    setLoading(true);
    setError('');

    const authHeaders = {
      headers: { Authorization: `Bearer ${token}` },
    };

    try {
      const [
        financieras,
        academicas,
        alertas,
        operativas,
        matriculaTendencia,
        distribucionNivel,
      ] = await Promise.allSettled([
        axios.get(`/api/analiticas/financieras${queryString}`, authHeaders),
        axios.get(`/api/analiticas/academicas${queryString}`, authHeaders),
        axios.get(`/api/analiticas/alertas${queryString}`, authHeaders),
        axios.get(`/api/analiticas/operativas${queryString}`, authHeaders),
        axios.get(`/api/analiticas/matricula-tendencia${queryString}`, authHeaders),
        axios.get(`/api/analiticas/distribucion-nivel${queryString}`, authHeaders),
      ]);

      setData({
        financieras:
          financieras.status === 'fulfilled' ? financieras.value.data : null,
        academicas:
          academicas.status === 'fulfilled' ? academicas.value.data : null,
        alertas:
          alertas.status === 'fulfilled' ? alertas.value.data : null,
        operativas:
          operativas.status === 'fulfilled' ? operativas.value.data : null,
        matriculaTendencia:
          matriculaTendencia.status === 'fulfilled'
            ? matriculaTendencia.value.data || []
            : [],
        distribucionNivel:
          distribucionNivel.status === 'fulfilled'
            ? distribucionNivel.value.data || []
            : [],
      });
    } catch {
      setError('No se pudieron cargar los reportes.');
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canView, queryString]);

  const capacidadTotal = useMemo(() => {
    return (data.academicas?.capacidad || []).reduce(
      (total, item) => total + Number(item.capacidad || 0),
      0,
    );
  }, [data.academicas]);

  const matriculadosCapacidad = useMemo(() => {
    return (data.academicas?.capacidad || []).reduce(
      (total, item) => total + Number(item.matriculados || 0),
      0,
    );
  }, [data.academicas]);

  const ocupacion = capacidadTotal
    ? Math.round((matriculadosCapacidad / capacidadTotal) * 100)
    : 0;

  const unidadOperativa = data.operativas?.unidadActual;

  if (!canView) {
    return (
      <div className="w-full">
        <section className="rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 p-8 text-center shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-md">
            <AlertTriangle size={28} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Reportes no disponibles
          </h1>

          <p className="mx-auto mt-3 max-w-md text-base text-gray-600 leading-relaxed">
            Esta sección está disponible exclusivamente para Dirección y Administración.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <>
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
            {
              label: 'Vista',
              value: activeScope.tipo === 'todos' ? 'Consolidada' : 'Por colegio',
            },
          ]}
          actions={
            <button
              type="button"
              onClick={cargarReportes}
              disabled={loading}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Actualizar
            </button>
          }
        />

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700 animate-in fade-in">
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error al cargar reportes</p>
              <p className="mt-1 text-sm font-normal text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="min-h-[140px] rounded-2xl border border-white bg-gray-50 p-6 shadow-sm animate-pulse"
              >
                <div className="skeleton h-4 w-24 rounded-full bg-gray-300" />
                <div className="skeleton mt-4 h-10 w-20 rounded-full bg-gray-300" />
                <div className="skeleton mt-4 h-4 w-32 rounded-full bg-gray-300" />
              </div>
            ))}
          </section>
        ) : (
          <>
            {/* KPI Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Ingresos del mes"
                value={formatMoney(data.financieras?.ingresosMes)}
                helper="Pagos registrados"
                icon={Wallet}
                tone="emerald"
              />

              <KpiCard
                label="Morosidad"
                value={formatMoney(data.financieras?.morosidadVencida)}
                helper="Saldo vencido real"
                icon={AlertTriangle}
                tone="rose"
              />

              <KpiCard
                label="Promedio general"
                value={formatNotaRedondeada(data.academicas?.promedioGeneral)}
                helper="Unidad aperturada"
                icon={BookOpenCheck}
                tone="blue"
              />

              <KpiCard
                label="Ocupación"
                value={formatPercent(ocupacion)}
                helper={`${formatNumber(matriculadosCapacidad)} de ${formatNumber(capacidadTotal)} cupos`}
                icon={School}
                tone="violet"
              />
            </section>

            {/* Finanzas y Académico */}
            <section className="grid gap-5 xl:grid-cols-2">
              <SectionCard
                title="Finanzas"
                description="Resumen de pagos, morosidad e ingresos por nivel."
                icon={ReceiptText}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white p-5 ring-1 ring-blue-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Cumplimiento
                    </p>

                    <p className="mt-3 text-3xl font-bold text-blue-900">
                      {formatPercent(data.financieras?.tasaCumplimiento)}
                    </p>

                    <p className="mt-2 text-sm text-blue-700">
                      Cronogramas pagados
                    </p>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white p-5 ring-1 ring-amber-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                      Próximos a vencer
                    </p>

                    <p className="mt-3 text-3xl font-bold text-amber-900">
                      {formatNumber(data.financieras?.proximosAVencer)}
                    </p>

                    <p className="mt-2 text-sm text-amber-700">
                      En los siguientes días
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(data.financieras?.ingresosPorNivel || []).length ? (
                    data.financieras!.ingresosPorNivel!.map((item) => (
                      <AmountRow
                        key={item.nivel}
                        label={item.nivel}
                        value={item.total}
                        helper="Ingresos acumulados"
                      />
                    ))
                  ) : (
                    <EmptyPanel
                      title="Sin ingresos por nivel"
                      description="Cuando existan pagos registrados, aparecerá la distribución por nivel."
                    />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Académico"
                description="Capacidad, ocupación y asistencia semanal."
                icon={GraduationCap}
              >
                <div className="space-y-3">
                  {(data.academicas?.capacidad || []).length ? (
                    data.academicas!.capacidad!.map((item) => {
                      const porcentaje = item.capacidad
                        ? Math.round((item.matriculados / item.capacidad) * 100)
                        : 0;

                      return (
                        <ProgressRow
                          key={item.nivel}
                          label={item.nivel}
                          value={porcentaje}
                          helper={`${formatNumber(item.matriculados)} matriculados de ${formatNumber(item.capacidad)} cupos`}
                          tone="violet"
                        />
                      );
                    })
                  ) : (
                    <EmptyPanel
                      title="Sin capacidad configurada"
                      description="La información aparecerá cuando existan aulas, secciones y matrículas activas."
                    />
                  )}
                </div>

                <div className="mt-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Asistencia últimas semanas
                  </p>

                  {(data.academicas?.asistenciaPorSemana || []).length ? (
                    <div className="space-y-3">
                      {data.academicas!.asistenciaPorSemana!.map((item) => (
                        <ProgressRow
                          key={item.semana}
                          label={`Semana ${item.semana}`}
                          value={item.porcentaje}
                          helper="Porcentaje de presentes"
                          tone="emerald"
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Sin asistencia registrada"
                      description="Cuando se registre asistencia, aparecerá la tendencia semanal."
                    />
                  )}
                </div>
              </SectionCard>
            </section>

            {/* Matrícula y Operativo */}
            <section className="grid gap-5 xl:grid-cols-2">
              <SectionCard
                title="Matrícula"
                description="Tendencia mensual y distribución por nivel."
                icon={Users}
              >
                <div className="space-y-3">
                  {(data.matriculaTendencia || []).length ? (
                    data.matriculaTendencia.map((item) => {
                      const max = Math.max(
                        ...data.matriculaTendencia.map((row) => Number(row.total || 0)),
                        1,
                      );

                      return (
                        <div
                          key={item.mes}
                          className="group rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">{item.mes}</p>

                            <p className="text-sm font-bold text-gray-950">
                              {formatNumber(item.total)}
                            </p>
                          </div>

                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-gray-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all duration-700"
                              style={{ width: `${Math.round((item.total / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyPanel
                      title="Sin tendencia de matrícula"
                      description="Cuando existan matrículas registradas por mes, se mostrará el avance."
                    />
                  )}
                </div>

                <div className="mt-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Distribución por nivel
                  </p>

                  {(data.distribucionNivel || []).length ? (
                    <div className="space-y-3">
                      {data.distribucionNivel.map((item) => {
                        const total = data.distribucionNivel.reduce(
                          (sum, row) => sum + Number(row.total || 0),
                          0,
                        );

                        const porcentaje = total
                          ? Math.round((item.total / total) * 100)
                          : 0;

                        return (
                          <ProgressRow
                            key={item.nivel}
                            label={item.nivel}
                            value={porcentaje}
                            helper={`${formatNumber(item.total)} estudiantes`}
                            tone="blue"
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Sin distribución"
                      description="No se encontraron estudiantes activos por nivel."
                    />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Operativo"
                description="Carga de notas, alertas y comunicados recientes."
                icon={ClipboardCheck}
                action={
                  unidadOperativa ? (
                    <span className="inline-flex w-fit rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <Zap size={14} className="mr-1.5" />
                      Bim. {unidadOperativa.bimestre} · Unidad {unidadOperativa.numero}
                    </span>
                  ) : (
                    <span className="inline-flex w-fit rounded-lg bg-gradient-to-r from-amber-50 to-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      <AlertTriangle size={14} className="mr-1.5" />
                      Sin unidad abierta
                    </span>
                  )
                }
              >
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Carga de notas por docente
                  </p>

                  {(data.operativas?.cargaDocentes || []).length ? (
                    <div className="space-y-3">
                      {data.operativas!.cargaDocentes!.slice(0, 8).map((item) => (
                        <div
                          key={item.id_docente ?? item.docente}
                          className="group rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-gray-800">
                                  {item.docente}
                                </p>

                                <EstadoCargaBadge estado={item.estado} />
                              </div>

                              <p className="mt-2 text-xs text-gray-500">
                                {item.registradas ?? 0} registradas ·{' '}
                                {item.totalEsperado ?? 0} esperadas ·{' '}
                                {item.pendientes ?? 0} pendientes
                              </p>
                            </div>

                            <p className="text-lg font-bold text-gray-950 tabular-nums">
                              {formatPercent(item.porcentaje)}
                            </p>
                          </div>

                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-gray-100">
                            <div
                              className={cx(
                                'h-full rounded-full transition-all duration-700',
                                Number(item.porcentaje || 0) >= 100
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                  : Number(item.porcentaje || 0) >= 70
                                    ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                    : Number(item.porcentaje || 0) > 0
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                      : 'bg-gradient-to-r from-rose-400 to-rose-600',
                              )}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, Number(item.porcentaje || 0)),
                                )}%`,
                              }}
                            />
                          </div>

                          {(item.cursos?.length || item.secciones?.length) && (
                            <p className="mt-3 line-clamp-2 text-xs text-gray-500">
                              {item.cursos?.join(' · ') || 'Sin cursos'} ·{' '}
                              {item.secciones?.join(' / ') || 'Sin sección'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Sin carga docente"
                      description="Cuando exista una unidad abierta con evaluaciones, aparecerá el avance por docente."
                    />
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gradient-to-br from-rose-50 to-white p-5 ring-1 ring-rose-100">
                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                      <AlertTriangle size={18} />
                      <p className="text-sm font-semibold">Riesgo académico</p>
                    </div>

                    <p className="text-3xl font-bold text-rose-700">
                      {formatNumber(data.alertas?.alumnosRiesgo?.length || 0)}
                    </p>

                    <p className="mt-2 text-sm text-rose-600">
                      Alumnos con promedio bajo
                    </p>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-white p-5 ring-1 ring-amber-100">
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <CalendarClock size={18} />
                      <p className="text-sm font-semibold">Riesgo integral</p>
                    </div>

                    <p className="text-3xl font-bold text-amber-700">
                      {formatNumber(data.alertas?.riesgoDesercion?.length || 0)}
                    </p>

                    <p className="mt-2 text-sm text-amber-600">
                      Morosidad o inasistencias
                    </p>
                  </div>
                </div>
              </SectionCard>
            </section>

            {/* Alertas */}
            <section className="grid gap-5 xl:grid-cols-2">
              <SectionCard
                title="Alumnos en riesgo académico"
                description="Primeros casos detectados por promedio."
                icon={AlertTriangle}
              >
                {(data.alertas?.alumnosRiesgo || []).length ? (
                  <div className="space-y-3">
                    {data.alertas!.alumnosRiesgo!.map((item) => (
                      <div
                        key={item.nombre}
                        className="group flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {item.nombre}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Requiere seguimiento académico
                          </p>
                        </div>

                        <span className="rounded-lg bg-gradient-to-br from-rose-100 to-rose-50 px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200 flex-shrink-0">
                          {formatNotaRedondeada(item.promedio)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    title="Sin alumnos en riesgo"
                    description="No se encontraron alumnos con promedio bajo en este corte."
                  />
                )}
              </SectionCard>

              <SectionCard
                title="Riesgo por morosidad o inasistencia"
                description="Casos que pueden requerir intervención."
                icon={TrendingUp}
              >
                {(data.alertas?.riesgoDesercion || []).length ? (
                  <div className="space-y-3">
                    {data.alertas!.riesgoDesercion!.map((item) => (
                      <div
                        key={item.nombre}
                        className="group rounded-xl bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-gray-100 transition-all duration-300 hover:ring-gray-200 hover:shadow-sm"
                      >
                        <p className="text-sm font-semibold text-gray-800">
                          {item.nombre}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-gradient-to-br from-rose-100 to-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                            {formatNumber(item.pensionesVencidas)} pensiones vencidas
                          </span>

                          <span className="rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            {formatNumber(item.faltas)} faltas
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    title="Sin alertas integrales"
                    description="No se encontraron alumnos con criterios de riesgo por ahora."
                  />
                )}
              </SectionCard>
            </section>

            {/* Footer */}
            <section className="rounded-2xl border border-white bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-sm">
                    <CheckCircle2 size={24} strokeWidth={2} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Corte del reporte
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Información consolidada del año académico activo y de la unidad
                      aperturada.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 flex-shrink-0">
                  Reportes básicos activos
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </section>
          </>
        )}
      </>
    </div>
  );
}