import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function ConfiguracionPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('anios');
  const [anios, setAnios] = useState<any[]>([]);

  useEffect(() => {
    if (token && tab === 'anios') cargarAnios();
  }, [tab, token]);

  const cargarAnios = async () => {
    try {
      const response = await axios.get('/api/academicos/anios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnios(response.data);
    } catch (err) {
      console.error('Error al cargar años lectivos:', err);
    }
  };

  const tabs = [
    { key: 'anios', label: 'Años lectivos' },
    { key: 'niveles', label: 'Niveles / Grados' },
    { key: 'secciones', label: 'Secciones' },
    { key: 'cursos', label: 'Cursos' },
    { key: 'pagos', label: 'Conceptos de pago' },
    { key: 'escala', label: 'Escala de calificación' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Configuración académica</h2>

      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'anios' && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Años lectivos registrados</p>
            <button className="btn btn-primary btn-sm">+ Nuevo año lectivo</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-text-secondary font-medium">Año</th>
                <th className="text-left py-2 text-text-secondary font-medium">Descripción</th>
                <th className="text-left py-2 text-text-secondary font-medium">Inicio</th>
                <th className="text-left py-2 text-text-secondary font-medium">Fin</th>
                <th className="text-center py-2 text-text-secondary font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {anios.map((anio) => (
                <tr key={anio.id_anio} className="border-b border-border/50">
                  <td className="py-2 font-semibold">{anio.nombre_anio}</td>
                  <td className="py-2 text-text-secondary">{anio.nombre_anio}</td>
                  <td className="py-2">{new Date(anio.fecha_inicio).toLocaleDateString('es-PE')}</td>
                  <td className="py-2">{new Date(anio.fecha_fin).toLocaleDateString('es-PE')}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${anio.estado === 'Abierto' ? 'badge-success' : 'badge-warning'}`}>
                      {anio.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {anios.length === 0 && <p className="text-text-secondary text-sm mt-2">No hay años lectivos registrados.</p>}
        </div>
      )}

      {tab !== 'anios' && (
        <div className="card p-8 text-center">
          <p className="text-text-secondary">Módulo en desarrollo. Pronto disponible.</p>
        </div>
      )}
    </div>
  );
}