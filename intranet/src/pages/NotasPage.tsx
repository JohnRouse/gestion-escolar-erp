import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function NotasPage() {
  const { token } = useAuth();
  const [asignacionId] = useState(1);
  const [unidadId, setUnidadId] = useState(1);
  const [grilla, setGrilla] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) cargarGrilla();
  }, [unidadId, token]);

  const cargarGrilla = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/calificaciones/unidades/${unidadId}/grilla?asignacion_id=${asignacionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGrilla(response.data);
    } catch (err) {
      console.error('Error al cargar grilla:', err);
    } finally {
      setLoading(false);
    }
  };

  const guardarNotas = async () => {
    if (!grilla) return;
    const notas = grilla.grilla.flatMap((fila: any) =>
      grilla.evaluaciones.map((eva: any) => ({
        id_matricula: fila.id_matricula,
        id_evaluacion_det: eva.id,
        valor_nota: fila[eva.id] ?? 0,
      }))
    );
    try {
      await axios.put(
        `/api/calificaciones/unidades/${unidadId}/notas`,
        { id_unidad: unidadId, notas },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Notas guardadas correctamente');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar notas');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Registro de Notas</h2>

      <div className="card p-5 mb-4">
        <div className="flex gap-4 mb-4">
          <div>
            <label className="label">Unidad</label>
            <select className="input" value={unidadId} onChange={(e) => setUnidadId(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((u) => (
                <option key={u} value={u}>Unidad {u}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-text-secondary">Cargando grilla...</p>
        ) : grilla ? (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">Alumno</th>
                    {grilla.evaluaciones.map((eva: any) => (
                      <th key={eva.id} className="text-center py-2 text-text-secondary font-medium">{eva.descripcion || 'Eval'}</th>
                    ))}
                    <th className="text-center py-2 text-text-secondary font-medium">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {grilla.grilla.map((fila: any) => (
                    <tr key={fila.id_matricula} className="border-b border-border/50">
                      <td className="py-2">{fila.alumno}</td>
                      {grilla.evaluaciones.map((eva: any) => (
                        <td key={eva.id} className="py-2 text-center">
                          <input
                            type="number"
                            className="w-16 text-center input py-1 px-0"
                            min={0}
                            max={20}
                            value={fila[eva.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              setGrilla((prev: any) => ({
                                ...prev,
                                grilla: prev.grilla.map((f: any) =>
                                  f.id_matricula === fila.id_matricula ? { ...f, [eva.id]: val } : f
                                ),
                              }));
                            }}
                          />
                        </td>
                      ))}
                      <td className="py-2 text-center font-semibold">{fila.promedio?.toFixed(1) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={guardarNotas} className="btn btn-primary">
              Guardar todas las notas
            </button>
          </>
        ) : (
          <p className="text-text-secondary">Seleccione una unidad para ver la grilla.</p>
        )}
      </div>
    </div>
  );
}