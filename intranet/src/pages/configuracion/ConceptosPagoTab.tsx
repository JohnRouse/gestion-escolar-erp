import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

interface Concepto {
  id_concepto: number;
  nombre_concepto: string;
  monto_base: number;
  es_pension: boolean;
}

export default function ConceptosPagoTab() {
  const { token } = useAuth();
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [esPension, setEsPension] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('/api/tesoreria/conceptos', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setConceptos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const openCreate = () => {
    setEditingId(null);
    setNombre('');
    setMonto('');
    setEsPension(true);
    setModalOpen(true);
  };

  const openEdit = (c: Concepto) => {
    setEditingId(c.id_concepto);
    setNombre(c.nombre_concepto);
    setMonto(String(c.monto_base));
    setEsPension(c.es_pension);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    const data = { nombre_concepto: nombre, monto_base: Number(monto), es_pension: esPension };
    try {
      if (editingId) {
        await axios.put(`/api/tesoreria/conceptos/${editingId}`, data, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/tesoreria/conceptos', data, { headers: { Authorization: `Bearer ${token}` } });
      }
      setModalOpen(false);
      const res = await axios.get('/api/tesoreria/conceptos', { headers: { Authorization: `Bearer ${token}` } });
      setConceptos(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este concepto?')) return;
    await axios.delete(`/api/tesoreria/conceptos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setConceptos(prev => prev.filter(c => c.id_concepto !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Conceptos de Pago</h3>
        <button onClick={openCreate} className="btn btn-primary btn-sm"><Plus size={16} /> Nuevo</button>
      </div>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-medium text-gray-500">Nombre</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">Monto</th>
                <th className="text-center py-2 px-4 font-medium text-gray-500">Tipo</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id_concepto} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{c.nombre_concepto}</td>
                  <td className="py-3 px-4 text-right text-gray-600">S/ {Number(c.monto_base).toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`badge ${c.es_pension ? 'badge-info' : 'badge-warning'}`}>
                      {c.es_pension ? 'Pensión' : 'Matrícula / Otro'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(c)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(c.id_concepto)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar' : 'Nuevo'} Concepto</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="label">Monto (S/)</label>
                <input type="number" className="input" value={monto} onChange={e => setMonto(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={esPension} onChange={e => setEsPension(e.target.checked)} />
                Es pensión mensual
              </label>
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