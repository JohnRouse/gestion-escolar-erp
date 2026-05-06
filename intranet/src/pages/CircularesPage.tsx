import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function CircularesPage() {
  const { token } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [circulares, setCirculares] = useState<any[]>([]);

  useEffect(() => {
    if (token) cargarCirculares();
  }, [token]);

  const cargarCirculares = async () => {
    try {
      const response = await axios.get('/api/circulares?page=1&limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(response.data.data);
    } catch (err) {
      console.error('Error al cargar circulares:', err);
    }
  };

  const enviarCircular = async () => {
    if (!titulo || !contenido) return alert('Complete título y contenido');
    setEnviando(true);
    try {
      await axios.post(
        '/api/circulares',
        { titulo, contenido, niveles: [2] }, // Nivel Primaria por defecto
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Circular enviada correctamente');
      setTitulo('');
      setContenido('');
      cargarCirculares();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al enviar circular');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Circulares</h2>

      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-text mb-4">Nueva circular</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input type="text" className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título de la circular" />
          </div>
          <div>
            <label className="label">Contenido</label>
            <textarea className="input min-h-[120px]" value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Escriba el contenido de la circular..." />
          </div>
          <button onClick={enviarCircular} disabled={enviando} className="btn btn-primary">
            {enviando ? 'Enviando...' : 'Enviar circular'}
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text mb-4">Historial</h3>
      <div className="space-y-2">
        {circulares.map((circ) => (
          <div key={circ.id_circular} className="card p-4">
            <p className="text-sm font-semibold text-text">{circ.titulo}</p>
            <p className="text-xs text-text-muted mt-1">{new Date(circ.fecha_creacion).toLocaleDateString('es-PE')}</p>
          </div>
        ))}
        {circulares.length === 0 && <p className="text-text-secondary text-sm">No hay circulares enviadas.</p>}
      </div>
    </div>
  );
}