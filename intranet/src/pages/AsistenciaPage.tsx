import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Alumno {
  id_matricula: number;
  alumno: string;
  estado: string;
}

export default function AsistenciaPage() {
  const { token } = useAuth();
  const [seccionId, setSeccionId] = useState(7); // 1° Primaria A
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(false);

  const estadosPosibles = ['Presente', 'Ausente', 'Tardanza', 'Justificado'];

  useEffect(() => {
    if (token) cargarAsistencia();
  }, [seccionId, fecha, token]);

  const cargarAsistencia = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/academicos/asistencia?seccion_id=${seccionId}&fecha=${fecha}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlumnos(response.data);
    } catch (err) {
      console.error('Error al cargar asistencia:', err);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = (id_matricula: number, nuevoEstado: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id_matricula === id_matricula ? { ...a, estado: nuevoEstado } : a))
    );
  };

  const guardarAsistencia = async () => {
    try {
      await axios.post(
        '/api/academicos/asistencia',
        { id_seccion: seccionId, fecha, asistencias: alumnos.map((a) => ({ id_matricula: a.id_matricula, estado: a.estado })) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Asistencia guardada correctamente');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar asistencia');
    }
  };

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case 'Presente': return 'badge-success';
      case 'Ausente': return 'badge-danger';
      case 'Tardanza': return 'badge-warning';
      case 'Justificado': return 'badge-info';
      default: return '';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Registro de Asistencia</h2>

      <div className="card p-5 mb-4">
        <div className="flex gap-4 mb-4">
          <div>
            <label className="label">Sección</label>
            <select className="input" value={seccionId} onChange={(e) => setSeccionId(Number(e.target.value))}>
              <option value={7}>1° Primaria A</option>
              <option value={1}>Inicial 3 años A</option>
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="text-text-secondary">Cargando...</p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAlumnos((prev) => prev.map((a) => ({ ...a, estado: 'Presente' })))} className="btn btn-sm bg-success-light text-success border-success/30">
                Todos presentes
              </button>
              <button onClick={() => setAlumnos((prev) => prev.map((a) => ({ ...a, estado: 'Ausente' })))} className="btn btn-sm bg-danger-light text-danger border-danger/30">
                Todos ausentes
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">Alumno</th>
                    <th className="text-center py-2 text-text-secondary font-medium">Estado</th>
                    <th className="text-center py-2 text-text-secondary font-medium">Cambiar</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((alumno) => (
                    <tr key={alumno.id_matricula} className="border-b border-border/50">
                      <td className="py-2">{alumno.alumno}</td>
                      <td className="py-2 text-center">
                        <span className={`badge ${getBadgeClass(alumno.estado)}`}>{alumno.estado}</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1 justify-center">
                          {estadosPosibles.map((estado) => (
                            <button
                              key={estado}
                              onClick={() => cambiarEstado(alumno.id_matricula, estado)}
                              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                alumno.estado === estado
                                  ? 'bg-primary text-white'
                                  : 'bg-surface-secondary text-text-secondary hover:bg-gray-200'
                              }`}
                            >
                              {estado.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={guardarAsistencia} className="btn btn-primary mt-4">
              Guardar asistencia
            </button>
          </>
        )}
      </div>
    </div>
  );
}