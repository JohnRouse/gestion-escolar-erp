import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { useCountUp } from '../hooks/useCountUp';
import {
  School, CreditCard, Megaphone, Users as UsersIcon,
  TrendingUp, AlertTriangle, BarChart3
} from 'lucide-react';

interface Financieras {
  morosidadVencida: number;
  ingresosMes: number;
  tasaCumplimiento: number;
  ingresosPorNivel: { nivel: string; total: number }[];
  proximosAVencer: number;
}
interface Academicas {
  capacidad: { nivel: string; matriculados: number; capacidad: number }[];
  promedioGeneral: number;
  asistenciaPorSemana: { semana: string; porcentaje: number }[];
}
interface Alertas {
  alumnosRiesgo: { nombre: string; promedio: number }[];
  riesgoDesercion: { nombre: string; pensionesVencidas: number; faltas: number }[];
}
interface Operativas {
  cargaDocentes: { docente: string; porcentaje: number }[];
  comunicados: any[];
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [metricaBase, setMetricaBase] = useState({ matriculados: 0, pagosPendientes: 0, circulares: 0, docentes: 0 });
  const [financieras, setFinancieras] = useState<Financieras | null>(null);
  const [academicas, setAcademicas] = useState<Academicas | null>(null);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [operativas, setOperativas] = useState<Operativas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchAll(token);
  }, [token]);

  const fetchAll = async (token: string) => {
    setLoading(true);
    try {
      // 1. Métricas básicas: siempre intentamos cargarlas
      const [matriculadosRes, pagosRes, circularesRes, docentesRes] = await Promise.all([
        axios.get('/api/academicos/matriculas/count?anio_id=1', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tesoreria/pagos/pendientes/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/circulares/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academicos/docentes/count', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMetricaBase({
        matriculados: matriculadosRes.data,
        pagosPendientes: pagosRes.data,
        circulares: circularesRes.data,
        docentes: docentesRes.data,
      });

      // 2. Analíticas financieras: si fallan, no se detiene la app
      try {
        const finRes = await axios.get('/api/analiticas/financieras', { headers: { Authorization: `Bearer ${token}` } });
        setFinancieras(finRes.data);
      } catch (err) {
        console.warn('Analíticas financieras no disponibles:', err);
        setFinancieras(null);
      }

      // 3. Analíticas académicas
      try {
        const acaRes = await axios.get('/api/analiticas/academicas', { headers: { Authorization: `Bearer ${token}` } });
        setAcademicas(acaRes.data);
      } catch (err) {
        console.warn('Analíticas académicas no disponibles:', err);
        setAcademicas(null);
      }

      // 4. Alertas
      try {
        const aleRes = await axios.get('/api/analiticas/alertas', { headers: { Authorization: `Bearer ${token}` } });
        setAlertas(aleRes.data);
      } catch (err) {
        console.warn('Alertas no disponibles:', err);
        setAlertas(null);
      }

      // 5. Operativas
      try {
        const opeRes = await axios.get('/api/analiticas/operativas', { headers: { Authorization: `Bearer ${token}` } });
        setOperativas(opeRes.data);
      } catch (err) {
        console.warn('Datos operativos no disponibles:', err);
        setOperativas(null);
      }
    } catch (err) {
      console.error('Error cargando métricas básicas del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const animMatriculados = useCountUp(metricaBase.matriculados);
  const animPagos = useCountUp(metricaBase.pagosPendientes);
  const animCirculares = useCountUp(metricaBase.circulares);
  const animDocentes = useCountUp(metricaBase.docentes);
  const animMorosidad = useCountUp(financieras?.morosidadVencida ?? 0);
  const animIngresos = useCountUp(financieras?.ingresosMes ?? 0);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumb />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Breadcrumb />

      {/* ── FILA SUPERIOR: KPIs Grandes ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={School} label="Matriculados" value={animMatriculados} color="text-yellow-500" bg="bg-yellow-500/10" />
        <KpiCard icon={CreditCard} label="Ingresos del mes" value={`S/ ${animIngresos}`} color="text-emerald-400" bg="bg-emerald-400/10" />
        <KpiCard icon={AlertTriangle} label="Morosidad vencida" value={`S/ ${animMorosidad}`} color="text-red-400" bg="bg-red-400/10" />
        <KpiCard icon={TrendingUp} label="Promedio general" value={academicas?.promedioGeneral?.toFixed(1) ?? '—'} color="text-amber-400" bg="bg-amber-400/10" />
      </div>

      {/* ── FILA MEDIA: Gráficos Principales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Capacidad vs Matrícula (barras) - ocupa 3/5 */}
        <div className="card p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-yellow-500" /> Capacidad vs Matrícula por Nivel</h3>
          <div className="space-y-3">
            {academicas?.capacidad?.map((item) => {
              const pct = item.capacidad > 0 ? (item.matriculados / item.capacidad) * 100 : 0;
              return (
                <div key={item.nivel}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.nivel}</span>
                    <span>{item.matriculados} / {item.capacidad}</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasa de Cumplimiento (donut) - ocupa 2/5 */}
        <div className="card p-5 lg:col-span-2 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Tasa de Cumplimiento de Pagos</h3>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eab308" strokeWidth="4"
                strokeDasharray={`${financieras?.tasaCumplimiento ?? 0} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">{financieras?.tasaCumplimiento ?? 0}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">{financieras?.proximosAVencer ?? 0} pagos próximos a vencer</p>
        </div>
      </div>

      {/* ── FILA BAJA: Tablas de Acción / Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alumnos en Riesgo */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> Alumnos en Riesgo</h3>
          {alertas?.alumnosRiesgo?.length ? (
            <ul className="space-y-2">
              {alertas.alumnosRiesgo.map((a, i) => (
                <li key={i} className="flex justify-between text-sm bg-slate-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-300">{a.nombre}</span>
                  <span className="text-red-400 font-semibold">{a.promedio.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-xs">Sin alumnos en riesgo.</p>}
        </div>

        {/* Riesgo de Deserción */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Riesgo de Deserción</h3>
          {alertas?.riesgoDesercion?.length ? (
            <ul className="space-y-2">
              {alertas.riesgoDesercion.map((r, i) => (
                <li key={i} className="flex justify-between text-sm bg-slate-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-300">{r.nombre}</span>
                  <span className="text-amber-400 text-xs">Venc: {r.pensionesVencidas} | Faltas: {r.faltas}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-xs">Sin riesgo de deserción.</p>}
        </div>

        {/* Comunicados Recientes */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><Megaphone size={16} className="text-blue-400" /> Comunicados Recientes</h3>
          {operativas?.comunicados?.length ? (
            <ul className="space-y-2">
              {operativas.comunicados.map((c, i) => (
                <li key={i} className="bg-slate-800/40 rounded-lg px-3 py-2 text-xs">
                  <p className="text-slate-300 font-medium">{c.titulo}</p>
                  <p className="text-slate-500 mt-0.5">{new Date(c.fecha_creacion).toLocaleDateString('es-PE')} — {c.destinatarios.map(d => d.nivel?.nombre_nivel).filter(Boolean).join(', ') || 'General'}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-xs">No hay comunicados.</p>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`card card-interactive p-5 flex items-center gap-4`}>
      <Icon size={28} className={color} />
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}