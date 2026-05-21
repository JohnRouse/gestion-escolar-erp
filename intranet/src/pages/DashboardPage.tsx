import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '../hooks/useCountUp';

export default function DashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({ matriculados: 0, docentes: 0, circulares: 0, pagosPendientes: 0 });
  const [loading, setLoading] = useState(true);
  const matriculadosAnim = useCountUp(kpis.matriculados);
  const docentesAnim = useCountUp(kpis.docentes);

  useEffect(() => {
    if (!token) return;
    fetchKpis(token);
  }, [token]);

  const fetchKpis = async (token: string) => {
    setLoading(true);
    try {
      const [matRes, docRes, circRes, pagosRes] = await Promise.allSettled([
        axios.get('/api/academicos/matriculas/count?anio_id=1', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/academicos/docentes/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/circulares/count', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tesoreria/pagos/pendientes/count', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setKpis({
        matriculados: matRes.status === 'fulfilled' ? matRes.value.data : 0,
        docentes: docRes.status === 'fulfilled' ? docRes.value.data : 0,
        circulares: circRes.status === 'fulfilled' ? circRes.value.data : 0,
        pagosPendientes: pagosRes.status === 'fulfilled' ? pagosRes.value.data : 0,
      });
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <div className="card p-5"><div className="skeleton h-4 w-20 mb-2" /><div className="skeleton h-8 w-16" /></div>
            <div className="card p-5"><div className="skeleton h-4 w-20 mb-2" /><div className="skeleton h-8 w-16" /></div>
            <div className="card p-5"><div className="skeleton h-4 w-20 mb-2" /><div className="skeleton h-8 w-16" /></div>
            <div className="card p-5"><div className="skeleton h-4 w-20 mb-2" /><div className="skeleton h-8 w-16" /></div>
          </>
        ) : (
          <>
            <div className="card card-interactive p-5" onClick={() => navigate('/matricula')}>
              <p className="text-sm text-slate-400">Matriculados</p>
              <p className="text-3xl font-bold text-white">{matriculadosAnim}</p>
            </div>
            <div className="card card-interactive p-5">
              <p className="text-sm text-slate-400">Docentes</p>
              <p className="text-3xl font-bold text-white">{docentesAnim}</p>
            </div>
            <div className="card card-interactive p-5">
              <p className="text-sm text-slate-400">Circulares</p>
              <p className="text-3xl font-bold text-white">{kpis.circulares}</p>
            </div>
            <div className="card card-interactive p-5" onClick={() => navigate('/tesoreria')}>
              <p className="text-sm text-slate-400">Pagos pendientes</p>
              <p className="text-3xl font-bold text-white">{kpis.pagosPendientes}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}