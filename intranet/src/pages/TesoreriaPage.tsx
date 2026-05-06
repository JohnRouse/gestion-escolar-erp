import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Search } from 'lucide-react';

export default function TesoreriaPage() {
  const { token } = useAuth();
  const [dni, setDni] = useState('');
  const [estadoCuenta, setEstadoCuenta] = useState<any>(null);

  const buscarEstadoCuenta = async () => {
    try {
      // Primero buscar alumno
      const alumnoRes = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const alumno = alumnoRes.data;
      if (!alumno || !alumno.estudiantes) return alert('Alumno no encontrado');

      const matriculaActiva = alumno.estudiantes[0]?.matriculas?.find((m: any) => m.estado_matricula === 'Activo');
      if (!matriculaActiva) return alert('No tiene matrícula activa');

      const response = await axios.get(`/api/tesoreria/estado-cuenta/${matriculaActiva.id_matricula}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEstadoCuenta(response.data);
    } catch (err) {
      console.error('Error al buscar estado de cuenta:', err);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Tesorería</h2>

      <div className="card p-6 mb-4">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="DNI del alumno"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button onClick={buscarEstadoCuenta} className="btn btn-primary">
            <Search size={16} className="mr-2" /> Buscar
          </button>
        </div>

        {estadoCuenta && (
          <div>
            <p className="text-lg font-bold text-text mb-3">
              Total pendiente: S/ {estadoCuenta.total_pendiente.toFixed(2)}
            </p>
            <div className="space-y-2">
              {estadoCuenta.deudas.map((deuda: any) => (
                <div key={deuda.id_cronograma} className="card p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-text">{deuda.concepto}</p>
                      <p className="text-xs text-text-muted">Vence {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-PE')}</p>
                    </div>
                    <span className={`badge ${deuda.estado === 'Pagado' ? 'badge-success' : deuda.estado === 'Vencido' ? 'badge-danger' : 'badge-warning'}`}>
                      {deuda.estado}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-text mt-2">S/ {Number(deuda.monto_base).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}