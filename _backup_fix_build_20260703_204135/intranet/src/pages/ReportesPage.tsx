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
  ChevronDown,
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
  if (!Number.isFinite(nota) || nota <= 0) return '—';

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
    
        </div>
      )}
    </div>
  );
}