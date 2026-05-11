import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { Search, DollarSign, AlertTriangle, Clock } from 'lucide-react';

interface KpiTesoreria {
  recaudadoHoy: number;
  vencidosDelMes: number;
  proximos48h: number;
}

interface EstadoCuenta {
  id_matricula: number;
  estado_matricula: string;
  deudas: { id_cronograma: number; concepto: string; fecha_vencimiento: string; monto_base: string; estado: string }[];
  total_pendiente: number;
}

export default function TesoreriaPage() {
  const { token } = useAuth();
  const [dni, setDni] = useState('');
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [kpi, setKpi] = useState<KpiTesoreria>({ recaudadoHoy: 0, vencidosDelMes: 0, proximos48h: 0 });
  const [showModal, setShowModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [nroOperacion, setNroOperacion] = useState('');

  useEffect(() => {
    if (token) {
      fetchKpis(token);
    }
  }, [token]);

  const fetchKpis = async (token: string) => {
    try {
      const res = await axios.get('/api/analiticas/tesoreria/kpis', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKpi(res.data);
    } catch (err) {
      console.warn('Error al cargar KPIs de tesorería:', err);
    }
  };

  const buscar = async () => {
    if (!dni || !token) return;
    try {
      const alumnoRes = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const matriculaActiva = alumnoRes.data.estudiantes?.[0]?.matriculas?.find(
        (m: any) => m.estado_matricula === 'Activo'
      );
      if (!matriculaActiva) return alert('No tiene matrícula activa');
      const res = await axios.get(`/api/tesoreria/estado-cuenta/${matriculaActiva.id_matricula}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEstado(res.data);
      fetchKpis(token);
    } catch (e) {}
  };

  const registrarPago = async () => {
    if (!token || !pagoSeleccionado || !estado) return;
    try {
      await axios.post(
        '/api/tesoreria/pagos',
        {
          id_matricula: estado.id_matricula,
          id_apoderado: 4,
          metodo_pago: metodoPago,
          nro_operacion: nroOperacion,
          pagos: [{ id_cronograma: pagoSeleccionado, monto_pagado: 0 }],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowModal(false);
      buscar();
      fetchKpis(token);
    } catch (e) {
      alert('Error al pagar');
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Tesorería</h2>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
  <div className="card p-4 flex items-center gap-3">
    <DollarSign size={24} className="text-emerald-400" />
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase">Recaudado hoy</p>
      <p className="text-xl font-bold text-white">S/ {kpi.recaudadoHoy.toFixed(2)}</p>
    </div>
  </div>
  <div className="card p-4 flex items-center gap-3">
    <AlertTriangle size={24} className="text-red-400" />
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase">Vencidos del mes</p>
      <p className="text-xl font-bold text-white">S/ {kpi.vencidosDelMes.toFixed(2)}</p>
    </div>
  </div>
  <div className="card p-4 flex items-center gap-3">
    <Clock size={24} className="text-amber-400" />
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase">Próximos (48h)</p>
      <p className="text-xl font-bold text-white">{kpi.proximos48h}</p>
    </div>
  </div>
</div>

      {/* Buscador */}
      <div className="card p-5 mb-4">
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            placeholder="DNI del alumno"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button className="btn btn-primary" onClick={buscar}>
            Buscar
          </button>
        </div>

        {estado && (
          <div>
            <p className="text-lg font-bold text-white mb-3">
              Total pendiente: S/ {estado.total_pendiente.toFixed(2)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['Pendiente', 'Pagado', 'Vencido'].map((est) => (
                <div key={est} className="bg-slate-800/40 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">{est}</p>
                  {estado.deudas
                    .filter((d) => d.estado === est)
                    .map((deuda) => (
                      <div
                        key={deuda.id_cronograma}
                        className="flex justify-between text-sm py-1 border-b border-slate-700 last:border-0"
                      >
                        <span className="text-slate-300">
                          {deuda.concepto.replace('Pensión ', '')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">S/ {Number(deuda.monto_base).toFixed(2)}</span>
                          {est !== 'Pagado' && (
                            <button
                              onClick={() => {
                                setPagoSeleccionado(deuda.id_cronograma);
                                setShowModal(true);
                              }}
                              className="text-xs text-yellow-500 hover:underline"
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Registrar pago</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Método de pago</label>
                <select
                  className="input"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="label">N° operación</label>
                <input
                  className="input"
                  value={nroOperacion}
                  onChange={(e) => setNroOperacion(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={registrarPago} className="btn btn-primary">
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}