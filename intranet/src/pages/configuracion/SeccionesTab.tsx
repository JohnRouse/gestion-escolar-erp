import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';

interface Grado {
  id_grado: number;
  nombre_grado: string;
  nivel: { id_nivel: number; nombre_nivel: string };
}

interface Seccion {
  id_seccion: number;
  letra: string;
  id_grado: number;
  id_aula: number;
  grado: { nombre_grado: string; nivel: { nombre_nivel: string } };
  aula: { nombre_aula: string; capacidad: number };
  _count?: { matriculas: number };
}

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

export default function SeccionesTab() {
  const { token } = useAuth();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [nivelSeleccionado, setNivelSeleccionado] = useState<number | null>(null);
  const [gradoSeleccionado, setGradoSeleccionado] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLetra, setEditLetra] = useState('');

  // Cargar niveles
  useEffect(() => {
    if (!token) return;
    axios.get('/api/academicos/niveles', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setNiveles(res.data))
      .catch(() => {});
  }, [token]);

  // Cargar grados del nivel seleccionado
  useEffect(() => {
    if (!token || !nivelSeleccionado) return;
    axios.get(`/api/academicos/grados?nivel_id=${nivelSeleccionado}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setGrados(res.data);
        setGradoSeleccionado(null);
        setSecciones([]);
      })
      .catch(() => {});
  }, [nivelSeleccionado, token]);

  // Cargar secciones del grado seleccionado
  useEffect(() => {
    if (!token || !gradoSeleccionado) return;
    setLoading(true);
    axios.get(`/api/academicos/secciones?grado_id=${gradoSeleccionado}&anio_id=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setSecciones(res.data))
      .catch(() => setSecciones([]))
      .finally(() => setLoading(false));
  }, [gradoSeleccionado, token]);

  // Crear sección
  const crearSeccion = async () => {
    const letra = prompt('Letra de la nueva sección (ej. A, B, C):');
    if (!letra || !gradoSeleccionado) return;
    try {
      await axios.post('/api/academicos/secciones', {
        letra: letra.toUpperCase(),
        id_grado: gradoSeleccionado,
        id_aula: 1, // aula por defecto
      }, { headers: { Authorization: `Bearer ${token}` } });
      // Recargar secciones
      const res = await axios.get(`/api/academicos/secciones?grado_id=${gradoSeleccionado}&anio_id=1`, { headers: { Authorization: `Bearer ${token}` } });
      setSecciones(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear');
    }
  };

  // Actualizar sección
  const actualizarSeccion = async (id: number) => {
    if (!editLetra) return;
    try {
      await axios.put(`/api/academicos/secciones/${id}`, { letra: editLetra }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingId(null);
      const res = await axios.get(`/api/academicos/secciones?grado_id=${gradoSeleccionado}&anio_id=1`, { headers: { Authorization: `Bearer ${token}` } });
      setSecciones(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar');
    }
  };

  // Eliminar sección
  const eliminarSeccion = async (id: number) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    try {
      await axios.delete(`/api/academicos/secciones/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const res = await axios.get(`/api/academicos/secciones?grado_id=${gradoSeleccionado}&anio_id=1`, { headers: { Authorization: `Bearer ${token}` } });
      setSecciones(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Secciones</h3>

      {/* Filtros */}
      <div className="flex gap-4">
        <select
          className="input max-w-xs"
          value={nivelSeleccionado || ''}
          onChange={e => setNivelSeleccionado(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Seleccionar nivel</option>
          {niveles.map(n => <option key={n.id_nivel} value={n.id_nivel}>{n.nombre_nivel}</option>)}
        </select>
        {nivelSeleccionado && (
          <select
            className="input max-w-xs"
            value={gradoSeleccionado || ''}
            onChange={e => setGradoSeleccionado(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Seleccionar grado</option>
            {grados.map(g => <option key={g.id_grado} value={g.id_grado}>{g.nombre_grado}</option>)}
          </select>
        )}
      </div>

      {/* Botón crear */}
      {gradoSeleccionado && (
        <button onClick={crearSeccion} className="btn btn-primary btn-sm">
          <Plus size={16} /> Nueva Sección
        </button>
      )}

      {/* Tabla de secciones */}
      {loading ? (
        <div className="skeleton h-32 w-full" />
      ) : gradoSeleccionado && secciones.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-medium text-gray-500">Sección</th>
                <th className="text-left py-2 px-4 font-medium text-gray-500">Aula</th>
                <th className="text-left py-2 px-4 font-medium text-gray-500">Capacidad</th>
                <th className="text-center py-2 px-4 font-medium text-gray-500">Matriculados</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {secciones.map((sec) => (
                <tr key={sec.id_seccion} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {editingId === sec.id_seccion ? (
                      <input
                        className="input py-1 px-2 w-16"
                        value={editLetra}
                        onChange={e => setEditLetra(e.target.value)}
                        onBlur={() => actualizarSeccion(sec.id_seccion)}
                        autoFocus
                      />
                    ) : (
                      `${sec.grado?.nombre_grado || ''} "${sec.letra}"`
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{sec.aula?.nombre_aula || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{sec.aula?.capacidad || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Users size={14} />
                      {sec._count?.matriculas ?? 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setEditingId(sec.id_seccion); setEditLetra(sec.letra); }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminarSeccion(sec.id_seccion)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : gradoSeleccionado ? (
        <p className="text-gray-500 text-sm">No hay secciones en este grado.</p>
      ) : null}
    </div>
  );
}