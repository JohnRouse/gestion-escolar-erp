import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';

export default function AsistenciaPage() {
  const { token } = useAuth();
  const [seccionId, setSeccionId] = useState(7);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [justificacion, setJustificacion] = useState<string | null>(null);

  useEffect(() => { if (token) cargarAsistencia(); }, [seccionId, fecha, token]);

  const cargarAsistencia = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/asistencia?seccion_id=${seccionId}&fecha=${fecha}`, { headers: { Authorization: `Bearer ${token}` } });
      setAlumnos(res.data);
    } catch (e) {} finally { setLoading(false); }
  };

  const toggleEstado = (id: number) => {
    setAlumnos(prev => prev.map(a => a.id_matricula === id ? { ...a, estado: a.estado === 'Presente' ? 'Ausente' : a.estado === 'Ausente' ? 'Tardanza' : a.estado === 'Tardanza' ? 'Justificado' : 'Presente' } : a));
  };

  const guardar = async () => {
    if (!token) return;
    try {
      await axios.post('/api/academicos/asistencia', { id_seccion: seccionId, fecha, asistencias: alumnos.map(a => ({ id_matricula: a.id_matricula, estado: a.estado })) }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Asistencia guardada');
    } catch (e) {}
  };

  const presentes = alumnos.filter(a => a.estado === 'Presente').length;
  const pct = alumnos.length > 0 ? Math.round((presentes / alumnos.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Registro de Asistencia</h2>
      <div className="card p-5 mb-4">
        <div className="flex gap-4 mb-4">
          <div><label className="label">Sección</label><select className="input" value={seccionId} onChange={(e) => setSeccionId(Number(e.target.value))}><option value={7}>1° Primaria A</option></select></div>
          <div><label className="label">Fecha</label><input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        </div>
        {/* Barra de progreso */}
        <div className="mb-4 bg-slate-800 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-400 mb-4">Presentes: {presentes} / {alumnos.length}</p>

        {loading ? <p className="text-slate-400">Cargando...</p> : (
          <div className="space-y-1">
            {alumnos.map(a => (
              <div key={a.id_matricula} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-4 py-3">
                <span className="text-sm text-slate-300">{a.alumno}</span>
                <button onClick={() => toggleEstado(a.id_matricula)} className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                  a.estado === 'Presente' ? 'bg-emerald-500/20 text-emerald-300' : a.estado === 'Ausente' ? 'bg-red-500/20 text-red-300' : a.estado === 'Tardanza' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                }`}>{a.estado}</button>
              </div>
            ))}
          </div>
        )}
        <button onClick={guardar} className="btn btn-primary mt-4">Guardar asistencia</button>
      </div>
    </div>
  );
}