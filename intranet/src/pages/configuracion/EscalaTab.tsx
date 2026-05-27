import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2 } from 'lucide-react';

export default function EscalaTab() {
  const { token } = useAuth();
  const [minima, setMinima] = useState(0);
  const [maxima, setMaxima] = useState(20);
  const [aprobatoria, setAprobatoria] = useState(11);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!token) return;
    axios.get('/api/calificaciones/escala', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data) {
          setMinima(res.data.nota_minima);
          setMaxima(res.data.nota_maxima);
          setAprobatoria(res.data.nota_aprobatoria);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setMensaje('');
    try {
      await axios.put('/api/calificaciones/escala', {
        nota_minima: Number(minima),
        nota_maxima: Number(maxima),
        nota_aprobatoria: Number(aprobatoria),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje('✅ Escala actualizada correctamente');
    } catch {
      setMensaje('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-40 w-full" />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Escala de Calificación</h3>
      <div className="card p-6 max-w-md space-y-4">
        <div>
          <label className="label">Nota mínima</label>
          <input type="number" className="input" value={minima} onChange={e => setMinima(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Nota máxima</label>
          <input type="number" className="input" value={maxima} onChange={e => setMaxima(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Nota aprobatoria</label>
          <input type="number" className="input" value={aprobatoria} onChange={e => setAprobatoria(Number(e.target.value))} />
        </div>
        {mensaje && <p className={`text-sm ${mensaje.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{mensaje}</p>}
        <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}