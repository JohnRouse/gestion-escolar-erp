import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { Send, Eye, Clock } from 'lucide-react';

export default function CircularesPage() {
  const { token } = useAuth();
  const [circulares, setCirculares] = useState<any[]>([]);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [selectedNiveles, setSelectedNiveles] = useState<number[]>([]);
  const [niveles] = useState([{ id: 1, nombre: 'Inicial' }, { id: 2, nombre: 'Primaria' }, { id: 3, nombre: 'Secundaria' }]);
  const [showDetail, setShowDetail] = useState<any>(null);

  useEffect(() => { if (token) fetchCirculares(token); }, [token]);

  const fetchCirculares = async (token: string) => {
    try {
      const res = await axios.get('/api/circulares?page=1&limit=20', { headers: { Authorization: `Bearer ${token}` } });
      setCirculares(res.data.data);
    } catch (e) {}
  };

  const enviar = async () => {
    if (!token) return;
    try {
      await axios.post('/api/circulares', { titulo, contenido, niveles: selectedNiveles }, { headers: { Authorization: `Bearer ${token}` } });
      setTitulo(''); setContenido(''); setSelectedNiveles([]);
      fetchCirculares(token);
    } catch (e) {}
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Circulares</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Nueva circular</h3>
          <div className="space-y-3">
            <div><label className="label">Título</label><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
            <div><label className="label">Contenido</label><textarea className="input min-h-[120px]" value={contenido} onChange={(e) => setContenido(e.target.value)} /></div>
            <div>
              <label className="label">Destinatarios</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {niveles.map(n => (
                  <button key={n.id} onClick={() => setSelectedNiveles(prev => prev.includes(n.id) ? prev.filter(x => x !== n.id) : [...prev, n.id])}
                    className={`chip ${selectedNiveles.includes(n.id) ? 'chip-active' : 'chip-inactive'}`}>{n.nombre}</button>
                ))}
              </div>
            </div>
            <button onClick={enviar} className="btn btn-primary w-full"><Send size={14} /> Enviar circular</button>
          </div>
        </div>

        {/* Historial */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Historial</h3>
          <div className="space-y-2">
            {circulares.map(c => (
              <div key={c.id_circular} className="bg-slate-800/40 rounded-lg p-3 hover:bg-slate-800/70 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.titulo}</p>
                    <p className="text-xs text-slate-400">{new Date(c.fecha_creacion).toLocaleDateString('es-PE')} — 🎯 Dirigido a: {c.destinatarios?.map(d => d.nivel?.nombre_nivel).join(', ') || 'General'}</p>
                  </div>
                  <button onClick={() => setShowDetail(c)} className="text-yellow-500"><Eye size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal detalle */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-white mb-2">{showDetail.titulo}</h3>
            <p className="text-xs text-slate-400 mb-4">{new Date(showDetail.fecha_creacion).toLocaleDateString('es-PE')} — {showDetail.remitente?.persona?.nombres}</p>
            <p className="text-slate-300 text-sm whitespace-pre-line">{showDetail.contenido}</p>
            <button onClick={() => setShowDetail(null)} className="btn btn-primary mt-4">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}