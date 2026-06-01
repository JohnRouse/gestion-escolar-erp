import { useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
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
  const tones: Record<Tone, string> = {
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  return (
    <div className="min-h-[132px] rounded-[28px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
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
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <BarChart3 size={20} />
      </div>

      <p className="text-sm font-bold text-slate-700">{title}</p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
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
    <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Icon size={18} />
          </div>

          <div>
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>

        {action}
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
    <div className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-800">{label}</p>

          {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
        </div>

        <p className="text-lg font-black text-slate-950 tabular-nums">
          {formatPercent(safeValue)}
        </p>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
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
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-800">{label}</p>

        {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
      </div>

      <p className="shrink-0 text-sm font-black text-slate-950">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function EstadoCargaBadge({ estado }: { estado?: string }) {
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

  const key = estado || 'pendiente';

  return (
    <span
      className={cx(
        'inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-black ring-1',
        estadoStyles[key] || estadoStyles.pendiente,
      )}
    >
      {estadoLabel[key] || 'Pendiente'}
    </span>
  );
}

export default function ReportesPage() {
  const { token, user } = useAuth();

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
        axios.get('/api/analiticas/financieras', authHeaders),
        axios.get('/api/analiticas/academicas', authHeaders),
        axios.get('/api/analiticas/alertas', authHeaders),
        axios.get('/api/analiticas/operativas', authHeaders),
        axios.get('/api/analiticas/matricula-tendencia', authHeaders),
        axios.get('/api/analiticas/distribucion-nivel', authHeaders),
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
  }, [token, canView]);

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
      <div className="animate-slide-in-right">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-[32px] border border-white bg-white/90 p-8 text-center shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <AlertTriangle size={24} />
            </div>

            <h1 className="mt-4 text-2xl font-black text-slate-950">
              Reportes no disponibles
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Esta sección está disponible para Dirección y Administración.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-right">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                <BarChart3 size={13} className="text-accent-500" />
                Centro de reportes
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Reportes institucionales
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Vista ejecutiva para revisar indicadores académicos, financieros,
                operativos y alertas del colegio.
              </p>
            </div>

            <button
              type="button"
              onClick={cargarReportes}
              disabled={loading}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="min-h-[132px] rounded-[28px] border border-white bg-white p-5 shadow-sm shadow-slate-200/70"
              >
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton mt-4 h-8 w-20 rounded-full" />
                <div className="skeleton mt-3 h-4 w-32 rounded-full" />
              </div>
            ))}
          </section>
        ) : (
          <>
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

            <section className="grid gap-5 xl:grid-cols-2">
              <SectionCard
                title="Finanzas"
                description="Resumen de pagos, morosidad e ingresos por nivel."
                icon={ReceiptText}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Cumplimiento
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {formatPercent(data.financieras?.tasaCumplimiento)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Cronogramas pagados
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Próximos a vencer
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {formatNumber(data.financieras?.proximosAVencer)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
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

                <div className="mt-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
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
                          className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-800">{item.mes}</p>

                            <p className="text-sm font-black text-slate-950">
                              {formatNumber(item.total)}
                            </p>
                          </div>

                          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                            <div
                              className="h-full rounded-full bg-accent-500 transition-all duration-700"
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

                <div className="mt-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
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
                    <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      Bim. {unidadOperativa.bimestre} · Unidad {unidadOperativa.numero}
                    </span>
                  ) : (
                    <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                      Sin unidad abierta
                    </span>
                  )
                }
              >
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Carga de notas por docente
                  </p>

                  {(data.operativas?.cargaDocentes || []).length ? (
                    <div className="space-y-3">
                      {data.operativas!.cargaDocentes!.slice(0, 8).map((item) => (
                        <div
                          key={item.id_docente ?? item.docente}
                          className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-black text-slate-800">
                                  {item.docente}
                                </p>

                                <EstadoCargaBadge estado={item.estado} />
                              </div>

                              <p className="mt-1 text-xs text-slate-400">
                                {item.registradas ?? 0} registradas ·{' '}
                                {item.totalEsperado ?? 0} esperadas ·{' '}
                                {item.pendientes ?? 0} pendientes
                              </p>
                            </div>

                            <p className="text-lg font-black text-slate-950 tabular-nums">
                              {formatPercent(item.porcentaje)}
                            </p>
                          </div>

                          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                            <div
                              className={cx(
                                'h-full rounded-full transition-all duration-700',
                                Number(item.porcentaje || 0) >= 100
                                  ? 'bg-emerald-500'
                                  : Number(item.porcentaje || 0) >= 70
                                    ? 'bg-blue-500'
                                    : Number(item.porcentaje || 0) > 0
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500',
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
                            <p className="mt-3 line-clamp-2 text-xs text-slate-400">
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
                    <div className="flex items-center gap-2 text-rose-700">
                      <AlertTriangle size={17} />
                      <p className="text-sm font-black">Riesgo académico</p>
                    </div>

                    <p className="mt-2 text-3xl font-black text-rose-700">
                      {formatNumber(data.alertas?.alumnosRiesgo?.length || 0)}
                    </p>

                    <p className="mt-1 text-xs text-rose-500">
                      Alumnos con promedio bajo
                    </p>
                  </div>

                  <div className="rounded-3xl bg-amber-50/70 p-4 ring-1 ring-amber-100">
                    <div className="flex items-center gap-2 text-amber-700">
                      <CalendarClock size={17} />
                      <p className="text-sm font-black">Riesgo integral</p>
                    </div>

                    <p className="mt-2 text-3xl font-black text-amber-700">
                      {formatNumber(data.alertas?.riesgoDesercion?.length || 0)}
                    </p>

                    <p className="mt-1 text-xs text-amber-500">
                      Morosidad o inasistencias
                    </p>
                  </div>
                </div>
              </SectionCard>
            </section>

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
                        className="flex items-center justify-between gap-4 rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {item.nombre}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Requiere seguimiento académico
                          </p>
                        </div>

                        <span className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-black text-rose-700 ring-1 ring-rose-100">
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
                        className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-100"
                      >
                        <p className="text-sm font-black text-slate-800">
                          {item.nombre}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                            {formatNumber(item.pensionesVencidas)} pensiones vencidas
                          </span>

                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
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

            <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Corte del reporte
                    </h2>

                    <p className="text-sm leading-6 text-slate-500">
                      Información consolidada del año académico activo y de la unidad
                      aperturada.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                  Reportes básicos activos
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}