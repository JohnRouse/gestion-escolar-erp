import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { School, CreditCard, Megaphone, Users } from 'lucide-react';

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

  const cards = [
    { label: 'Matriculados', value: metricas.matriculados, icon: School, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Pagos pendientes', value: metricas.pagosPendientes, icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Circulares', value: metricas.circulares, icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Docentes activos', value: metricas.docentes, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const quickActions = [
    { label: 'Matrícula', icon: '👤', path: '/matricula' },
    { label: 'Registrar pago', icon: '💰', path: '/tesoreria' },
    { label: 'Nueva circular', icon: '✉', path: '/circulares' },
    { label: 'Docentes', icon: '👩‍🏫', path: '/docentes' },
  ];

  return (
    <div>
      <h2 className="section-title mb-6">Panel de control</h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map((card, idx) => (
            <div key={idx} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {card.label}
                </p>
                <card.icon size={20} className={card.color} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="subsection-title mb-4">Accesos rápidos</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.path}
            className="card p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200"
          >
            <span className="text-2xl mb-2 block">{action.icon}</span>
            <span className="text-xs font-medium text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}