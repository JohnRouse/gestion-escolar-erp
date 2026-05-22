import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
  grados?: Grado[];
}

interface Grado {
  id_grado: number;
  nombre_grado: string;
  id_nivel: number;
}

export default function NivelesGradosTab() {
  const { token } = useAuth();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [grados, setGrados] = useState<Record<number, Grado[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNiveles = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/academicos/niveles', { headers: { Authorization: `Bearer ${token}` } });
      setNiveles(res.data);
    } catch {}
  };

  useEffect(() => {
    if (token) { fetchNiveles(); setLoading(false); }
  }, [token]);

  const fetchGrados = async (nivelId: number) => {
    if (!token || grados[nivelId]) return;
    try {
      const res = await axios.get(`/api/academicos/grados?nivel_id=${nivelId}`, { headers: { Authorization: `Bearer ${token}` } });
      setGrados(prev => ({ ...prev, [nivelId]: res.data }));
    } catch {}
  };

  const toggleExpand = (nivelId: number) => {
    if (expanded === nivelId) {
      setExpanded(null);
    } else {
      setExpanded(nivelId);
      fetchGrados(nivelId);
    }
  };

  const agregarNivel = async () => {
    const nombre = prompt('Nombre del nuevo nivel:');
    if (!nombre) return;
    await axios.post('/api/academicos/niveles', { nombre_nivel: nombre }, { headers: { Authorization: `Bearer ${token}` } });
    fetchNiveles();
  };

  const eliminarNivel = async (id: number) => {
    if (!confirm('¿Eliminar este nivel?')) return;
    await axios.delete(`/api/academicos/niveles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchNiveles();
  };

  if (loading) return <div className="skeleton h-40 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Niveles Educativos</h3>
        <button onClick={agregarNivel} className="btn btn-primary btn-sm">
          <Plus size={16} /> Nuevo Nivel
        </button>
      </div>

      {niveles.map((nivel) => (
        <div key={nivel.id_nivel} className="card">
          {/* Usamos un div en lugar de button para el acordeón */}
          <div
            onClick={() => toggleExpand(nivel.id_nivel)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(nivel.id_nivel); }}
          >
            <span className="font-medium text-gray-800">{nivel.nombre_nivel}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); eliminarNivel(nivel.id_nivel); }}
                className="p-1 hover:bg-red-50 rounded text-red-500"
              >
                <Trash2 size={16} />
              </button>
              {expanded === nivel.id_nivel ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </div>
          {expanded === nivel.id_nivel && (
            <div className="px-4 pb-4 space-y-2">
              {grados[nivel.id_nivel]?.map((grado) => (
                <div key={grado.id_grado} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{grado.nombre_grado}</span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><Pencil size={14} /></button>
                    <button className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nombre = prompt('Nombre del nuevo grado:');
                  if (!nombre) return;
                  axios.post('/api/academicos/grados', { nombre_grado: nombre, id_nivel: nivel.id_nivel }, { headers: { Authorization: `Bearer ${token}` } })
                    .then(() => fetchGrados(nivel.id_nivel));
                }}
                className="text-sm text-brand-600 hover:underline mt-2"
              >
                + Agregar grado
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}