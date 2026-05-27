import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

interface TipoEval {
  id_tipo_eval: number;
  nombre_tipo: string;
}

export default function TiposEvalTab() {
  const { token } = useAuth();
  const [tipos, setTipos] = useState<TipoEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (!token) return;
    axios.get('/api/calificaciones/tipos-evaluacion', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTipos(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  const openCreate = () => { setEditingId(null); setNombre(''); setModalOpen(true); };
  const openEdit = (t: TipoEval) => { setEditingId(t.id_tipo_eval); setNombre(t.nombre_tipo); setModalOpen(true); };

  const handleSave = async () => {
    if (!token) return;
    try {
      if (editingId) {
        await axios.put(`/api/calificaciones/tipos-evaluacion/${editingId}`, { nombre_tipo: nombre }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/calificaciones/tipos-evaluacion', { nombre_tipo: nombre }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setModalOpen(false);
      const res = await axios.get('/api/calificaciones/tipos-evaluacion', { headers: { Authorization: `Bearer ${token}` } });
      setTipos(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    await axios.delete(`/api/calificaciones/tipos-evaluacion/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setTipos(prev => prev.filter(t => t.id_tipo_eval !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Tipos de Evaluación</h3>
        <button onClick={openCreate} className="btn btn-primary btn-sm"><Plus size={16} /> Nuevo</button>
      </div>

      {loading ? <div className="skeleton h-32 w-full" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-medium text-gray-500">Nombre</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id_tipo_eval} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{t.nombre_tipo}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(t)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(t.id_tipo_eval)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 slide-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar' : 'Nuevo'} Tipo</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSave} className="btn btn-primary flex-1"><Save size={16} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}