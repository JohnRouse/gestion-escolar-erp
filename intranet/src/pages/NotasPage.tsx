import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { Save } from 'lucide-react';

export default function NotasPage() {
  const { token } = useAuth();
  const [asignacionId] = useState(1);
  const [unidadId, setUnidadId] = useState(1);
  const [grilla, setGrilla] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => { if (token) cargarGrilla(); }, [unidadId, token]);

  const cargarGrilla = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/calificaciones/unidades/${unidadId}/grilla?asignacion_id=${asignacionId}`, { headers: { Authorization: `Bearer ${token}` } });
      setGrilla(res.data);
    } catch (e) {} finally { setLoading(false); }
  };

  const updateNota = (idMatricula: number, idEval: number, valor: string) => {
    setGrilla((prev: any) => ({
      ...prev,
      grilla: prev.grilla.map((f: any) => f.id_matricula === idMatricula ? { ...f, [idEval]: valor === '' ? null : Number(valor) } : f),
    }));
    setChanged(true);
  };

  const guardarNotas = async () => {
    if (!token || !grilla) return;
    const notas = grilla.grilla.flatMap((fila: any) =>
      grilla.evaluaciones.map((eva: any) => ({ id_matricula: fila.id_matricula, id_evaluacion_det: eva.id, valor_nota: fila[eva.id] ?? 0 }))
    );
    try {
      await axios.put(`/api/calificaciones/unidades/${unidadId}/notas`, { id_unidad: unidadId, notas }, { headers: { Authorization: `Bearer ${token}` } });
      setChanged(false);
      alert('Notas guardadas');
    } catch (e) {}
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Registro de Notas</h2>
      <div className="card p-5">
        <div className="flex gap-4 mb-4">
          <div><label className="label">Unidad</label><select className="input" value={unidadId} onChange={(e) => setUnidadId(Number(e.target.value))}>{[...Array(8)].map((_, i) => <option key={i+1} value={i+1}>Unidad {i+1}</option>)}</select></div>
        </div>

        {loading ? <p className="text-slate-400">Cargando...</p> : grilla ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th rowSpan={2} className="text-left py-2 px-3 text-xs font-semibold text-slate-400">Alumno</th>
                  <th colSpan={grilla.evaluaciones.length} className="text-center py-2 px-3 text-xs font-semibold text-yellow-500 border-b border-slate-800">Evaluaciones</th>
                  <th rowSpan={2} className="text-center py-2 px-3 text-xs font-semibold text-slate-400">Promedio</th>
                </tr>
                <tr className="border-b border-slate-800">
                  {grilla.evaluaciones.map((eva: any) => (
                    <th key={eva.id} className="text-center py-2 px-3 text-xs text-slate-500">{eva.descripcion || 'Eval'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grilla.grilla.map((fila: any) => (
                  <tr key={fila.id_matricula} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-300">{fila.alumno}</td>
                    {grilla.evaluaciones.map((eva: any) => {
                      const val = fila[eva.id];
                      const isLow = val !== null && val !== undefined && val < 11;
                      return (
                        <td key={eva.id} className="py-1 px-1 text-center">
                          <input type="number" className={`w-14 text-center bg-transparent border rounded-lg py-1 text-sm outline-none transition-colors ${
                            isLow ? 'border-red-500/50 bg-red-500/5 text-red-300' : 'border-slate-700 focus:border-yellow-500 text-slate-200'
                          }`} min={0} max={20} value={val ?? ''} onChange={(e) => updateNota(fila.id_matricula, eva.id, e.target.value)} />
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center font-bold text-white">{fila.promedio?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-slate-400">Seleccione una unidad.</p>}
      </div>

      {changed && (
        <button onClick={guardarNotas} className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-500 text-slate-900 rounded-full shadow-xl shadow-yellow-500/30 flex items-center justify-center hover:bg-yellow-400 transition-all animate-fade-in">
          <Save size={24} />
        </button>
      )}
    </div>
  );
}