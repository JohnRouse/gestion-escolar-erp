import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

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
        axios.get('/api/academicos/matriculas/count?anio_id=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/tesoreria/pagos/pendientes/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/circulares/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/academicos/docentes/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-navy mb-6">Panel de control</h2>

      {loading ? (
        <p className="text-gray-400">Cargando métricas...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <p className="text-sm text-gray-500">Total matriculados</p>
            <p className="text-3xl font-bold text-navy mt-2">{metricas.matriculados}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-gray-500">Pagos pendientes</p>
            <p className="text-3xl font-bold text-red mt-2">{metricas.pagosPendientes}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-gray-500">Circulares enviadas</p>
            <p className="text-3xl font-bold text-navy mt-2">{metricas.circulares}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-gray-500">Docentes activos</p>
            <p className="text-3xl font-bold text-navy mt-2">{metricas.docentes}</p>
          </div>
        </div>
      )}
    </div>
  );
}