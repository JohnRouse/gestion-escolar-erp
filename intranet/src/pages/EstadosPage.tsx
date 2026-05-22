import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface EstadoPersonal {
  id_usuario: number;
  nombre: string;
  estado: string;
  ultima_conexion: string | null;
}

const ESTADOS_MAP: Record<string, { color: string; label: string }> = {
  conectado: { color: 'bg-green-500', label: 'Conectado' },
  ocupado: { color: 'bg-orange-500', label: 'Ocupado' },
  ausente: { color: 'bg-yellow-500', label: 'Ausente' },
  desconectado: { color: 'bg-gray-400', label: 'Desconectado' },
};

export default function EstadosPersonalPage() {
  const { token } = useAuth();
  const [personal, setPersonal] = useState<EstadoPersonal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get('/api/academicos/personal/estados', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setPersonal(res.data))
      .catch(() => setPersonal([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>;

  return (
    <div className="card p-6">
      <h2 className="section-title mb-4">Estados del Personal</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-500">Nombre</th>
            <th className="text-left py-2 font-medium text-gray-500">Estado</th>
            <th className="text-left py-2 font-medium text-gray-500">Última conexión</th>
          </tr>
        </thead>
        <tbody>
          {personal.map(p => {
            const estadoInfo = ESTADOS_MAP[p.estado] || ESTADOS_MAP.desconectado;
            return (
              <tr key={p.id_usuario} className="border-b border-gray-100">
                <td className="py-3">{p.nombre}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium`}>
                    <span className={`w-2 h-2 rounded-full ${estadoInfo.color}`} />
                    {estadoInfo.label}
                  </span>
                </td>
                <td className="py-3 text-gray-500">
                  {p.ultima_conexion ? new Date(p.ultima_conexion).toLocaleString('es-PE') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}