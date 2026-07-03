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
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    neutral: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-100' },
  };

  const t = tones[tone] || tones.neutral;

  const content = (
    <div className="flex h-full items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 tabular-nums">{value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
      </div>

      <div className="flex shrink-0 items-start gap-2">
        {onClick && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <ArrowUpRight size={14} />
          </span>
        )}
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${t.bg} ${t.text} ring-1 ${t.ring}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
    </div>
  );

  const baseClass = "carbon-dashboard-card min-h-[126px] rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} group cursor-pointer`}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-sm border border-dashed border-slate-200 bg-white/70 px-6 py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-neutral-100 text-neutral-300"><Sparkles size={20} /></div>
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-neutral-400">{description}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, Number(value || 0)));

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-slate-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-700"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function EstadoCargaBadge({ estado }: { estado: string }) {
  const estadoStyles: Record<string, string> = {
    completo: 'bg-emerald-50/50 text-emerald-600 ring-emerald-200/60',
    avanzado: 'bg-blue-50/50 text-blue-600 ring-blue-200/60',
    en_proceso: 'bg-amber-50/50 text-amber-600 ring-amber-200/60',
    pendiente: 'bg-red-50/50 text-red-500 ring-red-200/60',
    sin_evaluaciones: 'bg-neutral-100 text-neutral-500 ring-slate-200',
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={18} strokeWidth={2} /></div>
        <div><h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3><p className="text-xs text-neutral-400">{subtitle}</p></div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="carbon-dashboard-page carbon-dashboard w-full space-y-6">
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
          
            )}
          </>
        )}
      </div>
    </div>
  );
}