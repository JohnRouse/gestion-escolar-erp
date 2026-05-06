import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { School, CreditCard, Megaphone, Users, UserPlus, HandCoins, Send, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const { token } = useAuth();
  const [metricas, setMetricas] = useState({
    matriculados: 0,
    pagosPendientes: 0,
    circulares: 0,
    docentes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchMetricas(token);
  }, [token]);

  const fetchMetricas = async (token: string) => {
    try {
      const [matriculadosRes, pagosRes, circularesRes, docentesRes] = await Promise.all([
        axios.get('/api/academicos/matriculas/count?anio_id=1', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tesoreria/pagos/pendientes/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/circulares/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academicos/docentes/count', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMetricas({
        matriculados: matriculadosRes.data,
        pagosPendientes: pagosRes.data,
        circulares: circularesRes.data,
        docentes: docentesRes.data,
      });
    } catch (err) {
      console.error('Error al cargar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { label: 'Matriculados', value: metricas.matriculados, icon: School, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Pagos pendientes', value: metricas.pagosPendientes, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Circulares', value: metricas.circulares, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Docentes activos', value: metricas.docentes, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const quickActions = [
    { label: 'Matrícula', icon: UserPlus, path: '/matricula', color: 'bg-violet-100 text-violet-700' },
    { label: 'Registrar pago', icon: HandCoins, path: '/tesoreria', color: 'bg-rose-100 text-rose-700' },
    { label: 'Nueva circular', icon: Send, path: '/circulares', color: 'bg-amber-100 text-amber-700' },
    { label: 'Reportes', icon: BarChart3, path: '/reportes', color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div>
      <h2 className="section-title mb-6">Panel de control</h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-28 bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {metricCards.map((card, idx) => (
            <div key={idx} className="card hover:shadow-md transition-shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon size={20} className={card.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <h3 className="subsection-title mb-4">Accesos rápidos</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            className="card p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
          >
            <div className={`w-12 h-12 mx-auto rounded-xl ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <action.icon size={20} />
            </div>
            <span className="text-xs font-medium text-slate-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}